import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaDoorOpen, FaTimes } from 'react-icons/fa';
import { useLanguage } from '../context/LanguageContext';
import { classAPI } from '../services/api';

const JoinClass = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [classCode, setClassCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!classCode.trim()) {
      setError(t('joinClass_invalidCode'));
      return;
    }

    setLoading(true);
    try {
      const result = await classAPI.joinClass(classCode.trim());
      
      if (result.class) {
        // Successfully joined class, redirect to classroom
        navigate('/classroom', { 
          state: { 
            classData: result.class,
            activeNav: 'classroom'
          } 
        });
      } else {
        setError(t('joinClass_failed'));
      }
    } catch (err) {
      console.error('Join class error:', err);
      setError(err.response?.data?.message || t('joinClass_invalidCode'));
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigate('/student-home');
  };

  const handleClear = () => {
    setClassCode('');
    setError('');
  };

  const handleChange = (e) => {
    setClassCode(e.target.value);
    setError(''); // Clear error when user types
  };

  return (
    <div 
      className="min-h-screen bg-cover bg-center bg-no-repeat flex items-center justify-center p-4 xs:p-5 sm:p-6 overflow-x-hidden"
      style={{
        backgroundImage: `url('/images/bg.jpg')`
      }}
    >
      <div className="w-full max-w-[340px] xs:max-w-[380px] sm:max-w-md px-3 xs:px-4">
        {/* Central Interaction Area */}
        <div className="flex flex-col items-center">
          {/* Door Icon */}
          <div className="mb-4 sm:mb-6">
            <FaDoorOpen 
              className="w-16 h-16 xs:w-20 xs:h-20 sm:w-24 sm:h-24"
              style={{ 
                fill: 'white',
                color: 'white',
                stroke: '#000000',
                strokeWidth: 3.5
              }}
            />
          </div>

          {/* ENTER CLASS CODE Text */}
          <h2 
            className="text-xl xs:text-2xl font-bold mb-4 sm:mb-6 text-white text-center"
            style={{
              textShadow: '2px 2px 4px rgba(0, 0, 0, 1)'
            }}
          >
            {t('joinClass_enterCode')}
          </h2>

          {/* Input Field with Clear Button */}
          <form onSubmit={handleSubmit} className="w-full">
            <div className="relative mb-4 sm:mb-6">
              <input
                type="text"
                value={classCode}
                onChange={handleChange}
                placeholder={t('joinClass_enterCode')}
                className="w-full px-3 py-3 xs:px-4 xs:py-4 rounded-lg text-white text-base xs:text-lg font-semibold pr-12 min-h-[48px]"
                style={{
                  backgroundColor: '#2d5016',
                  border: 'none',
                  outline: 'none'
                }}
              />
              {classCode && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-red-500 hover:text-red-700"
                  style={{ fontSize: '20px' }}
                >
                  <FaTimes />
                </button>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col xs:flex-row gap-3 sm:gap-4 mb-4">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-3 px-4 xs:px-6 rounded-lg text-white font-bold text-base xs:text-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] touch-manipulation"
                style={{
                  backgroundColor: '#8B7745',
                  border: '2px solid #5a4a2e'
                }}
              >
                {loading ? t('gameContent_joining') : t('joinClass_submit')}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="flex-1 py-3 px-4 xs:px-6 rounded-lg text-white font-bold text-base xs:text-lg transition-colors duration-200 min-h-[44px] touch-manipulation"
                style={{
                  backgroundColor: '#6B7280',
                  border: '2px solid #4B5563'
                }}
              >
                {t('common_cancel')}
              </button>
            </div>

            {/* Error Message */}
            {error && (
              <div 
                className="text-center text-sm font-semibold"
                style={{
                  color: '#8B4513'
                }}
              >
                {error}
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};

export default JoinClass;

