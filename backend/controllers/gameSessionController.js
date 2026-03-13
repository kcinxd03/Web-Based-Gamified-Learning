import mongoose from 'mongoose';
import GameSession from '../models/GameSession.js';
import QuizResult from '../models/QuizResult.js';
import PointAward from '../models/PointAward.js';
import { getAccountModel } from '../models/accountModels.js';
import { Teacher, Student } from '../models/accountModels.js';
import Quiz from '../models/Quiz.js';
import Class from '../models/Class.js';
import { getIO, isTeacherInLobby } from '../utils/socket.js';

/** Normalize user id to a canonical string for consistent lookup in playerScores / leaderboard */
function toPlayerIdKey(userId) {
  if (userId == null) return '';
  if (typeof userId === 'string' && mongoose.Types.ObjectId.isValid(userId)) return new mongoose.Types.ObjectId(userId).toString();
  if (typeof userId === 'object' && userId.toString && typeof userId.toString === 'function') return userId.toString();
  return String(userId);
}

/** Attach score and correct/incorrect counts from session to each player for API/socket responses */
const DEFAULT_HEALTH = 100;

function playersWithScores(gameSession) {
  const scores = gameSession.playerScores || {};
  const correctCounts = gameSession.playerCorrectCounts || {};
  const answeredCounts = gameSession.playerAnsweredCounts || {};
  const healthMap = gameSession.playerHealth || {};
  return (gameSession.players || []).map((p) => {
    const po = p.toObject ? p.toObject() : { ...p };
    const id = toPlayerIdKey(po._id ?? p._id ?? '');
    const correct = Number(correctCounts[id] ?? correctCounts[po._id]) || 0;
    const answered = Number(answeredCounts[id] ?? answeredCounts[po._id]) || 0;
    const incorrect = Math.max(0, answered - correct);
    const health = typeof healthMap[id] === 'number' ? healthMap[id] : DEFAULT_HEALTH;
    return {
      ...po,
      score: scores[id] ?? 0,
      correctCount: correct,
      incorrectCount: incorrect,
      health,
    };
  });
}

async function upsertPointAwards({ sessionId, quizId, classId, playerResults, awardedAt, roundNumber }) {
  if (!quizId || !classId || !Array.isArray(playerResults) || playerResults.length === 0) return;
  const normalizedRound = Math.max(1, Number(roundNumber) || 1);
  const playerIds = playerResults
    .map((result) => result?.player)
    .filter((playerId) => playerId != null);
  const existingAwards = await PointAward.find({
    gameSession: sessionId,
    player: { $in: playerIds }
  })
    .select('player points lastAwardedRound')
    .lean();
  const existingByPlayerId = {};
  existingAwards.forEach((award) => {
    const key = toPlayerIdKey(award.player);
    if (key) existingByPlayerId[key] = award;
  });
  await PointAward.bulkWrite(
    playerResults.map((result) => {
      const playerKey = toPlayerIdKey(result.player);
      const existingAward = existingByPlayerId[playerKey];
      const existingPoints = Number(existingAward?.points) || 0;
      const existingRound = Number(existingAward?.lastAwardedRound) || 0;
      const roundPoints = Math.max(0, Number(result.points) || 0);
      const nextPoints = existingRound >= normalizedRound
        ? existingPoints
        : existingPoints + roundPoints;
      return {
        updateOne: {
          filter: {
            gameSession: sessionId,
            player: result.player
          },
          update: {
            $set: {
              quiz: quizId,
              class: classId,
              points: nextPoints,
              lastAwardedRound: Math.max(existingRound, normalizedRound),
              awardedAt: awardedAt || new Date()
            }
          },
          upsert: true
        }
      };
    })
  );
}

/**
 * Save quiz result to quizresults collection (who finished first, points, correct answers).
 * Uses the session's finishedResults accumulator (each player added when they finish);
 * only call this when the game has ended (last student finished or timer). Writes all at once.
 */
async function saveQuizResults(sessionId) {
  const session = await GameSession.findById(sessionId)
    .populate('quiz', 'title')
    .populate('class', 'subject gradeLevel section')
    .lean();
  if (!session) return;

  const quizId = session.quiz?._id ?? session.quiz;
  const classId = session.class?._id ?? session.class;
  const currentRoundNumber = Math.max(1, Number(session.currentRoundNumber) || 1);
  if (!quizId || !classId) return;

  const finishedResults = session.finishedResults || {};
  const playerIds = Object.keys(finishedResults).filter((k) => k && finishedResults[k] != null);
  if (playerIds.length === 0) return;

  const students = await Student.find({ _id: { $in: playerIds } }).select('firstName lastName').lean();
  const nameById = {};
  students.forEach((s) => {
    const id = String(s._id);
    nameById[id] = [s.firstName, s.lastName].filter(Boolean).join(' ') || 'Player';
  });

  const playerResults = playerIds.map((pid) => {
    const r = finishedResults[pid];
    const playerName = (r && r.playerName) || nameById[pid] || 'Player';
    return {
      player: mongoose.Types.ObjectId.isValid(pid) ? new mongoose.Types.ObjectId(pid) : pid,
      playerName,
      points: Number(r?.points) || 0,
      correctAnswers: Number(r?.correctAnswers) || 0,
      finishedFirst: false,
      timeToFinishSeconds: r?.timeToFinishSeconds != null ? Number(r.timeToFinishSeconds) : null
    };
  });

  const withTime = playerResults.filter((r) => r.timeToFinishSeconds != null && r.timeToFinishSeconds >= 0);
  if (withTime.length > 0) {
    const minTime = Math.min(...withTime.map((r) => r.timeToFinishSeconds));
    const first = playerResults.find((r) => r.timeToFinishSeconds === minTime);
    if (first) first.finishedFirst = true;
  } else if (playerResults.length > 0) {
    playerResults[0].finishedFirst = true;
  }

  const doc = {
    gameSession: sessionId,
    quiz: quizId,
    class: classId,
    finishedAt: new Date(),
    playerResults: playerResults.map((r) => ({
      player: r.player,
      playerName: r.playerName,
      points: r.points,
      correctAnswers: r.correctAnswers,
      finishedFirst: r.finishedFirst,
      timeToFinishSeconds: r.timeToFinishSeconds
    }))
  };
  await QuizResult.replaceOne({ gameSession: sessionId }, doc, { upsert: true });
  await upsertPointAwards({
    sessionId,
    quizId,
    classId,
    playerResults,
    awardedAt: doc.finishedAt,
    roundNumber: currentRoundNumber
  });
}

// Create a new game session
export const createGameSession = async (req, res) => {
  try {
    let { quizId, classId } = req.body;
    const userId = req.userId;

    // Validate and normalize to ObjectId so storage and queries are consistent
    if (!quizId) {
      return res.status(400).json({ message: 'Quiz ID is required' });
    }
    if (!classId) {
      return res.status(400).json({ message: 'Class ID is required' });
    }
    quizId = String(quizId).replace(/\//g, '').trim();
    classId = String(classId).replace(/\//g, '').trim();
    if (quizId.length > 24) quizId = quizId.slice(0, 24);
    if (classId.length > 24) classId = classId.slice(0, 24);
    if (!mongoose.Types.ObjectId.isValid(quizId) || !mongoose.Types.ObjectId.isValid(classId)) {
      return res.status(400).json({ message: 'Invalid quiz or class ID' });
    }
    const quizObjId = new mongoose.Types.ObjectId(quizId);
    const classObjId = new mongoose.Types.ObjectId(classId);

    const UserModel = getAccountModel(req.accountType);
    const user = await UserModel.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const quiz = await Quiz.findById(quizObjId);
    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    const classData = await Class.findById(classObjId);
    if (!classData) {
      return res.status(404).json({ message: 'Class not found' });
    }

    const isTeacher = req.accountType === 'TEACHER';
    const isSinglePlayerQuiz = quiz.gameMode === 'SINGLE';

    // --- Student single-player: create and start session immediately (no lobby) ---
    if (!isTeacher && isSinglePlayerQuiz) {
      const studentInClass = classData.students.some(
        (s) => String(s._id ?? s) === String(userId)
      );
      if (!studentInClass) {
        return res.status(403).json({ message: 'You must be in this class to play this quiz' });
      }
      // Single player is playable only once per student per quiz
      const alreadyPlayed = await GameSession.findOne({
        quiz: quizObjId,
        class: classObjId,
        players: new mongoose.Types.ObjectId(userId)
      });
      if (alreadyPlayed) {
        return res.status(403).json({
          message: 'You can only play this single-player quiz once. You have already played it.'
        });
      }
      // Prefer the teacher's most recent mapped session (active or finished) so students
      // inherit the map the teacher selected for this single-player run.
      const latestMappedSession = await GameSession.findOne({
        quiz: quizObjId,
        class: classObjId,
        map: { $exists: true, $ne: null }
      })
        .sort({ startedAt: -1, updatedAt: -1, createdAt: -1 })
        .lean();
      const rawMap = latestMappedSession?.map;
      const previousMap = rawMap &&
        typeof rawMap === 'object' &&
        Object.keys(rawMap).length > 0 &&
        (rawMap.id != null || rawMap.name || rawMap.image)
        ? {
            id: rawMap.id,
            name: rawMap.name,
            description: rawMap.description,
            image: rawMap.image
          }
        : undefined;

      // Default map so student goes straight to gameplay (no lobby, no map selection)
      const defaultMap = { id: 1, name: 'City', description: 'City map', image: '/Maps/City.png' };
      const mapToUse = previousMap || defaultMap;

      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      let gameCode;
      let exists = true;
      while (exists) {
        gameCode = '';
        for (let i = 0; i < 6; i++) {
          gameCode += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        exists = await GameSession.findOne({ gameCode });
      }

      const newGameSession = new GameSession({
        quiz: quizObjId,
        class: classObjId,
        teacher: classData.teacher,
        gameCode,
        status: 'PLAYING',
        currentRoundNumber: 1,
        players: [userId],
        map: mapToUse,
        startedAt: new Date(),
        npcSeed: Math.floor(Math.random() * 0xffffffff) >>> 0,
        totalQuestionsPerPlayer: (quiz.questions && quiz.questions.length) || 0,
        playerAnsweredCounts: {}
      });
      await newGameSession.save();

      await newGameSession.populate('quiz', 'title description category difficulty timeLimit gameMode');
      await newGameSession.populate('class', 'subject gradeLevel section classCode');
      await newGameSession.populate('teacher', 'firstName lastName email profilePicture');
      await newGameSession.populate('players', 'firstName lastName email profilePicture');

      const responseMap = mapToUse || (newGameSession.map && typeof newGameSession.map === 'object'
        ? {
            id: newGameSession.map.id,
            name: newGameSession.map.name,
            description: newGameSession.map.description,
            image: newGameSession.map.image
          }
        : undefined);

      const io = getIO();
      io.to(`class-${String(classObjId)}`).emit('game-session-created', {
        notificationType: 'single-player',
        startedByStudentId: String(userId),
        startedByStudentName: [user.firstName, user.lastName].filter(Boolean).join(' ') || 'A student',
        gameSession: {
          id: newGameSession._id,
          quiz: newGameSession.quiz,
          class: newGameSession.class,
          teacher: newGameSession.teacher,
          map: responseMap,
          gameCode: newGameSession.gameCode,
          status: newGameSession.status,
          players: newGameSession.players,
          startedAt: newGameSession.startedAt,
          npcSeed: newGameSession.npcSeed,
          createdAt: newGameSession.createdAt
        }
      });

      return res.status(201).json({
        message: 'Single-player game started',
        gameSession: {
          id: newGameSession._id,
          quiz: newGameSession.quiz,
          class: newGameSession.class,
          teacher: newGameSession.teacher,
          map: responseMap,
          gameCode: newGameSession.gameCode,
          status: newGameSession.status,
          players: newGameSession.players,
          startedAt: newGameSession.startedAt,
          npcSeed: newGameSession.npcSeed,
          createdAt: newGameSession.createdAt
        }
      });
    }

    // --- Teacher path ---
    if (!isTeacher) {
      return res.status(403).json({ message: 'Only teachers can create game sessions' });
    }

    if (quiz.teacher.toString() !== userId.toString()) {
      return res.status(403).json({ message: 'You can only create game sessions for your own quizzes' });
    }

    if (classData.teacher.toString() !== userId.toString()) {
      return res.status(403).json({ message: 'You can only create game sessions for your own classes' });
    }

    // Check if there's already an active game session for this quiz and class
    const existingSession = await GameSession.findOne({
      quiz: quizObjId,
      class: classObjId,
      status: { $in: ['WAITING', 'PLAYING'] }
    });

    if (existingSession) {
      // Ensure existing session has a game code (backfill for sessions created before gameCode existed)
      if (!existingSession.gameCode) {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let gameCode;
        let exists = true;
        while (exists) {
          gameCode = '';
          for (let i = 0; i < 6; i++) {
            gameCode += chars.charAt(Math.floor(Math.random() * chars.length));
          }
          exists = await GameSession.findOne({ gameCode });
        }
        existingSession.gameCode = gameCode;
        await existingSession.save();
      }
      await existingSession.populate('quiz', 'title description category difficulty timeLimit gameMode');
      await existingSession.populate('class', 'subject gradeLevel section classCode');
      await existingSession.populate('teacher', 'firstName lastName email profilePicture');
      await existingSession.populate('players', 'firstName lastName email profilePicture');

      // Get plain object so subdocument map is serialized correctly
      const sessionPlain = existingSession.toObject ? existingSession.toObject() : existingSession;
      const rawMap = sessionPlain.map;
      // Normalize map to plain object so frontend always gets id/name/image
      const mapObj = rawMap && typeof rawMap === 'object' && Object.keys(rawMap).length > 0
        ? {
            id: rawMap.id,
            name: rawMap.name,
            description: rawMap.description,
            image: rawMap.image
          }
        : undefined;

      return res.json({
        message: 'Active game session found',
        gameSession: {
          id: existingSession._id,
          quiz: existingSession.quiz,
          class: existingSession.class,
          teacher: existingSession.teacher,
          map: mapObj,
          gameCode: existingSession.gameCode,
          status: existingSession.status,
          players: existingSession.players,
          createdAt: existingSession.createdAt
        }
      });
    }

    // Generate unique game code (6 chars, uppercase alphanumeric)
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let gameCode;
    let exists = true;
    while (exists) {
      gameCode = '';
      for (let i = 0; i < 6; i++) {
        gameCode += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      exists = await GameSession.findOne({ gameCode });
    }

    // Reuse map from the most recent FINISHED session for this quiz+class (e.g. after "Stop game")
    const previousSession = await GameSession.findOne({
      quiz: quizObjId,
      class: classObjId,
      status: 'FINISHED'
    })
      .sort({ finishedAt: -1, updatedAt: -1 })
      .lean();

    const rawMap = previousSession?.map;
    const previousMap = rawMap &&
      typeof rawMap === 'object' &&
      Object.keys(rawMap).length > 0 &&
      (rawMap.id != null || rawMap.name || rawMap.image)
      ? {
          id: rawMap.id,
          name: rawMap.name,
          description: rawMap.description,
          image: rawMap.image
        }
      : undefined;

    // Create new game session (with previous map if any)
    const newGameSession = new GameSession({
      quiz: quizObjId,
      class: classObjId,
      teacher: userId,
      gameCode,
      status: 'WAITING',
      players: []
    });
    if (previousMap) {
      newGameSession.map = previousMap;
    }
    await newGameSession.save();

    // Populate references
    await newGameSession.populate('quiz', 'title description category difficulty timeLimit gameMode');
    await newGameSession.populate('class', 'subject gradeLevel section classCode');
    await newGameSession.populate('teacher', 'firstName lastName email profilePicture');

    // Use plain map object in response (Mongoose subdoc can serialize oddly)
    const responseMap = previousMap || (newGameSession.map && typeof newGameSession.map === 'object'
      ? {
          id: newGameSession.map.id,
          name: newGameSession.map.name,
          description: newGameSession.map.description,
          image: newGameSession.map.image
        }
      : undefined);

    // Do not emit game-session-created here; students are notified when teacher finishes map selection (updateGameSession with map)
    res.status(201).json({
      message: 'Game session created successfully',
      gameSession: {
        id: newGameSession._id,
        quiz: newGameSession.quiz,
        class: newGameSession.class,
        teacher: newGameSession.teacher,
        map: responseMap,
        gameCode: newGameSession.gameCode,
        status: newGameSession.status,
        players: newGameSession.players,
        createdAt: newGameSession.createdAt
      }
    });
  } catch (error) {
    res.status(500).json({ 
      message: 'Server error during game session creation', 
      error: error.message
    });
  }
};

// Update game session (e.g., add map, update status)
export const updateGameSession = async (req, res) => {
  try {
    const { id } = req.params;
    const { map, status } = req.body;
    const teacherId = req.userId;

    const gameSession = await GameSession.findById(id);
    if (!gameSession) {
      return res.status(404).json({ message: 'Game session not found' });
    }

    // Verify user is the teacher who created the session
    if (gameSession.teacher.toString() !== teacherId.toString()) {
      return res.status(403).json({ message: 'You can only update your own game sessions' });
    }

    // Update map if provided
    if (map) {
      gameSession.map = map;
    }

    // Update status if provided
    if (status && ['WAITING', 'PLAYING', 'FINISHED'].includes(status)) {
      if (status === 'PLAYING') {
        const quizDoc = await Quiz.findById(gameSession.quiz).select('questions gameMode').lean();
        const isSinglePlayer = quizDoc?.gameMode === 'SINGLE';
        if (!isSinglePlayer && (!gameSession.players || gameSession.players.length === 0)) {
          return res.status(400).json({ message: 'At least one player must join the lobby before starting the game' });
        }
        if (!gameSession.startedAt) {
          gameSession.startedAt = new Date();
        }
        gameSession.currentRoundNumber = Math.max(0, Number(gameSession.currentRoundNumber) || 0) + 1;
        // Random seed for NPC positions so all clients in this game see the same layout
        gameSession.npcSeed = Math.floor(Math.random() * 0xffffffff) >>> 0;
        // Snapshot current scores so "points from last game" = playerScores - this (same session can be reused for multiple rounds)
        const currentScores = gameSession.playerScores || {};
        gameSession.playerScoresAtRoundStart = typeof currentScores.toObject === 'function'
          ? currentScores.toObject()
          : { ...currentScores };
        gameSession.markModified('playerScoresAtRoundStart');
        // Do not reset playerScores – points accumulate so leaderboard can sum across games
        gameSession.totalQuestionsPerPlayer = (quizDoc?.questions?.length) || 0;
        gameSession.playerAnsweredCounts = {};
        gameSession.markModified('playerAnsweredCounts');
        // Reset correct/incorrect and finish times so sidebar and results start fresh for this round
        gameSession.playerCorrectCounts = {};
        gameSession.playerFinishTimes = {};
        gameSession.markModified('playerCorrectCounts');
        gameSession.markModified('playerFinishTimes');
        // Clear temporary finished results so this round accumulates fresh; we write to quizresults when game ends
        gameSession.finishedResults = {};
        gameSession.markModified('finishedResults');
        // Reset health for all players so teacher sidebar shows full health at round start
        const playerIds = (gameSession.players || []).map((p) => String(p && (p._id ?? p))).filter(Boolean);
        const newHealth = {};
        playerIds.forEach((pid) => { newHealth[pid] = DEFAULT_HEALTH; });
        gameSession.playerHealth = newHealth;
        gameSession.markModified('playerHealth');
      }

      if (status === 'FINISHED') {
        gameSession.status = 'WAITING';
        gameSession.startedAt = undefined;
        gameSession.finishedAt = undefined;
      } else {
        gameSession.status = status;
        if (status === 'WAITING') {
          gameSession.finishedAt = undefined;
          gameSession.startedAt = undefined;
        }
      }
    }

    await gameSession.save();

    // Populate references
    await gameSession.populate('quiz', 'title description category difficulty timeLimit gameMode');
    await gameSession.populate('class', 'subject gradeLevel section classCode');
    await gameSession.populate('teacher', 'firstName lastName email profilePicture');
    await gameSession.populate('players', 'firstName lastName email profilePicture');

    // Emit socket event for real-time game session update
    const io = getIO();
    const gameSessionData = {
      id: gameSession._id,
      quiz: gameSession.quiz,
      class: gameSession.class,
      teacher: gameSession.teacher,
      map: gameSession.map,
      gameCode: gameSession.gameCode,
      status: gameSession.status,
      players: playersWithScores(gameSession),
      startedAt: gameSession.startedAt,
      finishedAt: gameSession.finishedAt,
      npcSeed: gameSession.npcSeed,
      createdAt: gameSession.createdAt
    };
    
    // Emit to both class room and game session room
    const classId = gameSession.class._id || gameSession.class;
    io.to(`class-${classId}`).emit('game-session-updated', { gameSession: gameSessionData });
    io.to(`game-session-${gameSession._id}`).emit('game-session-updated', { gameSession: gameSessionData });

    // Notify students when a multiplayer lobby becomes ready, or when a teacher starts a single-player game.
    const mapWasSent = req.body && req.body.hasOwnProperty('map') && req.body.map != null;
    const isSinglePlayerMode = String(gameSession.quiz?.gameMode ?? '').toUpperCase() === 'SINGLE';
    const shouldNotifyMultiplayerLobbyReady = mapWasSent && gameSession.status === 'WAITING' && !isSinglePlayerMode;
    const shouldNotifyTeacherSinglePlayerStart = !mapWasSent && isSinglePlayerMode && status === 'PLAYING';
    if (shouldNotifyMultiplayerLobbyReady || shouldNotifyTeacherSinglePlayerStart) {
      io.to(`class-${classId}`).emit('game-session-created', { gameSession: gameSessionData });
    }

    res.json({
      message: 'Game session updated successfully',
      gameSession: {
        id: gameSession._id,
        quiz: gameSession.quiz,
        class: gameSession.class,
        teacher: gameSession.teacher,
        map: gameSession.map,
        gameCode: gameSession.gameCode,
        status: gameSession.status,
        players: playersWithScores(gameSession),
        startedAt: gameSession.startedAt,
        finishedAt: gameSession.finishedAt,
        npcSeed: gameSession.npcSeed,
        createdAt: gameSession.createdAt
      }
    });
  } catch (error) {
    res.status(500).json({ 
      message: 'Server error during game session update', 
      error: error.message
    });
  }
};

// Get game session by ID
export const getGameSessionById = async (req, res) => {
  try {
    const { id } = req.params;

    const gameSession = await GameSession.findById(id)
      .populate('quiz', 'title description category difficulty timeLimit gameMode')
      .populate('class', 'subject gradeLevel section classCode')
      .populate('teacher', 'firstName lastName email profilePicture')
      .populate('players', 'firstName lastName email profilePicture');

    if (!gameSession) {
      return res.status(404).json({ message: 'Game session not found' });
    }

    res.json({
      message: 'Game session retrieved successfully',
      gameSession: {
        id: gameSession._id,
        quiz: gameSession.quiz,
        class: gameSession.class,
        teacher: gameSession.teacher,
        map: gameSession.map,
        gameCode: gameSession.gameCode,
        status: gameSession.status,
        players: playersWithScores(gameSession),
        startedAt: gameSession.startedAt,
        finishedAt: gameSession.finishedAt,
        npcSeed: gameSession.npcSeed,
        createdAt: gameSession.createdAt
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Broadcast game invite to class (teacher only); call when teacher lands on lobby so students get the notification
export const broadcastGameInvite = async (req, res) => {
  try {
    const { id: sessionId } = req.params;
    const userId = req.userId;

    const gameSession = await GameSession.findById(sessionId)
      .populate('quiz', 'title description category difficulty timeLimit gameMode')
      .populate('class', 'subject gradeLevel section classCode')
      .populate('teacher', 'firstName lastName email profilePicture')
      .populate('players', 'firstName lastName email profilePicture');
    if (!gameSession) {
      return res.status(404).json({ message: 'Game session not found' });
    }
    const teacherId = String(gameSession.teacher?._id ?? gameSession.teacher ?? '');
    if (teacherId !== String(userId)) {
      return res.status(403).json({ message: 'Only the teacher of this session can broadcast the invite' });
    }
    if (gameSession.status !== 'WAITING') {
      return res.status(400).json({ message: 'Session is not waiting for players' });
    }
    if (!gameSession.map || (typeof gameSession.map === 'object' && Object.keys(gameSession.map).length === 0)) {
      return res.json({ message: 'Session has no map set', broadcast: false });
    }

    const io = getIO();
    const classId = gameSession.class._id || gameSession.class;
    const gameSessionData = {
      id: gameSession._id,
      quiz: gameSession.quiz,
      class: gameSession.class,
      teacher: gameSession.teacher,
      map: gameSession.map,
      gameCode: gameSession.gameCode,
      status: gameSession.status,
      players: playersWithScores(gameSession),
      startedAt: gameSession.startedAt,
      finishedAt: gameSession.finishedAt,
      npcSeed: gameSession.npcSeed,
      createdAt: gameSession.createdAt
    };
    io.to(`class-${classId}`).emit('game-session-created', { gameSession: gameSessionData });
    res.json({ message: 'Invite broadcast to class', broadcast: true });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Join a game session (for students) by game code or session ID
export const joinGameSession = async (req, res) => {
  try {
    const { gameCode, sessionId } = req.body;
    const studentId = req.userId;

    if (!gameCode && !sessionId) {
      return res.status(400).json({ message: 'Game code or session ID is required' });
    }

    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ message: 'User not found' });
    }
    if (req.accountType !== 'STUDENT') {
      return res.status(403).json({ message: 'Only students can join game sessions' });
    }

    let gameSession = null;
    if (sessionId) {
      gameSession = await GameSession.findById(sessionId);
    } else {
      gameSession = await GameSession.findOne({ gameCode: String(gameCode).trim().toUpperCase() });
    }

    if (!gameSession) {
      return res.status(404).json({ message: 'Game not found. Check the code or session.' });
    }

    if (gameSession.status === 'FINISHED') {
      return res.status(400).json({ message: 'This game has finished.' });
    }

    const classData = await Class.findById(gameSession.class);
    if (!classData || !classData.students.some(s => s.toString() === studentId.toString())) {
      return res.status(403).json({ message: 'You must be in this class to join the game.' });
    }

    if (gameSession.players.some(p => p.toString() === studentId.toString())) {
      // Already in game - return session so they can go to lobby (no teacher-in-lobby check)
      await gameSession.populate('quiz', 'title description category difficulty timeLimit gameMode');
      await gameSession.populate('class', 'subject gradeLevel section classCode');
      await gameSession.populate('teacher', 'firstName lastName email profilePicture');
      await gameSession.populate('players', 'firstName lastName email profilePicture');
      return res.json({
        message: 'You are already in this game',
        gameSession: {
          id: gameSession._id,
          quiz: gameSession.quiz,
          class: gameSession.class,
          teacher: gameSession.teacher,
          map: gameSession.map,
          gameCode: gameSession.gameCode,
          status: gameSession.status,
          players: playersWithScores(gameSession),
          startedAt: gameSession.startedAt,
          finishedAt: gameSession.finishedAt,
          npcSeed: gameSession.npcSeed,
          createdAt: gameSession.createdAt
        }
      });
    }

    // Students can only join if the teacher is currently in the lobby
    const sid = String(gameSession._id);
    if (!isTeacherInLobby(sid)) {
      return res.status(400).json({
        message: 'The teacher must be in the lobby before you can join. Ask your teacher to open the lobby first.'
      });
    }

    // Add student to session atomically with $addToSet so concurrent joins (e.g. notification + lobby load) never duplicate
    const studentObjId = new mongoose.Types.ObjectId(studentId);
    const updated = await GameSession.findByIdAndUpdate(
      sid,
      { $addToSet: { players: studentObjId } },
      { new: true }
    );
    if (!updated) {
      return res.status(404).json({ message: 'Game session not found' });
    }
    gameSession = updated;
    await gameSession.populate('quiz', 'title description category difficulty timeLimit gameMode');
    await gameSession.populate('class', 'subject gradeLevel section classCode');
    await gameSession.populate('teacher', 'firstName lastName email profilePicture');
    await gameSession.populate('players', 'firstName lastName email profilePicture');

    // Emit socket event for real-time player join
    const io = getIO();
    const gameSessionData = {
      id: gameSession._id,
      quiz: gameSession.quiz,
      class: gameSession.class,
      teacher: gameSession.teacher,
      map: gameSession.map,
      gameCode: gameSession.gameCode,
      status: gameSession.status,
      players: playersWithScores(gameSession),
      startedAt: gameSession.startedAt,
      finishedAt: gameSession.finishedAt,
      npcSeed: gameSession.npcSeed,
      createdAt: gameSession.createdAt
    };
    const classId = gameSession.class._id || gameSession.class;
    io.to(`class-${classId}`).emit('player-joined-game', { gameSession: gameSessionData });
    io.to(`game-session-${gameSession._id}`).emit('player-joined-game', { gameSession: gameSessionData });

    res.json({
      message: 'Joined game successfully',
      gameSession: {
        id: gameSession._id,
        quiz: gameSession.quiz,
        class: gameSession.class,
        teacher: gameSession.teacher,
        map: gameSession.map,
        gameCode: gameSession.gameCode,
        status: gameSession.status,
        players: playersWithScores(gameSession),
        startedAt: gameSession.startedAt,
        finishedAt: gameSession.finishedAt,
        npcSeed: gameSession.npcSeed,
        createdAt: gameSession.createdAt
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get latest game session for a quiz in a class (any status - for students to open finished lobby)
export const getLatestSessionForQuiz = async (req, res) => {
  try {
    const { classId, quizId } = req.params;
    const userId = req.userId;

    const UserModel = getAccountModel(req.accountType);
    const user = await UserModel.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const classData = await Class.findById(classId);
    if (!classData) return res.status(404).json({ message: 'Class not found' });
    const isTeacher = classData.teacher.toString() === userId.toString();
    const isStudent = classData.students.some(s => s.toString() === userId.toString());
    if (!isTeacher && !isStudent) {
      return res.status(403).json({ message: 'You are not in this class' });
    }

    const gameSession = await GameSession.findOne({ class: classId, quiz: quizId })
      .sort({ createdAt: -1 })
      .populate('quiz', 'title description category difficulty timeLimit gameMode')
      .populate('class', 'subject gradeLevel section classCode')
      .populate('teacher', 'firstName lastName email profilePicture')
      .populate('players', 'firstName lastName email profilePicture')
      .lean();

    if (!gameSession) {
      return res.status(404).json({ message: 'No game session found for this quiz' });
    }

    res.json({
      message: 'Latest session retrieved',
      gameSession: {
        id: gameSession._id,
        quiz: gameSession.quiz,
        class: gameSession.class,
        teacher: gameSession.teacher,
        map: gameSession.map,
        gameCode: gameSession.gameCode,
        status: gameSession.status,
        players: playersWithScores(gameSession),
        startedAt: gameSession.startedAt,
        finishedAt: gameSession.finishedAt,
        npcSeed: gameSession.npcSeed,
        createdAt: gameSession.createdAt
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get active (WAITING or PLAYING) game sessions for a class (for students to see joinable games)
export const getActiveSessionsForClass = async (req, res) => {
  try {
    const { classId } = req.params;
    const studentId = req.userId;

    const student = await Student.findById(studentId);
    if (!student || req.accountType !== 'STUDENT') {
      return res.status(403).json({ message: 'Only students can list active sessions' });
    }

    const classData = await Class.findById(classId);
    if (!classData || !classData.students.some(s => s.toString() === studentId.toString())) {
      return res.status(403).json({ message: 'You are not in this class' });
    }

    const sessions = await GameSession.find({
      class: classId,
      status: { $in: ['WAITING', 'PLAYING'] }
    })
      .populate('quiz', 'title description category difficulty timeLimit gameMode')
      .populate('class', 'subject gradeLevel section classCode')
      .populate('teacher', 'firstName lastName email profilePicture')
      .populate('players', 'firstName lastName email profilePicture')
      .sort({ createdAt: -1 })
      .lean();

    // Only show games where teacher has finished selecting a map
    const hasMap = (s) => {
      const m = s.map;
      return m && typeof m === 'object' && (m.id != null || (m.name && m.name.trim()) || (m.image && m.image.trim()));
    };
    const filtered = sessions.filter(hasMap);

    res.json({
      message: 'Active sessions retrieved',
      sessions: filtered.map(s => ({
        id: s._id,
        quiz: s.quiz,
        class: s.class,
        teacher: s.teacher,
        map: s.map,
        gameCode: s.gameCode,
        status: s.status,
        players: s.players,
        createdAt: s.createdAt
      }))
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Leave a game session (student removes themselves from the lobby)
export const leaveGameSession = async (req, res) => {
  try {
    const { id: sessionId } = req.params;
    const userId = req.userId;

    const UserModel = getAccountModel(req.accountType);
    const user = await UserModel.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const gameSession = await GameSession.findById(sessionId);
    if (!gameSession) {
      return res.status(404).json({ message: 'Game session not found' });
    }

    const isTeacherLeaving = gameSession.teacher && gameSession.teacher.toString() === userId.toString();

    // Single-player: do not remove player from session so "playable once" still finds them
    const quiz = await Quiz.findById(gameSession.quiz).select('gameMode').lean();
    const isSinglePlayer = quiz?.gameMode === 'SINGLE';

    const wasInGame = gameSession.players.some(p => p.toString() === userId.toString());
    if (wasInGame && !isSinglePlayer) {
      gameSession.players = gameSession.players.filter(p => p.toString() !== userId.toString());
      await gameSession.save();
    }

    // When teacher leaves the lobby (WAITING), remove all students so they get game-session-updated and redirect
    if (isTeacherLeaving && gameSession.status === 'WAITING') {
      gameSession.players = [];
      await gameSession.save();
    }

    // Allow leave for any status (WAITING, PLAYING, FINISHED) so students fully leave the lobby

    await gameSession.populate('quiz', 'title description category difficulty timeLimit gameMode');
    await gameSession.populate('class', 'subject gradeLevel section classCode');
    await gameSession.populate('teacher', 'firstName lastName email profilePicture');
    await gameSession.populate('players', 'firstName lastName email profilePicture');

    const io = getIO();
    const gameSessionData = {
      id: gameSession._id,
      quiz: gameSession.quiz,
      class: gameSession.class,
      teacher: gameSession.teacher,
      map: gameSession.map,
      gameCode: gameSession.gameCode,
      status: gameSession.status,
      players: playersWithScores(gameSession),
      startedAt: gameSession.startedAt,
      finishedAt: gameSession.finishedAt,
      npcSeed: gameSession.npcSeed,
      createdAt: gameSession.createdAt
    };
    const classId = gameSession.class._id || gameSession.class;
    io.to(`class-${classId}`).emit('game-session-updated', { gameSession: gameSessionData });
    io.to(`game-session-${gameSession._id}`).emit('game-session-updated', { gameSession: gameSessionData });

    res.json({
      message: 'Left game successfully',
      gameSession: gameSessionData
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Kick a player from the game session (teacher only)
export const kickPlayerFromSession = async (req, res) => {
  try {
    const { id: sessionId } = req.params;
    const { playerId } = req.body;
    const userId = req.userId;

    if (!playerId) {
      return res.status(400).json({ message: 'Player ID is required' });
    }

    const gameSession = await GameSession.findById(sessionId).populate('class', 'teacher');
    if (!gameSession) {
      return res.status(404).json({ message: 'Game session not found' });
    }

    const classTeacherId = gameSession.class?.teacher?._id ?? gameSession.class?.teacher;
    if (!classTeacherId || classTeacherId.toString() !== userId.toString()) {
      return res.status(403).json({ message: 'Only the teacher of this class can kick players' });
    }

    const wasInGame = gameSession.players.some(p => p.toString() === playerId.toString());
    if (!wasInGame) {
      return res.status(400).json({ message: 'Player is not in this game session' });
    }

    gameSession.players = gameSession.players.filter(p => p.toString() !== playerId.toString());
    await gameSession.save();

    await gameSession.populate('quiz', 'title description category difficulty timeLimit gameMode');
    await gameSession.populate('class', 'subject gradeLevel section classCode');
    await gameSession.populate('teacher', 'firstName lastName email profilePicture');
    await gameSession.populate('players', 'firstName lastName email profilePicture');

    const io = getIO();
    const gameSessionData = {
      id: gameSession._id,
      quiz: gameSession.quiz,
      class: gameSession.class,
      teacher: gameSession.teacher,
      map: gameSession.map,
      gameCode: gameSession.gameCode,
      status: gameSession.status,
      players: playersWithScores(gameSession),
      startedAt: gameSession.startedAt,
      finishedAt: gameSession.finishedAt,
      npcSeed: gameSession.npcSeed,
      createdAt: gameSession.createdAt
    };
    const classId = gameSession.class._id || gameSession.class;
    io.to(`class-${classId}`).emit('game-session-updated', { gameSession: gameSessionData });
    io.to(`game-session-${gameSession._id}`).emit('game-session-updated', { gameSession: gameSessionData });

    res.json({
      message: 'Player kicked successfully',
      gameSession: gameSessionData
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Add score for the authenticated player (e.g. after a correct answer)
export const addScoreToPlayer = async (req, res) => {
  try {
    const { id: sessionId } = req.params;
    const points = Number(req.body.points);
    const userId = req.userId;

    if (Number.isNaN(points) || points < 0) {
      return res.status(400).json({ message: 'Valid points (non-negative number) is required' });
    }

    const gameSession = await GameSession.findById(sessionId);
    if (!gameSession) {
      return res.status(404).json({ message: 'Game session not found' });
    }

    const isPlayer = gameSession.players.some((p) => p.toString() === userId.toString());
    if (!isPlayer) {
      return res.status(403).json({ message: 'You are not a player in this game session' });
    }

    if (!gameSession.playerScores || typeof gameSession.playerScores !== 'object') {
      gameSession.playerScores = {};
    }
    if (!gameSession.playerCorrectCounts || typeof gameSession.playerCorrectCounts !== 'object') {
      gameSession.playerCorrectCounts = {};
    }
    const idStr = toPlayerIdKey(userId);
    gameSession.playerScores[idStr] = (gameSession.playerScores[idStr] || 0) + points;
    gameSession.playerCorrectCounts[idStr] = (gameSession.playerCorrectCounts[idStr] || 0) + 1;
    gameSession.markModified('playerScores');
    gameSession.markModified('playerCorrectCounts');
    await gameSession.save();

    await gameSession.populate('quiz', 'title description category difficulty timeLimit gameMode');
    await gameSession.populate('class', 'subject gradeLevel section classCode');
    await gameSession.populate('teacher', 'firstName lastName email profilePicture');
    await gameSession.populate('players', 'firstName lastName email profilePicture');

    const io = getIO();
    const gameSessionData = {
      id: gameSession._id,
      quiz: gameSession.quiz,
      class: gameSession.class,
      teacher: gameSession.teacher,
      map: gameSession.map,
      gameCode: gameSession.gameCode,
      status: gameSession.status,
      players: playersWithScores(gameSession),
      startedAt: gameSession.startedAt,
      finishedAt: gameSession.finishedAt,
      npcSeed: gameSession.npcSeed,
      createdAt: gameSession.createdAt
    };
    const classId = gameSession.class._id || gameSession.class;
    io.to(`class-${classId}`).emit('game-session-updated', { gameSession: gameSessionData });
    io.to(`game-session-${gameSession._id}`).emit('game-session-updated', { gameSession: gameSessionData });

    res.json({
      message: 'Score updated',
      gameSession: gameSessionData,
      newScore: gameSession.playerScores[idStr]
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Record that the current player answered one question (used to detect when all players have finished)
export const recordAnswerToPlayer = async (req, res) => {
  try {
    const { id: sessionId } = req.params;
    const { correctCount, timeToFinishSeconds, health, points } = req.body || {};
    const userId = req.userId;
    const idStr = toPlayerIdKey(userId);

    const gameSession = await GameSession.findById(sessionId);
    if (!gameSession) {
      return res.status(404).json({ message: 'Game session not found' });
    }

    const isPlayer = gameSession.players.some((p) => String(p && (p._id ?? p)) === idStr);
    if (!isPlayer) {
      return res.status(403).json({ message: 'You are not a player in this game session' });
    }

    // Use atomic $inc to avoid race when multiple players finish at once (fixes >3 questions case)
    const updateOp = { $inc: { [`playerAnsweredCounts.${idStr}`]: 1 } };
    const pointsAtRoundStart = Number(gameSession.playerScoresAtRoundStart?.[idStr]) || 0;
    if (typeof correctCount === 'number' && correctCount >= 0 && typeof timeToFinishSeconds === 'number' && timeToFinishSeconds >= 0) {
      updateOp.$set = updateOp.$set || {};
      updateOp.$set[`playerCorrectCounts.${idStr}`] = correctCount;
      updateOp.$set[`playerFinishTimes.${idStr}`] = timeToFinishSeconds;
    }
    if (typeof health === 'number' && health >= 0) {
      updateOp.$set = updateOp.$set || {};
      updateOp.$set[`playerHealth.${idStr}`] = health;
    }
    if (typeof points === 'number' && points >= 0) {
      updateOp.$set = updateOp.$set || {};
      updateOp.$set[`playerScores.${idStr}`] = pointsAtRoundStart + Number(points);
    }
    await GameSession.findByIdAndUpdate(sessionId, updateOp);

    // When health was updated, broadcast updated session so teacher sidebar reflects it
    if (typeof health === 'number' && health >= 0) {
      const io = getIO();
      const roomId = `game-session-${String(sessionId)}`;
      const updatedDoc = await GameSession.findById(sessionId)
        .populate('quiz', 'title description category difficulty timeLimit gameMode')
        .populate('class', 'subject gradeLevel section classCode')
        .populate('teacher', 'firstName lastName email profilePicture')
        .populate('players', 'firstName lastName email profilePicture');
      if (updatedDoc) {
        const gameSessionData = {
          id: updatedDoc._id,
          _id: updatedDoc._id,
          quiz: updatedDoc.quiz,
          class: updatedDoc.class,
          teacher: updatedDoc.teacher,
          map: updatedDoc.map,
          gameCode: updatedDoc.gameCode,
          status: updatedDoc.status,
          players: playersWithScores(updatedDoc),
          startedAt: updatedDoc.startedAt,
          finishedAt: updatedDoc.finishedAt,
          npcSeed: updatedDoc.npcSeed,
          createdAt: updatedDoc.createdAt,
        };
        io.to(roomId).emit('game-session-updated', { gameSession: gameSessionData });
        const classId = updatedDoc.class?._id ?? updatedDoc?.class;
        if (classId) io.to(`class-${classId}`).emit('game-session-updated', { gameSession: gameSessionData });
      }
    }

    // Refetch to get latest counts from all concurrent requests
    const updated = await GameSession.findById(sessionId).lean();
    if (typeof correctCount === 'number' && correctCount >= 0 && typeof timeToFinishSeconds === 'number' && timeToFinishSeconds >= 0) {
      const totalPoints = Number(updated?.playerScores?.[idStr]) || 0;
      const pointsAtRoundStart = Number(updated?.playerScoresAtRoundStart?.[idStr]) || 0;
      const pointsThisRound = Math.max(0, totalPoints - pointsAtRoundStart);
      await GameSession.findByIdAndUpdate(sessionId, {
        $set: { [`finishedResults.${idStr}`]: { points: pointsThisRound, correctAnswers: correctCount, timeToFinishSeconds } }
      });
    }
    const totalNeeded = Number(updated?.totalQuestionsPerPlayer) || 0;
    const counts = updated?.playerAnsweredCounts || {};
    const players = updated?.players || [];
    const roomId = `game-session-${String(sessionId)}`;
    if (totalNeeded > 0 && players.length > 0) {
      const allFinished = players.every((p) => {
        const pid = String(p && (p._id ?? p));
        return (Number(counts[pid]) || 0) >= totalNeeded;
      });
      if (allFinished) {
        const sessionDoc = await GameSession.findByIdAndUpdate(
          sessionId,
          { $set: { status: 'WAITING' }, $unset: { startedAt: 1, finishedAt: 1 } },
          { new: true }
        )
          .populate('quiz', 'title description category difficulty timeLimit gameMode')
          .populate('class', 'subject gradeLevel section classCode')
          .populate('teacher', 'firstName lastName email profilePicture')
          .populate('players', 'firstName lastName email profilePicture');
        try {
          await saveQuizResults(sessionId);
        } catch (err) {
          console.error('Save quiz results error:', err);
        }
        const io = getIO();
        io.to(roomId).emit('game-all-players-finished', { sessionId: String(sessionId) });
        const gameSessionData = {
          id: sessionDoc._id,
          _id: sessionDoc._id,
          quiz: sessionDoc.quiz,
          class: sessionDoc.class,
          teacher: sessionDoc.teacher,
          map: sessionDoc.map,
          gameCode: sessionDoc.gameCode,
          status: sessionDoc.status,
          players: playersWithScores(sessionDoc),
          startedAt: sessionDoc.startedAt,
          finishedAt: sessionDoc.finishedAt,
          npcSeed: sessionDoc.npcSeed,
          createdAt: sessionDoc.createdAt,
          allPlayersFinished: true
        };
        io.to(roomId).emit('game-session-updated', { gameSession: gameSessionData });
        const classId = sessionDoc.class?._id ?? sessionDoc.class;
        if (classId) io.to(`class-${classId}`).emit('game-session-updated', { gameSession: gameSessionData });
      }
    }

    res.json({ message: 'Answer recorded' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update current player's health (e.g. after boost or deduction); broadcasts so teacher sidebar updates
export const updatePlayerHealth = async (req, res) => {
  try {
    const { id: sessionId } = req.params;
    const { health } = req.body || {};
    const userId = req.userId;
    const idStr = toPlayerIdKey(userId);

    if (typeof health !== 'number' || health < 0) {
      return res.status(400).json({ message: 'Invalid health value' });
    }

    const gameSession = await GameSession.findById(sessionId);
    if (!gameSession) return res.status(404).json({ message: 'Game session not found' });
    const isPlayer = gameSession.players.some((p) => String(p && (p._id ?? p)) === idStr);
    if (!isPlayer) return res.status(403).json({ message: 'Not a player in this session' });

    await GameSession.findByIdAndUpdate(sessionId, { $set: { [`playerHealth.${idStr}`]: health } });
    const io = getIO();
    const roomId = `game-session-${String(sessionId)}`;
    const updatedDoc = await GameSession.findById(sessionId)
      .populate('quiz', 'title description category difficulty timeLimit gameMode')
      .populate('class', 'subject gradeLevel section classCode')
      .populate('teacher', 'firstName lastName email profilePicture')
      .populate('players', 'firstName lastName email profilePicture');
    if (updatedDoc) {
      const gameSessionData = {
        id: updatedDoc._id,
        _id: updatedDoc._id,
        quiz: updatedDoc.quiz,
        class: updatedDoc.class,
        teacher: updatedDoc.teacher,
        map: updatedDoc.map,
        gameCode: updatedDoc.gameCode,
        status: updatedDoc.status,
        players: playersWithScores(updatedDoc),
        startedAt: updatedDoc.startedAt,
        finishedAt: updatedDoc.finishedAt,
        npcSeed: updatedDoc.npcSeed,
        createdAt: updatedDoc.createdAt,
      };
      io.to(roomId).emit('game-session-updated', { gameSession: gameSessionData });
      const classId = updatedDoc.class?._id ?? updatedDoc?.class;
      if (classId) io.to(`class-${classId}`).emit('game-session-updated', { gameSession: gameSessionData });
    }
    res.json({ message: 'Health updated' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Teacher checks if game should be over (all players finished) - fixes missed socket events
export const checkGameOver = async (req, res) => {
  try {
    const { id: sessionId } = req.params;
    const userId = req.userId;

    const gameSession = await GameSession.findById(sessionId)
      .populate('quiz', 'title description category difficulty timeLimit gameMode questions')
      .populate('class', 'subject gradeLevel section classCode')
      .populate('teacher', 'firstName lastName email profilePicture')
      .populate('players', 'firstName lastName email profilePicture');
    if (!gameSession) return res.status(404).json({ message: 'Game session not found' });
    const teacherId = String(gameSession.teacher?._id ?? gameSession.teacher ?? '');
    if (teacherId !== String(userId)) return res.status(403).json({ message: 'Only the teacher can check game over' });

    if (gameSession.status !== 'PLAYING') {
      return res.json({ message: 'Session retrieved', gameSession: { ...gameSession.toObject(), allPlayersFinished: gameSession.status === 'WAITING' } });
    }

    let totalNeeded = Number(gameSession.totalQuestionsPerPlayer) || 0;
    if (totalNeeded === 0 && gameSession.quiz?.questions?.length) {
      totalNeeded = gameSession.quiz.questions.length;
    }
    const counts = gameSession.playerAnsweredCounts || {};
    const players = gameSession.players || [];
    const getCount = (p) => {
      const pid = String(p && (p._id ?? p));
      const v = counts[pid];
      return (v !== undefined && v !== null) ? Number(v) : 0;
    };
    const allFinished = totalNeeded > 0 && players.length > 0 && players.every((p) => getCount(p) >= totalNeeded);

    if (allFinished) {
      gameSession.status = 'WAITING';
      gameSession.startedAt = undefined;
      gameSession.finishedAt = undefined;
      await gameSession.save();
      try {
        await saveQuizResults(sessionId);
      } catch (err) {
        console.error('Save quiz results error:', err);
      }
      const io = getIO();
      const roomId = `game-session-${String(sessionId)}`;
      const gameSessionData = {
        id: gameSession._id,
        _id: gameSession._id,
        quiz: gameSession.quiz,
        class: gameSession.class,
        teacher: gameSession.teacher,
        map: gameSession.map,
        gameCode: gameSession.gameCode,
        status: gameSession.status,
        players: playersWithScores(gameSession),
        startedAt: gameSession.startedAt,
        finishedAt: gameSession.finishedAt,
        npcSeed: gameSession.npcSeed,
        createdAt: gameSession.createdAt,
        allPlayersFinished: true
      };
      io.to(roomId).emit('game-all-players-finished', { sessionId: String(sessionId) });
      io.to(roomId).emit('game-session-updated', { gameSession: gameSessionData });
      const classId = gameSession.class?._id ?? gameSession.class;
      if (classId) io.to(`class-${classId}`).emit('game-session-updated', { gameSession: gameSessionData });
    }

    const out = gameSession.toObject ? gameSession.toObject() : { ...gameSession };
    res.json({
      message: 'Session retrieved',
      gameSession: { ...out, allPlayersFinished: allFinished || gameSession.status === 'WAITING' }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// End game when timer reaches zero (any player or teacher can call)
export const endGameByTime = async (req, res) => {
  try {
    const sessionId = req.params.id;
    const userId = req.userId;

    const gameSession = await GameSession.findById(sessionId);
    if (!gameSession) {
      return res.status(404).json({ message: 'Game session not found' });
    }
    // Idempotent: if game already ended (e.g. all players finished), return current state with 200
    if (gameSession.status !== 'PLAYING') {
      await gameSession.populate('quiz', 'title description category difficulty timeLimit gameMode');
      await gameSession.populate('class', 'subject gradeLevel section classCode');
      await gameSession.populate('teacher', 'firstName lastName email profilePicture');
      await gameSession.populate('players', 'firstName lastName email profilePicture');
      const gameSessionData = {
        id: gameSession._id,
        _id: gameSession._id,
        quiz: gameSession.quiz,
        class: gameSession.class,
        teacher: gameSession.teacher,
        map: gameSession.map,
        gameCode: gameSession.gameCode,
        status: gameSession.status,
        players: playersWithScores(gameSession),
        startedAt: gameSession.startedAt,
        finishedAt: gameSession.finishedAt,
        npcSeed: gameSession.npcSeed,
        createdAt: gameSession.createdAt,
        allPlayersFinished: gameSession.status === 'WAITING'
      };
      return res.json({ message: 'Game already ended', gameSession: gameSessionData });
    }

    const teacherId = String(gameSession.teacher?._id ?? gameSession.teacher ?? '');
    const playerIds = (gameSession.players || []).map((p) => String(p._id ?? p.id ?? p));
    const isInSession = teacherId === String(userId) || playerIds.includes(String(userId));
    if (!isInSession) {
      return res.status(403).json({ message: 'Not in this game session' });
    }

    gameSession.status = 'WAITING';
    gameSession.startedAt = undefined;
    gameSession.finishedAt = undefined;
    await gameSession.save();

    try {
      await saveQuizResults(sessionId);
    } catch (err) {
      console.error('Save quiz results error:', err);
    }

    const io = getIO();
    const roomId = `game-session-${String(sessionId)}`;
    await gameSession.populate('quiz', 'title description category difficulty timeLimit gameMode');
    await gameSession.populate('class', 'subject gradeLevel section classCode');
    await gameSession.populate('teacher', 'firstName lastName email profilePicture');
    await gameSession.populate('players', 'firstName lastName email profilePicture');
    const gameSessionData = {
      id: gameSession._id,
      _id: gameSession._id,
      quiz: gameSession.quiz,
      class: gameSession.class,
      teacher: gameSession.teacher,
      map: gameSession.map,
      gameCode: gameSession.gameCode,
      status: gameSession.status,
      players: playersWithScores(gameSession),
      startedAt: gameSession.startedAt,
      finishedAt: gameSession.finishedAt,
      npcSeed: gameSession.npcSeed,
      createdAt: gameSession.createdAt,
      timeUp: true,
      allPlayersFinished: true
    };
    io.to(roomId).emit('game-session-updated', { gameSession: gameSessionData });
    const classId = gameSession.class?._id ?? gameSession.class;
    if (classId) io.to(`class-${classId}`).emit('game-session-updated', { gameSession: gameSessionData });

    res.json({
      message: 'Game ended (time up)',
      gameSession: gameSessionData
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Delete a game session (teacher only).
// Delete quiz history, but keep awarded points in pointawards so leaderboard totals remain unchanged.
export const deleteGameSession = async (req, res) => {
  try {
    const { id: sessionId } = req.params;
    const userId = req.userId;

    const gameSession = await GameSession.findById(sessionId);
    if (!gameSession) {
      return res.status(404).json({ message: 'Game session not found' });
    }

    const teacherId = String(gameSession.teacher?._id ?? gameSession.teacher ?? '');
    if (teacherId !== String(userId)) {
      return res.status(403).json({ message: 'Only the teacher who created this game can delete it' });
    }

    const existingQuizResult = await QuizResult.findOne({ gameSession: sessionId }).lean();
    if (existingQuizResult?.playerResults?.length) {
      await upsertPointAwards({
        sessionId,
        quizId: existingQuizResult.quiz,
        classId: existingQuizResult.class,
        playerResults: existingQuizResult.playerResults.map((result) => ({
          player: result.player,
          points: Number(result.points) || 0
        })),
        awardedAt: existingQuizResult.finishedAt || existingQuizResult.updatedAt || existingQuizResult.createdAt,
        roundNumber: Math.max(1, Number(gameSession.currentRoundNumber) || 1)
      });
    } else {
      const finishedResults = gameSession.finishedResults || {};
      const finishedPlayerIds = Object.keys(finishedResults).filter((pid) => pid && finishedResults[pid] != null);
      let fallbackPlayerResults = finishedPlayerIds.map((pid) => ({
        player: mongoose.Types.ObjectId.isValid(pid) ? new mongoose.Types.ObjectId(pid) : pid,
        points: Number(finishedResults?.[pid]?.points) || 0
      }));
      if (fallbackPlayerResults.length === 0) {
        const totalScores = gameSession.playerScores || {};
        const atRoundStart = gameSession.playerScoresAtRoundStart || {};
        fallbackPlayerResults = Object.entries(totalScores).map(([pid, points]) => {
          const key = toPlayerIdKey(pid);
          const startVal = Number(atRoundStart[pid] ?? atRoundStart[key]);
          const roundPoints = Number.isNaN(startVal) ? Number(points) || 0 : Math.max(0, (Number(points) || 0) - startVal);
          return {
            player: mongoose.Types.ObjectId.isValid(pid) ? new mongoose.Types.ObjectId(pid) : pid,
            points: roundPoints
          };
        }).filter((result) => result.points > 0);
      }
      await upsertPointAwards({
        sessionId,
        quizId: gameSession.quiz,
        classId: gameSession.class,
        playerResults: fallbackPlayerResults,
        awardedAt: gameSession.finishedAt || gameSession.updatedAt || gameSession.createdAt,
        roundNumber: Math.max(1, Number(gameSession.currentRoundNumber) || 1)
      });
    }

    await QuizResult.deleteMany({ gameSession: sessionId });
    await GameSession.findByIdAndDelete(sessionId);

    const io = getIO();
    const classId = gameSession.class?._id ?? gameSession.class;
    if (classId) {
      io.to(`class-${classId}`).emit('game-session-deleted', { sessionId: String(sessionId) });
    }
    io.to(`game-session-${sessionId}`).emit('game-session-deleted', { sessionId: String(sessionId) });

    res.json({ message: 'Game session deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Record when a player finishes the quiz (correct count and time to finish)
export const recordPlayerFinish = async (req, res) => {
  try {
    const { id: sessionId } = req.params;
    const correctCount = Number(req.body.correctCount);
    const timeToFinishSeconds = Number(req.body.timeToFinishSeconds);
    const finalPoints = req.body.points != null ? Number(req.body.points) : null;
    const userId = req.userId;

    if (Number.isNaN(correctCount) || correctCount < 0) {
      return res.status(400).json({ message: 'Valid correctCount (non-negative number) is required' });
    }
    if (Number.isNaN(timeToFinishSeconds) || timeToFinishSeconds < 0) {
      return res.status(400).json({ message: 'Valid timeToFinishSeconds (non-negative number) is required' });
    }

    const gameSession = await GameSession.findById(sessionId)
      .populate('quiz', 'questions gameMode');
    if (!gameSession) {
      return res.status(404).json({ message: 'Game session not found' });
    }

    const isPlayer = gameSession.players.some((p) => p.toString() === userId.toString());
    if (!isPlayer) {
      return res.status(403).json({ message: 'You are not a player in this game session' });
    }

    const idStr = toPlayerIdKey(userId);
    if (!gameSession.playerCorrectCounts || typeof gameSession.playerCorrectCounts !== 'object') {
      gameSession.playerCorrectCounts = {};
    }
    if (!gameSession.playerFinishTimes || typeof gameSession.playerFinishTimes !== 'object') {
      gameSession.playerFinishTimes = {};
    }
    if (!gameSession.playerAnsweredCounts || typeof gameSession.playerAnsweredCounts !== 'object') {
      gameSession.playerAnsweredCounts = {};
    }
    if (!gameSession.playerScores || typeof gameSession.playerScores !== 'object') {
      gameSession.playerScores = {};
    }
    const pointsAtRoundStart = Number(gameSession.playerScoresAtRoundStart?.[idStr]) || 0;
    gameSession.playerCorrectCounts[idStr] = correctCount;
    gameSession.playerFinishTimes[idStr] = timeToFinishSeconds;
    if (finalPoints != null && !Number.isNaN(finalPoints) && finalPoints >= 0) {
      gameSession.playerScores[idStr] = pointsAtRoundStart + finalPoints;
      gameSession.markModified('playerScores');
    }
    // So checkGameOver sees this player as finished (it uses playerAnsweredCounts >= totalNeeded)
    let totalNeeded = Number(gameSession.totalQuestionsPerPlayer) || 0;
    if (totalNeeded === 0 && gameSession.quiz?.questions?.length) {
      totalNeeded = gameSession.quiz.questions.length;
    }
    gameSession.playerAnsweredCounts[idStr] = Math.max(Number(gameSession.playerAnsweredCounts[idStr]) || 0, totalNeeded || 1);
    gameSession.markModified('playerCorrectCounts');
    gameSession.markModified('playerFinishTimes');
    gameSession.markModified('playerAnsweredCounts');

    // Accumulate this player's result temporarily; when game ends we write all at once to quizresults
    if (!gameSession.finishedResults || typeof gameSession.finishedResults !== 'object') {
      gameSession.finishedResults = {};
    }
    const totalPoints = Number(gameSession.playerScores?.[idStr]) || 0;
    const pointsThisRound = (finalPoints != null && !Number.isNaN(finalPoints) && finalPoints >= 0)
      ? finalPoints
      : Math.max(0, totalPoints - pointsAtRoundStart);
    gameSession.finishedResults[idStr] = {
      points: pointsThisRound,
      correctAnswers: correctCount,
      timeToFinishSeconds
    };
    gameSession.markModified('finishedResults');

    await gameSession.save();

    // Single-player sessions have only one player, so persist the quiz result immediately.
    // This avoids relying on later "all finished" / timer paths just to create quizresults.
    const isSinglePlayer = gameSession.quiz?.gameMode === 'SINGLE' || (gameSession.players || []).length === 1;
    if (isSinglePlayer) {
      try {
        await saveQuizResults(sessionId);
      } catch (err) {
        console.error('Save single-player quiz result error:', err);
      }
    }

    // If all players have now finished, set status to WAITING and emit (so teacher sees "all done" without clicking Check)
    const counts = gameSession.playerAnsweredCounts || {};
    const players = gameSession.players || [];
    const getCount = (p) => {
      const pid = String(p && (p._id ?? p));
      const v = counts[pid];
      return (v !== undefined && v !== null) ? Number(v) : 0;
    };
    const allFinished = totalNeeded > 0 && players.length > 0 && players.every((p) => getCount(p) >= totalNeeded);
    if (allFinished) {
      await GameSession.findByIdAndUpdate(sessionId, {
        $set: { status: 'WAITING' },
        $unset: { startedAt: 1, finishedAt: 1 }
      });
      try {
        await saveQuizResults(sessionId);
      } catch (err) {
        console.error('Save quiz results error:', err);
      }
      const sessionDoc = await GameSession.findById(sessionId)
        .populate('quiz', 'title description category difficulty timeLimit gameMode')
        .populate('class', 'subject gradeLevel section classCode')
        .populate('teacher', 'firstName lastName email profilePicture')
        .populate('players', 'firstName lastName email profilePicture');
      const io = getIO();
      const roomId = `game-session-${String(sessionId)}`;
      io.to(roomId).emit('game-all-players-finished', { sessionId: String(sessionId) });
      const gameSessionData = {
        id: sessionDoc._id,
        _id: sessionDoc._id,
        quiz: sessionDoc.quiz,
        class: sessionDoc.class,
        teacher: sessionDoc.teacher,
        map: sessionDoc.map,
        gameCode: sessionDoc.gameCode,
        status: sessionDoc.status,
        players: playersWithScores(sessionDoc),
        startedAt: sessionDoc.startedAt,
        finishedAt: sessionDoc.finishedAt,
        npcSeed: sessionDoc.npcSeed,
        createdAt: sessionDoc.createdAt,
        allPlayersFinished: true
      };
      io.to(roomId).emit('game-session-updated', { gameSession: gameSessionData });
      const classId = sessionDoc.class?._id ?? sessionDoc.class;
      if (classId) io.to(`class-${classId}`).emit('game-session-updated', { gameSession: gameSessionData });
    }

    res.json({ message: 'Finish recorded' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
