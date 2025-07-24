import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { SimpleChatInterface } from "@/components/chat/simple-chat-interface";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { LoadingScreen } from "@/components/ui/loading-screen";

interface UserStatus {
  session_id: string;
  onboarding_completed: boolean;
  selected_categories: string[];
  preference_expertise?: string;
}

export default function Onboarding() {
  const [sessionId, setSessionId] = useState<string>("");
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const [showInitialLoader, setShowInitialLoader] = useState<boolean>(true);
  const [retryCount, setRetryCount] = useState<number>(0);
  const [hasStartedChat, setHasStartedChat] = useState<boolean>(false);
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
      setSessionId(data.session_id);
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
    queryKey: ['/api/user/status', sessionId],
    enabled: !!sessionId,
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
    }
  }, [hasStartedChat, isInitialized, initUserMutation]);

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

  // Show loading screen only when chat has started and we're initializing
  if (hasStartedChat && (showInitialLoader || initUserMutation.isPending || isLoadingStatus || !sessionId)) {
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
      <SimpleChatInterface 
        sessionId={sessionId} 
        userStatus={userStatus}
        onStartChat={handleStartChat}
        hasStartedChat={hasStartedChat}
      />
    </div>
  );
}
