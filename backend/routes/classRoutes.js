import express from 'express';
import { createClass, getTeacherClasses, getAllClasses, getClassById, getClassLeaderboard, joinClass, getStudentClasses, removeStudentFromClass, leaveClass, deleteClass } from '../controllers/classController.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Create a new class (teacher only)
router.post('/', createClass);

// Join a class by class code (student only)
router.post('/join', joinClass);

// Get classes for the authenticated teacher
router.get('/teacher', getTeacherClasses);

// Get classes for the authenticated student
router.get('/student', getStudentClasses);

// Get all classes (for students)
router.get('/', getAllClasses);

// Get class leaderboard (students with total points from games)
router.get('/:id/leaderboard', getClassLeaderboard);

// Get a single class by ID
router.get('/:id', getClassById);

// Leave a class (student only; removes student and clears their progress in this class)
router.post('/:id/leave', leaveClass);

// Remove a student from a class (teacher only)
router.delete('/:id/students/:studentId', removeStudentFromClass);

// Delete a class (teacher only)
router.delete('/:id', deleteClass);

export default router;

