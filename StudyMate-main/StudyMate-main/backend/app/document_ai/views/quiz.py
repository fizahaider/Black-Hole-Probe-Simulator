from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from drf_spectacular.utils import extend_schema
from rest_framework.generics import RetrieveUpdateAPIView
import json
from ..services.groq_client import groq_client
from ..models import QuizAttempt
from ..serializers import DocumentQuizRequestSerializer, DocumentQuizResponseSerializer, QuizAttemptSerializer
from django.utils import timezone

class DocumentQuizView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        responses={200: QuizAttemptSerializer(many=True)},
        description="List quiz attempts for a specific space."
    )
    def get(self, request, *args, **kwargs):
        space_id = request.query_params.get('space_id')
        if not space_id:
            return Response({"error": "space_id is required"}, status=status.HTTP_400_BAD_REQUEST)
        
        attempts = QuizAttempt.objects.filter(user=request.user, space_id=space_id).order_by('-created_at')
        serializer = QuizAttemptSerializer(attempts, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @extend_schema(
        request=DocumentQuizRequestSerializer,
        responses={200: DocumentQuizResponseSerializer},
        description="Generate a customized multiple-choice quiz from document content."
    )
    def post(self, request, *args, **kwargs):
        try:
            serializer = DocumentQuizRequestSerializer(data=request.data)
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

            num_questions = serializer.validated_data['num_questions']
            difficulty = serializer.validated_data['difficulty']
            include_hints = serializer.validated_data['include_hints']
            conceptual_focus = serializer.validated_data['conceptual_focus']

            from ..services.quiz_service import QuizService
            
            quiz_data = QuizService.generate_quiz(
                user=request.user,
                document_ids=doc_ids,
                space_id=space_id,
                num_questions=num_questions,
                difficulty=difficulty,
                include_hints=include_hints,
                conceptual_focus=conceptual_focus
            )
            
            return Response(quiz_data, status=status.HTTP_200_OK)
        except ValueError as e:
            return Response({"error": str(e)}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.exception("Error in DocumentQuizView.post")
            return Response(
                {"error": str(e)}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class QuizAttemptDetailView(RetrieveUpdateAPIView):
    permission_classes = [IsAuthenticated]
    queryset = QuizAttempt.objects.all()
    serializer_class = QuizAttemptSerializer
    
    def get_queryset(self):
        return QuizAttempt.objects.filter(user=self.request.user)

    def perform_update(self, serializer):
                                                      
        attempt = serializer.save()
        
                                                        
        from rag.models import UserMastery, Concept
        
                                       
        concept_stats = {}                                             
        
        def _clean(s):
            import re
                                                                                              
            s = str(s).strip().lower()
            return re.sub(r'^[^\w]+|[^\w]+$', '', s)

        for i, q in enumerate(attempt.questions):
            concept_id = q.get("concept_id")
            if not concept_id:
                continue
                
            if concept_id not in concept_stats:
                concept_stats[concept_id] = [0, 0]
            
            user_answer = _clean(attempt.user_answers.get(str(i), ""))
            correct_answer = _clean(q.get("correct_answer") or q.get("answer", ""))
            is_correct = user_answer == correct_answer
            
            import logging
            view_logger = logging.getLogger(__name__)
            view_logger.info(f"Quiz Scoring Q{i} (Attempt {attempt.id}): User='{user_answer}' | Correct='{correct_answer}' | Match={is_correct}")
            
            concept_stats[concept_id][1] += 1
            if is_correct:
                concept_stats[concept_id][0] += 1
        
                                
        for concept_id, stats in concept_stats.items():
            correct, total = stats
            accuracy = correct / total
            
            mastery, created = UserMastery.objects.get_or_create(
                user=self.request.user,
                concept_id=concept_id
            )
            
            old_attempts = mastery.attempts
            mastery.attempts += 1
            if old_attempts == 0:
                mastery.score = accuracy
            else:
                mastery.score = (mastery.score * 0.4) + (accuracy * 0.6)
            mastery.score = max(0.0, min(1.0, mastery.score))
            mastery.last_attempt = timezone.now()
            mastery.save()

        total_questions = 0
        total_correct = 0
        for idx, user_answer in (attempt.user_answers or {}).items():
            if not str(idx).isdigit():
                continue
            question_index = int(idx)
            if question_index >= len(attempt.questions):
                continue
            total_questions += 1
            question = attempt.questions[question_index]
            correct_answer = question.get("correct_answer") or question.get("answer", "")
            if _clean(user_answer) == _clean(correct_answer):
                total_correct += 1
        attempt.score = round((total_correct / total_questions) * 100, 1) if total_questions else 0
        attempt.save(update_fields=['score', 'updated_at'])
