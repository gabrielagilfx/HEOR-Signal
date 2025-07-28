import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { apiRequest } from '@/lib/queryClient';

interface UserPreferenceSelectorProps {
  onPreferencesSelected: (preferences: {
    selected_categories: string[];
    preference_expertise: string;
    conversation_title: string;
  }) => void;
  onBack: () => void;
  initialPreferences?: {
    selected_categories: string[];
    preference_expertise?: string;
    conversation_title?: string;
  };
}

const AVAILABLE_CATEGORIES = [
  'Regulatory Updates',
  'FDA',
  'EMA',
  'Health Technology Assessment',
  'Market Access',
  'Pricing',
  'Reimbursement',
  'Health Economics',
  'Clinical Trials',
  'Real-World Evidence',
  'Patient Outcomes',
  'Value Assessment',
  'Health Policy',
  'Drug Development',
  'Medical Devices',
  'Digital Health',
  'Precision Medicine',
  'Rare Diseases',
  'Oncology',
  'Cardiovascular',
  'Neurology',
  'Immunology'
];

const EXPERTISE_OPTIONS = [
  'Regulatory Affairs',
  'Market Access',
  'Health Economics',
  'Clinical Research',
  'Medical Affairs',
  'Commercial Strategy',
  'Patient Advocacy',
  'Policy & Government Affairs',
  'Medical Writing',
  'Biostatistics',
  'Epidemiology',
  'Pharmacovigilance',
  'Quality Assurance',
  'Medical Device',
  'Digital Health',
  'Consulting',
  'Academic Research',
  'Other'
];

export function UserPreferenceSelector({ 
  onPreferencesSelected, 
  onBack, 
  initialPreferences 
}: UserPreferenceSelectorProps) {
  const { session } = useAuth();
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    initialPreferences?.selected_categories || []
  );
  const [preferenceExpertise, setPreferenceExpertise] = useState<string>(
    initialPreferences?.preference_expertise || ''
  );
  const [conversationTitle, setConversationTitle] = useState<string>(
    initialPreferences?.conversation_title || ''
  );
  const [isLoading, setIsLoading] = useState(false);
  const [userPreferences, setUserPreferences] = useState<any>(null);

  // Load user's current preferences if not provided
  useEffect(() => {
    const loadUserPreferences = async () => {
      if (!session?.sessionId || initialPreferences) return;
      
      try {
        const response = await apiRequest('GET', `/api/user/status/${session.sessionId}`);
        const data = await response.json();
        
        if (data.success) {
          setUserPreferences(data);
          setSelectedCategories(data.selected_categories || []);
          setPreferenceExpertise(data.preference_expertise || '');
        }
      } catch (error) {
        console.error('Error loading user preferences:', error);
      }
    };

    loadUserPreferences();
  }, [session?.sessionId, initialPreferences]);

  const handleCategoryToggle = (category: string) => {
    setSelectedCategories(prev => 
      prev.includes(category) 
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const handleStartChat = async () => {
    if (selectedCategories.length === 0) {
      alert('Please select at least one category');
      return;
    }

    if (!preferenceExpertise.trim()) {
      alert('Please select your expertise area');
      return;
    }

    if (!conversationTitle.trim()) {
      setConversationTitle(`New Conversation - ${new Date().toLocaleDateString()}`);
    }

    setIsLoading(true);
    
    try {
      // Create new thread with preferences
      const response = await apiRequest('POST', '/api/thread/create', {
        session_id: session?.sessionId,
        selected_categories: selectedCategories,
        preference_expertise: preferenceExpertise,
        conversation_title: conversationTitle || `New Conversation - ${new Date().toLocaleDateString()}`
      });

      const data = await response.json();
      
      if (data.success) {
        onPreferencesSelected({
          selected_categories: selectedCategories,
          preference_expertise: preferenceExpertise,
          conversation_title: conversationTitle || `New Conversation - ${new Date().toLocaleDateString()}`
        });
      } else {
        alert('Failed to create new conversation. Please try again.');
      }
    } catch (error) {
      console.error('Error creating new conversation:', error);
      alert('Failed to create new conversation. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUseCurrentPreferences = () => {
    if (userPreferences) {
      setSelectedCategories(userPreferences.selected_categories || []);
      setPreferenceExpertise(userPreferences.preference_expertise || '');
      setConversationTitle(`New Conversation - ${new Date().toLocaleDateString()}`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
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
            Customize Your Conversation
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Select categories and expertise for your new HEOR conversation
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Categories Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center text-blue-700 dark:text-blue-300">
                <i className="fas fa-layer-group mr-2"></i>
                Select Categories
              </CardTitle>
              <CardDescription>
                Choose the HEOR topics you want to focus on
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {AVAILABLE_CATEGORIES.map((category) => (
                    <Badge
                      key={category}
                      variant={selectedCategories.includes(category) ? "default" : "outline"}
                      className={`cursor-pointer transition-colors ${
                        selectedCategories.includes(category)
                          ? 'bg-blue-600 hover:bg-blue-700'
                          : 'hover:bg-blue-50 dark:hover:bg-blue-950'
                      }`}
                      onClick={() => handleCategoryToggle(category)}
                    >
                      {category}
                    </Badge>
                  ))}
                </div>
                
                {userPreferences && (
                  <Button 
                    onClick={handleUseCurrentPreferences}
                    variant="outline"
                    size="sm"
                    className="mt-4"
                  >
                    <i className="fas fa-undo mr-2"></i>
                    Use Current Preferences
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Expertise and Title */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center text-green-700 dark:text-green-300">
                <i className="fas fa-user-tie mr-2"></i>
                Expertise & Details
              </CardTitle>
              <CardDescription>
                Set your expertise area and conversation title
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Expertise Selection */}
              <div>
                <Label htmlFor="expertise" className="text-sm font-medium">
                  Your Expertise Area
                </Label>
                <select
                  id="expertise"
                  value={preferenceExpertise}
                  onChange={(e) => setPreferenceExpertise(e.target.value)}
                  className="mt-2 w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                >
                  <option value="">Select your expertise...</option>
                  {EXPERTISE_OPTIONS.map((expertise) => (
                    <option key={expertise} value={expertise}>
                      {expertise}
                    </option>
                  ))}
                </select>
              </div>

              {/* Conversation Title */}
              <div>
                <Label htmlFor="title" className="text-sm font-medium">
                  Conversation Title (Optional)
                </Label>
                <Input
                  id="title"
                  type="text"
                  placeholder="Enter a title for this conversation..."
                  value={conversationTitle}
                  onChange={(e) => setConversationTitle(e.target.value)}
                  className="mt-2"
                />
              </div>

              {/* Selected Categories Summary */}
              {selectedCategories.length > 0 && (
                <div>
                  <Label className="text-sm font-medium">
                    Selected Categories ({selectedCategories.length})
                  </Label>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {selectedCategories.map((category) => (
                      <Badge key={category} variant="secondary" className="text-xs">
                        {category}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-center mt-8">
          <Button 
            onClick={handleStartChat}
            disabled={isLoading || selectedCategories.length === 0 || !preferenceExpertise.trim()}
            className="bg-green-600 hover:bg-green-700 text-white px-8 py-3"
          >
            {isLoading ? (
              <>
                <i className="fas fa-spinner fa-spin mr-2"></i>
                Creating Conversation...
              </>
            ) : (
              <>
                <i className="fas fa-play mr-2"></i>
                Start New Conversation
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}