import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { authAPI } from '../services/api';

const ForgotPassword = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);
    try {
      const data = await authAPI.forgotPassword(email.trim());
      setMessage(data.message || t('forgotPassword_checkEmail'));
      if (data.resetToken) {
        navigate(`/reset-password?token=${encodeURIComponent(data.resetToken)}`, { replace: true });
        return;
      }
    } catch (err) {
      setError(err.response?.data?.message || t('forgotPassword_error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-cover bg-center bg-no-repeat"
      style={{
        backgroundImage: `url('/images/bg.jpg')`,
        fontFamily: '"Poppins", sans-serif'
      }}
    >
      <div className="w-[550px] text-white md:w-[90%] sm:w-full sm:px-5">
        <h1
          className="text-center font-bold md:text-[40px] sm:text-[36px]"
          style={{
            fontSize: '48px',
            textShadow: '2px 2px 4px rgba(0, 0, 0, 0.8)',
            WebkitTextStroke: '1px black'
          }}
        >
          {t('forgotPassword_title')}
        </h1>
        <p className="text-center text-white mt-2 mb-6" style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}>
          {t('forgotPassword_subtitle')}
        </p>

        <form onSubmit={handleSubmit}>
          <div className="relative w-full max-w-[400px] mx-auto h-[50px] bg-white rounded-lg my-6 sm:h-[45px]">
            <input
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(''); setMessage(''); }}
              placeholder={t('login_email')}
              className="w-full h-full bg-transparent border-2 border-black rounded-lg text-black px-4 py-3 text-base sm:text-sm placeholder:text-[#555] focus:outline-none"
              required
            />
          </div>

          {message && (
            <div className="w-full max-w-[400px] mx-auto mb-4 p-3 bg-green-100 border-2 border-green-400 rounded-lg text-green-700 text-sm text-center">
              {message}
            </div>
          )}
          {error && (
            <div className="w-full max-w-[400px] mx-auto mb-4 p-3 bg-red-100 border-2 border-red-400 rounded-lg text-red-700 text-sm text-center">
              {error}
            </div>
          )}

          <div className="flex flex-col items-center mt-5">
            <button
              type="submit"
              disabled={loading}
              className="w-[200px] px-4 py-3 border-2 border-black rounded-lg text-base font-bold text-white cursor-pointer transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                backgroundColor: '#778f51',
                textShadow: '1px 1px 3px rgba(0, 0, 0, 0.8)'
              }}
            >
              {loading ? t('forgotPassword_sending') : t('forgotPassword_sendResetLink')}
            </button>
            <Link
              to="/login"
              className="mt-4 text-white underline hover:no-underline"
              style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}
            >
              {t('forgotPassword_backToLogin')}
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ForgotPassword;
