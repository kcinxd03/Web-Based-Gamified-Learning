import mongoose from 'mongoose';

const playerResultSchema = new mongoose.Schema({
  player: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  },
  playerName: {
    type: String,
    required: true,
    trim: true
  },
  points: {
    type: Number,
    default: 0
  },
  correctAnswers: {
    type: Number,
    default: 0
  },
  finishedFirst: {
    type: Boolean,
    default: false
  },
  timeToFinishSeconds: {
    type: Number,
    default: null
  }
}, { _id: false });

const quizResultSchema = new mongoose.Schema({
  gameSession: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'GameSession',
    required: true,
    unique: true
  },
  quiz: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Quiz',
    required: true
  },
  class: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class',
    required: true
  },
  finishedAt: {
    type: Date,
    default: Date.now
  },
  playerResults: [playerResultSchema]
}, {
  timestamps: true,
  collection: 'quizresults'
});

const QuizResult = mongoose.model('QuizResult', quizResultSchema);
export default QuizResult;
