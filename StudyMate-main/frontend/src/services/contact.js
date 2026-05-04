import api from './api';

export const contactService = {
    sendMessage: async (data) => {
        
        const response = await api.post('contact/', data);
        return response.data;
    },
};
