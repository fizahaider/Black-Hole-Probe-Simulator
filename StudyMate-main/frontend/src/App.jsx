import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ChatProvider } from './context/ChatContext';
import { StudyProvider } from './context/StudyContext';
import Navbar from './components/Global/Navbar';
import Chatbot from './components/Global/Chatbot';
import Cursor from './components/Global/Cursor';
import LandingPage from './pages/LandingPage';
import AuthPage from './pages/AuthPage';
import DashboardPage from './pages/DashboardPage';
import BlogPage from './pages/BlogPage';
import BlogDetailPage from './pages/BlogDetailPage';
import ContactPage from './pages/ContactPage';
import ResetPasswordConfirm from './components/auth/ResetPasswordConfirm';
import { ToastProvider } from './context/ToastContext';

const PublicRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  return isAuthenticated ? <Navigate to="/dashboard" replace /> : children;
};

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  return isAuthenticated ? children : <Navigate to="/auth" replace />;
};

const LayoutWrapper = ({ children }) => {
  const location = useLocation();
  const isDashboard = location.pathname.startsWith('/dashboard');
  const isAuthRoute = location.pathname.startsWith('/auth') || location.pathname.startsWith('/reset-password');
  const showGlobalChrome = !isDashboard && !isAuthRoute;

  return (
    <>
      {showGlobalChrome && <Navbar />}
      {showGlobalChrome && <Chatbot />}
      {children}
    </>
  );
};

function AppContent() {
  useEffect(() => {
    const initialTheme = localStorage.getItem('sm-theme') === 'light' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', initialTheme);
  }, []);

  return (
    <div className="overflow-x-hidden w-full">
      <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <LayoutWrapper>
          <Routes>
            <Route
              path="/"
              element={
                <PublicRoute>
                  <LandingPage />
                </PublicRoute>
              }
            />
            <Route
              path="/auth"
              element={
                <PublicRoute>
                  <AuthPage />
                </PublicRoute>
              }
            />
            <Route path="/reset-password/:uidb64/:token" element={<ResetPasswordConfirm />} />
            <Route path="/blog" element={<BlogPage />} />
            <Route path="/blog/:id" element={<BlogDetailPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route
              path="/dashboard/*"
              element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              }
            />
          </Routes>
        </LayoutWrapper>
      </Router>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <ChatProvider>
          <StudyProvider>
            <AppContent />
          </StudyProvider>
        </ChatProvider>
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;