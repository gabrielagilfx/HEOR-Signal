import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { MessageBubble } from "./message-bubble";
import { TypingIndicator } from "./typing-indicator";
import { CategorySelection } from "./category-selection";
import { apiRequest } from "@/lib/queryClient";
import type { ChatMessage } from "@/types/chat";

interface SimpleChatInterfaceProps {
  sessionId: string;
  onboardingCompleted: boolean;
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

export function SimpleChatInterface({ sessionId, onboardingCompleted }: SimpleChatInterfaceProps) {
  const [inputMessage, setInputMessage] = useState("");
  const [showCategorySelection, setShowCategorySelection] = useState(!onboardingCompleted);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isSelectingCategories, setIsSelectingCategories] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Update category selection state when onboardingCompleted changes
  useEffect(() => {
    setShowCategorySelection(!onboardingCompleted);
  }, [onboardingCompleted]);

  // Load messages on mount and when sessionId changes
  useEffect(() => {
    if (sessionId) {
      loadMessages();
    }
  }, [sessionId]);

  const loadMessages = async () => {
    try {
      setIsLoading(true);
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
      }
    } catch (error) {
      console.error('Error loading messages:', error);
      setMessages([]);
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
    if (!inputMessage.trim() || isSending) {
      return;
    }

    try {
      setIsSending(true);
      setIsTyping(true);
      
      const response = await apiRequest('POST', '/api/chat/send', {
        message: inputMessage.trim(),
        session_id: sessionId,
      });
      
      const result = await response.json();
      
      if (result.success) {
        setInputMessage("");
        if (textareaRef.current) {
          textareaRef.current.style.height = 'auto';
        }
        // Reload messages to get the latest conversation
        await loadMessages();
      }
    } catch (error) {
      console.error('Error sending message:', error);
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
        setShowCategorySelection(false);
        // Reload messages to get the confirmation message
        await loadMessages();
        // Trigger parent component to refetch user status
        window.dispatchEvent(new CustomEvent('onboarding-completed'));
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
    content: `Welcome to **HEOR Signal**! I'm here to help you set up your personalized dashboard for Health Economics and Outcomes Research insights.

To get started, please select the data categories you'd like to monitor. You can always adjust these preferences later in your dashboard settings.`,
    timestamp: new Date(),
  };

  // Create the full messages array safely
  const allMessages: ChatMessage[] = [];
  
  // Only show welcome message if onboarding is not completed
  if (!onboardingCompleted) {
    allMessages.push(welcomeMessage);
  }
  
  // Add actual messages one by one to avoid spread operator issues
  if (messages && messages.length > 0) {
    for (const message of messages) {
      if (message && message.id) {
        allMessages.push(message);
      }
    }
  }

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex-shrink-0">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <i className="fas fa-robot text-white text-sm"></i>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">HEOR Signal</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">Onboarding Assistant</p>
            </div>
          </div>
          <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
            <i className="fas fa-shield-alt text-green-500"></i>
            <span>Secure Session</span>
          </div>
        </div>
      </div>

      {/* Chat Messages Area */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="max-w-4xl mx-auto">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="text-gray-500 dark:text-gray-400">Loading conversation...</div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Always show initial welcome messages */}
              {allMessages.length === 0 && (
                <>
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center flex-shrink-0">
                      <i className="fas fa-robot text-blue-600 dark:text-blue-400 text-sm"></i>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">HEOR Assistant</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">Personalizing your dashboard experience</span>
                      </div>
                      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
                        <p className="text-gray-700 dark:text-gray-300 mb-0">
                          Welcome to <strong>HEOR Signal!</strong> I'm here to help you set up your personalized dashboard for health economics and outcomes research insights.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center flex-shrink-0">
                      <i className="fas fa-robot text-blue-600 dark:text-blue-400 text-sm"></i>
                    </div>
                    <div className="flex-1">
                      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
                        <p className="text-gray-700 dark:text-gray-300 mb-0">
                          To get started, please select the data categories you'd like to monitor on your dashboard. You can always modify these preferences later:
                        </p>
                      </div>
                    </div>
                  </div>
                </>
              )}
              
              {/* Display actual chat messages */}
              {allMessages.map((message, index) => (
                <div key={`${message.id}-${index}`}>
                  <div className={`flex items-start space-x-3 ${message.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      message.role === 'user' 
                        ? 'bg-gray-200 dark:bg-gray-600' 
                        : 'bg-blue-100 dark:bg-blue-900'
                    }`}>
                      <i className={`text-sm ${
                        message.role === 'user' 
                          ? 'fas fa-user text-gray-600 dark:text-gray-300' 
                          : 'fas fa-robot text-blue-600 dark:text-blue-400'
                      }`}></i>
                    </div>
                    <div className="flex-1">
                      {message.role === 'assistant' && (
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">HEOR Assistant</span>
                        </div>
                      )}
                      <div className={`rounded-lg border p-4 shadow-sm ${
                        message.role === 'user'
                          ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 ml-8'
                          : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                      }`}>
                        <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap mb-0">{message.content}</p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Show category selection after welcome message */}
                  {message.id === 'welcome' && showCategorySelection && !onboardingCompleted && (
                    <div className="mt-4 ml-11">
                      <CategorySelection
                        onConfirm={handleCategorySelection}
                        isLoading={isSelectingCategories}
                      />
                    </div>
                  )}
                </div>
              ))}
              
              {/* Show category selection if no messages yet but onboarding not completed */}
              {allMessages.length === 0 && showCategorySelection && !onboardingCompleted && (
                <div className="mt-4 ml-11">
                  <CategorySelection
                    onConfirm={handleCategorySelection}
                    isLoading={isSelectingCategories}
                  />
                </div>
              )}
              
              {isTyping && (
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center flex-shrink-0">
                    <i className="fas fa-robot text-blue-600 dark:text-blue-400 text-sm"></i>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">HEOR Assistant</span>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </div>
      
      {/* Input Area */}
      {!showCategorySelection && (
        <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-6 py-4 flex-shrink-0">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-end space-x-3">
              <div className="flex-1">
                <Textarea
                  ref={textareaRef}
                  value={inputMessage}
                  onChange={(e) => {
                    setInputMessage(e.target.value);
                    autoResize();
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder="Type a message or question about your preferences..."
                  className="w-full min-h-[44px] max-h-[120px] resize-none border-gray-300 dark:border-gray-600 rounded-lg px-4 py-3 bg-gray-50 dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={isSending}
                />
                <div className="flex items-center justify-between mt-2 text-xs text-gray-500 dark:text-gray-400">
                  <span>Press Enter to send, Shift+Enter for new line</span>
                  <div className="flex items-center space-x-1">
                    <i className="fas fa-shield-alt text-green-500"></i>
                    <span>Secure & Private</span>
                  </div>
                </div>
              </div>
              <Button 
                onClick={handleSendMessage}
                disabled={!inputMessage.trim() || isSending}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg flex-shrink-0"
              >
                {isSending ? (
                  <i className="fas fa-spinner fa-spin"></i>
                ) : (
                  <i className="fas fa-paper-plane"></i>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}