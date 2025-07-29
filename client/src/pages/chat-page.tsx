import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { SimpleChatInterface } from "@/components/chat/simple-chat-interface";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { LoadingScreen } from "@/components/ui/loading-screen";
import { useLocation } from "wouter";
import { SessionManager, UserSession } from "@/lib/session";

interface UserStatus {
  session_id: string;
  onboarding_completed: boolean;
  selected_categories: string[];
  preference_expertise?: string;
}

export default function ChatPage() {
  const [, setLocation] = useLocation();
  const [userSession, setUserSession] = useState<UserSession | null>(null);
  const [showInitialLoader, setShowInitialLoader] = useState<boolean>(true);
  
  const queryClient = useQueryClient();

  // Get user status for existing session
  const { data: userStatus, isLoading: isLoadingStatus } = useQuery<UserStatus>({
    queryKey: ['/api/user/status'],
    enabled: !!userSession?.session_id,
  });

  useEffect(() => {
    // Check for existing session
    const session = SessionManager.getSession();
    if (session) {
      setUserSession(session);
      setTimeout(() => setShowInitialLoader(false), 1000);
    } else {
      // No session, redirect to auth
      setLocation('/auth');
    }
  }, [setLocation]);

  useEffect(() => {
    // Listen for onboarding completion events
    if (!userSession?.session_id) return;
    
    const handleOnboardingCompleted = () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user/status'] });
    };

    const handleRefreshUserStatus = () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user/status'] });
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
  }, [userSession?.session_id, queryClient, showInitialLoader]);

  // Show loading screen during initialization
  if (showInitialLoader || isLoadingStatus || !userSession?.session_id) {
    return <LoadingScreen message="Loading your chat session..." />;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col overflow-hidden">
      <SimpleChatInterface 
        sessionId={userSession.session_id} 
        userStatus={userStatus}
        onStartChat={() => {}} // Not needed since we're already in chat
        hasStartedChat={true}
      />
    </div>
  );
}