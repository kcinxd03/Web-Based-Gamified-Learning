import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  FaArrowLeft, 
  FaBars,
  FaTrash,
  FaPlus,
  FaDesktop,
  FaGamepad,
  FaClipboardList,
  FaTrophy,
  FaUsers,
  FaUser,
  FaSignOutAlt,
  FaTimes
} from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { getDefaultAvatarByGender, getAvatarBgColor, getAvatarSrc } from '../utils/avatar';
import { quizAPI, gameSessionAPI, classAPI } from '../services/api';

const CQ_WHITE = '#FFFFFF';
const CQ_PRIMARY = '#789153';
const CQ_SECONDARY = '#8B7745';
const CQ_BORDER = '#8B7745';
const CQ_TEXT = '#8B7745';
const CQ_SHADOW = '0 10px 30px rgba(0, 0, 0, 0.22)';

const CreateQuiz = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { t } = useLanguage();
  const [classData, setClassData] = useState(null);
  const [activeNav] = useState('create-quiz');
  const [loading, setLoading] = useState(false);
  const [loadingEdit, setLoadingEdit] = useState(false);
  const [error, setError] = useState(null);
  const [editingQuizId, setEditingQuizId] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Get class data and edit quiz id from navigation state
  useEffect(() => {
    if (location.state?.classData) {
      setClassData(location.state.classData);
    }
    const quizFromState = location.state?.quiz;
    const editId = location.state?.editQuizId ?? quizFromState?.id ?? quizFromState?._id;
    if (editId) {
      setEditingQuizId(editId);
    }
  }, [location.state]);

  // Load quiz when editing
  useEffect(() => {
    if (!editingQuizId) return;
    setLoadingEdit(true);
    quizAPI.getQuizById(editingQuizId)
      .then((res) => {
        const q = res.quiz ?? res;
        if (!q) return;
        const prevDifficulty = (q.difficulty && typeof q.difficulty === 'string') ? q.difficulty.trim().toLowerCase() : '';
        setQuizData({
          title: q.title ?? '',
          description: q.description ?? '',
          category: q.category ?? '',
          difficulty: prevDifficulty === 'easy' || prevDifficulty === 'medium' || prevDifficulty === 'hard' ? prevDifficulty : (q.difficulty ?? ''),
          timeLimit: q.timeLimit != null ? String(Math.round(Number(q.timeLimit) / 60)) : '',
          gameMode: q.gameMode === 'SINGLE' ? 'SINGLE' : 'MULTIPLAYER'
        });
        const rawQuestions = Array.isArray(q.questions) ? q.questions : [];
        const mapped = rawQuestions.map((qu, idx) => {
          const baseId = qu._id?.toString?.() ?? qu.id ?? Date.now() + idx;
          const answers = Array.isArray(qu.answers) ? qu.answers : [];
          return {
            id: baseId,
            questionText: qu.questionText ?? '',
            questionType: qu.questionType ?? 'qanda',
            answers: qu.questionType === 'qanda'
              ? (() => {
                  const list = answers.map((a, aIdx) => ({
                    id: a._id ?? Date.now() + idx * 10 + aIdx,
                    text: a.text ?? '',
                    isCorrect: !!a.isCorrect
                  }));
                  while (list.length < 4) {
                    list.push({ id: Date.now() + idx * 10 + list.length, text: '', isCorrect: false });
                  }
                  return list;
                })()
              : [],
            correctAnswer: qu.correctAnswer ?? '',
            correctAnswerBool: qu.correctAnswerBool ?? null
          };
        });
        setQuestions(mapped.length > 0 ? mapped : [{
          id: Date.now(),
          questionText: '',
          questionType: 'qanda',
          answers: [
            { id: Date.now() + 1, text: '', isCorrect: false },
            { id: Date.now() + 2, text: '', isCorrect: false },
            { id: Date.now() + 3, text: '', isCorrect: false },
            { id: Date.now() + 4, text: '', isCorrect: false }
          ],
          correctAnswer: '',
          correctAnswerBool: null
        }]);
      })
      .catch((err) => {
        setError(err.response?.data?.message || 'Failed to load quiz.');
      })
      .finally(() => setLoadingEdit(false));
  }, [editingQuizId]);

  const [quizData, setQuizData] = useState({
    title: '',
    description: '',
    category: '',
    difficulty: '',
    timeLimit: '', // Time limit in minutes
    gameMode: 'MULTIPLAYER' // 'SINGLE' | 'MULTIPLAYER'
  });
  const [latestQuestionType, setLatestQuestionType] = useState('qanda');

  const [questions, setQuestions] = useState([
    {
      id: Date.now(),
      questionText: '',
      questionType: 'qanda',
      answers: [
        { id: Date.now() + 1, text: '', isCorrect: false },
        { id: Date.now() + 2, text: '', isCorrect: false },
        { id: Date.now() + 3, text: '', isCorrect: false },
        { id: Date.now() + 4, text: '', isCorrect: false }
      ],
      correctAnswer: '', // For fill in the blank
      correctAnswerBool: null // For true/false
    }
  ]);

  const handleBack = () => {
    if (classData) {
      navigate('/classroom', { state: { classData } });
    } else {
      navigate('/my-class');
    }
  };

  const handleNavClick = (navItem) => {
    if (navItem === 'classroom') {
      navigate('/classroom', { state: { classData, activeNav: 'classroom' } });
    } else if (navItem === 'create-quiz') {
      // Already on create-quiz page
      return;
    } else if (navItem === 'game') {
      // Navigate to classroom with game view active
      navigate('/classroom', { state: { classData, activeNav: 'game' } });
    } else if (navItem === 'leaderboards') {
      navigate('/classroom', { state: { classData, activeNav: 'leaderboards' } });
    } else if (navItem === 'my-quizzes') {
      navigate('/classroom', { state: { classData, activeNav: 'my-quizzes' } });
    } else if (navItem === 'students' || navItem === 'classmates') {
      navigate('/classroom', { state: { classData, activeNav: navItem === 'students' ? 'students' : 'classmates' } });
    }
  };

  const handleLeaveClassroom = async () => {
    const classId = classData?.id ?? classData?._id;
    if (!classData || !classId) {
      navigate('/my-class');
      return;
    }
    if (user?.accountType !== 'STUDENT') {
      navigate('/my-class');
      return;
    }
    const confirmMessage = 'Leave this classroom? All your progress in this class (scores, leaderboard) will be removed. This cannot be undone.';
    if (!window.confirm(confirmMessage)) return;
    try {
      await classAPI.leaveClass(classId);
      alert('You have left the class. Your progress in this classroom has been removed.');
      navigate('/my-class');
    } catch (err) {
      console.error('Error leaving classroom:', err);
      alert(err.response?.data?.message || 'Failed to leave classroom. Please try again.');
    }
  };

  const handleDeleteClassroom = () => {
    // TODO: Implement delete classroom logic
    console.log('Delete classroom');
    navigate('/my-class');
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setQuizData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const createEmptyQuestion = (questionType = 'qanda') => {
    const timestamp = Date.now();
    return {
      id: timestamp,
      questionText: '',
      questionType,
      answers: questionType === 'qanda' ? [
        { id: timestamp + 1, text: '', isCorrect: false },
        { id: timestamp + 2, text: '', isCorrect: false },
        { id: timestamp + 3, text: '', isCorrect: false },
        { id: timestamp + 4, text: '', isCorrect: false }
      ] : [],
      correctAnswer: '',
      correctAnswerBool: null
    };
  };

  const addQuestion = () => {
    setQuestions(prev => {
      const inheritedType = latestQuestionType || prev[prev.length - 1]?.questionType || 'qanda';
      return [...prev, createEmptyQuestion(inheritedType)];
    });
  };

  const removeQuestion = (questionId) => {
    setQuestions(prev => prev.filter(q => q.id !== questionId));
  };

  const handleQuestionChange = (questionId, field, value) => {
    setQuestions(prev => prev.map(q => 
      q.id === questionId ? { ...q, [field]: value } : q
    ));
  };

  const handleQuestionTypeChange = (questionId, newType) => {
    setLatestQuestionType(newType);
    setQuestions(prev => prev.map(q => {
      if (q.id === questionId) {
        if (newType === 'qanda') {
          const timestamp = Date.now();
          return {
            ...q,
            questionType: newType,
            answers: q.answers.length >= 4 ? q.answers.slice(0, 4) : [
              { id: timestamp + 1, text: '', isCorrect: false },
              { id: timestamp + 2, text: '', isCorrect: false },
              { id: timestamp + 3, text: '', isCorrect: false },
              { id: timestamp + 4, text: '', isCorrect: false }
            ],
            correctAnswer: '',
            correctAnswerBool: null
          };
        } else if (newType === 'truefalse') {
          return {
            ...q,
            questionType: newType,
            answers: [],
            correctAnswer: '',
            correctAnswerBool: null
          };
        } else if (newType === 'fillblank') {
          return {
            ...q,
            questionType: newType,
            answers: [],
            correctAnswer: '',
            correctAnswerBool: null
          };
        }
      }
      return q;
    }));
  };

  const addAnswerOption = (questionId) => {
    setQuestions(prev => prev.map(q => 
      q.id === questionId 
        ? { ...q, answers: [...q.answers, { id: Date.now(), text: '', isCorrect: false }] }
        : q
    ));
  };

  const removeAnswerOption = (questionId, answerId) => {
    setQuestions(prev => prev.map(q => {
      if (q.id === questionId) {
        // Don't allow removing if there are only 4 options (minimum for multiple choice)
        if (q.answers.length <= 4) {
          return q;
        }
        return { ...q, answers: q.answers.filter(a => a.id !== answerId) };
      }
      return q;
    }));
  };

  const handleAnswerChange = (questionId, answerId, field, value) => {
    setQuestions(prev => prev.map(q => {
      if (q.id === questionId) {
        const updatedAnswers = q.answers.map(a => {
          if (a.id === answerId) {
            if (field === 'isCorrect') {
              // For Q&A type, only one answer can be correct
              return { ...a, isCorrect: value };
            }
            return { ...a, [field]: value };
          }
          // If marking another answer as correct, unmark this one
          if (field === 'isCorrect' && value === true) {
            return { ...a, isCorrect: false };
          }
          return a;
        });
        return { ...q, answers: updatedAnswers };
      }
      return q;
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    // Validate quiz title
    if (!quizData.title.trim()) {
      setError('Quiz title is required');
      return;
    }

    // Validate questions
    const validQuestions = questions.every(q => {
      if (!q.questionText.trim()) return false;
      if (q.questionType === 'qanda') {
        if (q.answers.length < 4) return false;
        if (!q.answers.some(a => a.isCorrect)) return false;
        return q.answers.every(a => a.text.trim());
      } else if (q.questionType === 'truefalse') {
        return q.correctAnswerBool !== null;
      } else if (q.questionType === 'fillblank') {
        return q.correctAnswer.trim();
      }
      return false;
    });

    if (!validQuestions) {
      setError('Please fill in all questions. For multiple choice questions, provide at least 4 options and mark one correct answer.');
      return;
    }

    if (!editingQuizId && (!classData || !classData.id)) {
      setError('Class data is missing. Please go back and try again.');
      return;
    }

    setLoading(true);

    const questionPayload = questions.map(q => ({
      questionText: q.questionText.trim(),
      questionType: q.questionType,
      answers: q.questionType === 'qanda' ? q.answers.map(a => ({
        text: a.text.trim(),
        isCorrect: a.isCorrect
      })) : [],
      correctAnswer: q.questionType === 'fillblank' ? q.correctAnswer.trim() : '',
      correctAnswerBool: q.questionType === 'truefalse' ? q.correctAnswerBool : null
    }));

    try {
      if (editingQuizId) {
        const updatePayload = {
          title: quizData.title.trim(),
          description: quizData.description?.trim() || '',
          category: quizData.category?.trim() || '',
          difficulty: quizData.difficulty || '',
          timeLimit: quizData.timeLimit ? parseInt(quizData.timeLimit) * 60 : null,
          gameMode: quizData.gameMode === 'SINGLE' ? 'SINGLE' : 'MULTIPLAYER',
          questions: questionPayload
        };
        const result = await quizAPI.updateQuiz(editingQuizId, updatePayload);
        if (result.quiz) {
          navigate(classData ? '/classroom' : '/my-class', {
            state: { classData, activeNav: 'game' }
          });
        } else {
          setError('Failed to update quiz. Please try again.');
        }
        return;
      }

      const quizPayload = {
        title: quizData.title.trim(),
        description: quizData.description?.trim() || '',
        category: quizData.category?.trim() || '',
        difficulty: quizData.difficulty || '',
        timeLimit: quizData.timeLimit ? parseInt(quizData.timeLimit) * 60 : null,
        gameMode: quizData.gameMode === 'SINGLE' ? 'SINGLE' : 'MULTIPLAYER',
        classId: classData.id,
        questions: questionPayload
      };

      const result = await quizAPI.createQuiz(quizPayload);

      if (result.quiz) {
        try {
          const gameSessionResult = await gameSessionAPI.createGameSession({
            quizId: result.quiz.id,
            classId: classData.id
          });

          if (gameSessionResult.gameSession) {
            navigate('/map-selection', {
              state: {
                quiz: result.quiz,
                classData: classData,
                gameSession: gameSessionResult.gameSession,
                singlePlayer: result.quiz?.gameMode === 'SINGLE'
              }
            });
          } else {
            console.warn('Game session creation failed, but quiz was created');
            navigate('/map-selection', {
              state: {
                quiz: result.quiz,
                classData: classData,
                singlePlayer: result.quiz?.gameMode === 'SINGLE'
              }
            });
          }
        } catch (gameSessionError) {
          console.error('Error creating game session:', gameSessionError);
          navigate('/map-selection', {
            state: {
              quiz: result.quiz,
              classData: classData,
              singlePlayer: result.quiz?.gameMode === 'SINGLE'
            }
          });
        }
      } else {
        setError('Failed to create quiz. Please try again.');
      }
    } catch (err) {
      console.error(editingQuizId ? 'Quiz update error:' : 'Quiz creation error:', err);
      setError(err.response?.data?.message || (editingQuizId ? 'Failed to update quiz.' : 'Failed to create quiz.') + ' Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="min-h-screen flex font-sans box-border m-0 p-0 overflow-x-hidden"
      style={{
        backgroundImage: `url('/images/bg.jpg')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: 'fixed'
      }}
    >
      {/* Mobile top bar */}
      <div
        className="fixed top-0 left-0 right-0 h-14 z-20 flex items-center gap-3 px-4 lg:hidden"
        style={{ backgroundColor: '#2d5016' }}
      >
        <button
          type="button"
          onClick={() => setSidebarOpen(true)}
          className="p-2 -ml-2 text-white hover:opacity-80 transition-opacity touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center"
          aria-label="Open menu"
        >
          <FaBars size={22} />
        </button>
        <span className="text-white font-bold text-lg truncate flex-1">{editingQuizId ? t('createQuiz_editTitle') : t('createQuiz_title')}</span>
      </div>

      {sidebarOpen && (
        <button
          type="button"
          aria-label="Close menu"
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 bg-black/50 z-[11] lg:hidden"
        />
      )}

      {/* Left Sidebar - drawer on mobile, fixed on lg+ */}
      <div
        className={`fixed left-0 top-0 w-[280px] xs:w-64 h-screen p-4 sm:p-5 md:p-6 flex flex-col z-[12] transform transition-transform duration-200 ease-out lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ backgroundColor: '#2d5016' }}
      >
        <div className="flex items-center gap-2 mb-4 sm:mb-6 flex-shrink-0">
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-2 text-white hover:opacity-80 transition-opacity touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="Close menu"
          >
            <FaTimes size={20} />
          </button>
          <button
            onClick={() => { handleBack(); setSidebarOpen(false); }}
            className="flex-1 lg:flex-initial px-4 py-2.5 flex items-center justify-start gap-2 hover:opacity-80 transition-opacity touch-manipulation min-h-[44px]"
          >
            <FaArrowLeft className="text-white flex-shrink-0" size={16} />
            <span className="text-white font-bold text-sm sm:text-base">{t('common_back')}</span>
          </button>
        </div>

        <div className="flex justify-center mb-3 sm:mb-4">
          <div
            className="w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center shadow-lg overflow-hidden flex-shrink-0"
            style={{ backgroundColor: getAvatarBgColor(user?.profilePicture || getDefaultAvatarByGender(user?.gender)) }}
          >
            <img
              src={getAvatarSrc(user?.profilePicture || getDefaultAvatarByGender(user?.gender), user?.gender)}
              alt="Profile"
              className="w-full h-full object-cover"
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'flex';
              }}
            />
            <div className="hidden w-full h-full flex items-center justify-center">
              <FaUser className="text-gray-400" size={32} />
            </div>
          </div>
        </div>

        <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-white text-center mb-1 truncate px-1">{user?.firstName}</h2>
        <p className="text-xs sm:text-sm font-semibold text-center mb-4 sm:mb-6 md:mb-8" style={{ color: '#FFD700' }}>{user?.accountType === 'TEACHER' ? t('common_teacher') : t('common_student')}</p>

        <nav className="flex-1 space-y-1 sm:space-y-2 overflow-y-auto min-h-0">
          {user?.accountType === 'TEACHER' ? (
            <>
              <button onClick={() => { handleNavClick('classroom'); setSidebarOpen(false); }} className={`w-full flex items-center gap-2 sm:gap-3 px-3 py-2.5 sm:px-4 sm:py-3 rounded-lg transition-colors touch-manipulation min-h-[44px] ${activeNav === 'classroom' ? 'bg-green-600' : 'hover:bg-green-700'}`}>
                <FaDesktop className="text-white flex-shrink-0" size={18} />
                <span className={`text-white font-bold text-sm sm:text-base text-left ${activeNav === 'classroom' ? 'underline' : ''}`} style={{ textShadow: '1px 1px 2px rgba(0, 0, 0, 0.5)' }}>{t('classroom_classroom')}</span>
              </button>
              <button onClick={() => { handleNavClick('game'); setSidebarOpen(false); }} className={`w-full flex items-center gap-2 sm:gap-3 px-3 py-2.5 sm:px-4 sm:py-3 rounded-lg transition-colors touch-manipulation min-h-[44px] ${activeNav === 'game' ? 'bg-green-600' : 'hover:bg-green-700'}`}>
                <FaGamepad className="text-white flex-shrink-0" size={18} />
                <span className="text-white font-bold text-sm sm:text-base text-left" style={{ textShadow: '1px 1px 2px rgba(0, 0, 0, 0.5)' }}>{t('classroom_game')}</span>
              </button>
              <button onClick={() => { handleNavClick('students'); setSidebarOpen(false); }} className={`w-full flex items-center gap-2 sm:gap-3 px-3 py-2.5 sm:px-4 sm:py-3 rounded-lg transition-colors touch-manipulation min-h-[44px] ${activeNav === 'students' ? 'bg-green-600' : 'hover:bg-green-700'}`}>
                <FaUsers className="text-white flex-shrink-0" size={18} />
                <span className="text-white font-bold text-sm sm:text-base text-left" style={{ textShadow: '1px 1px 2px rgba(0, 0, 0, 0.5)' }}>{t('classroom_students')}</span>
              </button>
              <button onClick={() => { handleNavClick('leaderboards'); setSidebarOpen(false); }} className={`w-full flex items-center gap-2 sm:gap-3 px-3 py-2.5 sm:px-4 sm:py-3 rounded-lg transition-colors touch-manipulation min-h-[44px] ${activeNav === 'leaderboards' ? 'bg-green-600' : 'hover:bg-green-700'}`}>
                <FaTrophy className="text-white flex-shrink-0" size={18} />
                <span className="text-white font-bold text-sm sm:text-base text-left" style={{ textShadow: '1px 1px 2px rgba(0, 0, 0, 0.5)' }}>{t('classroom_leaderboards')}</span>
              </button>
              <button onClick={() => setSidebarOpen(false)} className={`w-full flex items-center gap-2 sm:gap-3 px-3 py-2.5 sm:px-4 sm:py-3 rounded-lg transition-colors touch-manipulation min-h-[44px] ${activeNav === 'create-quiz' ? 'bg-green-600' : 'hover:bg-green-700'}`}>
                <FaGamepad className="text-white flex-shrink-0" size={18} />
                <span className={`text-white font-bold text-sm sm:text-base text-left ${activeNav === 'create-quiz' ? 'underline' : ''}`} style={{ textShadow: '1px 1px 2px rgba(0, 0, 0, 0.5)' }}>{t('classroom_createQuiz')}</span>
              </button>
              <button onClick={() => { handleNavClick('my-quizzes'); setSidebarOpen(false); }} className={`w-full flex items-center gap-2 sm:gap-3 px-3 py-2.5 sm:px-4 sm:py-3 rounded-lg transition-colors touch-manipulation min-h-[44px] ${activeNav === 'my-quizzes' ? 'bg-green-600' : 'hover:bg-green-700'}`}>
                <FaClipboardList className="text-white flex-shrink-0" size={18} />
                <span className={`text-white font-bold text-sm sm:text-base text-left ${activeNav === 'my-quizzes' ? 'underline' : ''}`} style={{ textShadow: '1px 1px 2px rgba(0, 0, 0, 0.5)' }}>{t('classroom_myQuizzes')}</span>
              </button>
              <button onClick={handleDeleteClassroom} className="w-full flex items-center gap-2 sm:gap-3 px-3 py-2.5 sm:px-4 sm:py-3 rounded-lg transition-colors hover:bg-red-700 mt-2 sm:mt-4 justify-start touch-manipulation min-h-[44px]">
                <FaTrash className="text-red-500 flex-shrink-0" size={18} />
                <span className="text-red-500 font-bold text-sm sm:text-base text-left" style={{ textShadow: '1px 1px 2px rgba(0, 0, 0, 0.5)' }}>{t('classroom_deleteClassroom')}</span>
              </button>
            </>
          ) : (
            <>
              <button onClick={() => { handleNavClick('classroom'); setSidebarOpen(false); }} className={`w-full flex items-center gap-2 sm:gap-3 px-3 py-2.5 sm:px-4 sm:py-3 rounded-lg transition-colors touch-manipulation min-h-[44px] ${activeNav === 'classroom' ? 'bg-green-600' : 'hover:bg-green-700'}`}>
                <FaDesktop className="text-white flex-shrink-0" size={18} />
                <span className="text-white font-bold text-sm sm:text-base text-left">{t('classroom_classroom')}</span>
              </button>
              <button onClick={() => { handleNavClick('game'); setSidebarOpen(false); }} className={`w-full flex items-center gap-2 sm:gap-3 px-3 py-2.5 sm:px-4 sm:py-3 rounded-lg transition-colors touch-manipulation min-h-[44px] ${activeNav === 'game' ? 'bg-green-600' : 'hover:bg-green-700'}`}>
                <FaGamepad className="text-white flex-shrink-0" size={18} />
                <span className="text-white font-bold text-sm sm:text-base text-left">{t('classroom_game')}</span>
              </button>
              <button onClick={() => { handleNavClick('leaderboards'); setSidebarOpen(false); }} className={`w-full flex items-center gap-2 sm:gap-3 px-3 py-2.5 sm:px-4 sm:py-3 rounded-lg transition-colors touch-manipulation min-h-[44px] ${activeNav === 'leaderboards' ? 'bg-green-600' : 'hover:bg-green-700'}`}>
                <FaTrophy className="text-white flex-shrink-0" size={18} />
                <span className="text-white font-bold text-sm sm:text-base text-left">{t('classroom_leaderboards')}</span>
              </button>
              <button onClick={() => { handleNavClick('classmates'); setSidebarOpen(false); }} className={`w-full flex items-center gap-2 sm:gap-3 px-3 py-2.5 sm:px-4 sm:py-3 rounded-lg transition-colors touch-manipulation min-h-[44px] ${activeNav === 'classmates' ? 'bg-green-600' : 'hover:bg-green-700'}`}>
                <FaUsers className="text-white flex-shrink-0" size={18} />
                <span className="text-white font-bold text-sm sm:text-base text-left">{t('classroom_classmates')}</span>
              </button>
              <button onClick={handleLeaveClassroom} className="w-full flex items-center gap-2 sm:gap-3 px-3 py-2.5 sm:px-4 sm:py-3 rounded-lg transition-colors hover:bg-red-600 mt-2 sm:mt-4 justify-start touch-manipulation min-h-[44px]">
                <FaSignOutAlt className="text-white flex-shrink-0" size={18} />
                <span className="text-white font-bold text-sm sm:text-base text-left">{t('classroom_leaveClassroom')}</span>
              </button>
            </>
          )}
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex justify-center items-start w-full min-h-screen overflow-y-auto pt-14 lg:pt-4 pb-6 sm:pb-10 px-3 xs:px-4 sm:px-4 lg:ml-64">
        <div className="create-quiz-container w-full max-w-[600px] mb-6 sm:mb-10 mx-auto p-4 xs:p-5 sm:p-6 md:p-8 lg:p-10 rounded-2xl sm:rounded-[20px] font-sans box-border relative border-2" style={{ backgroundColor: CQ_PRIMARY, borderColor: CQ_WHITE, boxShadow: CQ_SHADOW }}>
          <h2 className="text-center text-xl sm:text-[1.5rem] md:text-[1.8rem] mb-4 sm:mb-6 font-bold" style={{ color: CQ_WHITE }}>
            {editingQuizId ? t('createQuiz_editTitle') : t('createQuiz_title')}
          </h2>
          {loadingEdit && (
            <p className="text-center mb-4" style={{ color: CQ_WHITE }}>{t('createQuiz_loadingQuiz')}</p>
          )}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4 sm:gap-5">
            {/* Quiz Title */}
            <div>
              <label htmlFor="title" className="font-semibold mb-1.5 block text-sm sm:text-base" style={{ color: CQ_WHITE }}>
                {t('createQuiz_quizTitle')}
              </label>
              <input
                type="text"
                id="title"
                name="title"
                value={quizData.title}
                onChange={handleInputChange}
                className="w-full px-3 sm:px-3.5 py-2.5 sm:py-3 rounded-lg sm:rounded-[10px] border text-sm sm:text-base transition-all duration-200 focus:outline-none box-border min-h-[44px]"
                style={{ borderColor: CQ_BORDER, color: CQ_TEXT, backgroundColor: CQ_WHITE, boxShadow: 'none' }}
                placeholder={t('createQuiz_enterQuizTitle')}
                required
              />
            </div>

            {/* Description */}
            <div>
              <label htmlFor="description" className="font-semibold mb-1.5 block text-sm sm:text-base" style={{ color: CQ_WHITE }}>
                {t('createQuiz_description')}
              </label>
              <textarea
                id="description"
                name="description"
                value={quizData.description}
                onChange={handleInputChange}
                className="w-full px-3 sm:px-3.5 py-2.5 sm:py-3 rounded-lg sm:rounded-[10px] border text-sm sm:text-base transition-all duration-200 focus:outline-none resize-none min-h-[80px] sm:min-h-[100px] box-border"
                style={{ borderColor: CQ_BORDER, color: CQ_TEXT, backgroundColor: CQ_WHITE, boxShadow: 'none' }}
                placeholder={t('createQuiz_enterDescription')}
                required
              />
            </div>

            {/* Difficulty */}
            <div>
              <label htmlFor="difficulty" className="font-semibold mb-1.5 block text-sm sm:text-base" style={{ color: CQ_WHITE }}>
                {t('createQuiz_difficulty')}
              </label>
              <select
                id="difficulty"
                name="difficulty"
                value={quizData.difficulty}
                onChange={handleInputChange}
                className="w-full px-3 sm:px-3.5 py-2.5 sm:py-3 rounded-lg sm:rounded-[10px] border text-sm sm:text-base transition-all duration-200 focus:outline-none box-border min-h-[44px]"
                style={{ borderColor: CQ_BORDER, color: CQ_TEXT, backgroundColor: CQ_WHITE, boxShadow: 'none' }}
                required
              >
                <option value="">{t('createQuiz_selectDifficulty')}</option>
                <option value="easy">{t('createQuiz_easy')}</option>
                <option value="medium">{t('createQuiz_medium')}</option>
                <option value="hard">{t('createQuiz_hard')}</option>
              </select>
            </div>

            {/* Time Limit */}
            <div>
              <label htmlFor="timeLimit" className="font-semibold mb-1.5 block text-sm sm:text-base" style={{ color: CQ_WHITE }}>
                {t('createQuiz_timeLimit')}
              </label>
              <input
                type="number"
                id="timeLimit"
                name="timeLimit"
                value={quizData.timeLimit}
                onChange={handleInputChange}
                className="w-full px-3 sm:px-3.5 py-2.5 sm:py-3 rounded-lg sm:rounded-[10px] border text-sm sm:text-base transition-all duration-200 focus:outline-none box-border min-h-[44px]"
                style={{ borderColor: CQ_BORDER, color: CQ_TEXT, backgroundColor: CQ_WHITE, boxShadow: 'none' }}
                placeholder={t('createQuiz_enterTimeLimit')}
                min="1"
              />
            </div>

            {/* Game Mode */}
            <div>
              <label htmlFor="gameMode" className="font-semibold mb-1.5 block text-sm sm:text-base" style={{ color: CQ_WHITE }}>
                {t('createQuiz_gameMode')}
              </label>
              <select
                id="gameMode"
                name="gameMode"
                value={quizData.gameMode || 'MULTIPLAYER'}
                onChange={handleInputChange}
                disabled={Boolean(editingQuizId)}
                className="w-full px-3 sm:px-3.5 py-2.5 sm:py-3 rounded-lg sm:rounded-[10px] border text-sm sm:text-base transition-all duration-200 focus:outline-none box-border min-h-[44px]"
                style={{ borderColor: CQ_BORDER, color: CQ_TEXT, backgroundColor: CQ_WHITE, boxShadow: 'none' }}
              >
                <option value="MULTIPLAYER">{t('createQuiz_multiplayer')}</option>
                <option value="SINGLE">{t('createQuiz_singlePlayer')}</option>
              </select>
              {editingQuizId && (
                <p className="mt-2 text-xs sm:text-sm" style={{ color: CQ_WHITE }}>
                  {t('createQuiz_gameModeLocked')}
                </p>
              )}
            </div>

            {/* Questions Section */}
            <div className="border-t pt-4 sm:pt-5 mt-2" style={{ borderColor: CQ_WHITE }}>
              <h3 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4" style={{ color: CQ_WHITE }}>{t('createQuiz_questions')}</h3>

              <div className="space-y-4 sm:space-y-6">
                {questions.map((question, qIndex) => (
                  <div key={question.id} className="p-3 sm:p-4 rounded-lg border" style={{ backgroundColor: CQ_PRIMARY, borderColor: CQ_BORDER }}>
                    <div className="flex justify-between items-start gap-2 mb-3">
                      <h4 className="text-white font-semibold text-sm sm:text-base">{t('createQuiz_question', { number: qIndex + 1 })}</h4>
                      {questions.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeQuestion(question.id)}
                          className="text-white transition-colors touch-manipulation min-w-[36px] min-h-[36px] flex items-center justify-center p-1"
                        >
                          <FaTrash size={16} />
                        </button>
                      )}
                    </div>

                    {/* Question Type */}
                    <div className="mb-3">
                      <label className="font-semibold text-white mb-1.5 block text-sm">
                        {t('createQuiz_questionType')}
                      </label>
                      <select
                        value={question.questionType}
                        onChange={(e) => handleQuestionTypeChange(question.id, e.target.value)}
                        className="w-full px-3 sm:px-3.5 py-2 rounded-lg sm:rounded-[10px] border text-sm sm:text-base transition-all duration-200 focus:outline-none box-border min-h-[40px]"
                        style={{ borderColor: CQ_BORDER, color: CQ_TEXT, backgroundColor: CQ_WHITE }}
                      >
                        <option value="qanda">{t('createQuiz_qanda')}</option>
                        <option value="truefalse">{t('createQuiz_trueFalse')}</option>
                        <option value="fillblank">{t('createQuiz_fillBlank')}</option>
                      </select>
                    </div>

                    {/* Question Text */}
                    <div className="mb-3">
                      <label className="font-semibold text-white mb-1.5 block text-sm">
                        {t('createQuiz_questionText')}
                      </label>
                      <textarea
                        value={question.questionText}
                        onChange={(e) => handleQuestionChange(question.id, 'questionText', e.target.value)}
                        className="w-full px-3 sm:px-3.5 py-2 rounded-lg sm:rounded-[10px] border text-sm sm:text-base transition-all duration-200 focus:outline-none resize-none min-h-[70px] sm:min-h-[80px] box-border"
                        style={{ borderColor: CQ_BORDER, color: CQ_TEXT, backgroundColor: CQ_WHITE }}
                        placeholder={t('createQuiz_questionText')}
                        required
                      />
                    </div>

                    {/* Answers based on question type */}
                    {question.questionType === 'qanda' && (
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <label className="font-semibold text-white text-sm">{t('createQuiz_answerOptions')}</label>
                          <button
                            type="button"
                            onClick={() => addAnswerOption(question.id)}
                            className="text-sm font-semibold flex items-center gap-1"
                            style={{ color: CQ_WHITE }}
                          >
                            <FaPlus size={12} />
                            {t('createQuiz_addOption')}
                          </button>
                        </div>
                        {question.answers.map((answer, aIndex) => (
                          <div key={answer.id} className="flex flex-wrap gap-2 items-center">
                            <span
                              className="flex items-center justify-center w-9 h-9 rounded-lg font-bold text-sm flex-shrink-0"
                              style={{ backgroundColor: CQ_SECONDARY, color: CQ_WHITE }}
                            >
                              {String.fromCharCode(65 + aIndex)}
                            </span>
                            <input
                              type="text"
                              value={answer.text}
                              onChange={(e) => handleAnswerChange(question.id, answer.id, 'text', e.target.value)}
                              className="flex-1 min-w-0 px-3 py-2 rounded-lg sm:rounded-[10px] border text-sm sm:text-base transition-all duration-200 focus:outline-none box-border min-h-[40px]"
                              style={{ borderColor: CQ_BORDER, color: CQ_TEXT, backgroundColor: CQ_WHITE }}
                              placeholder={`Option ${String.fromCharCode(65 + aIndex)}`}
                              required
                            />
                            <label className="flex items-center gap-2 text-white text-xs sm:text-sm cursor-pointer touch-manipulation shrink-0">
                              <input
                                type="radio"
                                name={`correct-${question.id}`}
                                checked={answer.isCorrect}
                                onChange={(e) => handleAnswerChange(question.id, answer.id, 'isCorrect', true)}
                                className="w-4 h-4"
                              />
                              {t('common_correct')}
                            </label>
                            {question.answers.length > 4 && (
                              <button
                                type="button"
                                onClick={() => removeAnswerOption(question.id, answer.id)}
                                className="text-white transition-colors touch-manipulation min-w-[36px] min-h-[36px] flex items-center justify-center p-1"
                              >
                                <FaTrash size={14} />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {question.questionType === 'truefalse' && (
                      <div>
                        <label className="font-semibold text-white mb-1.5 block text-sm">
                          {t('createQuiz_correctAnswer')}
                        </label>
                        <div className="flex gap-4">
                          <label className="flex items-center gap-2 text-white cursor-pointer touch-manipulation text-sm sm:text-base">
                            <input
                              type="radio"
                              name={`truefalse-${question.id}`}
                              checked={question.correctAnswerBool === true}
                              onChange={() => handleQuestionChange(question.id, 'correctAnswerBool', true)}
                              className="w-4 h-4"
                              required
                            />
                            {t('createQuiz_true')}
                          </label>
                          <label className="flex items-center gap-2 text-white cursor-pointer touch-manipulation text-sm sm:text-base">
                            <input
                              type="radio"
                              name={`truefalse-${question.id}`}
                              checked={question.correctAnswerBool === false}
                              onChange={() => handleQuestionChange(question.id, 'correctAnswerBool', false)}
                              className="w-4 h-4"
                              required
                            />
                            {t('createQuiz_false')}
                          </label>
                        </div>
                      </div>
                    )}

                    {question.questionType === 'fillblank' && (
                      <div>
                        <label className="font-semibold text-white mb-1.5 block text-sm">
                          {t('createQuiz_correctAnswer')}
                        </label>
                        <input
                          type="text"
                          value={question.correctAnswer}
                          onChange={(e) => handleQuestionChange(question.id, 'correctAnswer', e.target.value)}
                          className="w-full px-3 sm:px-3.5 py-2 rounded-lg sm:rounded-[10px] border text-sm sm:text-base transition-all duration-200 focus:outline-none box-border min-h-[40px]"
                          style={{ borderColor: CQ_BORDER, color: CQ_TEXT, backgroundColor: CQ_WHITE }}
                          placeholder={t('createQuiz_correctAnswer')}
                          required
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Add Question Button */}
              <div className="mt-4 sm:mt-6 flex justify-center">
                <button
                  type="button"
                  onClick={addQuestion}
                  className="flex items-center gap-2 text-white px-4 py-2.5 sm:py-2 rounded-lg transition-colors font-semibold text-sm sm:text-base min-h-[44px] touch-manipulation"
                  style={{ backgroundColor: CQ_SECONDARY }}
                >
                  <FaPlus size={14} />
                  {t('createQuiz_addQuestion')}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg mt-4 text-sm sm:text-base border" style={{ backgroundColor: CQ_SECONDARY, borderColor: CQ_BORDER, color: CQ_WHITE }}>
                {error}
              </div>
            )}

            {/* Submit and Cancel Buttons */}
            <div className="mt-4 flex flex-col xs:flex-row flex-wrap gap-3 justify-center items-stretch xs:items-center">
              <button
                type="submit"
                disabled={loading || loadingEdit}
                className="text-white rounded-xl py-3 px-5 sm:px-6 text-base sm:text-[1.1rem] cursor-pointer font-semibold transition-all duration-[0.25s] hover:scale-[1.02] active:scale-[0.98] box-border disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 min-h-[44px] touch-manipulation border-2"
                style={{ backgroundColor: '#16a34a', borderColor: '#16a34a', boxShadow: '0 8px 18px rgba(0, 0, 0, 0.22)' }}
              >
                {loading ? (editingQuizId ? t('createQuiz_updating') : t('createQuiz_creating')) : (editingQuizId ? t('createQuiz_update') : t('createQuiz_title'))}
              </button>
              {editingQuizId && (
                <button
                  type="button"
                  onClick={() => classData ? navigate('/classroom', { state: { classData, activeNav: 'game' } }) : navigate('/my-class')}
                  className="text-white border-none rounded-xl py-3 px-5 sm:px-6 text-base sm:text-[1.1rem] cursor-pointer font-semibold transition-all duration-[0.25s] hover:scale-[1.02] active:scale-[0.98] box-border min-h-[44px] touch-manipulation"
                  style={{ backgroundColor: CQ_SECONDARY }}
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateQuiz;

