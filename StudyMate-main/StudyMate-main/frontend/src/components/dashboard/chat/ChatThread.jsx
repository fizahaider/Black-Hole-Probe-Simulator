import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { useFriendsChat, useMessages } from '../../../hooks/useFriendsChat';
import { useToast } from '../../../context/ToastContext';
import friendsChatService from '../../../services/friendsChatService';
import { parseApiError } from '../../../utils/errorHelpers';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, MoreHorizontal, UserPlus, ArrowDown, Send, X, LogOut, Trash2, UserMinus, Paperclip, FileText, Smile, Clock, Play, Pause, Square } from 'lucide-react';

class ChatErrorBoundary extends React.Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error("ChatThread Error:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center bg-[var(--bg-base)] p-6">
          <p className="text-[var(--text-muted)] text-sm mb-2">Chat failed to load.</p>
          <button 
             onClick={() => this.setState({ hasError: false })}
             className="px-4 py-2 border border-[var(--border)] rounded-[var(--radius-sm)] text-xs"
          >
             Try Again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const StudySessionHeader = ({ session, displayRemaining, onPause, onResume, onEnd, controlsDisabled }) => {
    const formatTimer = (seconds) => {
        if (!seconds || isNaN(seconds)) return "00:00";
        const total = Math.max(0, Math.floor(seconds));
        const hrs = Math.floor(total / 3600);
        const mins = Math.floor((total % 3600) / 60);
        const secs = total % 60;
        return hrs > 0
            ? `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
            : `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-[var(--bg-base)] border-b border-[var(--border)] px-5 py-3 flex items-center justify-between z-30 shadow-sm"
        >
            <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-blue-600/15 flex items-center justify-center text-blue-600 shrink-0">
                    <motion.div
                        animate={session.status === 'paused' ? {} : { scale: [1, 1.1, 1] }}
                        transition={{ repeat: Infinity, duration: 2 }}
                    >
                        <Clock size={20} />
                    </motion.div>
                </div>
                <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] text-[var(--text-muted)] font-black uppercase tracking-widest">Study Session</span>
                        {session.status === 'paused' && (
                            <span className="px-1.5 py-0.5 rounded bg-[var(--danger-subtle)] text-[var(--danger)] text-[9px] font-black uppercase">Paused</span>
                        )}
                    </div>
                    <span className="text-xl font-mono font-bold text-[var(--text-primary)] tabular-nums leading-none mt-1">
                        {formatTimer(session?.remaining_time ?? displayRemaining)}
                    </span>
                    <span className="text-[10px] text-[var(--text-muted)] mt-0.5">
                        {session?.isBreak ? 'Break' : 'Focus'} • Cycle {session?.cycle || 1}/4
                    </span>
                </div>
            </div>

            <div className="flex items-center gap-2">
                {session.status === 'paused' ? (
                    <button
                        onClick={onResume}
                        disabled={controlsDisabled}
                        className="px-4 py-2 rounded-[var(--radius-sm)] bg-[var(--accent)] text-white text-xs font-bold hover:bg-[var(--accent-hover)] transition-all shadow-sm active:scale-95 flex items-center gap-2"
                    >
                        <Play size={14} fill="currentColor" />
                        Resume
                    </button>
                ) : (
                    <button
                        onClick={onPause}
                        disabled={controlsDisabled}
                        className="px-4 py-2 rounded-[var(--radius-sm)] bg-[var(--bg-surface)] border border-[var(--border)] text-[var(--text-primary)] text-xs font-bold hover:bg-[var(--bg-elevated)] transition-all shadow-sm active:scale-95 flex items-center gap-2"
                    >
                        <Pause size={14} fill="currentColor" />
                        Pause
                    </button>
                )}
                <button
                    onClick={onEnd}
                    disabled={controlsDisabled}
                    className="px-4 py-2 rounded-[var(--radius-sm)] bg-[var(--danger-subtle)] border border-[var(--danger-subtle)] text-[var(--danger)] text-xs font-bold hover:bg-[var(--danger)] hover:text-white transition-all shadow-sm active:scale-95 flex items-center gap-2"
                >
                    <Square size={12} fill="currentColor" />
                    End
                </button>
            </div>
        </motion.div>
    );
};

const ChatThreadComponent = ({ conversation, onLeaveConversation, onDeleteConversation }) => {
  const { user } = useAuth();
  const { 
    messages, 
    loading, 
    sendMessage, 
    retryMessage, 
    toggleReaction, 
    deleteMessageForEveryone, 
    connectionStatus,
    studySession,
    startStudySession,
    pauseStudySession,
    resumeStudySession,
    endStudySession
  } = useMessages(conversation?.id);
  const { sessionActionBusyByConversation } = useFriendsChat();
  const { showToast } = useToast();
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDeleteConfirming, setIsDeleteConfirming] = useState(false);
  const [isParticipantsOpen, setIsParticipantsOpen] = useState(false);
  const [participants, setParticipants] = useState(conversation.participants || []);
  const [participantsLoading, setParticipantsLoading] = useState(false);
  const [updatingParticipantId, setUpdatingParticipantId] = useState(null);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [activeReactionMessageId, setActiveReactionMessageId] = useState(null);
  const fileInputRef = useRef(null);
  const emojiPickerRef = useRef(null);
  const timerRef = useRef(null);
  const quickEmojis = ['👍', '❤️', '😂', '🎉', '😮', '😢'];
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  const textareaRef = useRef(null);

  const allEmojis = [
    '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙',
    '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥',
    '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮', '🤧', '🥵', '🥶', '🥴', '😵', '🤯', '🤠', '🥳', '😎', '🤓',
    '🧐', '😕', '😟', '🙁', '☹️', '😮', '😯', '😲', '😳', '🥺', '😦', '😧', '😨', '😰', '😥', '😢', '😭', '😱', '😖', '😣',
    '😞', '😓', '😩', '😫', '🥱', '😤', '😡', '😠', '🤬', '😈', '👿', '💀', '☠️', '💩', '🤡', '👹', '👺', '👻', '👽', '👾',
    '🤖', '😺', '😸', '😹', '😻', '😼', '😽', '🙀', '😿', '😾', '🙈', '🙉', '🙊', '💋', '💌', '💘', '💝', '💖', '💗', '💓',
    '💞', '💕', '💟', '❣️', '💔', '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💯', '💢', '💥', '💫', '💦', '💨',
    '🕳️', '💣', '💬', '👁️‍🗨️', '🗨️', '🗯️', '💭', '💤', '👋', '🤚', '🖐️', '✋', '🖖', '👌', '🤏', '✌️', '🤞', '🤟', '🤘', '🤙',
    '👈', '👉', '👆', '🖕', '👇', '☝️', '👍', '👎', '✊', '👊', '🤛', '🤜', '👏', '🙌', '👐', '🤲', '🤝', '🙏', '✍️', '💅',
    '🤳', '💪', '🦾', '🦵', '🦿', '👣', '👂', '🦻', '👃', '🧠', '🦷', '🦴', '👀', '👁️', '👅', '👄', '👶', '🧒', '👦', '👧'
  ];

  const handleEmojiSelect = (emoji) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = inputText;
    const before = text.substring(0, start);
    const after = text.substring(end, text.length);

    const newText = before + emoji + after;
    setInputText(newText);
    
    // Reset focus and cursor position after state update
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + emoji.length, start + emoji.length);
    }, 0);
  };

  const scrollRef = useRef(null);
  const lastMessageId = useRef(null);

  const isAdmin =
    conversation.user === user?.id ||
    conversation.participants?.find((p) => p.user === user?.id)?.role === 'admin';

  const isOwner = conversation.user === user?.id;

  useEffect(() => {
    setParticipants(conversation.participants || []);
  }, [conversation.id, conversation.participants]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isEmojiPickerOpen && emojiPickerRef.current && !emojiPickerRef.current.contains(event.target)) {
        setIsEmojiPickerOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isEmojiPickerOpen]);

  useEffect(() => {
    if (!isAddMemberOpen) return;
    const timer = setTimeout(async () => {
      if (searchQuery.length >= 2) {
        setIsSearching(true);
        try {
          const data = await friendsChatService.searchUsers(searchQuery);
          const participantEmails = new Set(participants?.map((p) => p.user_email));
          const filtered = data.filter((u) => !participantEmails.has(u.email));
          setSearchResults(filtered);
        } catch (err) {
          console.error(err);
        } finally {
          setIsSearching(false);
        }
      } else {
        setSearchResults([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, isAddMemberOpen, participants]);

  const handleAddMember = async (targetUser) => {
    try {
      await friendsChatService.createInvite(conversation.id, targetUser.email);
      showToast(`Invite sent to ${targetUser.name}`, 'success');
      setSearchQuery('');
      setSearchResults([]);
      setIsAddMemberOpen(false);
      await refreshParticipants();
    } catch (err) {
      showToast(err.message || 'Failed to send invite', 'error');
    }
  };

  const refreshParticipants = async () => {
    try {
      setParticipantsLoading(true);
      const data = await friendsChatService.getParticipants(conversation.id);
      setParticipants(data || []);
    } catch (err) {
      showToast(err.message || 'Failed to load participants', 'error');
    } finally {
      setParticipantsLoading(false);
    }
  };

  const handleOpenParticipants = async () => {
    setIsParticipantsOpen(true);
    await refreshParticipants();
  };

  const handleRemoveParticipant = async (participant) => {
    if (!participant?.user) return;
    try {
      setUpdatingParticipantId(participant.user);
      await friendsChatService.removeParticipant(conversation.id, participant.user);
      await refreshParticipants();
      showToast(`${participant.user_name || participant.user_email} removed`, 'success');
    } catch (err) {
      showToast(parseApiError(err), 'error');
    } finally {
      setUpdatingParticipantId(null);
    }
  };

  const handleRoleUpdate = async (participant, nextRole) => {
    if (!participant?.user || !nextRole || participant.role === nextRole) return;
    try {
      setUpdatingParticipantId(participant.user);
      await friendsChatService.updateParticipantRole(conversation.id, participant.user, nextRole);
      await refreshParticipants();
      showToast('Participant role updated', 'success');
    } catch (err) {
      showToast(parseApiError(err), 'error');
    } finally {
      setUpdatingParticipantId(null);
    }
  };

  const handleFileSelection = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setSelectedFiles((prev) => [...prev, ...files].slice(0, 5));
    e.target.value = '';
  };

  const removeSelectedFile = (name) => {
    setSelectedFiles((prev) => prev.filter((file) => file.name !== name));
  };

  const [showNewMessagePill, setShowNewMessagePill] = useState(false);
  const [clearedAt, setClearedAt] = useState(() => localStorage.getItem(`chat_cleared_${conversation.id}`));

  useEffect(() => {
    setClearedAt(localStorage.getItem(`chat_cleared_${conversation.id}`));
  }, [conversation.id]);

  const handleClearChat = () => {
    const now = new Date().toISOString();
    localStorage.setItem(`chat_cleared_${conversation.id}`, now);
    setClearedAt(now);
    setIsMenuOpen(false);
    showToast('Chat cleared for you', 'success');
  };

  const safeMessages = (messages || []).filter(msg => {
    if (!clearedAt) return true;
    return new Date(msg.created_at) > new Date(clearedAt);
  });

  const isAtBottom = () => {
    const el = scrollRef.current;
    if (!el) return true;
    const threshold = 150;
    return el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
  };

  const scrollToBottom = (behavior = 'smooth') => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior,
      });
    }
    setShowNewMessagePill(false);
  };

  useEffect(() => {
    if (safeMessages.length === 0) return;
    const latestMsg = safeMessages[safeMessages.length - 1];
    const isNewMessage = latestMsg.id !== lastMessageId.current;

    if (isNewMessage) {
      if (isAtBottom()) {
        scrollToBottom(safeMessages.length < 20 ? 'auto' : 'smooth');
      } else {
        setShowNewMessagePill(true);
      }
      lastMessageId.current = latestMsg.id;
    }
  }, [safeMessages]);

  const handleScroll = () => {
    if (isAtBottom()) {
      setShowNewMessagePill(false);
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if ((!inputText.trim() && selectedFiles.length === 0) || isSending) return;

    const outgoingText = inputText.trim();
    setInputText('');

    setIsSending(true);
    try {
      let attachmentDocumentIds = [];
      if (selectedFiles.length > 0) {
        const uploadedDocuments = await Promise.all(
          selectedFiles.map((file) => friendsChatService.uploadAttachmentDocument(file))
        );
        attachmentDocumentIds = uploadedDocuments
          .map((document) => document?.id)
          .filter(Boolean);
      }

      const finalText =
        outgoingText || (selectedFiles.length > 0 ? `Shared ${selectedFiles.length} attachment(s)` : '');
      const messageType = attachmentDocumentIds.length > 0 ? 'file' : 'text';
      await sendMessage(finalText, messageType, { attachment_document_ids: attachmentDocumentIds });
      setSelectedFiles([]);
    } catch (err) {
      console.error('Failed to send msg', err);
      showToast(parseApiError(err), 'error');
    } finally {
      setIsSending(false);
    }
  };

  const formatTime = (isoString) => {
    const d = new Date(isoString);
    return isNaN(d) ? '' : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const isMessageDeleted = (message) => Boolean(message?.metadata?.deleted_for_everyone);

  const getReactionSummary = (message) => {
    const reactions = message?.metadata?.reactions || {};
    return Object.entries(reactions)
      .map(([emoji, users]) => ({ emoji, count: Array.isArray(users) ? users.length : 0 }))
      .filter((entry) => entry.count > 0);
  };

  const handleToggleReaction = async (messageId, emoji) => {
    try {
      await toggleReaction(messageId, emoji);
    } catch (error) {
      showToast(parseApiError(error), 'error');
    } finally {
      setActiveReactionMessageId(null);
    }
  };

  const handleDeleteForEveryone = async (messageId) => {
    try {
      await deleteMessageForEveryone(messageId);
      showToast('Message deleted for everyone', 'success');
    } catch (error) {
      showToast(parseApiError(error), 'error');
    }
  };

  const handleOpenAttachment = async (attachment) => {
    if (!attachment?.id) return;
    try {
      const blob = await friendsChatService.downloadAttachment(attachment.id);
      const blobUrl = window.URL.createObjectURL(blob);
      window.open(blobUrl, '_blank', 'noopener,noreferrer');
      window.setTimeout(() => window.URL.revokeObjectURL(blobUrl), 60000);
    } catch (error) {
      showToast(parseApiError(error), 'error');
    }
  };

  const handleLeaveConversation = async () => {
    if (!conversation?.id || !onLeaveConversation) return;

    try {
      await onLeaveConversation(conversation.id);
      showToast('You left the conversation', 'success');
    } catch (error) {
      showToast(parseApiError(error), 'error');
    }
  };

  const handleDeleteConversation = async () => {
    if (!conversation?.id || !onDeleteConversation) return;

    try {
      await onDeleteConversation(conversation.id);
      showToast('Conversation deleted', 'success');
    } catch (error) {
      showToast(parseApiError(error), 'error');
    }
  };


  if (!conversation) return null;

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[var(--bg-base)] mt-0 pt-0 gap-0">
      <div className="h-[52px] px-5 py-0 border-b border-[var(--border)] flex items-center justify-between shrink-0 bg-[var(--bg-base)] z-40">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <div className="w-8 h-8 rounded-full flex items-center justify-center bg-[var(--bg-elevated)] text-[var(--text-secondary)] shrink-0">
            <span className="text-caption font-semibold">{conversation.title?.charAt(0).toUpperCase() || '#'}</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-subhead text-[var(--text-primary)] truncate">
                {conversation.title}
              </h2>
            </div>
            <div className="flex items-center gap-3 mt-0.5">
              <div className="inline-flex items-center gap-1 text-caption text-[var(--text-muted)]">
                <Users size={14} />
                <span>{participants?.length || 0}</span>
              </div>
              <div className="flex items-center gap-2 text-caption text-[var(--text-muted)] ml-auto">
                {connectionStatus === 'connected' && (
                  <span>Live</span>
                )}
                {connectionStatus === 'connecting' && (
                  <span>Connecting…</span>
                )}
                {connectionStatus === 'polling' && (
                  <span>Live (fallback)</span>
                )}
                {(connectionStatus === 'disconnected' || connectionStatus === 'error') && (
                  <span className="text-[var(--danger)]">Offline</span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 ml-4 relative">
          {!studySession && (
              <button
                onClick={startStudySession}
                disabled={sessionActionBusyByConversation[conversation?.id]}
                className="group p-2 rounded-[var(--radius-sm)] text-[#a29bfe] hover:bg-[#a29bfe]/10 transition-colors flex flex-col items-center"
                title="Start Study Session"
              >
                <Clock size={16} />
                <span className="mt-0.5 text-[9px] font-bold leading-none">Study Session</span>
              </button>
          )}

          {conversation.is_group && (
            <button
              onClick={handleOpenParticipants}
              className="p-2 rounded-[var(--radius-sm)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]"
              title="Manage participants"
            >
              <Users size={16} />
            </button>
          )}
          {conversation.is_group && isAdmin && (
            <button
              onClick={() => setIsAddMemberOpen(true)}
              className="p-2 rounded-[var(--radius-sm)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]"
            >
              <UserPlus size={16} />
            </button>
          )}

          <button
            onClick={() => {
              setIsMenuOpen((prev) => !prev);
              setIsDeleteConfirming(false);
            }}
            className="p-2 rounded-[var(--radius-sm)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]"
          >
            <MoreHorizontal size={18} />
          </button>
          {isMenuOpen && (
            <div className="absolute right-0 top-full mt-1 min-w-[180px] bg-[var(--bg-surface)] border border-[var(--border)] rounded-[var(--radius-sm)] shadow-[var(--shadow-md)] z-50 overflow-hidden">
              {!isDeleteConfirming ? (
                <>
                  {conversation.is_group && isAdmin && (
                    <button
                      onClick={() => {
                        setIsAddMemberOpen(true);
                        setIsMenuOpen(false);
                      }}
                      className="w-full px-4 py-2.5 text-body text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] flex items-center gap-3"
                    >
                      <UserPlus size={15} />
                      <span>Add Member</span>
                    </button>
                  )}
                  {conversation.is_group && (
                    <button
                      onClick={() => {
                        handleOpenParticipants();
                        setIsMenuOpen(false);
                      }}
                      className="w-full px-4 py-2.5 text-body text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] flex items-center gap-3"
                    >
                      <Users size={15} />
                      <span>Manage Participants</span>
                    </button>
                  )}
                  {!isOwner && (
                    <button
                      onClick={handleLeaveConversation}
                      className="w-full px-4 py-2.5 text-body text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] flex items-center gap-3"
                    >
                      <LogOut size={15} />
                      <span>Leave Conversation</span>
                    </button>
                  )}
                    {isOwner && (
                      <button
                        onClick={() => setIsDeleteConfirming(true)}
                        className="w-full px-4 py-2.5 text-body text-[var(--danger)] hover:bg-[var(--bg-elevated)] flex items-center gap-3"
                      >
                        <Trash2 size={15} />
                        <span>Delete Conversation</span>
                      </button>
                    )}
                  <button
                    onClick={handleClearChat}
                    className="w-full px-4 py-2.5 text-body text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] flex items-center gap-3"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /></svg>
                    <span>Clear Chat</span>
                  </button>
                </>
              ) : (
                <div className="p-2 flex gap-2">
                  <button
                    onClick={handleDeleteConversation}
                    className="flex-1 px-3 py-2 text-caption rounded-[var(--radius-sm)] bg-[var(--danger)] !text-white font-bold"
                  >
                    Confirm Delete
                  </button>
                  <button
                    onClick={() => setIsDeleteConfirming(false)}
                    className="flex-1 px-3 py-2 text-caption rounded-[var(--radius-sm)] text-[var(--text-muted)] hover:bg-[var(--bg-elevated)]"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {studySession && (
            <StudySessionHeader 
                session={studySession}
                onPause={pauseStudySession}
                onResume={resumeStudySession}
                onEnd={endStudySession}
                controlsDisabled={sessionActionBusyByConversation[conversation?.id]}
            />
        )}
      </AnimatePresence>

            {isAddMemberOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[rgba(0,0,0,0.5)] backdrop-blur-[4px] p-4">
                    <div
                        className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-[var(--radius-lg)] w-full max-w-md shadow-[var(--shadow-md)] relative overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="px-6 py-5 border-b border-[var(--border)] flex justify-between items-center">
                            <h2 className="text-heading text-[var(--text-primary)]">Add Members</h2>
                            <button
                                onClick={() => setIsAddMemberOpen(false)}
                                className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-2 rounded-[var(--radius-sm)] hover:bg-[var(--bg-elevated)] transition-all"
                            >
                                <X size={16} />
                            </button>
                        </div>
                        <div className="p-6">
                            <div className="relative">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">
                                    {isSearching ? (
                                        <div className="w-4 h-4 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin"></div>
                                    ) : (
                                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                                    )}
                                </div>
                                <input
                                    type="text"
                                    autoFocus
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search users to invite..."
                                    className="input-field w-full pl-11"
                                />
                            </div>

                            <div className="mt-4 max-h-60 overflow-y-auto custom-scrollbar space-y-1">
                                {searchResults.map(user => (
                                    <button
                                        key={user.id}
                                        onClick={() => handleAddMember(user)}
                                        className="w-full px-4 py-3 flex items-center gap-3 hover:bg-[var(--bg-elevated)] transition-colors text-left rounded-[var(--radius-sm)] group"
                                    >
                                        <div className="w-9 h-9 rounded-full bg-[var(--bg-elevated)] flex items-center justify-center text-xs font-bold text-[var(--text-primary)] shrink-0 transition-colors">
                                            {user.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="text-body font-medium text-[var(--text-primary)] truncate">{user.name}</div>
                                            <div className="text-caption text-[var(--text-muted)] truncate">{user.email}</div>
                                        </div>
                                        <svg className="w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                                    </button>
                                ))}
                                {searchQuery.length >= 2 && !isSearching && searchResults.length === 0 && (
                                    <div className="py-8 text-center text-xs text-[var(--text-muted)]">
                                        No users found matching "{searchQuery}"
                                    </div>
                                )}
                                {searchQuery.length < 2 && (
                                    <div className="py-8 text-center text-xs text-[var(--text-muted)] italic">
                                        Start typing to search...
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {isParticipantsOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[rgba(0,0,0,0.5)] backdrop-blur-[4px] p-4">
                    <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-[var(--radius-lg)] w-full max-w-lg shadow-[var(--shadow-md)] relative overflow-hidden">
                        <div className="px-6 py-5 border-b border-[var(--border)] flex justify-between items-center">
                            <h2 className="text-heading text-[var(--text-primary)]">Participants</h2>
                            <button
                                onClick={() => setIsParticipantsOpen(false)}
                                className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-2 rounded-[var(--radius-sm)] hover:bg-[var(--bg-elevated)] transition-all"
                            >
                                <X size={16} />
                            </button>
                        </div>
                        <div className="p-4 max-h-[60vh] overflow-y-auto space-y-2">
                            {participantsLoading ? (
                                <p className="text-caption text-[var(--text-muted)] px-2 py-6 text-center">Loading participants...</p>
                            ) : participants.length === 0 ? (
                                <p className="text-caption text-[var(--text-muted)] px-2 py-6 text-center">No participants found.</p>
                            ) : (
                                participants.map((participant) => {
                                    const isSelf = participant.user === user?.id;
                                    const isConversationOwner = conversation.user === participant.user;
                                    const canEditRole = isAdmin && !isConversationOwner;
                                    const canRemove = isAdmin && !isConversationOwner;
                                    const rowBusy = updatingParticipantId === participant.user;
                                    return (
                                        <div key={participant.id} className="border border-[var(--border)] rounded-[var(--radius-sm)] px-3 py-2.5 flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-full bg-[var(--bg-elevated)] flex items-center justify-center text-xs font-bold text-[var(--text-primary)] shrink-0">
                                                {(participant.user_name || participant.user_email || '?').charAt(0).toUpperCase()}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-body text-[var(--text-primary)] truncate">
                                                    {participant.user_name || participant.user_email}
                                                    {isSelf ? ' (You)' : ''}
                                                </p>
                                                <p className="text-caption text-[var(--text-muted)] truncate">{participant.user_email}</p>
                                            </div>
                                            {canEditRole ? (
                                                <select
                                                    value={participant.role}
                                                    disabled={rowBusy}
                                                    onChange={(e) => handleRoleUpdate(participant, e.target.value)}
                                                    className="bg-[var(--bg-base)] border border-[var(--border)] rounded-[var(--radius-sm)] px-2 py-1 text-caption text-[var(--text-primary)]"
                                                >
                                                    <option value="admin">Admin</option>
                                                    <option value="member">Member</option>
                                                    <option value="guest">Guest</option>
                                                </select>
                                            ) : (
                                                <span className="text-caption text-[var(--text-secondary)] capitalize px-2 py-1">{participant.role}</span>
                                            )}
                                            {canRemove && (
                                                <button
                                                    disabled={rowBusy}
                                                    onClick={() => handleRemoveParticipant(participant)}
                                                    className="p-2 rounded-[var(--radius-sm)] text-[var(--danger)] hover:bg-[color:rgba(239,68,68,0.1)] disabled:opacity-50"
                                                    title="Remove participant"
                                                >
                                                    <UserMinus size={15} />
                                                </button>
                                            )}
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>
            )}

            <div
                ref={scrollRef}
                onScroll={handleScroll}
                className="flex-1 overflow-y-auto px-5 py-4 space-y-3 relative custom-scrollbar scroll-smooth"
            >
                {/* New Messages Pill */}
                <AnimatePresence>
                    {showNewMessagePill && (
                        <motion.button
                            initial={{ opacity: 0, y: 10, x: '-50%' }}
                            animate={{ opacity: 1, y: 0, x: '-50%' }}
                            exit={{ opacity: 0, scale: 0.9, x: '-50%' }}
                            onClick={() => scrollToBottom()}
                            className="fixed right-5 bottom-24 z-50 bg-[var(--accent)] text-white px-3.5 py-1.5 rounded-full inline-flex items-center gap-2 text-caption font-medium hover:bg-[var(--accent-hover)] shadow-lg"
                        >
                            <ArrowDown size={12} />
                            New Messages
                        </motion.button>
                    )}
                </AnimatePresence>

                {loading && safeMessages.length === 0 ? (
                    <div className="space-y-6 animate-pulse p-4">
                        {[1, 2, 3].map(i => (
                            <div key={i} className={`flex flex-col ${i % 2 === 0 ? 'items-end' : 'items-start'}`}>
                                <div className="w-24 h-3 bg-[var(--bg-elevated)] rounded-full mb-2"></div>
                                <div className={`h-16 bg-[var(--bg-elevated)] rounded-2xl ${i % 2 === 0 ? 'w-2/3' : 'w-1/2'}`}></div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <>
                        <div className="text-center my-8">
                            <span className="bg-[var(--bg-elevated)] text-[var(--text-muted)] text-[10px] uppercase font-bold tracking-[0.2em] px-4 py-2 rounded-full border border-[var(--border)] shadow-sm">
                                Conversation started • {new Date(conversation.created_at).toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' })}
                            </span>
                        </div>

                        {safeMessages.map((msg, idx) => {
                             if (msg.role === 'system' || msg.message_type === 'system') {
                                 return (
                                     <div key={msg.id || idx} className="flex justify-center my-6">
                                         <span className="px-4 py-1.5 rounded-full bg-[var(--bg-elevated)] text-[var(--text-muted)] text-[10px] font-black uppercase tracking-widest border border-[var(--border)] shadow-sm">
                                             {msg.content}
                                         </span>
                                     </div>
                                 );
                             }

                             const isMine = msg.sender_email === user?.email || msg.status === 'sending' || msg.status === 'failed';
                            const isAI = msg.message_type === 'ai';
                            const isFailed = msg.status === 'failed';
                            const isSending = msg.status === 'sending';
                            const isDeleted = isMessageDeleted(msg) || msg.content === 'This message was deleted';
                            const canDeleteForEveryone = !isDeleted && msg?.id && isMine;
                            const reactionSummary = getReactionSummary(msg);

                            let alignStr = isMine ? 'items-end' : 'items-start';

                            return (
                                <div key={msg.id || idx} className={`flex flex-col w-full ${alignStr} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                                    {!isMine && (
                                        <div className="flex items-center gap-2 mb-1.5 pl-1">
                                            <div className="w-6 h-6 rounded-lg bg-[var(--bg-elevated)] flex items-center justify-center text-[10px] font-black text-[var(--text-secondary)] border border-[var(--border)] shadow-sm">
                                                {(isAI ? 'A' : (msg.sender_name || msg.sender_email || 'S'))?.charAt(0).toUpperCase()}
                                            </div>
                                            <span className="text-[11px] text-[var(--text-muted)] font-bold tracking-tight">
                                                {isAI ? 'Assistant' : (msg.sender_name || msg.sender_email?.split('@')[0] || 'User')}
                                            </span>
                                        </div>
                                    )}

                                <div className={`flex items-end gap-3 max-w-[85%] group ${isMine ? 'flex-row-reverse' : 'flex-row'}`}>
                                <div className={`relative px-4 py-2.5 leading-relaxed text-body transition-all ${isMine ? 'bg-[var(--accent)] text-white rounded-[var(--radius-lg)] rounded-br-[4px]' : 'bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--border)] rounded-[var(--radius-lg)] rounded-bl-[4px]'} ${isSending ? 'opacity-70 saturate-50' : ''}`}>
                                            <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                                            {!isDeleted && Array.isArray(msg.attachments) && msg.attachments.length > 0 && (
                                                <div className="mt-2 space-y-1.5">
                                                    {msg.attachments.map((attachment) => (
                                                        <button
                                                            key={attachment.id}
                                                            type="button"
                                                            onClick={() => handleOpenAttachment(attachment)}
                                                            className={`rounded-[var(--radius-sm)] px-2.5 py-1.5 border ${isMine ? 'border-white/40 bg-white/10' : 'border-[var(--border)] bg-[var(--bg-elevated)]'}`}
                                                        >
                                                            <div className="flex items-center gap-2">
                                                                <FileText size={14} />
                                                                <span className="text-caption truncate font-medium">
                                                                    {attachment.document_title || 'Attachment'}
                                                                </span>
                                                            </div>
                                                            <p className={`text-[10px] mt-0.5 ${isMine ? 'text-white/80' : 'text-[var(--text-muted)]'}`}>
                                                                {attachment.mime_type} • {Math.max(1, Math.round((attachment.file_size || 0) / 1024))} KB
                                                            </p>
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                            {!isDeleted && reactionSummary.length > 0 && (
                                                <div className="mt-2 flex flex-wrap gap-1.5">
                                                    {reactionSummary.map((entry) => (
                                                        <button
                                                            key={`${msg.id}-${entry.emoji}`}
                                                            type="button"
                                                            onClick={() => handleToggleReaction(msg.id, entry.emoji)}
                                                            className={`text-[11px] px-2 py-0.5 rounded-full border ${isMine ? 'border-white/40 bg-white/10' : 'border-[var(--border)] bg-[var(--bg-elevated)]'}`}
                                                        >
                                                            {entry.emoji} {entry.count}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}

                                            <div className="flex items-center justify-end gap-1.5 mt-1.5">
                                                <span className="text-caption text-[var(--text-muted)]">
                                                    {formatTime(msg.created_at)}
                                                </span>
                                                {isMine && (
                                                    <div className="flex items-center shadow-sm">
                                                        {isSending ? (
                                                            <div className="w-2.5 h-2.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                                        ) : isFailed ? (
                                                            <svg className="w-3 h-3 text-[var(--danger)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                                                        ) : (
                                                            <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {isMine && isFailed && (
                                            <button
                                                onClick={() => retryMessage(msg.id)}
                                                className="p-2.5 rounded-xl bg-[color:rgba(239,68,68,0.1)] text-[var(--danger)] hover:bg-[color:rgba(239,68,68,0.2)] border border-[color:rgba(239,68,68,0.3)] active:scale-90 transition-all shadow-lg shadow-red-500/10"
                                                title="Retry Sending"
                                            >
                                                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M21 2v6h-6" /><path d="M3 12a9 9 0 0 1 15-6.7L21 8" /><path d="M3 22v-6h6" /><path d="M21 12a9 9 0 0 1-15 6.7L3 16" /></svg>
                                            </button>
                                        )}
                                    </div>
                                    {isMine && isFailed && (
                                        <span className="text-[10px] text-[var(--danger)] mt-2 mr-2 font-black uppercase tracking-wider">Failed to send</span>
                                    )}
                                    {!isDeleted && (
                                        <div className={`mt-1 flex items-center gap-1 ${isMine ? 'mr-2 justify-end' : 'ml-2 justify-start'}`}>
                                            {msg?.id && (
                                                <div className="relative">
                                                    <button
                                                        type="button"
                                                        onClick={() => setActiveReactionMessageId((prev) => (prev === msg.id ? null : msg.id))}
                                                        className="p-1 rounded-[var(--radius-sm)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]"
                                                        title="React"
                                                    >
                                                        <Smile size={13} />
                                                    </button>
                                                    {activeReactionMessageId === msg.id && (
                                                        <div className="absolute z-20 mt-1 p-1.5 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--bg-surface)] shadow-[var(--shadow-md)] flex items-center gap-1">
                                                            {quickEmojis.map((emoji) => (
                                                                <button
                                                                    key={`${msg.id}-${emoji}`}
                                                                    type="button"
                                                                    onClick={() => handleToggleReaction(msg.id, emoji)}
                                                                    className="text-sm hover:scale-110 transition-transform"
                                                                >
                                                                    {emoji}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                            {canDeleteForEveryone && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleDeleteForEveryone(msg.id)}
                                                    className="p-1 rounded-[var(--radius-sm)] text-[var(--danger)] hover:bg-[color:rgba(239,68,68,0.1)]"
                                                    title="Delete for everyone"
                                                >
                                                    <Trash2 size={13} />
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </>
                )}
            </div>

            <div className="px-5 py-3 border-t border-[var(--border)] shrink-0 bg-[var(--bg-base)]">
                <form onSubmit={handleSend} className="flex gap-2 items-end relative">
                    <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        className="hidden"
                        onChange={handleFileSelection}
                    />
                    <button
                        type="button"
                        onClick={() => setIsEmojiPickerOpen(!isEmojiPickerOpen)}
                        className={`w-9 h-9 flex items-center justify-center rounded-[var(--radius-sm)] border border-[var(--border)] transition-all shrink-0 ${isEmojiPickerOpen ? 'text-[var(--accent)] bg-[var(--bg-elevated)] border-[var(--accent)]' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]'}`}
                        title="Add emoji"
                    >
                        <Smile size={16} />
                    </button>

                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="w-9 h-9 flex items-center justify-center rounded-[var(--radius-sm)] border border-[var(--border)] transition-all shrink-0 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]"
                        title="Attach file"
                    >
                        <Paperclip size={16} />
                    </button>

                    {isEmojiPickerOpen && (
                        <div ref={emojiPickerRef} className="absolute bottom-full left-0 mb-2 w-72 bg-[var(--bg-surface)] border border-[var(--border)] rounded-[var(--radius-md)] shadow-[var(--shadow-lg)] z-[60] overflow-hidden">
                            <div className="p-2 border-b border-[var(--border)] bg-[var(--bg-elevated)] flex justify-between items-center">
                                <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] px-1">Choose Emoji</span>
                                <button onClick={() => setIsEmojiPickerOpen(false)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                                    <X size={12} />
                                </button>
                            </div>
                            <div className="p-2 max-h-48 overflow-y-auto grid grid-cols-8 gap-1 custom-scrollbar">
                                {allEmojis.map((emoji, index) => (
                                    <button
                                        key={index}
                                        type="button"
                                        onClick={() => handleEmojiSelect(emoji)}
                                        className="text-xl p-1 hover:bg-[var(--bg-elevated)] rounded transition-colors"
                                    >
                                        {emoji}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="flex-1 border border-[var(--border)] rounded-[var(--radius-sm)] overflow-hidden focus-within:border-[var(--accent)] transition-all bg-[var(--bg-surface)]">
                        {selectedFiles.length > 0 && (
                            <div className="px-2 pt-2 flex flex-wrap gap-1.5 border-b border-[var(--border)]">
                                {selectedFiles.map((file) => (
                                    <button
                                        type="button"
                                        key={`${file.name}-${file.size}`}
                                        onClick={() => removeSelectedFile(file.name)}
                                        className="inline-flex items-center gap-1 px-2 py-0.5 mb-1 rounded-full text-[10px] border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]"
                                        title="Remove attachment"
                                    >
                                        <FileText size={10} />
                                        <span className="max-w-[160px] truncate">{file.name}</span>
                                        <X size={10} />
                                    </button>
                                ))}
                            </div>
                        )}
                        <textarea
                            ref={textareaRef}
                            value={inputText}
                            disabled={isSending}
                            onChange={(e) => setInputText(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSend(e);
                                }
                            }}
                            placeholder={isSending ? "Sending message..." : "Type your message..."}
                            className="w-full text-[var(--text-primary)] px-3 py-2 min-h-[40px] max-h-[120px] focus:outline-none resize-none text-body placeholder:text-[var(--text-muted)] disabled:opacity-50"
                            rows={1}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={(!inputText.trim() && selectedFiles.length === 0) || isSending}
                        className={`w-9 h-9 flex items-center justify-center rounded-[var(--radius-sm)] transition-all shrink-0 ${(!inputText.trim() && selectedFiles.length === 0) || isSending
                            ? 'bg-[var(--accent)] text-white opacity-40 cursor-not-allowed'
                            : 'bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]'
                            }`}
                    >
                        {isSending ? (
                            <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        ) : (
                            <Send size={16} />
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
};

const ChatThread = (props) => (
  <ChatErrorBoundary>
    <ChatThreadComponent {...props} />
  </ChatErrorBoundary>
);

export default ChatThread;
