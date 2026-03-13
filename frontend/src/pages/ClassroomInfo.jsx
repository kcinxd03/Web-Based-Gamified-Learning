import React from 'react';
import { FaChalkboardTeacher, FaBook, FaGraduationCap, FaDesktop, FaCode } from 'react-icons/fa';
import { useLanguage } from '../context/LanguageContext';

const ClassroomInfo = ({ classData, currentUser }) => {
  const { t } = useLanguage();
  // Teacher display: prefer classData.teacherName, else build from classData.teacher (object), else use current user name if they are the class teacher
  const teacherId = classData?.teacher != null
    ? (typeof classData.teacher === 'object' && classData.teacher !== null ? (classData.teacher._id ?? classData.teacher.id) : classData.teacher)
    : null;
  const teacherObj = classData?.teacher && typeof classData.teacher === 'object' && classData.teacher !== null ? classData.teacher : null;
  const isCurrentUserTheTeacher = currentUser && teacherId && String(teacherId) === String(currentUser._id ?? currentUser.id);
  const teacherDisplayName = classData
    ? (classData.teacherName && String(classData.teacherName).trim() !== '')
      ? String(classData.teacherName).trim()
      : (teacherObj && `${teacherObj.firstName || ''} ${teacherObj.lastName || ''}`.trim())
      || (isCurrentUserTheTeacher ? `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() : null)
      || 'N/A'
    : 'N/A';

  const classroomInfo = classData ? {
    teacher: teacherDisplayName || 'N/A',
    subject: classData.subject || 'N/A',
    gradeLevel: classData.gradeLevel ? t('signup_grade', { n: classData.gradeLevel }) : 'N/A',
    section: classData.section || 'N/A',
    classCode: (classData.classCode || 'N/A').toString()
  } : {
    teacher: 'N/A',
    subject: 'N/A',
    gradeLevel: 'N/A',
    section: 'N/A',
    classCode: 'N/A'
  };

  const infoCards = [
    {
      label: t('common_teacher'),
      value: classroomInfo.teacher,
      icon: FaChalkboardTeacher,
      bgColor: '#90EE90' // Light green
    },
    {
      label: t('common_subject'),
      value: classroomInfo.subject,
      icon: FaBook,
      bgColor: '#D2B48C' // Light brown
    },
    {
      label: t('common_gradeLevel'),
      value: classroomInfo.gradeLevel,
      icon: FaGraduationCap,
      bgColor: '#8B4513' // Dark brown
    },
    {
      label: t('common_section'),
      value: classroomInfo.section,
      icon: FaDesktop,
      bgColor: '#9CAF88' // Gray-green
    },
    {
      label: t('common_classCode'),
      value: classroomInfo.classCode,
      icon: FaCode,
      bgColor: '#A0A0A0', // Gray
      isCode: true
    }
  ];

  return (
    <div 
      className="min-h-screen bg-cover bg-center bg-no-repeat flex items-start justify-center p-4"
      style={{
        backgroundImage: `url('/images/bg.jpg')`
      }}
    >
      <div className="w-full max-w-2xl mt-8">
        {/* Title */}
        <div className="flex flex-col items-center mb-4">
          <div 
            className="px-6 py-1.5 rounded-lg relative"
            style={{ 
              backgroundColor: '#8B4513',
              clipPath: 'polygon(0 0, calc(100% - 20px) 0, 100% 50%, calc(100% - 20px) 100%, 0 100%)',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4), 0 2px 4px rgba(0, 0, 0, 0.3)'
            }}
          >
            <h1 className="text-xl font-bold text-white">{t('classroom_classroom')}</h1>
          </div>
        </div>

        {/* Classroom Info Panel */}
        <div 
          className="rounded-lg p-4"
          style={{
            backgroundColor: '#F5DEB3',
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3), 0 4px 12px rgba(0, 0, 0, 0.2)',
            minHeight: 'calc(100vh - 120px)',
            maxHeight: 'calc(100vh - 120px)',
            overflowY: 'auto'
          }}
        >
          {/* Info Cards Grid */}
          <div className="grid grid-cols-1 gap-3">
            {infoCards.map((card, index) => (
              <div
                key={index}
                className="rounded-lg p-4 flex flex-col items-center justify-center"
                style={{ 
                  backgroundColor: card.bgColor,
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2), 0 2px 4px rgba(0, 0, 0, 0.15)'
                }}
              >
                {/* Icon */}
                <div className="mb-2 flex justify-center">
                  <card.icon 
                    className="text-gray-800" 
                    size={32}
                    style={{ filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3))' }}
                  />
                </div>

                {/* Label */}
                <div className="mb-1 flex justify-center">
                  <span 
                    className="font-bold uppercase"
                    style={{ 
                      color: '#fff', 
                      fontSize: '1rem',
                      textShadow: '2px 2px 4px rgba(0, 0, 0, 0.5), 1px 1px 2px rgba(0, 0, 0, 0.4)'
                    }}
                  >
                    {card.label}
                  </span>
                </div>

                {/* Value */}
                <div className="flex justify-center">
                  {card.isCode ? (
                    <div className="flex items-center gap-2">
                      <span 
                        className="font-bold"
                        style={{ 
                          color: '#fff', 
                          fontSize: '1.25rem',
                          textShadow: '2px 2px 4px rgba(0, 0, 0, 0.5), 1px 1px 2px rgba(0, 0, 0, 0.4)'
                        }}
                      >
                        {card.value}
                      </span>
                    </div>
                  ) : (
                    <span 
                      className="font-bold uppercase"
                      style={{ 
                        color: '#fff', 
                        fontSize: '1.25rem',
                        textShadow: '2px 2px 4px rgba(0, 0, 0, 0.5), 1px 1px 2px rgba(0, 0, 0, 0.4)'
                      }}
                    >
                      {card.value}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClassroomInfo;

