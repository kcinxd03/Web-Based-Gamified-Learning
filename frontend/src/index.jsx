import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { LanguageProvider } from './context/LanguageContext';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <AuthProvider>
      <LanguageProvider>
        <SocketProvider>
          <App />
        </SocketProvider>
      </LanguageProvider>
    </AuthProvider>
  </React.StrictMode>
);

