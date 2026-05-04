import { useState } from 'react';
import { Mail, UserPlus, Search, Plus } from 'lucide-react';

const ChatSidebar = ({
  conversations,
  activeConversationId,
  unreadCounts,
  pendingInvitesCount,
  onSelect,
  onNewChat,
  onShowInvites,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const filteredConversations = conversations.filter((conv) =>
    (conv.title || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="w-[280px] bg-[var(--bg-surface)] border-r border-[var(--border)] flex flex-col h-full flex-shrink-0 overflow-hidden">
      <div className="px-4 pt-4 pb-3 shrink-0">
        <h2 className="text-heading text-[var(--text-primary)]">Messages</h2>
      </div>

      <div className="px-4 shrink-0">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search conversations"
            className="w-full bg-[var(--bg-base)] border border-[var(--border)] rounded-[var(--radius-sm)] pl-9 pr-3 py-[0.4rem] text-body text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
          />
        </div>
      </div>

      <button
        onClick={onNewChat}
        className="mx-4 mt-3 mb-3 w-auto bg-[var(--accent)] text-white rounded-[var(--radius-sm)] py-2 inline-flex items-center justify-center gap-2 text-body font-medium hover:opacity-90"
      >
        <Plus size={15} />
        <span>New Chat</span>
      </button>

      {pendingInvitesCount > 0 && (
        <button
          onClick={onShowInvites}
          className="mx-4 mb-2 px-3 py-2 bg-[var(--accent-subtle)] border border-[var(--accent)] rounded-[var(--radius-sm)] flex items-center gap-2 text-left shrink-0"
        >
          <Mail size={14} className="text-[var(--accent)] shrink-0" />
          <span className="text-caption text-[var(--accent)]">{pendingInvitesCount} pending invite(s)</span>
        </button>
      )}

      <div className="flex-1 overflow-y-auto py-2">
        {filteredConversations.length === 0 ? (
          <div className="text-center py-8 text-caption text-[var(--text-muted)]">
            No conversations yet
          </div>
        ) : (
          filteredConversations.map((conv) => {
            const isActive = activeConversationId === conv.id;
            const participantsCount = conv.participants?.length || 0;
            const unread = unreadCounts?.[conv.id] || 0;
            const hasUnread = !isActive && unread > 0;

            return (
              <button
                key={conv.id}
                onClick={() => onSelect(conv)}
                className={`w-full text-left px-4 py-3 transition-all duration-150 flex items-center gap-3 ${
                  isActive ? 'bg-[var(--accent-subtle)] border-l-[3px] border-[var(--accent)]' : 'hover:bg-[var(--bg-elevated)] border-l-[3px] border-transparent'
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 bg-[var(--bg-elevated)] text-[var(--text-secondary)] text-body font-medium ${
                    hasUnread ? 'ring-2 ring-[var(--accent)]' : ''
                  }`}
                >
                  {conv.title?.charAt(0).toUpperCase() || '#'}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center mb-0.5">
                    <h3
                      className={`text-body truncate pr-2 ${
                        hasUnread ? 'font-medium text-[var(--text-primary)]' : 'font-normal text-[var(--text-primary)]'
                      }`}
                      title={conv.title}
                    >
                      {conv.title}
                    </h3>
                    <span className="text-caption text-[var(--text-muted)] ml-auto shrink-0">
                      {new Date(conv.updated_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                  <div className="flex justify-between items-center gap-2">
                    <p className="text-caption text-[var(--text-muted)] truncate max-w-[160px]">
                      {conv.last_message?.content || (conv.is_group ? `${participantsCount} members` : 'Direct message')}
                    </p>
                    {hasUnread && (
                      <span className="ml-auto text-[10px] text-white bg-[var(--accent)] rounded-full px-1.5 py-[1px] leading-none">
                        {unread > 99 ? '99+' : unread}
                      </span>
                    )}
                    {!hasUnread && <span className="ml-auto" />}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};

export default ChatSidebar;
