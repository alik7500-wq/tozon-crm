import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../../api/client';

const AuthContext = createContext(null);

const clearSessionDrafts = () => {
  try {
    if (typeof sessionStorage === 'undefined') return;
    for (let i = sessionStorage.length - 1; i >= 0; i -= 1) {
      const k = sessionStorage.key(i);
      if (k && k.startsWith('tozon:draft:')) sessionStorage.removeItem(k);
    }
  } catch {
    // Ignore storage access errors in restricted environments.
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const checkAuth = async (background = false) => {
    try {
      const res = await api.get('/auth/me');
      if (res?.data?.user) {
        setUser((prev) => {
          if (prev && (prev.id !== res.data.user.id || prev.role !== res.data.user.role)) {
            clearSessionDrafts();
          }
          return res.data.user;
        });
      } else {
        clearSessionDrafts();
        setUser(null);
      }
    } catch {
      if (!background) {
        clearSessionDrafts();
        setUser(null);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
    const refresh = () => { if (document.visibilityState === 'visible') checkAuth(true); };
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    const timer = window.setInterval(refresh, 60000);
    return () => {
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
      window.clearInterval(timer);
    };
  }, []);

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    if (res?.data?.user) {
      setUser(res.data.user);
    }
    return res;
  };

  const devLogin = async (email) => {
    const res = await api.post('/auth/dev-login', { email });
    if (res?.data?.user) {
      setUser(res.data.user);
    }
    return res;
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      clearSessionDrafts();
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, devLogin, logout, checkAuth }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useOptionalAuth = () => useContext(AuthContext) || { user: null };

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
