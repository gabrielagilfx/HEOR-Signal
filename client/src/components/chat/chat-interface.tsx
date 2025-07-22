import { useState, useEffect, useRef } from "react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { MessageBubble } from "./message-bubble";
import { TypingIndicator } from "./typing-indicator";
import { CategorySelection } from "./category-selection";
import { useChat } from "@/hooks/use-chat";
import type { ChatMessage } from "@/types/chat";

interface ChatInterfaceProps {
  sessionId: string;
  onboardingCompleted: boolean;
}

export function ChatInterface({ sessionId, onboardingCompleted }: ChatInterfaceProps) {
  const [inputMessage, setInputMessage] = useState("");
  const [showCategorySelection, setShowCategorySelection] = useState(!onboardingCompleted);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  const {
    messages,
    isLoading,
    isTyping,
    isSending,
    isSelectingCategories,
    sendMessage,
    selectCategories,
  } = useChat(sessionId);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSendMessage = () => {
    if (inputMessage.trim() && !isSending) {
      sendMessage(inputMessage.trim());
      setInputMessage("");
      autoResize();
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

  const handleCategorySelection = (categories: string[]) => {
    selectCategories(categories);
    setShowCategorySelection(false);
  };

  // Create welcome message with category selection
  const welcomeMessage: ChatMessage = {
    id: 'welcome',
    role: 'assistant',
    content: `Welcome to **HEOR Signal**! I'm here to help you set up your personalized dashboard for Health Economics and Outcomes Research insights.

To get started, please select the data categories you'd like to monitor. You can always adjust these preferences later in your dashboard settings.`,
    timestamp: new Date(),
  };

  const allMessages = React.useMemo(() => {
    try {
      const safeMessages = Array.isArray(messages) ? messages : [];
      return [welcomeMessage, ...safeMessages];
    } catch (error) {
      console.error('Error creating allMessages:', error);
      return [welcomeMessage];
    }
  }, [messages, welcomeMessage]);

  return (
    <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full px-4 sm:px-6 py-6 min-h-0">
      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto mb-6 space-y-4" style={{ minHeight: 0 }}>
        {allMessages.map((message, index) => (
          <div key={message.id || index}>
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
            className="flex-shrink-0 w-10 h-10 p-0"
          >
            <i className="fas fa-paper-plane text-sm"></i>
          </Button>
        </div>
        
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
          <div className="flex items-center text-xs text-muted-foreground">
            <i className="fas fa-lock text-green-500 mr-1"></i>
            <span>Secure & Private</span>
          </div>
          <div className="flex items-center text-xs text-muted-foreground">
            <span>Press Enter to send</span>
          </div>
        </div>
      </Card>
    </div>
  );
}
