import express from 'express';
import { getQuizResultsByClass } from '../controllers/quizResultController.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/class/:classId', authenticate, getQuizResultsByClass);

export default router;
