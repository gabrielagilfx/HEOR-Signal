import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { SimpleChatInterface } from "@/components/chat/simple-chat-interface";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { LoadingScreen } from "@/components/ui/loading-screen";
import { useLocation } from "wouter";

interface UserStatus {
  session_id: string;
  onboarding_completed: boolean;
  selected_categories: string[];
  preference_expertise?: string;
}

export default function ChatPage() {
  const [, setLocation] = useLocation();
  const [sessionId, setSessionId] = useState<string>("");
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const [showInitialLoader, setShowInitialLoader] = useState<boolean>(true);
  const [retryCount, setRetryCount] = useState<number>(0);
  
  // Get session ID from URL
  const urlParams = new URLSearchParams(window.location.search);
  const urlSessionId = urlParams.get('session');
  
  const queryClient = useQueryClient();

  // Get user status for existing session
  const { data: userStatus, isLoading: isLoadingStatus } = useQuery<UserStatus>({
    queryKey: ['/api/user/status', urlSessionId],
    enabled: !!urlSessionId,
  });

  useEffect(() => {
    if (urlSessionId) {
      setSessionId(urlSessionId);
      setIsInitialized(true);
      setTimeout(() => setShowInitialLoader(false), 1000);
    } else {
      // No session ID, redirect to auth
      setLocation('/auth');
    }
  }, [urlSessionId, setLocation]);

  useEffect(() => {
    // Listen for onboarding completion events
    if (!sessionId) return;
    
    const handleOnboardingCompleted = () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user/status', sessionId] });
    };

    const handleRefreshUserStatus = () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user/status', sessionId] });
    };

    const handleMessagesLoaded = () => {
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

  // Show loading screen during initialization
  if (showInitialLoader || isLoadingStatus || !sessionId) {
    return <LoadingScreen message="Loading your chat session..." />;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col overflow-hidden">
      <SimpleChatInterface 
        sessionId={sessionId} 
        userStatus={userStatus}
        onStartChat={() => {}} // Not needed since we're already in chat
        hasStartedChat={true}
      />
    </div>
  );
}