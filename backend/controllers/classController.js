import mongoose from 'mongoose';
import Class from '../models/Class.js';
import { Teacher, Student, getAccountModel } from '../models/accountModels.js';
import Quiz from '../models/Quiz.js';
import GameSession from '../models/GameSession.js';
import QuizResult from '../models/QuizResult.js';
import PointAward from '../models/PointAward.js';

// Create a new class
export const createClass = async (req, res) => {
  try {
    const { subject, gradeLevel, section } = req.body;
    const teacherId = req.userId;

    // Validate required fields
    if (!subject || !gradeLevel || !section) {
      return res.status(400).json({ 
        message: 'Please provide all required fields',
        missing: {
          subject: !subject,
          gradeLevel: !gradeLevel,
          section: !section
        }
      });
    }

    // Verify user is a teacher (from teachers collection)
    const teacher = await Teacher.findById(teacherId);
    if (!teacher) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Create new class
    // Retry logic in case of duplicate class code
    let newClass;
    let attempts = 0;
    const maxAttempts = 5;
    
    while (attempts < maxAttempts) {
      try {
        newClass = new Class({
          subject: subject.trim(),
          gradeLevel: gradeLevel.trim(),
          section: section.trim(),
          teacher: teacherId,
          teacherName: `${teacher.firstName} ${teacher.lastName}`,
          students: [] // Initialize empty students array
        });

        await newClass.save();
        break; // Success, exit loop
      } catch (saveError) {
        // If duplicate class code error, retry
        if (saveError.code === 11000 && saveError.keyPattern?.classCode) {
          attempts++;
          if (attempts >= maxAttempts) {
            throw new Error('Failed to generate unique class code after multiple attempts');
          }
          // Clear the classCode to generate a new one
          continue;
        }
        // If it's a different error, throw it
        throw saveError;
      }
    }

    // Populate teacher info
    await newClass.populate('teacher', 'firstName lastName email');

    res.status(201).json({
      message: 'Class created successfully',
      class: {
        id: newClass._id,
        subject: newClass.subject,
        gradeLevel: newClass.gradeLevel,
        section: newClass.section,
        teacher: newClass.teacher,
        teacherName: newClass.teacherName,
        classCode: newClass.classCode,
        students: newClass.students,
        createdAt: newClass.createdAt
      }
    });
  } catch (error) {
    
    // Handle duplicate class code error (shouldn't happen with pre-save hook, but just in case)
    if (error.code === 11000) {
      return res.status(400).json({ 
        message: 'Class code already exists. Please try again.',
        error: 'Duplicate class code'
      });
    }
    
    res.status(500).json({ 
      message: 'Server error during class creation', 
      error: error.message
    });
  }
};

// Get classes for a teacher
export const getTeacherClasses = async (req, res) => {
  try {
    const teacherId = req.userId;

    const teacher = await Teacher.findById(teacherId);
    if (!teacher) {
      return res.status(404).json({ message: 'User not found' });
    }

    const classes = await Class.find({ teacher: teacherId })
      .populate('teacher', 'firstName lastName email')
      .populate('students', 'firstName lastName email gender profilePicture')
      .sort({ createdAt: -1 });

    res.json({
      message: 'Classes retrieved successfully',
      classes: classes.map(cls => ({
        id: cls._id,
        subject: cls.subject,
        gradeLevel: cls.gradeLevel,
        section: cls.section,
        teacher: cls.teacher,
        teacherName: cls.teacherName,
        classCode: cls.classCode,
        studentCount: cls.students.length,
        createdAt: cls.createdAt
      }))
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get all classes (for students to join)
export const getAllClasses = async (req, res) => {
  try {
    const classes = await Class.find()
      .populate('teacher', 'firstName lastName email')
      .select('-students')
      .sort({ createdAt: -1 });

    res.json({
      message: 'Classes retrieved successfully',
      classes: classes.map(cls => ({
        id: cls._id,
        subject: cls.subject,
        gradeLevel: cls.gradeLevel,
        section: cls.section,
        teacher: cls.teacher,
        teacherName: cls.teacherName,
        classCode: cls.classCode,
        createdAt: cls.createdAt
      }))
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/** Normalize user id to a canonical string for consistent lookup (matches gameSession playerScores keys) */
function normalizeUserId(val) {
  if (val == null) return '';
  if (typeof val === 'string' && mongoose.Types.ObjectId.isValid(val)) return new mongoose.Types.ObjectId(val).toString();
  if (typeof val === 'object' && val.toString && typeof val.toString === 'function') return val.toString();
  return String(val);
}

function getSessionPlayerRoundStatus(sessionById, awardBySessionPlayer, sessionId, playerId) {
  const session = sessionById[sessionId];
  const currentRoundNumber = Math.max(0, Number(session?.currentRoundNumber) || 0);
  const award = awardBySessionPlayer[`${sessionId}:${playerId}`];
  const awardedRound = Math.max(0, Number(award?.lastAwardedRound) || 0);
  return {
    hasAward: !!award,
    isAwardCurrent: !!award && awardedRound >= currentRoundNumber
  };
}

// Get leaderboard for a class.
// Total points come from point awards so deleting a game removes history but not earned points.
// Last-game points still come from visible quiz history or, if needed, the active session fallback.
export const getClassLeaderboard = async (req, res) => {
  try {
    const { id: classId } = req.params;
    const classData = await Class.findById(classId)
      .populate('students', 'firstName lastName email gender profilePicture');

    if (!classData) {
      return res.status(404).json({ message: 'Class not found' });
    }

    const pointAwards = await PointAward.find({ class: classId })
      .select('gameSession player points lastAwardedRound')
      .lean();
    const awardedSessionIdSet = new Set(
      pointAwards.map((award) => normalizeUserId(award.gameSession)).filter(Boolean)
    );
    const awardBySessionPlayer = {};
    const pointsByUser = {};
    for (const award of pointAwards) {
      const sessionId = normalizeUserId(award.gameSession);
      const key = normalizeUserId(award.player);
      if (sessionId && key) {
        awardBySessionPlayer[`${sessionId}:${key}`] = award;
      }
      const n = Number(award.points);
      if (!Number.isNaN(n) && n >= 0) {
        pointsByUser[key] = (pointsByUser[key] || 0) + n;
      }
    }

    const quizResults = await QuizResult.find({ class: classId })
      .select('gameSession playerResults finishedAt updatedAt createdAt')
      .sort({ finishedAt: -1, updatedAt: -1, createdAt: -1 })
      .lean();
    const resultSessionIdSet = new Set(
      quizResults
      .map((r) => normalizeUserId(r.gameSession))
      .filter(Boolean)
    );
    const sessions = await GameSession.find({ class: classId })
      .select('_id playerScores playerScoresAtRoundStart currentRoundNumber createdAt updatedAt')
      .sort({ updatedAt: -1, createdAt: -1 })
      .lean();
    const sessionById = {};
    sessions.forEach((session) => {
      const sessionId = normalizeUserId(session._id);
      if (sessionId) sessionById[sessionId] = session;
    });
    let lastGamePointsByUser = {};
    for (const result of quizResults) {
      const sessionId = normalizeUserId(result.gameSession);
      for (const playerResult of result.playerResults || []) {
        const key = normalizeUserId(playerResult.player);
        const { hasAward, isAwardCurrent } = getSessionPlayerRoundStatus(sessionById, awardBySessionPlayer, sessionId, key);
        if (hasAward && isAwardCurrent) continue;
        const n = Number(playerResult.points);
        if (!Number.isNaN(n) && n >= 0) {
          pointsByUser[key] = (pointsByUser[key] || 0) + n;
        }
      }
    }
    const latestQuizResult = quizResults.find((result) => Array.isArray(result.playerResults) && result.playerResults.length > 0);
    if (latestQuizResult) {
      for (const playerResult of latestQuizResult.playerResults || []) {
        const key = normalizeUserId(playerResult.player);
        const n = Number(playerResult.points);
        if (!Number.isNaN(n) && n >= 0) {
          lastGamePointsByUser[key] = n;
        }
      }
    }
    const fallbackSessions = sessions.filter((session) => {
      const sessionId = normalizeUserId(session._id);
      return sessionId && !awardedSessionIdSet.has(sessionId) && !resultSessionIdSet.has(sessionId);
    });
    if (!latestQuizResult) {
      // Last game = most recently updated fallback session that has at least one score
      const lastPlayedSession = fallbackSessions.find((s) => {
        const scores = s.playerScores || {};
        return Object.keys(scores).length > 0;
      });
      if (lastPlayedSession) {
        const lastScores = lastPlayedSession.playerScores || {};
        const atRoundStart = lastPlayedSession.playerScoresAtRoundStart || {};
        for (const [userId, points] of Object.entries(lastScores)) {
          const n = Number(points);
          if (!Number.isNaN(n) && n >= 0) {
            const key = normalizeUserId(userId);
            const startVal = Number(atRoundStart[userId] ?? atRoundStart[key]);
            const roundPoints = Number.isNaN(startVal) ? n : Math.max(0, n - startVal);
            lastGamePointsByUser[key] = roundPoints;
          }
        }
      }
    }
    for (const session of fallbackSessions) {
      const scores = session.playerScores || {};
      for (const [userId, points] of Object.entries(scores)) {
        const n = Number(points);
        if (!Number.isNaN(n) && n >= 0) {
          const key = normalizeUserId(userId);
          pointsByUser[key] = (pointsByUser[key] || 0) + n;
        }
      }
    }

    const students = (classData.students || []).map((s) => {
      const po = s.toObject ? s.toObject() : { ...s };
      const id = normalizeUserId(po._id ?? po.id ?? '');
      const totalPoints = pointsByUser[id] ?? 0;
      const lastGamePoints = lastGamePointsByUser[id] ?? 0;
      return {
        ...po,
        totalPoints,
        lastGamePoints
      };
    }).sort((a, b) => (b.totalPoints ?? 0) - (a.totalPoints ?? 0));

    // Compute overall leaderboard (all classes). Prefer point awards so deleted sessions keep their points.
    const allPointAwards = await PointAward.find()
      .select('gameSession player points lastAwardedRound')
      .lean();
    const coveredGlobalAwardSessionIds = new Set(
      allPointAwards.map((award) => normalizeUserId(award.gameSession)).filter(Boolean)
    );
    const globalAwardBySessionPlayer = {};
    const globalPointsByUser = {};
    for (const award of allPointAwards) {
      const sessionId = normalizeUserId(award.gameSession);
      const playerId = normalizeUserId(award.player);
      if (sessionId && playerId) {
        globalAwardBySessionPlayer[`${sessionId}:${playerId}`] = award;
      }
      const n = Number(award.points);
      if (!Number.isNaN(n) && n >= 0) {
        globalPointsByUser[playerId] = (globalPointsByUser[playerId] || 0) + n;
      }
    }
    const allQuizResults = await QuizResult.find()
      .select('gameSession playerResults')
      .lean();
    const allSessions = await GameSession.find()
      .select('_id playerScores currentRoundNumber')
      .lean();
    const globalSessionById = {};
    allSessions.forEach((session) => {
      const sessionId = normalizeUserId(session._id);
      if (sessionId) globalSessionById[sessionId] = session;
    });
    const coveredGlobalResultSessionIds = new Set(
      allQuizResults.map((result) => normalizeUserId(result.gameSession)).filter(Boolean)
    );
    for (const result of allQuizResults) {
      const sessionId = normalizeUserId(result.gameSession);
      for (const playerResult of result.playerResults || []) {
        const playerId = normalizeUserId(playerResult.player);
        const { hasAward, isAwardCurrent } = getSessionPlayerRoundStatus(globalSessionById, globalAwardBySessionPlayer, sessionId, playerId);
        if (hasAward && isAwardCurrent) continue;
        const n = Number(playerResult.points);
        if (!Number.isNaN(n) && n >= 0) {
          globalPointsByUser[playerId] = (globalPointsByUser[playerId] || 0) + n;
        }
      }
    }
    for (const session of allSessions) {
      const sessionId = normalizeUserId(session._id);
      if (sessionId && (coveredGlobalAwardSessionIds.has(sessionId) || coveredGlobalResultSessionIds.has(sessionId))) continue;
      const scores = session.playerScores || {};
      for (const [userId, points] of Object.entries(scores)) {
        const n = Number(points);
        if (!Number.isNaN(n) && n >= 0) {
          const key = normalizeUserId(userId);
          globalPointsByUser[key] = (globalPointsByUser[key] || 0) + n;
        }
      }
    }
    // Include all class students in overall ranking (with 0 if they have no global points)
    for (const s of students) {
      const id = normalizeUserId(s._id ?? s.id ?? '');
      if (id && globalPointsByUser[id] == null) {
        globalPointsByUser[id] = 0;
      }
    }
    const sortedByGlobal = Object.entries(globalPointsByUser)
      .sort((a, b) => (b[1] || 0) - (a[1] || 0));
    const overallRankByUser = {};
    sortedByGlobal.forEach(([userId], index) => {
      overallRankByUser[userId] = index + 1;
    });

    const studentsWithOverallRank = students.map((s) => {
      const id = normalizeUserId(s._id ?? s.id ?? '');
      return {
        ...s,
        overallRank: overallRankByUser[id] ?? null
      };
    });

    res.json({
      message: 'Leaderboard retrieved successfully',
      students: studentsWithOverallRank
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get a single class by ID
export const getClassById = async (req, res) => {
  try {
    const { id } = req.params;

    const classData = await Class.findById(id)
      .populate('teacher', 'firstName lastName email')
      .populate('students', 'firstName lastName email gender profilePicture');

    if (!classData) {
      return res.status(404).json({ message: 'Class not found' });
    }

    res.json({
      message: 'Class retrieved successfully',
      class: {
        id: classData._id,
        subject: classData.subject,
        gradeLevel: classData.gradeLevel,
        section: classData.section,
        teacher: classData.teacher,
        teacherName: classData.teacherName,
        classCode: classData.classCode,
        students: classData.students,
        createdAt: classData.createdAt
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Join a class by class code (for students)
export const joinClass = async (req, res) => {
  try {
    const { classCode } = req.body;
    const studentId = req.userId;

    // Validate class code
    if (!classCode || !classCode.trim()) {
      return res.status(400).json({ message: 'Class code is required' });
    }

    // Verify user is a student (from students collection)
    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Find class by class code
    const classData = await Class.findOne({ classCode: classCode.trim() })
      .populate('teacher', 'firstName lastName email');

    if (!classData) {
      return res.status(404).json({ message: 'Class not found. Please check the class code.' });
    }

    // Check if student is already in the class
    if (classData.students.some((s) => s.toString() === studentId.toString())) {
      // Student already in class, return the class data
      await classData.populate('students', 'firstName lastName email gender profilePicture');
      return res.json({
        message: 'You are already in this class',
        class: {
          id: classData._id,
          subject: classData.subject,
          gradeLevel: classData.gradeLevel,
          section: classData.section,
          teacher: classData.teacher,
          teacherName: classData.teacherName,
          classCode: classData.classCode,
          studentCount: classData.students.length,
          createdAt: classData.createdAt
        }
      });
    }

    // Add student to class
    classData.students.push(studentId);
    await classData.save();

    // Populate students for response
    await classData.populate('students', 'firstName lastName email gender profilePicture');

    res.json({
      message: 'Successfully joined class',
      class: {
        id: classData._id,
        subject: classData.subject,
        gradeLevel: classData.gradeLevel,
        section: classData.section,
        teacher: classData.teacher,
        teacherName: classData.teacherName,
        classCode: classData.classCode,
        studentCount: classData.students.length,
        createdAt: classData.createdAt
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get classes for a student
export const getStudentClasses = async (req, res) => {
  try {
    const studentId = req.userId;

    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ message: 'User not found' });
    }

    const classes = await Class.find({ students: studentId })
      .populate('teacher', 'firstName lastName email')
      .populate('students', 'firstName lastName email gender profilePicture')
      .sort({ createdAt: -1 });

    res.json({
      message: 'Classes retrieved successfully',
      classes: classes.map(cls => ({
        id: cls._id,
        subject: cls.subject,
        gradeLevel: cls.gradeLevel,
        section: cls.section,
        teacher: cls.teacher,
        teacherName: cls.teacherName,
        classCode: cls.classCode,
        studentCount: cls.students.length,
        createdAt: cls.createdAt
      }))
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Remove a student from a class (teacher only)
export const removeStudentFromClass = async (req, res) => {
  try {
    const { id: classId, studentId } = req.params;
    const teacherId = req.userId;

    const teacher = await Teacher.findById(teacherId);
    if (!teacher) {
      return res.status(403).json({ message: 'Only the teacher of this class can remove students' });
    }

    const classData = await Class.findById(classId);
    if (!classData) {
      return res.status(404).json({ message: 'Class not found' });
    }
    if (classData.teacher.toString() !== teacherId.toString()) {
      return res.status(403).json({ message: 'You can only remove students from your own classes' });
    }

    const sid = normalizeUserId(studentId);
    const before = classData.students.length;
    classData.students = classData.students.filter(
      (s) => normalizeUserId(s._id ?? s.id ?? s) !== sid
    );
    if (classData.students.length === before) {
      return res.status(404).json({ message: 'Student not found in this class' });
    }
    await classData.save();

    // Clear this student's progress in this classroom: game sessions and quiz results
    const sessions = await GameSession.find({ class: classId }).lean();
    for (const session of sessions) {
      const update = { $pull: { players: studentId } };
      const unset = {};
      const mixedFields = [
        'playerScores',
        'playerScoresAtRoundStart',
        'playerAnsweredCounts',
        'playerCorrectCounts',
        'playerFinishTimes',
        'playerHealth',
        'finishedResults'
      ];
      for (const field of mixedFields) {
        const obj = session[field];
        if (obj && typeof obj === 'object') {
          const keysToRemove = Object.keys(obj).filter(
            (k) => normalizeUserId(k) === sid
          );
          for (const k of keysToRemove) {
            unset[`${field}.${k}`] = 1;
          }
        }
      }
      if (Object.keys(unset).length > 0) {
        update.$unset = unset;
      }
      await GameSession.updateOne({ _id: session._id }, update);
    }

    // Remove this student's saved class points and quiz results for this class
    await PointAward.deleteMany({ class: classId, player: studentId });
    await QuizResult.updateMany(
      { class: classId },
      { $pull: { playerResults: { player: studentId } } }
    );

    res.json({
      message: 'Student removed from class successfully',
      class: {
        id: classData._id,
        subject: classData.subject,
        gradeLevel: classData.gradeLevel,
        section: classData.section,
        classCode: classData.classCode,
        studentCount: classData.students.length
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Leave a class (student only). Removes the student from the class and clears their progress in all game sessions for that class.
export const leaveClass = async (req, res) => {
  try {
    const { id: classId } = req.params;
    const studentId = req.userId;

    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(403).json({ message: 'Only students can leave a class' });
    }

    const classData = await Class.findById(classId);
    if (!classData) {
      return res.status(404).json({ message: 'Class not found' });
    }

    const sid = normalizeUserId(studentId);
    const wasInClass = classData.students.some(
      (s) => normalizeUserId(s._id ?? s.id ?? s) === sid
    );
    if (!wasInClass) {
      return res.status(400).json({ message: 'You are not in this class' });
    }

    // Remove student from class
    classData.students = classData.students.filter(
      (s) => normalizeUserId(s._id ?? s.id ?? s) !== sid
    );
    await classData.save();

    // Clear this student's progress from all game sessions for this class
    const sessions = await GameSession.find({ class: classId }).lean();
    for (const session of sessions) {
      const update = { $pull: { players: studentId } };
      const unset = {};
      const mixedFields = [
        'playerScores',
        'playerScoresAtRoundStart',
        'playerAnsweredCounts',
        'playerCorrectCounts',
        'playerFinishTimes'
      ];
      for (const field of mixedFields) {
        const obj = session[field];
        if (obj && typeof obj === 'object') {
          const keysToRemove = Object.keys(obj).filter(
            (k) => normalizeUserId(k) === sid
          );
          for (const k of keysToRemove) {
            unset[`${field}.${k}`] = 1;
          }
        }
      }
      if (Object.keys(unset).length > 0) {
        update.$unset = unset;
      }
      await GameSession.updateOne({ _id: session._id }, update);
    }

    await PointAward.deleteMany({ class: classId, player: studentId });

    res.json({
      message: 'You have left the class. All your progress in this classroom has been removed.',
      class: {
        id: classData._id,
        subject: classData.subject,
        gradeLevel: classData.gradeLevel,
        section: classData.section,
        classCode: classData.classCode
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Delete a class (teacher only)
export const deleteClass = async (req, res) => {
  try {
    const { id } = req.params;
    const teacherId = req.userId;

    const teacher = await Teacher.findById(teacherId);
    if (!teacher) {
      return res.status(404).json({ message: 'User not found' });
    }

    const classData = await Class.findById(id);
    if (!classData) {
      return res.status(404).json({ message: 'Class not found' });
    }

    // Verify the class belongs to the authenticated teacher
    if (classData.teacher.toString() !== teacherId.toString()) {
      return res.status(403).json({ message: 'You can only delete your own classes' });
    }

    // Delete all quizzes associated with this class
    await Quiz.deleteMany({ class: id });

    // Delete all game sessions associated with this class
    await GameSession.deleteMany({ class: id });

    // Delete all quiz results (quizresults) for this class so they don't reference deleted game sessions
    await QuizResult.deleteMany({ class: id });

    // Delete all persisted point awards for this class
    await PointAward.deleteMany({ class: id });

    // Delete the class
    await Class.findByIdAndDelete(id);

    res.json({
      message: 'Class deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

