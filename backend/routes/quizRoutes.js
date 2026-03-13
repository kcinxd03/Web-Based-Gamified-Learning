import express from 'express';
import { createQuiz, getTeacherQuizzes, getClassQuizzes, getQuizById, updateQuiz, deleteQuiz } from '../controllers/quizController.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = express.Router();

// Quiz routes
router.post('/', authenticate, createQuiz);
router.get('/teacher', authenticate, getTeacherQuizzes);
router.get('/class/:classId', authenticate, getClassQuizzes);
router.get('/:id', authenticate, getQuizById);
router.put('/:id', authenticate, updateQuiz);
router.delete('/:id', authenticate, deleteQuiz);

export default router;

