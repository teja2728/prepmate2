const express = require('express');
const { body, validationResult } = require('express-validator');
const mongoose = require('mongoose');
const { authMiddleware } = require('../middleware/auth');
const ResumeRecord = require('../models/ResumeRecord');
const QuestionRecord = require('../models/QuestionRecord');
const CompanyArchiveRecord = require('../models/CompanyArchiveRecord');
const ResourcesRecord = require('../models/ResourcesRecord');
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
      questions = JSON.parse(questionResult.data);
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

    // Parse archive JSON
    let archiveData;
    try {
      archiveData = JSON.parse(archiveResult.data);
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
  body('jdText').notEmpty().withMessage('Job description text is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }

    const { jdText } = req.body;

    // Generate resources using Gemini
    const resourcesResult = await geminiService.getResourcesForJD(jdText);
    
    if (!resourcesResult.success) {
      return res.status(500).json({ 
        message: 'Failed to generate resources', 
        error: resourcesResult.error 
      });
    }

    // Parse resources JSON
    let resourcesData;
    try {
      resourcesData = JSON.parse(resourcesResult.data);
    } catch (parseError) {
      console.error('Failed to parse resources:', parseError);
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

module.exports = router;

