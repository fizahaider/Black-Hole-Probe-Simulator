import axios from 'axios';

const API_BASE_URL = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}/api/analytics/`;

const analyticsApi = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
});

analyticsApi.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

analyticsApi.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response && error.response.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (refreshToken) {
          const response = await axios.post(
            `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}/api/user/token/refresh/`,
            { refresh: refreshToken }
          );
          const { access } = response.data;
          localStorage.setItem('accessToken', access);
          originalRequest.headers.Authorization = `Bearer ${access}`;
          analyticsApi.defaults.headers.common.Authorization = `Bearer ${access}`;
          return analyticsApi(originalRequest);
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

export const analyticsService = {
  getDashboard: async () => {
    const response = await analyticsApi.get('dashboard/');
    return response.data;
  },
};

