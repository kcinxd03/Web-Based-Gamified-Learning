import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaMusic, FaVolumeUp } from 'react-icons/fa';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';

const STORAGE_KEYS = {
  GAME_INVITATION: 'settings_gameInvitationNotification',
  SOUND_VOLUME: 'settings_soundVolume',
  MUSIC_VOLUME: 'settings_musicVolume',
  LANGUAGE: 'settings_language',
};

/** Parse 0–100 from localStorage; 0 is valid, null/invalid default to 100. */
function getStoredVolume(key) {
  try {
    const v = localStorage.getItem(key);
    const n = parseInt(v, 10);
    if (Number.isNaN(n) || n < 0) return 100;
    if (n > 100) return 100;
    return n;
  } catch {
    return 100;
  }
}

const Settings = () => {
  const navigate = useNavigate();
  const { t, setLanguage } = useLanguage();
  const { user } = useAuth();
  const [gameInvitationNotification, setGameInvitationNotification] = useState(() => {
    try {
      const inv = localStorage.getItem(STORAGE_KEYS.GAME_INVITATION);
      return inv !== null ? inv === 'true' : true;
    } catch {
      return true;
    }
  });
  const [soundVolume, setSoundVolume] = useState(() => getStoredVolume(STORAGE_KEYS.SOUND_VOLUME));
  const [musicVolume, setMusicVolume] = useState(() => getStoredVolume(STORAGE_KEYS.MUSIC_VOLUME));
  const [language, setLanguageLocal] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEYS.LANGUAGE) || 'english';
    } catch {
      return 'english';
    }
  });

  useEffect(() => {
    try {
      setGameInvitationNotification(localStorage.getItem(STORAGE_KEYS.GAME_INVITATION) !== 'false');
      setSoundVolume(getStoredVolume(STORAGE_KEYS.SOUND_VOLUME));
      setMusicVolume(getStoredVolume(STORAGE_KEYS.MUSIC_VOLUME));
      const lang = localStorage.getItem(STORAGE_KEYS.LANGUAGE);
      if (lang) setLanguageLocal(lang);
    } catch (e) {
      console.warn('Failed to load settings:', e);
    }
  }, []);

  const getHomeRoute = () => {
    if (user?.accountType === 'TEACHER') return '/teacher-home';
    return '/student-home';
  };

  const handleSave = () => {
    try {
      localStorage.setItem(STORAGE_KEYS.GAME_INVITATION, String(gameInvitationNotification));
      localStorage.setItem(STORAGE_KEYS.SOUND_VOLUME, String(soundVolume));
      localStorage.setItem(STORAGE_KEYS.MUSIC_VOLUME, String(musicVolume));
      localStorage.setItem(STORAGE_KEYS.LANGUAGE, language);
      setLanguage(language);
    } catch (e) {
      console.warn('Failed to save settings:', e);
    }
    navigate(getHomeRoute());
  };

  const handleDiscard = () => {
    navigate(getHomeRoute());
  };

  return (
    <div 
      className="min-h-screen bg-cover bg-center bg-no-repeat flex flex-col items-center justify-center p-4 xs:p-5 sm:p-6 overflow-x-hidden"
      style={{
        backgroundImage: `url('/images/bg.jpg')`
      }}
    >
      {/* Main Settings Container - responsive */}
      <div 
        className="w-full max-w-[340px] xs:max-w-[380px] sm:max-w-md rounded-lg p-4 xs:p-5 sm:p-6 shadow-2xl"
        style={{
          backgroundColor: '#8B7355',
          border: '2px solid #556B2F'
        }}
      >
        {/* NOTIFICATIONS Section */}
        <div className="mb-8">
          <h3 
            className="text-xl font-bold mb-4"
            style={{ color: 'white' }}
          >
            {t('settings_notifications')}
          </h3>
          <div className="flex items-center justify-between">
            <span 
              className="font-bold"
              style={{ color: 'white' }}
            >
              {t('settings_gameInvitationNotification')}
            </span>
            <button
              onClick={() => setGameInvitationNotification(!gameInvitationNotification)}
              className={`relative w-14 h-7 rounded-full transition-colors duration-300 ${
                gameInvitationNotification ? 'bg-green-500' : 'bg-gray-400'
              }`}
            >
              <span
                className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-yellow-200 transition-transform duration-300 ${
                  gameInvitationNotification ? 'translate-x-7' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {/* SOUND EFFECTS Section */}
        <div className="mb-8">
          <h3 
            className="text-xl font-bold mb-4"
            style={{ color: 'white' }}
          >
            {t('settings_soundEffects')}
          </h3>
          <div className="space-y-4">
            {/* Sound Volume */}
            <div className="flex items-center gap-4">
              <FaVolumeUp 
                className="text-2xl"
                style={{ color: 'white' }}
              />
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <span 
                    className="font-bold"
                    style={{ color: 'white' }}
                  >
                    {t('settings_sound')}
                  </span>
                  <span 
                    className="font-bold"
                    style={{ color: 'white' }}
                  >
                    {soundVolume}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={soundVolume}
                  onChange={(e) => setSoundVolume(parseInt(e.target.value, 10) || 0)}
                  className="w-full h-2 rounded-lg appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, #4CAF50 0%, #4CAF50 ${soundVolume}%, #ddd ${soundVolume}%, #ddd 100%)`
                  }}
                />
              </div>
            </div>

            {/* Music Volume */}
            <div className="flex items-center gap-4">
              <FaMusic 
                className="text-2xl"
                style={{ color: 'white' }}
              />
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <span 
                    className="font-bold"
                    style={{ color: 'white' }}
                  >
                    {t('settings_music')}
                  </span>
                  <span 
                    className="font-bold"
                    style={{ color: 'white' }}
                  >
                    {musicVolume}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={musicVolume}
                  onChange={(e) => setMusicVolume(parseInt(e.target.value, 10) || 0)}
                  className="w-full h-2 rounded-lg appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, #4CAF50 0%, #4CAF50 ${musicVolume}%, #ddd ${musicVolume}%, #ddd 100%)`
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* LANGUAGE PREFERENCES Section */}
        <div className="mb-8">
          <h3 
            className="text-xl font-bold mb-4"
            style={{ color: 'white' }}
          >
            {t('settings_languagePreferences')}
          </h3>
          <div className="space-y-3">
            {/* English */}
            <label className="flex items-center gap-3 cursor-pointer relative">
              <div className="relative">
                <input
                  type="radio"
                  name="language"
                  value="english"
                  checked={language === 'english'}
                  onChange={(e) => setLanguageLocal(e.target.value)}
                  className="w-5 h-5 appearance-none rounded-full border-2 transition-colors duration-300"
                  style={{
                    borderColor: language === 'english' ? '#4CAF50' : '#9CA3AF',
                    backgroundColor: language === 'english' ? '#4CAF50' : '#9CA3AF'
                  }}
                />
                {language === 'english' && (
                  <span 
                    className="absolute top-0 left-0 w-5 h-5 flex items-center justify-center"
                    style={{
                      fontSize: '0.75rem',
                      color: 'white',
                      pointerEvents: 'none'
                    }}
                  >
                    ✓
                  </span>
                )}
              </div>
              <span 
                className="font-bold"
                style={{ color: 'white' }}
              >
                {t('settings_english')}
              </span>
            </label>

            {/* Filipino */}
            <label className="flex items-center gap-3 cursor-pointer relative">
              <div className="relative">
                <input
                  type="radio"
                  name="language"
                  value="filipino"
                  checked={language === 'filipino'}
                  onChange={(e) => setLanguageLocal(e.target.value)}
                  className="w-5 h-5 appearance-none rounded-full border-2 transition-colors duration-300"
                  style={{
                    borderColor: language === 'filipino' ? '#4CAF50' : '#9CA3AF',
                    backgroundColor: language === 'filipino' ? '#4CAF50' : '#9CA3AF'
                  }}
                />
                {language === 'filipino' && (
                  <span 
                    className="absolute top-0 left-0 w-5 h-5 flex items-center justify-center"
                    style={{
                      fontSize: '0.75rem',
                      color: 'white',
                      pointerEvents: 'none'
                    }}
                  >
                    ✓
                  </span>
                )}
              </div>
              <span 
                className="font-bold"
                style={{ color: 'white' }}
              >
                {t('settings_filipino')}
              </span>
            </label>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col xs:flex-row gap-3 sm:gap-4">
          <button
            onClick={handleSave}
            className="flex-1 py-3 px-6 rounded-lg font-bold text-white transition-colors min-h-[44px] touch-manipulation"
            style={{ backgroundColor: '#4CAF50' }}
          >
            {t('common_save')}
          </button>
          <button
            onClick={handleDiscard}
            className="flex-1 py-3 px-6 rounded-lg font-bold text-white transition-colors bg-gray-500 hover:bg-gray-600 min-h-[44px] touch-manipulation"
          >
            {t('common_discard')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Settings;

