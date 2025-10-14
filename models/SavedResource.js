const mongoose = require('mongoose');

const savedResourceSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  link: { type: String, required: true },
  description: { type: String, required: true },
  savedAt: { type: Date, default: Date.now },
}, {
  timestamps: true,
});

savedResourceSchema.index({ userId: 1, link: 1 }, { unique: true });

module.exports = mongoose.model('SavedResource', savedResourceSchema);
