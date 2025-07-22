import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Onboarding from "@/pages/onboarding";

// Add error boundary to catch React errors
import React from 'react';

function Router() {
  try {
    return (
      <Switch>
        <Route path="/" component={Onboarding} />
        <Route path="/onboarding" component={Onboarding} />
        <Route component={NotFound} />
      </Switch>
    );
  } catch (error) {
    console.error('Router error:', error);
    return (
      <div style={{ padding: '20px', background: '#fee', color: '#800' }}>
        <h2>Application Error</h2>
        <p>There was an error loading the application. Please refresh the page.</p>
        <details>
          <summary>Error Details</summary>
          <pre>{error instanceof Error ? error.message : String(error)}</pre>
        </details>
      </div>
    );
  }
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
