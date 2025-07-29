import { LandingPage } from "@/components/landing/landing-page";

export default function Home() {
  const handleStartChat = () => {
    // This will be handled by the LandingPage component
    // which will redirect to auth if not authenticated
  };

  return (
    <div className="min-h-screen">
      <LandingPage onStartChat={handleStartChat} />
    </div>
  );
}