import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocation } from "wouter";
import agilLogo from "@assets/Logo Primary_1753368301220-DP2VvqsV.png";

export default function Home() {
  const [, setLocation] = useLocation();

  const handleLogin = () => {
    setLocation("/auth?mode=login");
  };

  const handleRegister = () => {
    setLocation("/auth?mode=register");
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
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
            
            <div className="flex items-center space-x-3">
              <Button onClick={handleLogin} variant="outline" size="sm">
                <i className="fas fa-sign-in-alt mr-2"></i>
                Sign In
              </Button>
              <Button onClick={handleRegister} size="sm">
                <i className="fas fa-user-plus mr-2"></i>
                Get Started
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 dark:text-gray-100 mb-6">
            Your AI-Powered
            <span className="block text-blue-600 dark:text-blue-400">HEOR Intelligence</span>
          </h1>
          
          <p className="text-xl text-gray-600 dark:text-gray-400 mb-12 max-w-3xl mx-auto">
            Stay ahead of critical healthcare developments with personalized AI insights. 
            Monitor regulatory changes, clinical trials, and market updates tailored to your expertise.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
            <Button onClick={handleRegister} size="lg" className="text-lg px-8 py-3">
              <i className="fas fa-rocket mr-2"></i>
              Start Your Free Account
            </Button>
            <Button onClick={handleLogin} variant="outline" size="lg" className="text-lg px-8 py-3">
              <i className="fas fa-sign-in-alt mr-2"></i>
              Sign In
            </Button>
          </div>
        </div>

        {/* Feature Cards */}
        <div className="grid md:grid-cols-3 gap-8 mt-16">
          <Card className="text-center">
            <CardHeader>
              <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="fas fa-brain text-2xl text-blue-600 dark:text-blue-400"></i>
              </div>
              <CardTitle className="text-xl text-gray-900 dark:text-gray-100">
                AI-Powered Chat
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 dark:text-gray-400">
                Get instant answers to complex HEOR questions with our specialized AI assistant 
                trained on healthcare economics and outcomes research.
              </p>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="fas fa-bell text-2xl text-green-600 dark:text-green-400"></i>
              </div>
              <CardTitle className="text-xl text-gray-900 dark:text-gray-100">
                Smart Alerts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 dark:text-gray-400">
                Receive personalized notifications about regulatory changes, clinical developments, 
                and market updates relevant to your therapeutic areas.
              </p>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="fas fa-chart-line text-2xl text-purple-600 dark:text-purple-400"></i>
              </div>
              <CardTitle className="text-xl text-gray-900 dark:text-gray-100">
                Real-time Insights
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 dark:text-gray-400">
                Monitor key metrics and trends with live dashboards that track your most 
                important healthcare market indicators.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* CTA Section */}
        <div className="mt-20 text-center">
          <Card className="max-w-2xl mx-auto">
            <CardContent className="p-12">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
                Ready to Transform Your HEOR Workflow?
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-8">
                Join healthcare professionals who rely on HEOR Signal for critical market intelligence 
                and AI-powered insights.
              </p>
              <Button onClick={handleRegister} size="lg" className="text-lg px-12 py-3">
                <i className="fas fa-arrow-right mr-2"></i>
                Get Started Now
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}