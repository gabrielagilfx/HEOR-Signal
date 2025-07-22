import React, { useState, useEffect } from 'react';

function MinimalApp() {
  const [data, setData] = useState<string>('Loading...');

  useEffect(() => {
    // Test basic API call
    fetch('/api/user/init', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    })
    .then(response => response.json())
    .then(result => {
      console.log('API response:', result);
      setData(`Session: ${result.session_id}`);
    })
    .catch(error => {
      console.error('API error:', error);
      setData('Error loading');
    });
  }, []);

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>HEOR Signal - Minimal Test</h1>
      <p>Status: {data}</p>
      <div style={{ marginTop: '20px' }}>
        <p>If you can see this, the basic React app is working.</p>
        <p>The error was likely in a specific component or dependency.</p>
      </div>
    </div>
  );
}

export default MinimalApp;