import json
import random
from .groq_client import groq_client
from .prompts import get_enhanced_quiz_prompt
from rag.services.rag_service import RAGService
from ..models import QuizAttempt
from rag.models import Document
from django.conf import settings

class QuizService:
    @staticmethod
    def generate_quiz(user, document_ids=None, space_id=None, num_questions=5, difficulty="mixed", include_hints=False, conceptual_focus=False):
        """
        Generates a customized, document-grounded quiz from one or multiple documents.
        Uses Layer 3 Constant-Time Retrieval.
        """
        from rag.models import ConceptAsset, UserMastery, KnowledgeSpace
        from django.utils import timezone
        from datetime import timedelta

        try:
                                                 
            if document_ids:
                assets = ConceptAsset.objects.filter(concept__document_id__in=document_ids)
            elif space_id:
                assets = ConceptAsset.objects.filter(concept__document__space_id=space_id)
            else:
                assets = []

            if assets.exists():
                                                                  
                all_questions = []
                mastery_records = {m.concept_id: m.score for m in UserMastery.objects.filter(user=user)}
                
                                                                     
                sorted_assets = sorted(assets, key=lambda a: mastery_records.get(a.concept_id, 0))
                
                for a in sorted_assets:
                    all_questions.extend(a.quiz_questions)

                final_questions = all_questions[:num_questions]
                
            if assets.exists() and final_questions:
                                                    
                pass
            else:
                                                  
                if getattr(settings, "FAST_AI_MODE", True):
                    limit = 6
                else:
                    limit = 15 if conceptual_focus else 10
                chunks = RAGService.retrieve_relevant_chunks_multi(
                    document_ids=document_ids,
                    space_id=space_id,
                    query=None,
                    limit=limit,
                    user=user
                )
                if not chunks:
                    raise ValueError("No content found for generation.")
                
                context = "\n\n".join([f"[Concept: {c.metadata.get('section', 'General')}] {c.text}" for c in chunks])
                system_prompt = get_enhanced_quiz_prompt(
                    context=context,
                    num_questions=num_questions,
                    difficulty=difficulty,
                    include_hints=include_hints,
                    conceptual_focus=conceptual_focus
                )
                user_prompt = f"Generate {num_questions} questions."
                response_content = groq_client.get_completion(system_prompt, user_prompt)
                quiz_data = json.loads(response_content)
                final_questions = quiz_data.get('questions', [])

                                
            for q in final_questions:
                random.shuffle(q['options'])

                                    
            space = None
            if space_id:
                space = KnowledgeSpace.objects.get(id=space_id)
            elif document_ids:
                try:
                    first_doc = Document.objects.get(id=document_ids[0])
                    space = first_doc.space
                except:
                    pass

                                         
            if document_ids:
                recent_threshold = timezone.now() - timedelta(seconds=30)
                existing_attempts = QuizAttempt.objects.filter(
                    user=user,
                    space=space,
                    created_at__gte=recent_threshold
                ).order_by('-created_at')
                
                target_doc_set = set(str(d) for d in document_ids)
                for attempt in existing_attempts:
                    if set(str(d.id) for d in attempt.documents.all()) == target_doc_set:
                        return {
                            "id": str(attempt.id),
                            "questions": attempt.questions,
                            "space_id": str(space.id) if space else None
                        }

            quiz_attempt = QuizAttempt.objects.create(
                user=user,
                space=space,
                questions=final_questions,
                score=0.0
            )
            
            if document_ids:
                docs = Document.objects.filter(id__in=document_ids)
                quiz_attempt.documents.add(*docs)

            return {
                "id": str(quiz_attempt.id),
                "questions": final_questions,
                "space_id": str(space.id) if space else None
            }

        except Exception as e:
            raise Exception(f"Quiz generation failed: {str(e)}")
