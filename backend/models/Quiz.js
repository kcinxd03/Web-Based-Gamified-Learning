import mongoose from 'mongoose';

const questionSchema = new mongoose.Schema({
  questionText: {
    type: String,
    required: true,
    trim: true
  },
  questionType: {
    type: String,
    enum: ['qanda', 'truefalse', 'fillblank'],
    required: true
  },
  answers: [{
    text: {
      type: String,
      trim: true
    },
    isCorrect: {
      type: Boolean,
      default: false
    }
  }],
  correctAnswer: {
    type: String,
    trim: true
  },
  correctAnswerBool: {
    type: Boolean,
    default: null
  }
});

const quizSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  category: {
    type: String,
    trim: true
  },
  difficulty: {
    type: String,
    enum: ['Easy', 'Medium', 'Hard', ''],
    default: ''
  },
  gameMode: {
    type: String,
    enum: ['SINGLE', 'MULTIPLAYER'],
    default: 'MULTIPLAYER'
  },
  timeLimit: {
    type: Number, // Time limit in seconds
    default: null // null means no time limit
  },
  teacher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Teacher',
    required: true
  },
  class: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class',
    required: true
  },
  questions: [questionSchema]
}, {
  timestamps: true
});

const Quiz = mongoose.model('Quiz', quizSchema);

export default Quiz;

