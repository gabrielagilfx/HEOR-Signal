import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { apiRequest } from "@/lib/queryClient";
import agilLogo from "@assets/Logo Primary_1753368301220-DP2VvqsV.png";

interface RegisterComponentProps {
  onRegisterSuccess: (userData: any) => void;
  onBackToLanding: () => void;
}

export function RegisterComponent({ onRegisterSuccess, onBackToLanding }: RegisterComponentProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  const registerMutation = useMutation({
    mutationFn: async () => {
      if (password !== confirmPassword) {
        throw new Error("Passwords do not match");
      }
      
      const response = await apiRequest('POST', '/api/auth/register', {
        name,
        email,
        password
      });
      return await response.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        onRegisterSuccess(data);
      }
    },
    onError: (error: any) => {
      console.error('Registration error:', error);
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name && email && password && confirmPassword) {
      registerMutation.mutate();
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

      {/* Register Form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Create Your Account
            </CardTitle>
            <p className="text-gray-600 dark:text-gray-400">
              Join HEOR Signal to get personalized healthcare insights
            </p>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Enter your full name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              
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
                  placeholder="Create a password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Confirm your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
              
              {registerMutation.error && (
                <Alert variant="destructive">
                  <AlertDescription>
                    {registerMutation.error instanceof Error 
                      ? registerMutation.error.message 
                      : 'Registration failed. Please try again.'}
                  </AlertDescription>
                </Alert>
              )}
              
              <Button 
                type="submit" 
                className="w-full"
                disabled={registerMutation.isPending || !name || !email || !password || !confirmPassword}
              >
                {registerMutation.isPending ? (
                  <>
                    <i className="fas fa-spinner fa-spin mr-2"></i>
                    Creating Account...
                  </>
                ) : (
                  <>
                    <i className="fas fa-user-plus mr-2"></i>
                    Create Account
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