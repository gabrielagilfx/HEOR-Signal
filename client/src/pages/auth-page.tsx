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
      <div className="relative">
        <LoginComponent 
          onLoginSuccess={handleAuthSuccess}
          onBackToLanding={handleBackToLanding}
        />
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 lg:left-1/4 lg:transform-none">
          <p className="text-slate-600 dark:text-slate-400 text-center">
            Don't have an account?{" "}
            <button 
              onClick={() => setIsLogin(false)}
              className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium transition-colors"
            >
              Sign up here
            </button>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <RegisterComponent 
        onRegisterSuccess={handleAuthSuccess}
        onBackToLanding={handleBackToLanding}
      />
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 lg:left-1/4 lg:transform-none">
        <p className="text-slate-600 dark:text-slate-400 text-center">
          Already have an account?{" "}
          <button 
            onClick={() => setIsLogin(true)}
            className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 font-medium transition-colors"
          >
            Sign in here
          </button>
        </p>
      </div>
    </div>
  );
}