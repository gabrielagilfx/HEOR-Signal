import { Card } from "@/components/ui/card";

export function TypingIndicator() {
  return (
    <div className="flex items-start space-x-4 animate-fade-in">
      <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-primary to-primary/80 rounded-full flex items-center justify-center shadow-lg">
        <i className="fas fa-robot text-white text-sm"></i>
      </div>
      <div className="flex-1 max-w-3xl">
        <Card className="rounded-2xl rounded-tl-md px-6 py-4 shadow-sm border border-border">
          <div className="flex items-center space-x-2">
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-muted-foreground rounded-full animate-pulse"></div>
              <div className="w-2 h-2 bg-muted-foreground rounded-full animate-pulse delay-75"></div>
              <div className="w-2 h-2 bg-muted-foreground rounded-full animate-pulse delay-150"></div>
            </div>
            <span className="text-sm text-muted-foreground">Assistant is typing...</span>
          </div>
        </Card>
      </div>
    </div>
  );
}
