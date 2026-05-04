import logging
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.http import HttpResponse
from rest_framework.permissions import IsAuthenticated
from ..services.speech_service import speech_service
from ..services.deepgram_service import deepgram_service
from ..serializers import TextToSpeechSerializer, SpeechToTextSerializer
from drf_spectacular.utils import extend_schema

logger = logging.getLogger(__name__)

class SpeechToTextView(APIView):
    """
    Endpoint for converting speech to text using Deepgram.
    Accepts an audio file and returns the transcript.
    """
    permission_classes = [IsAuthenticated]
    serializer_class = SpeechToTextSerializer

    @extend_schema(request=SpeechToTextSerializer)
    def post(self, request):
        audio_file = request.FILES.get('audio')
        logger.debug(f"STT Request received. Audio file: {audio_file}")
        if not audio_file:
            return Response(
                {"error": "Audio file is required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        logger.debug(f"Audio size: {audio_file.size}, type: {audio_file.content_type}")

        try:
            audio_bytes = audio_file.read()
            logger.debug(f"Read {len(audio_bytes)} bytes from file.")

            transcript = deepgram_service.transcribe_audio(audio_bytes, content_type=audio_file.content_type)

            if transcript is None:
                logger.error("Transcription failed (returned None). Check Deepgram service logs.")
                return Response(
                    {"error": "Transcription failed. Please check the audio file and try again."},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )

            logger.debug(f"Transcription successful: {transcript[:50]}...")
            return Response({"transcript": transcript})

        except Exception as e:
            logger.exception("Exception in STT View")
            return Response(
                {"error": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class TextToSpeechView(APIView):
    """
    Endpoint for converting text to speech.
    Returns MP3 audio data.
    """
    permission_classes = [IsAuthenticated]
    serializer_class = TextToSpeechSerializer

    @extend_schema(request=TextToSpeechSerializer)
    def post(self, request):
        text = request.data.get('text')
        voice_id = request.data.get('voice_id')

        if not text:
            return Response(
                {"error": "Text is required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        audio_bytes = speech_service.synthesize_speech(text, voice_id)

        if not audio_bytes:
            return Response(
                {"error": "Failed to synthesize speech."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        response = HttpResponse(audio_bytes, content_type="audio/mpeg")
        response['Content-Disposition'] = 'attachment; filename="speech.mp3"'
        return response
