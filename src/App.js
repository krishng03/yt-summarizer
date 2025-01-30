import logo from './logo.svg';
import './App.css';
import React, { useState, useEffect } from 'react';

function App() {
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState('');
  const [ws, setWs] = useState(null);


  useEffect(() => {
    const ws = new WebSocket('ws://localhost:8000/ws');
    ws.onopen = () => { 
      console.log('Connected to server');
    }
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setMessages(prevMessages => [...prevMessages, data]);
      } catch (error) {
        console.log('Received non-JSON message:', event.data);
        setMessages(prevMessages => [...prevMessages, {
          text: event.data,
          timestamp: new Date().toISOString()
        }]);
      }
    }
    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    }
    ws.onclose = () => {
      console.log('WebSocket connection closed');
    }
    setWs(ws);
  }, []); 

  const sendMessage = () => {
    if (ws && message) {
      ws.send(message);
      setMessage('');
    }
  }

  const formatMessage = (content) => {
    // Convert markdown-style headers with custom styles
    content = content.replace(/^\*\*(.*)\*\*$/gm, '<h1 style="font-size: 1.5em; font-weight: 800;">$1</h1>');
    content = content.replace(/\*\*(.*)\*\*:/gm, '<strong>$1:</strong>');
    // Convert bullet points
    // content = content.replace(/^\* (.*$)/gm, '<li>$1</li>');
    // content = content.replace(/^- (.*$)/gm, '<li>$1</li>');
    // Convert apostrophes
    // content = content.replace(/, "'");
    // Convert numbered lists
    content = content.replace(/^\d\. (.*$)/gm, '<li>$1</li>');
    
    // Convert paragraphs
    // content = content.split('\n\n').map(para => `<p>${para}</p>`).join('');
    
    return content;
  };

  return (
    <div className="container">
      <h1>Video Summary</h1>
      <div className="input-section">
        <label>
          Enter Video URL: {' '}
          <input 
            type="text" 
            value={message} 
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Paste YouTube URL here"
            className="input-field"
          />
        </label>
        <button onClick={sendMessage} className="send-button">Generate Summary</button>
      </div>
      <div className="messages-container">
        {messages.map((message, index) => (
          <div key={index} className="message-card">
            <div className="message-timestamp">
              {new Date(message.timestamp || Date.now()).toLocaleString()}
            </div>
            <div 
              className="message-content"
              dangerouslySetInnerHTML={{ 
                __html: formatMessage(message.text || message) 
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;
