import axios from 'axios';

const API_BASE_URL = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}/api/document/rag/`;

const spaceApi = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});


spaceApi.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export const spaceService = {
  getSpaces: async () => {
    const response = await spaceApi.get('knowledge-spaces/');
    return response.data;
  },
  createSpace: async (data) => {
    const response = await spaceApi.post('knowledge-spaces/', data);
    return response.data;
  },
  getSpace: async (id) => {
    const response = await spaceApi.get(`knowledge-spaces/${id}/`);
    return response.data;
  },
  getDocuments: async (spaceId) => {
    const response = await spaceApi.get(`documents/?space_id=${spaceId}`);
    return response.data;
  },
  updateSpace: async (id, data) => {
    const response = await spaceApi.put(`knowledge-spaces/${id}/`, data);
    return response.data;
  },
  deleteSpace: async (id) => {
    const response = await spaceApi.delete(`knowledge-spaces/${id}/`);
    return response.data;
  }
};
