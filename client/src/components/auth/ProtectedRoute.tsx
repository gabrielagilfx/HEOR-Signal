import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { LoadingScreen } from '@/components/ui/loading-screen';
import { authService } from '@/lib/auth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function ProtectedRoute({ children, fallback }: ProtectedRouteProps) {
  const { isAuthenticated, loading } = useAuth();
  const [isValidating, setIsValidating] = useState(true);
  const [isValid, setIsValid] = useState(false);

  useEffect(() => {
    const validateAuth = async () => {
      if (isAuthenticated) {
        // Validate session with server
        const isValid = await authService.validateSession();
        setIsValid(isValid);
      } else {
        setIsValid(false);
      }
      setIsValidating(false);
    };

    if (!loading) {
      validateAuth();
    }
  }, [isAuthenticated, loading]);

  // Show loading while validating
  if (loading || isValidating) {
    return <LoadingScreen message="Validating session..." />;
  }

  // Show fallback or redirect if not authenticated
  if (!isValid) {
    if (fallback) {
      return <>{fallback}</>;
    }
    // Redirect to login
    window.location.href = '/';
    return null;
  }

  // Render protected content
  return <>{children}</>;
}