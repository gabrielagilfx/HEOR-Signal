import React, { useState, useEffect } from 'react';
import { SimpleCard, SimpleCardContent, SimpleButton } from './components/simple/SimpleCard';

interface UserStatus {
  session_id: string;
  onboarding_completed: boolean;
  selected_categories: string[];
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

const CATEGORIES = [
  { id: 'regulatory', name: 'FDA Regulatory Alerts', description: 'FDA approvals, recalls, labeling changes' },
  { id: 'clinical', name: 'Clinical Trial Updates', description: 'New studies, status changes, results' },
  { id: 'market', name: 'Market Access & Payer News', description: 'PBM formulary changes, ICER reports' },
  { id: 'rwe', name: 'Real-World Evidence', description: 'CDC WONDER data, AHRQ insights' },
];

function HEORSignalApp() {
  const [sessionId, setSessionId] = useState<string>('');
  const [userStatus, setUserStatus] = useState<UserStatus | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [inputMessage, setInputMessage] = useState('');

  // Initialize user session
  useEffect(() => {
    initializeUser();
  }, []);

  const initializeUser = async () => {
    try {
      const response = await fetch('/api/user/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      const data = await response.json();
      
      if (data.success) {
        setSessionId(data.session_id);
        loadUserStatus(data.session_id);
        loadMessages(data.session_id);
      }
    } catch (error) {
      console.error('Failed to initialize user:', error);
      setLoading(false);
    }
  };

  const loadUserStatus = async (id: string) => {
    try {
      const response = await fetch(`/api/user/status/${id}`);
      const data = await response.json();
      setUserStatus(data);
      setSelectedCategories(Array.isArray(data.selected_categories) ? data.selected_categories : []);
    } catch (error) {
      console.error('Failed to load user status:', error);
    }
  };

  const loadMessages = async (id: string) => {
    try {
      const response = await fetch(`/api/chat/messages/${id}`);
      const data = await response.json();
      if (data.success && Array.isArray(data.messages)) {
        setMessages(data.messages);
      }
      setLoading(false);
    } catch (error) {
      console.error('Failed to load messages:', error);
      setLoading(false);
    }
  };

  const handleCategoryChange = (categoryId: string, checked: boolean) => {
    const updatedCategories = checked 
      ? [...selectedCategories, categoryId]
      : selectedCategories.filter(id => id !== categoryId);
    
    setSelectedCategories(updatedCategories);
  };

  const submitCategories = async () => {
    try {
      const response = await fetch('/api/chat/select-categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categories: selectedCategories,
          session_id: sessionId
        })
      });
      
      const data = await response.json();
      if (data.success) {
        setUserStatus(prev => prev ? { ...prev, onboarding_completed: true } : null);
        loadMessages(sessionId);
      }
    } catch (error) {
      console.error('Failed to submit categories:', error);
    }
  };

  const sendMessage = async () => {
    if (!inputMessage.trim()) return;

    try {
      const response = await fetch('/api/chat/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: inputMessage,
          session_id: sessionId
        })
      });
      
      const data = await response.json();
      if (data.success) {
        setInputMessage('');
        loadMessages(sessionId);
      }
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '20px', fontFamily: 'system-ui' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <h1 style={{ color: '#1f2937', marginBottom: '20px' }}>HEOR Signal</h1>
          <p>Loading your personalized dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', fontFamily: 'system-ui', backgroundColor: '#f9fafb', minHeight: '100vh' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <header style={{ marginBottom: '30px', textAlign: 'center' }}>
          <h1 style={{ color: '#1f2937', fontSize: '2.5rem', fontWeight: 'bold', marginBottom: '10px' }}>
            HEOR Signal
          </h1>
          <p style={{ color: '#6b7280', fontSize: '1.1rem' }}>
            Health Economics and Outcomes Research Dashboard
          </p>
        </header>

        {!userStatus?.onboarding_completed ? (
          <SimpleCard className="mb-6">
            <SimpleCardContent>
              <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '20px', color: '#1f2937' }}>
                Welcome! Select Your Data Categories
              </h2>
              <p style={{ color: '#6b7280', marginBottom: '20px' }}>
                Choose the types of HEOR data you'd like to monitor:
              </p>
              
              <div style={{ display: 'grid', gap: '15px' }}>
                {CATEGORIES.map(category => (
                  <label 
                    key={category.id}
                    style={{ 
                      display: 'flex', 
                      alignItems: 'flex-start', 
                      padding: '15px', 
                      border: '2px solid #e5e7eb',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      backgroundColor: selectedCategories.includes(category.id) ? '#dbeafe' : '#ffffff'
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedCategories.includes(category.id)}
                      onChange={(e) => handleCategoryChange(category.id, e.target.checked)}
                      style={{ marginRight: '12px', marginTop: '2px' }}
                    />
                    <div>
                      <div style={{ fontWeight: '600', color: '#1f2937', marginBottom: '5px' }}>
                        {category.name}
                      </div>
                      <div style={{ color: '#6b7280', fontSize: '0.9rem' }}>
                        {category.description}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
              
              <div style={{ marginTop: '20px', textAlign: 'center' }}>
                <SimpleButton 
                  onClick={submitCategories}
                  disabled={selectedCategories.length === 0}
                >
                  Complete Setup ({selectedCategories.length} selected)
                </SimpleButton>
              </div>
            </SimpleCardContent>
          </SimpleCard>
        ) : (
          <SimpleCard className="mb-6">
            <SimpleCardContent>
              <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '20px', color: '#1f2937' }}>
                Chat with HEOR Signal
              </h2>
              
              <div style={{ 
                maxHeight: '400px', 
                overflowY: 'auto', 
                border: '1px solid #e5e7eb', 
                borderRadius: '8px', 
                padding: '15px',
                marginBottom: '20px',
                backgroundColor: '#f9fafb'
              }}>
                {messages.length === 0 ? (
                  <p style={{ color: '#6b7280', textAlign: 'center' }}>
                    Your dashboard is ready! Start a conversation to get insights.
                  </p>
                ) : (
                  messages.map(message => (
                    <div 
                      key={message.id}
                      style={{ 
                        marginBottom: '15px',
                        padding: '10px',
                        borderRadius: '8px',
                        backgroundColor: message.role === 'user' ? '#dbeafe' : '#f3f4f6'
                      }}
                    >
                      <strong style={{ color: message.role === 'user' ? '#1d4ed8' : '#059669' }}>
                        {message.role === 'user' ? 'You' : 'HEOR Signal'}:
                      </strong>
                      <p style={{ margin: '5px 0 0 0', color: '#1f2937' }}>
                        {message.content}
                      </p>
                    </div>
                  ))
                )}
              </div>
              
              <div style={{ display: 'flex', gap: '10px' }}>
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                  placeholder="Ask about HEOR data, trends, or insights..."
                  style={{
                    flex: 1,
                    padding: '12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '1rem'
                  }}
                />
                <SimpleButton onClick={sendMessage} disabled={!inputMessage.trim()}>
                  Send
                </SimpleButton>
              </div>
            </SimpleCardContent>
          </SimpleCard>
        )}

        <div style={{ textAlign: 'center', color: '#6b7280', fontSize: '0.9rem' }}>
          Session: {sessionId} | Status: {userStatus?.onboarding_completed ? 'Active' : 'Setup Required'}
        </div>
      </div>
    </div>
  );
}

export default HEORSignalApp;