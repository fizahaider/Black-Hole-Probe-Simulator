import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/api/notebooks/';

const notebookApi = axios.create({
    baseURL: API_BASE_URL,
});

notebookApi.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('accessToken');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

export const notebookService = {
    getSpaces: async () => {
        const response = await notebookApi.get('spaces/');
        return response.data;
    },

    createSpace: async (spaceData) => {
        const response = await notebookApi.post('spaces/', spaceData);
        return response.data;
    },

    getSpace: async (id) => {
        const response = await notebookApi.get(`spaces/${id}/`);
        return response.data;
    },

    updateSpace: async (id, spaceData) => {
        const response = await notebookApi.patch(`spaces/${id}/`, spaceData);
        return response.data;
    },

    deleteSpace: async (id) => {
        const response = await notebookApi.delete(`spaces/${id}/`);
        return response.data;
    },

    getConcepts: async (spaceId) => {
        const response = await notebookApi.get('concepts/', {
            params: { space: spaceId }
        });
        return response.data;
    },

    getMastery: async (spaceId) => {
        const response = await notebookApi.get('mastery/', {
            params: { space_id: spaceId }
        });
        return response.data;
    },

    getStats: async (spaceId = null) => {
        const params = spaceId ? { space_id: spaceId } : {};
        const response = await axios.get('http://localhost:8000/api/rag/stats/', {
            params,
            headers: {
                Authorization: `Bearer ${localStorage.getItem('accessToken')}`
            }
        });
        return response.data;
    },
};

export default notebookService;
