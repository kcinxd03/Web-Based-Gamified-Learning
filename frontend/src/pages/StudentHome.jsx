import React from "react";
import { useNavigate } from "react-router-dom";
import {
  FaUserCircle,
  FaCog,
  FaSignOutAlt,
  FaDoorOpen,
  FaChalkboardTeacher,
} from "react-icons/fa";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";

const StudentHome = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
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
      className="min-h-screen w-full flex flex-col items-center justify-center relative text-white p-0 overflow-x-hidden bg-cover bg-center bg-no-repeat"
      style={{
        backgroundImage: `url('/images/bg.jpg')`,
        fontFamily: '"Poppins", sans-serif'
      }}
    >
      {/* Header - responsive: compact on mobile, full on tablet+ */}
      <header className="absolute top-0 left-0 right-0 flex justify-between items-center gap-2 sm:gap-3 p-2 sm:p-3 md:p-4 bg-transparent z-10 w-full max-w-[100vw]">
        <div className="flex items-center pl-2 sm:pl-3 flex-shrink-0 min-w-0">
          <h1 
            className="text-lg xs:text-xl sm:text-2xl font-bold text-white uppercase whitespace-nowrap overflow-hidden text-ellipsis max-w-[120px] xs:max-w-[140px] sm:max-w-none"
            style={{
              textShadow: '2px 2px 4px rgba(0, 0, 0, 1)'
            }}
          >
            {t('common_student')}
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
