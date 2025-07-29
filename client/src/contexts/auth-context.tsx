import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface User {
  id: string;
  email: string;
  username: string;
  created_at: string;
}

interface UserStatus {
  session_id: string;
  onboarding_completed: boolean;
  selected_categories: string[];
  preference_expertise?: string;
}

interface AuthContextType {
  user: User | null;
  userStatus: UserStatus | null;
  sessionId: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  initializeSession: () => Promise<UserStatus>;
  refreshUserStatus: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [sessionId, setSessionId] = useState<string | null>(() => {
    return sessionStorage.getItem('heor_session_id');
  });
  const [user, setUser] = useState<User | null>(() => {
    const savedUser = sessionStorage.getItem('heor_user');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Query user status when we have a session ID
  const { data: userStatus, isLoading: isLoadingStatus, refetch: refetchUserStatus } = useQuery<UserStatus>({
    queryKey: ['/api/user/status', sessionId],
    queryFn: async () => {
      if (!sessionId) throw new Error('No session ID');
      const response = await apiRequest('GET', `/api/user/status/${sessionId}`);
      return await response.json();
    },
    enabled: !!sessionId,
  });

  // Save session data to sessionStorage
  useEffect(() => {
    if (sessionId) {
      sessionStorage.setItem('heor_session_id', sessionId);
    } else {
      sessionStorage.removeItem('heor_session_id');
    }
  }, [sessionId]);

  useEffect(() => {
    if (user) {
      sessionStorage.setItem('heor_user', JSON.stringify(user));
    } else {
      sessionStorage.removeItem('heor_user');
    }
  }, [user]);

  // Initialize session (for new users or chat initialization)
  const initializeSession = async () => {
    try {
      const response = await apiRequest('POST', '/api/user/init', {});
      const data: UserStatus = await response.json();
      setSessionId(data.session_id);
      return data;
    } catch (error) {
      console.error('Failed to initialize session:', error);
      throw error;
    }
  };

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      const response = await apiRequest('POST', '/api/auth/login', { email, password });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Login failed');
      }
      return await response.json();
    },
    onSuccess: (data) => {
      setUser(data.user);
      setSessionId(data.session_id);
      toast({
        title: 'Welcome back!',
        description: 'You have been logged in successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Login failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Register mutation
  const registerMutation = useMutation({
    mutationFn: async ({ username, email, password }: { username: string; email: string; password: string }) => {
      const response = await apiRequest('POST', '/api/auth/register', { username, email, password });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Registration failed');
      }
      return await response.json();
    },
    onSuccess: (data) => {
      setUser(data.user);
      setSessionId(data.session_id);
      toast({
        title: 'Welcome to HEOR Signal!',
        description: 'Your account has been created successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Registration failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const login = async (email: string, password: string) => {
    await loginMutation.mutateAsync({ email, password });
  };

  const register = async (username: string, email: string, password: string) => {
    await registerMutation.mutateAsync({ username, email, password });
  };

  const logout = () => {
    setUser(null);
    setSessionId(null);
    sessionStorage.removeItem('heor_session_id');
    sessionStorage.removeItem('heor_user');
    queryClient.clear();
    toast({
      title: 'Logged out',
      description: 'You have been logged out successfully.',
    });
  };

  const refreshUserStatus = () => {
    if (sessionId) {
      refetchUserStatus();
    }
  };

  const value: AuthContextType = {
    user,
    userStatus: userStatus || null,
    sessionId,
    isAuthenticated: !!user && !!sessionId,
    isLoading: loginMutation.isPending || registerMutation.isPending || isLoadingStatus,
    login,
    register,
    logout,
    initializeSession,
    refreshUserStatus,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}