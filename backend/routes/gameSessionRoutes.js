import express from 'express';
import { createGameSession, updateGameSession, getGameSessionById, joinGameSession, leaveGameSession, kickPlayerFromSession, getActiveSessionsForClass, getLatestSessionForQuiz, addScoreToPlayer, recordAnswerToPlayer, recordPlayerFinish, endGameByTime, checkGameOver, updatePlayerHealth, deleteGameSession, broadcastGameInvite } from '../controllers/gameSessionController.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = express.Router();

// Game session routes
router.post('/', authenticate, createGameSession);
router.post('/join', authenticate, joinGameSession);
router.post('/:id/leave', authenticate, leaveGameSession);
router.post('/:id/kick', authenticate, kickPlayerFromSession);
router.post('/:id/add-score', authenticate, addScoreToPlayer);
router.post('/:id/record-answer', authenticate, recordAnswerToPlayer);
router.post('/:id/update-health', authenticate, updatePlayerHealth);
router.post('/:id/record-finish', authenticate, recordPlayerFinish);
router.post('/:id/end-by-time', authenticate, endGameByTime);
router.get('/class/:classId/active', authenticate, getActiveSessionsForClass);
router.get('/class/:classId/latest/:quizId', authenticate, getLatestSessionForQuiz);
router.put('/:id', authenticate, updateGameSession);
router.get('/:id', authenticate, getGameSessionById);
router.post('/:id/broadcast-invite', authenticate, broadcastGameInvite);
router.delete('/:id', authenticate, deleteGameSession);
router.post('/:id/check-game-over', authenticate, checkGameOver);

export default router;

