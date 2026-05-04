from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from drf_spectacular.utils import extend_schema
from ..services.groq_client import groq_client
from ..services.prompts import get_summary_prompt
from ..serializers import DocumentSummarySerializer, DocumentSummaryResponseSerializer, SummaryModelSerializer
from ..models import Summary
from rag.models import Document
from django.conf import settings
import logging

logger = logging.getLogger(__name__)

class DocumentSummaryView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        responses={200: SummaryModelSerializer(many=True)},
        description="List summaries for a specific space."
    )
    def get(self, request, *args, **kwargs):
        space_id = request.query_params.get('space_id')
        if not space_id:
            return Response({"error": "space_id is required"}, status=status.HTTP_400_BAD_REQUEST)
        
        summaries = Summary.objects.filter(user=request.user, space_id=space_id).order_by('-created_at')
        serializer = SummaryModelSerializer(summaries, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @extend_schema(
        request=DocumentSummarySerializer,
        responses={200: DocumentSummaryResponseSerializer},
        description="Generate a concise professional summary of document text."
    )
    def post(self, request, *args, **kwargs):
        try:
            serializer = DocumentSummarySerializer(data=request.data)
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

            summary_length = serializer.validated_data.get('summary_length', 'medium')
            tone = serializer.validated_data.get('tone', 'neutral')
            purpose = serializer.validated_data.get('purpose', 'revision')
            emphasis = serializer.validated_data.get('emphasis', 'key_points')
            structure = serializer.validated_data.get('structure', 'paragraph')
            from rag.services.rag_service import RAGService
            
                                              
            from rag.models import ConceptAsset
            
                                                                           
            if doc_ids:
                assets = ConceptAsset.objects.filter(concept__document_id__in=doc_ids).order_by('concept__created_at')
            elif space_id:
                assets = ConceptAsset.objects.filter(concept__document__space_id=space_id).order_by('concept__created_at')
            else:
                assets = []

            if assets.exists():
                                                                         
                                                                                
                sorted_assets = sorted(
                    assets, 
                    key=lambda a: a.concept.anchor_chunks[0] if a.concept.anchor_chunks else 999
                )
                
                                           
                ordered_content = "\n\n".join([f"Concept: {a.concept.name}\nRaw Summary: {a.summary}" for a in sorted_assets])
                
                                                            
                doc_essence = "General educational context."
                if doc_ids:
                    first_doc = Document.objects.filter(id=doc_ids[0]).first()
                    if first_doc and first_doc.essence:
                        doc_essence = first_doc.essence

                if getattr(settings, "FAST_AI_MODE", True):
                    summary_text = "\n\n".join([f"### {a.concept.name}\n{a.summary}" for a in sorted_assets[:8]])
                else:
                    from ..services.prompts import get_master_synthesis_prompt
                    system_prompt = get_master_synthesis_prompt(
                        ordered_content, 
                        doc_essence,
                        length=summary_length,
                        tone=tone,
                        emphasis=emphasis,
                        purpose=purpose,
                        structure=structure
                    )
                    user_prompt = "Produce the Master Synthesis for this document."
                    try:
                        summary_text = groq_client.get_completion(system_prompt, user_prompt, bypass_cache=is_regenerate)
                    except Exception as e:
                        logger.warning(f"Master synthesis failed, returning merged concept summaries: {e}")
                        summary_text = "\n\n".join([f"### {a.concept.name}\n{a.summary}" for a in sorted_assets[:8]])
            else:
                # Fallback: Retrieve chunks directly for summarization
                is_multi_doc = len(doc_ids) > 1 if doc_ids else False
                chunks = RAGService.retrieve_relevant_chunks_multi(
                    document_ids=doc_ids if doc_ids else None,
                    space_id=space_id,
                    query=None,  # No specific query, get general content
                    limit=8 if getattr(settings, "FAST_AI_MODE", True) else 15,
                    user=request.user
                )
                if not chunks:
                    return Response({"error": "No content found in selected documents. Please ensure the document has been fully processed."}, status=status.HTTP_404_NOT_FOUND)
                            
                context = "\n\n".join([f"[From: {c.document.title}] {c.text}" for c in chunks])
                system_prompt = get_summary_prompt(
                    length=summary_length, 
                    tone=tone,
                    purpose=purpose,
                    emphasis=emphasis,
                    structure=structure,
                    is_multi_document=is_multi_doc  # Enable multi-document synthesis
                )
                user_prompt = f"Summarize the following content:\n\n{context}"
                try:
                    summary_text = groq_client.get_completion(system_prompt, user_prompt, bypass_cache=is_regenerate)
                except Exception as e:
                    logger.error(f"Summary generation failed: {e}")
                    return Response(
                        {"error": f"AI summary generation failed: {str(e)}. Please try again in a moment."}, 
                        status=status.HTTP_503_SERVICE_UNAVAILABLE
                    )
            
                             
            from rag.models import KnowledgeSpace
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
                
                                                                                 
            from django.utils import timezone
            from datetime import timedelta
            
            # Check for regenerate flag - bypass cache if regenerating
            is_regenerate = request.data.get('is_regenerate', False)
            
            if doc_ids and not is_regenerate:
                recent_threshold = timezone.now() - timedelta(seconds=30)
                existing_summaries = Summary.objects.filter(
                    user=request.user,
                    space=space,
                    created_at__gte=recent_threshold
                ).order_by('-created_at')
                
                target_doc_set = set(str(d) for d in doc_ids)
                for s in existing_summaries:
                    if set(str(d.id) for d in s.documents.all()) == target_doc_set:
                                                                             
                        return Response({
                            "id": str(s.id),
                            "summary": s.content,
                            "space_id": str(space.id) if space else None,
                            "cached": True
                        }, status=status.HTTP_200_OK)

            summary_obj = Summary.objects.create(
                user=request.user,
                space=space,
                content=summary_text,
                summary_type=purpose
            )
            if doc_ids:
                docs = Document.objects.filter(id__in=doc_ids)
                summary_obj.documents.add(*docs)

            response_data = {
                "id": str(summary_obj.id),
                "summary": summary_text,
                "space_id": str(space.id) if space else None
            }
            return Response(response_data, status=status.HTTP_200_OK)
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.exception("Error in DocumentSummaryView.post")
            return Response(
                {"error": str(e)}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
