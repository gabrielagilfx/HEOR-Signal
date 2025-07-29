import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/contexts/auth-context";
import {
  Mail,
  Lock,
  ArrowRight,
  CheckCircle,
  TrendingUp,
  Shield,
  Users,
  ArrowLeft,
} from "lucide-react";
import agilLogo from "@assets/Logo Primary_1753368301220.png";

interface LoginComponentProps {
  onLoginSuccess: (userData: any) => void;
  onBackToLanding: () => void;
  onSwitchToRegister: () => void;
}

export function LoginComponent({
  onLoginSuccess,
  onBackToLanding,
  onSwitchToRegister,
}: LoginComponentProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { login, isLoading } = useAuth();
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (email && password) {
      try {
        setError(null);
        await login(email, password);
        // Give time for context to update, then redirect
        setTimeout(() => {
          onLoginSuccess({ success: true, onboarding_completed: true });
        }, 200);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Login failed");
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <div className="min-h-screen flex">
        {/* Left Column - Login Form */}
        <div className="flex-1 flex items-center justify-center p-8 lg:p-12">
          <div className="w-full max-w-md space-y-8">
            {/* Header */}
            <div className="text-center">
              <button
                onClick={onBackToLanding}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-white/60 dark:hover:bg-slate-800/60 rounded-lg transition-all duration-200 mb-8 backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Home
              </button>

              <div className="flex items-center justify-center mb-6">
                <img
                  src={agilLogo}
                  alt="HEOR Signal"
                  className="h-20 w-20 object-contain"
                />
              </div>

              <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
                Welcome back
              </h1>
              <p className="text-slate-600 dark:text-slate-400">
                Sign in to access your personalized healthcare insights
              </p>
            </div>

            {/* Login Form */}
            <Card className="border-0 shadow-xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
              <CardContent className="p-8">
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <Label
                      htmlFor="email"
                      className="text-sm font-medium text-slate-700 dark:text-slate-300"
                    >
                      Email address
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="Enter your email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-10 h-12 border-slate-200 dark:border-slate-700 focus:border-blue-500 dark:focus:border-blue-400"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="password"
                      className="text-sm font-medium text-slate-700 dark:text-slate-300"
                    >
                      Password
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                      <Input
                        id="password"
                        type="password"
                        placeholder="Enter your password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-10 h-12 border-slate-200 dark:border-slate-700 focus:border-blue-500 dark:focus:border-blue-400"
                        required
                      />
                    </div>
                  </div>

                  {error && (
                    <Alert
                      variant="destructive"
                      className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20"
                    >
                      <AlertDescription className="text-red-600 dark:text-red-400">
                        {error}
                      </AlertDescription>
                    </Alert>
                  )}

                  <Button
                    type="submit"
                    className="w-full h-12 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium shadow-lg hover:shadow-xl transition-all duration-200"
                    disabled={isLoading || !email || !password}
                  >
                    {isLoading ? (
                      <div className="flex items-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Signing in...
                      </div>
                    ) : (
                      <div className="flex items-center">
                        Sign in
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </div>
                    )}
                  </Button>
                </form>

                {/* Account Link */}
                <div className="text-center mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
                  <p className="text-slate-600 dark:text-slate-400">
                    Don't have an account?{" "}
                    <button
                      onClick={onSwitchToRegister}
                      className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium transition-colors"
                    >
                      Sign up here
                    </button>
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Right Column - Hero Section */}
        <div className="hidden lg:flex flex-1 items-center justify-center p-12 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 text-white">
          <div className="max-w-lg text-center space-y-8">
            <div className="space-y-4">
              <h2 className="text-4xl font-bold leading-tight">
                Your Healthcare Intelligence Platform
              </h2>
              <p className="text-xl text-blue-100 leading-relaxed">
                Stay ahead with AI-powered insights, regulatory monitoring, and
                personalized healthcare intelligence.
              </p>
            </div>

            <div className="grid gap-6 text-left">
              <div className="flex items-start space-x-4">
                <div className="bg-white/10 rounded-lg p-2">
                  <CheckCircle className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">
                    Real-time Monitoring
                  </h3>
                  <p className="text-blue-100">
                    Track regulatory changes and clinical developments as they
                    happen
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="bg-white/10 rounded-lg p-2">
                  <TrendingUp className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">AI-Powered Insights</h3>
                  <p className="text-blue-100">
                    Get personalized analysis tailored to your expertise and
                    interests
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="bg-white/10 rounded-lg p-2">
                  <Shield className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Secure & Compliant</h3>
                  <p className="text-blue-100">
                    Enterprise-grade security for healthcare professionals
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
