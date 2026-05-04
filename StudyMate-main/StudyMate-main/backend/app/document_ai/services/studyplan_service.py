import json
import uuid
from rag.services.rag_service import RAGService
from .groq_client import groq_client
from .prompts import get_enhanced_studyplan_prompt
from ..models import StudyPlan
from rag.models import Document
from django.conf import settings

class StudyPlanService:
    @staticmethod
    def generate_study_plan(document_id, user, time_per_day=1, total_days=7, skill_level="beginner", focus=["read", "review"], learning_style="interactive", revision_strategy="mixed", document_ids=None, space_id=None):
        """
        Generates a state-of-the-art, personalized, and fully document-grounded study plan.
        """
        try:
                                                                                                           
            if document_ids is not None:
                doc_ids = list(document_ids)
            else:
                doc_ids = [document_id] if document_id else []
            
                                                 
            chunks = RAGService.retrieve_relevant_chunks_multi(
                document_ids=doc_ids if doc_ids else None,
                space_id=space_id,
                query=None,                                           
                limit=15 if getattr(settings, "FAST_AI_MODE", True) else 30,
                user=user
            )
            
            if not chunks:
                raise ValueError("No content found for this document to generate a study plan.")

                                              
            context = "\n\n".join([f"[Source: {c.document.title}, Chunk: {c.chunk_index}] {c.text}" for c in chunks])

            if getattr(settings, "FAST_AI_MODE", True):
                tasks = []
                per_task_minutes = max(20, int((time_per_day * 60) / 2))
                for day in range(1, total_days + 1):
                    base_chunk = chunks[(day - 1) % len(chunks)]
                    section = base_chunk.metadata.get("section") or base_chunk.document.title
                    tasks.append({
                        "day": day,
                        "task": f"Read and annotate key ideas from {section}",
                        "task_type": "read",
                        "estimated_time": per_task_minutes,
                        "references": [section]
                    })
                    tasks.append({
                        "day": day,
                        "task": f"Review with quick quiz on {section}",
                        "task_type": "quiz",
                        "estimated_time": per_task_minutes,
                        "references": [section]
                    })
                plan_data = {"schedule": tasks, "total_days": total_days}
            else:
                                        
                system_prompt = get_enhanced_studyplan_prompt(
                    context=context,
                    time_per_day=time_per_day,
                    total_days=total_days,
                    skill_level=skill_level,
                    focus=focus,
                    learning_style=learning_style,
                    revision_strategy=revision_strategy
                )
                user_prompt = "Create a multi-day study plan based on the document provided in the context."
                                  
                response_text = groq_client.get_completion(system_prompt, user_prompt)
                                            
                plan_data = json.loads(response_text)
            
            if 'schedule' not in plan_data:
                raise ValueError("AI response did not contain a valid schedule.")

                                              
            from rag.models import KnowledgeSpace
            
            target_space = None
            if space_id:
                try:
                    target_space = KnowledgeSpace.objects.get(id=space_id)
                except KnowledgeSpace.DoesNotExist:
                    pass
            
            if not target_space and document_id:
                try:
                    doc_obj = Document.objects.get(id=document_id)
                    target_space = doc_obj.space
                except Document.DoesNotExist:
                    pass

            study_plan_obj = StudyPlan.objects.create(
                user=user,
                space=target_space,
                plan_content=plan_data
            )
            
                            
            if doc_ids:
                docs = Document.objects.filter(id__in=doc_ids)
                study_plan_obj.documents.set(docs)

            return {
                "id": str(study_plan_obj.id),
                "schedule": plan_data['schedule'],
                "total_days": int(plan_data.get('total_days', total_days)),
                "space_id": str(target_space.id) if target_space else None
            }

        except json.JSONDecodeError:
            raise Exception("AI returned invalid JSON format.")
        except Exception as e:
                                   
            raise Exception(f"Failed to generate study plan: {str(e)}")
