import chatApi from './chatApi';
import api from './api';
import documentService from './documentService';

const friendsChatService = {
  getConversations: async () => {
    const response = await chatApi.get('/conversations/');
    return response.data;
  },

  getConversation: async (id) => {
    const response = await chatApi.get(`/conversations/${id}/`);
    return response.data;
  },

  createConversation: async (data) => {
    const response = await chatApi.post('/conversations/', data);
    return response.data;
  },

  getMessages: async (conversationId, after = null) => {
    let url = `/messages/?conversation=${conversationId}`;
    if (after) {
      url += `&after=${encodeURIComponent(after)}`;
    }
    const response = await chatApi.get(url);
    return response.data;
  },

  sendMessage: async (conversationId, content, messageType = 'text', metadata = {}) => {
    const response = await chatApi.post('/messages/', {
      conversation: conversationId,
      content,
      message_type: messageType,
      metadata,
      attachment_document_ids: metadata.attachment_document_ids || [],
    });
    return response.data;
  },

  toggleReaction: async (messageId, emoji) => {
    const response = await chatApi.patch(`/messages/${messageId}/reactions/`, { emoji });
    return response.data;
  },

  deleteMessageForEveryone: async (messageId) => {
    const response = await chatApi.delete(`/messages/${messageId}/for-everyone/`);
    return response.data;
  },

  leaveConversation: async (conversationId) => {
    const response = await chatApi.post(`/conversations/${conversationId}/leave/`);
    return response.data;
  },

  deleteConversation: async (conversationId) => {
    const response = await chatApi.delete(`/conversations/${conversationId}/`);
    return response.data;
  },

  getParticipants: async (conversationId) => {
    const response = await chatApi.get(`/conversations/${conversationId}/participants/`);
    return response.data;
  },

  addParticipant: async (conversationId, email) => {
    const response = await chatApi.post(`/conversations/${conversationId}/participants/`, {
      user_email: email,
      role: 'member',
    });
    return response.data;
  },

  removeParticipant: async (conversationId, userId) => {
    const response = await chatApi.delete(`/conversations/${conversationId}/participants/${userId}/`);
    return response.data;
  },

  updateParticipantRole: async (conversationId, userId, role) => {
    const response = await chatApi.patch(`/conversations/${conversationId}/participants/${userId}/role/`, { role });
    return response.data;
  },

  createInvite: async (conversationId, email) => {
    const response = await chatApi.post(`/conversations/${conversationId}/invites/`, { invitee_email: email });
    return response.data;
  },

  getInvites: async () => {
    const response = await chatApi.get('/invites/');
    return response.data;
  },

  respondToInvite: async (inviteId, status) => {
    const response = await chatApi.patch(`/invites/${inviteId}/`, { status });
    return response.data;
  },

  getAttachments: async () => {
    const response = await chatApi.get('/attachments/');
    return response.data;
  },

  downloadAttachment: async (attachmentId) => {
    const response = await chatApi.get(`/attachments/${attachmentId}/download/`, {
      responseType: 'blob',
    });
    return response.data;
  },

  uploadAttachmentDocument: async (file) => {
    return documentService.upload(file);
  },

  searchUsers: async (query) => {
    const response = await api.get(`search/?q=${encodeURIComponent(query)}`);
    return (response.data || []).map((user) => ({
      id: user.id,
      username: user.username,
      display_name: user.display_name,
      avatar: user.avatar ?? null,
      email: user.username,
      name: user.display_name,
    }));
  },

  fetchActiveStudySession: async (conversationId) => {
    const response = await chatApi.get(`/conversations/${conversationId}/active-study-session/`);
    return response.data;
  },
};

export default friendsChatService;
