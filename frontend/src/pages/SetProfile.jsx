import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaTimes, FaEdit } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { getDefaultAvatarByGender, getAvatarBgColor, isCustomAvatar } from '../utils/avatar';

const SetProfile = () => {
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();
  const { t } = useLanguage();
  const [selectedAvatar, setSelectedAvatar] = useState(() => getDefaultAvatarByGender(user?.gender));
  const [customImage, setCustomImage] = useState(null); // data URL or URL for custom avatar
  const avatarFileInputRef = useRef(null);
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [profileData, setProfileData] = useState({
    username: '',
    fullName: '',
    gender: '',
    gradeLevel: '',
    section: ''
  });

  // Load user data when component mounts
  useEffect(() => {
    if (user) {
      // Set profile data from user information
      const fullName = user.lastName && user.firstName 
        ? `${user.lastName}, ${user.firstName}` 
        : user.firstName || user.lastName || '';
      
      setProfileData({
        username: user.firstName || '',
        fullName: fullName,
        gender: user.gender || '',
        gradeLevel: user.gradeLevel || '',
        section: user.section || ''
      });

      // Set avatar if user has one saved; otherwise keep default by gender
      if (user.profilePicture) {
        if (isCustomAvatar(user.profilePicture)) {
          setCustomImage(user.profilePicture);
          setSelectedAvatar('custom');
        } else {
          setCustomImage(null);
          setSelectedAvatar(user.profilePicture.toLowerCase());
        }
      } else {
        setCustomImage(null);
        setSelectedAvatar(getDefaultAvatarByGender(user.gender));
      }
    }
  }, [user]);

  // Helper function to get home route based on account type
  const getHomeRoute = () => {
    if (user?.accountType === 'ADMIN') {
      return '/admin';
    } else if (user?.accountType === 'TEACHER') {
      return '/teacher-home';
    }
    return '/student-home';
  };

  // Avatar list with background colors from utils/avatar (getAvatarBgColor)
  const avatars = [
    { name: 'Oliver', file: 'oliver.png' },
    { name: 'Eliza', file: 'eliza.png' },
    { name: 'Ryan', file: 'ryan.png' },
    { name: 'Mason', file: 'mason.png' },
    { name: 'Kimberly', file: 'kimberly.png' },
    { name: 'Adrian', file: 'adrian.png' },
    { name: 'Riley', file: 'riley.png' },
    { name: 'Avery', file: 'avery.png' },
    { name: 'Ryker', file: 'ryker.png' },
    { name: 'Jack', file: 'jack.png' },
    { name: 'Andrea', file: 'andrea.png' },
    { name: 'Jessica', file: 'jessica.png' },
    { name: 'Leah', file: 'leah.png' },
    { name: 'Liliana', file: 'liliana.png' },
    { name: 'Eden', file: 'eden.png' },
    { name: 'Vivian', file: 'vivian.png' },
    { name: 'Jameson', file: 'jameson.png' },
    { name: 'Maria', file: 'maria.png' },
    { name: 'Valentina', file: 'valentina.png' },
    { name: 'Emery', file: 'emery.png' }
  ];

  const handleAvatarSelect = (avatarName) => {
    const avatar = avatars.find(a => a.name.toLowerCase() === avatarName.toLowerCase());
    if (avatar) {
      setCustomImage(null);
      setSelectedAvatar(avatarName.toLowerCase());
    }
  };

  const handleCustomImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = () => {
      setCustomImage(reader.result);
      setSelectedAvatar('custom');
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleEditAvatarClick = () => {
    avatarFileInputRef.current?.click();
  };

  const handleSave = async () => {
    setError('');
    setLoading(true);

    try {
      // Prepare profile update data
      const updateData = {
        firstName: profileData.username.trim() || user?.firstName || '',
        profilePicture: customImage || (selectedAvatar === 'custom' ? getDefaultAvatarByGender(user?.gender) : selectedAvatar)
      };

      const result = await updateUser(updateData);

      if (result.success) {
        // Navigate to home page after successful save
        navigate(getHomeRoute());
      } else {
        setError(result.error || t('setProfile_failed'));
      }
    } catch (err) {
      console.error('Save profile error:', err);
      setError(t('setProfile_errorGeneric'));
    } finally {
      setLoading(false);
    }
  };

  const handleDiscard = () => {
    // TODO: Reset to original values
    navigate(getHomeRoute());
  };

  const handleClose = () => {
    navigate(getHomeRoute());
  };

  const getSelectedAvatarFile = () => {
    if (customImage) return customImage;
    const avatar = avatars.find(a => a.name.toLowerCase() === selectedAvatar);
    return avatar ? `/Avatars/${avatar.file}` : `/Avatars/${getDefaultAvatarByGender(user?.gender)}.png`;
  };

  // Background color for the selected avatar (from shared avatar utils)
  const getSelectedAvatarColor = () => getAvatarBgColor(selectedAvatar);

  return (
    <div 
      className="min-h-screen h-screen overflow-auto bg-cover bg-center bg-no-repeat flex items-center justify-center p-2 xs:p-3 sm:p-4 md:p-5 overflow-x-hidden max-w-[100vw] box-border"
      style={{
        backgroundImage: `url('/images/bg.jpg')`
      }}
    >
      <div className="w-full max-w-full lg:max-w-7xl h-full min-h-0 max-h-[calc(100vh-1rem)] xs:max-h-[calc(100vh-1.5rem)] sm:max-h-[calc(100vh-2rem)] grid grid-cols-1 grid-rows-[minmax(0,1fr)_minmax(200px,1fr)] lg:grid-rows-1 lg:grid-cols-2 gap-2 xs:gap-3 sm:gap-4 overflow-hidden min-w-0">
        {/* Left Panel - Profile Details */}
        <div 
          className="rounded-lg p-2 xs:p-3 sm:p-4 shadow-2xl flex flex-col min-h-0 overflow-y-auto overflow-x-hidden min-w-0 max-w-full"
          style={{
            backgroundColor: '#778F51',
            border: '2px solid #8B7355'
          }}
        >
          <h2 
            className="text-lg xs:text-xl font-bold mb-2 sm:mb-3 text-center flex-shrink-0"
            style={{ color: 'white' }}
          >
            {t('setProfile_profile')}
          </h2>

          {/* Avatar Preview */}
          <div className="flex justify-center mb-2 sm:mb-3 flex-shrink-0">
            <div className="relative">
              <div 
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden border-2"
                style={{ 
                  borderColor: getSelectedAvatarColor(),
                  backgroundColor: getSelectedAvatarColor()
                }}
              >
                <img 
                  src={getSelectedAvatarFile()}
                  alt="Selected Avatar"
                  className="w-full h-full object-cover"
                />
              </div>
              <input
                ref={avatarFileInputRef}
                type="file"
                accept="image/*"
                onChange={handleCustomImageUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={handleEditAvatarClick}
                className="absolute bottom-0 right-0 bg-yellow-400 rounded-full p-1 sm:p-1.5 shadow-lg hover:bg-yellow-500 transition-colors min-w-[28px] min-h-[28px] flex items-center justify-center touch-manipulation"
                style={{ transform: 'translate(25%, 25%)' }}
                title={t('setProfile_changeAvatar')}
              >
                <FaEdit className="text-gray-800" size={12} />
              </button>
            </div>
          </div>

          {/* Profile Fields */}
          <div className="flex-1 min-h-0 flex flex-col justify-between py-1 gap-1 sm:gap-0">
            {/* Username */}
            <div className="flex flex-col justify-center flex-1 min-h-0 min-w-0">
              <label 
                className="block text-xs font-bold mb-1"
                style={{ color: 'white' }}
              >
                {t('setProfile_username')}
              </label>
              <div className="relative min-w-0">
                <input
                  type="text"
                  value={profileData.username}
                  onChange={(e) => setProfileData({ ...profileData, username: e.target.value })}
                  className="w-full min-w-0 px-2 xs:px-3 py-2 xs:py-2.5 text-sm rounded-lg border-2 bg-white min-h-[40px] box-border"
                  style={{ borderColor: '#8B7355' }}
                />
                <button
                  type="button"
                  onClick={() => setIsEditingUsername(!isEditingUsername)}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-yellow-600 hover:text-yellow-700 p-1 touch-manipulation"
                >
                  <FaEdit size={12} />
                </button>
              </div>
            </div>

            {/* Full Name */}
            <div className="flex flex-col justify-center flex-1 min-h-0 min-w-0">
              <label 
                className="block text-xs font-bold mb-1"
                style={{ color: 'white' }}
              >
                {t('setProfile_fullName')}
              </label>
              <div 
                className="w-full min-w-0 px-2 xs:px-3 py-2 xs:py-2.5 text-sm rounded-lg border-2 bg-white min-h-[40px] flex items-center box-border"
                style={{ borderColor: '#8B7355', color: '#000000' }}
              >
                {profileData.fullName}
              </div>
            </div>

            {/* Gender */}
            <div className="flex flex-col justify-center flex-1 min-h-0 min-w-0">
              <label 
                className="block text-xs font-bold mb-1"
                style={{ color: 'white' }}
              >
                {t('setProfile_gender')}
              </label>
              <div 
                className="w-full min-w-0 px-2 xs:px-3 py-2 xs:py-2.5 text-sm rounded-lg border-2 bg-white min-h-[40px] flex items-center box-border"
                style={{ borderColor: '#8B7355', color: '#000000' }}
              >
                {profileData.gender}
              </div>
            </div>

            {/* Grade Level */}
            <div className="flex flex-col justify-center flex-1 min-h-0 min-w-0">
              <label 
                className="block text-xs font-bold mb-1"
                style={{ color: 'white' }}
              >
                {t('setProfile_gradeLevel')}
              </label>
              <div className="relative min-w-0">
                <input
                  type="text"
                  readOnly
                  value={profileData.gradeLevel}
                  className="w-full min-w-0 px-2 xs:px-3 py-2 xs:py-2.5 text-sm rounded-lg border-2 bg-white min-h-[40px] box-border"
                  style={{ borderColor: '#8B7355', color: '#000000' }}
                />
              </div>
            </div>

            {/* Section */}
            <div className="flex flex-col justify-center flex-1 min-h-0 min-w-0">
              <label 
                className="block text-xs font-bold mb-1"
                style={{ color: 'white' }}
              >
                {t('setProfile_section')}
              </label>
              <div className="relative min-w-0">
                <input
                  type="text"
                  readOnly
                  value={profileData.section}
                  className="w-full min-w-0 px-2 xs:px-3 py-2 xs:py-2.5 text-sm rounded-lg border-2 bg-white min-h-[40px] box-border"
                  style={{ borderColor: '#8B7355', color: '#000000' }}
                />
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mt-2 p-2 bg-red-100 border-2 border-red-400 rounded-lg text-red-700 text-xs text-center flex-shrink-0">
              {error}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col xs:flex-row gap-2 sm:gap-3 mt-3 flex-shrink-0">
            <button
              onClick={handleSave}
              disabled={loading}
              className="flex-1 py-2.5 px-4 rounded-lg font-bold text-sm text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] touch-manipulation"
              style={{ backgroundColor: '#8B7355' }}
            >
              {loading ? t('setProfile_saving') : t('setProfile_save')}
            </button>
            <button
              onClick={handleDiscard}
              disabled={loading}
              className="flex-1 py-2.5 px-4 rounded-lg font-bold text-sm text-gray-700 transition-colors bg-gray-300 hover:bg-gray-400 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] touch-manipulation"
            >
              {t('setProfile_discard')}
            </button>
          </div>
        </div>

        {/* Right Panel - AVATARS */}
        <div 
          className="rounded-lg p-2 xs:p-3 sm:p-4 shadow-2xl flex flex-col min-h-0 overflow-hidden min-w-0 max-w-full"
          style={{
            backgroundColor: '#778F51',
            border: '2px solid #8B7355'
          }}
        >
          {/* Header */}
          <div className="relative flex justify-center items-center mb-1.5 sm:mb-2 flex-shrink-0 min-w-0">
            <h2 
              className="text-base xs:text-lg sm:text-xl font-bold text-center truncate"
              style={{ color: 'white' }}
            >
              {t('setProfile_avatars')}
            </h2>
            <button
              type="button"
              onClick={handleClose}
              className="absolute right-0 top-1/2 -translate-y-1/2 text-red-500 hover:text-red-700 text-lg sm:text-xl p-1.5 touch-manipulation min-w-[36px] min-h-[36px] xs:min-w-[44px] xs:min-h-[44px] flex items-center justify-center flex-shrink-0"
            >
              <FaTimes />
            </button>
          </div>

          {/* Avatar Grid - 3 cols at 320px, 4 at 375+, 5 at 640+ */}
          <div 
            className="grid grid-cols-3 xs:grid-cols-4 sm:grid-cols-5 gap-1 xs:gap-1.5 sm:gap-2 min-h-0 flex-1 overflow-y-auto overflow-x-hidden content-start"
          >
            {avatars.map((avatar) => (
              <div
                key={avatar.name}
                onClick={() => handleAvatarSelect(avatar.name)}
                className={`flex flex-col items-center justify-center cursor-pointer p-0.5 sm:p-1 rounded-lg transition-all min-h-0 min-w-0 touch-manipulation ${
                  selectedAvatar === avatar.name.toLowerCase() && !customImage
                    ? 'bg-yellow-200 ring-2 ring-yellow-500'
                    : ''
                }`}
              >
                <div className="flex items-center justify-center w-full min-w-0 flex-shrink-0">
                  <div 
                    className="w-9 h-9 xs:w-10 xs:h-10 sm:w-12 sm:h-12 aspect-square rounded-full overflow-hidden border-2 border-gray-400 flex-shrink-0"
                    style={{ backgroundColor: getAvatarBgColor(avatar.name) }}
                  >
                    <img 
                      src={`/Avatars/${avatar.file}`}
                      alt={avatar.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
                <span 
                  className="text-[9px] xs:text-[10px] sm:text-sm font-semibold text-center w-full leading-tight flex-shrink-0 drop-shadow-md truncate min-w-0 mt-0.5"
                  style={{ color: 'white', textShadow: '0 1px 2px rgba(0,0,0,0.6), 0 2px 4px rgba(0,0,0,0.4)' }}
                >
                  {avatar.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SetProfile;

