import os
from sentence_transformers import SentenceTransformer, CrossEncoder

def download_models():
                        
    print("Downloading Embedding model= all-MiniLM-L6-v2")
    SentenceTransformer('all-MiniLM-L6-v2')
                        
    print("Downloading Cross-Encoder model= cross-encoder/ms-marco-MiniLM-L-12-v2")
    CrossEncoder('cross-encoder/ms-marco-MiniLM-L-12-v2')
    print("Models downloaded successfully.")
if __name__ == "__main__":
    download_models()
