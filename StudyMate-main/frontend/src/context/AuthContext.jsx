import { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/authService';
import { parseApiError } from '../utils/errorHelpers';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchUser = async () => {
    try {
      const data = await authService.getCurrentUser();
      const userData = data?.data != null ? data.data : data;
      setUser(userData);
      setIsAuthenticated(true);
    } catch (error) {
      console.error('Failed to fetch user:', error);
      logout();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      fetchUser();
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    try {
      const data = await authService.login(email, password);
      const tokens = data?.tokens || data;
      const access = tokens?.access ?? data?.access;
      const refresh = tokens?.refresh ?? data?.refresh;

      if (access) {
        localStorage.setItem('accessToken', access);
      }
      if (refresh) {
        localStorage.setItem('refreshToken', refresh);
      }
      localStorage.setItem('userEmail', email);

      await fetchUser();
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: parseApiError(error)
      };
    }
  };

  const signup = async (name, email, password, confirmPassword) => {
    try {
      const data = await authService.signup(name, email, password, confirmPassword);
      const tokens = data?.tokens || data;
      const access = tokens?.access ?? data?.access;
      const refresh = tokens?.refresh ?? data?.refresh;

      if (access) {
        localStorage.setItem('accessToken', access);
      }
      if (refresh) {
        localStorage.setItem('refreshToken', refresh);
      }
      localStorage.setItem('userEmail', email);

      await fetchUser();
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: parseApiError(error)
      };
    }
  };

  const logout = () => {
    authService.logout();
    setUser(null);
    setIsAuthenticated(false);
    window.location.href = '/auth';
  };

  const value = {
    user,
    isAuthenticated,
    loading,
    login,
    signup,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
