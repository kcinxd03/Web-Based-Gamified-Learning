import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { translate } from '../translations';

// Generate email from first and last name: firstname.lastname@normi.edu.ph (lowercase, alphanumeric + dots)
const generateEmailFromName = (firstName, lastName) => {
  const first = (firstName || '')
    .toString()
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[^a-z0-9.]/g, '') || 'student';
  const last = (lastName || '')
    .toString()
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[^a-z0-9.]/g, '') || 'user';
  return `${first}.${last}@normi.edu.ph`;
};

const PasswordSetup = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const t = (key, params) => translate(key, 'english', params);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');

  useEffect(() => {
    const state = location.state || {};
    const firstName = state.firstName ?? '';
    const lastName = state.lastName ?? '';
    const generatedEmail = generateEmailFromName(firstName, lastName);
    setFormData((prev) => ({
      ...prev,
      email: generatedEmail
    }));
  }, [location.state]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError(''); // Clear error when user types
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    // Validate password length
    if (formData.password.length < 6) {
      setError(t('passwordSetup_passwordMinLength'));
      return;
    }

    // Check if passwords match
    if (formData.password !== formData.confirmPassword) {
      setError(t('passwordSetup_passwordsNoMatch'));
      return;
    }

    // Navigate to verification page with all data
    const allData = {
      ...(location.state || {}),
      email: formData.email,
      password: formData.password
    };
    navigate('/verify-information', { state: allData });
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-center bg-cover bg-center bg-no-repeat"
      style={{
        backgroundImage: `url('/images/bg.jpg')`
      }}
    >
      <div className="w-full max-w-md px-4">
        {/* Password Setup Form Container */}
        <div className="rounded-lg shadow-2xl p-8 bg-transparent">
          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email Field (auto-generated from name, editable) */}
            <div>
              <label 
                htmlFor="email" 
                className="block font-bold mb-2 text-xl"
                style={{
                  color: 'white',
                  textShadow: '2px 2px 4px rgba(0, 0, 0, 1)'
                }}
              >
                {t('passwordSetup_email')}
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-lg border-2 border-black focus:outline-none bg-white text-gray-800 text-base"
                required
              />
            </div>

            {/* Password Field */}
            <div>
              <label 
                htmlFor="password" 
                className="block font-bold mb-2 text-xl"
                style={{
                  color: 'white',
                  textShadow: '2px 2px 4px rgba(0, 0, 0, 1)'
                }}
              >
                {t('passwordSetup_password')}
              </label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-lg border-2 border-black focus:outline-none bg-white text-gray-800 text-base"
                required
              />
            </div>

            {/* Confirm Password Field */}
            <div>
              <label 
                htmlFor="confirmPassword" 
                className="block font-bold mb-2 text-xl"
                style={{
                  color: 'white',
                  textShadow: '2px 2px 4px rgba(0, 0, 0, 1)'
                }}
              >
                {t('passwordSetup_confirmPassword')}
              </label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-lg border-2 border-black focus:outline-none bg-white text-gray-800 text-base"
                required
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="mt-4 p-3 bg-red-100 border-2 border-red-400 rounded-lg text-red-700 text-sm text-center">
                {error}
              </div>
            )}

            {/* NEXT Button */}
            <div className="flex justify-end mt-8">
              <button
                type="submit"
                className="bg-green-700 hover:bg-green-800 text-white font-bold py-3 px-8 rounded-lg transition-colors duration-200 text-lg shadow-lg"
              >
                {t('passwordSetup_next')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default PasswordSetup;

