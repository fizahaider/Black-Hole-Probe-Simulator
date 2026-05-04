import json
import logging
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from drf_spectacular.utils import extend_schema
from ..services.groq_client import groq_client
from ..services.prompts import get_mind_map_prompt
from ..serializers import MindMapRequestSerializer, MindMapResponseSerializer, MindMapModelSerializer
from ..models import MindMap
from rag.models import Document, KnowledgeSpace
from rag.services.rag_service import RAGService

logger = logging.getLogger(__name__)

class MindMapGenerateView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        responses={200: MindMapModelSerializer(many=True)},
        description="List mind maps for a specific space."
    )
    def get(self, request, *args, **kwargs):
        space_id = request.query_params.get('space_id')
        if not space_id:
            return Response({"error": "space_id is required"}, status=status.HTTP_400_BAD_REQUEST)
        
        mind_maps = MindMap.objects.filter(user=request.user, space_id=space_id).order_by('-created_at')
        serializer = MindMapModelSerializer(mind_maps, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @extend_schema(
        request=MindMapRequestSerializer,
        responses={200: MindMapResponseSerializer},
        description="Generate a hierarchical mind map in JSON format from document content."
    )
    def post(self, request, *args, **kwargs):
        try:
            serializer = MindMapRequestSerializer(data=request.data)
            if not serializer.is_valid():
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

            doc_id = serializer.validated_data.get('document_id')
            doc_ids = serializer.validated_data.get('document_ids', [])
            space_id = serializer.validated_data.get('space_id')

            if doc_id and doc_id not in doc_ids:
                doc_ids.append(doc_id)
            
            if not doc_ids and not space_id:
                return Response(
                    {"error": "Either document_ids or space_id must be provided"}, 
                    status=status.HTTP_400_BAD_REQUEST
                )

                                                  
            chunks = RAGService.retrieve_relevant_chunks_multi(
                document_ids=doc_ids if doc_ids else None,
                space_id=space_id,
                query=None,                                    
                limit=20,                                            
                user=request.user
            )
            
            if not chunks:
                return Response({"error": "No content found to generate mind map"}, status=status.HTTP_404_NOT_FOUND)
            
            context = "\n\n".join([c.text for c in chunks])
            system_prompt = get_mind_map_prompt(context)
            user_prompt = "Generate the hierarchical mind map JSON."

            response_content = groq_client.get_completion(system_prompt, user_prompt)
            
            try:
                mind_map_json = json.loads(response_content)
            except json.JSONDecodeError:
                                                                            
                import re
                match = re.search(r'\{.*\}', response_content, re.DOTALL)
                if match:
                    mind_map_json = json.loads(match.group(0))
                else:
                    raise ValueError("Failed to parse mind map JSON")

                              
            space = None
            if space_id:
                try:
                    space = KnowledgeSpace.objects.get(id=space_id)
                except: pass
            elif doc_ids:
                 try:
                    first_doc = Document.objects.get(id=doc_ids[0])
                    space = first_doc.space
                 except: pass

            mind_map_obj = MindMap.objects.create(
                user=request.user,
                space=space,
                content=mind_map_json,
                title=mind_map_json.get('title', 'Main Topic')
            )
            if doc_ids:
                docs = Document.objects.filter(id__in=doc_ids)
                mind_map_obj.documents.add(*docs)

            return Response({
                "id": str(mind_map_obj.id),
                "space_id": str(space.id) if space else None,
                "mind_map": mind_map_json
            }, status=status.HTTP_200_OK)

        except Exception as e:
            logger.exception("Error in MindMapGenerateView.post")
            return Response(
                {"error": str(e)}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
