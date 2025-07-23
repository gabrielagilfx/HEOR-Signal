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

export interface NewsData {
  regulatory: NewsItem[];
  clinical: NewsItem[];
  market: NewsItem[];
  rwe: NewsItem[];
  processing_time: number;
  timestamp: string;
}

export interface UseNewsAgentsReturn {
  newsData: NewsData | null;
  loading: boolean;
  error: string | null;
  fetchNews: (preferences: UserPreferences) => Promise<void>;
  fetchPersonalizedNews: (sessionId: string) => Promise<void>;
  fetchCategoryNews: (category: string, preferences: UserPreferences) => Promise<NewsItem[]>;
}

export const useNewsAgents = (): UseNewsAgentsReturn => {
  const [newsData, setNewsData] = useState<NewsData | null>(null);
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
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setNewsData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchPersonalizedNews = useCallback(async (sessionId: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/news/fetch-personalized', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ session_id: sessionId }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setNewsData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCategoryNews = useCallback(async (
    category: string, 
    preferences: UserPreferences
  ): Promise<NewsItem[]> => {
    try {
      const response = await fetch(`/api/news/fetch-category/${category}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(preferences),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.news_items || [];
    } catch (err) {
      console.error(`Error fetching ${category} news:`, err);
      return [];
    }
  }, []);

  return {
    newsData,
    loading,
    error,
    fetchNews,
    fetchPersonalizedNews,
    fetchCategoryNews,
  };
};