
### Student
- `frontend/src/pages/Signup.jsx` – Handles student registration (fields: `firstName`, `lastName`, birthdate, `gender`, `gradeLevel`, `section`).
- `frontend/src/pages/StudentHome.jsx` – Student dashboard: Profile, Join Class, My Class, Settings, Logout.
- `frontend/src/pages/Classroom.jsx` (student branch) – Shows Classroom info, Game tab, Leaderboards, Classmates.
- `frontend/src/pages/Lobby.jsx` – Student lobby view; shows host (teacher) avatar, players list, and Waiting/Playing state.

### Teacher
- `frontend/src/pages/TeacherHome.jsx` – Teacher dashboard: Create Class, My Class.
- `frontend/src/pages/Classroom.jsx` (teacher branch) – Full classroom management: Students, Game, Leaderboards, Create Quiz, My Quizzes, Delete Classroom.
- `frontend/src/pages/CreateQuiz.jsx` – Quiz creation/editing with Multiple Choice, True/False, Fill‑in‑the‑blank.
- `frontend/src/pages/Lobby.jsx` (teacher branch) – Lobby host tools: Start Game, Change Map, Kick Player, Delete Classroom popup.

### Admin
- `frontend/src/pages/Admin.jsx` – Create/Edit/Delete teacher accounts; fields include `gender`, `gradeLevel`, `section`.

### Gameplay
- `frontend/src/pages/Gameplay.jsx` – Phaser game scene: maps, player sprites, NPCs, quiz integration.
- `frontend/src/pages/MapSelection.jsx` – Teacher selects map (Farm/City/Temple) for the session.

### Backend / Database
- `backend/models/Teacher.js` – Teacher schema (`firstName`, `lastName`, `email`, `password`, `gender`, `gradeLevel`, `section`, `profilePicture`).
- `backend/models/Class.js`, `backend/models/Quiz.js`, `backend/models/GameSession.js`, `backend/models/QuizResult.js`, etc.
- `backend/controllers/*.js` – `authController`, `classController`, `quizController`, `gameSessionController`, `adminController`.
- `backend/server.js` – Express entry + Socket.IO server.

