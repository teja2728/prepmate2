const mongoose = require('mongoose');

const resourcesRecordSchema = new mongoose.Schema({
  resumeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ResumeRecord',
    required: true
  },
  jdSkills: [{
    skillName: {
      type: String,
      required: true
    },
    resources: [{
      title: {
        type: String,
        required: true
      },
      url: {
        type: String,
        required: true
      },
      type: {
        type: String,
        enum: ['video', 'article', 'doc', 'course', 'repo'],
        required: true
      },
      summary: {
        type: String,
        required: true
      },
      estimatedTime: {
        type: String,
        required: true
      }
    }]
  }],
  geminiRequestId: String,
  processingTime: Number,
  fetchedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('ResourcesRecord', resourcesRecordSchema);
