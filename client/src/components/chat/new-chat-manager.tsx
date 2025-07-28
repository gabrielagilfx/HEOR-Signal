import React, { useState } from 'react';
import { NewChatLanding } from './new-chat-landing';
import { UserPreferenceSelector } from './user-preference-selector';
import { NewChatInterface } from './new-chat-interface';

type ChatState = 'landing' | 'preferences' | 'chat';

interface NewChatManagerProps {
  onBack: () => void;
}

interface ChatPreferences {
  selected_categories: string[];
  preference_expertise?: string;
  conversation_title?: string;
}

interface ThreadData {
  threadId: string;
  threadTitle: string;
  selectedCategories: string[];
  preferenceExpertise?: string;
}

export function NewChatManager({ onBack }: NewChatManagerProps) {
  const [currentState, setCurrentState] = useState<ChatState>('landing');
  const [preferences, setPreferences] = useState<ChatPreferences | null>(null);
  const [threadData, setThreadData] = useState<ThreadData | null>(null);

  const handleStartNewChat = (newPreferences: ChatPreferences) => {
    setPreferences(newPreferences);
    
    // If preferences are complete, go directly to chat
    if (newPreferences.selected_categories.length > 0 && newPreferences.preference_expertise) {
      // Create thread data
      const thread: ThreadData = {
        threadId: Date.now().toString(), // This will be replaced with actual thread ID from API
        threadTitle: newPreferences.conversation_title || 'New Conversation',
        selectedCategories: newPreferences.selected_categories,
        preferenceExpertise: newPreferences.preference_expertise
      };
      setThreadData(thread);
      setCurrentState('chat');
    } else {
      // Go to preference selector
      setCurrentState('preferences');
    }
  };

  const handlePreferencesSelected = (selectedPreferences: ChatPreferences) => {
    setPreferences(selectedPreferences);
    
    // Create thread data
    const thread: ThreadData = {
      threadId: Date.now().toString(), // This will be replaced with actual thread ID from API
      threadTitle: selectedPreferences.conversation_title || 'New Conversation',
      selectedCategories: selectedPreferences.selected_categories,
      preferenceExpertise: selectedPreferences.preference_expertise
    };
    setThreadData(thread);
    setCurrentState('chat');
  };

  const handleBackToLanding = () => {
    setCurrentState('landing');
    setPreferences(null);
    setThreadData(null);
  };

  const handleBackToPreferences = () => {
    setCurrentState('preferences');
    setThreadData(null);
  };

  const handleBackToMain = () => {
    onBack();
  };

  return (
    <div className="h-screen">
      {currentState === 'landing' && (
        <NewChatLanding
          onStartNewChat={handleStartNewChat}
          onBack={handleBackToMain}
        />
      )}

      {currentState === 'preferences' && (
        <UserPreferenceSelector
          onPreferencesSelected={handlePreferencesSelected}
          onBack={handleBackToLanding}
          initialPreferences={preferences}
        />
      )}

      {currentState === 'chat' && threadData && (
        <NewChatInterface
          threadId={threadData.threadId}
          threadTitle={threadData.threadTitle}
          selectedCategories={threadData.selectedCategories}
          preferenceExpertise={threadData.preferenceExpertise}
          onBack={handleBackToPreferences}
        />
      )}
    </div>
  );
}