import React, { useState } from 'react';
import { useInvites } from '../../../hooks/useFriendsChat';
import { useToast } from '../../../context/ToastContext';
import { Check, X } from 'lucide-react';

const InvitesPanel = ({ onClose, onOpenConversation }) => {
  const { invites, loading, respondToInvite } = useInvites();
  const { showToast } = useToast();
  const [processingId, setProcessingId] = useState(null);
  const [joinedConversation, setJoinedConversation] = useState(null);

  const handleRespond = async (invite, status) => {
    setProcessingId(invite.id);
    try {
      const conversation = await respondToInvite(invite.id, status);
      if (status === 'accepted') {
        if (conversation) {
          setJoinedConversation(conversation);
          showToast(`You joined ${conversation.title}`, 'success');
        } else {
          showToast('You joined the conversation', 'success');
        }
      } else {
        showToast('Invite declined', 'info');
      }
    } catch (err) {
      console.error(err);
      showToast('Failed to update invite', 'error');
    } finally {
      setProcessingId(null);
    }
  };

  const pendingInvites = invites.filter((i) => i.status === 'pending');

  return (
    <div className="absolute inset-y-0 left-0 w-[320px] bg-[var(--bg-surface)] border-r border-[var(--border)] z-20 shadow-[var(--shadow-md)] flex flex-col overflow-y-auto">
      <div className="p-4 border-b border-[var(--border)] flex items-center justify-between shrink-0">
        <h2 className="text-heading text-[var(--text-primary)]">Invitations</h2>
        <button
          onClick={onClose}
          className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] rounded-[var(--radius-sm)] transition-colors"
        >
          <X size={18} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {joinedConversation && (
          <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-surface)] p-3 flex flex-col gap-2">
            <p className="text-caption text-[var(--success)] font-semibold truncate">
              You joined {joinedConversation.title}
            </p>
            <button
              type="button"
              onClick={() => {
                if (onOpenConversation) {
                  onOpenConversation(joinedConversation.id);
                }
                setJoinedConversation(null);
                onClose();
              }}
              className="btn-primary inline-flex justify-center items-center"
            >
              Open Conversation
            </button>
          </div>
        )}

        {loading ? (
          <div className="text-center py-4 text-body text-[var(--text-muted)]">Loading...</div>
        ) : pendingInvites.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-caption text-[var(--text-muted)]">No pending invitations</p>
          </div>
        ) : (
          pendingInvites.map((invite) => (
            <div key={invite.id} className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-[var(--radius-md)] p-4 mx-3 my-2">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-[var(--accent-subtle)] border border-[var(--accent)] rounded-full flex items-center justify-center shrink-0">
                  <span className="text-[var(--accent)] font-bold text-sm">
                    {invite.inviter_email?.charAt(0).toUpperCase() || '?'}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-subhead text-[var(--text-primary)] truncate">{invite.inviter_email}</p>
                  <p className="text-body text-[var(--text-secondary)] truncate">{invite.conversation_title || 'Invited you to a chat'}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  disabled={processingId === invite.id}
                  onClick={() => handleRespond(invite, 'accepted')}
                  className="btn-primary flex-1 inline-flex items-center justify-center gap-1 disabled:opacity-50"
                >
                  <Check size={14} />
                  Accept
                </button>
                <button
                  disabled={processingId === invite.id}
                  onClick={() => handleRespond(invite, 'rejected')}
                  className="btn-secondary flex-1 inline-flex items-center justify-center gap-1 disabled:opacity-50"
                >
                  <X size={14} />
                  Decline
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default InvitesPanel;
