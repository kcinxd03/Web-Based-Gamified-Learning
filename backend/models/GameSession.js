import mongoose from 'mongoose';

const gameSessionSchema = new mongoose.Schema({
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
  teacher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Teacher',
    required: true
  },
  map: {
    id: {
      type: Number
    },
    name: {
      type: String,
      trim: true
    },
    description: {
      type: String,
      trim: true
    },
    image: {
      type: String,
      trim: true
    }
  },
  gameCode: {
    type: String,
    unique: true,
    trim: true,
    uppercase: true
  },
  status: {
    type: String,
    enum: ['WAITING', 'PLAYING', 'FINISHED'],
    default: 'WAITING'
  },
  players: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student'
  }],
  startedAt: {
    type: Date
  },
  finishedAt: {
    type: Date
  },
  currentRoundNumber: {
    type: Number,
    default: 0
  },
  npcSeed: {
    type: Number,
    default: null
  },
  playerScores: {
    type: mongoose.Schema.Types.Mixed,
    default: () => ({})
  },
  /** Snapshot of playerScores when this round started (teacher clicked Play). Used to show "points from last game" = playerScores - this. */
  playerScoresAtRoundStart: {
    type: mongoose.Schema.Types.Mixed,
    default: () => ({})
  },
  totalQuestionsPerPlayer: {
    type: Number,
    default: 0
  },
  playerAnsweredCounts: {
    type: mongoose.Schema.Types.Mixed,
    default: () => ({})
  },
  /** Number of correct answers per player (userId -> count) */
  playerCorrectCounts: {
    type: mongoose.Schema.Types.Mixed,
    default: () => ({})
  },
  /** Time to finish quiz in seconds per player (userId -> seconds) */
  playerFinishTimes: {
    type: mongoose.Schema.Types.Mixed,
    default: () => ({})
  },
  /** Temporary accumulator: when each player finishes, we store their result here; when game ends we write all at once to quizresults. Keyed by playerId (string). */
  finishedResults: {
    type: mongoose.Schema.Types.Mixed,
    default: () => ({})
  },
  /** Current health per player (playerId string -> number). Used so teacher sidebar can show health. */
  playerHealth: {
    type: mongoose.Schema.Types.Mixed,
    default: () => ({})
  }
}, {
  timestamps: true
});

const GameSession = mongoose.model('GameSession', gameSessionSchema);

export default GameSession;

