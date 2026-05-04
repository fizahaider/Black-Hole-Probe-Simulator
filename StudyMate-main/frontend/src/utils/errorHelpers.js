export const parseApiError = (error) => {
    if (error.response) {
        const { data } = error.response;
        if (typeof data === 'string') {
            const trimmed = data.trim().toLowerCase();
            if (trimmed.startsWith('<!doctype html') || trimmed.startsWith('<html')) {
                return `Server error (${error.response.status || 500}). Please try again.`;
            }
            return data;
        }
        if (data.detail) {
            return data.detail;
        }
        if (data.message) {
            return data.message;
        }
        
        const firstKey = Object.keys(data)[0];
        if (firstKey && Array.isArray(data[firstKey])) {
            return `${firstKey.charAt(0).toUpperCase() + firstKey.slice(1)}: ${data[firstKey][0]}`;
        }
        if (firstKey && typeof data[firstKey] === 'string') {
            return `${firstKey.charAt(0).toUpperCase() + firstKey.slice(1)}: ${data[firstKey]}`;
        }
    }
    return 'An unexpected error occurred. Please try again.';
};
