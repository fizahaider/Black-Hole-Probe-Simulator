import requests
from typing import Optional
from django.conf import settings
import logging

logger = logging.getLogger(__name__)

class DeepgramService:
    @staticmethod
    def transcribe_audio(
        audio_bytes: bytes,
        content_type: str = "audio/wav"
    ) -> Optional[str]:
        if not settings.DEEPGRAM_API_KEY:
            logger.warning("Deepgram API key not configured.")
            return None

        try:
            url = "https://api.deepgram.com/v1/listen"
            headers = {
                "Authorization": f"Token {settings.DEEPGRAM_API_KEY}",
                "Content-Type": content_type
            }
            params = {
                "model": "nova-2",
                "smart_format": "true",
                "language": "en-US"
            }

                                                          
            response = requests.post(
                url, 
                headers=headers, 
                params=params, 
                data=audio_bytes,
                timeout=30
            )
            
            if response.status_code != 200:
                logger.error(f"Deepgram Error {response.status_code}: {response.text}")
                return None

            data = response.json()
            transcript = data['results']['channels'][0]['alternatives'][0]['transcript']
            return transcript

        except Exception as e:
            logger.exception("Deepgram REST Exception")
            logger.error(f"Deepgram STT failed: {e}")
            return None

deepgram_service = DeepgramService()
