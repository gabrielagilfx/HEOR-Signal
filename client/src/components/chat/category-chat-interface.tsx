import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageBubble } from "./message-bubble";
import { TypingIndicator } from "./typing-indicator";
import { apiRequest } from "@/lib/queryClient";
import type { ChatMessage } from "@/types/chat";

interface CategoryChatInterfaceProps {
  sessionId: string;
  category: string;
  onClose: () => void;
}

interface CategoryConfig {
  name: string;
  icon: string;
  color: string;
  iconColor: string;
  badgeColor: string;
}

const CATEGORY_CONFIGS: Record<string, CategoryConfig> = {
  regulatory: {
    name: "Regulatory Alerts",
    icon: "fas fa-gavel",
    color: "bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800",
    iconColor: "text-red-600 dark:text-red-400",
    badgeColor: "bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300"
  },
  clinical: {
    name: "Clinical Trial Updates",
    icon: "fas fa-microscope", 
    color: "bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800",
    iconColor: "text-blue-600 dark:text-blue-400",
    badgeColor: "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300"
  },
  market: {
    name: "Market Access & Payer News",
    icon: "fas fa-handshake",
    color: "bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800", 
    iconColor: "text-green-600 dark:text-green-400",
    badgeColor: "bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300"
  },
  rwe: {
    name: "Real-World Evidence & Public Health",
    icon: "fas fa-chart-bar",
    color: "bg-purple-50 dark:bg-purple-950 border-purple-200 dark:border-purple-800",
    iconColor: "text-purple-600 dark:text-purple-400", 
    badgeColor: "bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300"
  }
};

export function CategoryChatInterface({ sessionId, category, onClose }: CategoryChatInterfaceProps) {
  const [inputMessage, setInputMessage] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  const categoryConfig = CATEGORY_CONFIGS[category];

  // Load messages on mount
  useEffect(() => {
    if (sessionId) {
      loadMessages();
      loadSuggestions();
    }
  }, [sessionId, category]);

  const loadMessages = async () => {
    try {
      setIsLoading(true);
      const response = await apiRequest('GET', `/api/chat/category/${category}/messages/${sessionId}`, undefined);
      const data = await response.json();
      
      if (data.messages) {
        const transformedMessages: ChatMessage[] = data.messages.map((msg: any) => ({
          id: msg.id,
          role: msg.role,
          content: msg.content,
          timestamp: new Date(msg.timestamp)
        }));
        setMessages(transformedMessages);
      }
    } catch (error) {
      console.error('Error loading category messages:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadSuggestions = async () => {
    try {
      const response = await apiRequest('GET', `/api/chat/category/${category}/suggestions`, undefined);
      const data = await response.json();
      setSuggestions(data.suggestions || []);
    } catch (error) {
      console.error('Error loading suggestions:', error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isSending) return;

    const userMessage: ChatMessage = {
      id: `msg_${Date.now()}`,
      role: "user",
      content: inputMessage.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage("");
    setIsSending(true);
    setIsTyping(true);

    try {
      const response = await apiRequest('POST', `/api/chat/category/${category}/send`, {
        session_id: sessionId,
        category: category,
        message: userMessage.content
      });

      const data = await response.json();
      
      if (data.response) {
        const assistantMessage: ChatMessage = {
          id: `msg_${Date.now()}_assistant`,
          role: "assistant",
          content: data.response,
          timestamp: new Date()
        };
        
        setMessages(prev => [...prev, assistantMessage]);
        setSuggestions(data.suggestions || []);
      }
    } catch (error) {
      console.error('Error sending category message:', error);
      const errorMessage: ChatMessage = {
        id: `msg_${Date.now()}_error`,
        role: "assistant",
        content: "Sorry, I encountered an error processing your message. Please try again.",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsSending(false);
      setIsTyping(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInputMessage(suggestion);
    textareaRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const autoResize = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  };

  useEffect(() => {
    autoResize();
  }, [inputMessage]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full max-w-4xl h-[80vh] flex flex-col">
        <CardHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className={`p-2 rounded-lg ${categoryConfig.color}`}>
                <i className={`${categoryConfig.icon} ${categoryConfig.iconColor} text-lg`}></i>
              </div>
              <div>
                <CardTitle className="text-lg">{categoryConfig.name}</CardTitle>
                <Badge className={categoryConfig.badgeColor}>
                  Category Chat
                </Badge>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              <i className="fas fa-times"></i>
            </Button>
          </div>
        </CardHeader>

        <CardContent className="flex-1 flex flex-col p-0">
          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {isLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-16 w-3/4" />
                <Skeleton className="h-16 w-1/2" />
                <Skeleton className="h-16 w-2/3" />
              </div>
            ) : (
              <>
                {messages.map((message) => (
                  <MessageBubble
                    key={message.id}
                    message={message}
                    category={category}
                  />
                ))}
                {isTyping && <TypingIndicator />}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Suggestions */}
          {suggestions.length > 0 && (
            <div className="p-4 border-t bg-gray-50 dark:bg-gray-900">
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                Suggested questions:
              </div>
              <div className="flex flex-wrap gap-2">
                {suggestions.slice(0, 3).map((suggestion, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    onClick={() => handleSuggestionClick(suggestion)}
                    className="text-xs"
                  >
                    {suggestion}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Input Area */}
          <div className="p-4 border-t">
            <div className="flex space-x-2">
              <Textarea
                ref={textareaRef}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={`Ask about ${categoryConfig.name.toLowerCase()}...`}
                className="flex-1 min-h-[40px] max-h-[120px] resize-none"
                disabled={isSending}
              />
              <Button
                onClick={handleSendMessage}
                disabled={!inputMessage.trim() || isSending}
                className="px-4"
              >
                {isSending ? (
                  <i className="fas fa-spinner fa-spin"></i>
                ) : (
                  <i className="fas fa-paper-plane"></i>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}