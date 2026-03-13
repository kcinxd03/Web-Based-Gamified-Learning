import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaEdit, FaTrash, FaGamepad } from 'react-icons/fa';
import { quizAPI, gameSessionAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useLanguage } from '../context/LanguageContext';

const GameContent = ({ classData }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { socket, joinClass, leaveClass } = useSocket();
  const { t } = useLanguage();
  const [quizzes, setQuizzes] = useState([]);
  const [activeSessions, setActiveSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [joiningSessionId, setJoiningSessionId] = useState(null);

  const isTeacher = user?.accountType === 'TEACHER';
  const handleDeleteQuiz = async (quizId, quizTitle) => {
    if (!window.confirm(`Are you sure you want to delete "${quizTitle}"? This action cannot be undone.`)) {
      return;
    }
    try {
      await quizAPI.deleteQuiz(quizId);
      fetchQuizzes();
    } catch (err) {
      console.error('Error deleting quiz:', err);
      alert(err.response?.data?.message || 'Failed to delete quiz. Please try again.');
    }
  };

  // Fetch quizzes for the current class
  const fetchQuizzes = async () => {
    const classId = classData?.id ?? classData?._id;
    if (!classData || !classId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const result = await quizAPI.getClassQuizzes(classId);
      setQuizzes(result.quizzes || []);
    } catch (err) {
      console.error('Error fetching quizzes:', err);
      setError(err.response?.data?.message || 'Failed to load quizzes. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Safety: prevent endless "Loading quizzes" if fetch never resolves
  useEffect(() => {
    if (!loading || !classData?.id) return;
    const timer = setTimeout(() => setLoading(false), 8000);
    return () => clearTimeout(timer);
  }, [loading, classData?.id]);

  // Fetch active game sessions for students (updates state)
  const fetchActiveSessions = async () => {
    if (!classData?.id || isTeacher) return;
    try {
      const result = await gameSessionAPI.getActiveSessionsForClass(classData.id);
      setActiveSessions(result.sessions || []);
    } catch (err) {
      console.error('Error fetching active sessions:', err);
    }
  };

  // Fetch and return latest active sessions (for use when joining so we never use a stale/finished session)
  const fetchActiveSessionsFresh = async () => {
    if (!classData?.id || isTeacher) return [];
    try {
      const result = await gameSessionAPI.getActiveSessionsForClass(classData.id);
      const sessions = result.sessions || [];
      setActiveSessions(sessions);
      return sessions;
    } catch (err) {
      console.error('Error fetching active sessions:', err);
      return [];
    }
  };

  useEffect(() => {
    fetchQuizzes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classData?.id]);

  useEffect(() => {
    if (!isTeacher && classData?.id) {
      fetchActiveSessions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classData?.id, isTeacher]);

  // Refetch active sessions after a short delay so we catch new games started right after game ends
  useEffect(() => {
    if (isTeacher || !classData?.id) return;
    const timer = setTimeout(() => {
      fetchActiveSessions();
    }, 2000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classData?.id, isTeacher]);

  // Refetch when tab becomes visible (e.g. student returns after game ended)
  useEffect(() => {
    if (!classData?.id) return;
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        if (!isTeacher) {
          fetchActiveSessions();
          fetchQuizzes(); // refresh singlePlayerAlreadyPlayed after playing
        }
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classData?.id, isTeacher]);

  // Join class room for real-time updates (use same id format as backend: class-{id})
  useEffect(() => {
    const classId = classData?.id ?? classData?._id;
    if (classId && socket) {
      joinClass(classId);
      return () => {
        leaveClass(classId);
      };
    }
  }, [classData?.id, classData?._id, socket, joinClass, leaveClass]);

  // Listen for real-time quiz creation
  useEffect(() => {
    const classId = classData?.id ?? classData?._id;
    if (!socket || !classId) return;

    const handleQuizCreated = (data) => {
      if (data.quiz && data.quiz.class) {
        const quizClassId = data.quiz.class._id || data.quiz.class.id || data.quiz.class;
        if (String(quizClassId) === String(classId)) {
          setQuizzes(prev => {
            // Check if quiz already exists
            const exists = prev.some(q => String(q.id) === String(data.quiz.id));
            if (!exists) {
              return [data.quiz, ...prev];
            }
            return prev;
          });
        }
      }
    };

    const handleQuizDeleted = (data) => {
      if (data.quizId) {
        setQuizzes(prev => prev.filter(q => String(q.id) !== String(data.quizId)));
      }
    };

    const handleGameSessionCreated = (data) => {
      if (!data.gameSession) return;
      const gs = data.gameSession;
      const currentClassId = classData?.id ?? classData?._id;
      if (!currentClassId) return;
      const sessionClassId = gs.class?._id ?? gs.class?.id ?? gs.class ?? gs.classId;
      const isForThisClass = sessionClassId != null && String(sessionClassId) === String(currentClassId);
      if (!isForThisClass) return;
      if (gs.status === 'FINISHED') return;
      if (!sessionHasMap(gs)) return;
      setActiveSessions((prev) => {
        const exists = prev.some((s) => String(s.id ?? s._id) === String(gs.id ?? gs._id));
        if (exists) return prev;
        return [...prev, { ...gs, id: gs.id ?? gs._id }];
      });
      // Game invitation notification is shown by Classroom.jsx so it works on any tab
    };

    const handleGameSessionUpdated = (data) => {
      if (!data.gameSession) return;
      const gs = data.gameSession;
      const currentClassId = classData?.id ?? classData?._id;
      if (!currentClassId) return;
      const sessionClassId = gs.class?._id ?? gs.class?.id ?? gs.class ?? gs.classId;
      if (sessionClassId == null || String(sessionClassId) !== String(currentClassId)) return;
      setActiveSessions((prev) => {
        if (gs.status === 'FINISHED' || !sessionHasMap(gs)) {
          return prev.filter((s) => String(s.id ?? s._id) !== String(gs.id ?? gs._id));
        }
        const idx = prev.findIndex((s) => String(s.id ?? s._id) === String(gs.id ?? gs._id));
        const next = [...prev];
        if (idx >= 0) next[idx] = { ...gs, id: gs.id ?? gs._id };
        else next.push({ ...gs, id: gs.id ?? gs._id });
        return next;
      });
    };

    socket.on('quiz-created', handleQuizCreated);
    socket.on('quiz-deleted', handleQuizDeleted);
    socket.on('game-session-created', handleGameSessionCreated);
    socket.on('game-session-updated', handleGameSessionUpdated);

    return () => {
      socket.off('quiz-created', handleQuizCreated);
      socket.off('quiz-deleted', handleQuizDeleted);
    socket.off('game-session-created', handleGameSessionCreated);
    socket.off('game-session-updated', handleGameSessionUpdated);
    };
  }, [socket, classData?.id, classData?._id]);

  // Only show game (joinable session) when teacher has finished selecting a map
  const sessionHasMap = (s) => {
    const m = s?.map;
    return m && typeof m === 'object' && (m.id != null || (m.name && m.name.trim()) || (m.image && m.image.trim()));
  };

  const getSessionForQuiz = (quizId) => {
    const qid = String(quizId);
    const session = activeSessions.find(
      (s) =>
        s.status !== 'FINISHED' &&
        s.quiz &&
        (String(s.quiz._id) === qid || String(s.quiz.id) === qid) &&
        sessionHasMap(s)
    );
    if (session && session.quiz && String(session.quiz._id || session.quiz.id) !== qid) {
      return undefined;
    }
    return session;
  };

  const findSessionForQuizFromList = (sessions, quizId) => {
    const qid = String(quizId);
    return sessions.find(
      (s) =>
        s.status !== 'FINISHED' &&
        s.quiz &&
        (String(s.quiz._id) === qid || String(s.quiz.id) === qid)
    );
  };

  const openLobbyForSession = (quiz, gs) => {
    const sid = gs?.id ?? gs?._id;
    if (!sid) return;
    const joinedQuiz = gs.quiz || quiz;
    const joinedMap = gs.map || null;
    const joinedClass = gs.class
      ? {
          id: gs.class._id || gs.class.id,
          subject: gs.class.subject,
          gradeLevel: gs.class.gradeLevel,
          section: gs.class.section,
          classCode: gs.class.classCode,
          teacher: gs.class.teacher,
          teacherName: gs.class.teacher ? `${gs.class.teacher.firstName || ''} ${gs.class.teacher.lastName || ''}`.trim() : ''
        }
      : classData;
    navigate(`/lobby/${sid}`, {
      state: { quiz: joinedQuiz, map: joinedMap, classData: joinedClass, gameSession: gs }
    });
  };

  const handleJoinGame = async (quiz) => {
    if (!classData || !classData.id) {
      alert('Class data is missing. Please try again.');
      return;
    }

    const singlePlayer = quiz?.gameMode === 'SINGLE';

    // --- Student: single player = create session and go straight to gameplay (no lobby). One play per student per quiz. ---
    if (!isTeacher && singlePlayer) {
      if (quiz.singlePlayerAlreadyPlayed) {
        return; // Button shows "ALREADY PLAYED", no alert
      }
      setJoiningSessionId(quiz.id || quiz._id);
      try {
        const result = await gameSessionAPI.createGameSession({
          quizId: quiz.id || quiz._id,
          classId: classData.id
        });
        const session = result?.gameSession;
        const sid = session?.id ?? session?._id;
        if (sid && session?.status === 'PLAYING') {
          navigate(`/gameplay/${sid}`, {
            state: { quiz, classData, gameSession: session, map: session?.map }
          });
          return;
        }
        alert('Failed to start game. Please try again.');
      } catch (err) {
        console.error('Error starting single-player game:', err);
        const msg = err.response?.data?.message || err.message || '';
        const isAlreadyPlayed = msg.toLowerCase().includes('already played') || err.response?.status === 403;
        if (isAlreadyPlayed) {
          // Mark this quiz as already played in state so button shows "ALREADY PLAYED" immediately
          const quizId = quiz?.id ?? quiz?._id;
          if (quizId) {
            setQuizzes((prev) =>
              prev.map((q) =>
                (q.id ?? q._id) === quizId ? { ...q, singlePlayerAlreadyPlayed: true } : q
              )
            );
          }
          fetchQuizzes(); // Also refetch to stay in sync with server
        } else {
          alert(msg || 'Failed to start game. Please try again.');
        }
      } finally {
        setJoiningSessionId(null);
      }
      return;
    }

    if (!isTeacher) {
      const quizId = quiz.id || quiz._id;
      const freshSessions = await fetchActiveSessionsFresh();
      const session = findSessionForQuizFromList(freshSessions, quizId);
      if (session) {
        if (session.status === 'FINISHED') {
          openLobbyForSession(quiz, session);
          return;
        }
        await handleStudentJoinGame(quiz, session);
        return;
      }
      try {
        const res = await gameSessionAPI.getLatestSessionForQuiz(classData.id, quizId);
        const gs = res.gameSession;
        if (gs) {
          openLobbyForSession(quiz, gs);
          return;
        }
      } catch (e) {
        if (e.response?.status !== 404) console.error(e);
      }
      alert('No teachers are in the lobby to start a game. Ask your teacher to start a new game.');
      return;
    }

    // --- Teacher ---
    try {
      const quizIdToSend = quiz.id ?? quiz._id;
      const classIdToSend = classData.id ?? classData._id;
      const result = await gameSessionAPI.createGameSession({
        quizId: quizIdToSend,
        classId: classIdToSend
      });

      if (result.gameSession) {
        const session = result.gameSession;
        const map = session.map;
        const isExistingSession = result.message === 'Active game session found';
        const isNewSession = result.message === 'Game session created successfully';
        const hasMap = map != null &&
          typeof map === 'object' &&
          !Array.isArray(map) &&
          Object.keys(map).length > 0 &&
          (map.id != null || map.name != null || map.image != null || map.description != null);

        if (singlePlayer) {
          // Single player: no lobby; go to map selection if no map, else start and go to gameplay
          const sid = session?.id ?? session?._id;
          if (!sid) {
            alert('Failed to create game session. Please try again.');
            return;
          }
          if (!hasMap) {
            navigate('/map-selection', {
              state: {
                quiz,
                classData,
                gameSession: session,
                singlePlayer: true
              }
            });
            return;
          }
          // Single-player is for students; teacher does not enter gameplay
          try {
            await gameSessionAPI.updateGameSession(sid, { status: 'PLAYING' });
          } catch (err) {
            console.error('Error updating game session:', err);
          }
          navigate('/classroom', { state: { classData, activeNav: 'game' } });
          return;
        }

        // Multiplayer: lobby flow
        const defaultMap = { id: 1, name: 'City Map', description: 'Explore the urban landscape', image: '/Maps/City.png' };
        const mapToUse = hasMap ? map : defaultMap;

        if (isExistingSession || hasMap || isNewSession) {
          const sid = session?.id ?? session?._id;
          navigate(sid ? `/lobby/${sid}` : '/lobby', {
            state: {
              quiz: quiz,
              classData: classData,
              gameSession: session,
              map: mapToUse
            }
          });
        } else {
          navigate('/map-selection', {
            state: {
              quiz: quiz,
              classData: classData,
              gameSession: session
            }
          });
        }
      } else {
        alert('Failed to create game session. Please try again.');
      }
    } catch (err) {
      console.error('Error creating game session:', err);
      alert(err.response?.data?.message || 'Failed to create game session. Please try again.');
    }
  };

  const handleStudentJoinGame = async (quiz, session) => {
    const sessionId = String(session?.id || session?._id || '');
    const quizId = String(quiz?.id || quiz?._id || '');
    if (!sessionId) return;
    setJoiningSessionId(sessionId);
    const NO_LOBBY_MSG = 'No teachers are in the lobby to start a game. Ask your teacher to start a new game.';
    try {
      let result;
      try {
        result = await gameSessionAPI.joinGameSession({ sessionId });
      } catch (joinErr) {
        const msg = (joinErr.response?.data?.message || '').toLowerCase();
        const status = joinErr.response?.status;
        const isFinished = status === 400 && msg.includes('game has finished');
        const noTeacher = (status === 400 || status === 403) && (msg.includes('teacher') || msg.includes('lobby'));
        const notInClass = status === 403 && msg.includes('class');
        if (isFinished) {
          try {
            const res = await gameSessionAPI.getGameSessionById(sessionId);
            const gs = res.gameSession || res;
            if (gs) {
              openLobbyForSession(quiz, gs);
              return;
            }
          } catch (e) {
            console.error(e);
          }
          alert(NO_LOBBY_MSG);
          return;
        }
        if (noTeacher || notInClass) {
          alert(NO_LOBBY_MSG);
          return;
        }
        throw joinErr;
      }
      if (!result?.gameSession) {
        alert(NO_LOBBY_MSG);
        return;
      }
      const gs = result.gameSession;
      // Ensure we joined the session we requested (avoid showing wrong game lobby)
      const returnedSessionId = String(gs.id ?? gs._id ?? '');
      if (returnedSessionId !== String(sessionId)) {
        alert('Joined a different game than expected. Please try again.');
        return;
      }
      const returnedQuizId = String(gs.quiz?._id ?? gs.quiz?.id ?? '');
      if (quizId && returnedQuizId && returnedQuizId !== quizId) {
        alert('This game is for a different quiz. Please join from the correct quiz.');
        return;
      }
      // Use only the joined game's data so we never show another game's lobby
      const joinedQuiz = gs.quiz || quiz;
      const joinedMap = gs.map || null;
      const joinedClass = gs.class
        ? {
            id: gs.class._id || gs.class.id,
            subject: gs.class.subject,
            gradeLevel: gs.class.gradeLevel,
            section: gs.class.section,
            classCode: gs.class.classCode,
            teacher: gs.teacher,
            teacherName: gs.teacher ? `${gs.teacher.firstName || ''} ${gs.teacher.lastName || ''}`.trim() : ''
          }
        : classData;
      const state = {
        quiz: joinedQuiz,
        map: joinedMap,
        classData: joinedClass,
        gameSession: gs
      };
      const sid = gs?.id ?? gs?._id;
      if (gs.status === 'PLAYING') {
        navigate(joinedClass ? '/classroom' : '/my-class', { state: { classData: joinedClass, activeNav: 'game' } });
      } else {
        navigate(sid ? `/lobby/${sid}` : '/lobby', { state });
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to join game. Please try again.';
      if (!msg.toLowerCase().includes('game') && !msg.toLowerCase().includes('lobby') && !msg.toLowerCase().includes('teacher')) {
        console.error('Error joining game:', err);
      }
      alert(msg);
    } finally {
      setJoiningSessionId(null);
    }
  };

  // Helper function to get background color based on difficulty
  const getDifficultyColor = (difficulty) => {
    if (difficulty === 'Easy') return '#90EE90'; // Light green
    if (difficulty === 'Medium') return '#D2B48C'; // Light brown
    if (difficulty === 'Hard') return '#8B4513'; // Dark brown
    return '#9CAF88'; // Default gray-green
  };

  // Helper function to format difficulty for display (translated)
  const formatDifficulty = (difficulty) => {
    if (!difficulty) return t('gameContent_medium');
    const d = String(difficulty).toLowerCase();
    if (d === 'easy') return t('gameContent_easy');
    if (d === 'hard') return t('gameContent_hard');
    return t('gameContent_medium');
  };

  return (
    <>
      <style>{`
        .game-list-scroll::-webkit-scrollbar {
          width: 8px;
        }
        .game-list-scroll::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.2);
          border-radius: 4px;
        }
        .game-list-scroll::-webkit-scrollbar-thumb {
          background: rgba(0, 0, 0, 0.3);
          border-radius: 4px;
        }
        .game-list-scroll::-webkit-scrollbar-thumb:hover {
          background: rgba(0, 0, 0, 0.5);
        }
      `}</style>
      <div className="flex-1 w-full min-w-0 p-4 xs:p-5 sm:p-6 md:p-8 overflow-y-auto">
        <div className="w-full max-w-3xl mx-auto">
        {/* Title */}
        <div className="flex flex-col items-center mb-4 sm:mb-6">
          <div 
            className="px-4 sm:px-6 md:px-8 py-2 rounded-lg relative"
            style={{ 
              backgroundColor: '#8B4513',
              clipPath: 'polygon(0 0, calc(100% - 20px) 0, 100% 50%, calc(100% - 20px) 100%, 0 100%)'
            }}
          >
            <h1 className="text-xl sm:text-2xl font-bold text-white">{t('gameContent_games')}</h1>
          </div>
        </div>

        {/* Games List */}
        <div className="game-list-scroll space-y-3 sm:space-y-4 max-h-[calc(100vh-140px)] sm:max-h-[calc(100vh-150px)] overflow-y-auto pr-1 sm:pr-2">
          {loading ? (
            <div className="text-center text-white py-8">
              <p style={{ textShadow: '2px 2px 4px rgba(0, 0, 0, 1)' }}>{t('gameContent_loadingQuizzes')}</p>
            </div>
          ) : error ? (
            <div className="text-center text-white py-8">
              <p style={{ textShadow: '2px 2px 4px rgba(0, 0, 0, 1)' }}>{error}</p>
            </div>
          ) : quizzes.length === 0 ? (
            <div className="text-center text-white py-8">
              <p style={{ textShadow: '2px 2px 4px rgba(0, 0, 0, 1)' }}>
                {t('gameContent_noQuizzes')}
              </p>
            </div>
          ) : (
            quizzes.map((quiz) => (
              <div
                key={quiz.id}
              className="rounded-lg p-3 sm:p-4 shadow-2xl"
              style={{
                  backgroundColor: getDifficultyColor(quiz.difficulty),
                border: '3px solid rgba(0, 0, 0, 0.5)'
              }}
            >
                {/* Quiz Title and teacher actions: Edit/Delete */}
                <div className="flex flex-wrap items-start sm:items-center justify-between gap-2 mb-3">
                  <h2 
                    className="text-base sm:text-lg md:text-xl font-bold flex-1 min-w-0"
                    style={{ 
                      color: 'white',
                      textShadow: '2px 2px 4px rgba(0, 0, 0, 1)'
                    }}
                  >
                    {quiz.title}
                  </h2>
                  {user?.accountType === 'TEACHER' && (
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => navigate('/create-quiz', { state: { classData, editQuizId: quiz.id ?? quiz._id } })}
                        className="p-2 rounded-lg hover:opacity-90 transition-opacity touch-manipulation min-w-[40px] min-h-[40px] flex items-center justify-center"
                        style={{
                          backgroundColor: 'rgba(59, 130, 246, 0.9)',
                          border: '2px solid rgba(0, 0, 0, 0.5)'
                        }}
                        title="Edit Quiz"
                      >
                        <FaEdit className="text-white" size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteQuiz(quiz.id ?? quiz._id, quiz.title)}
                        className="p-2 rounded-lg hover:bg-red-600 transition-colors touch-manipulation min-w-[40px] min-h-[40px] flex items-center justify-center"
                        style={{
                          backgroundColor: 'rgba(220, 38, 38, 0.8)',
                          border: '2px solid rgba(0, 0, 0, 0.5)'
                        }}
                        title="Delete Quiz"
                      >
                        <FaTrash className="text-white" size={16} />
                      </button>
                    </div>
                  )}
                </div>

              {/* Game Details */}
              <div className="space-y-2 mb-3">
                  {/* Quiz Description */}
                  {quiz.description && (
                  <div>
                    <h3 
                      className="font-bold mb-1 text-xs"
                      style={{ 
                        color: 'white',
                        textShadow: '2px 2px 4px rgba(0, 0, 0, 1)'
                      }}
                    >
                      QUIZ DESCRIPTION:
                    </h3>
                    <p 
                      className="text-xs leading-relaxed"
                      style={{ 
                        color: 'white',
                        textShadow: '2px 2px 4px rgba(0, 0, 0, 1)'
                      }}
                    >
                        {quiz.description}
                    </p>
                  </div>
                  )}

                {/* Game Info Items and Join Button */}
                <div className="flex flex-col xs:flex-row items-stretch xs:items-center justify-between gap-3 sm:gap-4 mt-4">
                  <div className="flex flex-wrap gap-3 sm:gap-4">
                    {/* Game Difficulty */}
                    <div>
                      <h4 
                        className="font-bold text-xs mb-0.5"
                        style={{ 
                          color: 'white',
                          textShadow: '2px 2px 4px rgba(0, 0, 0, 1)'
                        }}
                      >
                        {t('gameContent_difficultyLabel')}
                      </h4>
                      <p 
                        className="font-semibold text-xs"
                        style={{ 
                          color: 'white',
                          textShadow: '2px 2px 4px rgba(0, 0, 0, 1)'
                        }}
                      >
                          {formatDifficulty(quiz.difficulty)}
                      </p>
                    </div>

                      {/* Question Count */}
                    <div>
                      <h4 
                        className="font-bold text-xs mb-0.5"
                        style={{ 
                          color: 'white',
                          textShadow: '2px 2px 4px rgba(0, 0, 0, 1)'
                        }}
                      >
                          {t('gameContent_questions')}
                      </h4>
                      <p 
                        className="font-semibold text-xs"
                        style={{ 
                          color: 'white',
                          textShadow: '2px 2px 4px rgba(0, 0, 0, 1)'
                        }}
                      >
                          {quiz.questionCount || 0}
                      </p>
                    </div>

                    {/* Game Mode */}
                    <div>
                      <h4 
                        className="font-bold text-xs mb-0.5"
                        style={{ 
                          color: 'white',
                          textShadow: '2px 2px 4px rgba(0, 0, 0, 1)'
                        }}
                      >
                          MODE
                      </h4>
                      <p 
                        className="font-semibold text-xs"
                        style={{ 
                          color: 'white',
                          textShadow: '2px 2px 4px rgba(0, 0, 0, 1)'
                        }}
                      >
                          {quiz.gameMode === 'SINGLE' ? 'SINGLE PLAYER' : 'MULTIPLAYER'}
                      </p>
                    </div>
                  </div>

                  {/* Play Game (single) or Join Game (multiplayer) */}
                  {(() => {
                    const singlePlayer = quiz?.gameMode === 'SINGLE';
                    const buttonLabel = singlePlayer ? t('gameContent_playGame') : t('gameContent_joinGameBtn');
                    const joiningLabel = singlePlayer ? t('gameContent_starting') : t('gameContent_joining');
                    const btnClass = 'px-4 sm:px-6 py-2.5 sm:py-2 rounded-lg font-semibold text-sm flex-shrink-0 min-h-[44px] touch-manipulation';
                    return isTeacher ? (
                      singlePlayer ? (
                        <button
                          type="button"
                          disabled
                          className={`${btnClass} cursor-not-allowed opacity-70`}
                          style={{
                            backgroundColor: '#4a5568',
                            border: '2px solid #2d3748',
                            color: '#a0aec0',
                            textShadow: '1px 1px 2px rgba(0, 0, 0, 0.5)'
                          }}
                          title="Play Game is for students only"
                        >
                          {buttonLabel}
                        </button>
                      ) : (
                        <button
                          onClick={() => handleJoinGame(quiz)}
                          className={`${btnClass} text-white transition-colors hover:opacity-90`}
                          style={{
                            backgroundColor: '#6b8e3f',
                            border: '2px solid #2d5016',
                            textShadow: '1px 1px 2px rgba(0, 0, 0, 0.5)'
                          }}
                        >
                          {buttonLabel}
                        </button>
                      )
                    ) : (
                      singlePlayer ? (
                        quiz.singlePlayerAlreadyPlayed ? (
                          <button
                            type="button"
                            disabled
                            className={`${btnClass} cursor-not-allowed opacity-70`}
                            style={{
                              backgroundColor: '#4a5568',
                              border: '2px solid #2d3748',
                              color: '#a0aec0',
                              textShadow: '1px 1px 2px rgba(0, 0, 0, 0.5)'
                            }}
                            title="You can only play this single-player quiz once"
                          >
                            ALREADY PLAYED
                          </button>
                        ) : (
                          <button
                            onClick={() => handleJoinGame(quiz)}
                            disabled={!!joiningSessionId}
                            className="px-4 sm:px-6 py-2.5 sm:py-2 rounded-lg font-semibold text-white text-sm transition-colors hover:opacity-90 flex-shrink-0 disabled:opacity-70 min-h-[44px] touch-manipulation"
                            style={{
                              backgroundColor: '#6b8e3f',
                              border: '2px solid #2d5016',
                              textShadow: '1px 1px 2px rgba(0, 0, 0, 0.5)'
                            }}
                          >
                            {joiningSessionId ? 'STARTING...' : 'PLAY GAME'}
                          </button>
                        )
                      ) : (
                        getSessionForQuiz(quiz.id || quiz._id) ? (
                          <button
                            onClick={() => handleJoinGame(quiz)}
                            disabled={!!joiningSessionId}
                            className="px-4 sm:px-6 py-2.5 sm:py-2 rounded-lg font-semibold text-white text-sm transition-colors hover:opacity-90 flex-shrink-0 disabled:opacity-70 min-h-[44px] touch-manipulation"
                            style={{
                              backgroundColor: '#6b8e3f',
                              border: '2px solid #2d5016',
                              textShadow: '1px 1px 2px rgba(0, 0, 0, 0.5)'
                            }}
                          >
                            {joiningSessionId ? joiningLabel : buttonLabel}
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled
                            className="px-4 sm:px-6 py-2.5 sm:py-2 rounded-lg font-semibold text-sm flex-shrink-0 min-h-[44px] touch-manipulation cursor-not-allowed opacity-70"
                            style={{
                              backgroundColor: '#4a5568',
                              border: '2px solid #2d3748',
                              color: '#a0aec0',
                              textShadow: '1px 1px 2px rgba(0, 0, 0, 0.5)'
                            }}
                            title={t('gameContent_waitingForTeacher')}
                          >
                            {t('gameContent_waitingForTeacher')}
                          </button>
                        )
                      )
                    );
                  })()}
                </div>
              </div>
            </div>
            ))
          )}
        </div>
      </div>
      </div>
    </>
  );
};

export default GameContent;

