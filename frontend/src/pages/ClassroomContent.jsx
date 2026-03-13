import React, { useState, useEffect } from 'react';
import { FaTrash } from 'react-icons/fa';
import { classAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { getDefaultAvatarByGender, getAvatarSrc, getAvatarBgColor } from '../utils/avatar';

const ClassroomContent = ({ classData }) => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [removingId, setRemovingId] = useState(null);

  const isTeacher = user?.accountType === 'TEACHER';

  useEffect(() => {
    if (classData?.id) {
      loadClassStudents();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classData]);

  const loadClassStudents = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await classAPI.getClassById(classData.id);
      if (response.class && response.class.students) {
        setStudents(response.class.students);
      } else {
        setStudents([]);
      }
    } catch (err) {
      console.error('Load students error:', err);
      setError('Failed to load students. Please try again.');
      setStudents([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveStudent = async (student) => {
    const studentId = student._id ?? student.id;
    const studentName = student.firstName && student.lastName ? `${student.firstName} ${student.lastName}` : student.firstName || student.lastName || 'this student';
    if (!window.confirm(`Remove ${studentName} from this class? They will need to re-join with the class code.`)) return;
    if (!classData?.id) return;
    setRemovingId(studentId);
    setError('');
    try {
      await classAPI.removeStudentFromClass(classData.id, studentId);
      setStudents((prev) => prev.filter((s) => (s._id ?? s.id) !== studentId));
    } catch (err) {
      console.error('Remove student error:', err);
      setError(err.response?.data?.message || 'Failed to remove student. Please try again.');
    } finally {
      setRemovingId(null);
    }
  };

  // Color palette for student cards
  const bgColors = ['#90EE90', '#D2B48C', '#8B4513', '#9CAF88', '#A0A0A0', '#FFB6C1', '#87CEEB', '#DDA0DD'];

  // Function to censor email (show first 2-3 chars, then ***, then domain)
  const censorEmail = (email) => {
    const [localPart, domain] = email.split('@');
    if (localPart.length <= 3) {
      return `${localPart[0]}***@${domain}`;
    }
    const visibleChars = localPart.substring(0, 3);
    return `${visibleChars}***@${domain}`;
  };

  const formatGender = (gender) => {
    if (!gender) return 'N/A';
    const normalized = String(gender).trim().toLowerCase();
    if (normalized === 'male') return t('common_male');
    if (normalized === 'female') return t('common_female');
    return gender;
  };

  return (
    <div className="flex-1 w-full min-w-0 p-4 xs:p-5 sm:p-6 md:p-8 flex items-center justify-center">
      <div className="w-full max-w-4xl">
        {/* Title */}
        <div className="flex flex-col items-center mb-4 sm:mb-6">
          <div 
            className="px-4 sm:px-6 md:px-8 py-2 rounded-lg relative"
            style={{ 
              backgroundColor: '#8B4513',
              clipPath: 'polygon(0 0, calc(100% - 20px) 0, 100% 50%, calc(100% - 20px) 100%, 0 100%)'
            }}
          >
            <h1 className="text-xl sm:text-2xl font-bold text-white">{isTeacher ? t('classroom_students') : t('classroom_classmates')}</h1>
          </div>
        </div>

        {/* Classmates Panel */}
        <div 
          className="rounded-lg p-4 sm:p-6 shadow-2xl"
          style={{
            backgroundColor: '#F5DEB3',
            border: '3px solid rgba(0, 0, 0, 0.5)',
            minHeight: 'min(400px, 60vh)'
          }}
        >
          {/* Column Headers - same grid and padding as row so columns align */}
          <div className="hidden md:grid md:grid-cols-12 md:gap-4 md:items-center mb-4 pb-2 border-b-2 px-3 sm:px-4" style={{ borderColor: '#000000' }}>
            <div className="col-span-5 text-left">
              <span className="font-bold text-white text-sm sm:text-base" style={{ textShadow: '2px 2px 4px rgba(0, 0, 0, 1)' }}>{t('leaderboard_name')}</span>
            </div>
            <div className="col-span-3 text-center">
              <span className="font-bold text-white text-sm sm:text-base" style={{ textShadow: '2px 2px 4px rgba(0, 0, 0, 1)' }}>{t('signup_gender')}</span>
            </div>
            <div className={isTeacher ? 'col-span-3 text-center' : 'col-span-4 text-center'}>
              <span className="font-bold text-white text-sm sm:text-base" style={{ textShadow: '2px 2px 4px rgba(0, 0, 0, 1)' }}>{t('common_email')}</span>
            </div>
            {isTeacher && (
              <div className="col-span-1 text-center">
                <span className="font-bold text-white text-sm sm:text-base" style={{ textShadow: '2px 2px 4px rgba(0, 0, 0, 1)' }}>{t('classroom_action')}</span>
              </div>
            )}
          </div>

          {/* Classroom Entries */}
          <div className="space-y-2 sm:space-y-3 max-h-[55vh] sm:max-h-[500px] overflow-y-auto">
            {loading ? (
              <div className="text-center py-8">
                <span className="font-bold text-white" style={{ textShadow: '2px 2px 4px rgba(0, 0, 0, 1)' }}>{t('classroom_loadingStudents')}</span>
              </div>
            ) : error ? (
              <div className="text-center py-8">
                <span className="font-bold text-red-300" style={{ textShadow: '2px 2px 4px rgba(0, 0, 0, 1)' }}>{error}</span>
              </div>
            ) : students.length === 0 ? (
              <div className="text-center py-8">
                <span className="font-bold text-white" style={{ textShadow: '2px 2px 4px rgba(0, 0, 0, 1)' }}>{t('classroom_noStudents')}</span>
              </div>
            ) : (
              students.map((student, index) => {
                const studentName = student.firstName && student.lastName 
                  ? `${student.firstName} ${student.lastName}`
                  : student.firstName || student.lastName || 'Unknown';
                const avatarSrc = getAvatarSrc(student.profilePicture, student.gender);
                const bgColor = bgColors[index % bgColors.length];
                const emailDisplay = student.email
                  ? (String(student._id ?? student.id) === String(user?._id ?? user?.id)
                      ? student.email
                      : censorEmail(student.email))
                  : 'N/A';

                return (
                  <div
                    key={student.id || student._id || index}
                    className="flex flex-col md:grid md:grid-cols-12 gap-2 md:gap-4 md:items-center p-3 sm:p-4 rounded-lg"
                    style={{ backgroundColor: bgColor }}
                  >
                    {/* Name with Avatar - mobile: full width; desktop: col 5, left-aligned to match NAME header */}
                    <div className="flex items-center justify-between md:col-span-5 md:justify-start gap-2 sm:gap-3 order-1">
                      <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                        <div 
                          className="w-10 h-10 sm:w-12 sm:h-12 rounded-full overflow-hidden border-2 border-gray-600 flex-shrink-0"
                          style={{ backgroundColor: getAvatarBgColor(student.profilePicture || getDefaultAvatarByGender(student.gender)) }}
                        >
                          <img 
                            src={avatarSrc}
                            alt={studentName}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.target.src = getAvatarSrc(getDefaultAvatarByGender(student.gender), student.gender);
                            }}
                          />
                        </div>
                        <span className="font-bold text-white text-sm sm:text-base truncate" style={{ textShadow: '2px 2px 4px rgba(0, 0, 0, 1)' }}>{studentName}</span>
                      </div>
                      {isTeacher && (
                        <div className="md:hidden flex-shrink-0">
                          <button
                            type="button"
                            onClick={() => handleRemoveStudent(student)}
                            disabled={removingId === (student._id ?? student.id)}
                            className="p-2 rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation min-w-[40px] min-h-[40px] flex items-center justify-center"
                            style={{
                              backgroundColor: 'rgba(220, 38, 38, 0.8)',
                              border: '2px solid rgba(0, 0, 0, 0.5)'
                            }}
                            title="Remove student from class"
                          >
                            <FaTrash className="text-white" size={16} />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Gender */}
                    <div className="flex items-center gap-1 md:col-span-3 md:justify-center order-2">
                      <span className="text-white text-xs md:hidden" style={{ textShadow: '2px 2px 4px rgba(0, 0, 0, 1)' }}>{t('signup_gender')}: </span>
                      <span className="font-bold text-white text-sm sm:text-base" style={{ textShadow: '2px 2px 4px rgba(0, 0, 0, 1)' }}>{formatGender(student.gender)}</span>
                    </div>

                    {/* Email */}
                    <div className={`flex items-center gap-1 md:justify-center order-3 ${isTeacher ? 'md:col-span-3' : 'md:col-span-4'}`}>
                      <span className="text-white text-xs md:hidden" style={{ textShadow: '2px 2px 4px rgba(0, 0, 0, 1)' }}>{t('common_email')}: </span>
                      <span className="font-bold text-white text-xs sm:text-sm truncate" style={{ textShadow: '2px 2px 4px rgba(0, 0, 0, 1)' }}>{emailDisplay}</span>
                    </div>

                    {/* Remove (teacher only) - desktop */}
                    {isTeacher && (
                      <div className="hidden md:flex col-span-1 items-center justify-center order-4">
                        <button
                          type="button"
                          onClick={() => handleRemoveStudent(student)}
                          disabled={removingId === (student._id ?? student.id)}
                          className="p-2 rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation min-w-[40px] min-h-[40px] flex items-center justify-center"
                          style={{
                            backgroundColor: 'rgba(220, 38, 38, 0.8)',
                            border: '2px solid rgba(0, 0, 0, 0.5)'
                          }}
                          title="Remove student from class"
                        >
                          <FaTrash className="text-white" size={16} />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClassroomContent;

