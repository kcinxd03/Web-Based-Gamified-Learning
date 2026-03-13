import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaUserCircle,
  FaCog,
  FaSignOutAlt,
  FaPlusCircle,
  FaChalkboardTeacher,
  FaTimes,
  FaGamepad,
} from "react-icons/fa";
import { useLanguage } from "../context/LanguageContext";

const TeacherHome = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [notification, setNotification] = useState(null);

  const handleProfileClick = () => {
    navigate("/set-profile");
  };

  const handleCreateClassClick = () => {
    navigate("/create-class"); // TODO: Create this route
  };

  const handleMyClassClick = () => {
    navigate("/my-class");
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/"; // full reload to reset app state
  };

  const handleSettingsClick = () => {
    navigate("/settings");
  };

  const handleCloseNotification = () => {
    setNotification(null);
  };

  const handleJoinGame = () => {
    if (notification && notification.quizId) {
      navigate(`/join-game/${notification.classId}`);
      setNotification(null);
    }
  };

  return (
    <div 
      className="min-h-screen w-full flex flex-col items-center justify-center relative text-white p-0 overflow-x-hidden bg-cover bg-center bg-no-repeat"
      style={{
        backgroundImage: `url('/images/bg.jpg')`,
        fontFamily: '"Poppins", sans-serif'
      }}
    >
      {/* Game Invitation Notification */}
      {notification && (
        <div
          className="fixed top-4 right-4 left-4 xs:left-auto sm:top-5 sm:right-5 bg-[#4CAF50] text-white p-3 sm:p-4 rounded-lg shadow-lg z-[10000] max-w-[400px] w-[calc(100vw-2rem)] xs:w-auto animate-slideIn"
        >
          <div className="flex items-start gap-3">
            <FaGamepad className="text-2xl mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="font-bold mb-1 text-base">
                {notification.type === 'game-started' ? t('common_gameStarted') : t('common_newGameAvailable')}
              </div>
              <div className="text-sm mb-3 opacity-95">
                {notification.message}
              </div>
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={handleJoinGame}
                  className="border-none px-4 py-2 rounded bg-white text-[#4CAF50] cursor-pointer font-bold text-sm transition-opacity duration-200 min-h-[36px] touch-manipulation hover:opacity-90 active:opacity-80"
                >
                  {t('common_joinGame')}
                </button>
                <button
                  onClick={handleCloseNotification}
                  className="bg-transparent text-white border border-white px-4 py-2 rounded cursor-pointer text-sm transition-opacity duration-200 min-h-[36px] touch-manipulation hover:opacity-90 active:opacity-80"
                >
                  {t('common_dismiss')}
                </button>
              </div>
            </div>
            <button
              onClick={handleCloseNotification}
              className="bg-transparent border-none text-white cursor-pointer text-lg p-0 leading-none flex-shrink-0 min-w-6 min-h-6 flex items-center justify-center touch-manipulation hover:opacity-80"
            >
              <FaTimes />
            </button>
          </div>
        </div>
      )}

      {/* Header - responsive: compact on mobile, full on tablet+ */}
      <header className="absolute top-0 left-0 right-0 flex justify-between items-center gap-2 sm:gap-3 p-2 sm:p-3 md:p-4 bg-transparent z-10 w-full max-w-[100vw]">
        <div className="flex items-center pl-2 sm:pl-3 flex-shrink-0 min-w-0">
          <h1 
            className="text-lg xs:text-xl sm:text-2xl font-bold text-white uppercase whitespace-nowrap overflow-hidden text-ellipsis max-w-[120px] xs:max-w-[140px] sm:max-w-none"
            style={{
              textShadow: '2px 2px 4px rgba(0, 0, 0, 1)'
            }}
          >
            {t('common_teacher')}
          </h1>
        </div>
        <div className="flex gap-2 sm:gap-3 md:gap-4 items-center justify-end pr-2 sm:pr-3 flex-wrap flex-shrink-0">
          {/* PROFILE Button */}
          <button 
            onClick={handleProfileClick}
            className="flex items-center gap-1 sm:gap-1.5 px-2.5 py-2 sm:px-4 sm:py-2.5 bg-[#768e50] rounded-lg cursor-pointer transition-all duration-200 border-2 border-black min-h-[40px] sm:min-h-[44px] touch-manipulation hover:bg-[#8b7745] hover:scale-105 active:scale-[0.98]"
          >
            <FaUserCircle className="text-base sm:text-lg text-white flex-shrink-0" />
            <span className="text-sm sm:text-base font-bold text-white whitespace-nowrap hidden xs:inline">{t('common_profile')}</span>
          </button>

          {/* SETTINGS Button */}
          <button 
            onClick={handleSettingsClick}
            className="flex items-center gap-1 sm:gap-1.5 px-2.5 py-2 sm:px-4 sm:py-2.5 bg-[#768e50] rounded-lg cursor-pointer transition-all duration-200 border-2 border-black min-h-[40px] sm:min-h-[44px] touch-manipulation hover:bg-[#8b7745] hover:scale-105 active:scale-[0.98]"
          >
            <FaCog className="text-base sm:text-lg text-white flex-shrink-0" />
            <span className="text-sm sm:text-base font-bold text-white whitespace-nowrap hidden xs:inline">{t('common_settings')}</span>
          </button>

          {/* LOGOUT Button */}
          <button 
            onClick={handleLogout}
            className="flex items-center gap-1 sm:gap-1.5 px-2.5 py-2 sm:px-4 sm:py-2.5 bg-[#768e50] rounded-lg cursor-pointer transition-all duration-200 border-2 border-black min-h-[40px] sm:min-h-[44px] touch-manipulation hover:bg-[#8b7745] hover:scale-105 active:scale-[0.98]"
          >
            <FaSignOutAlt className="text-base sm:text-lg text-white flex-shrink-0" />
            <span className="text-sm sm:text-base font-bold text-white whitespace-nowrap hidden xs:inline">{t('common_logout')}</span>
          </button>
        </div>
      </header>

      {/* Main Action Buttons - responsive: stack on mobile, side-by-side on tablet+ */}
      <main className="flex flex-col sm:flex-row justify-center items-center gap-6 sm:gap-8 md:gap-10 px-4 xs:px-5 sm:px-6 md:px-8 w-full max-w-[520px] lg:max-w-[600px] mx-auto text-center min-h-screen pt-20 sm:pt-24 pb-8">
        {/* CREATE CLASS Button */}
        <button 
          onClick={handleCreateClassClick}
          className="w-full max-w-[180px] h-[140px] xs:h-[160px] sm:h-[180px] sm:max-w-[180px] rounded-xl flex flex-col justify-center items-center cursor-pointer transition-all duration-200 border-2 border-black min-h-[140px] touch-manipulation bg-[#768e50] hover:scale-105 active:scale-[0.98]"
        >
          <FaPlusCircle 
            className="w-14 h-14 xs:w-16 xs:h-16 sm:w-20 sm:h-20 mb-2 sm:mb-3 flex-shrink-0" 
            style={{ fill: 'none', stroke: '#000000', strokeWidth: 3.5, color: '#000000' }}
          />
          <span 
            className="text-base xs:text-lg sm:text-xl font-bold text-white text-center break-words max-w-full px-1"
            style={{
              textShadow: '2px 2px 4px rgba(0, 0, 0, 0.5)',
              WebkitTextStroke: '0.8px black'
            }}
          >
            {t('teacherHome_createClass')}
          </span>
        </button>

        {/* MY CLASS Button */}
        <button 
          onClick={handleMyClassClick}
          className="w-full max-w-[180px] h-[140px] xs:h-[160px] sm:h-[180px] sm:max-w-[180px] rounded-xl flex flex-col justify-center items-center cursor-pointer transition-all duration-200 border-2 border-black min-h-[140px] touch-manipulation bg-[#887443] hover:scale-105 active:scale-[0.98]"
        >
          <FaChalkboardTeacher 
            className="w-14 h-14 xs:w-16 xs:h-16 sm:w-20 sm:h-20 mb-2 sm:mb-3 flex-shrink-0" 
            style={{ fill: 'none', stroke: '#000000', strokeWidth: 3.5, color: '#000000' }}
          />
          <span 
            className="text-base xs:text-lg sm:text-xl font-bold text-white text-center break-words max-w-full px-1"
            style={{
              textShadow: '2px 2px 4px rgba(0, 0, 0, 0.5)',
              WebkitTextStroke: '0.8px black'
            }}
          >
            {t('teacherHome_myClass')}
          </span>
        </button>
      </main>
    </div>
  );
};

export default TeacherHome;

