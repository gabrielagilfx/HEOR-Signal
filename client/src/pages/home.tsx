import { useEffect, useState } from "react";
import { SimpleChatInterface } from "@/components/chat/simple-chat-interface";
import { Card, CardContent } from "@/components/ui/card";
import { LoadingScreen } from "@/components/ui/loading-screen";
import { useAuth } from "@/contexts/auth-context";
import { useLocation } from "wouter";

interface UserStatus {
  session_id: string;
  onboarding_completed: boolean;
  selected_categories: string[];
  preference_expertise?: string;
}

export default function Home() {
  const { isAuthenticated, userStatus, sessionId, initializeSession, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [showInitialLoader, setShowInitialLoader] = useState<boolean>(true);
  const [hasStartedChat, setHasStartedChat] = useState<boolean>(false);

  // Redirect authenticated users to appropriate page
  useEffect(() => {
    if (isAuthenticated && userStatus) {
      if (userStatus.onboarding_completed) {
        setLocation('/dashboard');
      } else {
        setLocation('/chat');
      }
    }
  }, [isAuthenticated, userStatus, setLocation]);

  // Function to initialize user when chat is started
  const handleStartChat = async () => {
    setHasStartedChat(true);
    try {
      await initializeSession();
    } catch (error) {
      console.error('Failed to initialize session:', error);
    }
  };

  // Hide loader after session is initialized or after delay
  useEffect(() => {
    if (hasStartedChat && sessionId) {
      setTimeout(() => setShowInitialLoader(false), 600);
    }
  }, [hasStartedChat, sessionId]);

  // Show loading screen when chat has started and we're initializing
  if (hasStartedChat && (showInitialLoader || isLoading)) {
    return <LoadingScreen message="Initializing your assistant..." />;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col overflow-hidden">
      <SimpleChatInterface 
        sessionId={sessionId || ""} 
        userStatus={userStatus || undefined}
        onStartChat={handleStartChat}
        hasStartedChat={hasStartedChat}
      />
    </div>
  );
}