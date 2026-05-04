from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from drf_spectacular.utils import extend_schema
from django.shortcuts import get_object_or_404

import logging
logger = logging.getLogger(__name__)

from .models import Document, ChatMessage, VectorIndex, Conversation
from .serializers import (
    ChatRequestSerializer,
    ChatResponseSerializer,
    DocumentSerializer,
    RAGDocumentUploadSerializer,
    VectorIndexSerializer,
    KnowledgeSpaceSerializer,
    ConversationSerializer,
)
from .models import KnowledgeSpace
from rest_framework import generics
from .services.rag_service import RAGService


class RAGChatView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        request=ChatRequestSerializer,
        responses={200: ChatResponseSerializer},
    )
    def post(self, request):
        serializer = ChatRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        message = serializer.validated_data['message']
        document_ids = serializer.validated_data.get('document_ids')
        conversation_id = serializer.validated_data.get('conversation_id')
        personality = serializer.validated_data.get('personality', 'neutral')
        depth = serializer.validated_data.get('depth', 'detailed')
        space_id = serializer.validated_data.get('space_id')
        
        try:
                                                                          
            response_data = RAGService.get_response(
                user=request.user,
                message=message,
                document_ids=document_ids,
                conversation_id=conversation_id,
                personality=personality,
                depth=depth,
                space_id=space_id
            )
            
                                                  
            response_serializer = ChatResponseSerializer(response_data)
            return Response(response_serializer.data, status=status.HTTP_200_OK)
            
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.exception("Unexpected error in RAGChatView")
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )



class ConversationHistoryView(generics.ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = ConversationSerializer

    def list(self, request, *args, **kwargs):
        try:
            queryset = self.filter_queryset(self.get_queryset())
            page = self.paginate_queryset(queryset)
            if page is not None:
                serializer = self.get_serializer(page, many=True)
                return self.get_paginated_response(serializer.data)

            serializer = self.get_serializer(queryset, many=True)
            return Response(serializer.data)
        except Exception as e:
            logger.exception("Internal error in ConversationHistoryView")
            return Response({
                "error": str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def get_queryset(self):
        queryset = Conversation.objects.filter(user=self.request.user)
        
                                        
        space_id = self.request.query_params.get('space_id')
        if space_id and space_id not in ['null', 'undefined', '']:
            try:
                queryset = queryset.filter(space_id=space_id)
            except (ValueError, TypeError):
                                                                 
                pass
        
        return queryset.order_by('-updated_at')


class DocumentUploadView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        request=RAGDocumentUploadSerializer,
        responses={201: DocumentSerializer},
    )
    def post(self, request):
        serializer = RAGDocumentUploadSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        file = serializer.validated_data['file']
        title = serializer.validated_data.get('title') or file.name
        
        space_id = serializer.validated_data.get('space_id')
        space = None
        if space_id:
            space = get_object_or_404(KnowledgeSpace, id=space_id, user=request.user)
        
        try:
            document = RAGService.ingest_document(
                file=file,
                user=request.user,
                title=title,
                space=space,
            )
            
            return Response(
                DocumentSerializer(document).data,
                status=status.HTTP_201_CREATED
            )
        except ValueError as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            logger.exception("Document upload failed")
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def _get_file_type(self, filename):
        ext = filename.split('.')[-1].lower()
        if ext in ['pdf']:
            return 'pdf'
        elif ext in ['txt']:
            return 'txt'
        elif ext in ['docx', 'docs']:
            return 'docx'
        elif ext in ['pptx']:
            return 'pptx'
        elif ext in ['jpg', 'jpeg', 'png', 'gif', 'bmp']:
            return 'image'
        else:
            return 'text'


class DocumentListView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        responses={200: DocumentSerializer(many=True)},
    )
    def get(self, request):
        try:
            space_id = request.query_params.get('space_id')
            documents = Document.objects.filter(user=request.user)
            
            if space_id and space_id not in ['null', 'undefined', '']:
                try:
                    documents = documents.filter(space_id=space_id)
                except (ValueError, TypeError) as e:
                    logger.error(f"Error filtering by space_id: {e}")
                    pass
            
                                                                       
            documents_list = list(documents)
            
            serializer = DocumentSerializer(documents_list, many=True)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except Exception as e:
            logger.exception("Error in DocumentListView")
            return Response({
                "error": str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class DocumentDeleteView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        responses={204: None},
    )
    def delete(self, request, document_id):
        document = get_object_or_404(Document, id=document_id, user=request.user)
        document.delete()
        try:
            RAGService.rebuild_index(user=request.user)
        except:
            pass
        return Response(status=status.HTTP_204_NO_CONTENT)


class RebuildIndexView(APIView):
    permission_classes = [IsAuthenticated]
    serializer_class = None                                         

    @extend_schema(
        request=None,
        responses={200: VectorIndexSerializer},
    )
    def post(self, request):
        try:
            index_info = RAGService.rebuild_index(user=request.user)
            
            return Response(
                {'message': 'Index rebuilt successfully', 'index_info': index_info},
                status=status.HTTP_200_OK
            )
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class KnowledgeSpaceListCreateView(generics.ListCreateAPIView):
    serializer_class = KnowledgeSpaceSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return KnowledgeSpace.objects.filter(user=self.request.user).order_by('-updated_at')

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class KnowledgeSpaceDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = KnowledgeSpaceSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return KnowledgeSpace.objects.filter(user=self.request.user)

    def perform_destroy(self, instance):
        """Delete KnowledgeSpace and related documents via cascade."""
        instance.delete()

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        self.perform_destroy(instance)
        return Response(
            {"message": "Knowledge Space and all associated documents deleted successfully."},
            status=status.HTTP_200_OK
        )
