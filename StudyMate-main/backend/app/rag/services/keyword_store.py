import math
import re
from collections import Counter
import pickle
import os
from typing import List, Dict, Any

class SimpleBM25:
    """
    A standalone implementation of BM25Okapi for Hybrid Search.
    Does not require external dependencies like rank_bm25.
    """
    def __init__(self, k1=1.5, b=0.75, epsilon=0.25):
        self.k1 = k1
        self.b = b
        self.epsilon = epsilon
        self.corpus_size = 0
        self.avgdl = 0
        self.doc_freqs = []
        self.idf = {}
        self.doc_len = []
        self.documents = []                               
        
    def tokenize(self, text: str) -> List[str]:
        return [w.lower() for w in re.findall(r'\w+', text)]

    def fit(self, corpus_text: List[str], corpus_ids: List[str]):
        """
        Builds the index from a list of texts.
        """
        self.corpus_size = len(corpus_text)
        self.doc_len = []
        self.doc_freqs = []
        self.documents = corpus_ids
        
        nd = {}                                                   
        
        for text in corpus_text:
            tokens = self.tokenize(text)
            length = len(tokens)
            self.doc_len.append(length)
            frequencies = Counter(tokens)
            self.doc_freqs.append(frequencies)
            
            for word in frequencies:
                nd[word] = nd.get(word, 0) + 1
        
        if self.corpus_size > 0:
            self.avgdl = sum(self.doc_len) / self.corpus_size
        else:
            self.avgdl = 0
        
                        
        self.idf = {}
        idf_sum = 0
        negative_idfs = []
        for word, freq in nd.items():
            idf = math.log(self.corpus_size - freq + 0.5) - math.log(freq + 0.5)
            self.idf[word] = idf
            idf_sum += idf
            if idf < 0:
                negative_idfs.append(word)
        
        average_idf = idf_sum / len(self.idf) if self.idf else 0
        eps = self.epsilon * average_idf
        
        for word in negative_idfs:
            self.idf[word] = eps

    def get_scores(self, query: str) -> List[float]:
        query_tokens = self.tokenize(query)
        scores = [0.0] * self.corpus_size
        
        for q in query_tokens:
            if q not in self.idf:
                continue
            idf = self.idf[q]
            
            for i, doc_freqs in enumerate(self.doc_freqs):
                freq = doc_freqs.get(q, 0)
                if freq > 0:
                    numerator = idf * freq * (self.k1 + 1)
                    denominator = freq + self.k1 * (1 - self.b + self.b * self.doc_len[i] / self.avgdl)
                    scores[i] += numerator / denominator
        return scores

    def search(self, query: str, top_k=10) -> List[str]:
        """Returns top_k document IDs"""
        if self.corpus_size == 0:
            return []
            
        scores = self.get_scores(query)
                                  
        scored_docs = zip(self.documents, scores)
                            
        sorted_docs = sorted(scored_docs, key=lambda x: x[1], reverse=True)
                                             
        return [doc_id for doc_id, score in sorted_docs if score > 0][:top_k]
        
class KeywordStore:
    _instances = {}                               

    def __init__(self, space_id=None, load_from_disk=False):
        from django.conf import settings
        self.bm25 = SimpleBM25()
        base_path = getattr(settings, 'RAG_KEYWORD_INDEX_PATH', None)
        if not base_path:
             base_path = os.path.join(settings.BASE_DIR, 'rag', 'data', 'keyword_index')
             
                                 
        if space_id:
            self.db_path = os.path.join(base_path, str(space_id))
        else:
            self.db_path = os.path.join(base_path, 'global')
            
        os.makedirs(self.db_path, exist_ok=True)
        self.index_file = os.path.join(self.db_path, 'bm25.pkl')
        
        if load_from_disk:
            self.load()

    def load(self):
                                     
        if self.db_path in KeywordStore._instances:
            self.bm25 = KeywordStore._instances[self.db_path]
            return

                               
        if os.path.exists(self.index_file):
            try:
                with open(self.index_file, 'rb') as f:
                    self.bm25 = pickle.load(f)
                                
                KeywordStore._instances[self.db_path] = self.bm25
            except Exception:
                self.bm25 = SimpleBM25()
        else:
            self.bm25 = SimpleBM25()

    def save(self):
        try:
            with open(self.index_file, 'wb') as f:
                pickle.dump(self.bm25, f)
        except Exception:
            pass
            
    def rebuild_index(self, chunks_queryset):
        """Builds index from scratch using Django QuerySet of chunks"""
                                                     
        data = list(chunks_queryset.values('id', 'text'))
        texts = [d['text'] for d in data]
        ids = [str(d['id']) for d in data]
        self.bm25.fit(texts, ids)
        self.save()
        
    def search(self, query, top_k=15):
        return self.bm25.search(query, top_k=top_k)
