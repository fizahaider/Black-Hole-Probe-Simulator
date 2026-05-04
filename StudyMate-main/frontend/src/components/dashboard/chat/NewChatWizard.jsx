import { useEffect, useState } from 'react';
import friendsChatService from '../../../services/friendsChatService';
import { Search, X, User, Users } from 'lucide-react';

const NewChatWizard = ({ onClose, onCreate }) => {
  const [step, setStep] = useState(1);
  const [chatType, setChatType] = useState(null);
  const [title, setTitle] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (searchQuery.length >= 2) {
        setIsSearching(true);
        try {
          const data = await friendsChatService.searchUsers(searchQuery);
          const filtered = data.filter((u) => !selectedUsers.find((s) => s.id === u.id));
          setSearchResults(filtered);
        } catch {
          setSearchResults([]);
        } finally {
          setIsSearching(false);
        }
      } else {
        setSearchResults([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, selectedUsers]);

  const handleAddUser = (user) => {
    if (chatType === 'direct') {
      setSelectedUsers([user]);
    } else {
      setSelectedUsers((prev) => [...prev, user]);
    }
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleRemoveUser = (userId) => {
    setSelectedUsers((prev) => prev.filter((u) => u.id !== userId));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (chatType === 'direct' && selectedUsers.length !== 1) return;
    if (chatType === 'group' && (!title.trim() || selectedUsers.length === 0)) return;

    setIsSubmitting(true);
    try {
      await onCreate({
        type: chatType,
        title: title.trim(),
        members: selectedUsers,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isNextDisabled = !chatType;
  const isCreateDisabled =
    isSubmitting ||
    (chatType === 'direct'
      ? selectedUsers.length !== 1
      : !title.trim() || selectedUsers.length === 0);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[rgba(0,0,0,0.5)] backdrop-blur-[4px] p-4">
      <div
        className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-[var(--radius-lg)] w-[440px] max-w-[90vw] shadow-[var(--shadow-md)] relative overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-5 border-b border-[var(--border)] flex justify-between items-center">
          <div>
            <h2 className="text-heading text-[var(--text-primary)]">
              {step === 1 ? 'Start New Chat' : chatType === 'direct' ? 'New Direct Message' : 'Create Group Chat'}
            </h2>
            <div className="flex items-center gap-1.5 mt-2">
              {[1, 2].map((s) => (
                <span key={s} className={`w-2 h-2 rounded-full ${step === s ? 'bg-[var(--accent)]' : 'bg-[var(--bg-elevated)]'}`} />
              ))}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-2 rounded-[var(--radius-sm)] hover:bg-[var(--bg-elevated)] transition-all"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
          {step === 1 ? (
            <div className="grid grid-cols-2 gap-3 h-full">
              <button
                onClick={() => setChatType('direct')}
                className={`p-4 rounded-[var(--radius-md)] border transition-all text-left flex items-center justify-center gap-2 ${
                  chatType === 'direct'
                    ? 'bg-[var(--accent-subtle)] border-[var(--accent)] text-[var(--accent)]'
                    : 'btn-secondary'
                }`}
              >
                <User size={16} />
                <span className="text-body">Direct</span>
              </button>

              <button
                onClick={() => setChatType('group')}
                className={`p-4 rounded-[var(--radius-md)] border transition-all text-left flex items-center justify-center gap-2 ${
                  chatType === 'group'
                    ? 'bg-[var(--accent-subtle)] border-[var(--accent)] text-[var(--accent)]'
                    : 'btn-secondary'
                }`}
              >
                <Users size={16} />
                <span className="text-body">Group</span>
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {chatType === 'group' && (
                <div>
                  <label className="block text-body text-[var(--text-secondary)] mb-2">Group Name</label>
                  <input
                    type="text"
                    autoFocus
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Study Buddies, Project X..."
                    className="input-field w-full"
                  />
                  <p className="text-caption text-[var(--text-muted)] mt-2">
                    You will be the Group Admin.
                  </p>
                </div>
              )}

              <div>
                <label className="block text-body text-[var(--text-secondary)] mb-2">
                  {chatType === 'direct' ? 'Select User' : 'Add Members'}
                </label>

                {selectedUsers.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {selectedUsers.map((user) => (
                      <div
                        key={user.id}
                        className="bg-[var(--accent-subtle)] border border-[var(--accent)] text-[var(--accent)] px-3 py-1.5 rounded-full text-caption font-semibold flex items-center gap-2"
                      >
                        <div className="w-5 h-5 rounded-full bg-[var(--accent)] flex items-center justify-center text-[10px] text-white font-bold">
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        {user.name}
                        <button
                          type="button"
                          onClick={() => handleRemoveUser(user.id)}
                          className="hover:text-[var(--text-primary)] transition-colors"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {(chatType === 'group' || selectedUsers.length === 0) && (
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">
                      {isSearching ? (
                        <div className="w-4 h-4 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Search size={16} />
                      )}
                    </div>
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search by name or email..."
                      className="input-field w-full pl-11"
                    />

                    {searchResults.length > 0 && (
                      <div className="absolute top-full left-0 right-0 mt-2 bg-[var(--bg-surface)] border border-[var(--border)] rounded-[var(--radius-md)] shadow-[var(--shadow-md)] z-50 overflow-hidden py-1">
                        {searchResults.map((user) => (
                          <button
                            key={user.id}
                            type="button"
                            onClick={() => handleAddUser(user)}
                            className="w-full px-4 py-3 flex items-center gap-3 hover:bg-[var(--bg-elevated)] transition-colors text-left"
                          >
                            <div className="w-8 h-8 rounded-full bg-[var(--bg-elevated)] flex items-center justify-center text-xs font-bold text-[var(--text-primary)] shrink-0">
                              {user.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-body font-medium text-[var(--text-primary)] truncate">{user.name}</div>
                              <div className="text-caption text-[var(--text-muted)] truncate">{user.email}</div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                    {searchQuery.length >= 2 && !isSearching && searchResults.length === 0 && (
                      <div className="absolute top-full left-0 right-0 mt-2 bg-[var(--bg-surface)] border border-[var(--border)] rounded-[var(--radius-md)] p-4 text-center text-caption text-[var(--text-muted)] z-50">
                        No users found matching "{searchQuery}"
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-[var(--border)] flex justify-end gap-2">
          <button
            type="button"
            onClick={step === 1 ? onClose : () => setStep(1)}
            className="btn-secondary"
          >
            {step === 1 ? 'Cancel' : 'Back'}
          </button>
          {step === 1 ? (
            <button
              type="button"
              disabled={isNextDisabled}
              onClick={() => setStep(2)}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Continue
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isCreateDisabled}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Creating...</span>
                </div>
              ) : (
                'Create Chat'
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default NewChatWizard;

