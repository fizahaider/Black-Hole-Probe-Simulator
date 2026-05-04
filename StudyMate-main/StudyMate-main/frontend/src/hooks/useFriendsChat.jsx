import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import friendsChatService from '../services/friendsChatService';

const FriendsChatContext = createContext(null);

const getWsBaseUrl = () => {
  const base = import.meta.env.VITE_API_BASE_URL || window.location.origin;
  return base.replace(/^http/, 'ws');
};

const normalizeConversation = (conversation) => {
  const currentEmail = (localStorage.getItem('userEmail') || '').toLowerCase();
  if (conversation?.is_group) {
    return conversation;
  }

  const participants = Array.isArray(conversation?.participants)
    ? conversation.participants
    : [];
  const otherParticipant = participants.find((participant) => {
    const participantEmail = (participant?.user_email || '').toLowerCase();
    return participantEmail && participantEmail !== currentEmail;
  });

  if (otherParticipant?.user_email) {
    const preferredName =
      otherParticipant.user_name ||
      otherParticipant.name ||
      (otherParticipant.user_email ? otherParticipant.user_email.split('@')[0] : null);
    return {
      ...conversation,
      title: preferredName || otherParticipant.user_email,
    };
  }

  return conversation;
};

const normalizeConversations = (items) => {
  return (items || []).map((item) => normalizeConversation(item));
};

const dedupeInvites = (items) => {
  const uniqueInvites = new Map();
  for (const invite of items || []) {
    const key = [
      invite.conversation,
      (invite.inviter_email || '').toLowerCase(),
      (invite.invitee_email || '').toLowerCase(),
      invite.status,
    ].join('|');

    if (!uniqueInvites.has(key)) {
      uniqueInvites.set(key, invite);
    }
  }
  return Array.from(uniqueInvites.values());
};

const normalizeSession = (session) => {
  if (!session || !session.is_active) return null;
  return {
    ...session,
    startedAt: session.started_at,
    totalPausedDuration: session.total_paused_duration,
    isBreak: session.current_phase === 'break',
    status: session.is_paused ? 'paused' : 'active',
    remainingTime: session.remaining_time || 0
  };
};

const removeConversationState = ({
  conversationId,
  setConversations,
  setActiveConversationId,
  setUnreadCounts,
  setMessagesByConversation,
  setMessagesLoadingByConversation,
  disconnectWebSocket,
  activeConversationIdRef,
  conversationsRef,
  lastSeenActivityRef,
  latestMessageAtRef,
}) => {
  disconnectWebSocket(conversationId);

  setConversations((prev) => {
    const next = prev.filter((conversation) => conversation.id !== conversationId);
    conversationsRef.current = next;

    if (activeConversationIdRef.current === conversationId) {
      const fallback = next[0]?.id || null;
      activeConversationIdRef.current = fallback;
      setActiveConversationId(fallback);
    }

    return next;
  });

  setUnreadCounts((prev) => {
    const next = { ...prev };
    delete next[conversationId];
    return next;
  });

  setMessagesByConversation((prev) => {
    const next = { ...prev };
    delete next[conversationId];
    return next;
  });

  setMessagesLoadingByConversation((prev) => {
    const next = { ...prev };
    delete next[conversationId];
    return next;
  });

  delete lastSeenActivityRef.current[conversationId];
  delete latestMessageAtRef.current[conversationId];
};

export const FriendsChatProvider = ({ children }) => {
  const [conversations, setConversations] = useState([]);
  const [conversationsLoading, setConversationsLoading] = useState(true);
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [messagesByConversation, setMessagesByConversation] = useState({});
  const [messagesLoadingByConversation, setMessagesLoadingByConversation] = useState({});
  const [invites, setInvites] = useState([]);
  const [invitesLoading, setInvitesLoading] = useState(true);
  const [unreadCounts, setUnreadCounts] = useState({});
  const [connectionStatus, setConnectionStatus] = useState({});
  const [pendingMessages, setPendingMessages] = useState({});
  const [activeSession, setActiveSession] = useState(null);
  const [sessionActionBusyByConversation, setSessionActionBusyByConversation] = useState({});

  const conversationsRef = useRef([]);
  const activeConversationIdRef = useRef(null);
  const lastSeenActivityRef = useRef({});
  const socketsRef = useRef({});
  const wsBackoffRef = useRef({});
  const wsManualCloseRef = useRef({});
  const latestMessageAtRef = useRef({});
  const pollIntervalsRef = useRef({});
  const pendingMessagesRef = useRef({});
  const fetchingConversationIdsRef = useRef(new Set());
  const activeSessionRef = useRef(null);
  const sessionTimerRef = useRef(null);
  const notificationSocketRef = useRef(null);

  useEffect(() => {
    activeSessionRef.current = activeSession;
  }, [activeSession]);

  const sortByActivity = useCallback((items) => {
    return [...items].sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
  }, []);

  const updatePendingMessages = useCallback((updater) => {
    setPendingMessages((prev) => {
      const next = updater(prev);
      pendingMessagesRef.current = next;
      return next;
    });
  }, []);

  const updateUnreadCountsFromConversations = useCallback((list) => {
    setUnreadCounts((prev) => {
      const next = { ...prev };
      const lastSeen = { ...lastSeenActivityRef.current };

      list.forEach((conv) => {
        const id = conv.id;
        const updatedAt = conv.updated_at;
        const previous = lastSeen[id];

        if (!previous) {
          lastSeen[id] = updatedAt;
          if (next[id] == null) {
            next[id] = 0;
          }
        } else if (new Date(updatedAt) > new Date(previous)) {
          lastSeen[id] = updatedAt;
          if (activeConversationIdRef.current && activeConversationIdRef.current === id) {
            next[id] = 0;
          } else {
            next[id] = (next[id] || 0) + 1;
          }
        }
      });

      lastSeenActivityRef.current = lastSeen;
      return next;
    });
  }, []);

  const handleSessionEvent = useCallback((conversationId, payload) => {
    if (!payload) return;
    const isActiveConversation = conversationId === activeConversationIdRef.current;
    if (!isActiveConversation) return;

    if (payload.type === 'session_state' || payload.type === 'session_update') {
      if (!payload.data) {
        setActiveSession(null);
        return;
      }
      
      const normalized = normalizeSession(payload.data);
      
      
      if (payload.remainingSeconds !== undefined && !isNaN(Number(payload.remainingSeconds))) {
        normalized.remaining_time = Number(payload.remainingSeconds);
        console.log("WS TIMER DATA:", payload.remainingSeconds);
      }
      
      setActiveSession(normalized);
    }
  }, []);

  const fetchActiveSession = useCallback(async (conversationId) => {
    if (!conversationId) return;
    try {
      const data = await friendsChatService.fetchActiveStudySession(conversationId);
      if (conversationId === activeConversationIdRef.current) {
        setActiveSession(normalizeSession(data));
      }
    } catch (err) {
      console.error('Failed to fetch session', err);
    }
  }, []);

  const fetchConversations = useCallback(async () => {
    setConversationsLoading(true);
    try {
      const data = await friendsChatService.getConversations();
      const list = sortByActivity(normalizeConversations(data.results || data || []));
      // Filter out AI bot conversations - only show friend chats
      const friendConversations = list.filter((conv) => {
        // Keep only conversations that are not AI bots
        // AI conversations typically have message_type === 'ai' or are marked as AI
        const isAI = conv.is_ai || conv.is_bot || (conv.metadata && conv.metadata.is_ai);
        return !isAI;
      });
      setConversations(friendConversations);
      conversationsRef.current = friendConversations;
      updateUnreadCountsFromConversations(friendConversations);
    } catch (error) {
      console.error("API ERROR (fetchConversations):", error.response?.data || error.message);
      setConversations([]);
      conversationsRef.current = [];
    } finally {
      setConversationsLoading(false);
    }
  }, [sortByActivity, updateUnreadCountsFromConversations]);

  const upsertConversationById = useCallback(
    async (conversationId) => {
      if (!conversationId) return;
      if (fetchingConversationIdsRef.current.has(conversationId)) return;

      fetchingConversationIdsRef.current.add(conversationId);
      try {
        const conversation = await friendsChatService.getConversation(conversationId);
        const normalizedConversation = normalizeConversation(conversation);

        setConversations((prev) => {
          const without = prev.filter((item) => item.id !== normalizedConversation.id);
          const next = sortByActivity([normalizedConversation, ...without]);
          conversationsRef.current = next;
          return next;
        });

        setUnreadCounts((prev) => ({
          ...prev,
          [normalizedConversation.id]: prev[normalizedConversation.id] || 0,
        }));
      } catch (error) {
        console.error("API ERROR (upsertConversationById):", error.response?.data || error.message);
      } finally {
        fetchingConversationIdsRef.current.delete(conversationId);
      }
    },
    [sortByActivity]
  );

  const touchConversationActivity = useCallback(
    (conversationId, updatedAt) => {
      if (!conversationId || !updatedAt) return;

      let foundConversation = false;
      setConversations((prev) => {
        const next = prev.map((conversation) => {
          if (conversation.id !== conversationId) {
            return conversation;
          }

          foundConversation = true;
          const currentUpdatedAt = conversation.updated_at;
          const nextUpdatedAt =
            currentUpdatedAt && new Date(currentUpdatedAt) > new Date(updatedAt)
              ? currentUpdatedAt
              : updatedAt;

          return {
            ...conversation,
            updated_at: nextUpdatedAt,
          };
        });

        const sorted = sortByActivity(next);
        conversationsRef.current = sorted;
        return sorted;
      });

      if (!foundConversation) {
        upsertConversationById(conversationId);
      }
    },
    [sortByActivity, upsertConversationById]
  );

  const fetchInvites = useCallback(async () => {
    setInvitesLoading(true);
    try {
      const data = await friendsChatService.getInvites();
      const currentEmail = (localStorage.getItem('userEmail') || '').toLowerCase();
      const incoming = data.results || data || [];
      const recipientOnly = currentEmail
        ? incoming.filter((invite) => (invite?.invitee_email || '').toLowerCase() === currentEmail)
        : incoming;
      setInvites(dedupeInvites(recipientOnly));
    } catch {
      setInvites([]);
    } finally {
      setInvitesLoading(false);
    }
  }, []);

  const addServerMessage = useCallback((message) => {
    const conversationId = message.conversation;
    if (!conversationId) return;

    const clientTempId = message?.metadata?.client_temp_id;

    const pendingToClear = Object.entries(pendingMessagesRef.current)
      .filter(([, pending]) => {
        if (clientTempId && pending.tempId === clientTempId) {
          return true;
        }

        return (
          pending.conversationId === conversationId &&
          (pending.content || '').trim() === (message.content || '').trim()
        );
      })
      .map(([tempId]) => tempId);

    setMessagesByConversation((prev) => {
      const current = prev[conversationId] || [];
      const existingIndex = current.findIndex((m) => m.id === message.id);
      if (existingIndex >= 0) {
        const nextMessages = [...current];
        nextMessages[existingIndex] = { ...current[existingIndex], ...message, status: 'sent' };
        return {
          ...prev,
          [conversationId]: nextMessages,
        };
      }

      const optimisticIndex = current.findIndex((item) => {
        if (clientTempId && item?.id === clientTempId) {
          return true;
        }

        const isOptimistic =
          item?.status === 'sending' ||
          item?.status === 'failed' ||
          String(item?.id || '').startsWith('temp-');

        if (!isOptimistic) {
          return false;
        }

        const sameContent = (item?.content || '').trim() === (message?.content || '').trim();
        const senderCompatible =
          !item?.sender_email ||
          !message?.sender_email ||
          item.sender_email === message.sender_email;

        return sameContent && senderCompatible;
      });

      const nextMessages = [...current];
      if (optimisticIndex >= 0) {
        nextMessages[optimisticIndex] = { ...message, status: 'sent' };
      } else {
        nextMessages.push({ ...message, status: 'sent' });
      }

      return {
        ...prev,
        [conversationId]: nextMessages,
      };
    });

    if (pendingToClear.length > 0) {
      updatePendingMessages((prev) => {
        const next = { ...prev };
        pendingToClear.forEach((tempId) => {
          delete next[tempId];
        });
        return next;
      });
    }

    latestMessageAtRef.current[conversationId] = message.created_at;
    touchConversationActivity(conversationId, message.created_at);

    if (!activeConversationIdRef.current || activeConversationIdRef.current !== conversationId) {
      setUnreadCounts((prev) => ({
        ...prev,
        [conversationId]: (prev[conversationId] || 0) + 1,
      }));
    }
  }, [touchConversationActivity, updatePendingMessages]);

  const stopPolling = useCallback((conversationId) => {
    const intervalId = pollIntervalsRef.current[conversationId];
    if (intervalId) {
      clearInterval(intervalId);
      delete pollIntervalsRef.current[conversationId];
    }
  }, []);

  const disconnectWebSocket = useCallback(
    (conversationId) => {
      wsManualCloseRef.current[conversationId] = true;
      const socket = socketsRef.current[conversationId];
      if (socket) {
        socket.close();
        delete socketsRef.current[conversationId];
      }
      stopPolling(conversationId);
      setConnectionStatus((prev) => ({
        ...prev,
        [conversationId]: 'disconnected',
      }));
    },
    [stopPolling]
  );

  const startPolling = useCallback(
    (conversationId) => {
      if (pollIntervalsRef.current[conversationId]) return;

      const intervalId = window.setInterval(async () => {
        const after = latestMessageAtRef.current[conversationId] || null;
        try {
          const data = await friendsChatService.getMessages(conversationId, after);
          const items = data.results || data || [];
          items.forEach((m) => addServerMessage(m));
        } catch (error) {
          if (error.response && (error.response.status === 403 || error.response.status === 404)) {
            disconnectWebSocket(conversationId);
          }
        }
      }, 5000);

      pollIntervalsRef.current[conversationId] = intervalId;
      setConnectionStatus((prev) => ({
        ...prev,
        [conversationId]: 'polling',
      }));
    },
    [addServerMessage, disconnectWebSocket]
  );

  const connectWebSocket = useCallback(
    (conversationId) => {
      if (!conversationId) return;
      if (socketsRef.current[conversationId]) return;

      const token = localStorage.getItem('accessToken');
      if (!token) {
        startPolling(conversationId);
        return;
      }

      const wsBase = getWsBaseUrl();
      const wsUrl = `${wsBase}/ws/chat/${conversationId}/?token=${encodeURIComponent(token)}`;

      setConnectionStatus((prev) => ({
        ...prev,
        [conversationId]: 'connecting',
      }));
      wsManualCloseRef.current[conversationId] = false;

      const socket = new WebSocket(wsUrl);
      socketsRef.current[conversationId] = socket;

      socket.onopen = () => {
        wsBackoffRef.current[conversationId] = 0;
        setConnectionStatus((prev) => ({
          ...prev,
          [conversationId]: 'connected',
        }));
        stopPolling(conversationId);
      };

      socket.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload && payload.type === 'chat_message') {
            addServerMessage(payload.data);
          } else if (payload && (payload.type === 'session_state' || payload.type === 'session_update' || payload.type === 'session_event')) {
            handleSessionEvent(conversationId, payload);
          } else if (payload && payload.error) {
            console.error('WebSocket Error:', payload.error);
          }
        } catch (err) {
          console.error('WebSocket message parse error', err);
        }
      };

      socket.onerror = () => {
        socket.close();
      };

      socket.onclose = () => {
        delete socketsRef.current[conversationId];

        if (wsManualCloseRef.current[conversationId]) {
          setConnectionStatus((prev) => ({
            ...prev,
            [conversationId]: 'disconnected',
          }));
          return;
        }

        setConnectionStatus((prev) => ({
          ...prev,
          [conversationId]: 'disconnected',
        }));

        startPolling(conversationId);

        const current = wsBackoffRef.current[conversationId] || 0;
        const next = current + 1;
        wsBackoffRef.current[conversationId] = next;
        const delay = Math.min(30000, 1000 * 2 ** (next - 1));

        window.setTimeout(() => {
          if (!wsManualCloseRef.current[conversationId]) {
            connectWebSocket(conversationId);
          }
        }, delay);
      };
    },
    [addServerMessage, handleSessionEvent, startPolling, stopPolling]
  );

  const connectNotificationSocket = useCallback(() => {
    if (notificationSocketRef.current) return;

    const token = localStorage.getItem('accessToken');
    if (!token) return;

    const wsBase = getWsBaseUrl();
    const wsUrl = `${wsBase}/ws/notifications/?token=${encodeURIComponent(token)}`;

    const socket = new WebSocket(wsUrl);
    notificationSocketRef.current = socket;

    socket.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === 'invite_received') {
          fetchInvites();
          fetchConversations(); 
        } else if (payload.type === 'conversation_removed') {
          removeConversationState({
            conversationId: payload.conversation_id,
            setConversations,
            setActiveConversationId,
            setUnreadCounts,
            setMessagesByConversation,
            setMessagesLoadingByConversation,
            disconnectWebSocket,
            activeConversationIdRef,
            conversationsRef,
            lastSeenActivityRef,
            latestMessageAtRef,
          });
        } else if (payload.type === 'membership_updated') {
          fetchConversations();
        }
      } catch (err) {
        console.error('Notification WS message error', err);
      }
    };

    socket.onclose = () => {
      notificationSocketRef.current = null;
      
      setTimeout(() => {
        if (localStorage.getItem('accessToken')) {
          connectNotificationSocket();
        }
      }, 5000);
    };
    
    socket.onerror = (err) => {
      console.error('Notification WS error', err);
    };
  }, [fetchInvites, fetchConversations, disconnectWebSocket]);

  const ensureMessages = useCallback(async (conversationId) => {
    setMessagesLoadingByConversation((prev) => ({
      ...prev,
      [conversationId]: true,
    }));
    try {
      const data = await friendsChatService.getMessages(conversationId, null);
      const items = (data.results || data || []).slice().reverse();
      setMessagesByConversation((prev) => ({
        ...prev,
        [conversationId]: items,
      }));
      if (items.length > 0) {
        latestMessageAtRef.current[conversationId] = items[items.length - 1].created_at;
      }
    } catch {
      setMessagesByConversation((prev) => ({
        ...prev,
        [conversationId]: prev[conversationId] || [],
      }));
    } finally {
      setMessagesLoadingByConversation((prev) => ({
        ...prev,
        [conversationId]: false,
      }));
    }
  }, []);

  const syncConversationMessages = useCallback(async (conversationId) => {
    if (!conversationId) return;
    try {
      const data = await friendsChatService.getMessages(conversationId, null);
      const items = (data.results || data || []).slice().reverse();
      setMessagesByConversation((prev) => ({
        ...prev,
        [conversationId]: items,
      }));
      if (items.length > 0) {
        latestMessageAtRef.current[conversationId] = items[items.length - 1].created_at;
      }
    } catch {
    }
  }, []);

  const createConversation = useCallback(
    async (data) => {
      const conv = await friendsChatService.createConversation(data);
      const normalized = normalizeConversation(conv);
      setConversations((prev) => {
        const next = sortByActivity([normalized, ...prev]);
        conversationsRef.current = next;
        return next;
      });
      lastSeenActivityRef.current = {
        ...lastSeenActivityRef.current,
        [normalized.id]: normalized.updated_at,
      };
      setUnreadCounts((prev) => ({
        ...prev,
        [normalized.id]: 0,
      }));
      return normalized;
    },
    [sortByActivity]
  );

  const sendMessage = useCallback(
    async (conversationId, content, messageType = 'text', metadata = {}) => {
      if (!conversationId || !content.trim()) return;

      const trimmedContent = content.trim();

      const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const optimistic = {
        id: tempId,
        conversation: conversationId,
        content: trimmedContent,
        message_type: messageType,
        metadata,
        sender_email: localStorage.getItem('userEmail') || '',
        created_at: new Date().toISOString(),
        status: 'sending',
      };

      setMessagesByConversation((prev) => {
        const current = prev[conversationId] || [];
        return {
          ...prev,
          [conversationId]: [...current, optimistic],
        };
      });

      updatePendingMessages((prev) => ({
        ...prev,
        [tempId]: {
          conversationId,
          content: trimmedContent,
          messageType,
          metadata,
          tempId,
        },
      }));

      const replaceOrAppendMessage = (messages, incomingMessage) => {
        const incomingWithStatus = { ...incomingMessage, status: 'sent' };
        const existingById = messages.findIndex((message) => message.id === incomingWithStatus.id);
        if (existingById >= 0) {
          const next = [...messages];
          next[existingById] = incomingWithStatus;
          return next;
        }

        const existingByTemp = messages.findIndex((message) => message.id === tempId);
        if (existingByTemp >= 0) {
          const next = [...messages];
          next[existingByTemp] = incomingWithStatus;
          return next;
        }

        return [...messages, incomingWithStatus];
      };

      const tryReconcileDeliveredMessage = async () => {
        const currentUserEmail = (localStorage.getItem('userEmail') || '').toLowerCase();

        for (let attempt = 0; attempt < 2; attempt += 1) {
          if (attempt > 0) {
            await new Promise((resolve) => setTimeout(resolve, 900));
          }

          const data = await friendsChatService.getMessages(conversationId, null);
          const items = data.results || data || [];
          const delivered = [...items].find((message) => {
            const sameContent = (message?.content || '').trim() === trimmedContent;
            const sameSender = (message?.sender_email || '').toLowerCase() === currentUserEmail;
            return sameContent && sameSender;
          });

          if (delivered) {
            setMessagesByConversation((prev) => {
              const current = prev[conversationId] || [];
              return {
                ...prev,
                [conversationId]: replaceOrAppendMessage(current, delivered),
              };
            });

            updatePendingMessages((prev) => {
              const next = { ...prev };
              delete next[tempId];
              return next;
            });

            latestMessageAtRef.current[conversationId] = delivered.created_at;
            touchConversationActivity(conversationId, delivered.created_at);
            return delivered;
          }
        }

        return null;
      };

      try {
        const saved = await friendsChatService.sendMessage(
          conversationId,
          trimmedContent,
          messageType,
          { ...metadata, client_temp_id: tempId }
        );
        setMessagesByConversation((prev) => {
          const current = prev[conversationId] || [];
          return {
            ...prev,
            [conversationId]: replaceOrAppendMessage(current, saved),
          };
        });
        updatePendingMessages((prev) => {
          const next = { ...prev };
          delete next[tempId];
          return next;
        });
        latestMessageAtRef.current[conversationId] = saved.created_at;
        touchConversationActivity(conversationId, saved.created_at);
        return { ...saved, status: 'sent' };
      } catch (error) {
        try {
          const reconciled = await tryReconcileDeliveredMessage();
          if (reconciled) {
            return { ...reconciled, status: 'sent' };
          }
        } catch {
        }

        setMessagesByConversation((prev) => {
          const current = prev[conversationId] || [];
          const next = current.map((m) => (m.id === tempId ? { ...m, status: 'failed' } : m));
          return {
            ...prev,
            [conversationId]: next,
          };
        });
        setConnectionStatus((prev) => ({
          ...prev,
          [conversationId]: 'error',
        }));
        throw error;
      }
    },
    [touchConversationActivity, updatePendingMessages]
  );

  const retryMessage = useCallback(
    async (conversationId, tempId) => {
      const pending = pendingMessagesRef.current[tempId];
      if (!pending) return;

      const trimmedContent = (pending.content || '').trim();

      setMessagesByConversation((prev) => {
        const current = prev[conversationId] || [];
        const next = current.map((m) => (m.id === tempId ? { ...m, status: 'sending' } : m));
        return {
          ...prev,
          [conversationId]: next,
        };
      });

      try {
        const saved = await friendsChatService.sendMessage(
          conversationId,
          trimmedContent,
          pending.messageType,
          { ...(pending.metadata || {}), client_temp_id: tempId }
        );
        setMessagesByConversation((prev) => {
          const current = prev[conversationId] || [];
          const existingById = current.findIndex((message) => message.id === saved.id);
          const existingByTemp = current.findIndex((message) => message.id === tempId);

          let next = [...current];
          if (existingById >= 0) {
            next[existingById] = { ...saved, status: 'sent' };
          } else if (existingByTemp >= 0) {
            next[existingByTemp] = { ...saved, status: 'sent' };
          } else {
            next.push({ ...saved, status: 'sent' });
          }

          return {
            ...prev,
            [conversationId]: next,
          };
        });
        updatePendingMessages((prev) => {
          const next = { ...prev };
          delete next[tempId];
          return next;
        });
        latestMessageAtRef.current[conversationId] = saved.created_at;
        touchConversationActivity(conversationId, saved.created_at);
        return saved;
      } catch (error) {
        setMessagesByConversation((prev) => {
          const current = prev[conversationId] || [];
          const next = current.map((m) => (m.id === tempId ? { ...m, status: 'failed' } : m));
          return {
            ...prev,
            [conversationId]: next,
          };
        });
        throw error;
      }
    },
    [touchConversationActivity, updatePendingMessages]
  );

  const toggleReaction = useCallback(async (conversationId, messageId, emoji) => {
    if (!conversationId || !messageId || !emoji) return;
    await friendsChatService.toggleReaction(messageId, emoji);
    await syncConversationMessages(conversationId);
  }, [syncConversationMessages]);

  const deleteMessageForEveryone = useCallback(async (conversationId, messageId) => {
    if (!conversationId || !messageId) return;
    await friendsChatService.deleteMessageForEveryone(messageId);
    await syncConversationMessages(conversationId);
  }, [syncConversationMessages]);

  const leaveConversation = useCallback(
    async (conversationId) => {
      await friendsChatService.leaveConversation(conversationId);
      removeConversationState({
        conversationId,
        setConversations,
        setActiveConversationId,
        setUnreadCounts,
        setMessagesByConversation,
        setMessagesLoadingByConversation,
        disconnectWebSocket,
        activeConversationIdRef,
        conversationsRef,
        lastSeenActivityRef,
        latestMessageAtRef,
      });
    },
    [disconnectWebSocket]
  );

  const deleteConversation = useCallback(
    async (conversationId) => {
      await friendsChatService.deleteConversation(conversationId);
      removeConversationState({
        conversationId,
        setConversations,
        setActiveConversationId,
        setUnreadCounts,
        setMessagesByConversation,
        setMessagesLoadingByConversation,
        disconnectWebSocket,
        activeConversationIdRef,
        conversationsRef,
        lastSeenActivityRef,
        latestMessageAtRef,
      });
    },
    [disconnectWebSocket]
  );

  const respondToInvite = useCallback(
    async (inviteId, status) => {
      const updated = await friendsChatService.respondToInvite(inviteId, status);
      setInvites((prev) => prev.map((i) => (i.id === inviteId ? updated : i)));

      if (status === 'accepted' && updated.conversation) {
        try {
          const conv = await friendsChatService.getConversation(updated.conversation);
          const normalizedConversation = normalizeConversation(conv);
          setConversations((prev) => {
            const without = prev.filter((c) => c.id !== normalizedConversation.id);
            const next = sortByActivity([normalizedConversation, ...without]);
            conversationsRef.current = next;
            return next;
          });
          await fetchInvites();
          return normalizedConversation;
        } catch {
          await fetchConversations();
          await fetchInvites();
          return null;
        }
      }

      await fetchConversations();
      await fetchInvites();
      return null;
    },
    [fetchConversations, fetchInvites, sortByActivity]
  );

  const setActiveConversation = useCallback((conversationId) => {
    setActiveConversationId(conversationId);
    activeConversationIdRef.current = conversationId || null;

    if (conversationId) {
      setUnreadCounts((prev) => {
        if (prev[conversationId] === 0) return prev;
        return {
          ...prev,
          [conversationId]: 0,
        };
      });
      const conv = conversationsRef.current.find((c) => c.id === conversationId);
      if (conv) {
        lastSeenActivityRef.current = {
          ...lastSeenActivityRef.current,
          [conversationId]: conv.updated_at,
        };
      }
    }
  }, []);

  useEffect(() => {
    if (!activeSession) {
      if (sessionTimerRef.current) {
        clearInterval(sessionTimerRef.current);
        sessionTimerRef.current = null;
      }
      return;
    }

    const updateDisplayTimer = () => {
      if (!activeSession || !activeSession.startedAt) return;
      
      const now = Date.now();
      const startedAt = new Date(activeSession.startedAt).getTime();
      const totalPausedMs = (activeSession.totalPausedDuration || 0) * 1000;
      
      let elapsedMs;
      if (activeSession.is_paused && activeSession.paused_at) {
        const pausedAt = new Date(activeSession.paused_at).getTime();
        elapsedMs = pausedAt - startedAt - totalPausedMs;
      } else {
        elapsedMs = now - startedAt - totalPausedMs;
      }

      const durationMs = (activeSession.duration || 1500) * 1000;
      const remainingMs = Math.max(0, durationMs - elapsedMs);
      const remainingSeconds = Math.ceil(remainingMs / 1000);

      if (isNaN(remainingSeconds)) return;

      setActiveSession(prev => {
        if (!prev || prev.id !== activeSession.id || prev.remaining_time === remainingSeconds) return prev;
        return {
          ...prev,
          remaining_time: remainingSeconds,
        };
      });
    };

    updateDisplayTimer();
    const interval = setInterval(updateDisplayTimer, 1000);
    sessionTimerRef.current = interval;

    return () => {
      if (interval) clearInterval(interval);
      sessionTimerRef.current = null;
    };
  }, [activeSession?.id, activeSession?.is_paused, activeSession?.started_at, activeSession?.total_paused_duration, activeSession?.paused_at, activeSession?.duration]);

  useEffect(() => {
    try {
      fetchConversations && fetchConversations();
      fetchInvites && fetchInvites();
    } catch (e) {
      console.error("fetch init failed", e);
    }
  }, [fetchConversations, fetchInvites]);

  useEffect(() => {
    
    
    return () => {};
  }, []);

  useEffect(() => {
    if (!activeConversationId) {
      return;
    }
    try {
      ensureMessages && ensureMessages(activeConversationId);
      fetchActiveSession && fetchActiveSession(activeConversationId);
    } catch (e) {
      console.error("ensureMessages failed", e);
    }
  }, [activeConversationId, ensureMessages, fetchActiveSession]);

  useEffect(() => {
    try {
      const conversationIds = new Set((conversations || []).map((conversation) => conversation.id));

      conversationIds.forEach((conversationId) => {
        connectWebSocket && connectWebSocket(conversationId);
      });

      Object.keys(socketsRef.current).forEach((conversationId) => {
        if (!conversationIds.has(conversationId)) {
          disconnectWebSocket && disconnectWebSocket(conversationId);
        }
      });

      
      connectNotificationSocket && connectNotificationSocket();
    } catch (e) {
      console.error("connectWebSocket initialization failed", e);
    }
  }, [connectWebSocket, conversations, disconnectWebSocket, connectNotificationSocket]);

  useEffect(() => {
    return () => {
      if (sessionTimerRef.current) {
        clearInterval(sessionTimerRef.current);
        sessionTimerRef.current = null;
      }
      Object.keys(socketsRef.current).forEach((id) => {
        const socket = socketsRef.current[id];
        if (socket) {
          socket.close();
        }
      });
      Object.keys(pollIntervalsRef.current).forEach((id) => {
        const intervalId = pollIntervalsRef.current[id];
        if (intervalId) {
          clearInterval(intervalId);
        }
      });
    };
  }, []);

  const pendingInvitesCount = invites.filter((i) => i.status === 'pending').length;

  const value = {
    conversations,
    conversationsLoading,
    activeConversationId,
    setActiveConversation,
    messagesByConversation,
    messagesLoadingByConversation,
    invites,
    invitesLoading,
    unreadCounts,
    connectionStatus,
    pendingMessages,
    fetchConversations,
    fetchInvites,
    createConversation,
    sendMessage,
    retryMessage,
    toggleReaction,
    deleteMessageForEveryone,
    respondToInvite,
    leaveConversation,
    deleteConversation,
    pendingInvitesCount,
    activeSession,
    sessionActionBusyByConversation,
    sendSessionControl: (conversationId, action) => {
      const socket = socketsRef.current[conversationId];
      if (sessionActionBusyByConversation[conversationId]) return;
      
      setSessionActionBusyByConversation((prev) => ({ ...prev, [conversationId]: true }));
      window.setTimeout(() => {
        setSessionActionBusyByConversation((prev) => ({ ...prev, [conversationId]: false }));
      }, 450);

      if (socket && socket.readyState === WebSocket.OPEN) {
        
        socket.send(JSON.stringify({ action }));
      }
    },
    fetchActiveSession,
  };

  try {
    return <FriendsChatContext.Provider value={value}>{children}</FriendsChatContext.Provider>;
  } catch (e) {
    console.error("FriendsChatProvider crash", e);
    return null;
  }
};

export const useFriendsChat = () => {
  const context = useContext(FriendsChatContext);
  if (!context) {
    throw new Error('useFriendsChat must be used within FriendsChatProvider');
  }
  return context;
};

export const useConversations = () => {
  const {
    conversations,
    conversationsLoading,
    activeConversationId,
    setActiveConversation,
    createConversation,
    leaveConversation,
    deleteConversation,
    unreadCounts,
    pendingInvitesCount,
  } = useFriendsChat();

  const activeConversation = conversations.find((c) => c.id === activeConversationId) || null;

  return {
    conversations,
    loading: conversationsLoading,
    activeConversation,
    setActiveConversation,
    createConversation,
    leaveConversation,
    deleteConversation,
    unreadCounts,
    pendingInvitesCount,
  };
};

export const useMessages = (conversationId) => {
  const {
    messagesByConversation,
    messagesLoadingByConversation,
    sendMessage,
    retryMessage,
    toggleReaction,
    deleteMessageForEveryone,
    connectionStatus,
    activeSession,
    sendSessionControl,
  } = useFriendsChat();

  const messages = messagesByConversation[conversationId] || [];
  const loading = messagesLoadingByConversation[conversationId] || false;
  const status = connectionStatus[conversationId] || 'idle';

  return {
    messages,
    loading,
    connectionStatus: status,
    sendMessage: (content, messageType = 'text', metadata = {}) =>
      sendMessage(conversationId, content, messageType, metadata),
    retryMessage: (tempId) => retryMessage(conversationId, tempId),
    toggleReaction: (messageId, emoji) => toggleReaction(conversationId, messageId, emoji),
    deleteMessageForEveryone: (messageId) => deleteMessageForEveryone(conversationId, messageId),
    studySession: activeSession,
    startStudySession: () => sendSessionControl(conversationId, 'start'),
    pauseStudySession: () => sendSessionControl(conversationId, 'pause'),
    resumeStudySession: () => sendSessionControl(conversationId, 'resume'),
    endStudySession: () => sendSessionControl(conversationId, 'end'),
  };
};

export const useInvites = () => {
  const { invites, invitesLoading, respondToInvite, pendingInvitesCount } = useFriendsChat();

  return {
    invites,
    loading: invitesLoading,
    respondToInvite,
    pendingInvitesCount,
  };
};
