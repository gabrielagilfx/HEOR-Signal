import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { apiRequest } from "@/lib/queryClient";
import agilLogo from "@assets/Logo Primary_1753368301220.png";

interface LoginComponentProps {
  onLoginSuccess: (userData: any) => void;
  onBackToLanding: () => void;
}

export function LoginComponent({ onLoginSuccess, onBackToLanding }: LoginComponentProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  
  const loginMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/auth/login', {
        email,
        password
      });
      return await response.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        onLoginSuccess(data);
      }
    },
    onError: (error: any) => {
      console.error('Login error:', error);
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email && password) {
      loginMutation.mutate();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
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
            
            <Button 
              onClick={onBackToLanding}
              variant="outline"
              size="sm"
            >
              <i className="fas fa-arrow-left mr-2"></i>
              Back to Home
            </Button>
          </div>
        </div>
      </header>

      {/* Login Form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Welcome Back
            </CardTitle>
            <p className="text-gray-600 dark:text-gray-400">
              Sign in to your HEOR Signal dashboard
            </p>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              
              {loginMutation.error && (
                <Alert variant="destructive">
                  <AlertDescription>
                    {loginMutation.error instanceof Error 
                      ? loginMutation.error.message 
                      : 'Invalid email or password'}
                  </AlertDescription>
                </Alert>
              )}
              
              <Button 
                type="submit" 
                className="w-full"
                disabled={loginMutation.isPending || !email || !password}
              >
                {loginMutation.isPending ? (
                  <>
                    <i className="fas fa-spinner fa-spin mr-2"></i>
                    Signing in...
                  </>
                ) : (
                  <>
                    <i className="fas fa-sign-in-alt mr-2"></i>
                    Sign In
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}