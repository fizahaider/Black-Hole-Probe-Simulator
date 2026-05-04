import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { useSpace } from '../../context/SpaceContext';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  LayoutDashboard,
  Compass,
  FolderOpen,
  MessageSquare,
  UserCircle,
  LogOut,
  Timer,
} from 'lucide-react';

const Sidebar = ({ isCollapsed, setIsCollapsed, hasUnreadMessages }) => {
  const { logout } = useAuth();
  const { spaces, currentSpace, selectSpace } = useSpace();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/auth');
  };

  const menuItems = [
    { name: 'Analytics', path: '/dashboard', icon: <LayoutDashboard size={18} />, exact: true },
    { name: 'Spaces', path: '/dashboard/spaces', icon: <FolderOpen size={18} />, exact: false },
    { name: 'Prep Hub', path: '/dashboard/prep-hub', icon: <Compass size={18} />, exact: false },
    { name: 'Pomodoro', path: '/dashboard/pomodoro', icon: <Timer size={18} />, exact: false },
    {
      name: 'Messages',
      path: '/dashboard/chat',
      icon: (
        <div className="relative">
          <MessageSquare size={18} />
          {hasUnreadMessages && (
            <div className="absolute -top-1 -right-1 min-w-[14px] h-[14px] px-1 rounded-full bg-[var(--accent)] text-white text-[10px] leading-[14px] text-center">
              !
            </div>
          )}
        </div>
      ),
      exact: false
    },
    { name: 'Account', path: '/dashboard/profile', icon: <UserCircle size={18} />, exact: false },
  ];

  
  const isItemActive = (item) => {
    if (item.exact) {
      return location.pathname === item.path;
    }
    return location.pathname.startsWith(item.path);
  };

  return (
    <motion.aside
      initial={false}
      animate={{ width: isCollapsed ? 72 : 240 }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      className="h-screen fixed left-0 top-0 z-40 flex flex-col bg-[var(--bg-surface)] border-r border-[var(--border)]"
    >
      {/* Logo and collapse button */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-[var(--border)] shrink-0">
        <div className={`flex items-center ${isCollapsed ? 'justify-center w-full' : 'gap-2.5'}`}>
          <div className="w-7 h-7 rounded-[var(--radius-sm)] flex items-center justify-center bg-[var(--accent-subtle)] text-[var(--accent)] text-[10px] font-bold">
            SM
          </div>
          <AnimatePresence mode="wait">
            {!isCollapsed && (
              <motion.span
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
                className="text-heading text-[var(--text-primary)] whitespace-nowrap"
              >
                StudyMate
              </motion.span>
            )}
          </AnimatePresence>
        </div>
        {!isCollapsed && (
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1.5 rounded-[var(--radius-sm)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors cursor-pointer"
            title="Collapse sidebar"
            aria-label="Collapse sidebar"
          >
            <ChevronLeft size={16} />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
          const active = isItemActive(item);
          return (
            <div
              key={item.name}
              onClick={(e) => {
                e.preventDefault();
                if (item.name === 'Study Space' || item.name === 'Spaces') {
                  navigate('/dashboard/spaces');
                } else {
                  navigate(item.path);
                }
              }}
              title={isCollapsed ? item.name : undefined}
              className={`flex items-center gap-3 px-3 py-2.5 border-l-[3px] transition-colors duration-200 cursor-pointer ${active
                ? 'bg-[var(--accent-subtle)] text-[var(--accent)] font-medium border-l-[var(--accent)] rounded-[var(--radius-sm)]'
                : 'text-[var(--text-secondary)] border-l-transparent hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)] rounded-[var(--radius-sm)]'
                }`}
            >
              <div className="shrink-0 flex items-center justify-center w-5">{item.icon}</div>
              <AnimatePresence mode="wait">
                {!isCollapsed && (
                  <motion.span
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: 'auto' }}
                    exit={{ opacity: 0, width: 0 }}
                    transition={{ duration: 0.2 }}
                    className="text-[13px] whitespace-nowrap overflow-hidden"
                  >
                    {item.name}
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
          );
        })}

        {/* Knowledge Spaces Section - Restored */}
        {!isCollapsed && (
          <div className="mt-6 px-1 pt-4 border-t border-[var(--border)]">
            <div className="flex items-center justify-between mb-2 px-2">
              <label className="text-caption uppercase tracking-[0.08em]">
                Quick Space Switch
              </label>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  navigate('/dashboard/study?mode=create');
                }}
                className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors p-1 rounded-[var(--radius-sm)] hover:bg-[var(--bg-elevated)]"
                title="Create New Space"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-0.5 max-h-40 overflow-y-auto custom-scrollbar">
              {spaces.length === 0 ? (
                <div className="text-caption text-[var(--text-muted)] text-center px-2 py-2">No spaces yet</div>
              ) : (
                spaces.map(space => (
                  <button
                    key={space.id}
                    onClick={() => {
                      selectSpace(space);
                      navigate('/dashboard/study');
                    }}
                    className={`w-full flex items-center gap-2 px-2 py-2 border-l-[3px] rounded-[var(--radius-sm)] text-xs transition-colors ${currentSpace?.id === space.id
                        ? 'bg-[var(--accent-subtle)] text-[var(--accent)] font-medium border-l-[var(--accent)]'
                        : 'text-[var(--text-secondary)] border-l-transparent hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]'
                      }`}
                  >
                    <span className="truncate text-left">{space.name}</span>
                    {Number(space.unreadCount || space.unread_count || 0) > 0 && (
                      <span className="ml-auto min-w-[16px] h-[16px] px-1 rounded-full bg-[var(--accent)] text-white text-[10px] leading-[16px] text-center">
                        {space.unreadCount || space.unread_count}
                      </span>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </nav>

      {/* Logout at bottom */}
      <div className="px-3 py-3 border-t border-[var(--border)] shrink-0 mt-auto">
        <button
          onClick={handleLogout}
          title={isCollapsed ? 'Logout' : undefined}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius-sm)] transition-colors duration-200 text-[var(--text-secondary)] hover:text-[var(--danger)] cursor-pointer"
        >
          <div className="shrink-0 flex items-center justify-center w-5"><LogOut size={18} /></div>
          <AnimatePresence mode="wait">
            {!isCollapsed && (
              <motion.span
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.2 }}
                className="text-[13px] font-medium whitespace-nowrap overflow-hidden"
              >
                Logout
              </motion.span>
            )}
          </AnimatePresence>
        </button>
        {isCollapsed && (
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="mt-2 w-full p-2 rounded-[var(--radius-sm)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors cursor-pointer"
            title="Expand sidebar"
            aria-label="Expand sidebar"
          >
            <ChevronRight size={16} className="mx-auto" />
          </button>
        )}
      </div>
    </motion.aside >
  );
};

export default Sidebar;
