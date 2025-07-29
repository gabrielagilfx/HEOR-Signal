import { useEffect } from "react";
import { SimpleChatInterface } from "@/components/chat/simple-chat-interface";
import { LoadingScreen } from "@/components/ui/loading-screen";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/auth-context";

interface UserStatus {
  session_id: string;
  onboarding_completed: boolean;
  selected_categories: string[];
  preference_expertise?: string;
}

export default function ChatPage() {
  const [, setLocation] = useLocation();
  const { isAuthenticated, userStatus, sessionId, isLoading } = useAuth();

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated && !isLoading) {
      setLocation('/auth?mode=register');
    }
  }, [isAuthenticated, isLoading, setLocation]);

  // Redirect if user has completed onboarding
  useEffect(() => {
    if (isAuthenticated && userStatus?.onboarding_completed) {
      setLocation('/dashboard');
    }
  }, [isAuthenticated, userStatus, setLocation]);

  // Show loading if authenticating or no session
  if (isLoading || !sessionId) {
    return <LoadingScreen message="Loading your chat session..." />;
  }

  // Show loading if user status not loaded yet
  if (!userStatus) {
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