import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/contexts/auth-context";
import {
  User,
  Mail,
  Lock,
  ArrowRight,
  Sparkles,
  Globe,
  Brain,
  ArrowLeft,
} from "lucide-react";
import agilLogo from "@assets/Logo Primary_1753368301220.png";

interface RegisterComponentProps {
  onRegisterSuccess: (userData: any) => void;
  onBackToLanding: () => void;
  onSwitchToLogin: () => void;
}

export function RegisterComponent({
  onRegisterSuccess,
  onBackToLanding,
  onSwitchToLogin,
}: RegisterComponentProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const { register, isLoading } = useAuth();
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (name && email && password && confirmPassword) {
      try {
        setError(null);
        if (password !== confirmPassword) {
          throw new Error("Passwords do not match");
        }
        await register(name, email, password);
        onRegisterSuccess({ success: true });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Registration failed");
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50/30 to-teal-50 dark:from-slate-900 dark:via-slate-800 dark:to-emerald-950/30">
      <div className="min-h-screen flex">
        {/* Left Column - Register Form */}
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
                Join HEOR Signal
              </h1>
              <p className="text-slate-600 dark:text-slate-400 text-lg font-medium">
                Create your account to access personalized healthcare
                intelligence
              </p>
            </div>

            {/* Register Form */}
            <Card className="border-0 shadow-2xl bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl border border-white/30 dark:border-slate-700/50">
              <CardContent className="p-10">
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-3">
                    <Label
                      htmlFor="name"
                      className="text-sm font-bold text-slate-700 dark:text-slate-300"
                    >
                      Full name
                    </Label>
                    <div className="relative">
                      <User className="absolute left-4 top-4 h-5 w-5 text-slate-400" />
                      <Input
                        id="name"
                        type="text"
                        placeholder="Enter your full name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="pl-12 h-14 border-slate-200/50 dark:border-slate-700/50 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm focus:border-emerald-500 dark:focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20 dark:focus:ring-emerald-400/20 rounded-xl transition-all duration-200"
                        required
                      />
                    </div>
                  </div>

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
                        className="pl-12 h-14 border-slate-200/50 dark:border-slate-700/50 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm focus:border-emerald-500 dark:focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20 dark:focus:ring-emerald-400/20 rounded-xl transition-all duration-200"
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
                        placeholder="Create a secure password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-12 h-14 border-slate-200/50 dark:border-slate-700/50 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm focus:border-emerald-500 dark:focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20 dark:focus:ring-emerald-400/20 rounded-xl transition-all duration-200"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label
                      htmlFor="confirmPassword"
                      className="text-sm font-bold text-slate-700 dark:text-slate-300"
                    >
                      Confirm password
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-4 h-5 w-5 text-slate-400" />
                      <Input
                        id="confirmPassword"
                        type="password"
                        placeholder="Confirm your password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="pl-12 h-14 border-slate-200/50 dark:border-slate-700/50 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm focus:border-emerald-500 dark:focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20 dark:focus:ring-emerald-400/20 rounded-xl transition-all duration-200"
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
                    className="w-full h-14 bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-700 hover:via-teal-700 hover:to-cyan-700 text-white font-bold shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 rounded-xl text-lg"
                    disabled={
                      isLoading ||
                      !name ||
                      !email ||
                      !password ||
                      !confirmPassword
                    }
                  >
                    {isLoading ? (
                      <div className="flex items-center">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                        Creating your account...
                      </div>
                    ) : (
                      <div className="flex items-center">
                        Create account
                        <ArrowRight className="ml-3 h-5 w-5" />
                      </div>
                    )}
                  </Button>
                </form>

                {/* Account Link */}
                <div className="text-center mt-8 pt-8 border-t border-slate-200/50 dark:border-slate-700/50">
                  <p className="text-slate-600 dark:text-slate-400 font-medium">
                    Already have an account?{" "}
                    <button
                      onClick={onSwitchToLogin}
                      className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 font-bold transition-colors hover:underline"
                    >
                      Sign in here
                    </button>
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Right Column - Hero Section */}
        <div className="hidden lg:flex flex-1 items-center justify-center p-16 bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-600 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-600/20 to-cyan-600/20 backdrop-blur-sm"></div>
          <div className="relative z-10 max-w-lg text-center space-y-10">
            <div className="space-y-6">
              <h2 className="text-5xl font-bold leading-tight drop-shadow-sm">
                Unlock Healthcare Intelligence
              </h2>
              <p className="text-xl text-emerald-100 leading-relaxed font-medium">
                Join thousands of healthcare professionals who trust HEOR Signal
                for critical insights and regulatory monitoring.
              </p>
            </div>

            <div className="grid gap-8 text-left">
              <div className="flex items-start space-x-5">
                <div className="bg-white/20 rounded-xl p-3 shadow-lg">
                  <Sparkles className="h-7 w-7" />
                </div>
                <div>
                  <h3 className="font-bold text-xl mb-2">
                    Personalized Experience
                  </h3>
                  <p className="text-emerald-100 leading-relaxed">
                    Tailored insights based on your specific healthcare
                    expertise and interests
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-5">
                <div className="bg-white/20 rounded-xl p-3 shadow-lg">
                  <Globe className="h-7 w-7" />
                </div>
                <div>
                  <h3 className="font-bold text-xl mb-2">Global Coverage</h3>
                  <p className="text-emerald-100 leading-relaxed">
                    Access regulatory updates and clinical data from sources
                    worldwide
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-5">
                <div className="bg-white/20 rounded-xl p-3 shadow-lg">
                  <Brain className="h-7 w-7" />
                </div>
                <div>
                  <h3 className="font-bold text-xl mb-2">AI-Driven Analysis</h3>
                  <p className="text-emerald-100 leading-relaxed">
                    Advanced algorithms deliver relevant insights to accelerate
                    your research
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
