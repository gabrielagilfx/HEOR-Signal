import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { useNewsAgents, UserPreferences, NewsItem } from "@/hooks/useNewsAgents";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/contexts/auth-context";
import { useLocation } from "wouter";
import { LogOut } from "lucide-react";
import agilLogo from "@assets/Logo Primary_1753368301220.png";

interface DashboardProps {
  selectedCategories: string[];
  sessionId: string;
}

// NewsItem interface now imported from useNewsAgents hook

// Mock data structure - will be replaced with real API calls later
const CATEGORY_CONFIGS = {
  regulatory: {
    name: "Regulatory Alerts",
    icon: "fas fa-gavel",
    color: "bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800",
    iconColor: "text-red-600 dark:text-red-400",
    badgeColor: "bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300"
  },
  clinical: {
    name: "Clinical Trial Updates",
    icon: "fas fa-microscope", 
    color: "bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800",
    iconColor: "text-blue-600 dark:text-blue-400",
    badgeColor: "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300"
  },
  market: {
    name: "Market Access & Payer News",
    icon: "fas fa-handshake",
    color: "bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800", 
    iconColor: "text-green-600 dark:text-green-400",
    badgeColor: "bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300"
  },
  rwe: {
    name: "Real-World Evidence & Public Health",
    icon: "fas fa-chart-bar",
    color: "bg-purple-50 dark:bg-purple-950 border-purple-200 dark:border-purple-800",
    iconColor: "text-purple-600 dark:text-purple-400", 
    badgeColor: "bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300"
  }
};

export default function HEORDashboard({ selectedCategories, sessionId }: DashboardProps) {
  const { newsData, loading, error, fetchPersonalizedNews } = useNewsAgents();
  const { logout } = useAuth();
  const [, setLocation] = useLocation();
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  useEffect(() => {
    if (selectedCategories.length > 0 && sessionId) {
      // Use personalized news endpoint that fetches user preferences from database
      fetchPersonalizedNews(sessionId);
    }
  }, [selectedCategories, sessionId, fetchPersonalizedNews]);

  const handleRefresh = async () => {
    if (selectedCategories.length > 0 && sessionId) {
      await fetchPersonalizedNews(sessionId);
      setLastUpdated(new Date());
    }
  };

  const getNewItemsCount = () => {
    if (!newsData) return 0;
    let count = 0;
    selectedCategories.forEach(category => {
      const items = newsData[category as keyof typeof newsData];
      if (Array.isArray(items)) {
        count += items.filter(item => item.is_new).length;
      }
    });
    return count;
  };

  const clearError = () => {
    // Function to clear error - would be implemented if needed
  };

  const handleNewSession = () => {
    // Navigate to home page with new session parameter
    window.location.href = '/?new_session=true';
  };

  const handleLogout = () => {
    logout();
    setLocation('/');
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <img 
                src={agilLogo} 
                alt="AGILf(x)" 
                className="w-20 h-20 object-contain" 
              />
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">HEOR Signal</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  AI-powered healthcare insights and regulatory monitoring
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Last updated: {lastUpdated.toLocaleTimeString()}
              </div>
              <Button 
                onClick={handleRefresh}
                variant="outline"
                size="sm"
                disabled={loading}
                className="hover:bg-blue-50 dark:hover:bg-blue-900/20"
              >
                <i className={`fas fa-sync-alt mr-2 ${loading ? 'animate-spin' : ''}`}></i>
                Refresh
              </Button>
              <Button 
                onClick={handleNewSession}
                variant="outline" 
                size="sm"
                className="hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                <i className="fas fa-plus mr-2"></i>
                New Session
              </Button>
              <Button 
                onClick={handleLogout}
                variant="outline" 
                size="sm"
                className="hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Error Display */}
        {error && (
          <Alert className="mb-6 border-red-200 bg-red-50 dark:bg-red-950">
            <AlertDescription className="text-red-700 dark:text-red-300">
              <div className="flex items-center justify-between">
                <span>{error}</span>
                <Button onClick={clearError} variant="ghost" size="sm">
                  <i className="fas fa-times"></i>
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Personalization Status */}
        <Alert className="mb-6 border-green-200 bg-green-50 dark:bg-green-950">
          <AlertDescription className="text-green-700 dark:text-green-300">
            <div className="flex items-center space-x-2">
              <i className="fas fa-user-check text-green-600"></i>
              <span>Showing personalized news based on your expertise and selected categories</span>
            </div>
          </AlertDescription>
        </Alert>
        {/* Dashboard Stats */}
        <div className="mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border-blue-200 dark:border-blue-800">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Active Categories</p>
                    <p className="text-3xl font-bold text-blue-900 dark:text-blue-100">{selectedCategories.length}</p>
                  </div>
                  <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
                    <i className="fas fa-layer-group text-white text-lg"></i>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 border-green-200 dark:border-green-800">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-green-600 dark:text-green-400">New Updates</p>
                    <p className="text-3xl font-bold text-green-900 dark:text-green-100">{getNewItemsCount()}</p>
                  </div>
                  <div className="w-12 h-12 bg-green-600 rounded-lg flex items-center justify-center">
                    <i className="fas fa-bell text-white text-lg"></i>
                  </div>
                </div>
              </CardContent>
            </Card>



            <Card className="bg-gradient-to-r from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 border-purple-200 dark:border-purple-800">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-purple-600 dark:text-purple-400">Processing Time</p>
                    <p className="text-lg font-semibold text-purple-900 dark:text-purple-100">
                      {newsData?.processing_time ? `${newsData.processing_time.toFixed(1)}s` : 'N/A'}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center">
                    <i className="fas fa-clock text-white text-lg"></i>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Category Sections */}
        <div className="space-y-8">
          {selectedCategories.map((categoryId) => {
            const config = CATEGORY_CONFIGS[categoryId as keyof typeof CATEGORY_CONFIGS];
            const newsItems = newsData?.[categoryId as keyof typeof newsData];
            const items = Array.isArray(newsItems) ? newsItems : [];
            
            if (!config) return null;

            return (
              <Card key={categoryId} className={`${config.color} border-2`}>
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center space-x-3">
                      <div className={`w-10 h-10 bg-white dark:bg-gray-800 rounded-lg flex items-center justify-center shadow-sm`}>
                        <i className={`${config.icon} ${config.iconColor} text-lg`}></i>
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">{config.name}</h2>
                        <p className="text-sm text-gray-600 dark:text-gray-400 font-normal">
                          {items.length} updates available
                        </p>
                      </div>
                    </CardTitle>
                    
                    {items.some(item => item.is_new) && (
                      <Badge className={`${config.badgeColor} border-0`}>
                        <i className="fas fa-star mr-1"></i>
                        New Updates
                      </Badge>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="pt-0">
                  {loading ? (
                    <div className="space-y-4">
                      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                        <Skeleton className="h-5 w-3/4 mb-2" />
                        <Skeleton className="h-4 w-full mb-2" />
                        <Skeleton className="h-3 w-1/4" />
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {items.map((item, index) => (
                        <div key={item.id} className="bg-white dark:bg-gray-800 rounded-lg p-5 border border-gray-200 dark:border-gray-700 hover:shadow-md transition-all duration-200 hover:border-gray-300 dark:hover:border-gray-600">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2 flex items-center">
                                {item.is_new && (
                                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                                )}
                                <a href={item.url} className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors" target="_blank" rel="noopener noreferrer">
                                  {item.title}
                                </a>
                              </h3>
                              <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed mb-3">
                                {item.snippet}
                              </p>
                              <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                                <div className="flex items-center space-x-4">
                                  <span className="flex items-center">
                                    <i className="fas fa-building mr-1"></i>
                                    {item.source}
                                  </span>
                                  <span className="flex items-center">
                                    <i className="fas fa-clock mr-1"></i>
                                    {item.date}
                                  </span>
                                  <span className="flex items-center">
                                    <i className="fas fa-star mr-1"></i>
                                    Relevance: {(item.relevance_score * 100).toFixed(0)}%
                                  </span>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 px-2 text-xs hover:bg-gray-100 dark:hover:bg-gray-700"
                                  onClick={() => window.open(item.url, '_blank')}
                                >
                                  <i className="fas fa-external-link-alt mr-1"></i>
                                  Read More
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {selectedCategories.length === 0 && (
          <Card className="text-center py-12">
            <CardContent>
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="fas fa-inbox text-2xl text-gray-400"></i>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                No Categories Selected
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Please select data categories to start monitoring HEOR signals.
              </p>
              <Button onClick={handleNewSession} className="bg-blue-600 hover:bg-blue-700">
                <i className="fas fa-cog mr-2"></i>
                Configure Categories
              </Button>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}