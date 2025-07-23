import { useState, useEffect, useRef } from "react";
import { MessageBubble } from "@/components/chat/message-bubble";
import { TypingIndicator } from "@/components/chat/typing-indicator";
import { CategorySelection } from "@/components/chat/category-selection";
import { apiRequest } from "@/lib/queryClient";
import type { ChatMessage } from "@/types/chat";

interface UserStatus {
  session_id: string;
  onboarding_completed: boolean;
  selected_categories: string[];
  preference_expertise?: string;
}

interface OnboardingChatProps {
  sessionId: string;
  userStatus?: UserStatus;
  onDashboardReady: () => void;
}

interface ApiMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface MessagesResponse {
  success: boolean;
  messages: ApiMessage[];
}

export function OnboardingChat({ sessionId, userStatus, onDashboardReady }: OnboardingChatProps) {
  const onboardingCompleted = userStatus?.onboarding_completed ?? false;
  const hasPreferenceExpertise = !!(userStatus?.preference_expertise);
  
  const [inputMessage, setInputMessage] = useState("");
  const [showCategorySelection, setShowCategorySelection] = useState(!onboardingCompleted);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isSelectingCategories, setIsSelectingCategories] = useState(false);
  const [showCategoryLoader, setShowCategoryLoader] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(userStatus?.selected_categories || []);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Update category selection state when userStatus changes  
  useEffect(() => {
    setShowCategorySelection(!onboardingCompleted);
    setSelectedCategories(userStatus?.selected_categories || []);
  }, [onboardingCompleted, userStatus?.selected_categories]);

  // Load messages on mount and when sessionId changes
  useEffect(() => {
    if (sessionId) {
      loadMessages();
    }
  }, [sessionId]);

  const loadMessages = async () => {
    try {
      setIsLoading(true);
      console.log('Loading messages for session:', sessionId);
      const response = await apiRequest('GET', `/api/chat/messages/${sessionId}`, undefined);
      const data: MessagesResponse = await response.json();
      
      if (data.success && data.messages) {
        const transformedMessages: ChatMessage[] = [];
        
        // Safely transform each message
        for (const msg of data.messages) {
          if (msg && msg.id && msg.role && msg.content) {
            transformedMessages.push({
              id: msg.id,
              role: msg.role,
              content: msg.content,
              timestamp: msg.timestamp ? new Date(msg.timestamp) : new Date()
            });
          }
        }
        
        setMessages(transformedMessages);
        console.log('Messages loaded successfully:', transformedMessages.length, 'messages');
      } else {
        console.log('No messages found or API response failed');
        setMessages([]);
      }
      
      // Always notify parent that messages loading attempt is complete
      console.log('Dispatching messages-loaded event');
      window.dispatchEvent(new CustomEvent('messages-loaded'));
    } catch (error) {
      console.error('Error loading messages:', error);
      setMessages([]);
      // Still notify even on error to prevent infinite loading
      console.log('Dispatching messages-loaded event (error case)');
      window.dispatchEvent(new CustomEvent('messages-loaded'));
    } finally {
      setIsLoading(false);
    }
  };

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSendMessage = async () => {
    const trimmedMessage = inputMessage.trim();
    if (!trimmedMessage || isSending) return;

    try {
      setIsSending(true);
      setIsTyping(true);
      
      // Create and add user message immediately
      const newUserMessage: ChatMessage = {
        id: `temp-user-${Date.now()}`,
        role: 'user',
        content: trimmedMessage,
        timestamp: new Date()
      };
      
      // Add user message to existing messages (incremental addition)
      setMessages(prev => [...prev, newUserMessage]);
      
      // Clear input and reset textarea height
      setInputMessage("");
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
      
      const response = await apiRequest('POST', '/api/chat/send', {
        message: trimmedMessage,
        session_id: sessionId,
      });
      
      const result = await response.json();
      
      if (result.success) {
        // Add assistant response smoothly to existing messages
        const assistantMessage: ChatMessage = {
          id: result.message_id || `temp-assistant-${Date.now()}`,
          role: 'assistant',
          content: result.message,
          timestamp: new Date()
        };
        
        // Add assistant response to existing messages (user message already added)
        setMessages(prev => [...prev, assistantMessage]);
        
        // Check if this response indicates the dashboard should be shown
        if (result.show_dashboard) {
          console.log('Dashboard navigation triggered after expertise validation');
          // 3-second pause then navigate directly to dashboard
          setTimeout(() => {
            console.log('Setting showDashboard to true after 3 seconds');
            // Force a user status refresh first, then set dashboard after a brief delay
            window.dispatchEvent(new CustomEvent('refresh-user-status'));
            
            // Give time for status refresh, then show dashboard
            setTimeout(() => {
              onDashboardReady();
            }, 500);
          }, 3000);
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
      // Remove the temporary user message on error  
      const userMessageToRemove = newUserMessage;
      setMessages(prev => prev.filter(msg => msg.id !== userMessageToRemove.id));
    } finally {
      setIsSending(false);
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const autoResize = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 96) + 'px';
    }
  };

  const handleCategorySelection = async (categories: string[]) => {
    try {
      setIsSelectingCategories(true);
      
      const response = await apiRequest('POST', '/api/chat/select-categories', {
        categories,
        session_id: sessionId,
      });
      
      const result = await response.json();
      
      if (result.success) {
        setSelectedCategories(categories);
        setShowCategorySelection(false);
        setShowCategoryLoader(true);
        
        // Hide loader after a short delay
        setTimeout(() => {
          setShowCategoryLoader(false);
          // Trigger onboarding completed event to refresh user status
          window.dispatchEvent(new CustomEvent('onboarding-completed'));
        }, 1500);
      }
    } catch (error) {
      console.error('Error selecting categories:', error);
    } finally {
      setIsSelectingCategories(false);
    }
  };

  // Create welcome message
  const welcomeMessage: ChatMessage = {
    id: 'welcome',
    role: 'assistant',
    content: `Welcome to HEOR Signal! I'm here to help you set up your personalized dashboard for Health Economics and Outcomes Research insights.

To get started, please select the data categories you'd like to monitor. You can always adjust these preferences later in your dashboard settings.`,
    timestamp: new Date(),
  };

  // Create the full messages array safely
  const allMessages: ChatMessage[] = [];
  
  // Always show welcome message
  allMessages.push(welcomeMessage);
  
  // Add actual messages one by one to avoid spread operator issues
  if (messages && messages.length > 0) {
    for (const message of messages) {
      if (message && message.id) {
        allMessages.push(message);
      }
    }
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto">
        {/* Only show loading text if this is NOT the initial load (messages are empty) */}
        {isLoading && messages.length > 0 ? (
          <div className="flex justify-center py-8">
            <div className="text-gray-500 dark:text-gray-400">Loading conversation...</div>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
            {/* Header inside the card */}
            <div className="p-6 border-b border-gray-100 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                    <i className="fas fa-robot text-white text-sm"></i>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">HEOR Assistant</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Personalizing your dashboard experience</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2 text-sm">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-gray-600 dark:text-gray-300">Online</span>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="p-6 space-y-6 min-h-[500px]">
              {/* Always show initial welcome messages */}
              {allMessages.length === 0 && (
                <>
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                      <i className="fas fa-robot text-white text-sm"></i>
                    </div>
                    <div className="flex-1">
                      <div className="text-gray-700 dark:text-gray-300 leading-relaxed">
                        Welcome to <strong>HEOR Signal!</strong> I'm here to help you set up your personalized dashboard for health economics and outcomes research insights.
                      </div>
                      <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">now</div>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                      <i className="fas fa-robot text-white text-sm"></i>
                    </div>
                    <div className="flex-1">
                      <div className="text-gray-700 dark:text-gray-300 leading-relaxed">
                        To get started, please select the data categories you'd like to monitor. You can always adjust these preferences later in your dashboard settings.
                      </div>
                      <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">now</div>
                    </div>
                  </div>
                </>
              )}

              {/* Render all messages */}
              {allMessages.map((message) => (
                <MessageBubble
                  key={message.id}
                  message={message}
                />
              ))}
              
              {/* Typing indicator */}
              {isTyping && <TypingIndicator />}
              
              {/* Bottom spacer for auto-scroll */}
              <div ref={messagesEndRef} />
            </div>

            {/* Category Selection */}
            {showCategorySelection && (
              <div className="p-6 border-t border-gray-100 dark:border-gray-700">
                <CategorySelection
                  onConfirm={handleCategorySelection}
                  isLoading={isSelectingCategories}
                />
              </div>
            )}

            {/* Category Loader */}
            {showCategoryLoader && (
              <div className="p-6 border-t border-gray-100 dark:border-gray-700">
                <div className="flex items-center justify-center space-x-3 text-blue-600 dark:text-blue-400">
                  <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-sm font-medium">Setting up your preferences...</span>
                </div>
              </div>
            )}

            {/* Chat Input - Only show if onboarding is completed but not all preferences set */}
            {onboardingCompleted && !hasPreferenceExpertise && (
              <div className="p-6 border-t border-gray-100 dark:border-gray-700">
                <div className="flex items-end space-x-3">
                  <div className="flex-1">
                    <textarea
                      ref={textareaRef}
                      value={inputMessage}
                      onChange={(e) => {
                        setInputMessage(e.target.value);
                        autoResize();
                      }}
                      onKeyDown={handleKeyDown}
                      placeholder="Tell me about your expertise or preference in healthcare/HEOR..."
                      className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                      rows={1}
                      style={{ minHeight: '48px', maxHeight: '96px' }}
                      disabled={isSending}
                    />
                  </div>
                  <button
                    onClick={handleSendMessage}
                    disabled={!inputMessage.trim() || isSending}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0 flex items-center space-x-2"
                  >
                    {isSending ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Sending...</span>
                      </>
                    ) : (
                      <>
                        <i className="fas fa-paper-plane text-sm"></i>
                        <span>Send</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}