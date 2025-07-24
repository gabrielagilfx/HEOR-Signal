import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CategoryChatInterface } from "@/components/chat/category-chat-interface";
import type { NewsItem } from "@/hooks/useNewsAgents";

interface CategoryCardProps {
  category: string;
  newsItems: NewsItem[];
  isLoading: boolean;
  sessionId: string;
  onRefresh: () => void;
}

interface CategoryConfig {
  name: string;
  icon: string;
  color: string;
  iconColor: string;
  badgeColor: string;
  description: string;
}

const CATEGORY_CONFIGS: Record<string, CategoryConfig> = {
  regulatory: {
    name: "Regulatory Alerts",
    icon: "fas fa-gavel",
    color: "bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800",
    iconColor: "text-red-600 dark:text-red-400",
    badgeColor: "bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300",
    description: "FDA approvals, safety alerts, and compliance updates"
  },
  clinical: {
    name: "Clinical Trial Updates",
    icon: "fas fa-microscope", 
    color: "bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800",
    iconColor: "text-blue-600 dark:text-blue-400",
    badgeColor: "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300",
    description: "Clinical trial results, research findings, and medical breakthroughs"
  },
  market: {
    name: "Market Access & Payer News",
    icon: "fas fa-handshake",
    color: "bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800", 
    iconColor: "text-green-600 dark:text-green-400",
    badgeColor: "bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300",
    description: "Market access, payer policies, and reimbursement updates"
  },
  rwe: {
    name: "Real-World Evidence & Public Health",
    icon: "fas fa-chart-bar",
    color: "bg-purple-50 dark:bg-purple-950 border-purple-200 dark:border-purple-800",
    iconColor: "text-purple-600 dark:text-purple-400", 
    badgeColor: "bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300",
    description: "Real-world evidence, public health data, and epidemiological studies"
  }
};

export function CategoryCard({ category, newsItems, isLoading, sessionId, onRefresh }: CategoryCardProps) {
  const [showChat, setShowChat] = useState(false);
  const categoryConfig = CATEGORY_CONFIGS[category];

  const getNewItemsCount = () => {
    return newsItems.filter(item => item.isNew).length;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return "Just now";
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInHours < 48) return "Yesterday";
    return date.toLocaleDateString();
  };

  return (
    <>
      <Card className={`${categoryConfig.color} border-2 hover:shadow-lg transition-shadow duration-200`}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className={`p-3 rounded-lg ${categoryConfig.color.replace('bg-', 'bg-').replace('border-', 'border-')}`}>
                <i className={`${categoryConfig.icon} ${categoryConfig.iconColor} text-xl`}></i>
              </div>
              <div>
                <CardTitle className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {categoryConfig.name}
                </CardTitle>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {categoryConfig.description}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {getNewItemsCount() > 0 && (
                <Badge className={categoryConfig.badgeColor}>
                  {getNewItemsCount()} new
                </Badge>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowChat(true)}
                className="text-xs"
              >
                <i className="fas fa-comments mr-1"></i>
                Chat
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ) : newsItems.length > 0 ? (
            <div className="space-y-3">
              {newsItems.slice(0, 3).map((item) => (
                <div
                  key={item.id}
                  className="p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-150"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 line-clamp-2 mb-1">
                        {item.title}
                        {item.isNew && (
                          <Badge className="ml-2 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 text-xs">
                            NEW
                          </Badge>
                        )}
                      </h4>
                      <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2 mb-2">
                        {item.snippet}
                      </p>
                      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                        <span>{item.source}</span>
                        <span>{formatDate(item.date)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              
              {newsItems.length > 3 && (
                <div className="text-center pt-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onRefresh}
                    className="text-xs text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                  >
                    View all {newsItems.length} items
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-6">
              <i className={`${categoryConfig.icon} ${categoryConfig.iconColor} text-3xl mb-3`}></i>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No news items available for this category.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={onRefresh}
                className="mt-2"
              >
                <i className="fas fa-sync-alt mr-1"></i>
                Refresh
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {showChat && (
        <CategoryChatInterface
          sessionId={sessionId}
          category={category}
          onClose={() => setShowChat(false)}
        />
      )}
    </>
  );
}