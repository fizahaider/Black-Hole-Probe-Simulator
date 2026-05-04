import axios from 'axios';

const API_BASE_URL = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}/api/document/`;

const documentApi = axios.create({
    baseURL: API_BASE_URL,
    timeout: 30000, 
});


documentApi.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('accessToken');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);


documentApi.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;
        if (error.response && error.response.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;
            try {
                const refreshToken = localStorage.getItem('refreshToken');
                if (refreshToken) {
                    const response = await axios.post(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}/api/user/token/refresh/`, {
                        refresh: refreshToken,
                    });
                    const { access } = response.data;
                    localStorage.setItem('accessToken', access);

                    
                    originalRequest.headers.Authorization = `Bearer ${access}`;
                    documentApi.defaults.headers.common['Authorization'] = `Bearer ${access}`;

                    return documentApi(originalRequest);
                }
            } catch (refreshError) {
                localStorage.removeItem('accessToken');
                localStorage.removeItem('refreshToken');
                window.location.href = '/auth?tab=signin';
                return Promise.reject(refreshError);
            }
        }
        return Promise.reject(error);
    }
);

export const documentService = {
    upload: async (file, spaceId = null) => {
        const formData = new FormData();
        formData.append('file', file);
        if (spaceId) {
            formData.append('space_id', spaceId);
        }
        const response = await documentApi.post('upload/', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data;
    },

    delete: async (documentId) => {
        const response = await documentApi.delete(`rag/documents/${documentId}/`);
        return response.data;
    },

    chat: async (documentId, question, options = {}) => {
        const doc_ids = options.documentIds || (documentId ? [documentId] : []);
        const response = await documentApi.post('chat/', {
            question: question,
            document_id: documentId,
            document_ids: doc_ids,
            space_id: options.spaceId,
            conversation_id: options.conversationId,
            personality: options.personality || 'neutral',
            depth: options.depth || 'detailed',
            stream: options.stream || false
        });
        return response.data;
    },

    rehydrateChat: async (params = {}) => {
        const response = await documentApi.get('chat/', { params });
        return response.data;
    },

    pinChatMessage: async ({ messageId, conceptName }) => {
        const response = await documentApi.post('chat/pin/', {
            message_id: messageId,
            concept_name: conceptName || undefined,
        });
        return response.data;
    },

    getSummary: async (documentId, options = {}) => {
        const doc_ids = options.documentIds || (documentId ? [documentId] : []);
        const response = await documentApi.post('summary/', {
            document_id: documentId,
            document_ids: doc_ids,
            space_id: options.spaceId,
            summary_length: options.summaryLength || 'medium',
            tone: options.tone || 'neutral',
            purpose: options.purpose || 'revision',
            emphasis: options.emphasis || 'key_points',
            structure: options.structure || 'paragraph',
            is_regenerate: options.isRegenerate || false
        });
        return response.data;
    },

    getFlashcards: async (documentId, options = {}) => {
        const doc_ids = options.documentIds || (documentId ? [documentId] : []);
        try {
            const response = await documentApi.post('flashcards/', {
                document_id: documentId,
                document_ids: doc_ids,
                space_id: options.spaceId
            });
            return response.data;
        } catch (error) {
            console.error('[documentService] getFlashcards error:', error);
            throw error;
        }
    },

    getQuiz: async (documentId, options = {}) => {
        const doc_ids = options.documentIds || (documentId ? [documentId] : []);
        const response = await documentApi.post('quiz/', {
            document_id: documentId,
            document_ids: doc_ids,
            space_id: options.spaceId,
            num_questions: options.numQuestions || 5,
            difficulty: options.difficulty || 'mixed',
            include_hints: options.includeHints !== undefined ? options.includeHints : true,
            conceptual_focus: options.conceptualFocus !== undefined ? options.conceptualFocus : true
        });
        return response.data;
    },

    getQuizHistory: async (spaceId) => {
        const response = await documentApi.get(`quiz/`, { params: { space_id: spaceId } });
        return response.data;
    },

    saveQuizResults: async (attemptId, data) => {
        const response = await documentApi.patch(`quiz/${attemptId}/`, data);
        return response.data;
    },

    getFlashcardHistory: async (spaceId) => {
        const response = await documentApi.get(`flashcards/`, { params: { space_id: spaceId } });
        return response.data;
    },

    getSummaryHistory: async (spaceId) => {
        const response = await documentApi.get(`summary/`, { params: { space_id: spaceId } });
        return response.data;
    },

    getStudyPlanHistory: async (spaceId = null) => {
        const params = spaceId ? { space_id: spaceId } : {};
        const response = await documentApi.get(`studyplanner/`, { params });
        return response.data;
    },

    getStudyPlan: async (documentId, options = {}) => {
        const doc_ids = options.documentIds || (documentId ? [documentId] : []);
        const primaryId = documentId || (doc_ids.length > 0 ? doc_ids[0] : null);
        const url = primaryId
            ? `documents/${primaryId}/studyplanner/`
            : `studyplanner/`;
        const response = await documentApi.post(url, {
            document_ids: doc_ids,
            document_id: primaryId,
            space_id: options.spaceId,
            time_per_day: options.timePerDay || 1,
            total_days: options.totalDays || 7,
            skill_level: options.skillLevel || 'beginner',
            focus: options.focus || ['read', 'review'],
            learning_style: options.learningStyle || 'interactive',
            revision_strategy: options.revisionStrategy || 'mixed'
        });
        return response.data;
    },

    getChatHistory: async (spaceId) => {
        const response = await documentApi.get(`rag/chat/history/`, { params: { space_id: spaceId } });
        return response.data;
    },

    updateStudyPlan: async (planId, data) => {
        const response = await documentApi.patch(`studyplanner/${planId}/`, data);
        return response.data;
    },

    generateMindMap: async (documentId, options = {}) => {
        const doc_ids = options.documentIds || (documentId ? [documentId] : []);
        const response = await documentApi.post('mindmap/generate/', {
            document_id: documentId,
            document_ids: doc_ids,
            space_id: options.spaceId
        });
        return response.data;
    },

    getMindMapHistory: async (spaceId) => {
        const response = await documentApi.get(`mindmap/generate/`, { params: { space_id: spaceId } });
        return response.data;
    }
};

export default documentService;
