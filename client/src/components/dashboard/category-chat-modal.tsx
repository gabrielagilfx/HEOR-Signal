import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { X, Send, MessageSquare, Search } from "lucide-react";

interface CategoryChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  category: string;
  categoryName: string;
  categoryIcon: string;
  categoryColor: string;
  sessionId: string;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  newsItems?: any[];
}

interface CategoryChatResponse {
  success: boolean;
  response: string;
  news_items: any[];
  queries_used: string[];
  error?: string;
}

export function CategoryChatModal({
  isOpen,
  onClose,
  category,
  categoryName,
  categoryIcon,
  categoryColor,
  sessionId
}: CategoryChatModalProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  const autoResize = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
    }
  };

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Handle sending message
  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isSending) return;

    const userMessage = inputMessage.trim();
    const messageId = `msg-${Date.now()}`;

    // Add user message immediately
    const newUserMessage: ChatMessage = {
      id: messageId,
      role: 'user',
      content: userMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, newUserMessage]);
    setInputMessage("");
    setIsSending(true);

    try {
      const response = await fetch(`/api/chat/category/${category}/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          session_id: sessionId,
          message: userMessage
        }),
      });

      const result: CategoryChatResponse = await response.json();

      if (result.success) {
        // Add assistant response
        const assistantMessage: ChatMessage = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: result.response,
          timestamp: new Date(),
          newsItems: result.news_items
        };

        setMessages(prev => [...prev, assistantMessage]);
      } else {
        // Add error message
        const errorMessage: ChatMessage = {
          id: `error-${Date.now()}`,
          role: 'assistant',
          content: `Sorry, I encountered an error: ${result.error || 'Unknown error'}`,
          timestamp: new Date()
        };

        setMessages(prev => [...prev, errorMessage]);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: 'Sorry, I encountered an error while processing your request. Please try again.',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsSending(false);
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Add welcome message when modal opens
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const welcomeMessage: ChatMessage = {
        id: 'welcome',
        role: 'assistant',
        content: `Welcome to the ${categoryName} chat! I can help you find specific news and information. Try asking me things like:
        
• "Show me recent FDA approvals for oncology drugs"
• "Find clinical trials for diabetes in Europe" 
• "What's the latest on payer coverage for diabetes medications?"
• "Get RWE studies for cardiovascular outcomes"

What would you like to know about ${categoryName}?`,
        timestamp: new Date()
      };
      setMessages([welcomeMessage]);
    }
  }, [isOpen, categoryName]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-4xl h-[80vh] flex flex-col">
        <CardHeader className="flex-shrink-0 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className={`w-10 h-10 ${categoryColor} rounded-lg flex items-center justify-center`}>
                <i className={`${categoryIcon} text-white text-lg`}></i>
              </div>
              <div>
                <CardTitle className="text-xl">{categoryName} Chat</CardTitle>
                <p className="text-sm text-gray-500">Ask me about {categoryName.toLowerCase()} news and updates</p>
              </div>
            </div>
            <Button
              onClick={onClose}
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="flex-1 flex flex-col p-0">
          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.map((message) => (
              <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] ${message.role === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-800'} rounded-lg px-4 py-3`}>
                  <div className="whitespace-pre-line">{message.content}</div>
                  
                  {/* Show news items if available */}
                  {message.newsItems && message.newsItems.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                      <div className="text-sm font-medium mb-2">Found {message.newsItems.length} relevant news items:</div>
                      <div className="space-y-2">
                        {message.newsItems.slice(0, 3).map((item, index) => (
                          <div key={index} className="bg-white dark:bg-gray-700 rounded p-2 text-sm">
                            <div className="font-medium text-blue-600 dark:text-blue-400">
                              <a href={item.url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                                {item.title}
                              </a>
                            </div>
                            <div className="text-gray-600 dark:text-gray-300 text-xs mt-1">
                              {item.source} • {item.date}
                            </div>
                          </div>
                        ))}
                        {message.newsItems.length > 3 && (
                          <div className="text-xs text-gray-500">
                            +{message.newsItems.length - 3} more items
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            {isSending && (
              <div className="flex justify-start">
                <div className="bg-gray-100 dark:bg-gray-800 rounded-lg px-4 py-3">
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
          <div className="flex-shrink-0 border-t p-4">
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
                  placeholder={`Ask me about ${categoryName.toLowerCase()} news...`}
                  className="min-h-[48px] max-h-[120px] resize-none"
                  disabled={isSending}
                />
              </div>
              <Button
                onClick={handleSendMessage}
                disabled={!inputMessage.trim() || isSending}
                className="bg-blue-600 hover:bg-blue-700 text-white h-[48px] px-4"
              >
                {isSending ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
            <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
              <span>Press Enter to send, Shift+Enter for new line</span>
              <div className="flex items-center space-x-1">
                <Search className="h-3 w-3" />
                <span>AI-powered search</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}