import { useEffect } from "react";
import { HEORDashboard } from "@/components/dashboard/heor-dashboard";
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

export default function Dashboard() {
  const { isAuthenticated, userStatus, sessionId, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated && !isLoading) {
      setLocation('/auth?mode=login');
    }
  }, [isAuthenticated, isLoading, setLocation]);

  // Redirect if user hasn't completed onboarding
  useEffect(() => {
    if (isAuthenticated && userStatus && !userStatus.onboarding_completed) {
      setLocation('/chat');
    }
  }, [isAuthenticated, userStatus, setLocation]);

  // Show loading if authenticating or loading user status
  if (isLoading || !userStatus) {
    return <LoadingScreen message="Loading your dashboard..." />;
  }

  // Show error if not authenticated (shouldn't happen due to redirect above)
  if (!isAuthenticated || !sessionId) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <div className="flex-1 flex items-center justify-center">
          <Card className="w-full max-w-md">
            <CardContent className="p-6 text-center">
              <div className="text-red-500 mb-4">
                <i className="fas fa-exclamation-circle text-4xl"></i>
              </div>
              <h2 className="text-xl font-semibold text-foreground mb-2">
                Authentication Required
              </h2>
              <p className="text-muted-foreground mb-4">
                Please sign in to access your dashboard.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <HEORDashboard 
        sessionId={sessionId} 
        userStatus={userStatus}
      />
    </div>
  );
}