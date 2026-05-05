import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { clearStoredToken, getStoredToken } from '../services/authService';
import { fetchCurrentUserProfile } from '../services/userService';

const AuthUserContext = createContext(null);

export function AuthUserProvider({ children }) {
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refreshUser = useCallback(async () => {
    const token = getStoredToken();
    if (!token) {
      setUser(null);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const profile = await fetchCurrentUserProfile();
      setUser(profile);
    } catch (err) {
      const status = err.response?.status;
      if (status === 401 || status === 403) {
        clearStoredToken();
      }
      setUser(null);
      setError(err.response?.data?.message || err.message || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [location.pathname, refreshUser]);

  const value = useMemo(
    () => ({
      user,
      loading,
      error,
      refreshUser,
    }),
    [user, loading, error, refreshUser]
  );

  return <AuthUserContext.Provider value={value}>{children}</AuthUserContext.Provider>;
}

export function useAuthUser() {
  const ctx = useContext(AuthUserContext);
  if (!ctx) {
    throw new Error('useAuthUser must be used within AuthUserProvider');
  }
  return ctx;
}
