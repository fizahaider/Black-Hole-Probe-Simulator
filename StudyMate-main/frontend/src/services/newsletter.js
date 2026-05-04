import api from './api';

export const newsletterService = {
    subscribe: async (email) => {
        const response = await api.post('newsletter/subscribe/', { email });
        return response.data;
    },
};
