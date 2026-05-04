from typing import List, Dict, Any
from collections import Counter
from ..models import DocumentChunk
import logging
from document_ai.services.groq_client import groq_client
import json

logger = logging.getLogger(__name__)

class AnchorProfiler:
    """Build concept anchors from document text."""
    
    STOPWORDS = {
        'the', 'is', 'at', 'which', 'on', 'and', 'a', 'an', 'of', 'in', 'to', 'for', 'with', 
        'that', 'by', 'this', 'it', 'from', 'as', 'are', 'was', 'were', 'be', 'an', 'if', 
        'or', 'but', 'not', 'what', 'all', 'we', 'can', 'has', 'have', 'more', 'one', 
        'my', 'you', 'your', 'about', 'some', 'had', 'been', 'will', 'no', 'only',
        'these', 'their', 'his', 'her', 'its', 'they', 'who', 'how', 'when', 'where', 'why'
    }

    @staticmethod
    def profile_hierarchy_scout(document_id: str) -> Dict[str, Any]:
        """Build a simple hierarchy from the first chunks."""
        logger.info(f"Scouting hierarchy for document {document_id}...")
        chunks = DocumentChunk.objects.filter(document_id=document_id).order_by('chunk_index')[:3]
        if not chunks:
            return {}

        context_text = "\n\n".join([c.text for c in chunks])
        
        system_prompt = """Analyze the text and identify the main learning hierarchy.
Scan the provided text and identify the primary hierarchy of educational concepts.
Output MUST be a valid JSON object:
{
  "themes": [
    {
      "name": "Core Theme",
      "subconcepts": ["Subconcept 1", "Subconcept 2"],
      "type": "heading"
    }
  ]
}
No preamble. Only valid JSON."""

        try:
            response = groq_client.get_completion(system_prompt, context_text)
            return json.loads(response)
        except Exception as e:
            logger.error(f"Hierarchy scouting failed: {e}")
            return {}

    @staticmethod
    def profile_document(document_id: str) -> List[Dict[str, Any]]:
        logger.info(f"Running concept profiling for document {document_id}...")
        chunks = list(DocumentChunk.objects.filter(document_id=document_id).order_by('chunk_index'))
        if not chunks:
            return []

        total = len(chunks)
        if total >= 8:
            sample_positions = sorted(set(int(i * total / 8) for i in range(8)))
        else:
            sample_positions = list(range(total))
        sampled_chunks = [chunks[i] for i in sample_positions]
        context = "\n\n".join([f"[Chunk {c.chunk_index}]\n{c.text}" for c in sampled_chunks])

        system_prompt = """You are an expert academic concept extractor.
From the provided document excerpts, extract the most important educational concepts.

Return JSON only:
{
  "concepts": [
    {
      "name": "concept name (2-5 words)",
      "type": "heading|core_concept|paired_concept|process|principle",
      "definition": "one sentence definition if detectable",
      "importance": 1-10
    }
  ]
}
Maximum 25 concepts. Focus on domain-specific terms, not generic words."""

        try:
            response = groq_client.get_completion(system_prompt, context)
            try:
                data = json.loads(response)
            except json.JSONDecodeError:
                import re
                match = re.search(r'\{.*\}', response, re.DOTALL)
                if not match:
                    raise
                data = json.loads(match.group(0))
            concepts = data.get("concepts", [])
            mapped = []
            for i, concept in enumerate(concepts[:25]):
                type_value = concept.get("type", "core_concept")
                if type_value not in {"heading", "core_concept", "paired_concept"}:
                    type_value = "core_concept"
                mapped.append(
                    {
                        "name": str(concept.get("name", "")).strip(),
                        "type": type_value,
                        "chunk_index": sampled_chunks[min(i, len(sampled_chunks) - 1)].chunk_index,
                        "parent": None,
                        "score": int(concept.get("importance", 7)),
                        "metadata": {"definition": str(concept.get("definition", "")).strip()},
                    }
                )
            mapped = [c for c in mapped if c["name"]]
            if mapped:
                return mapped
        except Exception as e:
            logger.error(f"Model extraction failed: {e}. Falling back to regex extraction.")

        return AnchorProfiler._regex_profile_document(document_id)

    @staticmethod
    def _regex_profile_document(document_id: str) -> List[Dict[str, Any]]:
        import re

        chunks = DocumentChunk.objects.filter(document_id=document_id).order_by('chunk_index')
        extracted_concepts = []
        current_heading = None

        headings = [
            r"^(Unit|Chapter|Section)\s+\d+[:\-]?\s*(.*)",
            r"^\d+\.\d+\s+(.*)",
            r"^[A-Z][A-Z\s]{5,25}$",
        ]
        definitions = [
            r"([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+(?:is defined as|refers to|is the process of)\s+(.*)",
            r"^\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?):\s+(.*)",
        ]
        pairs = [r"([A-Z][a-z]+)\s+(?:vs|and|versus)\s+([A-Z][a-z]+)"]

        for c in chunks:
            lines = [l.strip() for l in c.text.split('\n') if l.strip()]
            if not lines:
                continue

            for pattern in headings:
                match = re.match(pattern, lines[0])
                if match:
                    name = match.group(2) if match.lastindex == 2 else match.group(0)
                    extracted_concepts.append(
                        {
                            "name": name.strip(),
                            "type": "heading",
                            "chunk_index": c.chunk_index,
                            "parent": None,
                            "score": 15,
                            "metadata": {"raw": lines[0]},
                        }
                    )
                    current_heading = name.strip()
                    break

            full_text = " ".join(lines)
            for pattern in definitions:
                matches = re.findall(pattern, full_text)
                for term, definition in matches:
                    if len(term.split()) > 4:
                        continue
                    extracted_concepts.append(
                        {
                            "name": term.strip(),
                            "type": "core_concept",
                            "chunk_index": c.chunk_index,
                            "parent": current_heading,
                            "score": 10,
                            "metadata": {"definition": definition.strip()},
                        }
                    )

            for pattern in pairs:
                matches = re.findall(pattern, full_text)
                for t1, t2 in matches:
                    extracted_concepts.append(
                        {
                            "name": f"{t1} vs {t2}",
                            "type": "paired_concept",
                            "chunk_index": c.chunk_index,
                            "parent": current_heading,
                            "score": 8,
                            "metadata": {"terms": [t1, t2]},
                        }
                    )

        unique = {}
        for concept in extracted_concepts:
            if concept["name"] not in unique or concept["score"] > unique[concept["name"]]["score"]:
                unique[concept["name"]] = concept
        return sorted(unique.values(), key=lambda x: x["score"], reverse=True)[:25]
