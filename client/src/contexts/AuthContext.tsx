import React, { createContext, useContext, useEffect, useState } from 'react';
import { sessionManager, UserSession } from '@/lib/session';
import { authService, User } from '@/lib/auth';

interface AuthContextType {
  session: UserSession | null;
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (name: string, email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<UserSession | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Initialize from auth service
    const currentUser = authService.getUser();
    const currentSession = sessionManager.getSession();
    
    setUser(currentUser);
    setSession(currentSession);
    setLoading(false);

    // Listen for session changes
    const unsubscribe = sessionManager.addListener((newSession) => {
      setSession(newSession);
    });

    return unsubscribe;
  }, []);

  const login = async (email: string, password: string) => {
    const result = await authService.login(email, password);
    if (result.success && result.user) {
      setUser(result.user);
      setSession(sessionManager.getSession());
    }
    return result;
  };

  const register = async (name: string, email: string, password: string) => {
    const result = await authService.register(name, email, password);
    if (result.success && result.user) {
      setUser(result.user);
      setSession(sessionManager.getSession());
    }
    return result;
  };

  const logout = () => {
    authService.logout();
  };

  const value: AuthContextType = {
    session,
    user,
    isAuthenticated: authService.isAuthenticated(),
    login,
    register,
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