import mongoose from 'mongoose';

const pointAwardSchema = new mongoose.Schema({
  gameSession: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'GameSession',
    required: true
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
  player: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  },
  points: {
    type: Number,
    default: 0
  },
  lastAwardedRound: {
    type: Number,
    default: 0
  },
  awardedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  collection: 'pointawards'
});

pointAwardSchema.index({ gameSession: 1, player: 1 }, { unique: true });
pointAwardSchema.index({ class: 1, player: 1 });
pointAwardSchema.index({ player: 1 });

const PointAward = mongoose.model('PointAward', pointAwardSchema);
export default PointAward;
