const mongoose = require('mongoose');

const companyArchiveRecordSchema = new mongoose.Schema({
  companyName: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  rounds: [{
    roundName: {
      type: String,
      required: true
    },
    questions: [{
      question: {
        type: String,
        required: true
      },
      source: {
        type: String,
        required: true
      },
      confidence: {
        type: Number,
        min: 0,
        max: 1,
        required: true
      }
    }]
  }],
  note: String,
  geminiRequestId: String,
  processingTime: Number,
  fetchedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for efficient company lookups
companyArchiveRecordSchema.index({ companyName: 1 });

module.exports = mongoose.model('CompanyArchiveRecord', companyArchiveRecordSchema);
