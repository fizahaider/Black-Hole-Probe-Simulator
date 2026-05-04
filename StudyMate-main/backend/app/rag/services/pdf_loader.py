import fitz
from typing import List, Dict, Any


def extract_documents(pdf_path: str) -> List[Dict[str, Any]]:
    doc = fitz.open(pdf_path)
    documents = []
    
    for page_num, page in enumerate(doc):
        text = page.get_text()
        if text.strip():
            documents.append({
                "text": text,
                "metadata": {"page": page_num + 1}
            })
            
    if not documents:
        if doc.page_count > 0:
            pass
            
    doc.close()
    return documents

