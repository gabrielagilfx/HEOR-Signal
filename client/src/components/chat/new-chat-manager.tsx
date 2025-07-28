import React, { useState, useEffect } from 'react';
import { SimpleChatInterface } from './simple-chat-interface';
import { useAuth } from '@/contexts/AuthContext';
import { apiRequest } from '@/lib/queryClient';

interface NewChatManagerProps {
  onBack: () => void;
}

interface UserStatus {
  session_id: string;
  onboarding_completed: boolean;
  selected_categories: string[];
  preference_expertise?: string;
}

export function NewChatManager({ onBack }: NewChatManagerProps) {
  const { session } = useAuth();
  const [sessionId, setSessionId] = useState<string>("");
  const [userStatus, setUserStatus] = useState<UserStatus | null>(null);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Initialize new chat session
  useEffect(() => {
    const initializeNewChat = async () => {
      if (!session?.sessionId) return;
      
      try {
        setIsLoading(true);
        
        // Create a new chat session
        const response = await apiRequest('POST', '/api/user/init', {
          session_id: session.sessionId
        });
        const data = await response.json();
        
        setSessionId(data.session_id);
        setUserStatus({
          session_id: data.session_id,
          onboarding_completed: false, // Reset for new chat
          selected_categories: [],
          preference_expertise: undefined
        });
        setIsInitialized(true);
      } catch (error) {
        console.error('Error initializing new chat:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeNewChat();
  }, [session?.sessionId]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Setting up your new conversation...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col overflow-hidden">
      <SimpleChatInterface 
        sessionId={sessionId} 
        userStatus={userStatus || undefined}
        onStartChat={() => {}} // No-op since we're already started
        hasStartedChat={true}
        isNewChat={true} // Flag to show different message
        onBack={onBack}
      />
    </div>
  );
}