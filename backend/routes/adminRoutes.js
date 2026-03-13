import express from 'express';
import { getTeachers, createTeacher, updateTeacher, deleteTeacher } from '../controllers/adminController.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = express.Router();

// All admin routes require authentication
router.use(authenticate);

// Get all teachers
router.get('/teachers', getTeachers);

// Create teacher account
router.post('/teachers', createTeacher);

// Update teacher account
router.put('/teachers/:id', updateTeacher);

// Delete teacher account
router.delete('/teachers/:id', deleteTeacher);

export default router;

