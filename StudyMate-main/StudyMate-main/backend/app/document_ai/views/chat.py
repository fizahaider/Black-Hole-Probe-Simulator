import uuid
import logging
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from drf_spectacular.utils import extend_schema, OpenApiParameter
from ..services.groq_client import groq_client
from ..services.prompts import get_chat_prompt
from ..serializers import DocumentChatSerializer, DocumentChatResponseSerializer
from rag.models import Conversation
from rag.serializers import ConversationSerializer
from rag.services.rag_service import RAGService

logger = logging.getLogger(__name__)

class DocumentChatView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        responses={"200": "ConversationSerializer"},
        parameters=[
            OpenApiParameter(name="document_id", type=uuid.UUID, location=OpenApiParameter.QUERY),
            OpenApiParameter(name="space_id", type=uuid.UUID, location=OpenApiParameter.QUERY),
            OpenApiParameter(name="conversation_id", type=uuid.UUID, location=OpenApiParameter.QUERY),
        ],
        description="Fetch existing conversation history for a document or space."
    )
    def get(self, request, *args, **kwargs):
        doc_id = request.query_params.get('document_id')
        space_id = request.query_params.get('space_id')
        conv_id = request.query_params.get('conversation_id')
        
        user = request.user
        conversation = None
        
        if conv_id:
            conversation = Conversation.objects.filter(id=conv_id, user=user).first()
        elif doc_id:
            conversation = Conversation.objects.filter(document_id=doc_id, user=user).order_by('-updated_at').first()
        elif space_id:
            conversation = Conversation.objects.filter(space_id=space_id, user=user).order_by('-updated_at').first()
        else:
                                                                                 
            conversation = Conversation.objects.filter(user=user).order_by('-updated_at').first()
            
        if not conversation:
            return Response({"detail": "No previous conversation found."}, status=status.HTTP_404_NOT_FOUND)
            
        serializer = ConversationSerializer(conversation)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @extend_schema(
        request=DocumentChatSerializer,
        responses={200: DocumentChatResponseSerializer},
        description="Ask questions about a document's content using AI."
    )
    def post(self, request, *args, **kwargs):
        serializer = DocumentChatSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        document_id = serializer.validated_data.get('document_id')
        document_ids = serializer.validated_data.get('document_ids', [])
        if document_id and document_id not in document_ids:
            document_ids.append(document_id)
            
        question = serializer.validated_data.get('question')
        conversation_id = serializer.validated_data.get('conversation_id')
        personality = serializer.validated_data.get('personality', 'neutral')
        depth = serializer.validated_data.get('depth', 'detailed')
        stream = serializer.validated_data.get('stream', False)

        try:
            response_data = RAGService.get_response(
                user=request.user,
                message=question,
                document_ids=document_ids,
                conversation_id=conversation_id,
                personality=personality,
                depth=depth,
                stream=stream
            )
            
            if stream:
                from django.http import StreamingHttpResponse
                return StreamingHttpResponse(
                    response_data, 
                    content_type='text/plain'                                      
                )
            
            return Response(response_data, status=status.HTTP_200_OK)
        except Exception as e:
            logger.exception("Chat Error")
            return Response(
                {"error": str(e)}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
