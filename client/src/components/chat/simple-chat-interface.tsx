import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MessageBubble } from "./message-bubble";
import { TypingIndicator } from "./typing-indicator";
import { CategorySelection } from "./category-selection";
import { LoadingScreen } from "@/components/ui/loading-screen";
import { HEORDashboard } from "@/components/dashboard/heor-dashboard";
import { LandingPage } from "@/components/landing/landing-page";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/contexts/AuthContext";
import type { ChatMessage } from "@/types/chat";
import agilLogo from "@assets/Logo Primary_1753368301220.png";

interface UserStatus {
  session_id: string;
  onboarding_completed: boolean;
  selected_categories: string[];
  preference_expertise?: string;
}

interface SimpleChatInterfaceProps {
  sessionId: string;
  userStatus?: UserStatus;
  onStartChat?: () => void;
  hasStartedChat?: boolean;
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

export function SimpleChatInterface({ sessionId, userStatus, onStartChat, hasStartedChat = false }: SimpleChatInterfaceProps) {
  const { logout } = useAuth();
  const onboardingCompleted = userStatus?.onboarding_completed ?? false;
  const hasPreferenceExpertise = !!(userStatus?.preference_expertise);
  const canShowDashboard = onboardingCompleted && hasPreferenceExpertise;
  
  const [inputMessage, setInputMessage] = useState("");
  const [showCategorySelection, setShowCategorySelection] = useState(!onboardingCompleted);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isSelectingCategories, setIsSelectingCategories] = useState(false);
  const [showCategoryLoader, setShowCategoryLoader] = useState(false);
  const [showDashboard, setShowDashboard] = useState(canShowDashboard);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(userStatus?.selected_categories || []);
  const [isNavigatingToDashboard, setIsNavigatingToDashboard] = useState(false);
  const [showLandingPage, setShowLandingPage] = useState(true);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Handler for starting chat from landing page
  const handleStartChat = () => {
    setShowLandingPage(false);
    if (onStartChat) {
      onStartChat();
    }
  };

  // Handler for new session without going back to landing page
  const handleNewSession = () => {
    // Navigate to a fresh session without going back to landing page
    window.location.href = window.location.origin + '?new_session=true';
  };



  // Update category selection state when userStatus changes  
  useEffect(() => {
    setShowCategorySelection(!onboardingCompleted);
    // Only set dashboard if we're not in a timer-controlled state
    // (Don't override dashboard state set by the 3-second timer)
    if (!showDashboard) {
      setShowDashboard(canShowDashboard);
    }
    setSelectedCategories(userStatus?.selected_categories || []);
  }, [onboardingCompleted, canShowDashboard, userStatus?.selected_categories, showDashboard]);

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

    const userMessage = inputMessage.trim();
    
    // Create user message outside try block for proper scope
    const newUserMessage: ChatMessage = {
      id: `temp-user-${Date.now()}`,
      role: 'user',
      content: userMessage,
      timestamp: new Date()
    };
    
    try {
      setIsSending(true);
      setIsTyping(true);
      
      // Immediately add user message to chat for smooth UX
      setMessages(prev => [...prev, newUserMessage]);
      setInputMessage("");
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
      
      const response = await apiRequest('POST', '/api/chat/send', {
        message: userMessage,
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
              setShowDashboard(true);
            }, 500);
          }, 3000);
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
      // Remove the temporary user message on error
      setMessages(prev => prev.filter(msg => msg.id !== newUserMessage.id));
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
        
        // Add the confirmation message smoothly instead of reloading all messages
        if (result.message) {
          const confirmationMessage: ChatMessage = {
            id: `category-confirmation-${Date.now()}`,
            role: 'assistant',
            content: result.message,
            timestamp: new Date()
          };
          setMessages(prev => [...prev, confirmationMessage]);
        }
        
        // Don't navigate to dashboard yet - need to collect expertise preference first
        // Just acknowledge category selection for now
        
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

To get started, please select the data categories you'd like to monitor.`,
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



  // Show landing page first (only if chat hasn't started)
  if (showLandingPage && !hasStartedChat) {
    return <LandingPage onStartChat={handleStartChat} />;
  }

  // Show dashboard loading screen during transition
  if (isNavigatingToDashboard) {
    return <LoadingScreen message="Setting up your HEOR dashboard..." />;
  }

  // Show dashboard only if onboarding is completed AND preference_expertise is set
  console.log('Dashboard render check:', { 
    showDashboard, 
    canShowDashboard, 
    onboardingCompleted, 
    hasPreferenceExpertise,
    userStatus: userStatus?.preference_expertise 
  });
  
  if (showDashboard && canShowDashboard) {
    console.log('Rendering HEOR Dashboard with categories:', selectedCategories);
    return <HEORDashboard selectedCategories={selectedCategories} sessionId={sessionId} />;
  }

  return (
    <div className="flex-1 flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Header inside the chat interface */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <img 
                src={agilLogo} 
                alt="AGILf(x)" 
                className="w-20 h-20 object-contain" 
              />
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">HEOR Signal</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  AI-powered healthcare insights and regulatory monitoring
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <Button 
                onClick={handleNewSession}
                variant="outline"
                size="sm"
                className="hover:bg-blue-50 dark:hover:bg-blue-900/20"
              >
                <i className="fas fa-plus mr-2"></i>
                New Session
              </Button>
              <Button 
                onClick={logout}
                variant="outline"
                size="sm"
                className="hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400"
              >
                <i className="fas fa-sign-out-alt mr-2"></i>
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>
      
      <div className="flex-1 overflow-y-auto p-6">
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
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Hero</h3>
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
                        Welcome to <strong>HEOR Signal!</strong> I'm here to help you set up your personalized dashboard for Health Economics and Outcomes Research insights.
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
                        To get started, please select the data categories you'd like to monitor.
                      </div>
                    </div>
                  </div>
                </>
              )}
              
              {/* Display actual chat messages */}
              {allMessages.map((message, index) => (
                <div key={`${message.id}-${index}`}>
                  <div className={`flex items-start space-x-3 ${message.role === 'user' ? 'justify-end' : ''}`}>
                    {message.role === 'user' ? (
                      // User message - right aligned
                      <>
                        <div className="flex-1 flex justify-end">
                          <div className="max-w-[80%] bg-blue-600 text-white rounded-lg px-4 py-2">
                            {message.content}
                          </div>
                        </div>
                        <div className="w-8 h-8 bg-gray-200 dark:bg-gray-600 rounded-lg flex items-center justify-center flex-shrink-0">
                          <i className="fas fa-user text-gray-600 dark:text-gray-300 text-sm"></i>
                        </div>
                      </>
                    ) : (
                      // Assistant message - left aligned
                      <>
                        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                          <i className="fas fa-robot text-white text-sm"></i>
                        </div>
                        <div className="flex-1">
                          <div className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line">
                            {message.content}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                  
                  {/* Show category selection after welcome message */}
                  {message.id === 'welcome' && showCategorySelection && !canShowDashboard && (
                    <div className="mt-6 ml-11">
                      <CategorySelection
                        onConfirm={handleCategorySelection}
                        isLoading={isSelectingCategories}
                      />
                    </div>
                  )}
                </div>
              ))}
              
              {/* Show category selection if no messages yet but dashboard cannot be shown */}
              {allMessages.length === 0 && showCategorySelection && !canShowDashboard && (
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
            
            {/* Input Area - Moved outside the card to be at bottom */}
            
          </div>
        )}
        
        {/* Input Area at Bottom - only show if categories selected but no dashboard yet */}
        {!showCategorySelection && !canShowDashboard && (
          <div className="mt-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm p-4">
            <div className="flex items-start space-x-3">
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
              </div>
              <Button 
                onClick={handleSendMessage}
                disabled={!inputMessage.trim() || isSending}
                className="bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-lg flex-shrink-0 min-w-[48px] h-[48px]"
              >
                {isSending ? (
                  <i className="fas fa-spinner fa-spin"></i>
                ) : (
                  <i className="fas fa-paper-plane"></i>
                )}
              </Button>
            </div>
            <div className="flex items-center justify-between mt-2 text-xs text-gray-500 dark:text-gray-400">
              <span>Press Enter to send, Shift+Enter for new line</span>
              <div className="flex items-center space-x-1">
                <i className="fas fa-shield-alt text-gray-400"></i>
                <span>Secure & Private</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
    </div>
  );
}