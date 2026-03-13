// Socket.io utility to get the io instance and track lobby presence (teacher in lobby)
let ioInstance = null;

const sessionPresenceBySocket = new Map(); // socketId -> { sessionId, accountType }

export const setIO = (io) => {
  ioInstance = io;
};

export const getIO = () => {
  if (!ioInstance) {
    throw new Error('Socket.io instance not initialized. Make sure server.js sets the io instance.');
  }
  return ioInstance;
};

export const registerSessionPresence = (socketId, sessionId, accountType) => {
  if (!socketId || !sessionId) return;
  sessionPresenceBySocket.set(socketId, { sessionId: String(sessionId), accountType: accountType || null });
};

export const unregisterSessionPresence = (socketId) => {
  sessionPresenceBySocket.delete(socketId);
};

export const isTeacherInLobby = (sessionId) => {
  if (!ioInstance || !sessionId) return false;
  const room = ioInstance.sockets.adapter.rooms.get(`game-session-${String(sessionId)}`);
  if (!room) return false;
  for (const sid of room) {
    const p = sessionPresenceBySocket.get(sid);
    if (p && p.sessionId === String(sessionId) && p.accountType === 'TEACHER') return true;
  }
  return false;
};

