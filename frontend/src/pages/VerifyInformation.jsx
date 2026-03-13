import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { translate } from '../translations';

const VerifyInformation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { register } = useAuth();
  const t = (key, params) => translate(key, 'english', params);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    month: '',
    day: '',
    year: '',
    gender: '',
    gradeLevel: '',
    section: '',
    accountType: 'STUDENT'
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Pre-fill form with data from previous step
    if (location.state) {
      setFormData({
        firstName: location.state.firstName || '',
        lastName: location.state.lastName || '',
        month: location.state.month || '',
        day: location.state.day || '',
        year: location.state.year || '',
        gender: location.state.gender || '',
        accountType: location.state.accountType || 'STUDENT',
        gradeLevel: location.state.gradeLevel || '',
        section: location.state.section || ''
      });
    }
  }, [location.state]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Get email and password from location state (from password setup)
      const { email, password } = location.state || {};
      
      if (!email || !password) {
        setError(t('verifyInfo_missingEmailPassword'));
        setLoading(false);
        return;
      }

      // Prepare registration data
      const registrationData = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email,
        password,
        month: formData.month,
        day: formData.day,
        year: formData.year,
        gender: formData.gender,
        gradeLevel: formData.gradeLevel,
        section: formData.section,
        accountType: formData.accountType === 'TEACHER' ? 'TEACHER' : 'STUDENT'
      };

      const result = await register(registrationData, true); // true = auto-login after signup

      if (result.success) {
        // Redirect to the appropriate homepage (student or teacher)
        const homePath = result.user?.accountType === 'TEACHER' ? '/teacher-home' : '/student-home';
        navigate(homePath, { replace: true });
      } else {
        // Show more detailed error message
        const errorMsg = result.error || t('verifyInfo_creationFailed');
        console.error('Registration error:', result);
        setError(errorMsg);
      }
    } catch (err) {
      console.error('Registration exception:', err);
      setError(err.response?.data?.message || t('verifyInfo_unexpectedError'));
    } finally {
      setLoading(false);
    }
  };

  // Generate options for dropdowns
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const days = Array.from({ length: 31 }, (_, i) => i + 1);
  const years = Array.from({ length: 100 }, (_, i) => new Date().getFullYear() - i);
  const genders = ['Male', 'Female', 'Other', 'Prefer not to say'];

  return (
    <div 
      className="min-h-screen flex items-center justify-center bg-cover bg-center bg-no-repeat"
      style={{
        backgroundImage: `url('/images/bg.jpg')`
      }}
    >
      <div className="w-full max-w-2xl px-4">
        {/* Verification Form Container */}
        <div className="rounded-lg shadow-2xl p-8 bg-transparent">
          {/* VERIFIED YOUR INFORMATION Banner */}
          <div className="bg-green-700 rounded-lg mb-6 py-3 px-4 border-2 border-green-900">
            <h1 
              className="text-2xl font-bold text-white text-center"
              style={{
                textShadow: '2px 2px 4px rgba(0, 0, 0, 1)'
              }}
            >
              {t('verifyInfo_title')}
            </h1>
          </div>

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
                {t('verifyInfo_firstName')}
              </label>
              <input
                type="text"
                id="firstName"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-lg border-2 border-gray-600 focus:outline-none focus:border-gray-800 bg-gray-200 text-gray-800 text-base"
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
                {t('verifyInfo_lastName')}
              </label>
              <input
                type="text"
                id="lastName"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-lg border-2 border-gray-600 focus:outline-none focus:border-gray-800 bg-gray-200 text-gray-800 text-base"
                required
              />
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
                  {t('verifyInfo_month')}
                </label>
                <select
                  id="month"
                  name="month"
                  value={formData.month}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-lg border-2 border-gray-600 focus:outline-none focus:border-gray-800 bg-gray-200 text-gray-800 text-base appearance-none cursor-pointer"
                  required
                >
                  <option value="">{t('verifyInfo_selectMonth')}</option>
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
                  {t('verifyInfo_day')}
                </label>
                <select
                  id="day"
                  name="day"
                  value={formData.day}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-lg border-2 border-gray-600 focus:outline-none focus:border-gray-800 bg-gray-200 text-gray-800 text-base appearance-none cursor-pointer"
                  required
                >
                  <option value="">{t('verifyInfo_selectDay')}</option>
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
                  {t('verifyInfo_year')}
                </label>
                <select
                  id="year"
                  name="year"
                  value={formData.year}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-lg border-2 border-gray-600 focus:outline-none focus:border-gray-800 bg-gray-200 text-gray-800 text-base appearance-none cursor-pointer"
                  required
                >
                  <option value="">{t('verifyInfo_selectYear')}</option>
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
                {t('verifyInfo_gender')}
              </label>
              <select
                id="gender"
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-lg border-2 border-gray-600 focus:outline-none focus:border-gray-800 bg-gray-200 text-gray-800 text-base appearance-none cursor-pointer"
                required
              >
                <option value="">{t('verifyInfo_selectGender')}</option>
                {genders.map((gender) => (
                  <option key={gender} value={gender}>
                    {gender === 'Male' ? t('verifyInfo_genderMale') : gender === 'Female' ? t('verifyInfo_genderFemale') : gender === 'Other' ? t('verifyInfo_genderOther') : t('verifyInfo_genderPreferNotToSay')}
                  </option>
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
                {t('verifyInfo_gradeLevel')}
              </label>
              <input
                type="text"
                id="gradeLevel"
                name="gradeLevel"
                value={formData.gradeLevel ? t('signup_grade', { n: formData.gradeLevel }) : ''}
                readOnly
                className="w-full px-4 py-3 rounded-lg border-2 border-gray-600 bg-gray-200 text-gray-800 text-base cursor-not-allowed"
              />
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
                {t('verifyInfo_section')}
              </label>
              <input
                type="text"
                id="section"
                name="section"
                value={formData.section}
                readOnly
                className="w-full px-4 py-3 rounded-lg border-2 border-gray-600 bg-gray-200 text-gray-800 text-base cursor-not-allowed"
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="mt-4 p-3 bg-red-100 border-2 border-red-400 rounded-lg text-red-700 text-sm text-center">
                {error}
              </div>
            )}

            {/* CREATE ACCOUNT Button */}
            <div className="flex justify-end mt-8">
              <button
                type="submit"
                disabled={loading}
                className="bg-green-700 hover:bg-green-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 px-8 rounded-lg transition-colors duration-200 text-lg shadow-lg border-2 border-green-900"
              >
                {loading ? t('verifyInfo_creatingAccount') : t('verifyInfo_createAccount')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default VerifyInformation;

