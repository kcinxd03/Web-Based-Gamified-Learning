import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import { translate } from '../translations';

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const t = (key, params) => translate(key, 'english', params);
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);

  // Check for success message from signup
  useEffect(() => {
    if (location.state?.message) {
      setSuccessMessage(location.state.message);
      if (location.state.email) {
        setFormData(prev => ({ ...prev, email: location.state.email }));
      }
    }
  }, [location.state]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError(''); // Clear error when user types
  };

  const togglePassword = () => {
    setShowPassword(!showPassword);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await login(formData.email, formData.password);
      
      if (result.success) {
        // Redirect back to the page that sent us here (e.g. /game-testing/:sessionId) when unauthenticated
        const from = location.state?.from;
        if (from && typeof from === 'string' && from.startsWith('/')) {
          navigate(from, { replace: true });
          return;
        }
        // Navigate directly to home page based on account type
        if (result.user.accountType === 'ADMIN') {
          navigate('/admin');
        } else if (result.user.accountType === 'TEACHER') {
          navigate('/teacher-home');
        } else {
          navigate('/student-home');
        }
      } else {
        setError(result.error || t('login_failed'));
      }
    } catch (err) {
      setError(t('login_errorGeneric'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-center bg-cover bg-center bg-no-repeat p-4 xs:p-5 sm:p-6 overflow-x-hidden"
      style={{
        backgroundImage: `url('/images/bg.jpg')`,
        fontFamily: '"Poppins", sans-serif'
      }}
    >
      <div className="w-full max-w-[340px] xs:max-w-[380px] sm:max-w-[420px] md:max-w-[480px] lg:w-[550px] text-white">
        {/* Login Form Container */}
        <div>
          {/* LOGIN Title */}
          <h1 
            className="text-center font-bold text-2xl xs:text-3xl sm:text-4xl md:text-5xl lg:text-[48px]"
            style={{
              textShadow: '2px 2px 4px rgba(0, 0, 0, 0.8)',
              WebkitTextStroke: '1px black'
            }}
          >
            {t('login_title')}
          </h1>

          {/* Form */}
          <form onSubmit={handleSubmit}>
            {/* Email Field */}
            <div className="relative w-full mx-auto h-[48px] xs:h-[50px] bg-white rounded-lg my-5 xs:my-6 sm:my-8">
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder={t('login_email')}
                className="w-full h-full bg-transparent border-2 border-black rounded-lg text-black px-4 py-3 text-sm xs:text-base placeholder:text-[#555] focus:outline-none"
                required
              />
            </div>

            {/* Password Field */}
            <div className="relative w-full mx-auto h-[48px] xs:h-[50px] bg-white rounded-lg my-5 xs:my-6 sm:my-8">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder={t('login_password')}
                className="w-full h-full bg-transparent border-2 border-black rounded-lg text-black px-4 py-3 pr-12 text-sm xs:text-base placeholder:text-[#555] focus:outline-none"
                required
              />
              <span 
                className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-lg select-none z-10 xs:right-4 xs:text-xl"
                onClick={togglePassword}
              >
                {showPassword ? <FaEyeSlash className="w-6 h-6 xs:w-7 xs:h-7" /> : <FaEye className="w-6 h-6 xs:w-7 xs:h-7" />}
              </span>
            </div>

            {/* Forgot password - students only */}
            <div className="w-full mx-auto text-center">
              <Link
                to="/forgot-password"
                className="text-white text-sm underline hover:no-underline"
                style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}
              >
                {t('login_forgotPassword')}
              </Link>
            </div>

            {/* Success Message */}
            {successMessage && (
              <div className="w-full mx-auto mb-4 p-3 bg-green-100 border-2 border-green-400 rounded-lg text-green-700 text-sm text-center">
                {successMessage}
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="w-full mx-auto mb-4 p-3 bg-red-100 border-2 border-red-400 rounded-lg text-red-700 text-sm text-center">
                {error}
              </div>
            )}

            {/* Button Group */}
            <div className="flex flex-col items-center mt-5 gap-3">
              <button
                type="submit"
                disabled={loading}
                className="w-full max-w-[200px] xs:max-w-[220px] sm:max-w-[240px] px-4 py-3 border-2 border-black rounded-lg text-sm xs:text-base font-bold text-white cursor-pointer transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] touch-manipulation"
                style={{
                  backgroundColor: '#778f51',
                  textShadow: '1px 1px 3px rgba(0, 0, 0, 0.8)'
                }}
                onMouseEnter={(e) => {
                  if (!loading) {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 6px 10px rgba(0, 0, 0, 0.3)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                {loading ? t('login_loggingIn') : t('login_logIn')}
              </button>

              {/* OR Separator */}
              <div 
                className="font-bold text-white py-2.5 text-center"
                style={{
                  textShadow: '1px 1px 3px rgba(0, 0, 0, 0.8)'
                }}
              >
                {t('common_or')}
              </div>

              {/* SIGN UP Button */}
              <Link
                to="/signup"
                className="w-full max-w-[200px] xs:max-w-[220px] sm:max-w-[240px] px-4 py-3 border-2 border-black rounded-lg text-sm xs:text-base font-bold text-white cursor-pointer transition-all duration-200 no-underline block text-center min-h-[44px] touch-manipulation"
                style={{
                  backgroundColor: '#877242',
                  boxShadow: '2px 2px 6px rgba(0, 0, 0, 0.4)',
                  textShadow: '1px 1px 3px rgba(0, 0, 0, 0.8)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 6px 10px rgba(0, 0, 0, 0.3)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '2px 2px 6px rgba(0, 0, 0, 0.4)';
                }}
              >
                {t('login_signUp')}
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;

