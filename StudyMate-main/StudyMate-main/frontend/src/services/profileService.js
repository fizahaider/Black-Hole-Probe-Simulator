import api from './api';

export const profileService = {
    getProfile: async () => {
        const response = await api.get('profile/');
        return response.data;
    },

    updateProfile: async (profileData) => {
        const response = await api.patch('profile/', profileData);
        return response.data;
    },
};
