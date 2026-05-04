import os
import io
import PyPDF2
from ..models import Document, DocumentChunk
from django.db.models import Q
from .vector_store import VectorStore
from langchain_core.documents import Document as LangchainDocument
from .ingestion import StreamingPDFLoader, SemanticChunker, TextLoader, DOCXLoader, PPTXLoader
from .keyword_store import KeywordStore
from .anchor_profiler import AnchorProfiler
from .asset_generator import AssetGenerator
from document_ai.services.groq_client import groq_client
import logging
import re
import threading
import json
from django.db import transaction
from django.conf import settings

logger = logging.getLogger(__name__)

class RAGService:
    _reranker = None

    @staticmethod
    def _detect_file_type(filename: str) -> str:
        ext = os.path.splitext((filename or "").lower())[1]
        if ext == '.pdf':
            return 'pdf'
        if ext == '.txt':
            return 'txt'
        if ext in ('.docx', '.docs'):
            return 'docx'
        if ext == '.pptx':
            return 'pptx'
        raise ValueError("Unsupported file type. Allowed: PDF, TXT, DOCX, PPTX")

    @staticmethod
    def ingest_document(file, user, title=None, space=None):
        """
        Creates a Document record, extracts text, chunks it, and saves chunks.
        """
        detected_file_type = RAGService._detect_file_type(file.name)

                                  
        doc = Document.objects.create(
            user=user,
            space=space,
            file=file,
            title=title or file.name,
            file_type=detected_file_type,
            metadata={"source": "api_upload", "original_name": file.name},
            processed=False 
        )

        try:
            chunker = SemanticChunker(target_tokens=400, overlap_tokens=50)
            chunks_to_create = []
            full_text_buffer = io.StringIO()
            idx = 0
            base_meta = {"document_id": str(doc.id)}

            if detected_file_type == 'pdf':
                loader = StreamingPDFLoader(doc.file)
                for chunk_data in loader.load_and_chunk(chunker, base_meta):
                    full_text_buffer.write(chunk_data.text + "\n\n")
                    chunks_to_create.append(DocumentChunk(
                        document=doc,
                        chunk_index=idx,
                        text=chunk_data.text,
                        metadata=chunk_data.metadata
                    ))
                    idx += 1
            elif detected_file_type == 'pptx':
                loader = PPTXLoader(doc.file)
                for chunk_data in loader.load_and_chunk(chunker, base_meta):
                    full_text_buffer.write(chunk_data.text + "\n\n")
                    chunks_to_create.append(DocumentChunk(
                        document=doc,
                        chunk_index=idx,
                        text=chunk_data.text,
                        metadata=chunk_data.metadata
                    ))
                    idx += 1
            else:
                loader = DOCXLoader(doc.file) if detected_file_type == 'docx' else TextLoader(doc.file)
                text = loader.load_text()
                chunk_meta = {**base_meta, "section": "Main", "page": 1}
                for chunk_data in chunker.chunk_text(text, chunk_meta):
                    full_text_buffer.write(chunk_data.text + "\n\n")
                    chunks_to_create.append(DocumentChunk(
                        document=doc,
                        chunk_index=idx,
                        text=chunk_data.text,
                        metadata=chunk_data.metadata
                    ))
                    idx += 1
            
                                                
            if chunks_to_create:
                DocumentChunk.objects.bulk_create(chunks_to_create)
                
                            
            doc.text_content = full_text_buffer.getvalue()
            doc.save()

                                                        
            logger.info(f"Scheduling background processing for document {doc.id}")
            
            def run_background_processing():
                try:
                    logger.info(f"Starting background processing for {doc.id}")
                    
                                         
                    try:
                        RAGService._index_document_chunks_to_vectorstore(doc)
                    except Exception as e:
                        logger.error(f"Background Semantic Indexing failed for {doc.id}: {e}")

                                          
                    try:
                        RAGService._index_document_chunks_to_keywordstore(doc)
                    except Exception as e:
                        logger.error(f"Background Keyword Indexing failed for {doc.id}: {e}")

                                                   
                    logger.info(f"Generating Document DNA (Essence) for {doc.id}")
                    doc.essence = RAGService.generate_document_essence(doc)
                    doc.save()

                                          
                    logger.debug(f"Running hierarchy scout for {doc.id}")
                    hierarchy = AnchorProfiler.profile_hierarchy_scout(doc.id)
                    doc.metadata["hierarchy"] = hierarchy
                    doc.save()

                                            
                    from ..models import Concept
                    anchors = AnchorProfiler.profile_document(doc.id)
                    doc.metadata["anchors"] = {a["name"]: a for a in anchors}
                    doc.save()
                    
                    concept_map = {} 
                    h_themes = doc.metadata.get("hierarchy", {}).get("themes", [])
                    for theme in h_themes:
                        c = Concept.objects.create(
                            document=doc,
                            name=theme["name"],
                            type="heading",
                            metadata={"subconcepts": theme.get("subconcepts", [])}
                        )
                        concept_map[theme["name"]] = c
                    
                    for a_data in anchors:
                        parent_name = a_data.get("parent")
                        parent_obj = concept_map.get(parent_name)
                        
                        if a_data["name"] in concept_map:
                            concept = concept_map[a_data["name"]]
                            concept.type = a_data["type"]
                            concept.anchor_chunks = [a_data["chunk_index"]]
                            concept.metadata.update(a_data["metadata"])
                            concept.save()
                        else:
                            concept = Concept.objects.create(
                                document=doc,
                                name=a_data["name"],
                                type=a_data["type"],
                                parent=parent_obj,
                                anchor_chunks=[a_data["chunk_index"]],
                                metadata=a_data["metadata"]
                            )
                            concept_map[a_data["name"]] = concept
                    
                                              
                    AssetGenerator.generate_all_for_document(doc)
                    logger.info(f"Background processing completed for {doc.id}")
                    
                except Exception as e:
                    logger.error(f"Background processing task failed for {doc.id}: {e}")
                    logger.exception(e)

                                                    
            transaction.on_commit(lambda: threading.Thread(target=run_background_processing, daemon=True).start())
            
            doc.processed = True
            doc.save()
            return doc

        except Exception as e:
                                                                      
                                                             
            raise e

    @staticmethod
    def retrieve_relevant_chunks(document_ids, query=None, limit=15, user=None):
        """
        Retrieves relevant chunks using Hybrid (Vector + Keyword) and Hierarchical strategies.
        Accepts a single document_id or a list of document_ids.
        """
        if not document_ids:
            return []
            
        if not isinstance(document_ids, list):
            document_ids = [str(document_ids)]
        else:
            document_ids = [str(did) for did in document_ids if did]
            
        if not document_ids:
            return []

                                                      
        if not query:
            qs = DocumentChunk.objects.filter(document_id__in=document_ids)
            if user:
                qs = qs.filter(document__user=user)
            return list(qs.order_by('chunk_index')[:limit])

                                                                                          
        is_large_single_doc = False
        if len(document_ids) == 1:
            try:
                doc_chunk_count = DocumentChunk.objects.filter(document_id=document_ids[0]).count()
                if doc_chunk_count > 50:
                    is_large_single_doc = True
            except: pass

        vs = VectorStore(load_from_disk=True)
        
        target_sections = None
        if is_large_single_doc:
                                                                
            section_filter = lambda m: (
                str(m.get("document_id")) == document_ids[0] and 
                m.get("type") == "section"
            )
            section_docs = vs.similarity_search(query, top_k=5, filter=section_filter, fetch_k=20)
            if section_docs:
                target_sections = {d.metadata.get("section_title") for d in section_docs if d.metadata.get("section_title")}

                                                         
        def chunk_filter(metadata):
            is_target_doc = str(metadata.get("document_id")) in document_ids
            is_chunk = metadata.get("type", "chunk") == "chunk"
            
            if not (is_target_doc and is_chunk):
                return False
                
            if target_sections and len(document_ids) == 1:
                return metadata.get("section") in target_sections
            return True

        vector_limit = limit * 2
        
        # DIAGNOSTIC: Vector search
        logger.info(f"[DIAGNOSTIC-RETRIEVAL] Vector search: query='{query[:50]}...', top_k={vector_limit}, fetch_k={vector_limit*4}")
        logger.info(f"[DIAGNOSTIC-RETRIEVAL] Document IDs being searched: {document_ids}")
        
        lc_docs = vs.similarity_search(
            query, 
            top_k=vector_limit, 
            filter=chunk_filter,
            fetch_k=vector_limit*4
        )
        
        logger.info(f"[DIAGNOSTIC-RETRIEVAL] Vector search returned: {len(lc_docs)} results")
        
        vector_results = {}             
        for rank, d in enumerate(lc_docs):
            cid = d.metadata.get("chunk_id")
            if cid:
                vector_results[cid] = rank
                if rank < 3:  # Log top 3
                    logger.info(f"[DIAGNOSTIC-RETRIEVAL]   Vector result [{rank}]: chunk_id={cid}, doc_id={d.metadata.get('document_id')}")

                                                        
        try:
                                                
            first_doc = Document.objects.get(id=document_ids[0])
            space_id = first_doc.space.id if first_doc.space else f"user_{first_doc.user.id}"
        except Document.DoesNotExist:
             return []

        ks = KeywordStore(space_id=space_id, load_from_disk=True)
        keyword_ids = ks.search(query, top_k=vector_limit)
        
        logger.info(f"[DIAGNOSTIC-RETRIEVAL] Keyword search returned: {len(keyword_ids)} results")
        if keyword_ids:
            logger.info(f"[DIAGNOSTIC-RETRIEVAL]   Top keyword IDs: {keyword_ids[:3]}")
        
                                      
        fused_scores = {}
        k = 60
        
        all_ids = set(vector_results.keys()) | set(keyword_ids)
                                                    
        valid_chunks_qs = DocumentChunk.objects.filter(id__in=all_ids, document_id__in=document_ids)
        valid_chunks_map = {str(c.id): c for c in valid_chunks_qs}
        
        for cid in valid_chunks_map.keys():
            score = 0
            if cid in vector_results:
                score += 1 / (k + vector_results[cid])
            if cid in keyword_ids: 
                rank = keyword_ids.index(cid)
                score += 1 / (k + rank)
            fused_scores[cid] = score
            
        sorted_ids = sorted(fused_scores.keys(), key=lambda x: fused_scores[x], reverse=True)[:limit]
        
        logger.info(f"[DIAGNOSTIC-RETRIEVAL] Fused scores computed: {len(fused_scores)} total")
        logger.info(f"[DIAGNOSTIC-RETRIEVAL] Final returned chunks: {len(sorted_ids)}")
        logger.info(f"[DIAGNOSTIC-RETRIEVAL] Valid chunks map size: {len(valid_chunks_map)}")
        
        return [valid_chunks_map[cid] for cid in sorted_ids]

    @staticmethod
    def retrieve_relevant_chunks_multi(document_ids=None, space_id=None, query=None, limit=15, user=None):
        """
        Retrieves relevant chunks from multiple documents or a space.
        Optimized for single-pass retrieval across all sources.
        """
        if not document_ids and space_id:
            from ..models import KnowledgeSpace
            try:
                space = KnowledgeSpace.objects.get(id=space_id, user=user)
                document_ids = list(space.documents.values_list('id', flat=True))
            except KnowledgeSpace.DoesNotExist:
                return []
        
        if not document_ids:
            return []

                                                 
                                                                                
        chunks = RAGService.retrieve_relevant_chunks(
            document_ids=document_ids,
            query=query,
            limit=limit,
            user=user
        )
        
        return chunks

    @staticmethod
    def rewrite_query_with_history(user_message, history_text):
        """Rewrite follow-up questions into standalone queries."""
        if getattr(settings, "FAST_AI_MODE", True):
            return user_message
        if not history_text:
            return user_message
            
        system_prompt = (
            "Rewrite the user's latest question "
            "into a single, standalone, descriptive search query that resolves any ambiguous terms "
            "(like 'it', 'them', 'the previous one', 'explain more') using the provided conversation history.\n\n"
            "RULES:\n"
            "1. Output ONLY the rewritten search query.\n"
            "2. Do NOT answer the question.\n"
            "3. If the message is already standalone, return it verbatim.\n"
            "4. Keep the rewritten query concise but detailed enough for RAG retrieval."
        )
        user_prompt = f"HISTORY:\n{history_text}\n\nUSER MESSAGE: {user_message}\n\nREWRITTEN QUERY:"
        
        try:
            from document_ai.services.groq_client import groq_client
            rewritten = groq_client.get_completion(system_prompt, user_prompt)
            logger.info(f"Query rewritten: '{user_message}' -> '{rewritten}'")
            return rewritten.strip('"').strip("'")
        except Exception as e:
            logger.warning(f"Query rewriting failed: {e}. Falling back to raw message.")
            return user_message

    @staticmethod
    def get_response(user, message, document_ids=None, conversation_id=None, personality="neutral", depth="detailed", space_id=None, stream=False):
        """
        Grounded chat with memory, personality, and source traceability.
        Supports streaming via generator.
        """
        from ..models import Conversation, ChatMessage
        from document_ai.services.groq_client import groq_client
        from document_ai.services.prompts import get_enhanced_chat_prompt

                                        
        if conversation_id:
            conversation = Conversation.objects.filter(id=conversation_id, user=user).first()
            if not conversation:
                raise ValueError("Conversation not found or access denied.")
        else:
            doc = None
            space = None
            if space_id:
                from ..models import KnowledgeSpace
                space = KnowledgeSpace.objects.filter(id=space_id, user=user).first()
            if document_ids and len(document_ids) > 0:
                doc = Document.objects.filter(id=document_ids[0], user=user).first()
                if doc and not space:
                    space = doc.space
            
            conversation = None
            if space:
                conversation = Conversation.objects.filter(
                    user=user,
                    space=space
                ).order_by('-updated_at').first()
            
            if not conversation:
                conversation = Conversation.objects.create(
                    user=user,
                    document=doc,
                    space=space,
                    personality=personality,
                    title=f"Chat about {doc.title if doc else (space.name if space else 'Documents')}"
                )

                                             
        from account.models import LearningProfile
        profile, _ = LearningProfile.objects.get_or_create(user=user)
        if not personality or personality == "neutral":
            personality = conversation.personality or profile.default_personality
        if not depth:
            depth = profile.default_depth

        # TASK 1: Classify Query Type
        query_type = RAGService._classify_query(message)
        logger.info(f"[DIAGNOSTIC] Query type classified as: {query_type}")
        
        # TASK 2 - Case A: Greeting/Small Talk - Handle without retrieval
        if query_type == 'greeting':
            return RAGService._handle_greeting(
                user=user,
                conversation=conversation,
                message=message,
                personality=personality,
                depth=depth,
                stream=stream
            )

                                                
        history_msgs = conversation.messages.order_by('-created_at')[:5]
        history_msgs = sorted(history_msgs, key=lambda x: x.created_at)
        history_text = "\n".join([f"{m.role}: {m.content}" for m in history_msgs])

                            
        search_query = RAGService.rewrite_query_with_history(message, history_text)

        target_docs = []
        if document_ids:
            target_docs = document_ids
        elif conversation.document:
            target_docs = [conversation.document.id]
        elif conversation.space:
            target_docs = list(conversation.space.documents.values_list('id', flat=True))

        # DIAGNOSTIC LOGGING - Step 1: Request Payload
        logger.info("=" * 80)
        logger.info("[DIAGNOSTIC] RAG Chat Request")
        logger.info(f"[DIAGNOSTIC] Original message: {message[:100]}")
        logger.info(f"[DIAGNOSTIC] Rewritten query: {search_query[:100]}")
        logger.info(f"[DIAGNOSTIC] document_ids from request: {document_ids}")
        logger.info(f"[DIAGNOSTIC] conversation.document: {conversation.document.id if conversation.document else None}")
        logger.info(f"[DIAGNOSTIC] conversation.space: {conversation.space.id if conversation.space else None}")
        logger.info(f"[DIAGNOSTIC] Resolved target_docs: {[str(d) for d in target_docs]}")
        logger.info(f"[DIAGNOSTIC] target_docs count: {len(target_docs)}")
        logger.info("=" * 80)

                                                       
        anchor_context = ""
        found_anchor_entries = []
        if target_docs:
            docs = Document.objects.filter(id__in=target_docs, user=user).only('id', 'metadata')
            for doc in docs:
                anchors = (doc.metadata or {}).get("anchors", {})
                for term, data in anchors.items():
                    if re.search(r'\b' + re.escape(str(term)) + r'\b', search_query, flags=re.IGNORECASE):
                        found_anchor_entries.append((doc.id, data))

        if found_anchor_entries:
            from ..models import DocumentChunk
            anchor_chunks = []
            chunk_ids = [entry.get("chunk_id") for _, entry in found_anchor_entries if entry.get("chunk_id")]
            if chunk_ids:
                anchor_chunks = list(DocumentChunk.objects.filter(id__in=chunk_ids))
            else:
                for doc_id, entry in found_anchor_entries:
                    chunk_index = entry.get("chunk_index")
                    if chunk_index is None:
                        continue
                    chunk = DocumentChunk.objects.filter(document_id=doc_id, chunk_index=chunk_index).first()
                    if chunk:
                        anchor_chunks.append(chunk)
            for c in anchor_chunks:
                anchor_context += f"\n[CONCEPT ANCHOR: {c.document.title}] {c.text}\n"

        chunk_limit = 8 if getattr(settings, "FAST_AI_MODE", True) else 15
        
        # DIAGNOSTIC LOGGING - Step 2: Retrieval
        logger.info(f"[DIAGNOSTIC] Retrieving chunks with limit={chunk_limit}")
        
        all_candidate_chunks = RAGService.retrieve_relevant_chunks(target_docs, query=search_query, limit=chunk_limit, user=user) if target_docs else []
        
        logger.info(f"[DIAGNOSTIC] Chunks retrieved (primary): {len(all_candidate_chunks)}")
        
        if not all_candidate_chunks and conversation.space:
            space_docs = list(conversation.space.documents.values_list('id', flat=True))
            logger.info(f"[DIAGNOSTIC] Primary retrieval failed, trying space fallback")
            logger.info(f"[DIAGNOSTIC] Space docs: {[str(d) for d in space_docs]}")
            logger.info(f"[DIAGNOSTIC] Target docs were: {[str(d) for d in target_docs]}")
            logger.info(f"[DIAGNOSTIC] Sets equal? {set(space_docs) == set(target_docs)}")
            if set(space_docs) != set(target_docs):
                all_candidate_chunks = RAGService.retrieve_relevant_chunks(space_docs, query=search_query, limit=chunk_limit, user=user)
                logger.info(f"[DIAGNOSTIC] Chunks retrieved (space fallback): {len(all_candidate_chunks)}")
                
        # DIAGNOSTIC - Step 3: Filtering & Relevance
        logger.info(f"[DIAGNOSTIC] Before reranking: {len(all_candidate_chunks)} chunks")
        
        if getattr(settings, "ENABLE_RERANK", False) and len(all_candidate_chunks) > 3:
            all_candidate_chunks = RAGService._rerank_chunks_by_relevance(
                query=search_query,
                chunks=all_candidate_chunks,
                top_k=5
            )
            logger.info(f"[DIAGNOSTIC] After reranking: {len(all_candidate_chunks)} chunks")
            
        all_chunks = all_candidate_chunks[:5]
        
        # Log chunk details for diagnosis
        if all_chunks:
            logger.info(f"[DIAGNOSTIC] Top chunks details:")
            for i, chunk in enumerate(all_chunks[:3]):
                logger.info(f"  [{i}] Doc: {chunk.document.title}, Chunk idx: {chunk.chunk_index}")
                logger.info(f"      Text preview: {chunk.text[:150]}...")
        
        has_relevance = RAGService._has_minimum_relevance(search_query, all_chunks) if all_chunks else False
        logger.info(f"[DIAGNOSTIC] Has minimum relevance: {has_relevance}")
        
        if all_chunks and not has_relevance:
            logger.warning(f"[DIAGNOSTIC] Chunks exist but failed relevance check - clearing all_chunks")
            all_chunks = []
        
                                                                                         
        # DIAGNOSTIC - Final decision point
        logger.info(f"[DIAGNOSTIC] Final all_chunks count: {len(all_chunks)}")
        logger.info(f"[DIAGNOSTIC] target_docs exists: {bool(target_docs)}")
        logger.info(f"[DIAGNOSTIC] Will use fallback? {target_docs and not all_chunks}")
        logger.info("=" * 80)
        
        # TASK 2 - Case C: No relevant chunks - Use LLM for graceful fallback
        if target_docs and not all_chunks:
            logger.info("[FALLBACK] No relevant chunks found, using LLM for general response")
            return RAGService._handle_general_knowledge(
                user=user,
                conversation=conversation,
                message=message,
                search_query=search_query,
                personality=personality,
                depth=depth,
                stream=stream
            )

        context = anchor_context + "\n\n" + "\n\n".join([f"[Source: {c.document.title}, Chunk: {c.chunk_index}] {c.text}" for c in all_chunks])

        # Pass query_type to enable hybrid-aware prompting
        system_prompt = get_enhanced_chat_prompt(context, history_text, personality, depth, query_type=query_type)

                                              
        if stream:
            def response_generator():
                full_answer = ""
                                        
                yield f"METADATA:{json.dumps({'conversation_id': str(conversation.id), 'rewritten_query': search_query})}\n"
                
                try:
                    for chunk in groq_client.get_streaming_completion(system_prompt, message):
                        full_answer += chunk
                        yield chunk
                except Exception as e:
                    logger.error(f"Streaming response failed: {e}")
                    error_msg = "\n\n[Error: Connection failed mid-stream.]"
                    full_answer += error_msg
                    yield error_msg
                
                                          
                user_msg = ChatMessage.objects.create(conversation=conversation, role='user', content=message)
                assistant_msg = ChatMessage.objects.create(
                    conversation=conversation, 
                    role='assistant', 
                    content=full_answer,
                    metadata={"personality": personality, "depth": depth, "rewritten_query": search_query, "error": True if "failed mid-stream" in full_answer else False}
                )
                if all_chunks:
                    assistant_msg.sources.add(*all_chunks)
                conversation.save()
                
            return response_generator()

        try:
            answer = groq_client.get_completion(system_prompt, message)
        except Exception as e:
            logger.error(f"Response generation failed: {e}")
            raise e

        user_msg = ChatMessage.objects.create(conversation=conversation, role='user', content=message)
        assistant_msg = ChatMessage.objects.create(
            conversation=conversation, 
            role='assistant', 
            content=answer,
            metadata={"personality": personality, "depth": depth, "rewritten_query": search_query}
        )
        if all_chunks:
            assistant_msg.sources.add(*all_chunks)
        conversation.save()

        references = [{
            "chunk_id": str(c.id),
            "text_preview": c.text[:200] + "...",
            "section": c.metadata.get("section"),
            "page": c.metadata.get("page"),
            "doc_title": c.document.title
        } for c in all_chunks]

        return {
            "answer": answer,
            "references": references,
            "conversation_id": str(conversation.id),
            "personality": personality,
            "message_id": str(assistant_msg.id),
            "rewritten_query": search_query
        }

    @staticmethod
    def _index_document_chunks_to_vectorstore(document):
        """Helper to index all chunks of a document, including Section Nodes."""
        chunks = document.chunks.all()
        lc_docs = []
        
                               
        for c in chunks:
            meta = {
                "document_id": str(document.id),
                "chunk_id": str(c.id),
                "chunk_index": c.chunk_index,
                "type": "chunk",                 
                "section": c.metadata.get("section", "General")
            }
            lc_docs.append(LangchainDocument(page_content=c.text, metadata=meta))
            
                                                     
                                                         
        sections = {}
        for c in chunks:
            sec_title = c.metadata.get("section", "General")
            if sec_title not in sections:
                sections[sec_title] = []
            sections[sec_title].append(c.text)
            
                                            
        for sec_title, texts in sections.items():
            if not sec_title: continue
            
            combined_text = texts[0] if texts else ""
            summary_text = f"Section: {sec_title}\n{combined_text[:500]}..."
            
            meta = {
                "document_id": str(document.id),
                "type": "section",
                "section_title": sec_title
            }
            lc_docs.append(LangchainDocument(page_content=summary_text, metadata=meta))
        
        vs = VectorStore(load_from_disk=True)
        vs.add(lc_docs)

    @staticmethod
    def _index_document_chunks_to_keywordstore(document):
        """Helper to index all chunks of a document into BM25."""
                                   
        if document.space:
            space_id = document.space.id
            qs = DocumentChunk.objects.filter(document__space=document.space)
        else:
            space_id = f"user_{document.user.id}"
            qs = DocumentChunk.objects.filter(document__user=document.user, document__space__isnull=True)
            
        ks = KeywordStore(space_id=space_id, load_from_disk=True)
        ks.rebuild_index(qs)
        
    @staticmethod
    def rebuild_index(user=None):
        """Rebuilds both Vector and Keyword indices from DB."""
        vs = VectorStore()
        vs.clear()
        
        ks = KeywordStore()
                                                       
        
        qs = DocumentChunk.objects.all()
        if user:
            qs = qs.filter(document__user=user)
        
                        
                   
        batch_size = 1000
        total = qs.count()
        for i in range(0, total, batch_size):
            batch = qs[i:i+batch_size]
            lc_docs = [
                LangchainDocument(
                    page_content=c.text,
                    metadata={
                        "document_id": str(c.document_id),
                        "chunk_id": str(c.id),
                        "chunk_index": c.chunk_index
                    }
                ) for c in batch
            ]
            vs.add(lc_docs)
            
                         
                                 
        ks.rebuild_index(qs)
        
        return {"document_count": Document.objects.count(), "chunk_count": total}

    @staticmethod
    def _rerank_chunks_by_relevance(query, chunks, top_k=5):
        """Re-rank candidate chunks using cross-encoder scores."""
        if not chunks:
            return []
            
        if RAGService._reranker is None:
            try:
                from sentence_transformers import CrossEncoder
                RAGService._reranker = CrossEncoder(
                    'cross-encoder/ms-marco-MiniLM-L-12-v2', 
                    trust_remote_code=True
                )
            except Exception as e:
                logger.exception("Failed to load Cross-Encoder")
                                                         
                RAGService._reranker = False
        
        if RAGService._reranker is False:
            return chunks[:top_k]
            
        pairs = [[query, c.text] for c in chunks]
        scores = RAGService._reranker.predict(pairs)
        
        scored_chunks = sorted(zip(chunks, scores), key=lambda x: x[1], reverse=True)
        return [c for c, s in scored_chunks[:top_k]]

    @staticmethod
    def _has_minimum_relevance(query, chunks):
        """Return True when at least one chunk is present.
        Relaxed to rely on VectorStore/Reranker semantic distances instead of strict exact-word overlaps
        which frequently caused 'no relevant info' fallback errors on valid semantic matches.
        
        DIAGNOSTIC MODE: Temporarily logging all checks
        """
        result = len(chunks) > 0
        logger.info(f"[DIAGNOSTIC-RELEVANCE] Check: chunks={len(chunks)}, query='{query[:50]}...', result={result}")
        return result

    @staticmethod
    def generate_document_essence(document: Document) -> str:
        """Generate a short summary used as document context."""
                                                                         
        chunks = list(document.chunks.all().order_by('chunk_index'))
        if not chunks:
            return ""
        
                                        
        representative_chunks = []
        representative_chunks.extend(chunks[:2])
        if len(chunks) > 4:
            representative_chunks.append(chunks[len(chunks)//2])
            representative_chunks.append(chunks[-1])
            
        context_text = "\n\n".join([c.text for c in representative_chunks])
        
        system_prompt = """You are a precise academic writer.
Analyze the provided document segments and generate a 200-word "Document DNA" summary.
Focus on:
1. Primary Subject Matter (What is this?)
2. Academic Level (Introductory, Post-grad, Professional?)
3. Core Argument/Theory
4. Key Methodology or Examples

Adopt the tone and vocabulary of the document itself. 
Be precise. No fluff."""

        try:
            return groq_client.get_completion(system_prompt, context_text)
        except Exception as e:
            logger.error(f"Essence generation failed: {e}")
            return "General educational document."

    @staticmethod
    def _classify_query(message):
        """
        TASK 1: Classify user query into types:
        - greeting: Small talk, greetings
        - document_query: Questions likely about documents
        - general_knowledge: Out-of-scope questions
        """
        message_lower = message.lower().strip()
        
        # Greeting patterns
        greeting_patterns = [
            r'\b(hi|hello|hey|greetings|good morning|good afternoon|good evening)\b',
            r'\b(how are you|how\'s it going|what\'s up|how do you do)\b',
            r'\b(thanks|thank you|thx|ty)\b',
            r'\b(bye|goodbye|see you|take care)\b',
        ]
        
        import re
        for pattern in greeting_patterns:
            if re.search(pattern, message_lower):
                return 'greeting'
        
        # General knowledge indicators (clearly out-of-scope)
        general_knowledge_patterns = [
            r'\b(weather|forecast|temperature)\b',
            r'\b(latest news|current events|breaking news)\b',
            r'\b(tell me a joke|fun fact|random fact)\b',
            r'\b(what time|what date|today\'s date)\b',
            r'\b(who won|sports score|game result)\b',
        ]
        
        for pattern in general_knowledge_patterns:
            if re.search(pattern, message_lower):
                return 'general_knowledge'
        
        # If message is very short (1-3 words) and no question mark, likely small talk
        word_count = len(message_lower.split())
        if word_count <= 3 and '?' not in message:
            return 'greeting'
        
        # Check if query contains study-related terms (likely document query)
        study_terms = [
            'explain', 'define', 'what is', 'how does', 'describe', 'summarize',
            'concept', 'theory', 'chapter', 'section', 'document', 'text',
            'according to', 'in the document', 'based on', 'from the notes'
        ]
        
        has_study_context = any(term in message_lower for term in study_terms)
        
        # If has question mark AND study terms → document_query
        if '?' in message and has_study_context:
            return 'document_query'
        
        # If question but no study context → could be general knowledge
        # But default to document_query to be safe (will fallback if no chunks found)
        if '?' in message:
            return 'document_query'
        
        # Default to document_query (safer for study platform)
        return 'document_query'

    @staticmethod
    def _handle_greeting(user, conversation, message, personality, depth, stream=False):
        """
        TASK 2 - Case A: Handle greetings naturally without retrieval
        """
        from document_ai.services.groq_client import groq_client
        
        greeting_system_prompt = (
            f"You are a friendly, helpful study assistant with a {personality} personality. "
            f"Respond naturally to greetings and small talk. "
            f"Keep responses warm, brief (1-2 sentences), and encouraging. "
            f"You can offer to help with their studies or answer questions about their documents."
        )
        
        try:
            greeting_response = groq_client.get_completion(greeting_system_prompt, message)
            
            # Save messages to conversation
            ChatMessage.objects.create(conversation=conversation, role='user', content=message)
            assistant_msg = ChatMessage.objects.create(
                conversation=conversation,
                role='assistant',
                content=greeting_response,
                metadata={"personality": personality, "depth": depth, "query_type": "greeting"}
            )
            conversation.save()
            
            return {
                "answer": greeting_response,
                "references": [],
                "conversation_id": str(conversation.id),
                "personality": personality,
                "message_id": str(assistant_msg.id),
                "rewritten_query": message,
                "query_type": "greeting"
            }
        except Exception as e:
            logger.error(f"Greeting response failed: {e}")
            # Fallback to simple greeting
            fallback = "Hello! I'm here to help you study. Feel free to ask me anything about your documents!"
            ChatMessage.objects.create(conversation=conversation, role='user', content=message)
            ChatMessage.objects.create(
                conversation=conversation,
                role='assistant',
                content=fallback,
                metadata={"personality": personality, "query_type": "greeting_fallback"}
            )
            return {
                "answer": fallback,
                "references": [],
                "conversation_id": str(conversation.id),
                "personality": personality,
                "message_id": str(ChatMessage.objects.filter(conversation=conversation).last().id),
                "rewritten_query": message,
                "query_type": "greeting"
            }

    @staticmethod
    def _handle_general_knowledge(user, conversation, message, search_query, personality, depth, stream=False):
        """
        TASK 2 - Case C: Handle queries with no relevant chunks using LLM
        Provides helpful general knowledge answer with subtle source attribution
        """
        from document_ai.services.groq_client import groq_client
        
        # Improved general knowledge prompt - more conversational and helpful
        general_knowledge_prompt = (
            f"You are a knowledgeable study assistant with a {personality} personality. "
            f"The user asked a question that may not be directly covered in their uploaded documents. "
            f"Provide a helpful, accurate, and informative answer using your general knowledge.\n\n"
            f"GUIDELINES:\n"
            f"1. Answer the question comprehensively and accurately.\n"
            f"2. Be {'detailed and thorough' if depth == 'detailed' else 'concise but informative'}.\n"
            f"3. If relevant, suggest how this topic might relate to their study materials.\n"
            f"4. At the end, add a brief, friendly note: '*Note: This answer is based on general knowledge. For document-specific information, try asking about your uploaded materials.*'\n\n"
            f"User question: {message}"
        )
        
        try:
            general_response = groq_client.get_completion("", general_knowledge_prompt)
            
            # Save messages
            ChatMessage.objects.create(conversation=conversation, role='user', content=message)
            assistant_msg = ChatMessage.objects.create(
                conversation=conversation,
                role='assistant',
                content=general_response,
                metadata={
                    "personality": personality,
                    "depth": depth,
                    "query_type": "general_knowledge",
                    "rewritten_query": search_query,
                    "source": "general_knowledge"
                }
            )
            conversation.save()
            
            return {
                "answer": general_response,
                "references": [],
                "conversation_id": str(conversation.id),
                "personality": personality,
                "message_id": str(assistant_msg.id),
                "rewritten_query": search_query,
                "query_type": "general_knowledge"
            }
        except Exception as e:
            logger.error(f"General knowledge response failed: {e}")
            # Graceful fallback - more conversational
            fallback = (
                f"That's an interesting question! While I don't have specific information from your documents "
                f"to answer it, I'd be happy to help with questions about your study materials. "
                f"Try asking about concepts, definitions, or topics from your uploaded documents!"
            )
            ChatMessage.objects.create(conversation=conversation, role='user', content=message)
            ChatMessage.objects.create(
                conversation=conversation,
                role='assistant',
                content=fallback,
                metadata={"personality": personality, "query_type": "general_knowledge_fallback"}
            )
            return {
                "answer": fallback,
                "references": [],
                "conversation_id": str(conversation.id),
                "personality": personality,
                "message_id": str(ChatMessage.objects.filter(conversation=conversation).last().id),
                "rewritten_query": search_query,
                "query_type": "general_knowledge"
            }

