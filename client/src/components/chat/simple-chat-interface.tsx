import { useState } from "react";
import { OnboardingChat } from "@/components/onboarding/onboarding-chat";
import { HEORDashboard } from "@/components/dashboard/heor-dashboard";

interface UserStatus {
  session_id: string;
  onboarding_completed: boolean;
  selected_categories: string[];
  preference_expertise?: string;
}

interface SimpleChatInterfaceProps {
  sessionId: string;
  userStatus?: UserStatus;
}

export function SimpleChatInterface({ sessionId, userStatus }: SimpleChatInterfaceProps) {
  const onboardingCompleted = userStatus?.onboarding_completed ?? false;
  const hasPreferenceExpertise = !!(userStatus?.preference_expertise);
  const canShowDashboard = onboardingCompleted && hasPreferenceExpertise;
  
  const [showDashboard, setShowDashboard] = useState(canShowDashboard);
  const [selectedCategories] = useState<string[]>(userStatus?.selected_categories || []);

  // Handle dashboard navigation from onboarding chat
  const handleDashboardReady = () => {
    setShowDashboard(true);
  };

  // Debug dashboard conditions
  console.log('Dashboard render check:', { 
    showDashboard, 
    canShowDashboard, 
    onboardingCompleted, 
    hasPreferenceExpertise,
    userStatus: userStatus?.preference_expertise 
  });
  
  // Show dashboard if both conditions are met
  if (showDashboard && canShowDashboard) {
    console.log('Rendering HEOR Dashboard with categories:', selectedCategories);
    return <HEORDashboard selectedCategories={selectedCategories} sessionId={sessionId} />;
  }

  // Otherwise show onboarding chat
  return (
    <OnboardingChat 
      sessionId={sessionId} 
      userStatus={userStatus}
      onDashboardReady={handleDashboardReady}
    />
  );
}