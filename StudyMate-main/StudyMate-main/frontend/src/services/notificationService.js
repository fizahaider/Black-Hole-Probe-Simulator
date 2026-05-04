import api from './api';

export const notificationService = {
  list: (params = {}) => api.get('notifications/', { params }),

  unreadCount: () => api.get('notifications/unread-count/'),

  markRead: (id) => api.patch(`notifications/${id}/read/`),

  markAllRead: () => api.post('notifications/mark-all-read/'),
};
