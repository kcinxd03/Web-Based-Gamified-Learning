import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaTimes, FaUserCircle, FaCog, FaSignOutAlt } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { classAPI } from '../services/api';

const MyClass = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useLanguage();
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadClasses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadClasses = async () => {
    setLoading(true);
    setError('');
    try {
      let response;
      if (user?.accountType === 'TEACHER') {
        response = await classAPI.getTeacherClasses();
      } else if (user?.accountType === 'STUDENT') {
        response = await classAPI.getStudentClasses();
      } else {
        setError(t('myClass_invalidAccount'));
        setLoading(false);
        return;
      }
      setClasses(response.classes || []);
    } catch (err) {
      console.error('Load classes error:', err);
      setError(err.response?.data?.message || t('myClass_failedLoad'));
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (user?.accountType === 'TEACHER') {
      navigate('/teacher-home');
    } else {
      navigate('/student-home');
    }
  };

  const handleEnterRoom = (classItem) => {
    // Pass the entire class object to the classroom page
    navigate('/classroom', { state: { classData: classItem } });
  };

  return (
    <div 
      className="min-h-screen bg-cover bg-center bg-no-repeat flex items-center justify-center relative p-4 xs:p-5 sm:p-6 overflow-x-hidden"
      style={{
        backgroundImage: `url('/images/bg.jpg')`
      }}
    >
      {/* Header Navigation - responsive: compact on mobile */}
      <div className="absolute top-3 right-3 xs:top-4 xs:right-4 sm:top-6 sm:right-6 flex flex-wrap gap-2 sm:gap-3 z-10 justify-end max-w-[100vw]">
        <button 
          onClick={() => navigate('/set-profile')}
          className="text-white font-bold py-2 px-3 xs:py-2.5 xs:px-4 sm:py-3 sm:px-6 rounded-lg transition-colors duration-200 flex items-center gap-1.5 sm:gap-2 shadow-lg text-sm sm:text-base min-h-[40px] touch-manipulation"
          style={{ backgroundColor: '#789153' }}
        >
          <FaUserCircle className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
          <span className="hidden xs:inline">{t('common_profile')}</span>
        </button>
        <button 
          onClick={() => navigate('/settings')}
          className="text-white font-bold py-2 px-3 xs:py-2.5 xs:px-4 sm:py-3 sm:px-6 rounded-lg transition-colors duration-200 flex items-center gap-1.5 sm:gap-2 shadow-lg text-sm sm:text-base min-h-[40px] touch-manipulation"
          style={{ backgroundColor: '#789153' }}
        >
          <FaCog className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
          <span className="hidden xs:inline">{t('common_settings')}</span>
        </button>
        <button 
          onClick={() => {
            localStorage.removeItem("token");
            localStorage.removeItem("user");
            window.location.href = "/";
          }}
          className="text-white font-bold py-2 px-3 xs:py-2.5 xs:px-4 sm:py-3 sm:px-6 rounded-lg transition-colors duration-200 flex items-center gap-1.5 sm:gap-2 shadow-lg text-sm sm:text-base min-h-[40px] touch-manipulation"
          style={{ backgroundColor: '#789153' }}
        >
          <FaSignOutAlt className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
          <span className="hidden xs:inline">{t('common_logOut')}</span>
        </button>
      </div>

      {/* Main Dialog Box - responsive */}
      <div 
        className="w-full max-w-4xl mx-0 sm:mx-4 rounded-lg shadow-2xl mt-14 sm:mt-16"
        style={{
          backgroundColor: '#556B2F',
          border: '2px solid #000000'
        }}
      >
        {/* Title Bar */}
        <div 
          className="flex justify-between items-center px-4 xs:px-5 sm:px-6 py-3 sm:py-4 rounded-t-lg"
          style={{
            backgroundColor: '#556B2F',
            borderBottom: '1px solid rgba(0, 0, 0, 0.2)'
          }}
        >
          <h2 
            className="text-xl xs:text-2xl sm:text-3xl font-bold text-white text-center flex-1 min-w-0 pr-2"
            style={{
              textShadow: '2px 2px 4px rgba(0, 0, 0, 1)'
            }}
          >
            {t('myClass_title')}
          </h2>
          <button
            onClick={handleClose}
            className="text-red-500 hover:text-red-700 text-xl sm:text-2xl flex-shrink-0 min-w-[36px] min-h-[36px] flex items-center justify-center touch-manipulation"
          >
            <FaTimes />
          </button>
        </div>

        {/* Content Area */}
        <div className="p-4 xs:p-5 sm:p-6">
          {loading ? (
            // Loading State
            <div className="flex items-center justify-center min-h-[400px]">
              <p 
                className="text-2xl font-bold text-white text-center"
                style={{
                  textShadow: '2px 2px 4px rgba(0, 0, 0, 1)'
                }}
              >
                {t('myClass_loadingClasses')}
              </p>
            </div>
          ) : error ? (
            // Error State
            <div className="flex items-center justify-center min-h-[400px]">
              <p 
                className="text-xl font-bold text-red-300 text-center"
                style={{
                  textShadow: '2px 2px 4px rgba(0, 0, 0, 1)'
                }}
              >
                {error}
              </p>
            </div>
          ) : classes.length === 0 ? (
            // Empty State
            <div className="flex items-center justify-center min-h-[400px]">
              <p 
                className="text-2xl font-bold text-white text-center"
                style={{
                  textShadow: '2px 2px 4px rgba(0, 0, 0, 1)'
                }}
              >
                {t('myClass_noClasses')}
              </p>
            </div>
          ) : (
            // Classes List
            <div className="space-y-3 sm:space-y-4">
              {classes.map((classItem, index) => (
                <div
                  key={classItem.id}
                  className="rounded-lg p-4 xs:p-5 sm:p-6 border-2"
                  style={{
                    backgroundColor: index % 2 === 0 ? '#F5DEB3' : '#D2B48C',
                    borderColor: '#556B2F'
                  }}
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                    {/* Left Section - Class Details */}
                    <div className="space-y-2">
                      <p 
                        className="font-bold text-base sm:text-lg"
                        style={{ 
                          color: 'white',
                          textShadow: '2px 2px 4px rgba(0, 0, 0, 1)'
                        }}
                      >
                        {t('common_gradeLevel')} : {classItem.gradeLevel}
                      </p>
                      <p 
                        className="font-bold text-base sm:text-lg"
                        style={{ 
                          color: 'white',
                          textShadow: '2px 2px 4px rgba(0, 0, 0, 1)'
                        }}
                      >
                        {t('common_section')} : {classItem.section}
                      </p>
                      <p 
                        className="font-bold text-base sm:text-lg"
                        style={{ 
                          color: 'white',
                          textShadow: '2px 2px 4px rgba(0, 0, 0, 1)'
                        }}
                      >
                        {t('common_subject')} : {classItem.subject}
                      </p>
                      <p 
                        className="font-bold text-base sm:text-lg"
                        style={{ 
                          color: 'white',
                          textShadow: '2px 2px 4px rgba(0, 0, 0, 1)'
                        }}
                      >
                        {t('common_teacher')} : {classItem.teacherName}
                      </p>
                      {classItem.studentCount !== undefined && (
                        <p 
                          className="font-bold text-lg"
                          style={{ 
                            color: 'white',
                            textShadow: '2px 2px 4px rgba(0, 0, 0, 1)'
                          }}
                        >
                          {t('common_students')} : {classItem.studentCount}
                        </p>
                      )}
                    </div>

                    {/* Right Section - Class Access */}
                    <div className="flex flex-col items-end md:items-end">
                      <div className="mb-3 sm:mb-4 text-center w-full md:w-[140px]">
                        <p 
                          className="font-bold text-base sm:text-lg mb-2"
                          style={{ 
                            color: 'white',
                            textShadow: '2px 2px 4px rgba(0, 0, 0, 1)'
                          }}
                        >
                          {t('common_classCode')}
                        </p>
                        <p 
                          className="text-lg sm:text-xl font-semibold"
                          style={{ 
                            color: 'white',
                            textShadow: '2px 2px 4px rgba(0, 0, 0, 1)'
                          }}
                        >
                          {(classItem.classCode || '').toString()}
                        </p>
                      </div>
                      <button
                        onClick={() => handleEnterRoom(classItem)}
                        className="w-full md:w-[140px] py-2.5 px-6 rounded-lg text-white font-bold transition-colors duration-200 text-sm sm:text-base min-h-[44px] touch-manipulation"
                        style={{
                          backgroundColor: '#789153',
                          border: '2px solid #556B2F'
                        }}
                      >
                        {t('common_enterRoom')}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MyClass;

