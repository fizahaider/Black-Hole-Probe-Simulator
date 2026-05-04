import axios from 'axios';

const API_BASE_URL = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}/api/prep-hub/`;

const prepHubApi = axios.create({
  baseURL: API_BASE_URL,
  timeout: 45000,
});

prepHubApi.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

export const prepHubService = {
  generatePlan: async (payload) => {
    const response = await prepHubApi.post('generate/', payload);
    return response.data;
  },
  listPlans: async () => {
    const response = await prepHubApi.get('plans/');
    return response.data;
  },
  getPlanDetail: async (id) => {
    const response = await prepHubApi.get(`plans/${id}/`);
    return response.data;
  },
  renamePlan: async (id, topic) => {
    const response = await prepHubApi.patch(`plans/${id}/rename/`, { topic });
    return response.data;
  },
  deletePlan: async (id) => {
    const response = await prepHubApi.delete(`plans/${id}/delete/`);
    return response.data;
  },
  regeneratePlan: async (id, useWebSearch = false) => {
    const response = await prepHubApi.post(`plans/${id}/regenerate/`, { use_web_search: useWebSearch });
    return response.data;
  },
  setFocus: async (id) => {
    const response = await prepHubApi.post(`plans/${id}/set-focus/`);
    return response.data;
  },
  startPhase: async (id, phaseIndex) => {
    const response = await prepHubApi.post(`plans/${id}/start-phase/`, { phase_index: phaseIndex });
    return response.data;
  },
  toggleTask: async (id, phaseIndex, taskIndex, completed) => {
    const response = await prepHubApi.post(`plans/${id}/toggle-task/`, {
      phase_index: phaseIndex,
      task_index: taskIndex,
      completed,
    });
    return response.data;
  },
  saveResource: async (id, url) => {
    const response = await prepHubApi.post(`plans/${id}/save-resource/`, { url });
    return response.data;
  },
  convertToStudyPlan: async (id) => {
    const response = await prepHubApi.post(`plans/${id}/convert-study-plan/`);
    return response.data;
  },
};

