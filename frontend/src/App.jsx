import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Signup from './pages/Signup';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import PasswordSetup from './pages/PasswordSetup';
import VerifyInformation from './pages/VerifyInformation';
import StudentHome from './pages/StudentHome';
import TeacherHome from './pages/TeacherHome';
import Admin from './pages/Admin';
import CreateClass from './pages/CreateClass';
import JoinClass from './pages/JoinClass';
import MyClass from './pages/MyClass';
import SetProfile from './pages/SetProfile';
import Settings from './pages/Settings';
import Classroom from './pages/Classroom';
import Lobby from './pages/Lobby';
import CreateQuiz from './pages/CreateQuiz';
import MapSelection from './pages/MapSelection';
import Gameplay from './pages/Gameplay';
import GameInvitationOverlay from './components/GameInvitationOverlay';
function App() {
  return (
    <Router
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true
      }}
    >
      <div className="min-h-screen">
        <GameInvitationOverlay />
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/password-setup" element={<PasswordSetup />} />
          <Route path="/verify-information" element={<VerifyInformation />} />
          <Route path="/student-home" element={<StudentHome />} />
          <Route path="/teacher-home" element={<TeacherHome />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/create-class" element={<CreateClass />} />
          <Route path="/join-class" element={<JoinClass />} />
          <Route path="/my-class" element={<MyClass />} />
          <Route path="/set-profile" element={<SetProfile />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/classroom" element={<Classroom />} />
          <Route path="/join-game" element={<Navigate to="/classroom" replace />} />
          <Route path="/join-game/*" element={<Navigate to="/classroom" replace />} />
          <Route path="/lobby" element={<Navigate to="/my-class" replace />} />
          <Route path="/lobby/:sessionId" element={<Lobby />} />
          <Route path="/create-quiz" element={<CreateQuiz />} />
          <Route path="/map-selection" element={<MapSelection />} />
          <Route path="/gameplay" element={<Navigate to="/my-class" replace />} />
          <Route path="/gameplay/:sessionId" element={<Gameplay />} />
          {/* Debug: game testing route - same behavior as gameplay */}
          <Route path="/game-testing" element={<Navigate to="/my-class" replace />} />
          <Route path="/game-testing/:sessionId" element={<Gameplay />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;

