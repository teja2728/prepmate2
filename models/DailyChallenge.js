const mongoose = require('mongoose');

const dailyChallengeSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: Date, default: Date.now, index: true },
  challengeType: { type: String, default: 'general' },
  difficulty: { type: String, enum: ['Easy', 'Medium', 'Hard'], default: 'Medium' },
  question: { type: String, required: true },
  answer: { type: String, default: '' },
  status: { type: String, enum: ['pending', 'completed', 'skipped'], default: 'pending' },
  generatedAt: { type: Date, default: Date.now },
  completedAt: { type: Date },
}, { timestamps: true });

module.exports = mongoose.model('DailyChallenge', dailyChallengeSchema);
