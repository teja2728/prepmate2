const mongoose = require('mongoose');

const recommendationSchema = new mongoose.Schema({
  section: { type: String, required: true },
  issue: { type: String, required: true },
  improvement: { type: String, required: true },
  confidenceScore: { type: Number, min: 0, max: 100, default: 0 },
}, { _id: false });

const analysisSchema = new mongoose.Schema({
  overallScore: { type: Number, min: 0, max: 100, required: true },
  atsScore: { type: Number, min: 0, max: 100, default: 0 },
  grammarScore: { type: Number, min: 0, max: 100, default: 0 },
  clarityScore: { type: Number, min: 0, max: 100, default: 0 },
  keywordCoverage: { type: Number, min: 0, max: 100, default: 0 },
  summary: { type: String, required: true },
  missingSkills: { type: [String], default: [] },
  recommendations: { type: [recommendationSchema], default: [] },
}, { _id: false });

const jdMatchSchema = new mongoose.Schema({
  score: { type: Number, min: 0, max: 100, default: 0 },
  missingSkills: { type: [String], default: [] },
}, { _id: false });

const improvedSummarySchema = new mongoose.Schema({
  original: { type: String, default: '' },
  improved: { type: String, default: '' },
  confidence: { type: Number, min: 0, max: 1, default: 0 },
}, { _id: false });

const improvedSkillSchema = new mongoose.Schema({
  original: { type: String, default: '' },
  improved: { type: String, default: '' },
  confidence: { type: Number, min: 0, max: 1, default: 0 },
}, { _id: false });

const improvedExperienceSchema = new mongoose.Schema({
  title: { type: String, default: '' },
  originalDescription: { type: String, default: '' },
  improvedDescription: { type: String, default: '' },
  confidence: { type: Number, min: 0, max: 1, default: 0 },
}, { _id: false });

const improvedEducationSchema = new mongoose.Schema({
  original: { type: String, default: '' },
  improved: { type: String, default: '' },
  confidence: { type: Number, min: 0, max: 1, default: 0 },
}, { _id: false });

const improvedResumeSchema = new mongoose.Schema({
  summary: { type: improvedSummarySchema, default: () => ({}) },
  skills: { type: [improvedSkillSchema], default: [] },
  experience: { type: [improvedExperienceSchema], default: [] },
  education: { type: [improvedEducationSchema], default: [] },
}, { _id: false });

const resumeImprovementRecordSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  resumeId: { type: mongoose.Schema.Types.ObjectId, ref: 'ResumeRecord', required: false },
  jdText: { type: String, required: true },
  analysis: { type: analysisSchema, required: true },
  jdMatch: { type: jdMatchSchema, default: () => ({}) },
  improvedResume: { type: improvedResumeSchema, default: () => ({}) },
  appliedFixes: { type: [String], default: [] },
  improvedMerged: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
}, { timestamps: true });

module.exports = mongoose.model('ResumeImprovementRecord', resumeImprovementRecordSchema);
