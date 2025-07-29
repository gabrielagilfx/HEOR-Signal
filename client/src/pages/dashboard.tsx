import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { HEORDashboard } from "@/components/dashboard/heor-dashboard";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { LoadingScreen } from "@/components/ui/loading-screen";

interface UserStatus {
  session_id: string;
  onboarding_completed: boolean;
  selected_categories: string[];
  preference_expertise?: string;
}

export default function Dashboard() {
  const [sessionId, setSessionId] = useState<string>("");
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const [showInitialLoader, setShowInitialLoader] = useState<boolean>(true);
  const [retryCount, setRetryCount] = useState<number>(0);
  
  const queryClient = useQueryClient();

  // Initialize user session for dashboard
  const initUserMutation = useMutation({
    mutationFn: async () => {
      console.log('Initializing user session for dashboard...');
      const response = await apiRequest('POST', '/api/user/init', {});
      const data = await response.json();
      console.log('User session initialized for dashboard:', data);
      return data as UserStatus;
    },
    retry: (failureCount, error) => {
      setRetryCount(failureCount);
      return failureCount < 3; // Max 3 attempts
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
    onSuccess: (data) => {
      console.log('Setting session ID for dashboard:', data.session_id);
      setSessionId(data.session_id);
      setIsInitialized(true);
      setRetryCount(0); // Reset retry count on success
    },
    onError: (error) => {
      console.error('Failed to initialize user for dashboard after retries:', error);
      setIsInitialized(true); // Still mark as initialized to prevent retry loop
      setTimeout(() => setShowInitialLoader(false), 1000);
    },
  });

  // Get user status
  const { data: userStatus, isLoading: isLoadingStatus } = useQuery<UserStatus>({
    queryKey: ['/api/user/status', sessionId],
    enabled: !!sessionId,
  });

  // Initialize session on mount
  useEffect(() => {
    if (!isInitialized && !initUserMutation.isPending) {
      console.log('Starting user initialization for dashboard...');
      initUserMutation.mutate();
    }
  }, [isInitialized, initUserMutation]);

  useEffect(() => {
    // Listen for dashboard refresh events
    if (!sessionId) return;
    
    const handleRefreshUserStatus = () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user/status', sessionId] });
    };
    
    window.addEventListener('refresh-user-status', handleRefreshUserStatus);
    
    return () => {
      window.removeEventListener('refresh-user-status', handleRefreshUserStatus);
    };
  }, [sessionId, queryClient]);

  // Hide loader after user status is loaded
  useEffect(() => {
    if (userStatus && !isLoadingStatus && showInitialLoader) {
      const fallbackTimer = setTimeout(() => {
        console.log('Dashboard: hiding loader after user status loaded');
        setShowInitialLoader(false);
      }, 1000);
      
      return () => clearTimeout(fallbackTimer);
    }
  }, [userStatus, isLoadingStatus, showInitialLoader]);

  // Show loading screen while initializing
  if (showInitialLoader || initUserMutation.isPending || isLoadingStatus || !sessionId) {
    const loadingMessage = retryCount > 0 
      ? `Retrying connection... (attempt ${retryCount + 1}/3)`
      : "Loading your dashboard...";
    return <LoadingScreen message={loadingMessage} />;
  }

  if (initUserMutation.error) {
    console.error('Dashboard init mutation error:', initUserMutation.error);
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
                Unable to load your dashboard. Please refresh the page to try again.
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

  // Check if user has completed onboarding and has expertise preference
  const shouldShowDashboard = userStatus?.onboarding_completed && userStatus?.preference_expertise;

  if (!shouldShowDashboard) {
    // Redirect to home page if user hasn't completed onboarding
    window.location.href = '/';
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col overflow-hidden">
      <HEORDashboard 
        selectedCategories={userStatus?.selected_categories || []}
        sessionId={sessionId}
      />
    </div>
  );
}