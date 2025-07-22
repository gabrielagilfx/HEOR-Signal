export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date | string;
}

export interface User {
  sessionId: string;
  onboardingCompleted: boolean;
  selectedCategories: string[];
}

export interface CategoryOption {
  id: string;
  name: string;
  description: string;
  icon: string;
}

export interface ChatResponse {
  success: boolean;
  message: string;
  messageId?: string;
}

export interface CategorySelectionResponse {
  success: boolean;
  message: string;
  categories: string[];
  onboardingCompleted: boolean;
}
