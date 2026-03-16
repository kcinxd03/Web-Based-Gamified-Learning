import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import {
  FaArrowLeft,
  FaBars,
  FaPlay,
  FaSignOutAlt,
  FaDesktop,
  FaGamepad,
  FaTrophy,
  FaUsers,
  FaTrash,
  FaTimes,
  FaEdit
} from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import { getDefaultAvatarByGender, getAvatarBgColor, getAvatarSrc } from '../utils/avatar';
import { useSocket } from '../context/SocketContext';
import { useLanguage } from '../context/LanguageContext';
import { gameSessionAPI, classAPI, quizAPI } from '../services/api';

const SLOTS_TOTAL = 10;

// Parse session data into normalized shape (deduplicate players by id so notification join never shows duplicates)
const normalizeSession = (gs) => {
  if (!gs) return null;
  const c = gs.class;
  const seenIds = new Set();
  const players = Array.isArray(gs.players)
    ? gs.players
        .filter((p) => {
          const pid = p && String(p._id ?? p.id ?? '');
          if (!pid || seenIds.has(pid)) return false;
          seenIds.add(pid);
          return true;
        })
        .map((p) => ({
          id: p._id ?? p.id,
          name: [p.firstName, p.lastName].filter(Boolean).join(' ') || p.name || 'Player',
          avatar: p.profilePicture ?? p.avatar,
          gender: p.gender
        }))
    : [];
  return {
    id: gs.id ?? gs._id,
    quiz: gs.quiz,
    map: gs.map,
    status: gs.status,
    players,
    classData: c
      ? {
          id: c._id ?? c.id,
          subject: c.subject,
          gradeLevel: c.gradeLevel,
          section: c.section,
          classCode: c.classCode,
          teacher: c.teacher,
          teacherName: c.teacher ? `${c.teacher.firstName || ''} ${c.teacher.lastName || ''}`.trim() : ''
        }
      : null
  };
};

const Lobby = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { sessionId } = useParams();
  const { user } = useAuth();
  const { t } = useLanguage();
  const { socket, joinGameSession, leaveGameSession } = useSocket();
  const sessionIdRef = useRef(null);

  const [session, setSession] = useState(null);
  const [quizData, setQuizData] = useState(null);
  const [mapData, setMapData] = useState(null);
  const [classData, setClassData] = useState(null);
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [restarting, setRestarting] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingClass, setDeletingClass] = useState(false);

  const isTeacher = user?.accountType === 'TEACHER';

  // Load session from URL – always fetch from API so we show current status (not previous "game over" state)
  // For students: ensure they call join API so they're in the session's players array before we display
  useEffect(() => {
    if (!sessionId) {
      navigate('/my-class');
      return;
    }
    const urlId = String(sessionId);
    const state = location.state;

    const applySession = (gs, quiz, map, cData) => {
      const norm = normalizeSession(gs);
      const gsId = String(gs?.id ?? gs?._id ?? '');
      if (!norm || gsId !== urlId) return false;
      setSession(gs);
      setQuizData(quiz ?? gs.quiz ?? null); // Used when navigating to gameplay so questions show on NPC overlap
      setMapData(map ?? gs.map ?? null);
      setClassData(cData ?? norm.classData ?? null);
      setPlayers(norm.players ?? []);
      setError(null);
      setLoading(false);
      return true;
    };

    const loadSession = () =>
      gameSessionAPI.getGameSessionById(sessionId).then(async (res) => {
        const gs = res.gameSession ?? res;
        const gsId = String(gs?.id ?? gs?._id ?? '');
        if (!gs || gsId !== urlId) {
          // After game end we may redirect to lobby with state; if API returns 404 (e.g. different DB), use state session so user sees "game ended" instead of "Game not found"
          const stateSession = state?.gameSession;
          if (stateSession && String(stateSession.id ?? stateSession._id) === urlId) {
            const cData = state?.classData ?? (stateSession.class ? normalizeSession(stateSession).classData : null);
            const quiz = state?.quiz ?? stateSession.quiz ?? null;
            const map = state?.map ?? stateSession.map ?? null;
            applySession(stateSession, quiz, map, cData);
            return;
          }
          setError(t('lobby_gameNotFound'));
          return;
        }
        const cData = state?.classData ?? (gs.class ? normalizeSession(gs).classData : null);
        let quiz = state?.quiz ?? gs.quiz ?? null;
        const map = state?.map ?? gs.map ?? null;
        if (quiz && (!Array.isArray(quiz.questions) || quiz.questions.length === 0)) {
          const quizId = quiz.id ?? quiz._id;
          if (quizId) {
            try {
              const fullQuiz = await quizAPI.getQuizById(quizId);
              quiz = fullQuiz.quiz ?? fullQuiz;
            } catch (e) {
              console.warn('Could not fetch full quiz for questions:', e);
            }
          }
        }
        applySession(gs, quiz, map, cData);
      });

    setLoading(true);
    setError(null);

    if (user?.accountType === 'STUDENT') {
      gameSessionAPI
        .joinGameSession({ sessionId: urlId })
        .then((joinRes) => {
          const gs = joinRes?.gameSession;
          if (gs && (String(gs.id ?? gs._id) === urlId)) {
            const cData = state?.classData ?? (gs.class ? normalizeSession(gs).classData : null);
            const quiz = state?.quiz ?? gs.quiz ?? null;
            const map = state?.map ?? gs.map ?? null;
            applySession(gs, quiz, map, cData);
            return;
          }
          return loadSession();
        })
        .catch((err) => {
          const status = err.response?.status;
          const msg = (err.response?.data?.message || '').toLowerCase();
          if (status === 400 && (msg.includes('game has finished') || msg.includes('finished'))) {
            setError(t('lobby_gameEnded'));
            return;
          }
          if ((status === 400 || status === 403) && (msg.includes('teacher') || msg.includes('lobby') || msg.includes('class'))) {
            setError(t('lobby_noTeacher'));
            return;
          }
          return loadSession();
        })
        .finally(() => setLoading(false));
    } else {
      loadSession().catch(() => setError(t('lobby_couldNotLoad'))).finally(() => setLoading(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, navigate]);

  sessionIdRef.current = session ? String(session.id ?? session._id) : sessionId;

  // Socket: join room when we have sessionId and socket; re-join on connect so teacher is in room when students join
  useEffect(() => {
    const sid = sessionIdRef.current || sessionId;
    if (!sid || !socket) return;

    const doJoin = () => {
      joinGameSession(sid);
    };

    doJoin();
    socket.on('connect', doJoin);
    return () => {
      socket.off('connect', doJoin);
      leaveGameSession(sid);
    };
  }, [sessionId, socket, joinGameSession, leaveGameSession]);

  useEffect(() => {
    if (!socket || !sessionIdRef.current) return;
    const sid = sessionIdRef.current;

    const onUpdate = (data) => {
      const gs = data.gameSession;
      if (!gs || String(gs.id ?? gs._id) !== sid) return;
      setSession(gs);
      const newPlayers = gs.players ? normalizeSession(gs).players : [];
      setPlayers(newPlayers);
      // If current user is a student and no longer in players, they were kicked -> leave and redirect
      if (user?.accountType === 'STUDENT') {
        const myId = String(user?._id ?? user?.id ?? '');
        if (myId && !newPlayers.some((p) => String(p.id) === myId)) {
          leaveGameSession(sid);
          navigate(classData ? '/classroom' : '/my-class', classData ? { state: { classData, activeNav: 'game' }, replace: true } : { replace: true });
          return;
        }
      }
      if (gs.status === 'PLAYING') {
        const c = classData ?? normalizeSession(gs).classData;
        const sid = String(gs.id ?? gs._id);
        navigate(`/gameplay/${sid}`, { state: { gameSession: gs, map: mapData ?? gs.map, classData: c, quiz: quizData } });
      }
      if (gs.status === 'FINISHED') {
        const c = gs.class;
        const cData = c ? { id: c._id ?? c.id, subject: c.subject, gradeLevel: c.gradeLevel, section: c.section, classCode: c.classCode, teacher: c.teacher, teacherName: c.teacher ? `${c.teacher.firstName || ''} ${c.teacher.lastName || ''}`.trim() : '' } : classData;
        const sid = String(gs.id ?? gs._id);
        navigate(`/lobby/${sid}`, { state: { classData: cData, gameSession: gs, map: mapData ?? gs.map }, replace: true });
      }
    };

    const onPlayerJoined = (data) => {
      const gs = data.gameSession;
      if (!gs || String(gs.id ?? gs._id) !== sid) return;
      setSession(gs);
      if (gs.players) setPlayers(normalizeSession(gs).players);
    };

    socket.on('game-session-updated', onUpdate);
    socket.on('player-joined-game', onPlayerJoined);
    return () => {
      socket.off('game-session-updated', onUpdate);
      socket.off('player-joined-game', onPlayerJoined);
    };
  }, [socket, quizData, mapData, classData, navigate, user, leaveGameSession]);

  // Teacher: refetch session when tab becomes visible so player list stays in sync if an event was missed
  useEffect(() => {
    if (!isTeacher || !sessionIdRef.current || !session) return;
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        gameSessionAPI
          .getGameSessionById(sessionIdRef.current)
          .then((res) => {
            const gs = res.gameSession ?? res;
            if (gs && String(gs.id ?? gs._id) === String(sessionIdRef.current)) {
              setSession(gs);
              if (gs.players) setPlayers(normalizeSession(gs).players);
            }
          })
          .catch(() => {});
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, [isTeacher, session]);

  const handleBack = () => {
    navigate(classData ? '/classroom' : '/my-class', classData ? { state: { classData, activeNav: 'game' } } : {});
  };

  const handleNavClick = (navItem) => {
    const sid = session?.id ?? session?._id;
    if (navItem === 'classroom') {
      navigate(classData ? '/classroom' : '/my-class', classData ? { state: { classData } } : {});
    } else if (navItem === 'game') {
      if (sid && classData && quizData) {
        navigate(`/lobby/${sid}`, { state: { quiz: quizData, map: mapData, classData, gameSession: session } });
      } else {
        navigate(classData ? '/classroom' : '/my-class', classData ? { state: { classData, activeNav: 'game' } } : {});
      }
    } else if (['students', 'classmates', 'leaderboards'].includes(navItem)) {
      navigate(classData ? '/classroom' : '/my-class', classData ? { state: { classData, activeNav: navItem } } : {});
    } else if (navItem === 'create-quiz') {
      navigate(classData ? '/create-quiz' : '/my-class', classData ? { state: { classData } } : {});
    } else if (navItem === 'delete-classroom') {
      if (!classData?.id) return;
      setShowDeleteModal(true);
    } else if (navItem === 'leave-classroom') {
      navigate('/my-class');
    }
  };

  const handleLeave = async () => {
    const sid = session?.id ?? session?._id;
    const navTo = classData ? '/classroom' : '/my-class';
    const navState = classData ? { state: { classData, activeNav: 'game' }, replace: true } : { replace: true };
    if (sid) {
      leaveGameSession(sid);
      navigate(navTo, navState);
      try {
        await gameSessionAPI.leaveGameSession(sid);
      } catch (e) {
        console.error(e);
      }
    } else {
      navigate(navTo, navState);
    }
  };

  const handleStartGame = async () => {
    const sid = session?.id ?? session?._id;
    if (!sid || !mapData) return;
    try {
      const res = await gameSessionAPI.updateGameSession(sid, { status: 'PLAYING' });
      if (res.gameSession) {
        navigate(`/gameplay/${sid}`, { state: { gameSession: res.gameSession, map: mapData, classData, quiz: quizData } });
      }
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message ?? 'Failed to start game.');
    }
  };

  const handleKickPlayer = async (playerId) => {
    const sid = session?.id ?? session?._id;
    if (!sid || !isTeacher) return;
    if (!window.confirm('Remove this student from the lobby?')) return;
    try {
      await gameSessionAPI.kickPlayer(sid, playerId);
      // Socket game-session-updated will refresh the list
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message ?? 'Failed to kick player.');
    }
  };

  const handleRestartLobby = async () => {
    const sid = session?.id ?? session?._id;
    if (!sid || !isTeacher) return;
    setRestarting(true);
    try {
      const res = await gameSessionAPI.updateGameSession(sid, { status: 'WAITING' });
      if (res.gameSession) {
        setSession(res.gameSession);
      }
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message ?? 'Failed to restart lobby.');
    } finally {
      setRestarting(false);
    }
  };

  const confirmDeleteClassroom = async () => {
    if (!classData?.id) return;
    setDeletingClass(true);
    try {
      await classAPI.deleteClass(classData.id);
      setShowDeleteModal(false);
      navigate('/my-class', { replace: true });
    } catch (e) {
      console.error('Delete classroom error:', e);
      setShowDeleteModal(false);
      // Optional: you could show a non-blocking error banner here instead of alert
    } finally {
      setDeletingClass(false);
    }
  };

  const handleEditGame = () => {
    const sid = session?.id ?? session?._id;
    if (!sid || !isTeacher || !quizData || !classData) return;
    navigate('/map-selection', {
      state: {
        quiz: quizData,
        classData,
        gameSession: { ...session, id: sid },
        map: mapData
      }
    });
  };

  // Teacher as host in first slot.
  // If the current user is the teacher, always use their auth avatar so the host card matches the sidebar/profile.
  const teacherData = session?.teacher || classData?.teacher;
  const hostSlot = teacherData
    ? {
        id: teacherData._id ?? teacherData.id ?? 'host',
        name:
          isTeacher && user
            ? [user.firstName, user.lastName].filter(Boolean).join(' ') || user.name || 'Host'
            : [teacherData.firstName, teacherData.lastName].filter(Boolean).join(' ') ||
              classData?.teacherName ||
              'Host',
        avatar: isTeacher
          ? user?.profilePicture || getDefaultAvatarByGender(user?.gender)
          : teacherData.profilePicture || teacherData.avatar || getDefaultAvatarByGender(teacherData.gender),
        gender: isTeacher ? user?.gender : teacherData.gender,
        isHost: true
      }
    : null;
  // Exclude host (teacher) from players so they don't appear twice when backend includes teacher in session.players
  const hostId = hostSlot ? String(hostSlot.id) : null;
  const playersWithoutHost = hostId ? players.filter((p) => String(p.id) !== hostId) : players;
  // Deduplicate by id in case the same player appears twice (e.g. join API + socket event)
  const seenIds = new Set();
  const uniquePlayers = playersWithoutHost.filter((p) => {
    const id = p && String(p.id);
    if (!id || seenIds.has(id)) return false;
    seenIds.add(id);
    return true;
  });
  const displayList = hostSlot ? [hostSlot, ...uniquePlayers] : uniquePlayers;
  const emptySlots = Math.max(0, SLOTS_TOTAL - displayList.length);

  if (loading && !session) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 overflow-x-hidden" style={{ backgroundImage: "url('/images/bg.jpg')", backgroundSize: 'cover' }}>
        <p className="text-white text-lg sm:text-xl text-center">{t('lobby_loadingGame')}</p>
      </div>
    );
  }

  if (error && !session) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-4 overflow-x-hidden" style={{ backgroundImage: "url('/images/bg.jpg')", backgroundSize: 'cover' }}>
        <p className="text-white text-lg sm:text-xl text-center">{error}</p>
        <button
          onClick={() => navigate(classData ? '/classroom' : '/my-class', classData ? { state: { classData, activeNav: 'game' } } : {})}
          className="px-4 py-3 sm:px-6 sm:py-2 rounded-lg font-bold text-white bg-[#6b8e3f] border-2 border-[#2d5016] min-h-[44px] touch-manipulation"
        >
          {classData ? t('lobby_backToClassroom') : t('lobby_backToMyClass')}
        </button>
      </div>
    );
  }

  if (!session) return null;

  return (
    <div
      className="min-h-screen flex overflow-x-hidden"
      style={{
        backgroundImage: "url('/images/bg.jpg')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        fontFamily: '"Poppins", sans-serif'
      }}
    >
      {/* Mobile top bar */}
      <div
        className="fixed top-0 left-0 right-0 h-14 z-20 flex items-center gap-3 px-4 lg:hidden border-b-2 border-black/20"
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
        <span className="text-white font-bold text-lg truncate flex-1">{t('lobby_title')}</span>
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
        className={`fixed left-0 top-0 w-[280px] xs:w-64 h-screen p-4 sm:p-5 md:p-6 flex flex-col z-[12] transform transition-transform duration-200 ease-out lg:translate-x-0 border-r-2 border-black/20 ${
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
            <img src={getAvatarSrc(user?.profilePicture || getDefaultAvatarByGender(user?.gender), user?.gender)} alt="" className="w-full h-full object-cover" onError={(e) => (e.target.style.display = 'none')} />
          </div>
        </div>
        <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-white text-center mb-1 truncate px-1">{user?.firstName}</h2>
        <p className="text-xs sm:text-sm font-semibold text-center mb-4 sm:mb-6 md:mb-8" style={{ color: '#FFD700' }}>{user?.accountType || 'STUDENT'}</p>

        <nav className="flex-1 space-y-1 sm:space-y-2 overflow-y-auto min-h-0">
          {isTeacher ? (
            <>
              <button onClick={() => { handleNavClick('classroom'); setSidebarOpen(false); }} className="w-full flex items-center gap-2 sm:gap-3 px-3 py-2.5 sm:px-4 sm:py-3 rounded-lg transition-colors hover:bg-green-700 touch-manipulation min-h-[44px]">
                <FaDesktop className="text-white flex-shrink-0" size={18} />
                <span className="text-white font-bold text-sm sm:text-base text-left" style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.5)' }}>{t('classroom_classroom')}</span>
              </button>
              <button onClick={() => { handleNavClick('game'); setSidebarOpen(false); }} className="w-full flex items-center gap-2 sm:gap-3 px-3 py-2.5 sm:px-4 sm:py-3 rounded-lg transition-colors bg-green-600 touch-manipulation min-h-[44px]">
                <FaGamepad className="text-white flex-shrink-0" size={18} />
                <span className="text-white font-bold text-sm sm:text-base text-left underline" style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.5)' }}>{t('classroom_game')}</span>
              </button>
              <button onClick={() => { handleNavClick('students'); setSidebarOpen(false); }} className="w-full flex items-center gap-2 sm:gap-3 px-3 py-2.5 sm:px-4 sm:py-3 rounded-lg transition-colors hover:bg-green-700 touch-manipulation min-h-[44px]">
                <FaUsers className="text-white flex-shrink-0" size={18} />
                <span className="text-white font-bold text-sm sm:text-base text-left" style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.5)' }}>{t('classroom_students')}</span>
              </button>
              <button onClick={() => { handleNavClick('leaderboards'); setSidebarOpen(false); }} className="w-full flex items-center gap-2 sm:gap-3 px-3 py-2.5 sm:px-4 sm:py-3 rounded-lg transition-colors hover:bg-green-700 touch-manipulation min-h-[44px]">
                <FaTrophy className="text-white flex-shrink-0" size={18} />
                <span className="text-white font-bold text-sm sm:text-base text-left" style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.5)' }}>{t('classroom_leaderboards')}</span>
              </button>
              <button onClick={() => { handleNavClick('create-quiz'); setSidebarOpen(false); }} className="w-full flex items-center gap-2 sm:gap-3 px-3 py-2.5 sm:px-4 sm:py-3 rounded-lg transition-colors hover:bg-green-700 touch-manipulation min-h-[44px]">
                <FaGamepad className="text-white flex-shrink-0" size={18} />
                <span className="text-white font-bold text-sm sm:text-base text-left" style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.5)' }}>{t('classroom_createQuiz')}</span>
              </button>
              <button onClick={() => handleNavClick('delete-classroom')} className="w-full flex items-center gap-2 sm:gap-3 px-3 py-2.5 sm:px-4 sm:py-3 rounded-lg transition-colors hover:bg-red-700 mt-2 sm:mt-4 justify-start touch-manipulation min-h-[44px]">
                <FaTrash className="text-red-500 flex-shrink-0" size={18} />
                <span className="text-red-500 font-bold text-sm sm:text-base text-left" style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.5)' }}>{t('classroom_deleteClassroom')}</span>
              </button>
            </>
          ) : (
            <>
              <button onClick={() => { handleNavClick('classroom'); setSidebarOpen(false); }} className="w-full flex items-center gap-2 sm:gap-3 px-3 py-2.5 sm:px-4 sm:py-3 rounded-lg transition-colors hover:bg-green-700 touch-manipulation min-h-[44px]">
                <FaDesktop className="text-white flex-shrink-0" size={18} />
                <span className="text-white font-bold text-sm sm:text-base text-left">{t('classroom_classroom')}</span>
              </button>
              <button onClick={() => { handleNavClick('game'); setSidebarOpen(false); }} className="w-full flex items-center gap-2 sm:gap-3 px-3 py-2.5 sm:px-4 sm:py-3 rounded-lg transition-colors bg-green-600 touch-manipulation min-h-[44px]">
                <FaGamepad className="text-white flex-shrink-0" size={18} />
                <span className="text-white font-bold text-sm sm:text-base text-left underline">{t('classroom_game')}</span>
              </button>
              <button onClick={() => { handleNavClick('leaderboards'); setSidebarOpen(false); }} className="w-full flex items-center gap-2 sm:gap-3 px-3 py-2.5 sm:px-4 sm:py-3 rounded-lg transition-colors hover:bg-green-700 touch-manipulation min-h-[44px]">
                <FaTrophy className="text-white flex-shrink-0" size={18} />
                <span className="text-white font-bold text-sm sm:text-base text-left">{t('classroom_leaderboards')}</span>
              </button>
              <button onClick={() => { handleNavClick('classmates'); setSidebarOpen(false); }} className="w-full flex items-center gap-2 sm:gap-3 px-3 py-2.5 sm:px-4 sm:py-3 rounded-lg transition-colors hover:bg-green-700 touch-manipulation min-h-[44px]">
                <FaUsers className="text-white flex-shrink-0" size={18} />
                <span className="text-white font-bold text-sm sm:text-base text-left">{t('classroom_classmates')}</span>
              </button>
            </>
          )}
        </nav>
      </div>

      {/* Main content - full width on mobile with top padding for bar */}
      <div className="flex-1 w-full min-w-0 pt-14 lg:pt-0 lg:ml-64 flex items-center justify-center p-3 xs:p-4 sm:p-5">
        <div className="flex flex-col md:flex-row bg-[#a68e52] rounded-lg sm:rounded-[10px] overflow-hidden min-h-[85vh] sm:min-h-[88vh] md:h-[90vh] w-full max-w-[100%] md:max-w-[95vw] lg:w-[130vh] lg:max-w-[calc(100vw-20rem)] shadow-xl border-2 border-[#5c4a2e]" style={{ boxShadow: '0 10px 25px rgba(0,0,0,0.35)' }}>
          <div className="flex-1 p-4 sm:p-6 md:p-8 flex flex-col overflow-hidden min-h-0">
            <h1 className="text-2xl xs:text-3xl sm:text-[32px] md:text-[40px] font-bold text-center mb-3 sm:mb-5 flex-shrink-0 text-white border-b-2 border-white/30 pb-2" style={{ textShadow: '2px 2px 6px rgba(0,0,0,0.6), 0 0 2px rgba(0,0,0,0.4)' }}>
              {t('lobby_title')}
            </h1>
            {quizData && (
              <div className="text-center mb-3 sm:mb-4 flex-shrink-0">
                <div className="text-sm sm:text-base md:text-lg font-bold text-white mb-1 sm:mb-2" style={{ textShadow: '1px 1px 3px rgba(0,0,0,0.6)' }}>
                  Quiz: {quizData.title}
                </div>
                {mapData && (
                  <div className="text-xs sm:text-sm md:text-base font-semibold text-white" style={{ textShadow: '1px 1px 3px rgba(0,0,0,0.6)' }}>
                    Map: {mapData.name}
                  </div>
                )}
              </div>
            )}
            <p className="text-center text-lg sm:text-xl md:text-[28px] font-bold text-white my-3 sm:my-5 flex-shrink-0" style={{ textShadow: '1px 1px 4px rgba(0,0,0,0.6)' }}>
              {session?.status === 'FINISHED' ? t('common_gameOver') : session?.status === 'PLAYING' ? t('lobby_gameStarting') : t('lobby_waitingForPlayers')}
            </p>
            <div className="flex-1 overflow-y-auto mt-3 sm:mt-5 bg-white/40 p-3 sm:p-4 rounded-lg sm:rounded-[10px] min-h-0 shadow-lg border-2 border-black/20" style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}>
              <div className="text-lg sm:text-xl md:text-2xl font-bold text-white mb-3 sm:mb-4" style={{ textShadow: '1px 1px 3px rgba(0,0,0,0.6)' }}>
                {t('lobby_players')}
              </div>
              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                {displayList.map((p) => (
                  <div
                    key={p.id}
                    className="relative rounded-lg min-h-[56px] sm:min-h-[60px] flex items-center gap-1.5 sm:gap-2 p-1.5 sm:p-2 px-2 sm:px-3 bg-[#8eae5c] shadow-md border-2 border-[#5a6e3a]"
                    style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.2)' }}
                  >
                    {!p.isHost && isTeacher && session?.status !== 'FINISHED' && (
                      <button
                        type="button"
                        onClick={() => handleKickPlayer(p.id)}
                        className="absolute top-1 right-1 w-8 h-8 sm:w-7 sm:h-7 flex items-center justify-center rounded-full bg-red-500 hover:bg-red-600 text-white border border-red-700 shadow transition-colors touch-manipulation"
                        title="Remove player"
                        aria-label={`Remove ${p.name}`}
                      >
                        <FaTimes size={14} />
                      </button>
                    )}
                    <div
                      className="w-9 h-9 xs:w-10 xs:h-10 sm:w-11 sm:h-11 rounded-full overflow-hidden border-2 border-white flex-shrink-0"
                      style={{ backgroundColor: getAvatarBgColor(p.avatar || getDefaultAvatarByGender(p.gender)) }}
                    >
                      <img src={getAvatarSrc(p.avatar || getDefaultAvatarByGender(p.gender), p.gender)} alt="" className="w-full h-full object-cover" onError={(e) => (e.target.src = getAvatarSrc(getDefaultAvatarByGender(p.gender), p.gender))} />
                    </div>
                    <div className="min-w-0 flex-1 flex flex-col justify-center">
                      <span className="text-white font-bold truncate pr-6 sm:pr-8 block text-sm sm:text-base" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>{p.name}</span>
                      {p.isHost && (
                        <span className="text-amber-200 text-[10px] xs:text-xs font-semibold uppercase tracking-wide" style={{ textShadow: '0 0 1px black' }}>Host</span>
                      )}
                    </div>
                  </div>
                ))}
                {Array.from({ length: emptySlots }).map((_, i) => (
                  <div key={`e-${i}`} className="rounded-lg min-h-[56px] sm:min-h-[60px] bg-gray-300 shadow-inner border-2 border-dashed border-gray-500" style={{ boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.15)' }} />
                ))}
              </div>
            </div>
          </div>

          {/* Action panel - full width at bottom on mobile, sidebar on md+ */}
          <div className="w-full md:w-[180px] md:min-w-[180px] bg-[#8b7355] flex flex-row md:flex-col items-center justify-center md:justify-end gap-3 sm:gap-4 md:gap-8 p-4 sm:p-6 md:p-10 md:px-5 flex-shrink-0 flex-wrap shadow-lg border-t-2 md:border-t-0 md:border-l-[3px] border-black/30" style={{ boxShadow: '0 -2px 10px rgba(0,0,0,0.15)' }}>
            {isTeacher && session?.status === 'WAITING' && (
              <button
                onClick={handleEditGame}
                className="flex-1 md:flex-none md:w-full py-3 sm:py-4 px-3 sm:px-2.5 rounded-xl bg-[#6b8e3f] shadow-lg hover:bg-[#5a7d2e] transition-colors touch-manipulation min-h-[44px] border-2 border-[#2d5016]"
                style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.25)' }}
                title="Change map or game settings"
              >
                <div className="flex flex-col items-center gap-1 sm:gap-2">
                  <FaEdit className="text-white flex-shrink-0" size={32} />
                  <span className="text-white font-bold text-sm sm:text-base" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.4)' }}>CHANGE MAP</span>
                </div>
              </button>
            )}
            {isTeacher && session?.status !== 'FINISHED' && (
              <button
                onClick={handleStartGame}
                disabled={uniquePlayers.length === 0}
                title={uniquePlayers.length === 0 ? 'At least one player must join the lobby' : ''}
                className="flex-1 md:flex-none md:w-full py-3 sm:py-4 px-3 sm:px-2.5 rounded-xl bg-[#4caf50] shadow-lg hover:bg-[#45a049] disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:bg-[#4caf50] touch-manipulation min-h-[44px] border-2 border-[#2e7d32]"
                style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.25)' }}
              >
                <div className="flex flex-col items-center gap-1 sm:gap-2">
                  <FaPlay className="text-white flex-shrink-0" size={32} />
                  <span className="text-white font-bold text-sm sm:text-base" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.4)' }}>{t('lobby_startGame')}</span>
                </div>
              </button>
            )}
            {isTeacher && session?.status === 'FINISHED' && (
              <button
                onClick={handleRestartLobby}
                disabled={restarting}
                className="flex-1 md:flex-none md:w-full py-3 sm:py-4 px-3 sm:px-2.5 rounded-xl bg-[#4caf50] shadow-lg hover:bg-[#45a049] disabled:opacity-70 touch-manipulation min-h-[44px] border-2 border-[#2e7d32]"
                style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.25)' }}
              >
                <div className="flex flex-col items-center gap-1 sm:gap-2">
                  <FaPlay className="text-white flex-shrink-0" size={32} />
                  <span className="text-white font-bold text-sm sm:text-base" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.4)' }}>
                    {restarting ? t('lobby_resetting') : t('lobby_resetLobby')}
                  </span>
                </div>
              </button>
            )}
            <button
              onClick={handleLeave}
              className="flex-1 md:flex-none md:w-full py-3 sm:py-4 px-3 sm:px-2.5 rounded-xl bg-[#dc3545] shadow-lg hover:bg-[#c82333] touch-manipulation min-h-[44px] border-2 border-[#a71d2a]"
              style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.25)' }}
            >
              <div className="flex flex-col items-center gap-1 sm:gap-2">
                <FaSignOutAlt className="text-white flex-shrink-0" size={32} />
                <span className="text-white font-bold text-sm sm:text-base" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.4)' }}>{t('lobby_leaveLobbyBtn')}</span>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Delete classroom confirmation modal (teacher only) */}
      {isTeacher && showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-5 sm:p-6 border-2 border-red-300">
            <h2 className="text-lg sm:text-xl font-bold mb-3 text-gray-900">
              Delete Classroom?
            </h2>
            <p className="text-sm sm:text-base text-gray-700 mb-4">
              This will permanently delete this classroom and all of its associated data
              (classes, game history, and leaderboards). Students will no longer have access.
              This action cannot be undone.
            </p>
            <div className="flex flex-col sm:flex-row gap-2 mt-2">
              <button
                type="button"
                onClick={confirmDeleteClassroom}
                disabled={deletingClass}
                className="flex-1 min-h-[44px] px-4 py-2.5 rounded-lg font-bold text-white bg-red-600 hover:bg-red-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
              >
                {deletingClass ? 'Deleting...' : 'Yes, delete classroom'}
              </button>
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                disabled={deletingClass}
                className="flex-1 min-h-[44px] px-4 py-2.5 rounded-lg font-bold text-gray-800 bg-gray-200 hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Lobby;
