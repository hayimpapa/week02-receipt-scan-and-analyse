import { createContext, useContext, useState, useCallback } from 'react';
import { isOwnerMode, loginOwner, clearSession } from '../services/auth';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [isOwner, setIsOwner] = useState(isOwnerMode);

  const login = useCallback(async (password) => {
    await loginOwner(password);
    setIsOwner(true);
  }, []);

  const logout = useCallback(() => {
    clearSession();
    setIsOwner(false);
  }, []);

  return (
    <AuthContext.Provider value={{ isOwner, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
