import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { SessionManager, UserSession } from "@/lib/session";
import { LoadingScreen } from "@/components/ui/loading-screen";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiRequest } from "@/lib/queryClient";

interface DashboardData {
  news_items: Array<{
    title: string;
    summary: string;
    source: string;
    date: string;
    category: string;
  }>;
  alerts_count: number;
  categories: string[];
}

export default function DashboardPage() {
  const [, setLocation] = useLocation();
  const [userSession, setUserSession] = useState<UserSession | null>(null);

  useEffect(() => {
    // Check for existing session
    const session = SessionManager.getSession();
    if (session) {
      setUserSession(session);
      // If user hasn't completed onboarding, redirect to chat
      if (!session.onboarding_completed) {
        setLocation('/chat');
      }
    } else {
      // No session, redirect to auth
      setLocation('/auth');
    }
  }, [setLocation]);

  // Fetch dashboard data
  const { data: dashboardData, isLoading } = useQuery<DashboardData>({
    queryKey: ['/api/dashboard'],
    enabled: !!userSession?.session_id,
  });

  const handleLogout = async () => {
    try {
      await apiRequest('POST', '/api/auth/logout');
      SessionManager.clearSession();
      setLocation('/');
    } catch (error) {
      console.error('Logout error:', error);
      // Clear session anyway for security
      SessionManager.clearSession();
      setLocation('/');
    }
  };

  const handleChatRedirect = () => {
    setLocation('/chat');
  };

  if (!userSession || isLoading) {
    return <LoadingScreen message="Loading your dashboard..." />;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">HEOR Signal Dashboard</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Welcome back, {userSession.name}
              </p>
            </div>
            
            <div className="flex items-center space-x-4">
              <Button onClick={handleChatRedirect} variant="outline" size="sm">
                Chat with Hero
              </Button>
              <Button onClick={handleLogout} variant="outline" size="sm">
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {/* Stats Cards */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Active Alerts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {dashboardData?.alerts_count || 0}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Tracked Categories
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {userSession.selected_categories.length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Expertise Area
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-gray-900 dark:text-gray-100">
                {userSession.preference_expertise || 'Not specified'}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* News Section */}
        <Card>
          <CardHeader>
            <CardTitle>Latest HEOR News & Updates</CardTitle>
          </CardHeader>
          <CardContent>
            {dashboardData?.news_items && dashboardData.news_items.length > 0 ? (
              <div className="space-y-4">
                {dashboardData.news_items.map((item, index) => (
                  <div key={index} className="border-l-4 border-blue-500 pl-4 py-2">
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
                      {item.title}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                      {item.summary}
                    </p>
                    <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                      <span>{item.source}</span>
                      <span className="mx-2">•</span>
                      <span>{item.date}</span>
                      <span className="mx-2">•</span>
                      <span className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                        {item.category}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <p>No recent news available. Start chatting with Hero to get personalized updates.</p>
                <Button onClick={handleChatRedirect} className="mt-4">
                  Start Chat
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Categories Section */}
        {userSession.selected_categories.length > 0 && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Your Selected Categories</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {userSession.selected_categories.map((category, index) => (
                  <span
                    key={index}
                    className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-3 py-1 rounded-full text-sm"
                  >
                    {category}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}