import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/contexts/auth-context";
import { User, Mail, Lock, ArrowRight, Sparkles, Globe, Brain } from "lucide-react";
import agilLogo from "@assets/Logo Primary_1753368301220.png";

interface RegisterComponentProps {
  onRegisterSuccess: (userData: any) => void;
  onBackToLanding: () => void;
}

export function RegisterComponent({ onRegisterSuccess, onBackToLanding }: RegisterComponentProps) {
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
        setError(err instanceof Error ? err.message : 'Registration failed');
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <div className="min-h-screen flex">
        {/* Left Column - Register Form */}
        <div className="flex-1 flex items-center justify-center p-8 lg:p-12">
          <div className="w-full max-w-md space-y-8">
            {/* Header */}
            <div className="text-center">
              <button 
                onClick={onBackToLanding}
                className="inline-flex items-center text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 mb-8 transition-colors"
              >
                ← Back to Home
              </button>
              
              <div className="flex items-center justify-center mb-6">
                <img 
                  src={agilLogo} 
                  alt="HEOR Signal" 
                  className="h-12 w-12 object-contain" 
                />
              </div>
              
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
                Join HEOR Signal
              </h1>
              <p className="text-slate-600 dark:text-slate-400">
                Create your account to access personalized healthcare intelligence
              </p>
            </div>

            {/* Register Form */}
            <Card className="border-0 shadow-xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
              <CardContent className="p-8">
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Full name
                    </Label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                      <Input
                        id="name"
                        type="text"
                        placeholder="Enter your full name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="pl-10 h-12 border-slate-200 dark:border-slate-700 focus:border-emerald-500 dark:focus:border-emerald-400"
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-medium text-slate-700 dark:text-slate-300">
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
                        className="pl-10 h-12 border-slate-200 dark:border-slate-700 focus:border-emerald-500 dark:focus:border-emerald-400"
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Password
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                      <Input
                        id="password"
                        type="password"
                        placeholder="Create a secure password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-10 h-12 border-slate-200 dark:border-slate-700 focus:border-emerald-500 dark:focus:border-emerald-400"
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Confirm password
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                      <Input
                        id="confirmPassword"
                        type="password"
                        placeholder="Confirm your password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="pl-10 h-12 border-slate-200 dark:border-slate-700 focus:border-emerald-500 dark:focus:border-emerald-400"
                        required
                      />
                    </div>
                  </div>
                  
                  {error && (
                    <Alert variant="destructive" className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20">
                      <AlertDescription className="text-red-600 dark:text-red-400">
                        {error}
                      </AlertDescription>
                    </Alert>
                  )}
                  
                  <Button 
                    type="submit" 
                    className="w-full h-12 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-medium shadow-lg hover:shadow-xl transition-all duration-200"
                    disabled={isLoading || !name || !email || !password || !confirmPassword}
                  >
                    {isLoading ? (
                      <div className="flex items-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Creating your account...
                      </div>
                    ) : (
                      <div className="flex items-center">
                        Create account
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </div>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Right Column - Hero Section */}
        <div className="hidden lg:flex flex-1 items-center justify-center p-12 bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-600 text-white">
          <div className="max-w-lg text-center space-y-8">
            <div className="space-y-4">
              <h2 className="text-4xl font-bold leading-tight">
                Unlock Healthcare Intelligence
              </h2>
              <p className="text-xl text-emerald-100 leading-relaxed">
                Join thousands of healthcare professionals who trust HEOR Signal for critical insights and regulatory monitoring.
              </p>
            </div>
            
            <div className="grid gap-6 text-left">
              <div className="flex items-start space-x-4">
                <div className="bg-white/10 rounded-lg p-2">
                  <Sparkles className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Personalized Experience</h3>
                  <p className="text-emerald-100">Tailored insights based on your specific healthcare expertise and interests</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-4">
                <div className="bg-white/10 rounded-lg p-2">
                  <Globe className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Global Coverage</h3>
                  <p className="text-emerald-100">Access regulatory updates and clinical data from sources worldwide</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-4">
                <div className="bg-white/10 rounded-lg p-2">
                  <Brain className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">AI-Driven Analysis</h3>
                  <p className="text-emerald-100">Advanced algorithms deliver relevant insights to accelerate your research</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}