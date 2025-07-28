import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiRequest } from '@/lib/queryClient';

interface User {
  user_id?: string;
  session_id?: string;
  email?: string;
  onboarding_completed: boolean;
  selected_categories: string[];
  preference_expertise?: string;
  is_authenticated: boolean;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
  error: string | null;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const clearError = () => setError(null);

  const login = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await apiRequest('POST', '/api/auth/login', {
        email,
        password,
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Login failed');
      }
      
      const data = await response.json();
      
      setToken(data.access_token);
      setUser({
        user_id: data.user_id,
        email: data.email,
        onboarding_completed: data.onboarding_completed,
        selected_categories: data.selected_categories,
        preference_expertise: data.preference_expertise,
        is_authenticated: true,
      });
      
      localStorage.setItem('token', data.access_token);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await apiRequest('POST', '/api/auth/register', {
        email,
        password,
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Registration failed');
      }
      
      const data = await response.json();
      
      setToken(data.access_token);
      setUser({
        user_id: data.user_id,
        email: data.email,
        onboarding_completed: data.onboarding_completed,
        selected_categories: data.selected_categories,
        preference_expertise: data.preference_expertise,
        is_authenticated: true,
      });
      
      localStorage.setItem('token', data.access_token);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
  };

  // Check if user is authenticated on app load
  useEffect(() => {
    const checkAuth = async () => {
      if (token) {
        try {
          const response = await apiRequest('GET', '/api/auth/me', {}, {
            Authorization: `Bearer ${token}`,
          });
          
          if (response.ok) {
            const userData = await response.json();
            setUser({
              user_id: userData.user_id,
              email: userData.email,
              onboarding_completed: userData.onboarding_completed,
              selected_categories: userData.selected_categories,
              preference_expertise: userData.preference_expertise,
              is_authenticated: true,
            });
          } else {
            // Token is invalid, clear it
            logout();
          }
        } catch (err) {
          console.error('Auth check failed:', err);
          logout();
        }
      }
      setIsLoading(false);
    };

    checkAuth();
  }, [token]);

  const value: AuthContextType = {
    user,
    token,
    login,
    register,
    logout,
    isLoading,
    error,
    clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};