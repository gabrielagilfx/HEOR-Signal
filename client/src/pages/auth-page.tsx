import { useState, useEffect } from "react";
import { LoginComponent } from "@/components/auth/login-component";
import { RegisterComponent } from "@/components/auth/register-component";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/auth-context";

export default function AuthPage() {
  const [, setLocation] = useLocation();
  const { isAuthenticated, userStatus } = useAuth();
  
  // Check URL params for mode
  const urlParams = new URLSearchParams(window.location.search);
  const mode = urlParams.get('mode');
  const [isLogin, setIsLogin] = useState(mode !== 'register');

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
    // Auth context will handle the redirect automatically
    // No need for manual navigation here
  };

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