import { useState, useEffect } from "react";
import { LoginComponent } from "@/components/auth/login-component";
import { RegisterComponent } from "@/components/auth/register-component";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/auth-context";

export default function AuthPage() {
  const [, setLocation] = useLocation();
  const { isAuthenticated, userStatus } = useAuth();
  
  // Check sessionStorage for auth intent, default to login mode
  const [isLogin, setIsLogin] = useState(() => {
    const authIntent = sessionStorage.getItem('authIntent');
    if (authIntent === 'register') {
      sessionStorage.removeItem('authIntent'); // Clear after reading
      return false; // Show register form
    }
    return true; // Default to login
  });

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && userStatus) {
      if (userStatus.onboarding_completed) {
        setLocation('/dashboard');
      } else {
        setLocation('/chat');
      }
    }
  }, [isAuthenticated, userStatus, setLocation]);

  const handleAuthSuccess = (userData: any) => {
    // Manual redirect after successful auth since context may not update immediately
    setTimeout(() => {
      setLocation('/dashboard'); // All authenticated users go to dashboard
    }, 100);
  };

  const handleBackToLanding = () => {
    setLocation("/");
  };

  if (isLogin) {
    return (
      <LoginComponent 
        onLoginSuccess={handleAuthSuccess}
        onBackToLanding={handleBackToLanding}
        onSwitchToRegister={() => setIsLogin(false)}
      />
    );
  }

  return (
    <RegisterComponent 
      onRegisterSuccess={handleAuthSuccess}
      onBackToLanding={handleBackToLanding}
      onSwitchToLogin={() => setIsLogin(true)}
    />
  );
}