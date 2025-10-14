const express = require('express');
const { body, validationResult } = require('express-validator');
const mongoose = require('mongoose');
const { authMiddleware } = require('../middleware/auth');
const ResumeRecord = require('../models/ResumeRecord');
const QuestionRecord = require('../models/QuestionRecord');
const CompanyArchiveRecord = require('../models/CompanyArchiveRecord');
const ResourcesRecord = require('../models/ResourcesRecord');
const ResumeImprovementRecord = require('../models/ResumeImprovementRecord');
const User = require('../models/User');
const geminiService = require('../services/geminiService');
const LLMLog = require('../models/LLMLog');

const router = express.Router();

// @route   POST /api/generate/questions
// @desc    Generate interview questions from resume and JD
// @access  Private
router.post('/questions', authMiddleware, [
  body('resumeId').optional().isMongoId().withMessage('Invalid resume ID'),
  body('resumeText').optional().isString(),
  body('jdText').optional().isString()
], async (req, res) => {
  // Extend timeout for long LLM calls (180s)
  res.setTimeout(180000);
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }

    const { resumeId, resumeText, jdText } = req.body;
    let resumeData, jdData;

    if (resumeId) {
      // Get resume from database
      const resume = await ResumeRecord.findOne({ 
        _id: resumeId, 
        userId: req.user._id 
      });

      if (!resume) {
        return res.status(404).json({ message: 'Resume not found' });
      }

      resumeData = resume.parsedData;
      jdData = resume.jdText;
    } else if (resumeText && jdText) {
      // Parse resume text on the fly
      const parseResult = await geminiService.parseResumeAndJD(resumeText, jdText);
      
      if (!parseResult.success) {
        return res.status(500).json({ 
          message: 'Failed to parse resume', 
          error: parseResult.error 
        });
      }

      try {
        resumeData = JSON.parse(parseResult.data);
      } catch (parseError) {
        return res.status(500).json({ message: 'Failed to parse resume data' });
      }
      
      jdData = jdText;
    } else {
      return res.status(400).json({ 
        message: 'Either resumeId or both resumeText and jdText are required' 
      });
    }

    // Generate questions using Gemini
    const questionResult = await geminiService.generateInterviewQuestions(resumeData, jdData);
    
    if (!questionResult.success) {
      return res.status(500).json({ 
        message: 'Failed to generate questions', 
        error: questionResult.error 
      });
    }

    // Parse questions JSON
    let questions;
    try {
      if (Array.isArray(questionResult.data)) {
        questions = questionResult.data;
      } else if (typeof questionResult.data === 'string') {
        try {
          questions = JSON.parse(questionResult.data);
        } catch (err) {
          const match = questionResult.data.match(/\[.*\]/s);
          if (match) {
            questions = JSON.parse(match[0]);
          } else {
            throw err;
          }
        }
      } else if (questionResult && typeof questionResult === 'object') {
        questions = questionResult.data;
      }
    } catch (parseError) {
      console.error('Failed to parse questions:', parseError);
      return res.status(500).json({ message: 'Failed to parse generated questions' });
    }

    // Validate questions structure
    if (!Array.isArray(questions) || questions.length !== 10) {
      return res.status(500).json({ 
        message: 'Invalid questions format. Expected array of 10 questions.' 
      });
    }

    // Log the LLM interaction
    await LLMLog.create({
      userId: req.user._id,
      endpoint: '/api/generate/questions',
      promptType: 'question_generation',
      requestData: geminiService.sanitizeForLogging({ resumeData, jdText: jdData }),
      responseData: questions,
      processingTime: questionResult.processingTime,
      success: true,
      geminiRequestId: questionResult.requestId
    });

    // Save questions to database if resumeId provided
    if (resumeId) {
      const questionRecord = new QuestionRecord({
        userId: req.user._id,
        resumeId,
        generatedQuestions: questions.map(q => ({
          question: q.question,
          type: q.type,
          difficulty: q.difficulty,
          rationale: q.rationale,
          relatedSkills: q.relatedSkills || [],
          geminiPromptSnapshot: `Generated for resume ${resumeId}`,
          createdAt: new Date()
        })),
        geminiRequestId: questionResult.requestId,
        processingTime: questionResult.processingTime
      });

      await questionRecord.save();
    }

    res.json({
      message: 'Questions generated successfully',
      questions: questions,
      processingTime: questionResult.processingTime
    });

  } catch (error) {
    console.error('Question generation error:', error);
    res.status(500).json({ message: 'Server error during question generation' });
  }
});

// @route   POST /api/generate/company-archive
// @desc    Get company-specific interview questions
// @access  Private
router.post('/company-archive', authMiddleware, [
  body('companyName').notEmpty().trim().withMessage('Company name is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }

    const { companyName } = req.body;

    // Check cache first
    const cached = await CompanyArchiveRecord.findOne({ 
      companyName: companyName.toLowerCase() 
    });

    if (cached && (Date.now() - cached.fetchedAt.getTime()) < 24 * 60 * 60 * 1000) {
      // Return cached data if less than 24 hours old
      return res.json({
        message: 'Company archive retrieved from cache',
        company: cached.companyName,
        rounds: cached.rounds,
        note: cached.note,
        cached: true,
        fetchedAt: cached.fetchedAt
      });
    }

    // Generate company questions using Gemini
    const archiveResult = await geminiService.getCompanyQuestions(companyName);
    
    if (!archiveResult.success) {
      return res.status(500).json({ 
        message: 'Failed to retrieve company questions', 
        error: archiveResult.error 
      });
    }

    // Parse archive JSON (cleanup + resilient parsing)
    let archiveData;
    try {
      let raw = archiveResult.data;
      if (typeof raw !== 'string') {
        archiveData = raw; // already parsed
      } else {
        // strip code fences if present
        raw = raw.replace(/```json\s*/gi, '').replace(/```/g, '');
        // normalize smart quotes
        raw = raw.replace(/[\u2018\u2019\u201C\u201D]/g, '"');
        // remove trailing commas before } or ]
        raw = raw.replace(/,(\s*[}\]])/g, '$1');
        try {
          archiveData = JSON.parse(raw);
        } catch (_) {
          // try to extract the first top-level JSON object
          const match = raw.match(/\{[\s\S]*\}/);
          if (match) {
            const candidate = match[0].replace(/,(\s*[}\]])/g, '$1');
            archiveData = JSON.parse(candidate);
          } else {
            throw _;
          }
        }
      }
    } catch (parseError) {
      console.error('Failed to parse company archive:', parseError);
      return res.status(500).json({ message: 'Failed to parse company archive data' });
    }

    // Log the LLM interaction
    await LLMLog.create({
      userId: req.user._id,
      endpoint: '/api/generate/company-archive',
      promptType: 'company_archive',
      requestData: { companyName },
      responseData: archiveData,
      processingTime: archiveResult.processingTime,
      success: true,
      geminiRequestId: archiveResult.requestId
    });

    // Save to cache
    const archiveRecord = new CompanyArchiveRecord({
      companyName: companyName.toLowerCase(),
      rounds: archiveData.rounds || [],
      note: archiveData.note || '',
      geminiRequestId: archiveResult.requestId,
      processingTime: archiveResult.processingTime,
      fetchedAt: new Date()
    });

    await archiveRecord.save();

    res.json({
      message: 'Company archive retrieved successfully',
      company: archiveData.company || companyName,
      rounds: archiveData.rounds || [],
      note: archiveData.note || 'No data found',
      cached: false,
      processingTime: archiveResult.processingTime
    });

  } catch (error) {
    console.error('Company archive error:', error);
    res.status(500).json({ message: 'Server error during company archive retrieval' });
  }
});

// @route   POST /api/generate/resources
// @desc    Get learning resources for JD skills
// @access  Private
router.post('/resources', authMiddleware, [
  body('jdText').optional().isString(),
  body('resumeId').optional().isMongoId()
], async (req, res) => {
  // Extend timeout for long LLM calls (180s)
  res.setTimeout(180000);
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }

    let { jdText, resumeId } = req.body;
    if (!jdText && resumeId) {
      const resume = await ResumeRecord.findOne({ _id: resumeId, userId: req.user._id });
      if (!resume) {
        return res.status(404).json({ message: 'Resume not found' });
      }
      jdText = resume.jdText;
    }

    if (!jdText) {
      return res.status(400).json({ message: 'Job description text is required' });
    }

    // Generate resources using Gemini
    const resourcesResult = await geminiService.getResourcesForJD(jdText);

    if (!resourcesResult.success || !resourcesResult.data) {
      return res.status(500).json({ 
        message: 'Failed to generate resources', 
        error: resourcesResult.error || 'No data returned from Gemini'
      });
    }

    // Parse resources JSON, fallback to regex repair if needed
    let resourcesData;
    try {
      if (Array.isArray(resourcesResult.data)) {
        resourcesData = resourcesResult.data;
      } else if (typeof resourcesResult.data === 'string') {
        try {
          resourcesData = JSON.parse(resourcesResult.data);
        } catch (parseError) {
          const match = resourcesResult.data.match(/\[.*\]/s);
          if (match) {
            resourcesData = JSON.parse(match[0]);
          } else {
            throw parseError;
          }
        }
      } else if (resourcesResult && typeof resourcesResult === 'object') {
        resourcesData = resourcesResult.data;
      }
      if (!Array.isArray(resourcesData) || resourcesData.some(s => !s.skill || !Array.isArray(s.resources))) {
        throw new Error('Schema mismatch');
      }
    } catch (err) {
      console.error('Failed to parse resources:', err);
      return res.status(500).json({ message: 'Failed to parse resources data' });
    }

    // Log the LLM interaction
    await LLMLog.create({
      userId: req.user._id,
      endpoint: '/api/generate/resources',
      promptType: 'resource_generation',
      requestData: geminiService.sanitizeForLogging({ jdText }),
      responseData: resourcesData,
      processingTime: resourcesResult.processingTime,
      success: true,
      geminiRequestId: resourcesResult.requestId
    });

    res.json({
      message: 'Resources generated successfully',
      skills: resourcesData,
      processingTime: resourcesResult.processingTime
    });

  } catch (error) {
    console.error('Resource generation error:', error);
    res.status(500).json({ message: 'Server error during resource generation' });
  }
});

// @route   POST /api/generate/resume-suggestions
// @desc    Generate resume improvement suggestions based on resume and JD
// @access  Private
router.post('/resume-suggestions', authMiddleware, [
  body('resumeId').optional().isMongoId(),
  body('resumeText').optional().isString(),
  body('jdText').optional().isString()
], async (req, res) => {
  // Extend timeout for long LLM calls (180s)
  res.setTimeout(180000);
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Validation failed', errors: errors.array() });
    }

    let { resumeId, resumeText, jdText } = req.body;
    if (resumeId && (!resumeText || !jdText)) {
      const rec = await ResumeRecord.findOne({ _id: resumeId, userId: req.user._id });
      if (!rec) return res.status(404).json({ message: 'Resume not found' });
      resumeText = rec.resumeText;
      jdText = rec.jdText;
    }

    if (!resumeText || !jdText) {
      return res.status(400).json({ message: 'resumeText and jdText are required (or provide resumeId)' });
    }

    const llm = await geminiService.generateResumeSuggestions(resumeText, jdText);
    if (!llm.success || !llm.data) {
      return res.status(500).json({ message: 'Failed to generate suggestions', error: llm.error || 'No data' });
    }

    // Parse robustly
    let suggestions;
    try {
      let raw = llm.data;
      if (typeof raw !== 'string') {
        suggestions = raw;
      } else {
        raw = raw.replace(/```json\s*/gi, '').replace(/```/g, '');
        raw = raw.replace(/[\u2018\u2019\u201C\u201D]/g, '"');
        raw = raw.replace(/,(\s*[}\]])/g, '$1');
        try {
          suggestions = JSON.parse(raw);
        } catch (_) {
          const match = raw.match(/\{[\s\S]*\}/);
          if (match) {
            const candidate = match[0].replace(/,(\s*[}\]])/g, '$1');
            suggestions = JSON.parse(candidate);
          } else {
            throw _;
          }
        }
      }
    } catch (e) {
      console.error('Failed to parse resume suggestions:', e);
      return res.status(500).json({ message: 'Failed to parse suggestions' });
    }

    await LLMLog.create({
      userId: req.user._id,
      endpoint: '/api/generate/resume-suggestions',
      promptType: 'resume_suggestions',
      requestData: geminiService.sanitizeForLogging({ hasResumeId: !!resumeId, jdLen: jdText.length }),
      responseData: suggestions,
      processingTime: llm.processingTime,
      success: true,
      geminiRequestId: llm.requestId
    });

    res.json({ message: 'Suggestions generated', suggestions, processingTime: llm.processingTime });
  } catch (error) {
    console.error('Resume suggestions error:', error);
    res.status(500).json({ message: 'Server error during resume suggestions generation' });
  }
});

// @route   POST /api/generate/resume-improver
// @desc    AI-powered resume improvement analysis and recommendations
// @access  Private
router.post('/resume-improver', authMiddleware, [
  body('resumeId').optional().isMongoId(),
  body('resumeText').optional().isString(),
  body('jdText').optional().isString()
], async (req, res) => {
  res.setTimeout(180000);
  try {
    console.log('Received resume improver request');
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Validation failed', errors: errors.array() });
    }

    let { resumeId, resumeText, jdText } = req.body;
    if (resumeId && (!resumeText || !jdText)) {
      const rec = await ResumeRecord.findOne({ _id: resumeId, userId: req.user._id });
      if (!rec) return res.status(404).json({ message: 'Resume not found' });
      resumeText = rec.resumeText;
      jdText = rec.jdText;
    }
    if (!resumeText || !jdText) {
      return res.status(400).json({ message: 'resumeText and jdText are required (or provide resumeId)' });
    }

    const llm = await geminiService.generateResumeImprovement(resumeText, jdText);
    if (!llm.success || !llm.data) {
      return res.status(500).json({ message: 'Failed to generate resume improvement', error: llm.error || 'No data' });
    }

    // Parse robustly
    let parsed;
    try {
      let raw = llm.data;
      console.log('Raw Gemini response:', typeof raw === 'string' ? raw.slice(0, 500) : raw);
      if (typeof raw !== 'string') parsed = raw; else {
        raw = raw.replace(/```json\s*/gi, '').replace(/```/g, '');
        raw = raw.replace(/[\u2018\u2019\u201C\u201D]/g, '"');
        raw = raw.replace(/,(\s*[}\]])/g, '$1');
        try { parsed = JSON.parse(raw); }
        catch (_) {
          const match = raw.match(/\{[\s\S]*\}/);
          if (match) parsed = JSON.parse(match[0].replace(/,(\s*[}\]])/g, '$1')); else throw _;
        }
      }
      console.log('Parsed JSON successfully');
    } catch (e) {
      // Retry once with stricter prompt
      console.warn('First parse failed. Retrying with strict prompt...');
      const retry = await geminiService.generateResumeImprovementStrict(resumeText, jdText);
      if (!retry.success || !retry.data) {
        console.error('Strict retry failed:', retry.error);
        return res.status(502).json({ message: 'Invalid JSON returned from Gemini.' });
      }
      try {
        let raw = retry.data;
        console.log('Raw Gemini response (strict):', typeof raw === 'string' ? raw.slice(0, 500) : raw);
        if (typeof raw !== 'string') parsed = raw; else {
          raw = raw.replace(/```json\s*/gi, '').replace(/```/g, '');
          raw = raw.replace(/[\u2018\u2019\u201C\u201D]/g, '"');
          raw = raw.replace(/,(\s*[}\]])/g, '$1');
          parsed = JSON.parse(raw);
        }
        console.log('Parsed JSON successfully (strict)');
      } catch (err2) {
        console.error('Strict parse failed:', err2);
        return res.status(502).json({ message: 'Invalid JSON returned from Gemini.' });
      }
    }

    // Normalize to the new structured schema
    const clamp = (n, min, max) => Math.max(min, Math.min(max, Number.isFinite(+n) ? +n : 0));
    const analysisObj = parsed?.analysis || {};
    const jdMatchObj = parsed?.jdMatch || {};
    const improvedObj = parsed?.improvedResume || {};
    const recs = Array.isArray(parsed?.recommendations) ? parsed.recommendations : [];

    const normalizedAnalysis = {
      overallScore: clamp(analysisObj?.overallScore ?? 75, 0, 100),
      summary: (analysisObj?.summary && String(analysisObj.summary).trim()) || 'AI analysis completed successfully.',
      missingSkills: Array.isArray(analysisObj?.missingSkills) ? analysisObj.missingSkills : [],
      recommendations: recs.map((r) => ({
        section: (r?.section || r?.field || 'Summary'),
        issue: r?.issue || 'Unspecified issue',
        improvement: r?.improvement || r?.fix || 'No improvement text provided.',
        confidenceScore: clamp(r?.confidence ?? r?.confidenceScore ?? 0, 0, 100),
      })),
    };

    const normalizedJdMatch = {
      score: clamp(jdMatchObj?.score ?? normalizedAnalysis.overallScore, 0, 100),
      missingSkills: Array.isArray(jdMatchObj?.missingSkills) ? jdMatchObj.missingSkills : [],
    };

    const normSummary = {
      original: String(improvedObj?.summary?.original || ''),
      improved: String(improvedObj?.summary?.improved || ''),
      confidence: Math.max(0, Math.min(1, Number(improvedObj?.summary?.confidence) || 0)),
    };
    const normSkills = Array.isArray(improvedObj?.skills) ? improvedObj.skills.map(s => ({
      original: String(s?.original || ''),
      improved: String(s?.improved || ''),
      confidence: Math.max(0, Math.min(1, Number(s?.confidence) || 0)),
    })) : [];
    const normExperience = Array.isArray(improvedObj?.experience) ? improvedObj.experience.map(e => ({
      title: String(e?.title || ''),
      originalDescription: String(e?.originalDescription || ''),
      improvedDescription: String(e?.improvedDescription || ''),
      confidence: Math.max(0, Math.min(1, Number(e?.confidence) || 0)),
    })) : [];
    const normEducation = Array.isArray(improvedObj?.education) ? improvedObj.education.map(ed => ({
      original: String(ed?.original || ''),
      improved: String(ed?.improved || ''),
      confidence: Math.max(0, Math.min(1, Number(ed?.confidence) || 0)),
    })) : [];

    const normalizedImproved = {
      summary: normSummary,
      skills: normSkills,
      experience: normExperience,
      education: normEducation,
    };

    // Build simplified user.improvedResume structure
    const recCards = [];
    if (normalizedImproved.summary.improved || normalizedImproved.summary.original) {
      recCards.push({
        section: 'Summary',
        current: normalizedImproved.summary.original || '',
        improved: normalizedImproved.summary.improved || '',
        confidence: Number(normalizedImproved.summary.confidence) || 0,
        reason: 'AI optimization for summary based on JD.'
      });
    }
    (normalizedImproved.skills || []).forEach(s => {
      recCards.push({
        section: 'Skills',
        current: s.original || '',
        improved: s.improved || '',
        confidence: Number(s.confidence) || 0,
        reason: 'Skills aligned with JD requirements.'
      });
    });
    (normalizedImproved.experience || []).forEach(e => {
      recCards.push({
        section: 'Experience',
        current: e.originalDescription || '',
        improved: e.improvedDescription || '',
        confidence: Number(e.confidence) || 0,
        reason: 'Experience phrasing improved to emphasize impact.'
      });
    });
    (normalizedImproved.education || []).forEach(ed => {
      recCards.push({
        section: 'Education',
        current: ed.original || '',
        improved: ed.improved || '',
        confidence: Number(ed.confidence) || 0,
        reason: 'Education phrasing standardized.'
      });
    });

    const mergedTextParts = [];
    if (normalizedImproved.summary.improved) {
      mergedTextParts.push('Summary\n' + normalizedImproved.summary.improved);
    }
    if (normalizedImproved.skills.length) {
      mergedTextParts.push('Skills\n' + normalizedImproved.skills.map(s => s.improved || s.original).filter(Boolean).join(', '));
    }
    if (normalizedImproved.experience.length) {
      mergedTextParts.push('Experience\n' + normalizedImproved.experience.map(e => `- ${e.title ? e.title + ': ' : ''}${e.improvedDescription || e.originalDescription}`).join('\n'));
    }
    if (normalizedImproved.education.length) {
      mergedTextParts.push('Education\n' + normalizedImproved.education.map(ed => `- ${ed.improved || ed.original}`).join('\n'));
    }
    const mergedImprovedText = mergedTextParts.join('\n\n');

    // Persist record (without unintended extra fields)
    const record = new ResumeImprovementRecord({
      userId: req.user._id,
      resumeId: resumeId || null,
      jdText,
      analysis: normalizedAnalysis,
      jdMatch: normalizedJdMatch,
      improvedResume: normalizedImproved,
      improvedMerged: mergedImprovedText,
    });
    await record.save();

    // Save on User for quick access/persistence
    await User.findByIdAndUpdate(
      req.user._id,
      {
        $set: {
          improvedResume: {
            summary: normalizedAnalysis.summary,
            overallScore: normalizedAnalysis.overallScore,
            recommendations: recCards,
            improvedResume: mergedImprovedText,
            updatedAt: new Date(),
          }
        }
      },
      { new: true }
    );

    await LLMLog.create({
      userId: req.user._id,
      endpoint: '/api/generate/resume-improver',
      promptType: 'resume_improver',
      requestData: geminiService.sanitizeForLogging({ hasResumeId: !!resumeId, jdLen: jdText.length }),
      responseData: {
        analysis: normalizedAnalysis,
        jdMatch: normalizedJdMatch,
        improvedResume: normalizedImproved,
      },
      processingTime: llm.processingTime,
      success: true,
      geminiRequestId: llm.requestId
    });

    res.json({
      message: 'Resume improvement generated',
      analysis: normalizedAnalysis,
      jdMatch: normalizedJdMatch,
      improvedResume: normalizedImproved,
      recordId: record._id,
      processingTime: llm.processingTime
    });
  } catch (error) {
    console.error('Resume improver error:', error);
    res.status(500).json({ message: 'Server error during resume improver generation' });
  }
});

module.exports = router;



