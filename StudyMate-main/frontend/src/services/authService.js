import api from './api';

export const authService = {
  login: async (email, password) => {
    const response = await api.post('signin/', { email, password });
    return response.data;
  },

  signup: async (name, email, password, confirmPassword) => {
    const response = await api.post('signup/', {
      name,
      email,
      password,
      confirm_password: confirmPassword
    });
    return response.data;
  },

  logout: () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  },

  refreshToken: async () => {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) throw new Error('No refresh token');
    const response = await api.post('token/refresh/', { refresh: refreshToken });
    return response.data;
  },

  getCurrentUser: async () => {
    const response = await api.get('profile/');
    return response.data;
  },

  requestPasswordReset: async (email) => {
    const response = await api.post('password-reset/request/', { email });
    return response.data;
  },

  confirmPasswordReset: async (uidb64, token, newPassword, confirmPassword) => {
    const response = await api.post('password-reset/confirm/', {
      uidb64,
      token,
      new_password: newPassword,
      confirm_password: confirmPassword
    });
    return response.data;
  },

  updatePassword: async (oldPassword, newPassword, confirmPassword) => {
    const response = await api.post('password/update/', {
      old_password: oldPassword,
      new_password: newPassword,
      confirm_password: confirmPassword,
    });
    return response.data;
  },
};

