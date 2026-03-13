import React, { useState, useEffect } from 'react';
import { FaTrophy, FaStar } from 'react-icons/fa';
import { useLanguage } from '../context/LanguageContext';
import { classAPI } from '../services/api';
import { getDefaultAvatarByGender, getAvatarSrc, getAvatarBgColor } from '../utils/avatar';

const Leaderboard = ({ classData, showLastGamePoints = false, currentUser = null }) => {
  const { t } = useLanguage();
  const isStudentView = currentUser?.accountType === 'STUDENT';
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (classData?.id || classData?._id) {
      loadClassStudents();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classData]);

  const loadClassStudents = async () => {
    const classId = classData?.id ?? classData?._id;
    if (!classId) return;
    setLoading(true);
    setError('');
    try {
      const response = await classAPI.getLeaderboard(classId);
      if (response.students && Array.isArray(response.students)) {
        setStudents(response.students);
      } else {
        const classRes = await classAPI.getClassById(classId);
        if (classRes.class && classRes.class.students) {
          setStudents(classRes.class.students.map((s) => ({ ...s, totalPoints: 0, lastGamePoints: 0 })));
        } else {
          setStudents([]);
        }
      }
    } catch (err) {
      console.error('Load students error:', err);
      setError(t('leaderboard_failed'));
      setStudents([]);
    } finally {
      setLoading(false);
    }
  };

  // Color palette for leaderboard entries
  const bgColors = ['#90EE90', '#D2B48C', '#8B4513', '#9CAF88', '#A0A0A0', '#FFB6C1', '#87CEEB', '#DDA0DD'];

  // For students: only show the current user's entry (no rank)
  const currentStudent = isStudentView && currentUser && students.length > 0
    ? students.find((s) => String(s._id || s.id) === String(currentUser._id ?? currentUser.id))
    : null;

  const getRankDisplay = (rank) => {
    if (rank <= 3) {
      const rankText = rank === 1 ? '1ST' : rank === 2 ? '2ND' : '3RD';
      return (
        <div className="flex flex-col items-center w-10">
          <FaTrophy className="text-yellow-400" size={24} style={{ filter: 'drop-shadow(0 0 2px black)' }} />
          <span className="text-white font-bold text-xs mt-1" style={{ textShadow: '2px 2px 4px rgba(0, 0, 0, 1)' }}>{rankText}</span>
        </div>
      );
    } else {
      const circleColor = rank === 4 ? '#2d5016' : '#FF8C00'; // Dark green for 4th, dark orange for 5th+
      return (
        <div 
          className="w-10 h-10 rounded-full flex items-center justify-center"
          style={{ backgroundColor: circleColor }}
        >
          <span className="text-white font-bold text-lg" style={{ textShadow: '2px 2px 4px rgba(0, 0, 0, 1)' }}>{rank}</span>
        </div>
      );
    }
  };

  return (
    <div className="flex-1 w-full min-w-0 p-4 xs:p-5 sm:p-6 md:p-8 flex items-center justify-center">
      <div className="w-full max-w-4xl">
        {/* Trophy Icon and Title */}
        <div className="flex flex-col items-center mb-4 sm:mb-6">
          <FaTrophy 
            className="text-yellow-400 mb-2 flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12" 
            size={48}
            style={{ filter: 'drop-shadow(0 2px 4px black)' }}
          />
          <div 
            className="px-4 sm:px-6 md:px-8 py-2 rounded-lg relative"
            style={{ 
              backgroundColor: '#8B4513',
              clipPath: 'polygon(0 0, calc(100% - 20px) 0, 100% 50%, calc(100% - 20px) 100%, 0 100%)'
            }}
          >
            <h1 className="text-xl sm:text-2xl font-bold text-white">{t('leaderboard_titleCaps')}</h1>
          </div>
          {!isStudentView && (
            <p className="text-white font-semibold mt-2 text-sm sm:text-base text-center" style={{ textShadow: '2px 2px 4px rgba(0, 0, 0, 1)' }}>{t('leaderboard_rankingsByPoints')}</p>
          )}
        </div>

        {/* Student overall rank - between title and panel */}
        {isStudentView && currentStudent != null && (
          <div className="flex justify-center mb-4">
            <span className="font-bold text-white text-base sm:text-lg text-center" style={{ textShadow: '2px 2px 4px rgba(0, 0, 0, 1)' }}>
              {t('leaderboard_overallRank')}: {currentStudent.overallRank != null ? `#${currentStudent.overallRank}` : '—'}
            </span>
          </div>
        )}

        {/* Leaderboard Panel */}
        <div 
          className="rounded-lg p-4 sm:p-6 shadow-2xl"
          style={{
            backgroundColor: '#F5DEB3',
            border: '3px solid rgba(0, 0, 0, 0.5)'
          }}
        >
          {/* Column Headers - hide on mobile for teacher view, show from md */}
          {!isStudentView && (
          <div className="hidden md:grid md:grid-cols-[1fr_auto_auto] md:gap-4 md:items-center mb-4 pb-2 border-b-2 px-4" style={{ borderColor: '#000000' }}>
            <div className="text-left">
              <span className="font-bold text-white text-sm sm:text-base" style={{ textShadow: '2px 2px 4px rgba(0, 0, 0, 1)' }}>{t('leaderboard_name')}</span>
            </div>
            <div className="text-center w-24">
              <span className="font-bold text-white text-sm sm:text-base" style={{ textShadow: '2px 2px 4px rgba(0, 0, 0, 1)' }}>{t('leaderboard_points')}</span>
            </div>
            <div className="text-center w-20">
              <span className="font-bold text-white text-sm sm:text-base" style={{ textShadow: '2px 2px 4px rgba(0, 0, 0, 1)' }}>{t('leaderboard_rank')}</span>
            </div>
          </div>
          )}

          {/* Leaderboard Entries */}
          <div className="space-y-2 sm:space-y-3 max-h-[70vh] sm:max-h-96 overflow-y-auto">
            {loading ? (
              <div className="text-center py-8">
                <span className="font-bold text-white" style={{ textShadow: '2px 2px 4px rgba(0, 0, 0, 1)' }}>{t('leaderboard_loading')}</span>
              </div>
            ) : error ? (
              <div className="text-center py-8">
                <span className="font-bold text-red-300" style={{ textShadow: '2px 2px 4px rgba(0, 0, 0, 1)' }}>{error}</span>
              </div>
            ) : students.length === 0 ? (
              <div className="text-center py-8">
                <span className="font-bold text-white" style={{ textShadow: '2px 2px 4px rgba(0, 0, 0, 1)' }}>{t('leaderboard_noStudents')}</span>
              </div>
            ) : isStudentView ? (
              /* Student view: only show current student's points (no rank) */
              currentStudent == null ? (
                <div className="text-center py-8">
                  <span className="font-bold text-white" style={{ textShadow: '2px 2px 4px rgba(0, 0, 0, 1)' }}>{t('leaderboard_notOnBoard')}</span>
                </div>
              ) : (() => {
                const studentName = currentStudent.firstName && currentStudent.lastName
                  ? `${currentStudent.firstName} ${currentStudent.lastName}`
                  : currentStudent.firstName || currentStudent.lastName || 'Unknown';
                const avatarSrc = getAvatarSrc(currentStudent.profilePicture, currentStudent.gender);
                const points = currentStudent.totalPoints ?? 0;
                const lastGamePoints = currentStudent.lastGamePoints ?? 0;
                return (
                  <div
                    className="flex items-center justify-between p-3 sm:p-4 rounded-lg"
                    style={{ backgroundColor: bgColors[0] }}
                  >
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                      <div 
                        className="w-10 h-10 sm:w-12 sm:h-12 rounded-full overflow-hidden border-2 border-gray-600 flex-shrink-0"
                        style={{ backgroundColor: getAvatarBgColor(currentStudent.profilePicture || getDefaultAvatarByGender(currentStudent.gender)) }}
                      >
                        <img
                          src={avatarSrc}
                          alt={studentName}
                          className="w-full h-full object-cover"
                          onError={(e) => { e.target.src = getAvatarSrc(getDefaultAvatarByGender(currentStudent.gender), currentStudent.gender); }}
                        />
                      </div>
                      <span className="font-bold text-white text-sm sm:text-base truncate" style={{ textShadow: '2px 2px 4px rgba(0, 0, 0, 1)' }}>{studentName}</span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="font-bold text-white text-sm sm:text-base" style={{ textShadow: '2px 2px 4px rgba(0, 0, 0, 1)' }}>
                        {points}
                        {showLastGamePoints && lastGamePoints != null && lastGamePoints !== 0 && (
                          <span className="ml-1 text-xs sm:text-sm" style={{ color: '#dcfce7', textShadow: '2px 2px 4px rgba(0, 0, 0, 1)' }}>
                            (+{lastGamePoints})
                          </span>
                        )}
                      </span>
                      <FaStar className="text-yellow-400" size={16} />
                    </div>
                  </div>
                );
              })()
            ) : (
              students.map((student, index) => {
                const rank = index + 1;
                const studentName = student.firstName && student.lastName 
                  ? `${student.firstName} ${student.lastName}`
                  : student.firstName || student.lastName || 'Unknown';
                const avatarSrc = getAvatarSrc(student.profilePicture, student.gender);
                const bgColor = bgColors[index % bgColors.length];
                const points = student.totalPoints ?? 0;
                const lastGamePoints = student.lastGamePoints ?? 0;

                return (
                  <div
                    key={student.id || student._id || index}
                    className="flex flex-col md:grid md:grid-cols-[1fr_auto_auto] md:gap-4 md:items-center md:px-4 p-3 sm:p-4 rounded-lg"
                    style={{ backgroundColor: bgColor }}
                  >
                    {/* NAME column: avatar + name, left-aligned */}
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0 md:justify-start order-1">
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
                      {/* Mobile: points inline */}
                      <div className="flex items-center gap-2 flex-shrink-0 md:hidden ml-auto">
                        <span className="font-bold text-white text-sm" style={{ textShadow: '2px 2px 4px rgba(0, 0, 0, 1)' }}>
                          {points}
                          {showLastGamePoints && lastGamePoints != null && lastGamePoints !== 0 ? (
                            <span className="ml-1 text-xs" style={{ color: '#dcfce7', textShadow: '2px 2px 4px rgba(0, 0, 0, 1)' }}>
                              (+{lastGamePoints})
                            </span>
                          ) : null}
                        </span>
                        <FaStar className="text-yellow-400" size={14} />
                      </div>
                    </div>

                    {/* POINTS column - desktop only (order-2 so grid column 2 matches header) */}
                    <div className="hidden md:flex w-24 justify-center items-center gap-2 md:order-2">
                      <span className="font-bold text-white text-sm sm:text-base" style={{ textShadow: '2px 2px 4px rgba(0, 0, 0, 1)' }}>
                        {points}
                        {showLastGamePoints && lastGamePoints != null && lastGamePoints !== 0 && (
                          <span className="ml-1 text-xs sm:text-sm" style={{ color: '#dcfce7', textShadow: '2px 2px 4px rgba(0, 0, 0, 1)' }}>
                            (+{lastGamePoints})
                          </span>
                        )}
                      </span>
                      <FaStar className="text-yellow-400" size={16} />
                    </div>

                    {/* RANK column (order-2 mobile, order-3 desktop so grid column 3 matches header) */}
                    <div className="flex justify-start md:justify-center md:w-20 md:items-center order-2 md:order-3">
                      {getRankDisplay(rank)}
                    </div>
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

export default Leaderboard;

