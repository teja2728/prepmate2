const mongoose = require('mongoose');

const userProgressSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  skillName: { type: String, required: true, index: true },
  resourceLink: { type: String, default: null },
  skillTotal: { type: Number, default: null },
  isCompleted: { type: Boolean, default: false },
  completedAt: { type: Date, default: null },
}, {
  timestamps: true,
});

// One entry per user+skill+resourceLink (resourceLink may be null for skill-level completion)
userProgressSchema.index({ userId: 1, skillName: 1, resourceLink: 1 }, { unique: true });

module.exports = mongoose.model('UserProgress', userProgressSchema);
