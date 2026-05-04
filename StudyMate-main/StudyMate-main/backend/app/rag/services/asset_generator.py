import json
import logging
import time
from typing import List, Dict, Any
from ..models import Document, Concept, ConceptAsset, DocumentChunk
from document_ai.services.groq_client import groq_client
from document_ai.services import prompts

logger = logging.getLogger(__name__)

class AssetGenerator:
    """Generate stored study assets for each concept."""
    PER_CONCEPT_DELAY_SECONDS = 1.2

    @staticmethod
    def generate_for_concept(concept: Concept, retry_count=0):
        """Generate assets for one concept from nearby chunks."""
        logger.info(f"Generating assets for concept: {concept.name}...")
        neighboring_indices = set()
        for idx in concept.anchor_chunks:
            neighboring_indices.add(idx)
            neighboring_indices.add(idx - 1)
            neighboring_indices.add(idx + 1)
        
        chunks = DocumentChunk.objects.filter(
            document=concept.document,
            chunk_index__in=list(neighboring_indices)
        ).filter(chunk_index__gte=0).order_by('chunk_index')
        
        context_text = "\n\n".join([c.text for c in chunks])
        if not context_text:
            logger.warning(f"No context text found for concept: {concept.name}")
            return
        
        logger.debug(f"Concept '{concept.name}' context size: {len(context_text)} chars.")

        system_prompt = prompts.get_concept_synthesis_prompt(
            concept_name=concept.name,
            dna_essence=concept.document.essence or "General educational context.",
            concept_type=concept.get_type_display(),
            parent_name=concept.parent.name if concept.parent else None,
            definition=concept.metadata.get('definition')
        )

        try:
            logger.debug(f"Requesting concept assets for: {concept.name}")
            response = groq_client.get_completion(system_prompt, f"Context segment:\n{context_text}")
            logger.debug(f"Received concept assets for: {concept.name}")
            
            try:
                data = json.loads(response)
            except json.JSONDecodeError:
                import re
                match = re.search(r'\{.*\}', response, re.DOTALL)
                if match:
                    data = json.loads(match.group(0))
                else:
                    raise ValueError("Failed to parse assets JSON")

            asset, created = ConceptAsset.objects.get_or_create(concept=concept)
            asset.summary = AssetGenerator._normalize_text(data.get("summary", ""))
            asset.flashcards = AssetGenerator._normalize_flashcards(data.get("flashcards", []))
            
            asset.metadata = asset.metadata or {}
            asset.metadata["synthesis_version"] = "2.0"
            
            questions = data.get("quiz_questions", [])
            valid_questions = []
            
            for q in questions:
                q["concept_id"] = str(concept.id)
                q["concept_name"] = concept.name
                
                opts = q.get("options", [])
                opts = [AssetGenerator._strip_option_label(str(o).strip()) for o in opts]
                correct_raw = str(q.get("correct_answer") or q.get("answer", "")).strip()
                if not opts or not correct_raw:
                    continue
                    
                correct_lower = correct_raw.lower()
                
                best_match = None
                if len(correct_lower) == 1 and correct_lower in "abcd":
                    idx = "abcd".index(correct_lower)
                    if idx < len(opts):
                        best_match = opts[idx]
                
                elif any(x in correct_lower for x in ["option", "choice", ")", "."]) and len(correct_lower) < 15:
                    import re
                    match = re.search(r'([1-4a-d])', correct_lower)
                    if match:
                        val = match.group(1)
                        if val.isdigit():
                            idx = int(val) - 1
                        else:
                            idx = "abcd".index(val)
                        if 0 <= idx < len(opts):
                            best_match = opts[idx]
                
                if not best_match:
                    for o in opts:
                        if str(o).strip().lower() == correct_lower:
                            best_match = o
                            break
                    if not best_match:
                        for o in opts:
                            if str(o).strip().lower() in correct_lower or correct_lower in str(o).strip().lower():
                                best_match = o
                                break
                
                if best_match:
                    q["correct_answer"] = best_match
                    q["options"] = opts
                    q["question"] = AssetGenerator._normalize_text(q.get("question", ""))
                    q["hint"] = AssetGenerator._normalize_text(q.get("hint", ""))
                    valid_questions.append(q)
            
            if len(valid_questions) < 1 and len(questions) > 0:
                 if retry_count < 1:
                     logger.warning(f"Quiz validation failed for {concept.name}. Retrying once...")
                     return AssetGenerator.generate_for_concept(concept, retry_count=1)
                 else:
                     logger.error(f"Quiz validation failed for {concept.name} after retry. Discarding asset.")
                     return None

            asset.quiz_questions = valid_questions
            if not asset.summary or len(asset.summary.strip()) < 50:
                logger.warning(f"Summary too short for concept {concept.name}, skipping save")
                return None
            if not isinstance(asset.flashcards, list) or len(asset.flashcards) < 1:
                logger.warning(f"No flashcards generated for {concept.name}, skipping save")
                return None
            asset.save()
            
            logger.info(f"Successfully generated assets for concept: {concept.name}")
            return asset

        except Exception as e:
            if retry_count < 1:
                logger.warning(f"Asset synthesis failed for {concept.name}, retrying: {e}")
                return AssetGenerator.generate_for_concept(concept, retry_count=1)
            logger.error(f"Asset synthesis failed for concept {concept.name} after retry: {e}")
            return None

    @staticmethod
    def generate_all_for_document(document: Document):
        """
        Batch processes all concepts identified in a document.
        """
        concepts = document.concepts.all()
        logger.info(f"Starting batch asset generation for {len(concepts)} concepts in doc {document.id}")
        assets = []
        for i, concept in enumerate(concepts):
            logger.info(f"Processing concept {i+1}/{len(concepts)}: {concept.name}")
            asset = AssetGenerator.generate_for_concept(concept)
            if asset:
                assets.append(asset)
            if i < len(concepts) - 1:
                time.sleep(AssetGenerator.PER_CONCEPT_DELAY_SECONDS)
        
        logger.info(f"Batch generation completed for doc {document.id}. Total assets: {len(assets)}")
        return assets

    @staticmethod
    def _normalize_text(value):
        return " ".join(str(value or "").split()).strip()

    @staticmethod
    def _normalize_flashcards(cards):
        normalized = []
        if not isinstance(cards, list):
            return normalized
        for card in cards:
            if not isinstance(card, dict):
                continue
            front = AssetGenerator._normalize_text(card.get("front", ""))
            back = AssetGenerator._normalize_text(card.get("back", ""))
            if front and back:
                normalized.append({"front": front, "back": back})
        return normalized

    @staticmethod
    def _strip_option_label(value):
        cleaned = value.strip()
        prefixes = ("A)", "B)", "C)", "D)", "A.", "B.", "C.", "D.")
        for prefix in prefixes:
            if cleaned.upper().startswith(prefix):
                return cleaned[len(prefix):].strip()
        return cleaned
