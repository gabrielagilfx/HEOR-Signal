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
  const allMessages: ChatMessage[] = [welcomeMessage];
  
  // Add actual messages one by one to avoid spread operator issues
  if (messages && messages.length > 0) {
    for (const message of messages) {
      if (message && message.id) {
        allMessages.push(message);
      }
    }
  }

  return (
    <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full px-4 sm:px-6 py-6 min-h-0">
      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto mb-6 space-y-4" style={{ minHeight: 0 }}>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-muted-foreground">Loading messages...</div>
          </div>
        ) : (
          <>
            {allMessages.map((message, index) => (
              <div key={`${message.id}-${index}`}>
                <MessageBubble message={message} />
                
                {/* Show category selection after welcome message */}
                {message.id === 'welcome' && showCategorySelection && (
                  <div className="mt-4">
                    <CategorySelection
                      onConfirm={handleCategorySelection}
                      isLoading={isSelectingCategories}
                    />
                  </div>
                )}
              </div>
            ))}
            
            {isTyping && <TypingIndicator />}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Chat Input */}
      <Card className="border border-border shadow-sm p-4 flex-shrink-0">
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
              placeholder="Ask me anything about your dashboard setup or HEOR data sources..."
              className="resize-none border-0 focus-visible:ring-0 placeholder:text-muted-foreground text-foreground bg-transparent max-h-24 leading-relaxed"
              rows={1}
            />
          </div>
          <Button
            size="sm"
            onClick={handleSendMessage}
            disabled={!inputMessage.trim() || isSending}
            className="px-6 py-2 bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            {isSending ? (
              <>
                <i className="fas fa-spinner fa-spin mr-2"></i>
                Sending
              </>
            ) : (
              <>
                <i className="fas fa-paper-plane mr-2"></i>
                Send
              </>
            )}
          </Button>
        </div>
      </Card>
    </div>
  );
}