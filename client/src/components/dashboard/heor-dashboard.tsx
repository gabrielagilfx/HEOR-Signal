import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { useNewsAgents, UserPreferences, NewsItem } from "@/hooks/useNewsAgents";
import { Alert, AlertDescription } from "@/components/ui/alert";

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

// Mock news data - will be replaced with real API data
const MOCK_NEWS: Record<string, NewsItem[]> = {
  regulatory: [
    {
      id: "reg-1",
      title: "FDA Approves New Oncology Drug for Rare Cancer Treatment",
      snippet: "The FDA has approved a breakthrough therapy designation for a novel oncology treatment targeting rare solid tumors...",
      source: "FDA Drug Approvals",
      date: "2 hours ago",
      category: "regulatory",
      isNew: true,
      url: "#"
    },
    {
      id: "reg-2", 
      title: "Safety Alert: Cardiovascular Drug Recall Expanded",
      snippet: "The FDA has expanded a voluntary recall of cardiovascular medications due to potential contamination concerns...",
      source: "FDA Safety Alerts",
      date: "4 hours ago",
      category: "regulatory",
      url: "#"
    },
    {
      id: "reg-3",
      title: "Updated Labeling Requirements for Diabetes Medications",
      snippet: "New labeling requirements now mandate additional safety warnings for certain classes of diabetes treatments...",
      source: "FDA Labeling Updates",
      date: "1 day ago", 
      category: "regulatory",
      url: "#"
    }
  ],
  clinical: [
    {
      id: "clin-1",
      title: "Phase III Trial Results: Novel Alzheimer's Treatment Shows Promise",
      snippet: "A large-scale Phase III clinical trial demonstrates significant cognitive improvements in early-stage Alzheimer's patients...",
      source: "ClinicalTrials.gov",
      date: "3 hours ago",
      category: "clinical",
      isNew: true,
      url: "#"
    },
    {
      id: "clin-2",
      title: "COVID-19 Vaccine Booster Study Enrollment Complete",
      snippet: "Multi-center study evaluating next-generation COVID-19 vaccine boosters has completed patient enrollment...",
      source: "ClinicalTrials.gov", 
      date: "6 hours ago",
      category: "clinical",
      url: "#"
    },
    {
      id: "clin-3",
      title: "Rare Disease Trial Suspended Due to Safety Concerns",
      snippet: "A Phase II trial for a rare genetic disorder treatment has been temporarily suspended pending safety review...",
      source: "ClinicalTrials.gov",
      date: "1 day ago",
      category: "clinical",
      url: "#"
    }
  ],
  market: [
    {
      id: "mkt-1",
      title: "Major PBM Updates Formulary Coverage for Specialty Drugs",
      snippet: "Express Scripts announces significant changes to specialty drug coverage, affecting over 2 million members...", 
      source: "PBM Policy Updates",
      date: "1 hour ago",
      category: "market",
      isNew: true,
      url: "#"
    },
    {
      id: "mkt-2",
      title: "ICER Releases Draft Evidence Report on Cancer Immunotherapies",
      snippet: "New cost-effectiveness analysis examines the value of checkpoint inhibitor treatments across multiple cancer types...",
      source: "ICER Reports",
      date: "5 hours ago", 
      category: "market",
      url: "#"
    },
    {
      id: "mkt-3",
      title: "CMS Proposes Changes to Medicare Part D Coverage",
      snippet: "Centers for Medicare & Medicaid Services releases proposal for expanded Part D coverage of innovative therapies...",
      source: "CMS Policy",
      date: "2 days ago",
      category: "market", 
      url: "#"
    }
  ],
  rwe: [
    {
      id: "rwe-1",
      title: "CDC Reports Significant Decline in Heart Disease Mortality",
      snippet: "Latest CDC WONDER data shows a 15% reduction in cardiovascular mortality rates over the past five years...",
      source: "CDC WONDER",
      date: "2 hours ago",
      category: "rwe",
      isNew: true,
      url: "#"
    },
    {
      id: "rwe-2",
      title: "AHRQ Study: Healthcare Quality Improvements in Rural Areas",
      snippet: "New research demonstrates measurable improvements in healthcare access and quality in underserved rural communities...",
      source: "AHRQ Research",
      date: "7 hours ago",
      category: "rwe",
      url: "#"
    },
    {
      id: "rwe-3",
      title: "Real-World Outcomes Study: Diabetes Management Technologies",
      snippet: "Large-scale analysis of electronic health records reveals significant improvements in diabetes control with new monitoring technologies...",
      source: "RWE Database",
      date: "1 day ago",
      category: "rwe",
      url: "#"
    }
  ]
};

export function HEORDashboard({ selectedCategories, sessionId }: DashboardProps) {
  const { newsData, loading, error, fetchPersonalizedNews } = useNewsAgents();
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
      const items = newsData[category as keyof typeof newsData] || [];
      count += items.filter(item => item.is_new).length;
    });
    return count;
  };

  const handleNewSession = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <i className="fas fa-chart-line text-white"></i>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">HEOR Signal</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Health Economics & Outcomes Research Dashboard
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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
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

            <Card className="bg-gradient-to-r from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900 border-orange-200 dark:border-orange-800">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-orange-600 dark:text-orange-400">Total Alerts</p>
                    <p className="text-3xl font-bold text-orange-900 dark:text-orange-100">
                      {selectedCategories.reduce((total, cat) => total + (MOCK_NEWS[cat]?.length || 0), 0)}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-orange-600 rounded-lg flex items-center justify-center">
                    <i className="fas fa-exclamation-triangle text-white text-lg"></i>
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
            const newsItems = newsData?.[categoryId as keyof typeof newsData] || [];
            
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
                          {newsItems.length} updates available
                        </p>
                      </div>
                    </CardTitle>
                    
                    {newsItems.some(item => item.is_new) && (
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
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                          <Skeleton className="h-5 w-3/4 mb-2" />
                          <Skeleton className="h-4 w-full mb-2" />
                          <Skeleton className="h-3 w-1/4" />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {newsItems.map((item, index) => (
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
                                    {new Date(item.date).toLocaleDateString()}
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