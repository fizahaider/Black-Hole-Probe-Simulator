import os
from typing import List
from langchain_community.vectorstores import FAISS
from langchain_core.documents import Document as LangchainDocument
from .embeddings import get_embedding_model


class VectorStore:
    _instances = {}                          

    def __init__(self, index_path=None, load_from_disk=False):
        self.embedding_model = get_embedding_model()
        self.db = None
        
        if index_path:
            self.db_path = index_path
        else:
            from django.conf import settings
            base_path = getattr(settings, 'RAG_FAISS_INDEX_PATH', None)
            if not base_path:
                base_path = os.path.join(settings.BASE_DIR, 'rag', 'data', 'faiss_index')
            self.db_path = os.path.join(base_path, 'global')
        
        os.makedirs(self.db_path, exist_ok=True)
        
        if load_from_disk:
            self.load()

    def load(self):
                                                         
        if self.db_path in VectorStore._instances:
            self.db = VectorStore._instances[self.db_path]
            return

                               
        index_faiss = os.path.join(self.db_path, 'index.faiss')
        index_pkl = os.path.join(self.db_path, 'index.pkl')
        
        if os.path.exists(index_faiss) and os.path.exists(index_pkl):
            try:
                self.db = FAISS.load_local(
                    self.db_path, 
                    self.embedding_model, 
                    allow_dangerous_deserialization=True
                )
                                
                VectorStore._instances[self.db_path] = self.db
            except Exception:
                self.db = None
        else:
            self.db = None

    def save(self):
        if self.db:
            try:
                os.makedirs(self.db_path, exist_ok=True)
                self.db.save_local(self.db_path)
            except Exception as e:
                self.db = None

    def add(self, documents: List[LangchainDocument]):
        if not documents:
            return
            
        if not self.db:
            self.db = FAISS.from_documents(documents, self.embedding_model)
        else:
            self.db.add_documents(documents)
        
        self.save()

    def similarity_search(self, query: str, top_k=5, filter=None, fetch_k=20) -> List[LangchainDocument]:
        if not self.db:
            return []

                                                                           
        return self.db.similarity_search(query, k=top_k, filter=filter, fetch_k=fetch_k)
    
    def clear(self):
        self.db = None

