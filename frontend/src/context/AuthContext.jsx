import React, { createContext, useState, useEffect, useContext } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('token'));

  // Check if user is logged in on mount
  useEffect(() => {
    const checkAuth = async () => {
      const storedToken = localStorage.getItem('token');
      const storedUser = localStorage.getItem('user');

      if (storedToken && storedUser) {
        try {
          setToken(storedToken);
          setUser(JSON.parse(storedUser));
          // Optionally verify token with backend
          // const response = await authAPI.getCurrentUser();
          // setUser(response.user);
        } catch (error) {
          console.error('Auth check error:', error);
          localStorage.removeItem('token');
          localStorage.removeItem('user');
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  const login = async (email, password) => {
    try {
      const response = await authAPI.login(email, password);
      const { token: newToken, user: userData } = response;

      localStorage.setItem('token', newToken);
      localStorage.setItem('user', JSON.stringify(userData));
      setToken(newToken);
      setUser(userData);

      return { success: true, user: userData };
    } catch (error) {
      const message = error.response?.data?.message || 'Login failed. Please try again.';
      return { success: false, error: message };
    }
  };

  const register = async (userData, autoLogin = true) => {
    try {
      console.log('Registering user with data:', { ...userData, password: '***' });
      const response = await authAPI.register(userData);
      const { token: newToken, user: newUser } = response;

      // Only auto-login if requested (default is true for backward compatibility)
      if (autoLogin) {
        localStorage.setItem('token', newToken);
        localStorage.setItem('user', JSON.stringify(newUser));
        setToken(newToken);
        setUser(newUser);
      }

      return { success: true, user: newUser };
    } catch (error) {
      console.error('Registration error:', error.response?.data || error.message);
      const message = error.response?.data?.message || error.response?.data?.errors?.join(', ') || 'Registration failed. Please try again.';
      return { success: false, error: message };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };

  const updateUser = async (profileData) => {
    try {
      const response = await authAPI.updateProfile(profileData);
      const updatedUser = response.user;

      // Update localStorage and state
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setUser(updatedUser);

      return { success: true, user: updatedUser };
    } catch (error) {
      console.error('Update profile error:', error);
      const message = error.response?.data?.message || 'Failed to update profile. Please try again.';
      return { success: false, error: message };
    }
  };

  const value = {
    user,
    token,
    loading,
    login,
    register,
    logout,
    updateUser,
    isAuthenticated: !!user
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

