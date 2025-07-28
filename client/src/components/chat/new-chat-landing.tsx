import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { apiRequest } from '@/lib/queryClient';

interface NewChatLandingProps {
  onStartNewChat: (preferences: {
    selected_categories: string[];
    preference_expertise?: string;
    conversation_title?: string;
  }) => void;
  onBack: () => void;
}

interface UserPreferences {
  selected_categories: string[];
  preference_expertise?: string;
}

export function NewChatLanding({ onStartNewChat, onBack }: NewChatLandingProps) {
  const { session } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [userPreferences, setUserPreferences] = useState<UserPreferences | null>(null);

  // Load user's current preferences
  React.useEffect(() => {
    const loadUserPreferences = async () => {
      if (!session?.sessionId) return;
      
      try {
        const response = await apiRequest('GET', `/api/user/status/${session.sessionId}`);
        const data = await response.json();
        
        if (data.success) {
          setUserPreferences({
            selected_categories: data.selected_categories || [],
            preference_expertise: data.preference_expertise
          });
        }
      } catch (error) {
        console.error('Error loading user preferences:', error);
      }
    };

    loadUserPreferences();
  }, [session?.sessionId]);

  const handleUseCurrentPreferences = () => {
    if (userPreferences) {
      onStartNewChat({
        selected_categories: userPreferences.selected_categories,
        preference_expertise: userPreferences.preference_expertise,
        conversation_title: `New Conversation - ${new Date().toLocaleDateString()}`
      });
    }
  };

  const handleModifyPreferences = () => {
    // This will be handled by the parent component to show preference selector
    onStartNewChat({
      selected_categories: [],
      preference_expertise: '',
      conversation_title: ''
    });
  };

  const handleQuickStart = (scenario: string) => {
    let categories: string[] = [];
    let expertise = '';
    let title = '';

    switch (scenario) {
      case 'regulatory':
        categories = ['Regulatory Updates', 'FDA', 'EMA', 'Health Technology Assessment'];
        expertise = 'Regulatory Affairs';
        title = 'Regulatory Monitoring Session';
        break;
      case 'market':
        categories = ['Market Access', 'Pricing', 'Reimbursement', 'Health Economics'];
        expertise = 'Market Access';
        title = 'Market Access Analysis';
        break;
      case 'clinical':
        categories = ['Clinical Trials', 'Real-World Evidence', 'Patient Outcomes'];
        expertise = 'Clinical Research';
        title = 'Clinical Evidence Review';
        break;
      case 'general':
        categories = userPreferences?.selected_categories || [];
        expertise = userPreferences?.preference_expertise || '';
        title = 'General HEOR Discussion';
        break;
    }

    onStartNewChat({
      selected_categories: categories,
      preference_expertise: expertise,
      conversation_title: title
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <Button 
            onClick={onBack}
            variant="ghost" 
            className="absolute top-4 left-4"
          >
            <i className="fas fa-arrow-left mr-2"></i>
            Back
          </Button>
          
          <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            Start New Conversation
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Choose how you'd like to start your new HEOR conversation
          </p>
        </div>

        {/* Current Preferences Display */}
        {userPreferences && (
          <Card className="mb-8 border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950">
            <CardHeader>
              <CardTitle className="text-blue-900 dark:text-blue-100">
                <i className="fas fa-user-check mr-2"></i>
                Your Current Preferences
              </CardTitle>
              <CardDescription className="text-blue-700 dark:text-blue-300">
                These are your default settings from your profile
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {userPreferences.selected_categories.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
                      Categories:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {userPreferences.selected_categories.map((category) => (
                        <Badge key={category} variant="secondary" className="bg-blue-200 dark:bg-blue-800">
                          {category}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                
                {userPreferences.preference_expertise && (
                  <div>
                    <p className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
                      Expertise:
                    </p>
                    <Badge variant="outline" className="border-blue-300 dark:border-blue-700">
                      {userPreferences.preference_expertise}
                    </Badge>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Start Options */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => handleQuickStart('regulatory')}>
            <CardHeader>
              <CardTitle className="flex items-center text-red-700 dark:text-red-300">
                <i className="fas fa-shield-alt mr-2"></i>
                Regulatory Monitoring
              </CardTitle>
              <CardDescription>
                Focus on FDA, EMA, and regulatory updates
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Track regulatory changes, approval processes, and compliance requirements
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => handleQuickStart('market')}>
            <CardHeader>
              <CardTitle className="flex items-center text-green-700 dark:text-green-300">
                <i className="fas fa-chart-line mr-2"></i>
                Market Access
              </CardTitle>
              <CardDescription>
                Pricing, reimbursement, and market analysis
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Analyze market access strategies, pricing models, and reimbursement pathways
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => handleQuickStart('clinical')}>
            <CardHeader>
              <CardTitle className="flex items-center text-purple-700 dark:text-purple-300">
                <i className="fas fa-flask mr-2"></i>
                Clinical Evidence
              </CardTitle>
              <CardDescription>
                Clinical trials and real-world evidence
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Review clinical trial data, RWE studies, and patient outcomes
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => handleQuickStart('general')}>
            <CardHeader>
              <CardTitle className="flex items-center text-blue-700 dark:text-blue-300">
                <i className="fas fa-comments mr-2"></i>
                General Discussion
              </CardTitle>
              <CardDescription>
                Use your current preferences
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Start with your default categories and expertise settings
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button 
            onClick={handleUseCurrentPreferences}
            disabled={!userPreferences || isLoading}
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3"
          >
            <i className="fas fa-play mr-2"></i>
            Use Current Preferences
          </Button>
          
          <Button 
            onClick={handleModifyPreferences}
            variant="outline"
            className="border-blue-600 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950 px-8 py-3"
          >
            <i className="fas fa-edit mr-2"></i>
            Modify Preferences
          </Button>
        </div>
      </div>
    </div>
  );
}