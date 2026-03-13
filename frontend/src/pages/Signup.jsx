import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { translate } from '../translations';

const Signup = () => {
  const navigate = useNavigate();
  const t = (key, params) => translate(key, 'english', params);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    month: '',
    day: '',
    year: '',
    gender: '',
    gradeLevel: '',
    section: ''
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // TODO: Implement signup logic
    console.log('Signup attempt:', formData);
    // Navigate to password setup page
    navigate('/password-setup', { state: formData });
  };

  // Generate options for dropdowns
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const days = Array.from({ length: 31 }, (_, i) => i + 1);
  const years = Array.from({ length: 100 }, (_, i) => new Date().getFullYear() - i);
  const genders = ['Male', 'Female', 'Other', 'Prefer not to say'];
  const gradeLevels = Array.from({ length: 12 }, (_, i) => i + 1);

  return (
    <div 
      className="min-h-screen flex items-center justify-center bg-cover bg-center bg-no-repeat"
      style={{
        backgroundImage: `url('/images/bg.jpg')`
      }}
    >
      <div className="w-full max-w-2xl px-4">
        {/* Signup Form Container */}
        <div className="rounded-lg shadow-2xl p-8 bg-transparent">
          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* First Name Field */}
            <div>
              <label 
                htmlFor="firstName" 
                className="block font-bold mb-2 text-xl"
                style={{
                  color: 'white',
                  textShadow: '2px 2px 4px rgba(0, 0, 0, 1)'
                }}
              >
                {t('signup_firstName')}
              </label>
              <input
                type="text"
                id="firstName"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-lg border-2 border-black focus:outline-none bg-white text-gray-800 text-base"
                required
              />
            </div>

            {/* Last Name Field */}
            <div>
              <label 
                htmlFor="lastName" 
                className="block font-bold mb-2 text-xl"
                style={{
                  color: 'white',
                  textShadow: '2px 2px 4px rgba(0, 0, 0, 1)'
                }}
              >
                {t('signup_lastName')}
              </label>
              <input
                type="text"
                id="lastName"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-lg border-2 border-black focus:outline-none bg-white text-gray-800 text-base"
                required
              />
            </div>

            {/* Birth Date Banner */}
            <div 
              className="w-full py-3 px-4 rounded-lg mb-4 bg-white border-2 border-black"
            >
              <label 
                className="block font-bold text-xl text-center"
                style={{
                  color: 'white',
                  textShadow: '2px 2px 4px rgba(0, 0, 0, 1)'
                }}
              >
                {t('signup_birthDate')}
              </label>
            </div>

            {/* Birth Date Dropdowns */}
            <div className="grid grid-cols-3 gap-4">
              {/* Month Dropdown */}
              <div>
                <label 
                  htmlFor="month" 
                  className="block font-bold mb-2 text-lg text-center"
                  style={{
                    color: 'white',
                    textShadow: '2px 2px 4px rgba(0, 0, 0, 1)'
                  }}
                >
                  {t('signup_month')}
                </label>
                <select
                  id="month"
                  name="month"
                  value={formData.month}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-lg border-2 border-black focus:outline-none bg-white text-gray-800 text-base appearance-none cursor-pointer"
                  required
                >
                  <option value="">{t('signup_selectMonth')}</option>
                  {months.map((month, index) => (
                    <option key={index} value={month}>{month}</option>
                  ))}
                </select>
              </div>

              {/* Day Dropdown */}
              <div>
                <label 
                  htmlFor="day" 
                  className="block font-bold mb-2 text-lg text-center"
                  style={{
                    color: 'white',
                    textShadow: '2px 2px 4px rgba(0, 0, 0, 1)'
                  }}
                >
                  {t('signup_day')}
                </label>
                <select
                  id="day"
                  name="day"
                  value={formData.day}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-lg border-2 border-black focus:outline-none bg-white text-gray-800 text-base appearance-none cursor-pointer"
                  required
                >
                  <option value="">{t('signup_selectDay')}</option>
                  {days.map((day) => (
                    <option key={day} value={day}>{day}</option>
                  ))}
                </select>
              </div>

              {/* Year Dropdown */}
              <div>
                <label 
                  htmlFor="year" 
                  className="block font-bold mb-2 text-lg text-center"
                  style={{
                    color: 'white',
                    textShadow: '2px 2px 4px rgba(0, 0, 0, 1)'
                  }}
                >
                  {t('signup_year')}
                </label>
                <select
                  id="year"
                  name="year"
                  value={formData.year}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-lg border-2 border-black focus:outline-none bg-white text-gray-800 text-base appearance-none cursor-pointer"
                  required
                >
                  <option value="">{t('signup_selectYear')}</option>
                  {years.map((year) => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Gender Field */}
            <div>
              <label 
                htmlFor="gender" 
                className="block font-bold mb-2 text-xl"
                style={{
                  color: 'white',
                  textShadow: '2px 2px 4px rgba(0, 0, 0, 1)'
                }}
              >
                {t('signup_gender')}
              </label>
              <select
                id="gender"
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-lg border-2 border-black focus:outline-none bg-white text-gray-800 text-base appearance-none cursor-pointer"
                required
              >
                <option value="">{t('signup_selectGender')}</option>
                {genders.map((gender) => (
                  <option key={gender} value={gender}>{gender}</option>
                ))}
              </select>
            </div>

            {/* Grade Level Field */}
            <div>
              <label 
                htmlFor="gradeLevel" 
                className="block font-bold mb-2 text-xl"
                style={{
                  color: 'white',
                  textShadow: '2px 2px 4px rgba(0, 0, 0, 1)'
                }}
              >
                {t('signup_gradeLevel')}
              </label>
              <select
                id="gradeLevel"
                name="gradeLevel"
                value={formData.gradeLevel}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-lg border-2 border-black focus:outline-none bg-white text-gray-800 text-base appearance-none cursor-pointer"
                required
              >
                <option value="">{t('signup_selectGradeLevel')}</option>
                {gradeLevels.map((grade) => (
                  <option key={grade} value={grade}>{t('signup_grade', { n: grade })}</option>
                ))}
              </select>
            </div>

            {/* Section Field */}
            <div>
              <label 
                htmlFor="section" 
                className="block font-bold mb-2 text-xl"
                style={{
                  color: 'white',
                  textShadow: '2px 2px 4px rgba(0, 0, 0, 1)'
                }}
              >
                {t('signup_section')}
              </label>
              <input
                type="text"
                id="section"
                name="section"
                value={formData.section}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-lg border-2 border-black focus:outline-none bg-white text-gray-800 text-base"
                required
              />
            </div>

            {/* NEXT Button */}
            <div className="flex justify-end mt-8">
              <button
                type="submit"
                className="bg-green-700 hover:bg-green-800 text-white font-bold py-3 px-8 rounded-lg transition-colors duration-200 text-lg shadow-lg"
              >
                {t('signup_next')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Signup;
