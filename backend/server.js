import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';

dotenv.config();

const app = express();
const httpServer = createServer(app);

// Socket.io setup
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Set io instance for use in controllers
import { setIO, registerSessionPresence, unregisterSessionPresence } from './utils/socket.js';
setIO(io);

// Middleware
app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// Routes
import authRoutes from './routes/authRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import classRoutes from './routes/classRoutes.js';
import quizRoutes from './routes/quizRoutes.js';
import gameSessionRoutes from './routes/gameSessionRoutes.js';
import quizResultRoutes from './routes/quizResultRoutes.js';
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/classes', classRoutes);
app.use('/api/quizzes', quizRoutes);
app.use('/api/game-sessions', gameSessionRoutes);
app.use('/api/quiz-results', quizResultRoutes);

// Database connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/gamified-learning')
.then(async () => {
  console.log('MongoDB connected successfully');

  // Drop legacy index on quizresults that causes E11000 (quizId_1_studentId_1) when our schema uses gameSession/quiz/class
  try {
    const db = mongoose.connection.db;
    if (db) {
      const coll = db.collection('quizresults');
      await coll.dropIndex('quizId_1_studentId_1');
      console.log('Dropped legacy index quizId_1_studentId_1 from quizresults');
    }
  } catch (e) {
    if (e.code !== 27 && e.codeName !== 'IndexNotFound') console.warn('quizresults index drop:', e.message);
  }

  // Create default admin account if it doesn't exist
  try {
    const createDefaultAdmin = (await import('./scripts/seedAdmin.js')).default;
    await createDefaultAdmin();
  } catch (_error) {
    // Silent; admin may already exist
  }
})
.catch(() => {
  // Connection failed; no console output except the three startup lines
});

// Basic route
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to Gamified Learning API' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  res.status(500).json({ message: 'Something went wrong!', error: err.message });
});

// Socket.io connection handling
io.on('connection', (socket) => {
  // Handle joining a class room
  socket.on('join-class', (classId) => {
    socket.join(`class-${classId}`);
  });

  // Handle joining a game session room (payload: sessionId or { sessionId, accountType })
  socket.on('join-game-session', (payload) => {
    const sessionId = typeof payload === 'object' && payload !== null ? payload.sessionId : payload;
    const accountType = typeof payload === 'object' && payload !== null ? payload.accountType : null;
    if (sessionId) {
      const roomId = `game-session-${String(sessionId)}`;
      socket.join(roomId);
      registerSessionPresence(socket.id, String(sessionId), accountType);
    }
  });

  // Handle leaving a class room
  socket.on('leave-class', (classId) => {
    socket.leave(`class-${classId}`);
  });

  // Handle leaving a game session room
  socket.on('leave-game-session', (sessionId) => {
    unregisterSessionPresence(socket.id);
    socket.leave(`game-session-${String(sessionId)}`);
  });

  // Multiplayer: broadcast player state (position, direction, anim) to others in the same game session
  socket.on('game-player-state', (data) => {
    const { sessionId } = data || {};
    if (!sessionId) return;
    socket.to(`game-session-${sessionId}`).emit('game-player-state', {
      ...data,
      socketId: socket.id
    });
  });

  // Teacher pauses/resumes: broadcast to everyone in the game session (including teacher)
  socket.on('game-set-paused', (data) => {
    const sessionId = typeof data === 'object' && data !== null ? data.sessionId : null;
    const paused = typeof data === 'object' && data !== null ? Boolean(data.paused) : false;
    if (!sessionId) return;
    const roomId = `game-session-${String(sessionId)}`;
    io.to(roomId).emit('game-set-paused', { paused });
  });

  socket.on('disconnect', () => {
    unregisterSessionPresence(socket.id);
  });
});

const PORT = process.env.PORT || 5000;

httpServer.listen(PORT, () => {
  console.log('Server is running on port 5000');
  console.log('Socket.io server is ready');
});

