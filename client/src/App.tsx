import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { authService } from "@/lib/auth";
import NotFound from "@/pages/not-found";
import Onboarding from "@/pages/onboarding";
import Dashboard from "@/pages/dashboard";
import LandingPage from "@/components/landing/landing-page";

function Router() {
  const isAuthenticated = authService.isAuthenticated();
  const user = authService.getUser();

  return (
    <Switch>
      <Route path="/">
        {isAuthenticated && user?.onboarding_completed ? (
          <Dashboard />
        ) : (
          <LandingPage onStartChat={() => {}} />
        )}
      </Route>
      <Route path="/onboarding">
        {isAuthenticated ? <Onboarding /> : <LandingPage onStartChat={() => {}} />}
      </Route>
      <Route path="/dashboard">
        {isAuthenticated ? <Dashboard /> : <LandingPage onStartChat={() => {}} />}
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
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
