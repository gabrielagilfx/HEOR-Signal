import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { MessageBubble } from "./message-bubble";
import { TypingIndicator } from "./typing-indicator";
import { CategorySelection } from "./category-selection";
import { LoadingScreen } from "@/components/ui/loading-screen";
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
  const [showCategoryLoader, setShowCategoryLoader] = useState(false);
  
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
    if (!inputMessage.trim() || isSending) {
      return;
    }

    const userMessageContent = inputMessage.trim();
    const tempMessageId = `temp-${Date.now()}`;

    try {
      setIsSending(true);
      setIsTyping(true);
      
      // Immediately add user message to display
      const userMessage: ChatMessage = {
        id: tempMessageId,
        role: 'user',
        content: userMessageContent,
        timestamp: new Date()
      };
      
      console.log('Adding immediate user message:', userMessage);
      setMessages(prevMessages => {
        console.log('Previous messages count:', prevMessages.length);
        const newMessages = [...prevMessages, userMessage];
        console.log('New messages count:', newMessages.length);
        return newMessages;
      });
      setInputMessage("");
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
      
      // Send to API
      const response = await apiRequest('POST', '/api/chat/send', {
        message: userMessageContent,
        session_id: sessionId,
      });
      
      const result = await response.json();
      
      if (result.success) {
        // Simply add assistant response to existing messages (user message already there)
        const assistantMessage: ChatMessage = {
          id: result.message_id || `assistant-${Date.now()}`,
          role: 'assistant',
          content: result.message,
          timestamp: new Date()
        };
        
        console.log('API response received, adding assistant message');
        setMessages(prevMessages => {
          console.log('Before adding assistant - messages count:', prevMessages.length);
          const finalMessages = [...prevMessages, assistantMessage];
          console.log('Final messages count:', finalMessages.length);
          return finalMessages;
        });
      } else {
        // If API fails, remove the temporary message
        setMessages(prevMessages => prevMessages.filter(msg => msg.id !== tempMessageId));
      }
    } catch (error) {
      console.error('Error sending message:', error);
      // Remove temporary message on error
      setMessages(prevMessages => prevMessages.filter(msg => msg.id !== tempMessageId));
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
        await loadMessages();
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
    content: `Welcome to HEOR Signal! I'm here to help you set up your personalized dashboard for Health Economics and Outcomes Research insights.

To get started, please select the data categories you'd like to monitor. You can always adjust these preferences later in your dashboard settings.`,
    timestamp: new Date(),
  };

  // Create the full messages array safely
  const allMessages: ChatMessage[] = [];
  
  // Always show welcome message
  allMessages.push(welcomeMessage);
  
  // Add actual messages one by one to avoid spread operator issues
  console.log('Building allMessages, current messages state count:', messages.length);
  if (messages && messages.length > 0) {
    for (const message of messages) {
      if (message && message.id) {
        console.log('Adding message to allMessages:', message.role, message.content.substring(0, 50));
        allMessages.push(message);
      }
    }
  }
  console.log('Final allMessages count:', allMessages.length);



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
                        To get started, please select the data categories you'd like to monitor on your dashboard. You can always modify these preferences later:
                      </div>
                    </div>
                  </div>
                </>
              )}
              
              {/* Display actual chat messages */}
              {allMessages.map((message, index) => (
                <div key={`${message.id}-${index}`}>
                  <div className={`flex items-start space-x-3 ${message.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      message.role === 'user' 
                        ? 'bg-gray-200 dark:bg-gray-600' 
                        : 'bg-blue-600'
                    }`}>
                      <i className={`text-sm ${
                        message.role === 'user' 
                          ? 'fas fa-user text-gray-600 dark:text-gray-300' 
                          : 'fas fa-robot text-white'
                      }`}></i>
                    </div>
                    <div className="flex-1">
                      <div className="text-gray-700 dark:text-gray-300 leading-relaxed">
                        {message.content}
                      </div>
                    </div>
                  </div>
                  
                  {/* Show category selection after welcome message */}
                  {message.id === 'welcome' && showCategorySelection && !onboardingCompleted && (
                    <div className="mt-6 ml-11">
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
                <div className="mt-6 ml-11">
                  <CategorySelection
                    onConfirm={handleCategorySelection}
                    isLoading={isSelectingCategories}
                  />
                </div>
              )}
              
              {isTyping && (
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                    <i className="fas fa-robot text-white text-sm"></i>
                  </div>
                  <div className="flex-1">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
            
            {/* Input Area */}
            {!showCategorySelection && (
              <div className="p-6 border-t border-gray-100 dark:border-gray-700">
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
                      className="w-full min-h-[48px] max-h-[120px] resize-none border-gray-200 dark:border-gray-600 rounded-lg px-4 py-3 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      disabled={isSending}
                    />
                    <div className="flex items-center justify-between mt-2 text-xs text-gray-500 dark:text-gray-400">
                      <span>Press Enter to send, Shift+Enter for new line</span>
                      <div className="flex items-center space-x-1">
                        <i className="fas fa-shield-alt text-gray-400"></i>
                        <span>Secure & Private</span>
                      </div>
                    </div>
                  </div>
                  <Button 
                    onClick={handleSendMessage}
                    disabled={!inputMessage.trim() || isSending}
                    className="bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-lg flex-shrink-0"
                  >
                    {isSending ? (
                      <i className="fas fa-spinner fa-spin"></i>
                    ) : (
                      <i className="fas fa-paper-plane"></i>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}