import { useEffect, useState } from "react";
import { SimpleChatInterface } from "@/components/chat/simple-chat-interface";
import { LoginComponent } from "@/components/auth/login-component";
import { RegisterComponent } from "@/components/auth/register-component";
import { LandingPage } from "@/components/landing/landing-page";
import { Card, CardContent } from "@/components/ui/card";
import { LoadingScreen } from "@/components/ui/loading-screen";
import { useAuth } from "@/contexts/auth-context";
import { useLocation } from "wouter";

enum UserFlowState {
  LANDING = 'landing',
  LOGIN = 'login',
  REGISTER = 'register',
  ONBOARDING = 'onboarding'
}

interface UserStatus {
  session_id: string;
  onboarding_completed: boolean;
  selected_categories: string[];
  preference_expertise?: string;
}

export default function Home() {
  const { isAuthenticated, userStatus, sessionId, initializeSession, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [currentState, setCurrentState] = useState<UserFlowState>(UserFlowState.LANDING);
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

  // Navigation handlers
  const handleShowLogin = () => {
    setCurrentState(UserFlowState.LOGIN);
  };

  const handleShowRegister = () => {
    setCurrentState(UserFlowState.REGISTER);
  };

  const handleBackToLanding = () => {
    setCurrentState(UserFlowState.LANDING);
  };

  const handleSwitchToLogin = () => {
    setCurrentState(UserFlowState.LOGIN);
  };

  const handleSwitchToRegister = () => {
    setCurrentState(UserFlowState.REGISTER);
  };

  // Function to initialize user when chat is started
  const handleStartChat = async () => {
    setCurrentState(UserFlowState.ONBOARDING);
    setHasStartedChat(true);
    try {
      await initializeSession();
    } catch (error) {
      console.error('Failed to initialize session:', error);
    }
  };

  // Auth success handlers
  const handleLoginSuccess = (userData: any) => {
    // Existing users go directly to dashboard
    setTimeout(() => {
      setLocation('/dashboard');
    }, 100);
  };

  const handleRegisterSuccess = (userData: any) => {
    // New users go through onboarding
    setCurrentState(UserFlowState.ONBOARDING);
    setHasStartedChat(true);
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

  // Render based on current state
  if (currentState === UserFlowState.LOGIN) {
    return (
      <LoginComponent
        onLoginSuccess={handleLoginSuccess}
        onBackToLanding={handleBackToLanding}
        onSwitchToRegister={handleSwitchToRegister}
      />
    );
  }

  if (currentState === UserFlowState.REGISTER) {
    return (
      <RegisterComponent
        onRegisterSuccess={handleRegisterSuccess}
        onBackToLanding={handleBackToLanding}
        onSwitchToLogin={handleSwitchToLogin}
      />
    );
  }

  if (currentState === UserFlowState.ONBOARDING) {
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

  // Default: Landing state
  return (
    <LandingPage 
      onStartChat={handleStartChat}
      onShowLogin={handleShowLogin}
      onShowRegister={handleShowRegister}
    />
  );
}