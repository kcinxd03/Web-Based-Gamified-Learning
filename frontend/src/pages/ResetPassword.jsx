import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import { useLanguage } from '../context/LanguageContext';
import { authAPI } from '../services/api';

const ResetPassword = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t } = useLanguage();
  const tokenFromUrl = searchParams.get('token') || '';
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!tokenFromUrl) {
      setError(t('resetPassword_missingLink'));
    }
  }, [tokenFromUrl]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (newPassword !== confirmPassword) {
      setError(t('resetPassword_passwordsNoMatch'));
      return;
    }
    if (newPassword.length < 6) {
      setError(t('resetPassword_minLength'));
      return;
    }
    if (!tokenFromUrl) return;
    setLoading(true);
    try {
      await authAPI.resetPassword(tokenFromUrl, newPassword);
      setSuccess(true);
      setTimeout(() => navigate('/login', { state: { message: t('resetPassword_success') } }), 2000);
    } catch (err) {
      setError(err.response?.data?.message || t('resetPassword_failed'));
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div
        className="min-h-screen flex items-center justify-center bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `url('/images/bg.jpg')`,
          fontFamily: '"Poppins", sans-serif'
        }}
      >
        <div className="w-[550px] text-white text-center md:w-[90%] sm:px-5">
          <p className="text-xl font-bold" style={{ textShadow: '1px 1px 3px rgba(0,0,0,0.8)' }}>
            {t('resetPassword_success')}
          </p>
          <Link to="/login" className="mt-4 inline-block text-white underline">{t('resetPassword_goToLogin')}</Link>
        </div>
      </div>
    );
  }

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
          {t('resetPassword_title')}
        </h1>
        <p className="text-center text-white mt-2 mb-6" style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}>
          {t('resetPassword_subtitle')}
        </p>

        <form onSubmit={handleSubmit}>
          <div className="relative w-full max-w-[400px] mx-auto h-[50px] bg-white rounded-lg my-6 sm:h-[45px]">
            <input
              type={showPassword ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => { setNewPassword(e.target.value); setError(''); }}
              placeholder={t('resetPassword_placeholder')}
              className="w-full h-full bg-transparent border-2 border-black rounded-lg text-black px-4 py-3 pr-12 text-base sm:text-sm placeholder:text-[#555] focus:outline-none"
              required
              minLength={6}
            />
            <span
              className="absolute right-4 top-1/2 -translate-y-1/2 cursor-pointer text-xl text-gray-600"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <FaEyeSlash className="w-6 h-6" /> : <FaEye className="w-6 h-6" />}
            </span>
          </div>
          <div className="relative w-full max-w-[400px] mx-auto h-[50px] bg-white rounded-lg my-6 sm:h-[45px]">
            <input
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => { setConfirmPassword(e.target.value); setError(''); }}
              placeholder={t('resetPassword_confirmPlaceholder')}
              className="w-full h-full bg-transparent border-2 border-black rounded-lg text-black px-4 py-3 text-base sm:text-sm placeholder:text-[#555] focus:outline-none"
              required
              minLength={6}
            />
          </div>

          {error && (
            <div className="w-full max-w-[400px] mx-auto mb-4 p-3 bg-red-100 border-2 border-red-400 rounded-lg text-red-700 text-sm text-center">
              {error}
            </div>
          )}

          <div className="flex flex-col items-center mt-5">
            <button
              type="submit"
              disabled={loading || !tokenFromUrl}
              className="w-[200px] px-4 py-3 border-2 border-black rounded-lg text-base font-bold text-white cursor-pointer transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                backgroundColor: '#778f51',
                textShadow: '1px 1px 3px rgba(0, 0, 0, 0.8)'
              }}
            >
              {loading ? t('resetPassword_resetting') : t('resetPassword_resetBtn')}
            </button>
            <Link
              to="/login"
              className="mt-4 text-white underline hover:no-underline"
              style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}
            >
              {t('resetPassword_backToLogin')}
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;
