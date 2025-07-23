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
}

export default function Onboarding() {
  const [sessionId, setSessionId] = useState<string>("");
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const [showInitialLoader, setShowInitialLoader] = useState<boolean>(true);
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
    onSuccess: (data) => {
      console.log('Setting session ID:', data.session_id);
      setSessionId(data.session_id);
      setIsInitialized(true);
      // Don't hide the loader yet - wait for messages to load
    },
    onError: (error) => {
      console.error('Failed to initialize user:', error);
      setIsInitialized(true); // Still mark as initialized to prevent retry loop
      setTimeout(() => setShowInitialLoader(false), 1000);
    },
  });

  // Get user status
  const { data: userStatus, isLoading: isLoadingStatus } = useQuery<UserStatus>({
    queryKey: ['/api/user/status', sessionId],
    enabled: !!sessionId,
  });

  useEffect(() => {
    // Initialize user only once on component mount
    if (!isInitialized && !initUserMutation.isPending) {
      console.log('Starting user initialization...');
      initUserMutation.mutate();
    }
  }, [isInitialized, initUserMutation]);

  useEffect(() => {
    // Listen for onboarding completion events only when we have a session
    if (!sessionId) return;
    
    const handleOnboardingCompleted = () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user/status', sessionId] });
    };

    const handleMessagesLoaded = () => {
      // Hide loader once messages are loaded (only on initial load)
      if (showInitialLoader) {
        setTimeout(() => setShowInitialLoader(false), 600);
      }
    };
    
    window.addEventListener('onboarding-completed', handleOnboardingCompleted);
    window.addEventListener('messages-loaded', handleMessagesLoaded);
    
    return () => {
      window.removeEventListener('onboarding-completed', handleOnboardingCompleted);
      window.removeEventListener('messages-loaded', handleMessagesLoaded);
    };
  }, [sessionId, queryClient, showInitialLoader]);

  // Show loading screen when initializing or when showInitialLoader is true
  if (showInitialLoader || initUserMutation.isPending || isLoadingStatus || !sessionId) {
    return <LoadingScreen message="Initializing your assistant..." />;
  }

  if (initUserMutation.error) {
    console.error('Init mutation error:', initUserMutation.error);
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col overflow-hidden">
      <Header />
      <SimpleChatInterface 
        sessionId={sessionId} 
        onboardingCompleted={(userStatus as any)?.onboarding_completed ?? false}
      />
    </div>
  );
}

function Header() {
  return (
    <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex-shrink-0">
      <div className="flex items-center justify-between max-w-6xl mx-auto">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <i className="fas fa-chart-line text-white text-sm"></i>
          </div>
          <div>
            <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">HEOR Signal</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Onboarding Assistant
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
          <i className="fas fa-shield-alt text-gray-400"></i>
          <span>Secure Session</span>
        </div>
      </div>
    </header>
  );
}
