import { useState, useCallback } from 'react';

export interface UserPreferences {
  expertise_areas: string[];
  therapeutic_areas: string[];
  regions: string[];
  keywords: string[];
  news_recency_days: number;
}

export interface NewsItem {
  id: string;
  title: string;
  snippet: string;
  source: string;
  date: string;
  category: string;
  url: string;
  relevance_score: number;
  is_new: boolean;
}

export interface NewsAggregateResponse {
  regulatory: NewsItem[];
  clinical: NewsItem[];
  market: NewsItem[];
  rwe: NewsItem[];
  processing_time: number;
  timestamp: string;
}

export interface UseNewsAgentsReturn {
  newsData: NewsAggregateResponse | null;
  loading: boolean;
  error: string | null;
  fetchNews: (preferences: UserPreferences) => Promise<void>;
  fetchCategoryNews: (category: string, preferences: UserPreferences) => Promise<NewsItem[]>;
  testApis: () => Promise<{ serp_api: string; nih_api: string }>;
  clearError: () => void;
}

export const useNewsAgents = (): UseNewsAgentsReturn => {
  const [newsData, setNewsData] = useState<NewsAggregateResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchNews = useCallback(async (preferences: UserPreferences) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/news/fetch-parallel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(preferences),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      const data: NewsAggregateResponse = await response.json();
      setNewsData(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch news';
      setError(errorMessage);
      console.error('Error fetching news:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCategoryNews = useCallback(async (
    category: string, 
    preferences: UserPreferences
  ): Promise<NewsItem[]> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/news/fetch-category/${category}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(preferences),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.news_items;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch category news';
      setError(errorMessage);
      console.error('Error fetching category news:', err);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const testApis = useCallback(async () => {
    try {
      const response = await fetch('/api/news/test-apis');
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return {
        serp_api: data.serp_api,
        nih_api: data.nih_api
      };
    } catch (err) {
      console.error('Error testing APIs:', err);
      return {
        serp_api: 'error',
        nih_api: 'error'
      };
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    newsData,
    loading,
    error,
    fetchNews,
    fetchCategoryNews,
    testApis,
    clearError,
  };
};