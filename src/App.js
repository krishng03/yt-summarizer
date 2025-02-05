import logo from './logo.svg';
import './App.css';
import React, { useState, useEffect } from 'react';

function App() {
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState('');
  const [ws, setWs] = useState(null);


  useEffect(() => {
    const ws = new WebSocket('ws://127.0.0.1:8000/ws');
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
              dangerouslySetInnerHTML={{ __html: message.text }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;
