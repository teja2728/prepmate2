const mongoose = require('mongoose');

const llmLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  endpoint: {
    type: String,
    required: true
  },
  promptType: {
    type: String,
    required: true
  },
  requestData: {
    type: mongoose.Schema.Types.Mixed
  },
  responseData: {
    type: mongoose.Schema.Types.Mixed
  },
  processingTime: {
    type: Number,
    required: true
  },
  success: {
    type: Boolean,
    required: true
  },
  errorMessage: String,
  geminiRequestId: String,
  timestamp: {
    type: Date,
    default: Date.now
  }
});

// Index for efficient querying
llmLogSchema.index({ userId: 1, timestamp: -1 });
llmLogSchema.index({ endpoint: 1, timestamp: -1 });

module.exports = mongoose.model('LLMLog', llmLogSchema);
