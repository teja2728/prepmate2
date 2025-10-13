const mongoose = require('mongoose');

const resumeRecordSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  resumeText: {
    type: String,
    required: true
  },
  resumeFileRef: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ResumeFile'
  },
  jdText: {
    type: String,
    required: true
  },
  parsedData: {
    name: String,
    email: String,
    skills: [String],
    experience: [{
      company: String,
      title: String,
      start: String,
      end: String,
      bullets: [String]
    }],
    education: [{
      institution: String,
      degree: String,
      year: String
    }],
    projects: [{
      name: String,
      summary: String
    }]
  },
  metadata: {
    fileName: String,
    fileSize: Number,
    mimeType: String,
    uploadDate: Date
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('ResumeRecord', resumeRecordSchema);
