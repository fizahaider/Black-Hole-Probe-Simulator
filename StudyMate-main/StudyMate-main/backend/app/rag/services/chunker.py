from typing import List, Dict, Any
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_core.documents import Document


def chunk_documents(documents: List[Dict[str, Any]], chunk_size: int = 2000, overlap: int = 200) -> List[Document]:
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=overlap,
        length_function=len,
    )

    chunked_docs = []

    for doc in documents:
        lc_doc = Document(
            page_content=doc["text"],
            metadata=doc["metadata"]
        )
        
        split_docs = text_splitter.split_documents([lc_doc])
        chunked_docs.extend(split_docs)
            
    return chunked_docs

