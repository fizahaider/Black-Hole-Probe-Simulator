import { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const DocumentContext = createContext();

export const useDocument = () => {
  return useContext(DocumentContext);
};

export const DocumentProvider = ({ children }) => {
  const [activeDocument, setActiveDocument] = useState(null);
  const [documents, setDocuments] = useState([]); 
  const [selectedDocumentIds, setSelectedDocumentIds] = useState(new Set()); 
  const [loading, setLoading] = useState(false);

  
  const fetchDocuments = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) return;

      const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/document/rag/documents/`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      
      const normalizedDocs = response.data.map(doc => ({
        ...doc,
        text: doc.text_content || doc.text || "", 
      }));
      setDocuments(normalizedDocs);
    } catch (e) {
      console.error("Failed to fetch documents", e);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const addDocument = (doc) => {
    
    
    const normalizedDoc = {
      ...doc,
      text: doc.text || doc.text_content || ""
    };

    setActiveDocument(normalizedDoc);

    
    setDocuments(prev => {
      const exists = prev.find(d => d.name === normalizedDoc.name || d.title === normalizedDoc.title);
      if (exists) return prev;
      return [normalizedDoc, ...prev];
    });

    
    if (normalizedDoc.id) {
      toggleDocumentSelection(normalizedDoc.id, true);
    }
  };

  const selectDocument = (doc) => {
    
    const normalizedDoc = {
      ...doc,
      text: doc.text || doc.text_content || ""
    };
    setActiveDocument(normalizedDoc);
  };

  const toggleDocumentSelection = (id, forceState = null) => {
    setSelectedDocumentIds(prev => {
      const newSet = new Set(prev);
      const shouldAdd = forceState !== null ? forceState : !newSet.has(id);

      if (shouldAdd) {
        newSet.add(id);
      } else {
        newSet.delete(id);
      }
      return newSet;
    });
  };

  const clearActiveDocument = () => {
    setActiveDocument(null);
  };

  const deleteDocument = async (id) => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) return;

      await axios.delete(`${import.meta.env.VITE_API_BASE_URL}/api/document/rag/documents/${id}/`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      
      setDocuments(prev => prev.filter(doc => doc.id !== id));
      setSelectedDocumentIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
      if (activeDocument?.id === id) {
        setActiveDocument(null);
      }
    } catch (e) {
      console.error("Failed to delete document", e);
      throw e;
    }
  };

  const value = {
    activeDocument,
    documents,
    selectedDocumentIds,
    addDocument,
    selectDocument,
    deleteDocument,
    toggleDocumentSelection,
    clearActiveDocument,
    loading,
    setLoading,
    refreshDocuments: fetchDocuments
  };

  return (
    <DocumentContext.Provider value={value}>
      {children}
    </DocumentContext.Provider>
  );
};
