/**
 * App translations: english | filipino
 * Keys can use {placeholder} for interpolation; call t(key, { placeholder: value })
 */
export const translations = {
  // --- Common ---
  common_save: { english: 'SAVE', filipino: 'I-SAVE' },
  common_discard: { english: 'DISCARD', filipino: 'IBAWAL' },
  common_cancel: { english: 'Cancel', filipino: 'Kanselahin' },
  common_close: { english: 'Close', filipino: 'Isara' },
  common_back: { english: 'BACK', filipino: 'BALIK' },
  common_loading: { english: 'Loading...', filipino: 'Naglo-load...' },
  common_or: { english: 'OR', filipino: 'O' },
  common_join: { english: 'Join', filipino: 'Sumali' },
  common_dismiss: { english: 'Dismiss', filipino: 'Isara' },
  common_profile: { english: 'PROFILE', filipino: 'PROFILE' },
  common_settings: { english: 'SETTINGS', filipino: 'MGA SETTING' },
  common_logOut: { english: 'LOG OUT', filipino: 'MAG-LOG OUT' },
  common_logout: { english: 'LOGOUT', filipino: 'MAG-LOG OUT' },
  common_enterRoom: { english: 'ENTER ROOM', filipino: 'PASUKIN ANG SILID' },
  common_joinGame: { english: 'Join Game', filipino: 'Sumali sa Laro' },
  common_newGameAvailable: { english: 'New Game Available!', filipino: 'May Bagong Laro!' },
  common_gameStarted: { english: 'Game Started!', filipino: 'Nagsimula na ang Laro!' },
  common_gradeLevel: { english: 'GRADE LEVEL', filipino: 'ANTAS' },
  common_section: { english: 'SECTION', filipino: 'SEKSYON' },
  common_subject: { english: 'SUBJECT', filipino: 'PAKSA' },
  common_teacher: { english: 'TEACHER', filipino: 'GURO' },
  common_student: { english: 'STUDENT', filipino: 'MAG-AARAL' },
  common_students: { english: 'STUDENTS', filipino: 'MGA MAG-AARAL' },
  common_male: { english: 'Male', filipino: 'Lalaki' },
  common_female: { english: 'Female', filipino: 'Babae' },
  common_email: { english: 'EMAIL', filipino: 'EMAIL' },
  common_classCode: { english: 'CLASS CODE', filipino: 'KODIGO NG KLASE' },
  common_correct: { english: 'Correct!', filipino: 'Tama!' },
  common_incorrect: { english: 'Incorrect', filipino: 'Mali' },
  common_gameOver: { english: 'Game Over', filipino: 'Tapos na ang Laro' },

  // --- Login ---
  login_title: { english: 'LOGIN', filipino: 'MAG-LOG IN' },
  login_email: { english: 'Email', filipino: 'Email' },
  login_password: { english: 'Password', filipino: 'Password' },
  login_forgotPassword: { english: 'Forgot password?', filipino: 'Nakalimutan ang password?' },
  login_logIn: { english: 'LOG IN', filipino: 'MAG-LOG IN' },
  login_loggingIn: { english: 'LOGGING IN...', filipino: 'NAG-LALOG IN...' },
  login_signUp: { english: 'SIGN UP', filipino: 'MAG-SIGN UP' },
  login_failed: { english: 'Login failed. Please try again.', filipino: 'Hindi nagawa ang pag-log in. Subukan muli.' },
  login_errorGeneric: { english: 'An unexpected error occurred. Please try again.', filipino: 'May nangyaring error. Subukan muli.' },

  // --- Signup ---
  signup_title: { english: 'SIGN UP', filipino: 'MAG-SIGN UP' },
  signup_firstName: { english: 'FIRST NAME', filipino: 'PANGALAN' },
  signup_lastName: { english: 'LAST NAME', filipino: 'APELYIDO' },
  signup_birthDate: { english: 'ENTER YOUR BIRTH DATE', filipino: 'ILAGAY ANG IYONG KAARAWAN' },
  signup_month: { english: 'MONTH', filipino: 'BUWAN' },
  signup_day: { english: 'DAY', filipino: 'ARAW' },
  signup_year: { english: 'YEAR', filipino: 'TAON' },
  signup_selectMonth: { english: 'Select Month', filipino: 'Pumili ng Buwan' },
  signup_selectDay: { english: 'Select Day', filipino: 'Pumili ng Araw' },
  signup_selectYear: { english: 'Select Year', filipino: 'Pumili ng Taon' },
  signup_gender: { english: 'GENDER', filipino: 'KASARIAN' },
  signup_selectGender: { english: 'Select Gender', filipino: 'Pumili ng Kasarian' },
  signup_gradeLevel: { english: 'GRADE LEVEL', filipino: 'ANTAS' },
  signup_selectGradeLevel: { english: 'Select Grade Level', filipino: 'Pumili ng Antas' },
  signup_grade: { english: 'Grade {n}', filipino: 'Baitang {n}' },
  signup_section: { english: 'SECTION', filipino: 'SEKSYON' },
  signup_next: { english: 'NEXT', filipino: 'SUSUNOD' },
  signup_email: { english: 'Email', filipino: 'Email' },
  signup_password: { english: 'Password', filipino: 'Password' },
  signup_confirmPassword: { english: 'Confirm Password', filipino: 'Kumpirmahin ang Password' },
  signup_register: { english: 'REGISTER', filipino: 'MAG-REHISTRO' },
  signup_hasAccount: { english: 'Already have an account?', filipino: 'May account ka na?' },
  signup_logIn: { english: 'LOG IN', filipino: 'MAG-LOG IN' },

  // --- Password Setup (student signup step) ---
  passwordSetup_email: { english: 'EMAIL', filipino: 'EMAIL' },
  passwordSetup_password: { english: 'PASSWORD', filipino: 'PASSWORD' },
  passwordSetup_confirmPassword: { english: 'CONFIRM PASSWORD', filipino: 'KUMPIRMAHIN ANG PASSWORD' },
  passwordSetup_next: { english: 'NEXT', filipino: 'SUSUNOD' },
  passwordSetup_passwordMinLength: { english: 'Password must be at least 6 characters long', filipino: 'Ang password ay dapat hindi bababa sa 6 na character' },
  passwordSetup_passwordsNoMatch: { english: 'Passwords do not match!', filipino: 'Hindi magkapareho ang mga password!' },

  // --- Verify Information (student signup step) ---
  verifyInfo_title: { english: 'VERIFIED YOUR INFORMATION', filipino: 'TININGNAN ANG IYONG IMPORMASYON' },
  verifyInfo_firstName: { english: 'FIRST NAME', filipino: 'PANGALAN' },
  verifyInfo_lastName: { english: 'LAST NAME', filipino: 'APELYIDO' },
  verifyInfo_month: { english: 'MONTH', filipino: 'BUWAN' },
  verifyInfo_day: { english: 'DAY', filipino: 'ARAW' },
  verifyInfo_year: { english: 'YEAR', filipino: 'TAON' },
  verifyInfo_selectMonth: { english: 'Select Month', filipino: 'Pumili ng Buwan' },
  verifyInfo_selectDay: { english: 'Select Day', filipino: 'Pumili ng Araw' },
  verifyInfo_selectYear: { english: 'Select Year', filipino: 'Pumili ng Taon' },
  verifyInfo_gender: { english: 'GENDER', filipino: 'KASARIAN' },
  verifyInfo_selectGender: { english: 'Select Gender', filipino: 'Pumili ng Kasarian' },
  verifyInfo_genderMale: { english: 'Male', filipino: 'Lalaki' },
  verifyInfo_genderFemale: { english: 'Female', filipino: 'Babae' },
  verifyInfo_genderOther: { english: 'Other', filipino: 'Iba' },
  verifyInfo_genderPreferNotToSay: { english: 'Prefer not to say', filipino: 'Ayaw sabihin' },
  verifyInfo_gradeLevel: { english: 'GRADE LEVEL', filipino: 'ANTAS' },
  verifyInfo_section: { english: 'SECTION', filipino: 'SEKSYON' },
  verifyInfo_createAccount: { english: 'CREATE ACCOUNT', filipino: 'GUMAWA NG ACCOUNT' },
  verifyInfo_creatingAccount: { english: 'CREATING ACCOUNT...', filipino: 'GUMAWA NG ACCOUNT...' },
  verifyInfo_missingEmailPassword: { english: 'Missing email or password. Please start from the beginning.', filipino: 'Kulang ang email o password. Magsimula mula sa simula.' },
  verifyInfo_creationFailed: { english: 'Account creation failed. Please try again.', filipino: 'Hindi nagawa ang account. Subukan muli.' },
  verifyInfo_unexpectedError: { english: 'An unexpected error occurred. Please try again.', filipino: 'May nangyaring error. Subukan muli.' },

  // --- Forgot / Reset Password ---
  forgotPassword_title: { english: 'FORGOT PASSWORD', filipino: 'NAKALIMUTAN ANG PASSWORD' },
  forgotPassword_subtitle: { english: 'Enter your student account email to reset your password.', filipino: 'Ilagay ang email ng iyong student account para i-reset ang password.' },
  forgotPassword_sendReset: { english: 'Send Reset Link', filipino: 'Ipadala ang Link' },
  forgotPassword_sending: { english: 'SENDING...', filipino: 'NAGPAPADALA...' },
  forgotPassword_sendResetLink: { english: 'SEND RESET LINK', filipino: 'IPADALA ANG LINK' },
  forgotPassword_backToLogin: { english: 'Back to Login', filipino: 'Bumalik sa Login' },
  forgotPassword_checkEmail: { english: 'Check your email for reset instructions.', filipino: 'Tingnan ang iyong email para sa mga panuto sa pag-reset.' },
  forgotPassword_error: { english: 'Something went wrong. Please try again.', filipino: 'May nangyaring mali. Subukan muli.' },
  resetPassword_title: { english: 'RESET PASSWORD', filipino: 'I-RESET ANG PASSWORD' },
  resetPassword_subtitle: { english: 'Enter your new password below.', filipino: 'Ilagay ang iyong bagong password sa ibaba.' },
  resetPassword_newPassword: { english: 'New Password', filipino: 'Bagong Password' },
  resetPassword_placeholder: { english: 'New password (min 6 characters)', filipino: 'Bagong password (mga 6 character)' },
  resetPassword_confirmPlaceholder: { english: 'Confirm new password', filipino: 'Kumpirmahin ang bagong password' },
  resetPassword_reset: { english: 'Reset Password', filipino: 'I-reset ang Password' },
  resetPassword_resetting: { english: 'RESETTING...', filipino: 'NAGRE-RESET...' },
  resetPassword_resetBtn: { english: 'RESET PASSWORD', filipino: 'I-RESET ANG PASSWORD' },
  resetPassword_backToLogin: { english: 'Back to Login', filipino: 'Bumalik sa Login' },
  resetPassword_missingLink: { english: 'Missing reset link. Please use the link from your email or request a new one from Forgot Password.', filipino: 'Kulang ang link sa pag-reset. Gamitin ang link mula sa iyong email o humingi ng bago sa Forgot Password.' },
  resetPassword_passwordsNoMatch: { english: 'Passwords do not match.', filipino: 'Hindi magkapareho ang mga password.' },
  resetPassword_minLength: { english: 'Password must be at least 6 characters.', filipino: 'Ang password ay dapat hindi bababa sa 6 na character.' },
  resetPassword_success: { english: 'Password reset successfully. Redirecting to login...', filipino: 'Matagumpay na na-reset ang password. Papunta sa login...' },
  resetPassword_goToLogin: { english: 'Go to Login', filipino: 'Pumunta sa Login' },
  resetPassword_failed: { english: 'Failed to reset password. The link may have expired.', filipino: 'Hindi na-reset ang password. Maaaring expired na ang link.' },

  // --- Settings ---
  settings_notifications: { english: 'NOTIFICATIONS', filipino: 'MGA ABISO' },
  settings_gameInvitationNotification: { english: 'GAME INVITATION NOTIFICATION', filipino: 'ABISO SA IMBITASYON SA LARO' },
  settings_soundEffects: { english: 'SOUND EFFECTS', filipino: 'MGA TUNOG' },
  settings_sound: { english: 'SOUND', filipino: 'TUNOG' },
  settings_music: { english: 'MUSIC', filipino: 'MUSIKA' },
  settings_languagePreferences: { english: 'LANGUAGE PREFERENCES', filipino: 'WIKA' },
  settings_english: { english: 'ENGLISH', filipino: 'ENGLISH' },
  settings_filipino: { english: 'FILIPINO', filipino: 'FILIPINO' },

  // --- Student Home ---
  studentHome_myClass: { english: 'MY CLASS', filipino: 'AKING KLASE' },
  studentHome_joinClass: { english: 'JOIN CLASS', filipino: 'SUMALI SA KLASE' },
  studentHome_notificationMessage: { english: 'Your teacher started a game: {quizTitle}. Tap to join the lobby!', filipino: 'Nag-start ang guro ng laro: {quizTitle}. Pindutin para sumali sa lobby!' },
  studentHome_teacherSinglePlayerNotificationMessage: { english: 'Your teacher started a single-player game: {quizTitle}. Tap to play!', filipino: 'Nag-start ang guro ng single-player game: {quizTitle}. Pindutin para maglaro!' },
  studentHome_singlePlayerNotificationMessage: { english: '{playerName} started a single-player game: {quizTitle}.', filipino: 'Nagsimula si {playerName} ng single-player game: {quizTitle}.' },

  // --- Teacher Home ---
  teacherHome_myClass: { english: 'MY CLASS', filipino: 'AKING KLASE' },
  teacherHome_createClass: { english: 'CREATE CLASS', filipino: 'GUMAWA NG KLASE' },

  // --- My Class ---
  myClass_title: { english: 'MY CLASS', filipino: 'AKING KLASE' },
  myClass_loadingClasses: { english: 'Loading classes...', filipino: 'Naglo-load ng mga klase...' },
  myClass_failedLoad: { english: 'Failed to load classes. Please try again.', filipino: 'Hindi na-load ang mga klase. Subukan muli.' },
  myClass_noClasses: { english: 'NO CLASSES YET. CREATE YOUR FIRST CLASS!', filipino: 'WALA PANG KLASE. GUMAWA NG IYONG UNANG KLASE!' },
  myClass_invalidAccount: { english: 'Invalid account type', filipino: 'Hindi wastong uri ng account' },

  // --- Create Class ---
  createClass_title: { english: 'Create Class', filipino: 'Gumawa ng Klase' },
  createClass_className: { english: 'Class Name', filipino: 'Pangalan ng Klase' },
  createClass_subject: { english: 'Subject', filipino: 'Paksa' },
  createClass_gradeLevel: { english: 'Grade Level', filipino: 'Antas' },
  createClass_section: { english: 'Section', filipino: 'Seksyon' },
  createClass_create: { english: 'Create Class', filipino: 'Gumawa ng Klase' },

  // --- Join Class ---
  joinClass_title: { english: 'Join Class', filipino: 'Sumali sa Klase' },
  joinClass_enterCode: { english: 'Enter Class Code', filipino: 'Ilagay ang Kodigo ng Klase' },
  joinClass_join: { english: 'Join', filipino: 'Sumali' },
  joinClass_invalidCode: { english: 'INVALID CODE PLEASE TRY AGAIN', filipino: 'MALING KODIGO. SUBUKAN MULI.' },
  joinClass_failed: { english: 'Failed to join class. Please try again.', filipino: 'Hindi nakasali sa klase. Subukan muli.' },
  joinClass_submit: { english: 'Submit', filipino: 'Ipasa' },

  // --- Classroom ---
  classroom_classroom: { english: 'CLASSROOM', filipino: 'SILID-ARALAN' },
  classroom_game: { english: 'GAME', filipino: 'LARO' },
  classroom_leaderboards: { english: 'LEADERBOARDS', filipino: 'MGA RANKING' },
  classroom_students: { english: 'STUDENTS', filipino: 'MGA MAG-AARAL' },
  classroom_classmates: { english: 'CLASSMATES', filipino: 'MGA KAKLASE' },
  classroom_createQuiz: { english: 'CREATE QUIZ', filipino: 'GUMAWA NG QUIZ' },
  classroom_myQuizzes: { english: 'MY QUIZZES', filipino: 'AKING MGA QUIZ' },
  classroom_deleteClassroom: { english: 'DELETE CLASSROOM', filipino: 'BURAHiN ANG SILID-ARALAN' },
  classroom_leaveClassroom: { english: 'LEAVE CLASSROOM', filipino: 'UMALIS SA SILID-ARALAN' },
  classroom_action: { english: 'ACTION', filipino: 'AKSYON' },
  classroom_loadingStudents: { english: 'Loading students...', filipino: 'Naglo-load ng mga mag-aaral...' },
  classroom_noStudents: { english: 'No students enrolled yet.', filipino: 'Wala pang naka-enroll na mga mag-aaral.' },
  classroom_loadingClassroom: { english: 'Loading classroom...', filipino: 'Naglo-load ng silid-aralan...' },
  classroom_confirmLeave: { english: 'Leave this classroom? All your progress in this class (scores, leaderboard) will be removed. This cannot be undone.', filipino: 'Aalis ka ba sa silid-aralan na ito? Aalisin ang lahat ng iyong progress (mga score, leaderboard). Hindi na ito mababawi.' },
  classroom_confirmDelete: { english: 'Are you sure you want to delete this classroom? This will permanently delete the classroom, all quizzes, and game sessions. This action cannot be undone.', filipino: 'Sigurado ka bang gusto mong burahin ang silid-aralan na ito? Mabubura nang permanente ang silid-aralan, lahat ng quiz, at mga laro. Hindi na ito mababawi.' },

  // --- Lobby ---
  lobby_waitingForTeacher: { english: 'Waiting for teacher to start the game...', filipino: 'Naghihintay na simulan ng guro ang laro...' },
  lobby_players: { english: 'Players', filipino: 'Mga Manlalaro' },
  lobby_startGame: { english: 'START GAME', filipino: 'SIMULAN ANG LARO' },
  lobby_leaveLobby: { english: 'Leave Lobby', filipino: 'Umalis sa Lobby' },
  lobby_gameCode: { english: 'Game Code', filipino: 'Kodigo ng Laro' },
  lobby_loadingGame: { english: 'Loading game...', filipino: 'Naglo-load ng laro...' },
  lobby_gameNotFound: { english: 'Game not found.', filipino: 'Hindi mahanap ang laro.' },
  lobby_gameEnded: { english: 'This game has already ended.', filipino: 'Tapos na ang larong ito.' },
  lobby_noTeacher: { english: 'No teacher in the lobby. Ask your teacher to start a new game.', filipino: 'Walang guro sa lobby. Sabihin sa guro na magsimula ng bagong laro.' },
  lobby_couldNotLoad: { english: 'Could not load game.', filipino: 'Hindi na-load ang laro.' },
  lobby_backToClassroom: { english: 'Back to Classroom', filipino: 'Bumalik sa Silid-aralan' },
  lobby_backToMyClass: { english: 'Back to My Class', filipino: 'Bumalik sa Aking Klase' },
  lobby_title: { english: 'LOBBY', filipino: 'LOBBY' },
  lobby_gameStarting: { english: 'Game starting...', filipino: 'Nagsisimula ang laro...' },
  lobby_waitingForPlayers: { english: 'Waiting for players...', filipino: 'Naghihintay ng mga manlalaro...' },
  lobby_resetLobby: { english: 'RESET LOBBY', filipino: 'I-RESET ANG LOBBY' },
  lobby_resetting: { english: 'RESETTING...', filipino: 'NAGRE-RESET...' },
  lobby_leaveLobbyBtn: { english: 'LEAVE LOBBY', filipino: 'UMALIS SA LOBBY' },

  // --- Game Content (quizzes / games list) ---
  gameContent_games: { english: 'GAMES', filipino: 'MGA LARO' },
  gameContent_loadingQuizzes: { english: 'Loading quizzes...', filipino: 'Naglo-load ng mga quiz...' },
  gameContent_noQuizzes: { english: 'No quizzes available. Create a quiz to get started!', filipino: 'Walang available na quiz. Gumawa ng quiz para magsimula!' },
  gameContent_play: { english: 'Play', filipino: 'Laruin' },
  gameContent_joinGame: { english: 'Join Game', filipino: 'Sumali sa Laro' },
  gameContent_singlePlayer: { english: 'Single Player', filipino: 'Nag-iisa' },
  gameContent_multiplayer: { english: 'Multiplayer', filipino: 'Maramihan' },
  gameContent_difficulty: { english: 'Difficulty', filipino: 'Kahirapan' },
  gameContent_easy: { english: 'Easy', filipino: 'Madali' },
  gameContent_medium: { english: 'Medium', filipino: 'Katamtaman' },
  gameContent_hard: { english: 'Hard', filipino: 'Mahirap' },
  gameContent_correctAnswers: { english: 'Correct answers', filipino: 'Tamang sagot' },
  gameContent_points: { english: 'Points', filipino: 'Puntos' },
  gameContent_playGame: { english: 'PLAY GAME', filipino: 'LARUIN ANG LARO' },
  gameContent_joinGameBtn: { english: 'JOIN GAME', filipino: 'SUMALI SA LARO' },
  gameContent_starting: { english: 'STARTING...', filipino: 'NAGSISIMULA...' },
  gameContent_joining: { english: 'JOINING...', filipino: 'SUMASALI...' },
  gameContent_waitingForTeacher: { english: 'Waiting for teacher...', filipino: 'Naghihintay sa guro...' },
  gameContent_questions: { english: 'QUESTIONS', filipino: 'MGA TANONG' },
  gameContent_difficultyLabel: { english: 'DIFFICULTY', filipino: 'KAHIRAPAN' },

  // --- Gameplay ---
  gameplay_paused: { english: 'PAUSED', filipino: 'NAHINTO' },
  gameplay_resume: { english: 'Resume', filipino: 'Ipagpatuloy' },
  gameplay_stopGame: { english: 'Stop Game', filipino: 'Ihinto ang Laro' },
  gameplay_health: { english: 'Health', filipino: 'Buhay' },
  gameplay_timeUp: { english: "Time's up!", filipino: 'Tapos na ang oras!' },
  gameplay_correctAnswersCount: { english: 'Correct answers', filipino: 'Tamang sagot' },
  gameplay_youWin: { english: 'You win!', filipino: 'Nanalo ka!' },
  gameplay_youLose: { english: 'You ran out of health or time.', filipino: 'Naubos ang buhay o oras.' },
  gameplay_backToClassroom: { english: 'Back to Classroom', filipino: 'Bumalik sa Silid-aralan' },
  gameplay_submit: { english: 'Submit', filipino: 'Ipasa' },
  gameplay_true: { english: 'True', filipino: 'Tama' },
  gameplay_false: { english: 'False', filipino: 'Mali' },
  gameplay_question: { english: 'Question', filipino: 'Tanong' },
  gameplay_next: { english: 'Next', filipino: 'Susunod' },
  gameplay_pause: { english: 'Pause', filipino: 'I-pause' },
  gameplay_backToMyClass: { english: 'Back to My Class', filipino: 'Bumalik sa Aking Klase' },
  gameplay_pausedByTeacher: { english: 'Game paused by teacher', filipino: 'Hininto ng guro ang laro' },
  gameplay_viewLeaderboard: { english: 'View Leaderboard', filipino: 'Tingnan ang Ranking' },
  gameplay_backToLobby: { english: 'Back to Lobby', filipino: 'Bumalik sa Lobby' },
  gameplay_healthLabel: { english: 'Health', filipino: 'Buhay' },
  gameplay_totalPoints: { english: 'Total points', filipino: 'Kabuuang puntos' },
  gameplay_scoreLabel: { english: 'Score', filipino: 'Puntos' },
  gameplay_correctLabel: { english: 'Correct', filipino: 'Tama' },
  gameplay_chooseBoost: { english: 'Choose your boost!', filipino: 'Pumili ng boost!' },
  gameplay_boostMovementSpeed: { english: 'Movement speed (10 sec)', filipino: 'Bilis ng kilos (10 seg)' },
  gameplay_boostDoublePoints: { english: 'Double current points', filipino: 'Doble ang puntos' },
  gameplay_boostHint: { english: 'Hint (next question location)', filipino: 'Hint (susunod na tanong)' },
  gameplay_boostCooldown: { english: '{n}s cooldown', filipino: '{n}s cooldown' },
  gameplay_boostAnswerClue: { english: 'Answer clue (next question)', filipino: 'Sagot na hint (susunod na tanong)' },
  gameplay_boostHealth: { english: '+{n} health', filipino: '+{n} buhay' },

  // --- Create Quiz ---
  createQuiz_title: { english: 'Create Quiz', filipino: 'Gumawa ng Quiz' },
  createQuiz_editTitle: { english: 'Edit Quiz', filipino: 'I-edit ang Quiz' },
  createQuiz_quizTitle: { english: 'Quiz Title', filipino: 'Pamagat ng Quiz' },
  createQuiz_enterQuizTitle: { english: 'Enter quiz title', filipino: 'Ilagay ang pamagat ng quiz' },
  createQuiz_description: { english: 'Description', filipino: 'Paglalarawan' },
  createQuiz_enterDescription: { english: 'Enter quiz description', filipino: 'Ilagay ang paglalarawan ng quiz' },
  createQuiz_addQuestion: { english: 'Add Question', filipino: 'Magdagdag ng Tanong' },
  createQuiz_save: { english: 'Save Quiz', filipino: 'I-save ang Quiz' },
  createQuiz_update: { english: 'Update Quiz', filipino: 'I-update ang Quiz' },
  createQuiz_creating: { english: 'Creating Quiz...', filipino: 'Gumagawa ng Quiz...' },
  createQuiz_updating: { english: 'Updating Quiz...', filipino: 'Ina-update ang Quiz...' },
  createQuiz_difficulty: { english: 'Difficulty', filipino: 'Kahirapan' },
  createQuiz_selectDifficulty: { english: 'Select difficulty', filipino: 'Pumili ng kahirapan' },
  createQuiz_easy: { english: 'Easy', filipino: 'Madali' },
  createQuiz_medium: { english: 'Medium', filipino: 'Katamtaman' },
  createQuiz_hard: { english: 'Hard', filipino: 'Mahirap' },
  createQuiz_timeLimit: { english: 'Time Limit (minutes)', filipino: 'Oras ng Limitasyon (minuto)' },
  createQuiz_enterTimeLimit: { english: 'Enter time limit in minutes (optional)', filipino: 'Ilagay ang oras ng limitasyon sa minuto (opsyonal)' },
  createQuiz_gameMode: { english: 'Game Mode', filipino: 'Mode ng Laro' },
  createQuiz_gameModeLocked: { english: 'Game mode cannot be changed after the quiz is created.', filipino: 'Hindi na maaaring baguhin ang mode ng laro kapag nagawa na ang quiz.' },
  createQuiz_multiplayer: { english: 'Multiplayer', filipino: 'Multiplayer' },
  createQuiz_singlePlayer: { english: 'Single Player', filipino: 'Single Player' },
  createQuiz_questions: { english: 'Questions', filipino: 'Mga Tanong' },
  createQuiz_question: { english: 'Question {number}', filipino: 'Tanong {number}' },
  createQuiz_questionType: { english: 'Question Type', filipino: 'Uri ng Tanong' },
  createQuiz_qanda: { english: 'Q&A', filipino: 'Tanong at Sagot' },
  createQuiz_trueFalse: { english: 'True or False', filipino: 'Tama o Mali' },
  createQuiz_fillBlank: { english: 'Fill in the Blank', filipino: 'Punan ang Patlang' },
  createQuiz_questionText: { english: 'Question Text', filipino: 'Teksto ng Tanong' },
  createQuiz_answerOptions: { english: 'Answer Options', filipino: 'Mga Pagpipilian ng Sagot' },
  createQuiz_addOption: { english: '+ Add Option', filipino: '+ Magdagdag ng Opsyon' },
  createQuiz_correctAnswer: { english: 'Correct Answer', filipino: 'Tamang Sagot' },
  createQuiz_true: { english: 'True', filipino: 'Tama' },
  createQuiz_false: { english: 'False', filipino: 'Mali' },
  createQuiz_loadingQuiz: { english: 'Loading quiz...', filipino: 'Naglo-load ng quiz...' },
  createQuiz_edit: { english: 'Edit', filipino: 'I-edit' },
  createQuiz_delete: { english: 'Delete', filipino: 'Burahin' },
  myQuizzes_loading: { english: 'Loading quizzes...', filipino: 'Naglo-load ng mga quiz...' },
  myQuizzes_empty: { english: 'No quizzes yet. Use "CREATE QUIZ" in the sidebar to add one.', filipino: 'Wala pang quiz. Gamitin ang "GUMAWA NG QUIZ" sa sidebar para magdagdag.' },
  myQuizzes_untitled: { english: 'Untitled Quiz', filipino: 'Walang Pamagat na Quiz' },
  myQuizzes_savedResult: { english: '{count} saved result', filipino: '{count} naka-save na resulta' },
  myQuizzes_savedResults: { english: '{count} saved results', filipino: '{count} naka-save na mga resulta' },
  myQuizzes_pointsCorrect: { english: '{points} pts • {correct} correct', filipino: '{points} pts • {correct} tama' },
  myQuizzes_noResults: { english: 'No game results yet. Play a game to see results here.', filipino: 'Wala pang resulta ng laro. Maglaro para makita ang mga resulta rito.' },

  // --- Map Selection ---
  mapSelection_selectMap: { english: 'Select Map', filipino: 'Pumili ng Mapa' },
  mapSelection_startGame: { english: 'Start Game', filipino: 'Simulan ang Laro' },

  // --- Set Profile ---
  setProfile_title: { english: 'Set Profile', filipino: 'I-set ang Profile' },
  setProfile_profile: { english: 'PROFILE', filipino: 'PROFILE' },
  setProfile_username: { english: 'USERNAME:', filipino: 'USERNAME:' },
  setProfile_fullName: { english: 'FULL NAME:', filipino: 'BUONG PANGALAN:' },
  setProfile_gender: { english: 'GENDER:', filipino: 'KASARIAN:' },
  setProfile_gradeLevel: { english: 'GRADE LEVEL:', filipino: 'ANTAS:' },
  setProfile_section: { english: 'SECTION:', filipino: 'SEKSYON:' },
  setProfile_save: { english: 'SAVE', filipino: 'I-SAVE' },
  setProfile_saving: { english: 'SAVING...', filipino: 'NAGSE-SAVE...' },
  setProfile_discard: { english: 'DISCARD', filipino: 'IBAWAL' },
  setProfile_avatars: { english: 'AVATARS', filipino: 'MGA AVATAR' },
  setProfile_changeAvatar: { english: 'Change avatar image', filipino: 'Palitan ang larawan ng avatar' },
  setProfile_failed: { english: 'Failed to save profile. Please try again.', filipino: 'Hindi na-save ang profile. Subukan muli.' },
  setProfile_errorGeneric: { english: 'An unexpected error occurred. Please try again.', filipino: 'May nangyaring error. Subukan muli.' },

  // --- Leaderboard ---
  leaderboard_title: { english: 'Leaderboard', filipino: 'Ranking' },
  leaderboard_titleCaps: { english: 'LEADERBOARD', filipino: 'RANKING' },
  leaderboard_rankingsByPoints: { english: 'Rankings by total points', filipino: 'Ranking ayon sa kabuuang puntos' },
  leaderboard_overallRank: { english: 'Overall rank', filipino: 'Kabuuang ranggo' },
  leaderboard_name: { english: 'NAME', filipino: 'PANGALAN' },
  leaderboard_points: { english: 'POINTS', filipino: 'PUNTOS' },
  leaderboard_rank: { english: 'RANK', filipino: 'RANGGO' },
  leaderboard_loading: { english: 'Loading leaderboard...', filipino: 'Naglo-load ng ranking...' },
  leaderboard_failed: { english: 'Failed to load leaderboard. Please try again.', filipino: 'Hindi na-load ang ranking. Subukan muli.' },
  leaderboard_noStudents: { english: 'No students enrolled yet. Leaderboard will appear here once students join the class.', filipino: 'Wala pang enrolled na mga mag-aaral. Lalabas ang ranking kapag may sumali na sa klase.' },
  leaderboard_notOnBoard: { english: 'You are not on this class leaderboard yet.', filipino: 'Wala ka pa sa ranking ng klase na ito.' },
};

function getLang() {
  try {
    const lang = localStorage.getItem('settings_language') || 'english';
    return lang === 'filipino' ? 'filipino' : 'english';
  } catch {
    return 'english';
  }
}

/**
 * Translate key to current language. Supports {placeholder} interpolation.
 * @param {string} key - Key in translations (e.g. 'login_title')
 * @param {Record<string, string>} [params] - Optional map for placeholders
 * @returns {string}
 */
export function t(key, params = {}) {
  const lang = getLang();
  const entry = translations[key];
  if (!entry) return key;
  let str = entry[lang] ?? entry.english ?? key;
  Object.keys(params).forEach((k) => {
    str = str.replace(new RegExp(`\\{${k}\\}`, 'g'), String(params[k]));
  });
  return str;
}

/**
 * Get current language code (for context / re-renders when language changes)
 */
export function getLanguage() {
  return getLang();
}

/**
 * Translate by key for a given language (for use with LanguageContext).
 */
export function translate(key, lang, params = {}) {
  const entry = translations[key];
  if (!entry) return key;
  const normalized = lang === 'filipino' ? 'filipino' : 'english';
  let str = entry[normalized] ?? entry.english ?? key;
  Object.keys(params).forEach((k) => {
    str = str.replace(new RegExp(`\\{${k}\\}`, 'g'), String(params[k]));
  });
  return str;
}
