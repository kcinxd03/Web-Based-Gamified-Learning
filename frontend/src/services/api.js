import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add token to requests if available
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Log 4xx/5xx responses to help debug "400 Bad Request" etc.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const url = error.config?.baseURL + error.config?.url;
    const method = error.config?.method?.toUpperCase();
    const msg = error.response?.data?.message || error.response?.data?.error || error.message;
    if (status >= 400) {
      console.warn(`[API ${status}] ${method} ${url}`, msg || error.response?.data);
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  // Register user
  register: async (userData) => {
    const response = await api.post('/auth/register', userData);
    return response.data;
  },

  // Login user
  login: async (email, password) => {
    const response = await api.post('/auth/login', { email, password });
    return response.data;
  },

  // Get current user
  getCurrentUser: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },

  // Update user profile
  updateProfile: async (profileData) => {
    const response = await api.put('/auth/profile', profileData);
    return response.data;
  },

  // Forgot password (students only) — request reset token
  forgotPassword: async (email) => {
    const response = await api.post('/auth/forgot-password', { email });
    return response.data;
  },

  // Reset password (students only) — set new password with token
  resetPassword: async (token, newPassword) => {
    const response = await api.post('/auth/reset-password', { token, newPassword });
    return response.data;
  }
};

// Admin API
export const adminAPI = {
  // Get all teachers
  getTeachers: async () => {
    const response = await api.get('/admin/teachers');
    return response.data;
  },

  // Create teacher account
  createTeacher: async (teacherData) => {
    const response = await api.post('/admin/teachers', teacherData);
    return response.data;
  },

  // Update teacher account
  updateTeacher: async (id, teacherData) => {
    const response = await api.put(`/admin/teachers/${id}`, teacherData);
    return response.data;
  },

  // Delete teacher account
  deleteTeacher: async (id) => {
    const response = await api.delete(`/admin/teachers/${id}`);
    return response.data;
  }
};

// Class API
export const classAPI = {
  // Create a new class
  createClass: async (classData) => {
    const response = await api.post('/classes', classData);
    return response.data;
  },

  // Join a class by class code
  joinClass: async (classCode) => {
    const response = await api.post('/classes/join', { classCode });
    return response.data;
  },

  // Get classes for the authenticated teacher
  getTeacherClasses: async () => {
    const response = await api.get('/classes/teacher');
    return response.data;
  },

  // Get classes for the authenticated student
  getStudentClasses: async () => {
    const response = await api.get('/classes/student');
    return response.data;
  },

  // Get all classes
  getAllClasses: async () => {
    const response = await api.get('/classes');
    return response.data;
  },

  // Get a single class by ID
  getClassById: async (id) => {
    const response = await api.get(`/classes/${id}`);
    return response.data;
  },

  // Remove a student from a class (teacher only)
  removeStudentFromClass: async (classId, studentId) => {
    const response = await api.delete(`/classes/${classId}/students/${studentId}`);
    return response.data;
  },

  // Get class leaderboard (sum of points from all game sessions in this class)
  getLeaderboard: async (classId) => {
    const response = await api.get(`/classes/${classId}/leaderboard`);
    return response.data;
  },

  // Leave a class (student only; removes student and clears their progress in this class)
  leaveClass: async (classId) => {
    const response = await api.post(`/classes/${classId}/leave`);
    return response.data;
  },

  // Delete a class
  deleteClass: async (id) => {
    const response = await api.delete(`/classes/${id}`);
    return response.data;
  }
};

// Quiz API
export const quizAPI = {
  // Create a new quiz
  createQuiz: async (quizData) => {
    const response = await api.post('/quizzes', quizData);
    return response.data;
  },

  // Get quizzes for the authenticated teacher
  getTeacherQuizzes: async () => {
    const response = await api.get('/quizzes/teacher');
    return response.data;
  },

  // Get quizzes for a specific class (accessible by both teachers and students)
  getClassQuizzes: async (classId) => {
    const response = await api.get(`/quizzes/class/${classId}`);
    return response.data;
  },

  // Get a single quiz by ID
  getQuizById: async (id) => {
    const response = await api.get(`/quizzes/${id}`);
    return response.data;
  },

  // Update an existing quiz
  updateQuiz: async (id, quizData) => {
    const response = await api.put(`/quizzes/${id}`, quizData);
    return response.data;
  },

  // Delete a quiz
  deleteQuiz: async (id) => {
    const response = await api.delete(`/quizzes/${id}`);
    return response.data;
  }
};

// Game Session API
export const gameSessionAPI = {
  // Create a new game session (teacher)
  createGameSession: async (gameSessionData) => {
    const response = await api.post('/game-sessions', gameSessionData);
    return response.data;
  },

  // Join a game session (student) by game code or session ID
  joinGameSession: async (payload) => {
    const response = await api.post('/game-sessions/join', payload);
    return response.data;
  },

  // Get active (WAITING) game sessions for a class (student)
  getActiveSessionsForClass: async (classId) => {
    const response = await api.get(`/game-sessions/class/${classId}/active`);
    return response.data;
  },

  // Get latest game session for a quiz in a class (any status - for viewing finished lobby)
  getLatestSessionForQuiz: async (classId, quizId) => {
    const response = await api.get(`/game-sessions/class/${classId}/latest/${quizId}`);
    return response.data;
  },

  // Update a game session
  updateGameSession: async (id, gameSessionData) => {
    const response = await api.put(`/game-sessions/${id}`, gameSessionData);
    return response.data;
  },

  // Get a game session by ID (returns { gameSession: null } on 404 to avoid uncaught rejection / error overlay)
  getGameSessionById: async (id) => {
    try {
      const response = await api.get(`/game-sessions/${id}`);
      return response.data;
    } catch (err) {
      if (err?.response?.status === 404) {
        return { gameSession: null, notFound: true };
      }
      throw err;
    }
  },

  // Tell server to broadcast game-session-created to the class (teacher in lobby)
  broadcastGameInvite: async (sessionId) => {
    const response = await api.post(`/game-sessions/${sessionId}/broadcast-invite`);
    return response.data;
  },

  // Delete a game session (teacher only); removes session and its quiz results from DB
  deleteGameSession: async (id) => {
    const response = await api.delete(`/game-sessions/${id}`);
    return response.data;
  },

  // Teacher checks if game should be over (all players finished) - detects and fixes missed events
  checkGameOver: async (sessionId) => {
    const response = await api.post(`/game-sessions/${sessionId}/check-game-over`);
    return response.data;
  },

  leaveGameSession: async (sessionId) => {
    const response = await api.post(`/game-sessions/${sessionId}/leave`);
    return response.data;
  },

  // Kick a player from the session (teacher only)
  kickPlayer: async (sessionId, playerId) => {
    const response = await api.post(`/game-sessions/${sessionId}/kick`, { playerId });
    return response.data;
  },

  // Add score for the current player (e.g. after correct answer)
  addScore: async (sessionId, points) => {
    const response = await api.post(`/game-sessions/${sessionId}/add-score`, { points: Number(points) });
    return response.data;
  },

  // Record that the current player answered one question (for "all players finished" detection).
  // Optionally pass { correctCount, timeToFinishSeconds, points } when it's the last answer to save records.
  // Pass { health } to update stored health so teacher sidebar reflects it.
  recordAnswer: async (sessionId, finishData) => {
    const response = await api.post(`/game-sessions/${sessionId}/record-answer`, finishData || {});
    return response.data;
  },
  updateHealth: async (sessionId, health) => {
    const response = await api.post(`/game-sessions/${sessionId}/update-health`, { health: Number(health) });
    return response.data;
  },
  // Record when a player finishes the quiz (correct count, time to finish, final points)
  recordPlayerFinish: async (sessionId, { correctCount, timeToFinishSeconds, points }) => {
    const response = await api.post(`/game-sessions/${sessionId}/record-finish`, {
      correctCount: Number(correctCount),
      timeToFinishSeconds: Number(timeToFinishSeconds),
      ...(points != null ? { points: Number(points) } : {})
    });
    return response.data;
  },
  endByTime: async (sessionId) => {
    const response = await api.post(`/game-sessions/${sessionId}/end-by-time`);
    return response.data;
  }
};

// Quiz Results API (from quizresults collection)
export const quizResultsAPI = {
  getByClass: async (classId) => {
    const response = await api.get(`/quiz-results/class/${classId}`);
    return response.data;
  }
};

export default api;

