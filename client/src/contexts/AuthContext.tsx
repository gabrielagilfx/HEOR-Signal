import React, { createContext, useContext, useEffect, useState } from 'react';
import { sessionManager, UserSession } from '@/lib/session';

interface AuthContextType {
  session: UserSession | null;
  isAuthenticated: boolean;
  login: (sessionId: string, email?: string, name?: string) => void;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<UserSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Initialize session from session manager
    const currentSession = sessionManager.getSession();
    setSession(currentSession);
    setLoading(false);

    // Listen for session changes
    const unsubscribe = sessionManager.addListener((newSession) => {
      setSession(newSession);
    });

    return unsubscribe;
  }, []);

  const login = (sessionId: string, email?: string, name?: string) => {
    sessionManager.setSession(sessionId, email, name);
  };

  const logout = () => {
    sessionManager.clearSession();
  };

  const value: AuthContextType = {
    session,
    isAuthenticated: session?.isAuthenticated === true,
    login,
    logout,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}