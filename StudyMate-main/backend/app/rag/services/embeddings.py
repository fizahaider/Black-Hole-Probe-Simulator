from langchain_huggingface import HuggingFaceEmbeddings

_model_cache = None


def get_embedding_model():
    """Returns the embedding model for document chunks, cached as a singleton."""
    global _model_cache
    if _model_cache is not None:
        return _model_cache

    model_name = "all-MiniLM-L6-v2" 
    model_kwargs = {'trust_remote_code': True}
    encode_kwargs = {'normalize_embeddings': True}
    
    try:
        _model_cache = HuggingFaceEmbeddings(
            model_name=model_name,
            model_kwargs=model_kwargs,
            encode_kwargs=encode_kwargs
        )
    except Exception as e:
        import logging
        logging.getLogger(__name__).error(f"Failed to load embedding model: {e}")
        raise e
    return _model_cache

