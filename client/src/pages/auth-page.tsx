import { useState, useEffect } from "react";
import { LoginComponent } from "@/components/auth/login-component";
import { RegisterComponent } from "@/components/auth/register-component";
import { useLocation } from "wouter";
import { SessionManager } from "@/lib/session";

export default function AuthPage() {
  const [, setLocation] = useLocation();
  
  // Check URL params for mode
  const urlParams = new URLSearchParams(window.location.search);
  const mode = urlParams.get('mode');
  const [isLogin, setIsLogin] = useState(mode !== 'register');

  const handleAuthSuccess = (userData: any) => {
    // Store session in localStorage
    SessionManager.setSession(userData);
    
    // Redirect based on onboarding status
    if (userData.onboarding_completed) {
      // User has completed onboarding, go to dashboard
      setLocation('/dashboard');
    } else {
      // New user needs onboarding, go to chat
      setLocation('/chat');
    }
  };

  // Redirect if already authenticated
  useEffect(() => {
    if (SessionManager.isAuthenticated()) {
      const session = SessionManager.getSession();
      if (session?.onboarding_completed) {
        setLocation('/dashboard');
      } else {
        setLocation('/chat');
      }
    }
  }, [setLocation]);

  const handleBackToLanding = () => {
    setLocation("/");
  };

  if (isLogin) {
    return (
      <div>
        <LoginComponent 
          onLoginSuccess={handleAuthSuccess}
          onBackToLanding={handleBackToLanding}
        />
        <div className="text-center mt-4 pb-6">
          <p className="text-gray-600 dark:text-gray-400">
            Don't have an account?{" "}
            <button 
              onClick={() => setIsLogin(false)}
              className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
            >
              Sign up here
            </button>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <RegisterComponent 
        onRegisterSuccess={handleAuthSuccess}
        onBackToLanding={handleBackToLanding}
      />
      <div className="text-center mt-4 pb-6">
        <p className="text-gray-600 dark:text-gray-400">
          Already have an account?{" "}
          <button 
            onClick={() => setIsLogin(true)}
            className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
          >
            Sign in here
          </button>
        </p>
      </div>
    </div>
  );
}