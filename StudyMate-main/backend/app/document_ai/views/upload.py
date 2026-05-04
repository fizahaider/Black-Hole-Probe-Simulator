from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser
from drf_spectacular.utils import extend_schema
from ..serializers import DocumentUploadSerializer, DocumentUploadResponseSerializer
from rag.services.rag_service import RAGService
class DocumentUploadView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    @extend_schema(
        request=DocumentUploadSerializer,
        responses={200: DocumentUploadResponseSerializer},
        description="Upload a document file and extract its text content."
    )
    def post(self, request, *args, **kwargs):
        serializer = DocumentUploadSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        uploaded_file = serializer.validated_data['file']
        if not uploaded_file.name.lower().endswith(('.pdf', '.txt', '.docx', '.docs', '.pptx')):
            return Response(
                {"error": "Unsupported file type. Allowed: PDF, TXT, DOCX, PPTX"},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        try:
            space_id = serializer.validated_data.get('space_id')
            space = None
            if space_id:
                from rag.models import KnowledgeSpace
                from django.shortcuts import get_object_or_404
                space = get_object_or_404(KnowledgeSpace, id=space_id, user=request.user)

                                                
                                                          
            doc = RAGService.ingest_document(
                file=uploaded_file,
                user=request.user,
                title=uploaded_file.name,
                space=space
            )
            
                                                           
            return Response({
                "id": str(doc.id),
                "message": "File uploaded and processed successfully",
                "text": "Text processed and chunked.",             
                "page_count": 0                                                           
            }, status=status.HTTP_200_OK)
        except ValueError as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            return Response(
                {"error": f"Failed to process document: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
