import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  FaArrowLeft,
  FaBars,
  FaDesktop,
  FaGamepad,
  FaTrophy,
  FaUsers,
  FaUser,
  FaSignOutAlt,
  FaTrash,
  FaTimes
} from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import { getDefaultAvatarByGender, getAvatarBgColor, getAvatarSrc } from '../utils/avatar';
import { gameSessionAPI, classAPI } from '../services/api';

const MAPSEL_WHITE = '#FFFFFF';
const MAPSEL_PRIMARY = '#789153';
const MAPSEL_SECONDARY = '#8B7745';

const MapSelection = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [quizData, setQuizData] = useState(null);
  const [classData, setClassData] = useState(null);
  const [gameSession, setGameSession] = useState(null);
  const [singlePlayer, setSinglePlayer] = useState(false);
  const [activeNav] = useState('map-selection');
  const [selectedMap, setSelectedMap] = useState(null);
  const [message, setMessage] = useState(null);
  const [messageType, setMessageType] = useState(null);
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Get quiz, class, and game session data from navigation state
  useEffect(() => {
    if (location.state?.quiz) {
      setQuizData(location.state.quiz);
    }
    if (location.state?.classData) {
      setClassData(location.state.classData);
    }
    if (location.state?.gameSession) {
      setGameSession(location.state.gameSession);
    }
    if (location.state?.singlePlayer === true) {
      setSinglePlayer(true);
    }
    // Also derive from quiz so it works even if state was lost (e.g. refresh)
    const quiz = location.state?.quiz;
    if (quiz?.gameMode === 'SINGLE') {
      setSinglePlayer(true);
    }
    
    // If no quiz data, redirect back
    if (!location.state?.quiz) {
      navigate('/my-class');
    }
  }, [location.state, navigate]);

  const handleBack = () => {
    navigate(-1);
  };

  const handleNavClick = (navItem) => {
    if (navItem === 'classroom') {
      if (classData) {
        navigate('/classroom', { state: { classData } });
      } else {
        navigate('/classroom');
      }
    } else if (navItem === 'create-quiz') {
      if (classData) {
        navigate('/create-quiz', { state: { classData } });
      } else {
        navigate('/create-quiz');
      }
    } else if (navItem === 'map-selection') {
      navigate('/map-selection');
    } else if (navItem === 'game') {
      navigate('/lobby');
    } else if (navItem === 'leaderboards') {
      if (classData) {
        navigate('/classroom', { state: { classData } });
      } else {
        navigate('/classroom');
      }
    } else if (navItem === 'students' || navItem === 'classmates') {
      if (classData) {
        navigate('/classroom', { state: { classData } });
      } else {
        navigate('/classroom');
      }
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

  const handleDeleteClassroom = async () => {
    if (!classData || !classData.id) {
      alert('Class data is missing. Please try again.');
      return;
    }

    // Confirm deletion
    const confirmMessage = `Are you sure you want to delete this classroom?\n\nSubject: ${classData.subject}\nGrade Level: ${classData.gradeLevel}\nSection: ${classData.section}\n\nThis will permanently delete the classroom, all quizzes, and game sessions. This action cannot be undone.`;
    
    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      await classAPI.deleteClass(classData.id);
      alert('Classroom deleted successfully');
      navigate('/my-class');
    } catch (err) {
      console.error('Error deleting classroom:', err);
      alert(err.response?.data?.message || 'Failed to delete classroom. Please try again.');
    }
  };

  const maps = [
    {
      id: 1,
      name: 'City',
      image: '/Maps/City.png'
    },
    {
      id: 3,
      name: 'Farm',
      image: '/Maps/Farm.png'
    },
    {
      id: 5,
      name: 'Temple',
      image: '/Maps/Temple.png'
    }
  ];

  const handleMapSelect = (mapId) => {
    setSelectedMap(mapId);
    setMessage(null);
    setMessageType(null);
  };

  const handleConfirm = async () => {
    if (!selectedMap) {
      setMessage('Please select a map first');
      setMessageType('error');
      return;
    }

    if (!quizData) {
      setMessage('Quiz data is missing. Please go back and try again.');
      setMessageType('error');
      return;
    }

    const classId = classData?.id ?? classData?._id;
    if (!classId) {
      setMessage('Class data is missing. Please go back and try again.');
      setMessageType('error');
      return;
    }

    const quizId = quizData?.id ?? quizData?._id;
    if (!quizId) {
      setMessage('Quiz data is invalid. Please go back and try again.');
      setMessageType('error');
      return;
    }

    // Find the selected map details
    const selectedMapData = maps.find(map => map.id === selectedMap);
    if (!selectedMapData) {
      setMessage('Invalid map selection. Please try again.');
      setMessageType('error');
      return;
    }

    setLoading(true);
    setMessage(null);
    setMessageType(null);

    try {
      let sessionToUse = gameSession;

      // If no game session (e.g. came from Create Quiz after session creation failed), create one now
      if (!sessionToUse || !(sessionToUse.id ?? sessionToUse._id)) {
        const createResult = await gameSessionAPI.createGameSession({
          quizId,
          classId
        });
        if (!createResult?.gameSession) {
          setMessage('Failed to create game session. Please go back and try again.');
          setMessageType('error');
          return;
        }
        sessionToUse = createResult.gameSession;
      }

      const sid = sessionToUse.id ?? sessionToUse._id;
      const result = await gameSessionAPI.updateGameSession(sid, {
        map: selectedMapData
      });

      if (result.gameSession) {
        const updatedSession = result.gameSession;
        const updatedSid = updatedSession?.id ?? updatedSession?._id ?? sid;

        // Prefer location.state so we don't rely on React state (which can lag). Detect single-player so teacher never goes to lobby.
        const stateQuiz = location.state?.quiz;
        const gameMode = (stateQuiz?.gameMode ?? quizData?.gameMode ?? updatedSession?.quiz?.gameMode ?? '').toString().toUpperCase();
        const isSinglePlayerMode = location.state?.singlePlayer === true || singlePlayer || gameMode === 'SINGLE';

        const isTeacher = String(user?.accountType ?? '').toUpperCase() === 'TEACHER';

        if (isSinglePlayerMode) {
          await gameSessionAPI.updateGameSession(updatedSid, { status: 'PLAYING' });
          if (isTeacher) {
            navigate('/classroom', { state: { classData: classData || undefined, activeNav: 'game' }, replace: true });
            return;
          }
          navigate(`/gameplay/${updatedSid}`, {
            state: {
              quiz: quizData,
              map: selectedMapData,
              classData: classData,
              gameSession: { ...updatedSession, status: 'PLAYING' }
            }
          });
        } else {
          if (isTeacher) {
            navigate(updatedSid ? `/lobby/${updatedSid}` : '/lobby', {
              state: {
                quiz: quizData,
                map: selectedMapData,
                classData: classData,
                gameSession: updatedSession
              }
            });
          } else {
            navigate(updatedSid ? `/lobby/${updatedSid}` : '/lobby', {
              state: {
                quiz: quizData,
                map: selectedMapData,
                classData: classData,
                gameSession: updatedSession
              }
            });
          }
        }
      } else {
        setMessage('Failed to update game session. Please try again.');
        setMessageType('error');
      }
    } catch (err) {
      console.error('Error updating game session:', err);
      setMessage(err.response?.data?.message || 'Failed to update game session. Please try again.');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex font-sans box-border m-0 p-0 overflow-x-hidden"
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
        <span className="text-white font-bold text-lg truncate flex-1">Select Your Map</span>
      </div>

      {/* Backdrop when sidebar open on mobile */}
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
            <span className="text-white font-bold text-sm sm:text-base">BACK</span>
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

        <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-white text-center mb-1 truncate px-1">{user?.firstName || 'User'}</h2>
        <p className="text-xs sm:text-sm font-semibold text-center mb-4 sm:mb-6 md:mb-8" style={{ color: '#FFD700' }}>{user?.accountType || 'STUDENT'}</p>

        <nav className="flex-1 space-y-1 sm:space-y-2 overflow-y-auto min-h-0">
          {user?.accountType === 'TEACHER' ? (
            <>
              <button onClick={() => { handleNavClick('classroom'); setSidebarOpen(false); }} className={`w-full flex items-center gap-2 sm:gap-3 px-3 py-2.5 sm:px-4 sm:py-3 rounded-lg transition-colors touch-manipulation min-h-[44px] ${activeNav === 'classroom' ? 'bg-green-600' : 'hover:bg-green-700'}`}>
                <FaDesktop className="text-white flex-shrink-0" size={18} />
                <span className={`text-white font-bold text-sm sm:text-base text-left ${activeNav === 'classroom' ? 'underline' : ''}`} style={{ textShadow: '1px 1px 2px rgba(0, 0, 0, 0.5)' }}>CLASSROOM</span>
              </button>
              <button onClick={() => { handleNavClick('game'); setSidebarOpen(false); }} className={`w-full flex items-center gap-2 sm:gap-3 px-3 py-2.5 sm:px-4 sm:py-3 rounded-lg transition-colors touch-manipulation min-h-[44px] ${activeNav === 'game' ? 'bg-green-600' : 'hover:bg-green-700'}`}>
                <FaGamepad className="text-white flex-shrink-0" size={18} />
                <span className="text-white font-bold text-sm sm:text-base text-left" style={{ textShadow: '1px 1px 2px rgba(0, 0, 0, 0.5)' }}>GAME</span>
              </button>
              <button onClick={() => { handleNavClick('students'); setSidebarOpen(false); }} className={`w-full flex items-center gap-2 sm:gap-3 px-3 py-2.5 sm:px-4 sm:py-3 rounded-lg transition-colors touch-manipulation min-h-[44px] ${activeNav === 'students' ? 'bg-green-600' : 'hover:bg-green-700'}`}>
                <FaUsers className="text-white flex-shrink-0" size={18} />
                <span className="text-white font-bold text-sm sm:text-base text-left" style={{ textShadow: '1px 1px 2px rgba(0, 0, 0, 0.5)' }}>STUDENTS</span>
              </button>
              <button onClick={() => { handleNavClick('leaderboards'); setSidebarOpen(false); }} className={`w-full flex items-center gap-2 sm:gap-3 px-3 py-2.5 sm:px-4 sm:py-3 rounded-lg transition-colors touch-manipulation min-h-[44px] ${activeNav === 'leaderboards' ? 'bg-green-600' : 'hover:bg-green-700'}`}>
                <FaTrophy className="text-white flex-shrink-0" size={18} />
                <span className="text-white font-bold text-sm sm:text-base text-left" style={{ textShadow: '1px 1px 2px rgba(0, 0, 0, 0.5)' }}>LEADERBOARDS</span>
              </button>
              <button onClick={() => { handleNavClick('create-quiz'); setSidebarOpen(false); }} className={`w-full flex items-center gap-2 sm:gap-3 px-3 py-2.5 sm:px-4 sm:py-3 rounded-lg transition-colors touch-manipulation min-h-[44px] ${activeNav === 'create-quiz' ? 'bg-green-600' : 'hover:bg-green-700'}`}>
                <FaGamepad className="text-white flex-shrink-0" size={18} />
                <span className="text-white font-bold text-sm sm:text-base text-left" style={{ textShadow: '1px 1px 2px rgba(0, 0, 0, 0.5)' }}>CREATE QUIZ</span>
              </button>
              <button onClick={handleDeleteClassroom} className="w-full flex items-center gap-2 sm:gap-3 px-3 py-2.5 sm:px-4 sm:py-3 rounded-lg transition-colors hover:bg-red-700 mt-2 sm:mt-4 justify-start touch-manipulation min-h-[44px]">
                <FaTrash className="text-red-500 flex-shrink-0" size={18} />
                <span className="text-red-500 font-bold text-sm sm:text-base text-left" style={{ textShadow: '1px 1px 2px rgba(0, 0, 0, 0.5)' }}>DELETE CLASSROOM</span>
              </button>
            </>
          ) : (
            <>
              <button onClick={() => { handleNavClick('classroom'); setSidebarOpen(false); }} className={`w-full flex items-center gap-2 sm:gap-3 px-3 py-2.5 sm:px-4 sm:py-3 rounded-lg transition-colors touch-manipulation min-h-[44px] ${activeNav === 'classroom' ? 'bg-green-600' : 'hover:bg-green-700'}`}>
                <FaDesktop className="text-white flex-shrink-0" size={18} />
                <span className="text-white font-bold text-sm sm:text-base text-left">CLASSROOM</span>
              </button>
              <button onClick={() => { handleNavClick('game'); setSidebarOpen(false); }} className={`w-full flex items-center gap-2 sm:gap-3 px-3 py-2.5 sm:px-4 sm:py-3 rounded-lg transition-colors touch-manipulation min-h-[44px] ${activeNav === 'game' ? 'bg-green-600' : 'hover:bg-green-700'}`}>
                <FaGamepad className="text-white flex-shrink-0" size={18} />
                <span className="text-white font-bold text-sm sm:text-base text-left">GAME</span>
              </button>
              <button onClick={() => { handleNavClick('leaderboards'); setSidebarOpen(false); }} className={`w-full flex items-center gap-2 sm:gap-3 px-3 py-2.5 sm:px-4 sm:py-3 rounded-lg transition-colors touch-manipulation min-h-[44px] ${activeNav === 'leaderboards' ? 'bg-green-600' : 'hover:bg-green-700'}`}>
                <FaTrophy className="text-white flex-shrink-0" size={18} />
                <span className="text-white font-bold text-sm sm:text-base text-left">LEADERBOARDS</span>
              </button>
              <button onClick={() => { handleNavClick('classmates'); setSidebarOpen(false); }} className={`w-full flex items-center gap-2 sm:gap-3 px-3 py-2.5 sm:px-4 sm:py-3 rounded-lg transition-colors touch-manipulation min-h-[44px] ${activeNav === 'classmates' ? 'bg-green-600' : 'hover:bg-green-700'}`}>
                <FaUsers className="text-white flex-shrink-0" size={18} />
                <span className="text-white font-bold text-sm sm:text-base text-left">CLASSMATES</span>
              </button>
              <button onClick={handleLeaveClassroom} className="w-full flex items-center gap-2 sm:gap-3 px-3 py-2.5 sm:px-4 sm:py-3 rounded-lg transition-colors hover:bg-red-600 mt-2 sm:mt-4 justify-start touch-manipulation min-h-[44px]">
                <FaSignOutAlt className="text-white flex-shrink-0" size={18} />
                <span className="text-white font-bold text-sm sm:text-base text-left">LEAVE CLASSROOM</span>
              </button>
            </>
          )}
        </nav>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex justify-center items-start w-full min-h-screen overflow-y-auto pt-14 lg:pt-10 pb-6 lg:pb-10 px-3 xs:px-4 sm:px-4 lg:ml-64">
        <div className="flex min-h-full w-full max-w-5xl font-sans items-start mt-4 sm:mt-6 rounded-2xl sm:rounded-[20px] mx-0 sm:mx-4 mb-4 flex-1 shadow-xl border-2" style={{ backgroundColor: MAPSEL_PRIMARY, borderColor: MAPSEL_WHITE, boxShadow: '0 10px 40px rgba(0,0,0,0.25)' }}>
          <div className="flex-1 p-4 xs:p-5 sm:p-6 md:p-8 items-center overflow-y-auto w-full">
            <button
              onClick={handleBack}
              className="flex items-center gap-2 mb-3 sm:mb-4 text-white font-bold hover:opacity-90 transition-opacity touch-manipulation min-h-[44px] -ml-1"
              style={{ textShadow: '1px 1px 3px rgba(0,0,0,0.5)' }}
            >
              <FaArrowLeft size={20} />
              <span className="text-sm sm:text-base">Back</span>
            </button>
            <h2 className="text-center text-xl xs:text-2xl sm:text-[28px] md:text-[32px] text-white mb-2 font-bold uppercase" style={{ textShadow: '2px 2px 6px rgba(0,0,0,0.5), 0 0 2px rgba(0,0,0,0.3)' }}>
              Select Your Map
            </h2>
            <p className="text-center text-white mb-2 sm:mb-2.5 text-base sm:text-lg md:text-xl font-bold uppercase" style={{ textShadow: '1px 1px 4px rgba(0,0,0,0.5)' }}>
              Choose a map to start your adventure
            </p>

            <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 md:gap-7 justify-center mt-4 sm:mt-6">
              {maps.map((map) => (
                <div
                  key={map.id}
                  onClick={() => handleMapSelect(map.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleMapSelect(map.id); } }}
                  className={`group rounded-xl sm:rounded-[14px] cursor-pointer text-center overflow-hidden transition-all duration-300 touch-manipulation border-2 ${
                    selectedMap === map.id
                      ? 'shadow-[0_6px_20px_rgba(139,119,69,0.45),0_4px_14px_rgba(0,0,0,0.2)]'
                      : 'shadow-[0_4px_12px_rgba(0,0,0,0.15)]'
                  } hover:-translate-y-1.5 hover:shadow-[0_8px_20px_rgba(0,0,0,0.22)] active:scale-[0.98]`}
                  style={{ backgroundColor: MAPSEL_WHITE, borderColor: selectedMap === map.id ? MAPSEL_SECONDARY : 'rgba(255,255,255,0.7)' }}
                >
                  <div className="relative h-[100px] xs:h-[110px] sm:h-[120px] md:h-[130px] overflow-hidden">
                    <img
                      src={map.image}
                      alt={map.name}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      onError={(e) => {
                        e.target.src = 'https://via.placeholder.com/260x130?text=' + map.name;
                      }}
                    />
                    {selectedMap === map.id && (
                      <div className="absolute top-0 left-0 right-0 bottom-0 text-white font-bold text-base sm:text-lg md:text-xl flex items-center justify-center uppercase" style={{ backgroundColor: 'rgba(139, 119, 69, 0.78)' }}>
                        Selected
                      </div>
                    )}
                  </div>
                  <h3 className="my-2 sm:my-2.5 mb-1 text-base sm:text-lg font-bold uppercase" style={{ color: MAPSEL_SECONDARY }}>{map.name}</h3>
                </div>
              ))}
            </div>

            <button
              onClick={handleConfirm}
              disabled={!selectedMap || loading}
              className="block mx-auto mt-6 sm:mt-8 py-3 sm:py-3.5 px-8 sm:px-10 text-sm sm:text-base font-semibold text-white rounded-xl cursor-pointer transition-colors duration-200 disabled:cursor-not-allowed touch-manipulation min-h-[44px] shadow-lg"
              style={{ backgroundColor: !selectedMap || loading ? 'rgba(255,255,255,0.45)' : MAPSEL_SECONDARY, boxShadow: '0 4px 14px rgba(0,0,0,0.25)' }}
            >
              {loading ? 'Saving...' : 'Confirm Selection'}
            </button>

            {message && (
              <div
                className={`text-center mt-4 sm:mt-6 py-3 px-4 sm:px-5 rounded-lg text-sm sm:text-base font-medium animate-fadeIn shadow-md ${
                  messageType === 'success'
                    ? ''
                    : ''
                }`}
                style={{ backgroundColor: messageType === 'success' ? MAPSEL_WHITE : MAPSEL_SECONDARY, color: messageType === 'success' ? MAPSEL_PRIMARY : MAPSEL_WHITE, boxShadow: '0 2px 10px rgba(0,0,0,0.15)' }}
              >
                {message}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MapSelection;

