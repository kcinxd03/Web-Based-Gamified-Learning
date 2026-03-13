import Quiz from '../models/Quiz.js';
import { getAccountModel } from '../models/accountModels.js';
import { Teacher } from '../models/accountModels.js';
import Class from '../models/Class.js';
import GameSession from '../models/GameSession.js';
import QuizResult from '../models/QuizResult.js';
import mongoose from 'mongoose';
import { getIO } from '../utils/socket.js';

// Create a new quiz
export const createQuiz = async (req, res) => {
  try {
    const { title, description, category, difficulty, timeLimit, classId, questions, gameMode } = req.body;
    const teacherId = req.userId;

    // Validate required fields
    if (!title || !title.trim()) {
      return res.status(400).json({ 
        message: 'Quiz title is required'
      });
    }

    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ 
        message: 'At least one question is required'
      });
    }

    if (!classId) {
      return res.status(400).json({ 
        message: 'Class ID is required'
      });
    }

    // Verify user is a teacher
    const teacher = await Teacher.findById(teacherId);
    if (!teacher) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (req.accountType !== 'TEACHER') {
      return res.status(403).json({ message: 'Only teachers can create quizzes' });
    }

    // Verify class exists and belongs to the teacher
    const classData = await Class.findById(classId);
    if (!classData) {
      return res.status(404).json({ message: 'Class not found' });
    }

    if (classData.teacher.toString() !== teacherId.toString()) {
      return res.status(403).json({ message: 'You can only create quizzes for your own classes' });
    }

    // Validate questions
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      
      if (!q.questionText || !q.questionText.trim()) {
        return res.status(400).json({ 
          message: `Question ${i + 1}: Question text is required`
        });
      }

      if (!q.questionType || !['qanda', 'truefalse', 'fillblank'].includes(q.questionType)) {
        return res.status(400).json({ 
          message: `Question ${i + 1}: Invalid question type`
        });
      }

      if (q.questionType === 'qanda') {
        if (!q.answers || !Array.isArray(q.answers) || q.answers.length < 4) {
          return res.status(400).json({ 
            message: `Question ${i + 1}: Multiple choice questions must have at least 4 answers`
          });
        }

        const hasCorrectAnswer = q.answers.some(a => a.isCorrect === true);
        if (!hasCorrectAnswer) {
          return res.status(400).json({ 
            message: `Question ${i + 1}: At least one answer must be marked as correct`
          });
        }

        const allAnswersHaveText = q.answers.every(a => a.text && a.text.trim());
        if (!allAnswersHaveText) {
          return res.status(400).json({ 
            message: `Question ${i + 1}: All answers must have text`
          });
        }
      } else if (q.questionType === 'truefalse') {
        if (q.correctAnswerBool === null || q.correctAnswerBool === undefined) {
          return res.status(400).json({ 
            message: `Question ${i + 1}: True/False questions must have a correct answer`
          });
        }
      } else if (q.questionType === 'fillblank') {
        if (!q.correctAnswer || !q.correctAnswer.trim()) {
          return res.status(400).json({ 
            message: `Question ${i + 1}: Fill in the blank questions must have a correct answer`
          });
        }
      }
    }

    // Normalize difficulty value (capitalize first letter)
    let normalizedDifficulty = '';
    if (difficulty && difficulty.trim()) {
      const lowerDifficulty = difficulty.trim().toLowerCase();
      if (lowerDifficulty === 'easy') {
        normalizedDifficulty = 'Easy';
      } else if (lowerDifficulty === 'medium') {
        normalizedDifficulty = 'Medium';
      } else if (lowerDifficulty === 'hard') {
        normalizedDifficulty = 'Hard';
      } else {
        // If it's already capitalized or doesn't match, use as-is (will be validated by enum)
        normalizedDifficulty = difficulty.trim();
      }
    }

    // Create quiz
    const validGameMode = gameMode === 'SINGLE' ? 'SINGLE' : 'MULTIPLAYER';
    const newQuiz = new Quiz({
      title: title.trim(),
      description: description?.trim() || '',
      category: category?.trim() || '',
      difficulty: normalizedDifficulty,
      timeLimit: timeLimit ? parseInt(timeLimit) : null,
      gameMode: validGameMode,
      teacher: teacherId,
      class: classId,
      questions: questions
    });

    await newQuiz.save();

    // Populate teacher and class info
    await newQuiz.populate('teacher', 'firstName lastName email');
    await newQuiz.populate('class', 'subject gradeLevel section classCode');

    // Emit socket event for real-time quiz creation
    const io = getIO();
    const quizData = {
      id: newQuiz._id,
      title: newQuiz.title,
      description: newQuiz.description,
      category: newQuiz.category,
      difficulty: newQuiz.difficulty,
      timeLimit: newQuiz.timeLimit,
      teacher: newQuiz.teacher,
      class: newQuiz.class,
      questionCount: newQuiz.questions.length,
      createdAt: newQuiz.createdAt
    };
    io.to(`class-${classId}`).emit('quiz-created', { quiz: quizData });

    res.status(201).json({
      message: 'Quiz created successfully',
      quiz: {
        id: newQuiz._id,
        title: newQuiz.title,
        description: newQuiz.description,
        category: newQuiz.category,
        difficulty: newQuiz.difficulty,
        timeLimit: newQuiz.timeLimit,
        teacher: newQuiz.teacher,
        class: newQuiz.class,
        questions: newQuiz.questions,
        createdAt: newQuiz.createdAt
      }
    });
  } catch (error) {
    res.status(500).json({ 
      message: 'Server error during quiz creation', 
      error: error.message
    });
  }
};

// Get quizzes for a teacher
export const getTeacherQuizzes = async (req, res) => {
  try {
    const teacherId = req.userId;

    // Verify user is a teacher
    const teacher = await Teacher.findById(teacherId);
    if (!teacher) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (req.accountType !== 'TEACHER') {
      return res.status(403).json({ message: 'Only teachers can view their quizzes' });
    }

    // Get all quizzes created by this teacher
    const quizzes = await Quiz.find({ teacher: teacherId })
      .populate('teacher', 'firstName lastName email')
      .populate('class', 'subject gradeLevel section classCode')
      .sort({ createdAt: -1 });

    res.json({
      message: 'Quizzes retrieved successfully',
      quizzes: quizzes.map(quiz => ({
        id: quiz._id,
        title: quiz.title,
        description: quiz.description,
        category: quiz.category,
        difficulty: quiz.difficulty,
        timeLimit: quiz.timeLimit,
        teacher: quiz.teacher,
        class: quiz.class ? {
          id: quiz.class._id || quiz.class.id || quiz.class,
          subject: quiz.class.subject,
          gradeLevel: quiz.class.gradeLevel,
          section: quiz.class.section,
          classCode: quiz.class.classCode
        } : null,
        questionCount: quiz.questions.length,
        createdAt: quiz.createdAt
      }))
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get quizzes for a specific class (accessible by both teachers and students)
export const getClassQuizzes = async (req, res) => {
  try {
    const { classId } = req.params;
    const userId = req.userId;

    // Validate classId
    if (!classId) {
      return res.status(400).json({ message: 'Class ID is required' });
    }

    // Verify user exists
    const UserModel = getAccountModel(req.accountType);
    const user = await UserModel.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Verify class exists
    const classData = await Class.findById(classId);
    if (!classData) {
      return res.status(404).json({ message: 'Class not found' });
    }

    // Verify user has access to this class
    let hasAccess = false;
    if (req.accountType === 'TEACHER') {
      hasAccess = classData.teacher.toString() === userId.toString();
    } else if (req.accountType === 'STUDENT') {
      hasAccess = classData.students.some(
        studentId => studentId.toString() === userId.toString()
      );
    }

    if (!hasAccess) {
      return res.status(403).json({ message: 'You do not have access to this class' });
    }

    // Get all quizzes for this class
    const quizzes = await Quiz.find({ class: classId })
      .populate('teacher', 'firstName lastName email')
      .populate('class', 'subject gradeLevel section classCode')
      .sort({ createdAt: -1 });

    // For students: which single-player quizzes have they already played? (one play per quiz)
    let playedSinglePlayerQuizIds = new Set();
    if (req.accountType === 'STUDENT') {
      const playedSessions = await GameSession.find(
        {
          class: new mongoose.Types.ObjectId(classId),
          players: new mongoose.Types.ObjectId(userId)
        },
        { quiz: 1 }
      ).lean();
      playedSessions.forEach((s) => {
        if (s.quiz) playedSinglePlayerQuizIds.add(String(s.quiz));
      });
    }

    res.json({
      message: 'Quizzes retrieved successfully',
      quizzes: quizzes.map(quiz => {
        const isSingle = (quiz.gameMode || 'MULTIPLAYER') === 'SINGLE';
        const singlePlayerAlreadyPlayed = isSingle && req.accountType === 'STUDENT' && playedSinglePlayerQuizIds.has(String(quiz._id));
        return {
          id: quiz._id,
          title: quiz.title,
          description: quiz.description,
          category: quiz.category,
          difficulty: quiz.difficulty,
          timeLimit: quiz.timeLimit,
          gameMode: quiz.gameMode || 'MULTIPLAYER',
          singlePlayerAlreadyPlayed: singlePlayerAlreadyPlayed || false,
          teacher: quiz.teacher,
          class: quiz.class ? {
            id: quiz.class._id || quiz.class.id || quiz.class,
            subject: quiz.class.subject,
            gradeLevel: quiz.class.gradeLevel,
            section: quiz.class.section,
            classCode: quiz.class.classCode
          } : null,
          questionCount: quiz.questions.length,
          createdAt: quiz.createdAt
        };
      })
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get a single quiz by ID
export const getQuizById = async (req, res) => {
  try {
    const { id } = req.params;

    const quiz = await Quiz.findById(id)
      .populate('teacher', 'firstName lastName email')
      .populate('class', 'subject gradeLevel section classCode');

    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    res.json({
      message: 'Quiz retrieved successfully',
      quiz: {
        id: quiz._id,
        title: quiz.title,
        description: quiz.description,
        category: quiz.category,
        difficulty: quiz.difficulty,
        timeLimit: quiz.timeLimit,
        gameMode: quiz.gameMode || 'MULTIPLAYER',
        teacher: quiz.teacher,
        class: quiz.class,
        questions: quiz.questions,
        createdAt: quiz.createdAt
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update a quiz
export const updateQuiz = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, category, difficulty, timeLimit, questions, gameMode } = req.body;
    const teacherId = req.userId;

    if (!title || !title.trim()) {
      return res.status(400).json({ message: 'Quiz title is required' });
    }
    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ message: 'At least one question is required' });
    }

    const teacher = await Teacher.findById(teacherId);
    if (!teacher) return res.status(404).json({ message: 'User not found' });
    if (req.accountType !== 'TEACHER') {
      return res.status(403).json({ message: 'Only teachers can update quizzes' });
    }

    const quiz = await Quiz.findById(id);
    if (!quiz) return res.status(404).json({ message: 'Quiz not found' });
    if (quiz.teacher.toString() !== teacherId.toString()) {
      return res.status(403).json({ message: 'You can only update your own quizzes' });
    }

    // Same question validation as create
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.questionText || !q.questionText.trim()) {
        return res.status(400).json({ message: `Question ${i + 1}: Question text is required` });
      }
      if (!q.questionType || !['qanda', 'truefalse', 'fillblank'].includes(q.questionType)) {
        return res.status(400).json({ message: `Question ${i + 1}: Invalid question type` });
      }
      if (q.questionType === 'qanda') {
        if (!q.answers || !Array.isArray(q.answers) || q.answers.length < 4) {
          return res.status(400).json({ message: `Question ${i + 1}: Multiple choice must have at least 4 answers` });
        }
        if (!q.answers.some(a => a.isCorrect === true)) {
          return res.status(400).json({ message: `Question ${i + 1}: At least one answer must be correct` });
        }
        if (!q.answers.every(a => a.text && a.text.trim())) {
          return res.status(400).json({ message: `Question ${i + 1}: All answers must have text` });
        }
      } else if (q.questionType === 'truefalse') {
        if (q.correctAnswerBool === null && q.correctAnswerBool === undefined) {
          return res.status(400).json({ message: `Question ${i + 1}: True/False must have correct answer` });
        }
      } else if (q.questionType === 'fillblank') {
        if (!q.correctAnswer || !q.correctAnswer.trim()) {
          return res.status(400).json({ message: `Question ${i + 1}: Fill in the blank must have correct answer` });
        }
      }
    }

    let normalizedDifficulty = '';
    if (difficulty && difficulty.trim()) {
      const d = difficulty.trim().toLowerCase();
      if (d === 'easy') normalizedDifficulty = 'Easy';
      else if (d === 'medium') normalizedDifficulty = 'Medium';
      else if (d === 'hard') normalizedDifficulty = 'Hard';
      else normalizedDifficulty = difficulty.trim();
    }

    const normalizedRequestedGameMode = gameMode === 'SINGLE' ? 'SINGLE' : 'MULTIPLAYER';
    const currentGameMode = quiz.gameMode === 'SINGLE' ? 'SINGLE' : 'MULTIPLAYER';
    if (normalizedRequestedGameMode !== currentGameMode) {
      return res.status(400).json({ message: 'Game mode cannot be changed after the quiz is created' });
    }

    quiz.title = title.trim();
    quiz.description = description?.trim() || '';
    quiz.category = category?.trim() || '';
    quiz.difficulty = normalizedDifficulty;
    quiz.timeLimit = timeLimit != null ? parseInt(timeLimit) : null;
    quiz.questions = questions;
    await quiz.save();

    await quiz.populate('teacher', 'firstName lastName email');
    await quiz.populate('class', 'subject gradeLevel section classCode');

    res.json({
      message: 'Quiz updated successfully',
      quiz: {
        id: quiz._id,
        title: quiz.title,
        description: quiz.description,
        category: quiz.category,
        difficulty: quiz.difficulty,
        timeLimit: quiz.timeLimit,
        teacher: quiz.teacher,
        class: quiz.class,
        questions: quiz.questions,
        createdAt: quiz.createdAt
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Delete a quiz
export const deleteQuiz = async (req, res) => {
  try {
    const { id } = req.params;
    const teacherId = req.userId;

    // Verify user is a teacher
    const teacher = await Teacher.findById(teacherId);
    if (!teacher) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (req.accountType !== 'TEACHER') {
      return res.status(403).json({ message: 'Only teachers can delete quizzes' });
    }

    // Find the quiz
    const quiz = await Quiz.findById(id);
    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    // Verify the quiz belongs to the teacher
    if (quiz.teacher.toString() !== teacherId.toString()) {
      return res.status(403).json({ message: 'You can only delete your own quizzes' });
    }

    // Get classId before deleting
    const classId = quiz.class.toString();
    const io = getIO();

    // Delete all game sessions for this quiz (and their quiz results) so they are removed from the DB
    const sessions = await GameSession.find({ quiz: id }).select('_id').lean();
    const sessionIds = sessions.map((s) => s._id);
    if (sessionIds.length > 0) {
      await QuizResult.deleteMany({ gameSession: { $in: sessionIds } });
      await GameSession.deleteMany({ quiz: id });
      sessionIds.forEach((sid) => {
        io.to(`game-session-${sid}`).emit('game-session-deleted', { sessionId: String(sid) });
      });
      if (classId) {
        sessionIds.forEach((sid) => {
          io.to(`class-${classId}`).emit('game-session-deleted', { sessionId: String(sid) });
        });
      }
    }

    // Delete the quiz
    await Quiz.findByIdAndDelete(id);

    // Emit socket event for real-time quiz deletion
    io.to(`class-${classId}`).emit('quiz-deleted', { quizId: id });

    res.json({
      message: 'Quiz deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

