import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { NAV_LINKS, APP_NAME } from '../../utils/constants';

const Navbar = () => {
  const { isAuthenticated, user, logout } = useAuth();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const isScrolled = window.scrollY > 20;
      setScrolled(isScrolled);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLogout = () => {
    logout();
    
  };

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className={`fixed top-4 left-0 right-0 z-50 transition-all duration-300 ${scrolled
          ? 'bg-[var(--bg-surface)]/95 backdrop-blur-xl border border-[var(--border)] rounded-lg mx-4'
          : 'bg-transparent border-b border-transparent'
        }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 relative">
          <Link to="/" className="text-xl font-heading font-semibold text-[var(--text-primary)] z-10">
            {APP_NAME}
          </Link>

          <div className="hidden md:flex items-center space-x-8 absolute left-1/2 transform -translate-x-1/2">
            {!isAuthenticated && (
              <>
                {NAV_LINKS.map((link) => (
                  <a
                    key={link.name}
                    href={link.href}
                    className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                  >
                    {link.name}
                  </a>
                ))}
                <Link
                  to="/blog"
                  className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                >
                  Blog
                </Link>
                <Link
                  to="/contact"
                  className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                >
                  Contact
                </Link>
              </>
            )}
          </div>

          <div className="flex items-center space-x-4 ml-auto z-10">
            {isAuthenticated ? (
              <>
                <span className="text-sm text-[var(--text-secondary)] hidden sm:block">{user?.name}</span>
                <button
                  onClick={handleLogout}
                  className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                >
                  Logout
                </button>
              </>
            ) : (
              <Link to="/auth" className="btn-primary text-sm px-4 py-1.5">
                Get Started
              </Link>
            )}
          </div>
        </div>
      </div>
    </motion.nav>
  );
};

export default Navbar;