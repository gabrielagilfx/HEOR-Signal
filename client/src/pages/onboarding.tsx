import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ChatInterface } from "@/components/chat/chat-interface";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface UserStatus {
  session_id: string;
  onboarding_completed: boolean;
  selected_categories: string[];
}

export default function Onboarding() {
  const [sessionId, setSessionId] = useState<string>("");

  // Initialize user session
  const initUserMutation = useMutation({
    mutationFn: async () => {
      try {
        const response = await apiRequest('POST', '/api/user/init', {});
        const data = await response.json();
        console.log('User init response:', data);
        return data as UserStatus;
      } catch (error) {
        console.error('User init error:', error);
        throw error;
      }
    },
    onSuccess: (data) => {
      console.log('Setting session ID:', data.session_id);
      setSessionId(data.session_id);
    },
    onError: (error) => {
      console.error('User init mutation error:', error);
    }
  });

  // Get user status
  const { data: userStatus, isLoading: isLoadingStatus } = useQuery<UserStatus>({
    queryKey: ['/api/user/status', sessionId],
    enabled: !!sessionId,
  });

  useEffect(() => {
    // Initialize user on component mount
    initUserMutation.mutate();
  }, []);

  if (initUserMutation.isPending || isLoadingStatus || !sessionId) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <Card className="w-full max-w-md">
            <CardContent className="p-6 space-y-4">
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (initUserMutation.error) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <Card className="w-full max-w-md">
            <CardContent className="p-6 text-center">
              <div className="text-red-500 mb-4">
                <i className="fas fa-exclamation-circle text-4xl"></i>
              </div>
              <h2 className="text-xl font-semibold text-foreground mb-2">
                Connection Error
              </h2>
              <p className="text-muted-foreground">
                Unable to initialize your session. Please refresh the page to try again.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col overflow-hidden">
      <Header />
      <ChatInterface 
        sessionId={sessionId} 
        onboardingCompleted={userStatus?.onboarding_completed || false}
      />
    </div>
  );
}

function Header() {
  return (
    <header className="bg-card border-b border-border px-6 py-4 flex-shrink-0">
      <div className="flex items-center justify-between max-w-6xl mx-auto">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary/80 rounded-lg flex items-center justify-center shadow-lg">
            <i className="fas fa-chart-line text-white text-lg"></i>
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">HEOR Signal</h1>
            <p className="text-xs text-muted-foreground font-medium">
              Professional Dashboard Setup
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <div className="hidden sm:flex items-center text-sm text-muted-foreground">
            <i className="fas fa-shield-alt text-green-500 mr-2"></i>
            <span>Secure Setup</span>
          </div>
        </div>
      </div>
    </header>
  );
}
