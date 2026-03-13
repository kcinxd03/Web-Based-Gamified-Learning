import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext();

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const { user } = useAuth();
  const SOCKET_URL =
  process.env.REACT_APP_SOCKET_URL ||
  (process.env.REACT_APP_API_URL ? process.env.REACT_APP_API_URL.replace(/\/api\/?$/, '') : null) ||
  'http://localhost:5000';

  useEffect(() => {
    if (user) {
      // Create socket connection
      const newSocket = io(SOCKET_URL, {
        transports: ['websocket', 'polling'],
        withCredentials: true
      });

      newSocket.on('connect', () => {
        console.log('Socket connected:', newSocket.id);
      });

      newSocket.on('disconnect', () => {
        console.log('Socket disconnected');
      });

      newSocket.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
      });

      setSocket(newSocket);

      return () => {
        newSocket.close();
      };
    } else {
      // Disconnect socket if user logs out
      if (socket) {
        socket.close();
        setSocket(null);
      }
    }
    // Only reconnect when user identity changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const joinClass = (classId) => {
    if (socket && classId) {
      socket.emit('join-class', classId);
    }
  };

  const leaveClass = (classId) => {
    if (socket && classId) {
      socket.emit('leave-class', classId);
    }
  };

  const joinGameSession = (sessionId) => {
    if (socket && sessionId) {
      socket.emit('join-game-session', {
        sessionId,
        accountType: user?.accountType || null
      });
    }
  };

  const leaveGameSession = (sessionId) => {
    if (socket && sessionId) {
      socket.emit('leave-game-session', sessionId);
    }
  };

  const value = {
    socket,
    joinClass,
    leaveClass,
    joinGameSession,
    leaveGameSession
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};

