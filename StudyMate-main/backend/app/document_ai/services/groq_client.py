from django.conf import settings
import logging
import re
import time
import hashlib

logger = logging.getLogger(__name__)

class GroqClient:
    def __init__(self):
        self._client = None
        self.model = getattr(settings, "GROQ_DEFAULT_MODEL", "llama-3.3-70b-versatile")
        self._rate_limit_until = 0.0
        self._cache = {}

    @property
    def client(self):
        if self._client is None:
            try:
                from groq import Groq
            except ImportError:
                raise ImportError("The 'groq' library is not installed.")
            
            api_key = getattr(settings, 'GROQ_API_KEY', None)
            if not api_key:
                raise RuntimeError("GROQ_API_KEY is not set in settings or environment.")
            
            self._client = Groq(api_key=api_key)
        return self._client

    def get_completion(self, system_prompt, user_prompt, retry_count=0, model=None, bypass_cache=False):
        current_model = model or self.model
        max_retries = 2
        try:
            self._wait_for_cooldown()
            is_json = "json" in system_prompt.lower()
            cache_key = self._make_cache_key(system_prompt, user_prompt, current_model, is_json)
            if not bypass_cache and cache_key in self._cache:
                cached_at, cached_value = self._cache[cache_key]
                if time.time() - cached_at < 45:
                    return cached_value
            response = self.client.chat.completions.create(
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                model=current_model,
                temperature=0.2 if is_json else 0.5,
                response_format={"type": "json_object"} if is_json else None,
                max_tokens=900 if is_json else 700
            ).choices[0].message.content

            if is_json:
                sanitized = self.json_sanitize(response)
                self._cache[cache_key] = (time.time(), sanitized)
                return sanitized
            self._cache[cache_key] = (time.time(), response)
            return response

        except Exception as e:
                                                         
            error_str = str(e).lower()
            if "rate_limit_exceeded" in error_str or "429" in error_str:
                wait_seconds = self._extract_wait_seconds(str(e), default=6.0)
                self._set_cooldown(wait_seconds)
                if current_model == "llama-3.3-70b-versatile":
                    logger.warning(f"Groq Rate Limit on 70B, falling back to 8B: {e}")
                    return self.get_completion(system_prompt, user_prompt, retry_count=retry_count, model="llama-3.1-8b-instant")
            
                               
            if retry_count < max_retries:
                wait_time = min(2 ** retry_count, 5)
                logger.warning(f"Groq API error (attempt {retry_count + 1}/{max_retries + 1}), retrying in {wait_time}s: {e}")
                time.sleep(wait_time)
                return self.get_completion(
                    system_prompt,
                    user_prompt,
                    retry_count=retry_count + 1,
                    model=current_model
                )
            
            if is_json and retry_count < 1:
                logger.warning(f"Groq JSON failure, retrying with improved prompt: {e}")
                return self.get_completion(
                    system_prompt + "\n\nIMPORTANT: Your previous output was invalid JSON. Ensure all strings (especially multi-line summaries) are properly enclosed in double quotes and escaped. Return ONLY the valid JSON object.",
                    user_prompt,
                    retry_count=1,
                    model=current_model
                )
            raise Exception(f"Groq API Error: {str(e)}")

    def get_streaming_completion(self, system_prompt, user_prompt):
        """Streaming version of completion."""
        try:
            stream = self.client.chat.completions.create(
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                model=self.model,
                temperature=0.5,
                stream=True,
            )
            for chunk in stream:
                if chunk.choices[0].delta.content:
                    yield chunk.choices[0].delta.content
        except Exception as e:
            logger.error(f"Groq Streaming Error: {e}")
            yield f"Error: {str(e)}"

    def json_sanitize(self, content):
        """Strips non-JSON fluff and validates."""
        import re
        import json
        content = content.strip()
                                 
        match = re.search(r'\{.*\}', content, re.DOTALL)
        if match:
            clean_json = match.group(0)
            try:
                json.loads(clean_json)
                return clean_json
            except json.JSONDecodeError:
                pass
        return content                       

    def _extract_wait_seconds(self, error_text, default=6.0):
        match = re.search(r"try again in ([0-9]+(?:\.[0-9]+)?)s", error_text.lower())
        if match:
            return float(match.group(1))
        return default

    def _set_cooldown(self, wait_seconds):
        buffered = max(1.0, float(wait_seconds) + 1.0)
        self._rate_limit_until = max(self._rate_limit_until, time.time() + buffered)

    def _wait_for_cooldown(self):
        remaining = self._rate_limit_until - time.time()
        if remaining > 0:
            time.sleep(remaining)

    def _make_cache_key(self, system_prompt, user_prompt, model, is_json):
        raw = f"{model}|{is_json}|{system_prompt}|{user_prompt}"
        return hashlib.sha256(raw.encode("utf-8")).hexdigest()

groq_client = GroqClient()
