import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaGamepad, FaTimes } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useLanguage } from '../context/LanguageContext';
import { classAPI, gameSessionAPI } from '../services/api';

const SETTINGS_GAME_INVITATION_KEY = 'settings_gameInvitationNotification';

const GameInvitationOverlay = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { socket, joinClass } = useSocket();
  const { t } = useLanguage();
  const [notification, setNotification] = useState(null);
  const joinedClassIdsRef = useRef([]);

  const gameInvitationEnabled = () => {
    try {
      return localStorage.getItem(SETTINGS_GAME_INVITATION_KEY) !== 'false';
    } catch {
      return true;
    }
  };

  useEffect(() => {
    if (!socket || user?.accountType !== 'STUDENT') return;

    const joinAllClasses = (ids) => {
      ids.forEach((id) => {
        if (id) joinClass(id);
      });
    };

    const loadAndJoinClasses = async () => {
      try {
        const res = await classAPI.getStudentClasses();
        const ids = (res?.classes || [])
          .map((c) => String(c.id ?? c._id ?? ''))
          .filter(Boolean);
        joinedClassIdsRef.current = ids;
        joinAllClasses(ids);
      } catch (e) {
        console.warn('Failed to load student classes for notifications:', e);
      }
    };

    loadAndJoinClasses();
    const onConnect = () => joinAllClasses(joinedClassIdsRef.current);
    socket.on('connect', onConnect);
    return () => socket.off('connect', onConnect);
  }, [socket, user?.accountType, joinClass]);

  useEffect(() => {
    if (!socket || user?.accountType !== 'STUDENT') return;

    const handleGameSessionCreated = (data) => {
      if (!gameInvitationEnabled()) return;
      if (!data?.gameSession) return;
      const gs = data.gameSession;
      const notificationType = data.notificationType || 'multiplayer';
      const myId = String(user?._id ?? user?.id ?? '');
      if (notificationType === 'single-player' && myId && String(data.startedByStudentId ?? '') === myId) return;
      if (gs.status === 'FINISHED') return;
      const sessionId = gs.id ?? gs._id;
      if (!sessionId) return;
      const quizTitle = gs.quiz?.title || 'A game';
      const gameMode = String(gs.quiz?.gameMode ?? '').toUpperCase();
      const classData = gs.class
        ? { id: gs.class._id ?? gs.class.id, _id: gs.class._id ?? gs.class.id, ...gs.class }
        : null;

      setNotification((prev) => {
        if (prev?.sessionId === String(sessionId)) return prev;
        return {
          type: notificationType === 'single-player' ? 'single-player-info' : 'game-invitation',
          sessionId: String(sessionId),
          message: notificationType === 'single-player'
            ? t('studentHome_singlePlayerNotificationMessage', {
                playerName: data.startedByStudentName || 'A student',
                quizTitle
              })
            : gameMode === 'SINGLE'
              ? t('studentHome_teacherSinglePlayerNotificationMessage', { quizTitle })
              : t('studentHome_notificationMessage', { quizTitle }),
          gameSession: gs,
          classData,
        };
      });
    };

    socket.on('game-session-created', handleGameSessionCreated);
    return () => socket.off('game-session-created', handleGameSessionCreated);
  }, [socket, user?.accountType, user?._id, user?.id, t]);

  useEffect(() => {
    if (!notification) return undefined;
    const timer = setTimeout(() => {
      setNotification(null);
    }, 8000);
    return () => clearTimeout(timer);
  }, [notification]);

  if (user?.accountType !== 'STUDENT' || !notification) return null;

  const handlePrimaryAction = async () => {
    const n = notification;
    if (!n) return;
    const gameMode = String(n.gameSession?.quiz?.gameMode ?? '').toUpperCase();
    if (gameMode === 'SINGLE') {
      const quizId = n.gameSession?.quiz?._id ?? n.gameSession?.quiz?.id;
      const classId = n.classData?.id ?? n.classData?._id ?? n.gameSession?.class?._id ?? n.gameSession?.class?.id;
      if (!quizId || !classId) {
        setNotification(null);
        return;
      }
      try {
        const result = await gameSessionAPI.createGameSession({ quizId, classId });
        const session = result?.gameSession;
        const sid = session?.id ?? session?._id;
        if (sid && session?.status === 'PLAYING') {
          navigate(`/gameplay/${sid}`, {
            state: {
              quiz: n.gameSession?.quiz,
              classData: n.classData,
              gameSession: session,
              map: session?.map
            }
          });
        } else {
          window.alert('Failed to start game. Please try again.');
        }
      } catch (err) {
        window.alert(err.response?.data?.message || 'Failed to start game. Please try again.');
      } finally {
        setNotification(null);
      }
      return;
    }

    if (n?.sessionId) {
      navigate(`/lobby/${n.sessionId}`, {
        state: {
          gameSession: n.gameSession,
          classData: n.classData,
          quiz: n.gameSession?.quiz,
        },
      });
    }
    setNotification(null);
  };

  return (
    <div
      className="fixed top-4 right-4 left-4 xs:left-auto sm:top-5 sm:right-5 bg-[#4CAF50] text-white p-3 sm:p-4 rounded-lg shadow-lg z-[10000] max-w-[400px] w-[calc(100vw-2rem)] xs:w-auto animate-slideIn"
      style={{ animation: 'slideIn 0.3s ease-out' }}
    >
      <div className="flex items-start gap-3">
        <FaGamepad className="text-2xl mt-0.5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="font-bold mb-1 text-base">{t('common_newGameAvailable')}</div>
          <div className="text-sm mb-3 opacity-95">{notification.message}</div>
          <div className="flex gap-2 flex-wrap">
            {notification.type !== 'single-player-info' && (
              <button
                type="button"
                onClick={handlePrimaryAction}
                className="border-none px-4 py-2 rounded bg-white text-[#4CAF50] cursor-pointer font-bold text-sm hover:opacity-90"
              >
                {String(notification.gameSession?.quiz?.gameMode ?? '').toUpperCase() === 'SINGLE'
                  ? t('gameContent_playGame')
                  : t('common_joinGame')}
              </button>
            )}
            <button
              type="button"
              onClick={() => setNotification(null)}
              className="bg-transparent text-white border border-white px-4 py-2 rounded cursor-pointer text-sm hover:opacity-90"
            >
              {t('common_dismiss')}
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setNotification(null)}
          className="bg-transparent border-none text-white cursor-pointer text-lg p-0 leading-none flex-shrink-0 min-w-[36px] min-h-[36px] flex items-center justify-center touch-manipulation"
        >
          <FaTimes />
        </button>
      </div>
    </div>
  );
};

export default GameInvitationOverlay;
