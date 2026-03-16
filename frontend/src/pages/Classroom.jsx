import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  FaArrowLeft, 
  FaBars,
  FaDesktop, 
  FaGamepad,
  FaTrophy, 
  FaUsers, 
  FaUser, 
  FaTrash,
  FaClipboardList,
  FaTimes
} from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useLanguage } from '../context/LanguageContext';
import { getDefaultAvatarByGender, getAvatarBgColor, getAvatarSrc } from '../utils/avatar';
import { classAPI } from '../services/api';
import Leaderboard from './Leaderboard';
import ClassroomContent from './ClassroomContent';
import ClassroomInfo from './ClassroomInfo';
import GameContent from './GameContent';
import MyQuizzes from './MyQuizzes';

const Classroom = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { socket, joinClass, leaveClass } = useSocket();
  const { t } = useLanguage();
  const [activeNav, setActiveNav] = useState('classroom');
  const [classData, setClassData] = useState(null);
  const [gameViewKey, setGameViewKey] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showLeaderboardGain, setShowLeaderboardGain] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingClass, setDeletingClass] = useState(false);

  // Get class data and activeNav from navigation state
  useEffect(() => {
    const state = location.state;
    if (state?.classData) {
      const data = state.classData;
      setClassData({
        ...data,
        id: data.id ?? data._id,
        _id: data._id ?? data.id
      });
    } else {
      navigate('/my-class');
    }
    if (state?.activeNav) {
      setActiveNav(state.activeNav);
      setShowLeaderboardGain(state.activeNav === 'leaderboards' && !!state?.fromGameOver);
      if (state.activeNav === 'game') {
        setGameViewKey(prev => prev + 1);
      }
    } else {
      setShowLeaderboardGain(false);
    }
  }, [location.state, navigate]);

  useEffect(() => {
    if (!location.state?.fromGameOver) return;
    navigate(location.pathname, {
      replace: true,
      state: {
        ...location.state,
        fromGameOver: false
      }
    });
  }, [location.pathname, location.state, navigate]);

  // Join class room for real-time game invitations (so student receives them on any tab)
  useEffect(() => {
    const classId = classData?.id ?? classData?._id;
    if (classId && socket) {
      joinClass(classId);
      return () => leaveClass(classId);
    }
  }, [classData?.id, classData?._id, socket, joinClass, leaveClass]);

  const handleBack = () => {
    navigate('/my-class');
  };

  const handleNavClick = (navItem) => {
    if (navItem === 'create-quiz') {
      // Navigate to create-quiz with class data
      navigate('/create-quiz', { state: { classData } });
    } else {
      setShowLeaderboardGain(false);
      setActiveNav(navItem);
      // If switching to game view, increment key to force GameContent remount and refetch
      if (navItem === 'game') {
        setGameViewKey(prev => prev + 1);
      }
    }
  };

  const handleDeleteClassroom = async () => {
    if (!classData?.id && !classData?._id) return;
    setShowDeleteModal(true);
  };

  const confirmDeleteClassroom = async () => {
    const classId = classData?.id ?? classData?._id;
    if (!classData || !classId) return;
    setDeletingClass(true);
    try {
      await classAPI.deleteClass(classId);
      setShowDeleteModal(false);
      navigate('/my-class', { replace: true });
    } catch (err) {
      console.error('Error deleting classroom:', err);
      setShowDeleteModal(false);
    } finally {
      setDeletingClass(false);
    }
  };

  return (
    <div 
      className="min-h-screen flex overflow-x-hidden"
      style={{
        backgroundImage: `url('/images/bg.jpg')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}
    >
      {/* Mobile top bar - menu button + title */}
      <div 
        className="fixed top-0 left-0 right-0 h-14 z-20 flex items-center gap-3 px-4 lg:hidden"
        style={{ backgroundColor: '#2d5016' }}
      >
        <button
          type="button"
          onClick={() => setSidebarOpen(true)}
          className="p-2 -ml-2 text-white hover:opacity-80 transition-opacity touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center"
          aria-label="Open menu"
        >
          <FaBars size={22} />
        </button>
        <span className="text-white font-bold text-lg truncate flex-1">
          {classData ? (classData.subject || t('classroom_classroom')) : t('classroom_classroom')}
        </span>
        <button
          type="button"
          onClick={handleBack}
          className="p-2 -mr-2 text-white hover:opacity-80 transition-opacity touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center"
          aria-label={t('common_back')}
        >
          <FaArrowLeft size={20} />
        </button>
      </div>

      {/* Backdrop when sidebar open on mobile */}
      {sidebarOpen && (
        <button
          type="button"
          aria-label="Close menu"
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 bg-black/50 z-[11] lg:hidden"
        />
      )}

      {/* Left Sidebar - drawer on mobile, fixed on lg+ */}
      <div 
        className={`fixed left-0 top-0 w-[280px] xs:w-64 h-screen p-4 sm:p-5 md:p-6 flex flex-col z-[12] transform transition-transform duration-200 ease-out lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ backgroundColor: '#2d5016' }}
      >
        {/* Top row: Close (mobile) + BACK */}
        <div className="flex items-center gap-2 mb-4 sm:mb-6 flex-shrink-0">
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-2 text-white hover:opacity-80 transition-opacity touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="Close menu"
          >
            <FaTimes size={20} />
          </button>
          <button
            onClick={() => { handleBack(); setSidebarOpen(false); }}
            className="flex-1 lg:flex-initial px-4 py-2.5 flex items-center justify-start gap-2 hover:opacity-80 transition-opacity touch-manipulation min-h-[44px]"
          >
            <FaArrowLeft className="text-white flex-shrink-0" size={16} />
            <span className="text-white font-bold text-sm sm:text-base">{t('common_back')}</span>
          </button>
        </div>

        {/* Profile Picture */}
        <div className="flex justify-center mb-3 sm:mb-4">
          <div 
            className="w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center shadow-lg overflow-hidden flex-shrink-0"
            style={{ backgroundColor: getAvatarBgColor(user?.profilePicture || getDefaultAvatarByGender(user?.gender)) }}
          >
            <img
              src={getAvatarSrc(user?.profilePicture || getDefaultAvatarByGender(user?.gender), user?.gender)}
              alt="Profile"
              className="w-full h-full object-cover"
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'flex';
              }}
            />
            <div 
              className="hidden w-full h-full flex items-center justify-center"
            >
              <FaUser className="text-gray-400" size={32} />
            </div>
          </div>
        </div>

        {/* User Name */}
        <h2 
          className="text-lg sm:text-xl md:text-2xl font-bold text-white text-center mb-1 truncate px-1"
        >
          {user?.firstName}
        </h2>

        {/* Account Type */}
        <p 
          className="text-xs sm:text-sm font-semibold text-center mb-4 sm:mb-6 md:mb-8"
          style={{ color: '#FFD700' }}
        >
          {user?.accountType === 'TEACHER' ? t('common_teacher') : t('common_student')}
        </p>

        {/* Navigation Links */}
        <nav className="flex-1 space-y-1 sm:space-y-2 overflow-y-auto min-h-0">
          {user?.accountType === 'TEACHER' ? (
            // Teacher Sidebar Navigation
            <>
              {/* CLASSROOM */}
              <button
                onClick={() => { handleNavClick('classroom'); setSidebarOpen(false); }}
                className={`w-full flex items-center gap-2 sm:gap-3 px-3 py-2.5 sm:px-4 sm:py-3 rounded-lg transition-colors touch-manipulation min-h-[44px] ${
                  activeNav === 'classroom' 
                    ? 'bg-green-600' 
                    : 'hover:bg-green-700'
                }`}
              >
                <FaDesktop className="text-white flex-shrink-0" size={18} />
                <span 
                  className={`text-white font-bold text-sm sm:text-base text-left ${activeNav === 'classroom' ? 'underline' : ''}`}
                  style={{ textShadow: '1px 1px 2px rgba(0, 0, 0, 0.5)' }}
                >
                  {t('classroom_classroom')}
                </span>
              </button>

              <button
                onClick={() => { handleNavClick('game'); setSidebarOpen(false); }}
                className={`w-full flex items-center gap-2 sm:gap-3 px-3 py-2.5 sm:px-4 sm:py-3 rounded-lg transition-colors touch-manipulation min-h-[44px] ${
                  activeNav === 'game' ? 'bg-green-600' : 'hover:bg-green-700'
                }`}
              >
                <FaGamepad className="text-white flex-shrink-0" size={18} />
                <span className="text-white font-bold text-sm sm:text-base text-left" style={{ textShadow: '1px 1px 2px rgba(0, 0, 0, 0.5)' }}>
                  {t('classroom_game')}
                </span>
              </button>

              <button
                onClick={() => { handleNavClick('students'); setSidebarOpen(false); }}
                className={`w-full flex items-center gap-2 sm:gap-3 px-3 py-2.5 sm:px-4 sm:py-3 rounded-lg transition-colors touch-manipulation min-h-[44px] ${
                  activeNav === 'students' ? 'bg-green-600' : 'hover:bg-green-700'
                }`}
              >
                <FaUsers className="text-white flex-shrink-0" size={18} />
                <span className="text-white font-bold text-sm sm:text-base text-left" style={{ textShadow: '1px 1px 2px rgba(0, 0, 0, 0.5)' }}>
                  {t('classroom_students')}
                </span>
              </button>

              <button
                onClick={() => { handleNavClick('leaderboards'); setSidebarOpen(false); }}
                className={`w-full flex items-center gap-2 sm:gap-3 px-3 py-2.5 sm:px-4 sm:py-3 rounded-lg transition-colors touch-manipulation min-h-[44px] ${
                  activeNav === 'leaderboards' ? 'bg-green-600' : 'hover:bg-green-700'
                }`}
              >
                <FaTrophy className="text-white flex-shrink-0" size={18} />
                <span className="text-white font-bold text-sm sm:text-base text-left" style={{ textShadow: '1px 1px 2px rgba(0, 0, 0, 0.5)' }}>
                  {t('classroom_leaderboards')}
                </span>
              </button>

              <button
                onClick={() => { handleNavClick('create-quiz'); setSidebarOpen(false); }}
                className={`w-full flex items-center gap-2 sm:gap-3 px-3 py-2.5 sm:px-4 sm:py-3 rounded-lg transition-colors touch-manipulation min-h-[44px] ${
                  activeNav === 'create-quiz' ? 'bg-green-600' : 'hover:bg-green-700'
                }`}
              >
                <FaGamepad className="text-white flex-shrink-0" size={18} />
                <span className={`text-white font-bold text-sm sm:text-base text-left ${activeNav === 'create-quiz' ? 'underline' : ''}`} style={{ textShadow: '1px 1px 2px rgba(0, 0, 0, 0.5)' }}>
                  {t('classroom_createQuiz')}
                </span>
              </button>

              <button
                onClick={() => { handleNavClick('my-quizzes'); setSidebarOpen(false); }}
                className={`w-full flex items-center gap-2 sm:gap-3 px-3 py-2.5 sm:px-4 sm:py-3 rounded-lg transition-colors touch-manipulation min-h-[44px] ${
                  activeNav === 'my-quizzes' ? 'bg-green-600' : 'hover:bg-green-700'
                }`}
              >
                <FaClipboardList className="text-white flex-shrink-0" size={18} />
                <span className={`text-white font-bold text-sm sm:text-base text-left ${activeNav === 'my-quizzes' ? 'underline' : ''}`} style={{ textShadow: '1px 1px 2px rgba(0, 0, 0, 0.5)' }}>
                  {t('classroom_myQuizzes')}
                </span>
              </button>

              <button
                onClick={handleDeleteClassroom}
                className="w-full flex items-center gap-2 sm:gap-3 px-3 py-2.5 sm:px-4 sm:py-3 rounded-lg transition-colors hover:bg-red-700 mt-2 sm:mt-4 justify-start touch-manipulation min-h-[44px]"
              >
                <FaTrash className="text-red-500 flex-shrink-0" size={18} />
                <span className="text-red-500 font-bold text-sm sm:text-base text-left" style={{ textShadow: '1px 1px 2px rgba(0, 0, 0, 0.5)' }}>
                  {t('classroom_deleteClassroom')}
                </span>
              </button>
            </>
          ) : (
            // Student Sidebar Navigation (no Leave Classroom button)
            <>
              <button
                onClick={() => { handleNavClick('classroom'); setSidebarOpen(false); }}
                className={`w-full flex items-center gap-2 sm:gap-3 px-3 py-2.5 sm:px-4 sm:py-3 rounded-lg transition-colors touch-manipulation min-h-[44px] ${
                  activeNav === 'classroom' ? 'bg-green-600' : 'hover:bg-green-700'
                }`}
              >
                <FaDesktop className="text-white flex-shrink-0" size={18} />
                <span className="text-white font-bold text-sm sm:text-base text-left">{t('classroom_classroom')}</span>
              </button>
              <button
                onClick={() => { handleNavClick('game'); setSidebarOpen(false); }}
                className={`w-full flex items-center gap-2 sm:gap-3 px-3 py-2.5 sm:px-4 sm:py-3 rounded-lg transition-colors touch-manipulation min-h-[44px] ${
                  activeNav === 'game' ? 'bg-green-600' : 'hover:bg-green-700'
                }`}
              >
                <FaGamepad className="text-white flex-shrink-0" size={18} />
                <span className="text-white font-bold text-sm sm:text-base text-left">{t('classroom_game')}</span>
              </button>
              <button
                onClick={() => { handleNavClick('leaderboards'); setSidebarOpen(false); }}
                className={`w-full flex items-center gap-2 sm:gap-3 px-3 py-2.5 sm:px-4 sm:py-3 rounded-lg transition-colors touch-manipulation min-h-[44px] ${
                  activeNav === 'leaderboards' ? 'bg-green-600' : 'hover:bg-green-700'
                }`}
              >
                <FaTrophy className="text-white flex-shrink-0" size={18} />
                <span className="text-white font-bold text-sm sm:text-base text-left">{t('classroom_leaderboards')}</span>
              </button>
              <button
                onClick={() => { handleNavClick('classmates'); setSidebarOpen(false); }}
                className={`w-full flex items-center gap-2 sm:gap-3 px-3 py-2.5 sm:px-4 sm:py-3 rounded-lg transition-colors touch-manipulation min-h-[44px] ${
                  activeNav === 'classmates' ? 'bg-green-600' : 'hover:bg-green-700'
                }`}
              >
                <FaUsers className="text-white flex-shrink-0" size={18} />
                <span className="text-white font-bold text-sm sm:text-base text-left">{t('classroom_classmates')}</span>
              </button>
            </>
          )}
        </nav>
      </div>

      {/* Main Content Area - full width on mobile with top padding for bar, ml for sidebar on lg+ */}
      <div className="flex-1 w-full min-w-0 pt-14 lg:pt-0 lg:ml-64">
        {classData ? (
          user?.accountType === 'TEACHER' ? (
            // Teacher Content
            <>
              {activeNav === 'leaderboards' && <Leaderboard classData={classData} showLastGamePoints={showLeaderboardGain} currentUser={user} />}
              {activeNav === 'classroom' && <ClassroomInfo classData={classData} currentUser={user} />}
              {activeNav === 'game' && <GameContent key={`game-${gameViewKey}`} classData={classData} />}
              {activeNav === 'students' && <ClassroomContent classData={classData} />}
              {activeNav === 'my-quizzes' && <MyQuizzes classData={classData} />}
            </>
          ) : (
            // Student Content
            <>
              {activeNav === 'leaderboards' && <Leaderboard classData={classData} showLastGamePoints={showLeaderboardGain} currentUser={user} />}
              {activeNav === 'classroom' && <ClassroomInfo classData={classData} currentUser={user} />}
              {activeNav === 'game' && <GameContent key={`game-${gameViewKey}`} classData={classData} />}
              {activeNav === 'classmates' && <ClassroomContent classData={classData} />}
            </>
          )
        ) : (
          <div className="p-4 sm:p-6 md:p-8 text-white text-sm sm:text-base">{t('classroom_loadingClassroom')}</div>
        )}
      </div>
      {/* Delete classroom confirmation modal (teacher only) */}
      {user?.accountType === 'TEACHER' && showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-5 sm:p-6 border-2 border-red-300">
            <h2 className="text-lg sm:text-xl font-bold mb-3 text-gray-900">
              Delete Classroom?
            </h2>
            <p className="text-sm sm:text-base text-gray-700 mb-4">
              This will permanently delete this classroom and all of its associated data
              (quizzes, game sessions, and leaderboards). Students will no longer have access.
              This action cannot be undone.
            </p>
            <div className="flex flex-col sm:flex-row gap-2 mt-2">
              <button
                type="button"
                onClick={confirmDeleteClassroom}
                disabled={deletingClass}
                className="flex-1 min-h-[44px] px-4 py-2.5 rounded-lg font-bold text-white bg-red-600 hover:bg-red-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
              >
                {deletingClass ? 'Deleting...' : 'Yes, delete classroom'}
              </button>
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                disabled={deletingClass}
                className="flex-1 min-h-[44px] px-4 py-2.5 rounded-lg font-bold text-gray-800 bg-gray-200 hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Classroom;

