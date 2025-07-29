import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useLocation } from 'wouter';
import agilLogo from '@assets/Logo Primary_1753368301220.png';

interface LandingPageProps {
  onStartChat: () => void;
}

export function LandingPage({ onStartChat }: LandingPageProps) {
  const [, setLocation] = useLocation();

  const handleLogin = () => {
    setLocation('/auth');
  };

  const handleRegister = () => {
    // Use sessionStorage to indicate register intent without URL parameters
    sessionStorage.setItem('authIntent', 'register');
    setLocation('/auth');
  };
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
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
            
            <div className="flex items-center">
              <Button onClick={handleLogin} variant="outline" size="sm">
                <i className="fas fa-sign-in-alt mr-2"></i>
                Sign In
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-16">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-6">
            Welcome to HEOR Signal
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto leading-relaxed">
            Your intelligent platform for Health Economics and Outcomes Research insights. 
            Monitor regulatory changes, clinical developments, market updates, and real-world evidence 
            with AI-powered personalization.
          </p>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
          <Card className="border-2 border-red-100 dark:border-red-900/30 bg-red-50 dark:bg-red-900/10">
            <CardHeader className="pb-4">
              <div className="w-12 h-12 bg-red-600 rounded-lg flex items-center justify-center mb-4">
                <i className="fas fa-gavel text-white text-lg"></i>
              </div>
              <CardTitle className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Regulatory Alerts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 dark:text-gray-300 text-sm">
                Stay informed about FDA approvals, policy changes, and compliance updates
              </p>
            </CardContent>
          </Card>

          <Card className="border-2 border-blue-100 dark:border-blue-900/30 bg-blue-50 dark:bg-blue-900/10">
            <CardHeader className="pb-4">
              <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center mb-4">
                <i className="fas fa-flask text-white text-lg"></i>
              </div>
              <CardTitle className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Clinical Updates
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 dark:text-gray-300 text-sm">
                Track clinical trials, research findings, and treatment developments
              </p>
            </CardContent>
          </Card>

          <Card className="border-2 border-green-100 dark:border-green-900/30 bg-green-50 dark:bg-green-900/10">
            <CardHeader className="pb-4">
              <div className="w-12 h-12 bg-green-600 rounded-lg flex items-center justify-center mb-4">
                <i className="fas fa-chart-line text-white text-lg"></i>
              </div>
              <CardTitle className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Market Intelligence
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 dark:text-gray-300 text-sm">
                Monitor market trends, pricing changes, and competitive landscape
              </p>
            </CardContent>
          </Card>

          <Card className="border-2 border-purple-100 dark:border-purple-900/30 bg-purple-50 dark:bg-purple-900/10">
            <CardHeader className="pb-4">
              <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center mb-4">
                <i className="fas fa-database text-white text-lg"></i>
              </div>
              <CardTitle className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Real-World Evidence
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 dark:text-gray-300 text-sm">
                Access patient outcomes, safety data, and effectiveness studies
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Key Benefits */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-12 mb-16">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h3 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-6">
                Powered by AI Intelligence
              </h3>
              <div className="space-y-4">
                <div className="flex items-start space-x-4">
                  <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                    <i className="fas fa-brain text-white text-sm"></i>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
                      Personalized Insights
                    </h4>
                    <p className="text-gray-600 dark:text-gray-300 text-sm">
                      AI learns your preferences to deliver relevant, actionable intelligence
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-4">
                  <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center flex-shrink-0">
                    <i className="fas fa-clock text-white text-sm"></i>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
                      Real-Time Monitoring
                    </h4>
                    <p className="text-gray-600 dark:text-gray-300 text-sm">
                      Get instant alerts on developments that matter to your work
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-4">
                  <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
                    <i className="fas fa-comments text-white text-sm"></i>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
                      Expert Guidance
                    </h4>
                    <p className="text-gray-600 dark:text-gray-300 text-sm">
                      Chat with Hero, your AI assistant specialized in HEOR insights
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="text-center">
              <div className="w-48 h-48 bg-gradient-to-br from-blue-400 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-8">
                <i className="fas fa-robot text-white text-6xl"></i>
              </div>
              <h4 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Meet Hero
              </h4>
              <p className="text-gray-600 dark:text-gray-300">
                Your intelligent HEOR assistant ready to help you navigate complex healthcare data
              </p>
            </div>
          </div>
        </div>

        {/* Call to Action */}
        <div className="text-center">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-12 text-white">
            <h3 className="text-3xl font-bold mb-4">
              Ready to Get Started?
            </h3>
            <p className="text-xl mb-8 opacity-90">
              Let Hero help you set up your personalized HEOR dashboard
            </p>
            <Button 
              onClick={handleRegister}
              size="lg"
              className="bg-white text-blue-600 hover:bg-gray-100 font-semibold px-8 py-4 text-lg rounded-lg shadow-lg transition-all duration-200 hover:shadow-xl"
            >
              <i className="fas fa-user-plus mr-3"></i>
              Get Started
            </Button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 py-8">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            © 2025 AGILf(x) HEOR Signal. Empowering healthcare decisions with intelligent insights.
          </p>
        </div>
      </footer>
    </div>
  );
}