import React from "react";
import { useNavigate } from "react-router-dom";
import {
  FaUserCircle,
  FaCog,
  FaSignOutAlt,
  FaDoorOpen,
  FaChalkboardTeacher,
} from "react-icons/fa";
import { useLanguage } from "../context/LanguageContext";

const StudentHome = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const handleProfileClick = () => {
    navigate("/set-profile");
  };

  const handleJoinClassClick = () => {
    navigate("/join-class");
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

  return (
    <div 
      className="min-h-screen w-full max-w-[100vw] flex flex-col items-center justify-center relative text-white p-0 overflow-x-hidden bg-cover bg-center bg-no-repeat box-border"
      style={{
        backgroundImage: `url('/images/bg.jpg')`,
        fontFamily: '"Poppins", sans-serif'
      }}
    >
      {/* Header - icon-only below 640px to avoid overflow at 375/425px */}
      <header className="absolute top-0 left-0 right-0 flex justify-between items-center gap-1.5 sm:gap-3 p-2 sm:p-3 md:p-4 bg-transparent z-10 w-full max-w-[100vw] min-w-0 box-border">
        <div className="flex items-center pl-1 sm:pl-3 flex-shrink-0 min-w-0 overflow-hidden">
          <h1 
            className="text-base xs:text-lg sm:text-2xl font-bold text-white uppercase truncate max-w-[90px] xs:max-w-[110px] sm:max-w-none"
            style={{
              textShadow: '2px 2px 4px rgba(0, 0, 0, 1)'
            }}
          >
            {t('common_student')}
          </h1>
        </div>
        <div className="flex gap-1.5 sm:gap-3 md:gap-4 items-center justify-end pr-1 sm:pr-3 flex-shrink-0 min-w-0">
          {/* PROFILE Button - text visible from sm (640px) up */}
          <button 
            onClick={handleProfileClick}
            className="flex items-center justify-center gap-1 sm:gap-1.5 p-2 sm:px-4 sm:py-2.5 bg-[#768e50] rounded-lg cursor-pointer transition-all duration-200 border-2 border-black min-h-[40px] min-w-[40px] sm:min-w-0 sm:min-h-[44px] touch-manipulation hover:bg-[#8b7745] hover:scale-105 active:scale-[0.98]"
          >
            <FaUserCircle className="text-base sm:text-lg text-white flex-shrink-0" />
            <span className="text-sm sm:text-base font-bold text-white whitespace-nowrap hidden sm:inline">{t('common_profile')}</span>
          </button>

          {/* SETTINGS Button */}
          <button 
            onClick={handleSettingsClick}
            className="flex items-center justify-center gap-1 sm:gap-1.5 p-2 sm:px-4 sm:py-2.5 bg-[#768e50] rounded-lg cursor-pointer transition-all duration-200 border-2 border-black min-h-[40px] min-w-[40px] sm:min-w-0 sm:min-h-[44px] touch-manipulation hover:bg-[#8b7745] hover:scale-105 active:scale-[0.98]"
          >
            <FaCog className="text-base sm:text-lg text-white flex-shrink-0" />
            <span className="text-sm sm:text-base font-bold text-white whitespace-nowrap hidden sm:inline">{t('common_settings')}</span>
          </button>

          {/* LOGOUT Button */}
          <button 
            onClick={handleLogout}
            className="flex items-center justify-center gap-1 sm:gap-1.5 p-2 sm:px-4 sm:py-2.5 bg-[#768e50] rounded-lg cursor-pointer transition-all duration-200 border-2 border-black min-h-[40px] min-w-[40px] sm:min-w-0 sm:min-h-[44px] touch-manipulation hover:bg-[#8b7745] hover:scale-105 active:scale-[0.98]"
          >
            <FaSignOutAlt className="text-base sm:text-lg text-white flex-shrink-0" />
            <span className="text-sm sm:text-base font-bold text-white whitespace-nowrap hidden sm:inline">{t('common_logout')}</span>
          </button>
        </div>
      </header>

      {/* Main Action Buttons - responsive: stack on mobile, side-by-side on tablet+ */}
      <main className="flex flex-col sm:flex-row justify-center items-center gap-6 sm:gap-8 md:gap-10 px-4 xs:px-5 sm:px-6 md:px-8 w-full max-w-[100vw] sm:max-w-[520px] lg:max-w-[600px] mx-auto text-center min-h-screen pt-20 sm:pt-24 pb-8 box-border">
        {/* JOIN CLASS Button */}
        <button 
          onClick={handleJoinClassClick}
          className="w-full max-w-[180px] h-[140px] xs:h-[160px] sm:h-[180px] sm:max-w-[180px] rounded-xl flex flex-col justify-center items-center cursor-pointer transition-all duration-200 border-2 border-black min-h-[140px] touch-manipulation bg-[#768e50] hover:scale-105 active:scale-[0.98]"
        >
          <FaDoorOpen 
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
            {t('studentHome_joinClass')}
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
            {t('studentHome_myClass')}
          </span>
        </button>
      </main>
    </div>
  );
};

export default StudentHome;
