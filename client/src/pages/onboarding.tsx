import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { SimpleChatInterface } from "@/components/chat/simple-chat-interface";
import { NewChatManager } from "@/components/chat/new-chat-manager";
import { Register } from "@/components/auth/register";
import { Login } from "@/components/auth/login";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { LoadingScreen } from "@/components/ui/loading-screen";
import { useAuth } from "@/contexts/AuthContext";

interface UserStatus {
  session_id: string;
  onboarding_completed: boolean;
  selected_categories: string[];
  preference_expertise?: string;
}

export default function Onboarding() {
  const { session, isAuthenticated, login, loading: authLoading } = useAuth();
  const [sessionId, setSessionId] = useState<string>("");
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const [showInitialLoader, setShowInitialLoader] = useState<boolean>(true);
  const [retryCount, setRetryCount] = useState<number>(0);
  const [showRegister, setShowRegister] = useState<boolean>(false);
  const [showLogin, setShowLogin] = useState<boolean>(false);
  
  // Check URL parameters to see if this is a new session request
  const urlParams = new URLSearchParams(window.location.search);
  const isNewSession = urlParams.get('new_session') === 'true';
  const [hasStartedChat, setHasStartedChat] = useState<boolean>(isNewSession);
  
  // Add state for SPA navigation
  const [currentView, setCurrentView] = useState<'onboarding' | 'newChat'>('onboarding');
  
  const queryClient = useQueryClient();

  // Initialize user session
  const initUserMutation = useMutation({
    mutationFn: async () => {
      console.log('Initializing user session...');
      const response = await apiRequest('POST', '/api/user/init', {
        session_id: sessionId || undefined
      });
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
      setSessionId(data.session_id);
      setIsInitialized(true);
      setRetryCount(0); // Reset retry count on success
      
      // If this was a new session, also set the session in auth context
      if (isNewSession) {
        login(data.session_id);
      }
    },
    onError: (error) => {
      console.error('Failed to initialize user after retries:', error);
      setIsInitialized(true); // Still mark as initialized to prevent retry loop
      setTimeout(() => setShowInitialLoader(false), 1000);
    },
  });

  // Get user status
  const { data: userStatus, isLoading: isLoadingStatus } = useQuery<UserStatus>({
    queryKey: ['/api/user/status', sessionId],
    enabled: !!sessionId,
  });

  // Function to initialize user when "Let's Chat" is clicked
  const handleStartChat = () => {
    if (isAuthenticated) {
      // User is already authenticated, go directly to chat
      setSessionId(session!.sessionId);
      setHasStartedChat(true);
      setIsInitialized(true);
    } else {
      // User needs to register or login
      setShowRegister(true);
    }
  };

  // Function to handle successful registration
  const handleRegisterSuccess = (newSessionId: string) => {
    login(newSessionId);
    setSessionId(newSessionId);
    setShowRegister(false);
    setHasStartedChat(true);
    setIsInitialized(true);
  };

  // Function to handle successful login
  const handleLoginSuccess = (newSessionId: string) => {
    login(newSessionId);
    setSessionId(newSessionId);
    setShowLogin(false);
    setHasStartedChat(true);
    setIsInitialized(true);
  };

  // Function to go back to landing page from register
  const handleBackToLanding = () => {
    setShowRegister(false);
    setShowLogin(false);
  };

  // Function to switch from register to login
  const handleSwitchToLogin = () => {
    setShowRegister(false);
    setShowLogin(true);
  };

  // Function to switch from login to register
  const handleSwitchToRegister = () => {
    setShowLogin(false);
    setShowRegister(true);
  };

  // Function to handle new chat navigation (SPA)
  const handleNewChat = () => {
    setCurrentView('newChat');
  };

  // Function to go back to onboarding from new chat
  const handleBackToOnboarding = () => {
    setCurrentView('onboarding');
  };

  useEffect(() => {
    // Initialize user if they have started chat and either have a session ID or are creating a new session
    if (hasStartedChat && !isInitialized && !initUserMutation.isPending) {
      console.log('Starting user initialization...');
      initUserMutation.mutate();
      
      // Clean up URL parameter after starting initialization
      if (isNewSession) {
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }, [hasStartedChat, isInitialized, initUserMutation, isNewSession]);

  // Handle new session parameter
  useEffect(() => {
    if (isNewSession && !hasStartedChat) {
      // For new sessions, we need to create a new user session
      setHasStartedChat(true);
      // Clean up URL parameter
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [isNewSession, hasStartedChat]);



  useEffect(() => {
    // Listen for onboarding completion events only when we have a session
    if (!sessionId) return;
    
    const handleOnboardingCompleted = () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user/status', sessionId] });
    };

    const handleRefreshUserStatus = () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user/status', sessionId] });
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
  }, [sessionId, queryClient, showInitialLoader]);

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

  // Show loading while auth is initializing
  if (authLoading) {
    return <LoadingScreen message="Loading..." />;
  }

  // Show register component when user clicks "Let's Chat"
  if (showRegister) {
    return (
      <Register 
        onRegisterSuccess={handleRegisterSuccess}
        onBackToLanding={handleBackToLanding}
        onSwitchToLogin={handleSwitchToLogin}
      />
    );
  }

  // Show login component
  if (showLogin) {
    return (
      <Login 
        onLoginSuccess={handleLoginSuccess}
        onBackToLanding={handleBackToLanding}
        onSwitchToRegister={handleSwitchToRegister}
      />
    );
  }

  // Show loading screen only when chat has started and we're initializing
  if (hasStartedChat && (showInitialLoader || initUserMutation.isPending || isLoadingStatus)) {
    let loadingMessage = "Loading...";
    
    if (retryCount > 0) {
      loadingMessage = `Retrying connection... (attempt ${retryCount + 1}/3)`;
    } else if (isNewSession) {
      loadingMessage = "Initializing your assistant...";
    } else if (sessionId) {
      loadingMessage = "Logging you in...";
    }
    
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

  // Show new chat manager if requested (SPA navigation)
  if (currentView === 'newChat') {
    return (
      <NewChatManager 
        onBack={handleBackToOnboarding}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col overflow-hidden">
      <SimpleChatInterface 
        sessionId={sessionId} 
        userStatus={userStatus}
        onStartChat={handleStartChat}
        hasStartedChat={hasStartedChat}
        onNewChat={handleNewChat}
      />
    </div>
  );
}
