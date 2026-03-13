import QuizResult from '../models/QuizResult.js';
import Class from '../models/Class.js';
import GameSession from '../models/GameSession.js';

/**
 * Get all quiz results for a class (from quizresults collection).
 * Used by My Quizzes view to show game results per quiz.
 */
export const getQuizResultsByClass = async (req, res) => {
  try {
    const { classId } = req.params;
    const userId = req.userId;
    const accountType = req.accountType;

    const classData = await Class.findById(classId);
    if (!classData) {
      return res.status(404).json({ message: 'Class not found' });
    }

    const isTeacher = classData.teacher.toString() === userId.toString();
    const isStudent = classData.students.some(s => s.toString() === userId.toString());
    if (!isTeacher && !isStudent) {
      return res.status(403).json({ message: 'You are not in this class' });
    }

    const results = await QuizResult.find({ class: classId })
      .populate('quiz', 'title category difficulty gameMode')
      .sort({ finishedAt: -1 })
      .lean();

    const existingSessionIds = new Set(results.map((r) => String(r.gameSession)));

    // Fallback: some older single-player sessions may not have been written to quizresults.
    // Recover them from GameSession.finishedResults so My Quizzes can still show all players.
    const sessions = await GameSession.find({
      class: classId,
      $expr: { $gt: [{ $size: { $objectToArray: { $ifNull: ['$finishedResults', {}] } } }, 0] }
    })
      .populate('quiz', 'title category difficulty gameMode')
      .populate('players', 'firstName lastName')
      .sort({ updatedAt: -1, createdAt: -1 })
      .lean();

    const recovered = sessions
      .filter((s) => !existingSessionIds.has(String(s._id)))
      .map((s) => {
        const nameById = {};
        (s.players || []).forEach((p) => {
          const pid = String(p?._id ?? p?.id ?? '');
          if (pid) nameById[pid] = [p.firstName, p.lastName].filter(Boolean).join(' ') || 'Player';
        });
        const playerResults = Object.entries(s.finishedResults || {}).map(([pid, r]) => ({
          player: pid,
          playerName: r?.playerName || nameById[pid] || 'Player',
          points: Number(r?.points) || 0,
          correctAnswers: Number(r?.correctAnswers) || 0,
          finishedFirst: false,
          timeToFinishSeconds: r?.timeToFinishSeconds != null ? Number(r.timeToFinishSeconds) : null
        }));
        const withTime = playerResults.filter((r) => r.timeToFinishSeconds != null && r.timeToFinishSeconds >= 0);
        if (withTime.length > 0) {
          const minTime = Math.min(...withTime.map((r) => r.timeToFinishSeconds));
          const first = playerResults.find((r) => r.timeToFinishSeconds === minTime);
          if (first) first.finishedFirst = true;
        } else if (playerResults.length > 0) {
          playerResults[0].finishedFirst = true;
        }
        return {
          id: `session-${String(s._id)}`,
          gameSession: s._id,
          quiz: s.quiz,
          class: s.class,
          finishedAt: s.finishedAt || s.updatedAt || s.createdAt,
          playerResults,
          createdAt: s.createdAt
        };
      });

    const combined = [...results.map(r => ({
      id: r._id,
      gameSession: r.gameSession,
      quiz: r.quiz,
      class: r.class,
      finishedAt: r.finishedAt,
      playerResults: r.playerResults || [],
      createdAt: r.createdAt
    })), ...recovered].sort((a, b) => new Date(b.finishedAt || b.createdAt || 0) - new Date(a.finishedAt || a.createdAt || 0));

    return res.json({
      message: 'Quiz results retrieved',
      results: combined
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
