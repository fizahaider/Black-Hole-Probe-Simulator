import { useEffect, useMemo, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import NotificationBell from './NotificationBell';
import { useAuth } from '../../context/AuthContext';
import { FriendsChatProvider, useConversations } from '../../hooks/useFriendsChat';
import { useTheme } from '../../hooks/useTheme';
import { Sun, Moon } from 'lucide-react';

const DashboardLayoutInner = () => {
  const { user } = useAuth();
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const { conversations, unreadCounts, pendingInvitesCount } = useConversations();

  const hasUnreadMessages = conversations.some((conv) => (unreadCounts[conv.id] || 0) > 0) || pendingInvitesCount > 0;
  useEffect(() => {
    const applyAutoCollapse = () => {
      if (window.innerWidth <= 1024) {
        setIsCollapsed(true);
      }
    };

    applyAutoCollapse();
    window.addEventListener('resize', applyAutoCollapse);
    return () => window.removeEventListener('resize', applyAutoCollapse);
  }, []);

  const pageTitle = useMemo(() => {
    if (location.pathname.startsWith('/dashboard/spaces')) return 'Knowledge Spaces';
    if (location.pathname.startsWith('/dashboard/study')) return 'Study Space';
    if (location.pathname.startsWith('/dashboard/chat')) return 'Messages';
    if (location.pathname.startsWith('/dashboard/prep-hub')) return 'Prep Hub';
    if (location.pathname.startsWith('/dashboard/profile')) return 'Account';
    return 'Analytics';
  }, [location.pathname]);

  return (
    <div className="flex h-screen bg-[var(--bg-base)] overflow-hidden">
      <Sidebar
        isCollapsed={isCollapsed}
        setIsCollapsed={setIsCollapsed}
        hasUnreadMessages={hasUnreadMessages}
      />

      <main
        className="flex-1 flex flex-col h-screen overflow-hidden transition-all duration-300"
        style={{ marginLeft: isCollapsed ? 72 : 240 }}
      >
        <header className="h-14 px-6 shrink-0 bg-[var(--bg-base)] border-b border-[var(--border)] flex items-center justify-between">
          <h1 className="text-subhead text-[var(--text-primary)]">{pageTitle}</h1>
          <div className="flex items-center gap-3">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-[var(--radius-sm)] text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)] transition-colors"
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <NotificationBell />
            <div className="w-8 h-8 rounded-full flex items-center justify-center bg-[var(--accent-subtle)]">
              <span className="text-caption font-semibold text-[var(--accent)]">{user?.name?.charAt(0).toUpperCase() || 'U'}</span>
            </div>
          </div>
        </header>

        <div className={`flex-1 flex flex-col min-h-0 bg-[var(--bg-base)] ${
          location.pathname.startsWith('/dashboard/chat') || location.pathname.startsWith('/dashboard/study')
            ? '' 
            : 'overflow-y-auto p-6'
        }`}>
          <Outlet />
        </div>
      </main>
    </div>
  );
};

const DashboardLayout = () => {
  return (
    <FriendsChatProvider>
      <DashboardLayoutInner />
    </FriendsChatProvider>
  );
};

export default DashboardLayout;

