import requests
import logging
import os
import hashlib
from typing import Optional
from django.conf import settings
from elevenlabs.client import ElevenLabs

logger = logging.getLogger(__name__)

class SpeechService:
    """
    Service for converting text to speech using ElevenLabs.
    Includes caching to save API credits.
    """
    
    _client = None

    @classmethod
    def get_client(cls):
        if cls._client is None:
            if not settings.ELEVENLABS_API_KEY:
                return None
            cls._client = ElevenLabs(api_key=settings.ELEVENLABS_API_KEY)
        return cls._client

    @staticmethod
    def synthesize_speech(text: str, voice_id: Optional[str] = None) -> Optional[bytes]:
        """
        Converts text to speech and returns audio bytes.
        Uses cache if available.
        """
        if not text:
            return None

                                                   
        voice_id = voice_id or settings.ELEVENLABS_DEFAULT_VOICE
        hash_input = f"{text}_{voice_id}".encode('utf-8')
        text_hash = hashlib.md5(hash_input).hexdigest()
        
        cache_filename = f"{text_hash}.mp3"
        cache_path = os.path.join(settings.SPEECH_CACHE_DIR, cache_filename)

                     
        if os.path.exists(cache_path):
            try:
                with open(cache_path, 'rb') as f:
                    return f.read()
            except Exception as e:
                logger.error(f"Error reading speech cache: {e}")

                                     
        client = SpeechService.get_client()
        if not client:
            logger.warning("ElevenLabs API key not configured.")
            return None

        try:
                            
            try:
                audio_generator = client.text_to_speech.convert(
                    voice_id=voice_id,
                    text=text,
                    model_id="eleven_flash_v2_5",
                    output_format="mp3_44100_128"
                )
            except Exception as e:
                                                                                       
                if "voice_not_found" in str(e).lower() and voice_id != '21m00Tcm4TlvDq8ikWAM':
                    logger.info(f"Voice {voice_id} not found. Falling back to default 'Rachel'.")
                    audio_generator = client.text_to_speech.convert(
                        voice_id='21m00Tcm4TlvDq8ikWAM',
                        text=text,
                        model_id="eleven_multilingual_v2",
                        output_format="mp3_44100_128"
                    )
                else:
                    raise e
            
                                          
            audio_bytes = b"".join(audio_generator)
            
                           
            try:
                with open(cache_path, 'wb') as f:
                    f.write(audio_bytes)
            except Exception as e:
                logger.error(f"Error writing to speech cache: {e}")
                
            return audio_bytes

        except Exception as e:
            logger.error(f"ElevenLabs TTS failed: {e}")
            return None

speech_service = SpeechService()
