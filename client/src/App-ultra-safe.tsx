import React, { useState, useEffect } from 'react';

// Completely self-contained HEOR Signal app with zero external dependencies
function UltraSafeHEORApp() {
  const [sessionId, setSessionId] = useState('');
  const [status, setStatus] = useState('initializing');
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [onboardingComplete, setOnboardingComplete] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');

  const categories = [
    { id: 'regulatory', name: 'FDA Regulatory Alerts', desc: 'FDA approvals, recalls, labeling changes' },
    { id: 'clinical', name: 'Clinical Trial Updates', desc: 'New studies, status changes, results' },
    { id: 'market', name: 'Market Access & Payer News', desc: 'PBM formulary changes, ICER reports' },
    { id: 'rwe', name: 'Real-World Evidence', desc: 'CDC WONDER data, AHRQ insights' }
  ];

  useEffect(() => {
    initUser();
  }, []);

  const initUser = async () => {
    try {
      const response = await fetch('/api/user/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      const data = await response.json();
      
      if (data.success) {
        setSessionId(data.session_id);
        loadUserData(data.session_id);
      } else {
        setStatus('error');
      }
    } catch (error) {
      console.error('Init error:', error);
      setStatus('error');
    }
  };

  const loadUserData = async (id) => {
    try {
      // Load user status
      const statusResponse = await fetch(`/api/user/status/${id}`);
      const statusData = await statusResponse.json();
      
      setOnboardingComplete(statusData.onboarding_completed || false);
      setSelectedCategories(statusData.selected_categories || []);
      
      // Load messages
      const messagesResponse = await fetch(`/api/chat/messages/${id}`);
      const messagesData = await messagesResponse.json();
      
      if (messagesData.success && messagesData.messages) {
        setMessages(messagesData.messages);
      }
      
      setStatus('ready');
    } catch (error) {
      console.error('Load error:', error);
      setStatus('error');
    }
  };

  const toggleCategory = (categoryId) => {
    const isSelected = selectedCategories.includes(categoryId);
    const updated = isSelected 
      ? selectedCategories.filter(id => id !== categoryId)
      : [...selectedCategories, categoryId];
    
    setSelectedCategories(updated);
  };

  const submitCategories = async () => {
    if (selectedCategories.length === 0) return;

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
        setOnboardingComplete(true);
        loadUserData(sessionId);
      }
    } catch (error) {
      console.error('Submit error:', error);
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
        loadUserData(sessionId);
      }
    } catch (error) {
      console.error('Send error:', error);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      sendMessage();
    }
  };

  if (status === 'initializing') {
    return React.createElement('div', {
      style: { 
        padding: '40px', 
        textAlign: 'center', 
        fontFamily: 'system-ui',
        backgroundColor: '#f9fafb',
        minHeight: '100vh'
      }
    }, [
      React.createElement('h1', { key: 'title', style: { color: '#1f2937', marginBottom: '20px' } }, 'HEOR Signal'),
      React.createElement('p', { key: 'loading' }, 'Initializing your dashboard...')
    ]);
  }

  if (status === 'error') {
    return React.createElement('div', {
      style: { 
        padding: '40px', 
        textAlign: 'center', 
        fontFamily: 'system-ui',
        backgroundColor: '#fef2f2',
        minHeight: '100vh'
      }
    }, [
      React.createElement('h1', { key: 'title', style: { color: '#dc2626', marginBottom: '20px' } }, 'Connection Error'),
      React.createElement('p', { key: 'error' }, 'Unable to connect to HEOR Signal backend. Please refresh and try again.')
    ]);
  }

  const mainContent = !onboardingComplete ? 
    React.createElement('div', {
      style: {
        backgroundColor: 'white',
        borderRadius: '8px',
        border: '1px solid #d1d5db',
        padding: '30px',
        marginBottom: '20px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
      }
    }, [
      React.createElement('h2', { 
        key: 'onboarding-title',
        style: { fontSize: '1.5rem', fontWeight: '600', marginBottom: '20px', color: '#1f2937' }
      }, 'Welcome! Select Your Data Categories'),
      
      React.createElement('p', { 
        key: 'onboarding-desc',
        style: { color: '#6b7280', marginBottom: '25px' }
      }, 'Choose the types of HEOR data you\'d like to monitor:'),
      
      React.createElement('div', { 
        key: 'categories',
        style: { marginBottom: '25px' }
      }, categories.map(category => 
        React.createElement('label', {
          key: category.id,
          style: {
            display: 'block',
            padding: '15px',
            marginBottom: '10px',
            border: '2px solid ' + (selectedCategories.includes(category.id) ? '#3b82f6' : '#e5e7eb'),
            borderRadius: '8px',
            cursor: 'pointer',
            backgroundColor: selectedCategories.includes(category.id) ? '#dbeafe' : '#ffffff'
          }
        }, [
          React.createElement('input', {
            key: 'checkbox',
            type: 'checkbox',
            checked: selectedCategories.includes(category.id),
            onChange: () => toggleCategory(category.id),
            style: { marginRight: '12px' }
          }),
          React.createElement('strong', { key: 'name', style: { display: 'block', marginBottom: '5px' } }, category.name),
          React.createElement('span', { key: 'desc', style: { color: '#6b7280', fontSize: '0.9rem' } }, category.desc)
        ])
      )),
      
      React.createElement('div', { 
        key: 'submit-area',
        style: { textAlign: 'center' }
      }, React.createElement('button', {
        onClick: submitCategories,
        disabled: selectedCategories.length === 0,
        style: {
          padding: '12px 24px',
          backgroundColor: selectedCategories.length === 0 ? '#9ca3af' : '#3b82f6',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          fontSize: '1rem',
          fontWeight: '500',
          cursor: selectedCategories.length === 0 ? 'not-allowed' : 'pointer'
        }
      }, `Complete Setup (${selectedCategories.length} selected)`))
    ]) :
    
    React.createElement('div', {
      style: {
        backgroundColor: 'white',
        borderRadius: '8px',
        border: '1px solid #d1d5db',
        padding: '30px',
        marginBottom: '20px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
      }
    }, [
      React.createElement('h2', { 
        key: 'chat-title',
        style: { fontSize: '1.5rem', fontWeight: '600', marginBottom: '20px', color: '#1f2937' }
      }, 'Chat with HEOR Signal'),
      
      React.createElement('div', {
        key: 'messages-area',
        style: {
          maxHeight: '400px',
          overflowY: 'auto',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          padding: '15px',
          marginBottom: '20px',
          backgroundColor: '#f9fafb'
        }
      }, messages.length === 0 ? 
        React.createElement('p', { 
          style: { color: '#6b7280', textAlign: 'center' }
        }, 'Your dashboard is ready! Start a conversation to get insights.') :
        messages.map(message => 
          React.createElement('div', {
            key: message.id,
            style: {
              marginBottom: '15px',
              padding: '10px',
              borderRadius: '8px',
              backgroundColor: message.role === 'user' ? '#dbeafe' : '#f3f4f6'
            }
          }, [
            React.createElement('strong', { 
              key: 'role',
              style: { color: message.role === 'user' ? '#1d4ed8' : '#059669' }
            }, message.role === 'user' ? 'You: ' : 'HEOR Signal: '),
            React.createElement('span', { key: 'content' }, message.content)
          ])
        )
      ),
      
      React.createElement('div', {
        key: 'input-area',
        style: { display: 'flex', gap: '10px' }
      }, [
        React.createElement('input', {
          key: 'input',
          type: 'text',
          value: inputMessage,
          onChange: (e) => setInputMessage(e.target.value),
          onKeyPress: handleKeyPress,
          placeholder: 'Ask about HEOR data, trends, or insights...',
          style: {
            flex: 1,
            padding: '12px',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            fontSize: '1rem'
          }
        }),
        React.createElement('button', {
          key: 'send',
          onClick: sendMessage,
          disabled: !inputMessage.trim(),
          style: {
            padding: '12px 24px',
            backgroundColor: !inputMessage.trim() ? '#9ca3af' : '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontSize: '1rem',
            fontWeight: '500',
            cursor: !inputMessage.trim() ? 'not-allowed' : 'pointer'
          }
        }, 'Send')
      ])
    ]);

  return React.createElement('div', {
    style: {
      padding: '20px',
      fontFamily: 'system-ui',
      backgroundColor: '#f9fafb',
      minHeight: '100vh'
    }
  }, [
    React.createElement('div', {
      key: 'container',
      style: { maxWidth: '800px', margin: '0 auto' }
    }, [
      React.createElement('header', {
        key: 'header',
        style: { marginBottom: '30px', textAlign: 'center' }
      }, [
        React.createElement('h1', {
          key: 'title',
          style: { color: '#1f2937', fontSize: '2.5rem', fontWeight: 'bold', marginBottom: '10px' }
        }, 'HEOR Signal'),
        React.createElement('p', {
          key: 'subtitle',
          style: { color: '#6b7280', fontSize: '1.1rem' }
        }, 'Health Economics and Outcomes Research Dashboard')
      ]),
      
      mainContent,
      
      React.createElement('div', {
        key: 'footer',
        style: { textAlign: 'center', color: '#6b7280', fontSize: '0.9rem' }
      }, `Session: ${sessionId} | Status: ${onboardingComplete ? 'Active' : 'Setup Required'}`)
    ])
  ]);
}

export default UltraSafeHEORApp;