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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-indigo-950/30">
      <div className="min-h-screen flex">
        {/* Left Column - Login Form */}
        <div className="flex-1 flex items-center justify-center p-8 lg:p-12">
          <div className="w-full max-w-md space-y-10">
            {/* Header */}
            <div className="text-center">
              <button
                onClick={onBackToLanding}
                className="inline-flex items-center gap-2 px-5 py-3 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 bg-white/60 dark:bg-slate-800/60 hover:bg-white/80 dark:hover:bg-slate-700/80 rounded-xl transition-all duration-200 mb-10 backdrop-blur-xl border border-white/30 dark:border-slate-600/50 shadow-lg shadow-slate-200/20 dark:shadow-slate-950/30"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Home
              </button>

              <div className="flex items-center justify-center mb-8">
                <img
                  src={agilLogo}
                  alt="HEOR Signal"
                  className="h-16 w-16 object-contain drop-shadow-sm"
                />
              </div>

              <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-200 bg-clip-text text-transparent mb-3">
                Welcome back
              </h1>
              <p className="text-slate-600 dark:text-slate-400 text-lg font-medium">
                Sign in to access your personalized healthcare insights
              </p>
            </div>

            {/* Login Form */}
            <Card className="border-0 shadow-2xl bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl border border-white/30 dark:border-slate-700/50">
              <CardContent className="p-10">
                <form onSubmit={handleSubmit} className="space-y-7">
                  <div className="space-y-3">
                    <Label
                      htmlFor="email"
                      className="text-sm font-bold text-slate-700 dark:text-slate-300"
                    >
                      Email address
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-4 h-5 w-5 text-slate-400" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="Enter your email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-12 h-14 border-slate-200/50 dark:border-slate-700/50 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-400/20 rounded-xl transition-all duration-200"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label
                      htmlFor="password"
                      className="text-sm font-bold text-slate-700 dark:text-slate-300"
                    >
                      Password
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-4 h-5 w-5 text-slate-400" />
                      <Input
                        id="password"
                        type="password"
                        placeholder="Enter your password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-12 h-14 border-slate-200/50 dark:border-slate-700/50 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-400/20 rounded-xl transition-all duration-200"
                        required
                      />
                    </div>
                  </div>

                  {error && (
                    <Alert
                      variant="destructive"
                      className="border-red-200/50 bg-red-50/70 dark:border-red-800/50 dark:bg-red-900/20 backdrop-blur-sm rounded-xl"
                    >
                      <AlertDescription className="text-red-600 dark:text-red-400 font-medium">
                        {error}
                      </AlertDescription>
                    </Alert>
                  )}

                  <Button
                    type="submit"
                    className="w-full h-14 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700 text-white font-bold shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 rounded-xl text-lg"
                    disabled={isLoading || !email || !password}
                  >
                    {isLoading ? (
                      <div className="flex items-center">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                        Signing in...
                      </div>
                    ) : (
                      <div className="flex items-center">
                        Sign in
                        <ArrowRight className="ml-3 h-5 w-5" />
                      </div>
                    )}
                  </Button>
                </form>

                {/* Account Link */}
                <div className="text-center mt-8 pt-8 border-t border-slate-200/50 dark:border-slate-700/50">
                  <p className="text-slate-600 dark:text-slate-400 font-medium">
                    Don't have an account?{" "}
                    <button
                      onClick={onSwitchToRegister}
                      className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-bold transition-colors hover:underline"
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
        <div className="hidden lg:flex flex-1 items-center justify-center p-16 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 to-purple-600/20 backdrop-blur-sm"></div>
          <div className="relative z-10 max-w-lg text-center space-y-10">
            <div className="space-y-6">
              <h2 className="text-5xl font-bold leading-tight drop-shadow-sm">
                Your Healthcare Intelligence Platform
              </h2>
              <p className="text-xl text-blue-100 leading-relaxed font-medium">
                Stay ahead with AI-powered insights, regulatory monitoring, and
                personalized healthcare intelligence.
              </p>
            </div>

            <div className="grid gap-8 text-left">
              <div className="flex items-start space-x-5">
                <div className="bg-white/20 rounded-xl p-3 shadow-lg">
                  <CheckCircle className="h-7 w-7" />
                </div>
                <div>
                  <h3 className="font-bold text-xl mb-2">
                    Real-time Monitoring
                  </h3>
                  <p className="text-blue-100 leading-relaxed">
                    Track regulatory changes and clinical developments as they
                    happen
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-5">
                <div className="bg-white/20 rounded-xl p-3 shadow-lg">
                  <TrendingUp className="h-7 w-7" />
                </div>
                <div>
                  <h3 className="font-bold text-xl mb-2">AI-Powered Insights</h3>
                  <p className="text-blue-100 leading-relaxed">
                    Get personalized analysis tailored to your expertise and
                    interests
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-5">
                <div className="bg-white/20 rounded-xl p-3 shadow-lg">
                  <Shield className="h-7 w-7" />
                </div>
                <div>
                  <h3 className="font-bold text-xl mb-2">Secure & Compliant</h3>
                  <p className="text-blue-100 leading-relaxed">
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
