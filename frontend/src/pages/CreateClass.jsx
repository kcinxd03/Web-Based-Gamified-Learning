import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaUserCircle, FaCog, FaSignOutAlt } from 'react-icons/fa';
import { classAPI } from '../services/api';

const CreateClass = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    subject: '',
    gradeLevel: '',
    section: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Grade level options
  const gradeLevels = [4, 5, 6];
  
  // Subject options
  const subjects = [
    'Mathematics',
    'English',
    'Science',
    'Filipino',
    'Mapeh'
  ];

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await classAPI.createClass(formData);
      if (response.class) {
        // Navigate to my-class after successful creation
        navigate('/my-class');
      }
    } catch (err) {
      console.error('Create class error:', err);
      setError(err.response?.data?.message || 'Failed to create class. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigate('/teacher-home');
  };

  const handleProfileClick = () => {
    navigate("/set-profile");
  };

  const handleSettingsClick = () => {
    navigate("/settings");
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/";
  };

  return (
    <div 
      className="flex flex-col min-h-screen overflow-x-hidden p-4 xs:p-5 sm:p-6"
      style={{
        backgroundImage: `url('/images/bg.jpg')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        fontFamily: '"Poppins", sans-serif'
      }}
    >
      {/* Header - responsive */}
      <header className="w-full flex justify-end items-center absolute top-2 right-2 xs:right-4 text-base xs:text-lg z-10">
        <div className="flex gap-2 sm:gap-3 md:gap-4 flex-wrap justify-end">
          <button
            onClick={handleProfileClick}
            className="flex items-center gap-1 sm:gap-1.5 px-2.5 py-2 sm:px-3 sm:py-2 rounded-lg cursor-pointer transition-colors hover:bg-[#6b814b] min-h-[40px] touch-manipulation"
          >
            <FaUserCircle className="text-lg sm:text-xl text-[#887443]" />
            <span className="text-xs sm:text-sm font-bold text-white hidden xs:inline">PROFILE</span>
          </button>
          <button
            onClick={handleSettingsClick}
            className="flex items-center gap-1 sm:gap-1.5 px-2.5 py-2 sm:px-3 sm:py-2 rounded-lg cursor-pointer transition-colors hover:bg-[#6b814b] min-h-[40px] touch-manipulation"
          >
            <FaCog className="text-lg sm:text-xl text-[#887443]" />
            <span className="text-xs sm:text-sm font-bold text-white hidden xs:inline">SETTINGS</span>
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1 sm:gap-1.5 px-2.5 py-2 sm:px-3 sm:py-2 rounded-lg cursor-pointer transition-colors hover:bg-[#6b814b] min-h-[40px] touch-manipulation"
          >
            <FaSignOutAlt className="text-lg sm:text-xl text-white" />
            <span className="text-xs sm:text-sm font-bold text-white hidden xs:inline">LOGOUT</span>
          </button>
        </div>
      </header>

      {/* Main Container - responsive width/height */}
      <div className="flex flex-col items-center justify-center mt-16 sm:mt-20 p-4 xs:p-5 sm:p-6 md:p-8 bg-[#778f51] rounded-2xl w-full max-w-[95vw] sm:max-w-[90vw] md:max-w-[85vw] lg:max-w-[520px] xl:max-w-[560px] min-h-[420px] sm:min-h-[480px] md:min-h-[520px] lg:min-h-[560px] shadow-lg border-2 sm:border-[3px] border-black mx-auto">
        {/* Title */}
        <h1 
          className="text-center text-xl xs:text-2xl font-bold mb-4 sm:mb-6 pb-6 sm:pb-10 text-white w-full"
          style={{
            WebkitTextStroke: '1px black'
          }}
        >
          CREATE CLASS
        </h1>

        {/* Form */}
        <form onSubmit={handleSubmit} className="w-full">
          {/* Subject */}
          <div className="text-left mb-4 w-full">
            <label className="block mb-1.5 font-black text-white">
              SUBJECT
            </label>
            <select
              name="subject"
              value={formData.subject}
              onChange={handleChange}
              className="w-full p-2.5 rounded-md border-[1.5px] border-black text-sm focus:outline-none focus:border-[#007bff] focus:shadow-[0_0_3px_rgba(0,123,255,0.5)] appearance-none cursor-pointer bg-white"
              required
            >
              <option value="">Select Subject</option>
              {subjects.map((subject) => (
                <option key={subject} value={subject}>
                  {subject}
                </option>
              ))}
            </select>
          </div>

          {/* Grade Level */}
          <div className="text-left mb-4 w-full">
            <label className="block mb-1.5 font-black text-white">
              GRADE LEVEL
            </label>
            <select
              name="gradeLevel"
              value={formData.gradeLevel}
              onChange={handleChange}
              className="w-full p-2.5 rounded-md border-[1.5px] border-black text-sm focus:outline-none focus:border-[#007bff] focus:shadow-[0_0_3px_rgba(0,123,255,0.5)] appearance-none cursor-pointer bg-white"
              required
            >
              <option value="">Select Grade Level</option>
              {gradeLevels.map((grade) => (
                <option key={grade} value={grade}>
                  Grade {grade}
                </option>
              ))}
            </select>
          </div>

          {/* Section */}
          <div className="text-left mb-4 w-full">
            <label className="block mb-1.5 font-black text-white">
              SECTION
            </label>
            <input
              type="text"
              name="section"
              value={formData.section}
              onChange={handleChange}
              className="w-full p-2.5 rounded-md border-[1.5px] border-black text-sm focus:outline-none focus:border-[#007bff] focus:shadow-[0_0_3px_rgba(0,123,255,0.5)]"
              required
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-100 border-2 border-red-400 rounded-lg text-red-700 text-sm text-center">
              {error}
            </div>
          )}

          {/* Buttons */}
          <div className="flex flex-col xs:flex-row justify-between gap-3 mt-5 w-full">
            <button
              type="button"
              onClick={handleCancel}
              className="flex-1 p-3 text-sm sm:text-[15px] font-semibold border-none rounded-lg cursor-pointer transition-colors bg-[#818f88] text-white border-[1.5px] border-black hover:bg-[#c82333] min-h-[44px] touch-manipulation"
            >
              CANCEL
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 p-3 text-sm sm:text-[15px] font-semibold border-none rounded-lg cursor-pointer transition-colors bg-[#887443] text-white border-[1.5px] border-black hover:bg-[#218838] disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] touch-manipulation"
            >
              {loading ? 'CREATING...' : 'CREATE'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateClass;

