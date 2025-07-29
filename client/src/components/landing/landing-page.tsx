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
    setLocation('/auth?mode=login');
  };

  const handleRegister = () => {
    setLocation('/auth?mode=register');
  };
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-indigo-950/30">
      {/* Header */}
      <header className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border-b border-white/20 dark:border-slate-700/50 shadow-lg shadow-slate-200/20 dark:shadow-slate-950/30">
        <div className="max-w-7xl mx-auto px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <img 
                src={agilLogo} 
                alt="AGILf(x)" 
                className="w-16 h-16 object-contain drop-shadow-sm" 
              />
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-200 bg-clip-text text-transparent">
                  HEOR Signal
                </h1>
                <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">
                  AI-powered healthcare insights and regulatory monitoring
                </p>
              </div>
            </div>
            
            <div className="flex items-center">
              <Button 
                onClick={handleLogin} 
                variant="outline" 
                size="sm"
                className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm border-slate-200/50 dark:border-slate-600/50 hover:bg-white/80 dark:hover:bg-slate-700/80 transition-all duration-200 shadow-sm"
              >
                <i className="fas fa-sign-in-alt mr-2"></i>
                Sign In
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-20">
        <div className="text-center mb-20">
          <h2 className="text-5xl font-bold bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 dark:from-white dark:via-slate-100 dark:to-white bg-clip-text text-transparent mb-8 leading-tight">
            Welcome to HEOR Signal
          </h2>
          <p className="text-xl text-slate-600 dark:text-slate-300 max-w-4xl mx-auto leading-relaxed font-medium">
            Your intelligent platform for Health Economics and Outcomes Research insights. 
            Monitor regulatory changes, clinical developments, market updates, and real-world evidence 
            with AI-powered personalization.
          </p>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-20">
          <Card className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl border border-white/30 dark:border-slate-700/50 shadow-xl shadow-red-500/10 dark:shadow-red-500/5 hover:shadow-2xl hover:shadow-red-500/20 dark:hover:shadow-red-500/10 transition-all duration-300 hover:-translate-y-1 group">
            <CardHeader className="pb-4">
              <div className="w-14 h-14 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform duration-300">
                <i className="fas fa-gavel text-white text-xl"></i>
              </div>
              <CardTitle className="text-lg font-bold text-slate-900 dark:text-white">
                Regulatory Alerts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed">
                Stay informed about FDA approvals, policy changes, and compliance updates
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl border border-white/30 dark:border-slate-700/50 shadow-xl shadow-blue-500/10 dark:shadow-blue-500/5 hover:shadow-2xl hover:shadow-blue-500/20 dark:hover:shadow-blue-500/10 transition-all duration-300 hover:-translate-y-1 group">
            <CardHeader className="pb-4">
              <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform duration-300">
                <i className="fas fa-flask text-white text-xl"></i>
              </div>
              <CardTitle className="text-lg font-bold text-slate-900 dark:text-white">
                Clinical Updates
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed">
                Track clinical trials, research findings, and treatment developments
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl border border-white/30 dark:border-slate-700/50 shadow-xl shadow-green-500/10 dark:shadow-green-500/5 hover:shadow-2xl hover:shadow-green-500/20 dark:hover:shadow-green-500/10 transition-all duration-300 hover:-translate-y-1 group">
            <CardHeader className="pb-4">
              <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform duration-300">
                <i className="fas fa-chart-line text-white text-xl"></i>
              </div>
              <CardTitle className="text-lg font-bold text-slate-900 dark:text-white">
                Market Intelligence
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed">
                Monitor market trends, pricing changes, and competitive landscape
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl border border-white/30 dark:border-slate-700/50 shadow-xl shadow-purple-500/10 dark:shadow-purple-500/5 hover:shadow-2xl hover:shadow-purple-500/20 dark:hover:shadow-purple-500/10 transition-all duration-300 hover:-translate-y-1 group">
            <CardHeader className="pb-4">
              <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform duration-300">
                <i className="fas fa-database text-white text-xl"></i>
              </div>
              <CardTitle className="text-lg font-bold text-slate-900 dark:text-white">
                Real-World Evidence
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed">
                Access patient outcomes, safety data, and effectiveness studies
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Key Benefits */}
        <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl rounded-3xl border border-white/30 dark:border-slate-700/50 p-16 mb-20 shadow-2xl shadow-slate-200/20 dark:shadow-slate-950/30">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <h3 className="text-4xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-200 bg-clip-text text-transparent mb-8">
                Powered by AI Intelligence
              </h3>
              <div className="space-y-6">
                <div className="flex items-start space-x-5">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg">
                    <i className="fas fa-brain text-white text-lg"></i>
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-white mb-2 text-lg">
                      Personalized Insights
                    </h4>
                    <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                      AI learns your preferences to deliver relevant, actionable intelligence
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-5">
                  <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg">
                    <i className="fas fa-clock text-white text-lg"></i>
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-white mb-2 text-lg">
                      Real-Time Monitoring
                    </h4>
                    <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                      Get instant alerts on developments that matter to your work
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-5">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg">
                    <i className="fas fa-comments text-white text-lg"></i>
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-white mb-2 text-lg">
                      Expert Guidance
                    </h4>
                    <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                      Chat with Hero, your AI assistant specialized in HEOR insights
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="text-center">
              <div className="w-56 h-56 bg-gradient-to-br from-blue-500 via-purple-500 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-blue-500/30 dark:shadow-blue-500/20">
                <i className="fas fa-robot text-white text-7xl"></i>
              </div>
              <h4 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">
                Meet Hero
              </h4>
              <p className="text-slate-600 dark:text-slate-300 text-lg leading-relaxed">
                Your intelligent HEOR assistant ready to help you navigate complex healthcare data
              </p>
            </div>
          </div>
        </div>

        {/* Call to Action */}
        <div className="text-center">
          <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 rounded-3xl p-16 text-white shadow-2xl shadow-blue-500/25 dark:shadow-blue-500/20 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-purple-600/20 backdrop-blur-sm"></div>
            <div className="relative z-10">
              <h3 className="text-4xl font-bold mb-6 drop-shadow-sm">
                Ready to Get Started?
              </h3>
              <p className="text-xl mb-10 opacity-95 max-w-2xl mx-auto leading-relaxed">
                Let Hero help you set up your personalized HEOR dashboard
              </p>
              <Button 
                onClick={handleRegister}
                size="lg"
                className="bg-white text-blue-600 hover:bg-slate-50 font-bold px-10 py-5 text-xl rounded-xl shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 hover:-translate-y-1"
              >
                <i className="fas fa-user-plus mr-3"></i>
                Get Started
              </Button>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl border-t border-white/20 dark:border-slate-700/50 py-10">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <p className="text-slate-500 dark:text-slate-400 font-medium">
            © 2025 AGILf(x) HEOR Signal. Empowering healthcare decisions with intelligent insights.
          </p>
        </div>
      </footer>
    </div>
  );
}