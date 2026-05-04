import { useEffect, useState } from 'react';
import { useToast } from '../../../context/ToastContext';
import { useConversations } from '../../../hooks/useFriendsChat';
import friendsChatService from '../../../services/friendsChatService';
import ChatSidebar from './ChatSidebar';
import ChatThread from './ChatThread';
import NewChatWizard from './NewChatWizard';
import InvitesPanel from './InvitesPanel';
import { MessageSquare } from 'lucide-react';

const ChatPage = () => {
  const {
    conversations,
    activeConversation,
    setActiveConversation,
    createConversation,
    leaveConversation,
    deleteConversation,
    unreadCounts,
    pendingInvitesCount,
  } = useConversations();
  const { showToast } = useToast();
  const [isNewChatOpen, setIsNewChatOpen] = useState(false);
  const [isInvitesOpen, setIsInvitesOpen] = useState(false);

  useEffect(() => {
    if (conversations.length > 0 && !activeConversation) {
      setActiveConversation(conversations[0].id);
    }
  }, [conversations, activeConversation, setActiveConversation]);

  const handleSelectConversation = (conversation) => {
    if (conversation) {
      setActiveConversation(conversation.id);
    }
  };

  const handleCreateChat = async ({ type, title, members }) => {
    try {
      if (type === 'direct') {
        const target = members[0];
        const convTitle = title || `Chat with ${target.name || target.email}`;
        const existing = conversations.find((conv) => {
          if (conv.is_group) return false;
          if (!conv.participants || !Array.isArray(conv.participants)) return false;
          return conv.participants.some(
            (p) => p.user === target.id || p.user_email === target.email
          );
        });
        if (existing) {
          setActiveConversation(existing.id);
          setIsNewChatOpen(false);
          showToast('Direct message already exists', 'success');
          return;
        }
        const conversation = await createConversation({
          title: convTitle,
          is_group: false,
          personality: 'neutral',
          metadata: { dm_with_user_id: target.id },
        });
        setActiveConversation(conversation.id);
        setIsNewChatOpen(false);
        showToast('Direct message started', 'success');
        return;
      }

      const groupName = title.trim();
      if (!groupName || members.length === 0) {
        return;
      }

      const conversation = await createConversation({
        title: groupName,
        is_group: true,
        personality: 'neutral',
      });

      const failedInvites = [];
      for (const user of members) {
        try {
          await friendsChatService.createInvite(conversation.id, user.email);
        } catch (error) {
          failedInvites.push(user);
        }
      }

      setActiveConversation(conversation.id);
      setIsNewChatOpen(false);

      if (failedInvites.length === 0) {
        showToast('Group created and invites sent', 'success');
      } else if (failedInvites.length === members.length) {
        showToast('Group created but failed to send any invites', 'error');
      } else {
        showToast('Group created, but some invites could not be sent', 'error');
      }
    } catch (err) {
      showToast(err.message || 'Failed to create chat', 'error');
    }
  };

  const handleOpenFromInvite = (conversationId) => {
    setActiveConversation(conversationId);
    setIsInvitesOpen(false);
  };

  const handleLeaveConversation = async (conversationId) => {
    await leaveConversation(conversationId);
  };

  const handleDeleteConversation = async (conversationId) => {
    await deleteConversation(conversationId);
  };

  return (
    <div className="flex h-full overflow-hidden bg-[var(--bg-base)] relative">
      <ChatSidebar
        conversations={conversations}
        activeConversationId={activeConversation?.id || null}
        unreadCounts={unreadCounts}
        pendingInvitesCount={pendingInvitesCount}
        onSelect={handleSelectConversation}
        onNewChat={() => setIsNewChatOpen(true)}
        onShowInvites={() => setIsInvitesOpen(true)}
      />

      <div className="flex-1 h-full overflow-hidden flex flex-col bg-[var(--bg-base)] relative">
        {activeConversation ? (
          <ChatThread
            conversation={activeConversation}
            onLeaveConversation={handleLeaveConversation}
            onDeleteConversation={handleDeleteConversation}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <MessageSquare size={40} className="text-[var(--text-muted)]" />
            <p className="text-body text-[var(--text-secondary)] mt-4">Select a conversation to start messaging</p>
          </div>
        )}
      </div>

      {isNewChatOpen && (
        <NewChatWizard
          onClose={() => setIsNewChatOpen(false)}
          onCreate={handleCreateChat}
        />
      )}

      {isInvitesOpen && (
        <InvitesPanel
          onClose={() => setIsInvitesOpen(false)}
          onOpenConversation={handleOpenFromInvite}
        />
      )}
    </div>
  );
};

export default ChatPage;
