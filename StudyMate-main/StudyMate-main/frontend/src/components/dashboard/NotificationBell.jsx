import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, BellOff } from 'lucide-react';
import { notificationService } from '../../services/notificationService';

const POLL_MS = 45_000;

const NotificationBell = () => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef(null);

  const fetchUnread = useCallback(async () => {
    try {
      const { data } = await notificationService.unreadCount();
      setUnread(typeof data.unread_count === 'number' ? data.unread_count : 0);
    } catch {
    }
  }, []);

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await notificationService.list({ limit: 40 });
      setItems(Array.isArray(data.results) ? data.results : []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUnread();
    const t = setInterval(fetchUnread, POLL_MS);
    const onFocus = () => fetchUnread();
    window.addEventListener('focus', onFocus);
    return () => {
      clearInterval(t);
      window.removeEventListener('focus', onFocus);
    };
  }, [fetchUnread]);

  useEffect(() => {
    if (open) {
      fetchList();
      fetchUnread();
    }
  }, [open, fetchList, fetchUnread]);

  useEffect(() => {
    const onDoc = (e) => {
      if (!open) return;
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const onItemClick = async (n) => {
    if (!n.is_read && n.id) {
      try {
        await notificationService.markRead(n.id);
        setItems((prev) =>
          prev.map((x) => (x.id === n.id ? { ...x, is_read: true, read_at: new Date().toISOString() } : x))
        );
        setUnread((c) => Math.max(0, c - 1));
      } catch {
      }
    }
    if (n.link) {
      setOpen(false);
      navigate(n.link);
    }
  };

  const onMarkAll = async () => {
    try {
      await notificationService.markAllRead();
      setItems((prev) => prev.map((x) => ({ ...x, is_read: true })));
      setUnread(0);
    } catch {
    }
  };

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="relative p-2 rounded-[var(--radius-sm)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors cursor-pointer"
        title="Notifications"
        aria-label="Notifications"
      >
        <Bell size={20} />
        {unread > 0 && (
          <span className="absolute -top-[2px] -right-[2px] w-4 h-4 rounded-full bg-[var(--accent)] text-white text-[9px] font-semibold leading-4 text-center border-2 border-[var(--bg-base)]">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-[calc(100%+8px)] w-[320px] max-h-[400px] overflow-y-auto bg-[var(--bg-surface)] border border-[var(--border)] rounded-[var(--radius-md)] shadow-[var(--shadow-md)] z-50">
          <div className="flex items-center justify-between px-4 py-3.5 border-b border-[var(--border)] sticky top-0 bg-[var(--bg-surface)]">
            <span className="text-subhead text-[var(--text-primary)]">Notifications</span>
            {items.some((x) => !x.is_read) && (
              <button
                type="button"
                onClick={onMarkAll}
                className="text-caption text-[var(--accent)] hover:underline cursor-pointer"
              >
                Mark all read
              </button>
            )}
          </div>
          <div className="custom-scrollbar">
            {loading && items.length === 0 ? (
              <div className="py-2">
                <div className="h-12 bg-[var(--bg-elevated)] rounded-[var(--radius-sm)] animate-pulse mx-4 my-2" />
                <div className="h-12 bg-[var(--bg-elevated)] rounded-[var(--radius-sm)] animate-pulse mx-4 my-2" />
                <div className="h-12 bg-[var(--bg-elevated)] rounded-[var(--radius-sm)] animate-pulse mx-4 my-2" />
              </div>
            ) : items.length === 0 ? (
              <div className="py-8 text-center flex flex-col items-center">
                <BellOff size={28} className="text-[var(--text-muted)]" />
                <p className="mt-2 text-caption text-[var(--text-muted)]">No notifications yet</p>
              </div>
            ) : (
              <ul>
                {items.map((n) => (
                  <li key={n.id}>
                    <button
                      type="button"
                      onClick={() => onItemClick(n)}
                      className={`w-full text-left px-4 py-3 flex items-start gap-3 border-b border-[var(--border)] hover:bg-[var(--bg-elevated)] transition-colors cursor-pointer ${n.is_read ? 'opacity-70' : ''}`}
                    >
                      {!n.is_read ? <span className="mt-[6px] w-1.5 h-1.5 rounded-full bg-[var(--accent)] shrink-0" aria-hidden /> : <span className="w-1.5 h-1.5 shrink-0" aria-hidden />}
                      <div className="min-w-0 flex-1">
                        <div className={`text-body leading-snug ${n.is_read ? 'text-[var(--text-secondary)] font-normal' : 'text-[var(--text-primary)] font-medium'}`}>
                          {n.title}
                        </div>
                        {n.body ? <p className="text-caption text-[var(--text-muted)] mt-1 line-clamp-3 whitespace-pre-wrap">{n.body}</p> : null}
                        {n.created_at ? (
                          <div className="text-caption text-[var(--text-muted)] mt-1">
                            {new Date(n.created_at).toLocaleString(undefined, {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </div>
                        ) : null}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
