from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from drf_spectacular.utils import extend_schema
import json
from ..services.groq_client import groq_client
from ..services.prompts import get_flashcard_prompt
from ..serializers import DocumentSummarySerializer, DocumentFlashcardsResponseSerializer, FlashcardDeckSerializer
from ..models import FlashcardDeck
from rag.models import Document
from rag.services.rag_service import RAGService

class DocumentFlashcardsView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        responses={200: FlashcardDeckSerializer(many=True)},
        description="List flashcard decks for a specific space."
    )
    def get(self, request, *args, **kwargs):
        space_id = request.query_params.get('space_id')
        if not space_id:
            return Response({"error": "space_id is required"}, status=status.HTTP_400_BAD_REQUEST)
        
        decks = FlashcardDeck.objects.filter(user=request.user, space_id=space_id).order_by('-created_at')
        serializer = FlashcardDeckSerializer(decks, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @extend_schema(
        request=DocumentSummarySerializer,
        responses={200: DocumentFlashcardsResponseSerializer},
        description="Generate study flashcards from document content."
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

                                                             
            from rag.models import ConceptAsset, UserMastery
            
                                              
            if doc_ids:
                assets = ConceptAsset.objects.filter(concept__document_id__in=doc_ids)
            elif space_id:
                assets = ConceptAsset.objects.filter(concept__document__space_id=space_id)
            else:
                assets = []

            if assets.exists():
                                                      
                all_cards = []
                                                    
                mastery_map = {m.concept_id: m.score for m in UserMastery.objects.filter(user=request.user)}
                
                                                                                  
                sorted_assets = sorted(
                    assets, 
                    key=lambda a: mastery_map.get(a.concept_id, 0)
                )

                for a in sorted_assets:
                    for card in a.flashcards:
                                                           
                        card["concept_name"] = a.concept.name
                        card["concept_type"] = a.concept.type
                        card["parent_concept"] = a.concept.parent.name if a.concept.parent else None
                        card["mastery_score"] = mastery_map.get(a.concept_id, 0)
                        all_cards.append(card)
                
            if assets.exists() and all_cards:
                flashcards_data = {"flashcards": all_cards}
            else:
                                               
                chunks = RAGService.retrieve_relevant_chunks_multi(
                    document_ids=doc_ids if doc_ids else None,
                    space_id=space_id,
                    query=None,
                    limit=15,
                    user=request.user
                )
                if not chunks:
                    return Response({"error": "No content found"}, status=status.HTTP_404_NOT_FOUND)
                
                context = "\n\n".join([c.text for c in chunks])
                system_prompt = get_flashcard_prompt()
                user_prompt = f"Generate flashcards:\n\n{context}"
                response_content = groq_client.get_completion(system_prompt, user_prompt)
                
                try:
                    flashcards_data = json.loads(response_content)
                except:
                    import re
                    match = re.search(r'\[.*\]', response_content, re.DOTALL)
                    flashcards_data = {"flashcards": json.loads(match.group(0)) if match else []}
            
                                   
            from rag.models import KnowledgeSpace
            space = None
            if space_id:
                try:
                    space = KnowledgeSpace.objects.get(id=space_id)
                except: 
                    pass
            elif doc_ids:
                try:
                    first_doc = Document.objects.get(id=doc_ids[0])
                    space = first_doc.space
                except: 
                    pass
                
                                                                                 
            from django.utils import timezone
            from datetime import timedelta
            if doc_ids:
                recent_threshold = timezone.now() - timedelta(seconds=30)
                existing_decks = FlashcardDeck.objects.filter(
                    user=request.user,
                    space=space,
                    created_at__gte=recent_threshold
                ).order_by('-created_at')
                
                target_doc_set = set(str(d) for d in doc_ids)
                for d in existing_decks:
                    if set(str(doc.id) for doc in d.documents.all()) == target_doc_set:
                        return Response({
                            "id": str(d.id),
                            "flashcards": d.cards,
                            "cards": d.cards,                             
                            "space_id": str(space.id) if space else None
                        }, status=status.HTTP_200_OK)

            deck = FlashcardDeck.objects.create(
                user=request.user,
                space=space,
                topic=f"Study Deck ({len(doc_ids)} docs)",
                cards=flashcards_data.get('flashcards', [])
            )
            if doc_ids:
                docs = Document.objects.filter(id__in=doc_ids)
                deck.documents.add(*docs)
            response_data = {
                "id": str(deck.id),
                "flashcards": deck.cards,
                "cards": deck.cards,                                    
                "space_id": str(space.id) if space else None
            }
            return Response(response_data, status=status.HTTP_200_OK)
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.exception("Error in DocumentFlashcardsView.post")
            return Response(
                {"error": str(e)}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
