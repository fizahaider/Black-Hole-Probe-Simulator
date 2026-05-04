import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { BookOpen, Sun, Moon } from 'lucide-react';
import AuthSlider from '../components/auth/AuthSlider';
import SignIn from '../components/auth/SignIn';
import SignUp from '../components/auth/SignUp';
import ForgotPassword from '../components/auth/ForgotPassword';
import { useTheme } from '../hooks/useTheme';

const AuthPage = () => {
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState('signin');
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'signup' || tab === 'forgot') {
      setActiveTab(tab);
    } else {
      setActiveTab('signin');
    }
  }, [searchParams]);

  const getSlideIndex = () => {
    if (activeTab === 'signup') return 1;
    if (activeTab === 'forgot') return 2;
    return 0;
  };

  return (
    <div className="h-screen flex overflow-hidden bg-[var(--bg-base)]">
      <AuthSlider currentSlide={getSlideIndex()} />

      <div className="relative flex-1 flex items-center justify-center bg-[var(--bg-base)] p-4 sm:p-6 lg:p-8">
        <a
          href="/"
          className="absolute top-4 left-4 sm:top-6 sm:left-6 inline-flex items-center gap-2 text-caption text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          aria-label="Back to landing page"
          title="Back to landing page"
        >
          <BookOpen size={16} className="text-[var(--accent)]" />
          <span className="hidden sm:inline">Back to home</span>
        </a>
        <button
          onClick={toggleTheme}
          className="absolute top-4 right-4 sm:top-6 sm:right-6 p-2 rounded-[var(--radius-sm)] text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)] transition-colors"
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        <div className="w-full max-w-[460px] flex items-center justify-center">
          {activeTab === 'signin' && <SignIn />}
          {activeTab === 'signup' && <SignUp />}
          {activeTab === 'forgot' && <ForgotPassword />}
        </div>
      </div>
    </div>
  );
};

export default AuthPage;

