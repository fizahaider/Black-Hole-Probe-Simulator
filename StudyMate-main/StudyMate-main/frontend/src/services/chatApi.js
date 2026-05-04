import axios from 'axios';

const CHAT_BASE_URL = `${import.meta.env.VITE_API_BASE_URL}/api/chat/`;

const chatApi = axios.create({
  baseURL: CHAT_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

chatApi.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

chatApi.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response && error.response.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (refreshToken) {
          const refreshResponse = await axios.post(
            `${import.meta.env.VITE_API_BASE_URL}/api/user/token/refresh/`,
            { refresh: refreshToken }
          );
          const access = refreshResponse.data.access;
          if (access) {
            localStorage.setItem('accessToken', access);
            originalRequest.headers.Authorization = `Bearer ${access}`;
          }
          chatApi.defaults.headers.common.Authorization = `Bearer ${access}`;
          return chatApi(originalRequest);
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

export default chatApi;
