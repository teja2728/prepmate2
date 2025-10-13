const mongoose = require('mongoose');

const questionRecordSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  resumeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ResumeRecord',
    required: true
  },
  generatedQuestions: [{
    question: {
      type: String,
      required: true
    },
    type: {
      type: String,
      enum: ['behavioral', 'technical', 'coding', 'design', 'aptitude'],
      required: true
    },
    difficulty: {
      type: String,
      enum: ['easy', 'medium', 'hard'],
      required: true
    },
    rationale: {
      type: String,
      required: true
    },
    relatedSkills: [String],
    geminiPromptSnapshot: String,
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  geminiRequestId: String,
  processingTime: Number
}, {
  timestamps: true
});

module.exports = mongoose.model('QuestionRecord', questionRecordSchema);
