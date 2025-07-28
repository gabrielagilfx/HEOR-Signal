import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { SimpleChatInterface } from "@/components/chat/simple-chat-interface";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { LoadingScreen } from "@/components/ui/loading-screen";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { LogOut, User } from "lucide-react";

interface UserStatus {
  session_id?: string;
  user_id?: string;
  email?: string;
  onboarding_completed: boolean;
  selected_categories: string[];
  preference_expertise?: string;
  is_authenticated?: boolean;
}

export default function Onboarding() {
  const [sessionId, setSessionId] = useState<string>("");
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const [showInitialLoader, setShowInitialLoader] = useState<boolean>(true);
  const [retryCount, setRetryCount] = useState<number>(0);
  const { user, token, logout } = useAuth();
  
  // Check URL parameters to see if this is a new session request
  const urlParams = new URLSearchParams(window.location.search);
  const isNewSession = urlParams.get('new_session') === 'true';
  const [hasStartedChat, setHasStartedChat] = useState<boolean>(isNewSession);
  
  const queryClient = useQueryClient();

  // Initialize user session
  const initUserMutation = useMutation({
    mutationFn: async () => {
      console.log('Initializing user session...');
      const response = await apiRequest('POST', '/api/user/init', {});
      const data = await response.json();
      console.log('User session initialized:', data);
      return data as UserStatus;
    },
    retry: (failureCount, error) => {
      setRetryCount(failureCount);
      return failureCount < 3; // Max 3 attempts
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
    onSuccess: (data) => {
      console.log('Setting session ID:', data.session_id);
      setSessionId(data.session_id || '');
      setIsInitialized(true);
      setRetryCount(0); // Reset retry count on success
    },
    onError: (error) => {
      console.error('Failed to initialize user after retries:', error);
      setIsInitialized(true); // Still mark as initialized to prevent retry loop
      setTimeout(() => setShowInitialLoader(false), 1000);
    },
  });

  // Get user status
  const { data: userStatus, isLoading: isLoadingStatus } = useQuery<UserStatus>({
    queryKey: ['/api/user/status', sessionId || user?.user_id],
    enabled: !!(sessionId || user?.user_id),
  });

  // Function to initialize user when "Let's Chat" is clicked
  const handleStartChat = () => {
    setHasStartedChat(true);
    if (!isInitialized && !initUserMutation.isPending) {
      console.log('Starting user initialization...');
      initUserMutation.mutate();
    }
  };

  useEffect(() => {
    // Only initialize user if they have started chat
    if (hasStartedChat && !isInitialized && !initUserMutation.isPending) {
      console.log('Starting user initialization...');
      initUserMutation.mutate();
      
      // Clean up URL parameter after starting initialization
      if (isNewSession) {
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }, [hasStartedChat, isInitialized, initUserMutation, isNewSession]);

  useEffect(() => {
    // Listen for onboarding completion events only when we have a session
    if (!sessionId && !user?.user_id) return;
    
    const handleOnboardingCompleted = () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user/status', sessionId || user?.user_id] });
    };

    const handleRefreshUserStatus = () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user/status', sessionId || user?.user_id] });
    };

    const handleMessagesLoaded = () => {
      // Hide loader once messages are loaded (only on initial load)
      if (showInitialLoader) {
        setTimeout(() => setShowInitialLoader(false), 600);
      }
    };
    
    window.addEventListener('onboarding-completed', handleOnboardingCompleted);
    window.addEventListener('refresh-user-status', handleRefreshUserStatus);
    window.addEventListener('messages-loaded', handleMessagesLoaded);
    
    return () => {
      window.removeEventListener('onboarding-completed', handleOnboardingCompleted);
      window.removeEventListener('refresh-user-status', handleRefreshUserStatus);
      window.removeEventListener('messages-loaded', handleMessagesLoaded);
    };
  }, [sessionId, user?.user_id, queryClient, showInitialLoader]);

  // Fallback: Hide loader after user status is loaded (backup mechanism)
  useEffect(() => {
    if (userStatus && !isLoadingStatus && showInitialLoader) {
      // Give a bit more time for messages to potentially load, then hide regardless
      const fallbackTimer = setTimeout(() => {
        console.log('Fallback: hiding loader after user status loaded');
        setShowInitialLoader(false);
      }, 1500);
      
      return () => clearTimeout(fallbackTimer);
    }
  }, [userStatus, isLoadingStatus, showInitialLoader]);

  // Show loading screen only when chat has started and we're initializing
  if (hasStartedChat && (showInitialLoader || initUserMutation.isPending || isLoadingStatus || (!sessionId && !user?.user_id))) {
    const loadingMessage = retryCount > 0 
      ? `Retrying connection... (attempt ${retryCount + 1}/3)`
      : "Initializing your assistant...";
    return <LoadingScreen message={loadingMessage} />;
  }

  if (initUserMutation.error) {
    console.error('Init mutation error:', initUserMutation.error);
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <div className="flex-1 flex items-center justify-center">
          <Card className="w-full max-w-md">
            <CardContent className="p-6 text-center">
              <div className="text-red-500 mb-4">
                <i className="fas fa-exclamation-circle text-4xl"></i>
              </div>
              <h2 className="text-xl font-semibold text-foreground mb-2">
                Connection Error
              </h2>
              <p className="text-muted-foreground mb-4">
                Unable to initialize your session. Please refresh the page to try again.
              </p>
              <details className="text-sm text-left">
                <summary>Error Details</summary>
                <pre className="mt-2 text-xs bg-gray-100 p-2 rounded">
                  {JSON.stringify(initUserMutation.error, null, 2)}
                </pre>
              </details>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Check if dashboard should be shown (both onboarding completed and expertise set)
  const shouldShowDashboard = userStatus?.onboarding_completed && userStatus?.preference_expertise;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col overflow-hidden">
      {/* Header with authentication status */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4">
        <div className="flex justify-between items-center">
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
            HEOR Signal Assistant
          </h1>
          <div className="flex items-center space-x-4">
            {user ? (
              <div className="flex items-center space-x-2">
                <User className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-600 dark:text-gray-300">
                  {user.email}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={logout}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Link href="/login">
                  <Button variant="outline" size="sm">
                    Sign In
                  </Button>
                </Link>
                <Link href="/register">
                  <Button size="sm">
                    Sign Up
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
      
      <SimpleChatInterface 
        sessionId={sessionId} 
        userStatus={userStatus}
        onStartChat={handleStartChat}
        hasStartedChat={hasStartedChat}
      />
    </div>
  );
}
