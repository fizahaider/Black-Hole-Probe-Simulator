
import logging
import threading
import time
from .embeddings import get_embedding_model
from .vector_store import VectorStore

logger = logging.getLogger(__name__)

class RAGWarmer:
    """
    RAGWarmer handles the eager loading of heavy neural models and data indices 
    during application startup to eliminate cold-start latency.
    """
    
    @staticmethod
    def warm_all():
        """Triggers all warming tasks in a background thread."""
        thread = threading.Thread(target=RAGWarmer._warm_worker, daemon=True)
        thread.start()
        return thread

    @staticmethod
    def _warm_worker():
        logger.info("🔥 [RAGWarmer] Starting Eager Pre-warming sequence...")
        start_total = time.time()
        
                                                          
        try:
            logger.info("🧠 [RAGWarmer] Task 1/2: Loading neural embedding model...")
            t_start = time.time()
            get_embedding_model()
            logger.info(f"✅ [RAGWarmer] Embedding model warmed in {time.time() - t_start:.2f}s")
        except Exception as e:
            logger.error(f"❌ [RAGWarmer] Failed to warm embedding model: {e}")

                                     
        try:
            logger.info("📁 [RAGWarmer] Task 2/2: Loading FAISS indices into memory...")
            t_start = time.time()
            vs = VectorStore(load_from_disk=True)
                                                                               
                                                          
            logger.info(f"✅ [RAGWarmer] Vector store warmed in {time.time() - t_start:.2f}s")
        except Exception as e:
            logger.error(f"❌ [RAGWarmer] Failed to warm vector store: {e}")

        total_time = time.time() - start_total
        logger.info(f"🚀 [RAGWarmer] Pre-warming complete! Total time: {total_time:.2f}s. System is now HOT.")
