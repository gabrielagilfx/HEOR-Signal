import { Card } from "@/components/ui/card";
import type { ChatMessage } from "@/types/chat";
import { format } from "date-fns";

interface MessageBubbleProps {
  message: ChatMessage;
  category?: string;
}

export function MessageBubble({ message, category }: MessageBubbleProps) {
  const isAssistant = message.role === 'assistant';
  
  return (
    <div className={`flex items-start space-x-4 animate-fade-in ${!isAssistant ? 'justify-end' : ''}`}>
      {isAssistant && (
        <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-primary to-primary/80 rounded-full flex items-center justify-center shadow-lg">
          <i className="fas fa-robot text-white text-sm"></i>
        </div>
      )}
      
      <div className={`flex-1 max-w-3xl ${!isAssistant ? 'flex justify-end' : ''}`}>
        <Card className={`shadow-sm ${
          isAssistant 
            ? 'rounded-2xl rounded-tl-md border border-border bg-card' 
            : 'rounded-2xl rounded-tr-md bg-primary text-primary-foreground'
        } px-6 py-4`}>
                {isAssistant && (
        <div className="flex items-center mb-3">
          <span className="font-semibold text-foreground text-sm">
            {category ? `${category.charAt(0).toUpperCase() + category.slice(1)} Assistant` : 'HEOR Assistant'}
          </span>
          <span className="ml-2 text-xs text-muted-foreground">
            {format(message.timestamp, 'HH:mm')}
          </span>
        </div>
      )}
          <p className={`leading-relaxed ${
            isAssistant ? 'text-foreground' : 'text-primary-foreground'
          }`}>
            {message.content}
          </p>
        </Card>
      </div>

      {!isAssistant && (
        <div className="flex-shrink-0 w-10 h-10 bg-muted rounded-full flex items-center justify-center shadow-lg">
          <i className="fas fa-user text-muted-foreground text-sm"></i>
        </div>
      )}
    </div>
  );
}
