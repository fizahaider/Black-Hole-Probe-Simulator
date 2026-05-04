from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from drf_spectacular.utils import extend_schema, OpenApiParameter
from rag.models import ChatMessage, Concept, ConceptAsset, Document
import logging

logger = logging.getLogger(__name__)

class PinChatMessageView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        description="Pin a chat discovery to the permanent concept library.",
        responses={201: {"id": "uuid", "message": "string"}}
    )
    def post(self, request, *args, **kwargs):
        message_id = request.data.get('message_id')
        concept_name = request.data.get('concept_name')

        if not message_id:
            return Response({"error": "message_id is required"}, status=status.HTTP_400_BAD_REQUEST)

        try:
                                                       
            msg = ChatMessage.objects.select_related('conversation', 'conversation__document').get(
                id=message_id, 
                conversation__user=request.user
            )

            if msg.role != 'assistant':
                return Response({"error": "Only AI answers can be pinned as notes."}, status=status.HTTP_400_BAD_REQUEST)

            doc = msg.conversation.document
            if not doc:
                return Response({"error": "This chat is not linked to a specific document."}, status=status.HTTP_400_BAD_REQUEST)

                                             
            sources = msg.sources.all()
            anchor_chunks = [str(s.chunk_index) for s in sources]
            
                                            
            concept = Concept.objects.create(
                document=doc,
                name=concept_name or f"Discovery: {msg.content[:30]}...",
                type='core_concept',
                anchor_chunks=anchor_chunks,
                metadata={
                    "origin": "chat_pin",
                    "chat_message_id": str(msg.id),
                    "rewritten_query": msg.metadata.get("rewritten_query")
                }
            )

                                    
            asset = ConceptAsset.objects.create(
                concept=concept,
                summary=msg.content,
                metadata={"synthesis_version": "2.1-pinned"}
            )

            return Response({
                "id": str(concept.id),
                "message": "Discovery pinned to your permanent library successfully.",
                "concept_name": concept.name
            }, status=status.HTTP_201_CREATED)

        except ChatMessage.DoesNotExist:
            return Response({"error": "ChatMessage not found."}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.exception("Error pinning chat message")
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
