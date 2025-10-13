const express = require('express');
const multer = require('multer');
const { body, validationResult } = require('express-validator');
const mongoose = require('mongoose');
const { authMiddleware } = require('../middleware/auth');
const ResumeRecord = require('../models/ResumeRecord');
const geminiService = require('../services/geminiService');
const LLMLog = require('../models/LLMLog');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept text files and common document formats
    const allowedTypes = [
      'text/plain',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only text, PDF, and Word documents are allowed.'), false);
    }
  }
});

// Helper function to extract text from uploaded file
const extractTextFromFile = (file) => {
  // For now, we'll handle text files directly
  // In production, you'd want to use libraries like pdf-parse for PDFs
  if (file.mimetype === 'text/plain') {
    return file.buffer.toString('utf-8');
  }
  
  // For other file types, return a placeholder
  // In production, implement proper text extraction
  return `[File content from ${file.originalname} - text extraction not implemented for ${file.mimetype}]`;
};

// @route   POST /api/user/resume
// @desc    Upload resume and job description
// @access  Private
router.post('/resume', authMiddleware, upload.single('resumeFile'), [
  body('jdText').notEmpty().withMessage('Job description is required'),
  body('resumeText').optional().isString()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }

    const { jdText, resumeText } = req.body;
    let finalResumeText = resumeText;

    // Handle file upload if present
    if (req.file) {
      finalResumeText = extractTextFromFile(req.file);
    }

    if (!finalResumeText) {
      return res.status(400).json({ message: 'Resume text or file is required' });
    }

    // Parse resume using Gemini
    const parseResult = await geminiService.parseResumeAndJD(finalResumeText, jdText);
    
    if (!parseResult.success) {
      return res.status(500).json({ 
        message: 'Failed to parse resume', 
        error: parseResult.error 
      });
    }

    // Parse JSON response
    let parsedData;
    try {
      parsedData = JSON.parse(parseResult.data);
    } catch (parseError) {
      console.error('Failed to parse Gemini response:', parseError);
      return res.status(500).json({ message: 'Failed to parse resume data' });
    }

    // Log the LLM interaction
    await LLMLog.create({
      userId: req.user._id,
      endpoint: '/api/user/resume',
      promptType: 'resume_parse',
      requestData: geminiService.sanitizeForLogging({ resumeText: finalResumeText, jdText }),
      responseData: parsedData,
      processingTime: parseResult.processingTime,
      success: true,
      geminiRequestId: parseResult.requestId
    });

    // Create resume record
    const resumeRecord = new ResumeRecord({
      userId: req.user._id,
      resumeText: finalResumeText,
      jdText,
      parsedData,
      metadata: req.file ? {
        fileName: req.file.originalname,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
        uploadDate: new Date()
      } : null
    });

    await resumeRecord.save();

    res.status(201).json({
      message: 'Resume and job description uploaded successfully',
      resumeId: resumeRecord._id,
      parsedData: parsedData
    });

  } catch (error) {
    console.error('Resume upload error:', error);
    res.status(500).json({ message: 'Server error during resume upload' });
  }
});

// @route   GET /api/user/resume
// @desc    Get user's resume records
// @access  Private
router.get('/resume', authMiddleware, async (req, res) => {
  try {
    const resumes = await ResumeRecord.find({ userId: req.user._id })
      .select('_id resumeText jdText parsedData metadata createdAt updatedAt')
      .sort({ createdAt: -1 });

    res.json({
      resumes: resumes.map(resume => ({
        id: resume._id,
        resumeText: resume.resumeText.substring(0, 200) + '...', // Preview only
        jdText: resume.jdText.substring(0, 200) + '...', // Preview only
        parsedData: resume.parsedData,
        metadata: resume.metadata,
        createdAt: resume.createdAt,
        updatedAt: resume.updatedAt
      }))
    });
  } catch (error) {
    console.error('Get resumes error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/user/resume/:id
// @desc    Get specific resume record
// @access  Private
router.get('/resume/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid resume ID' });
    }

    const resume = await ResumeRecord.findOne({ 
      _id: id, 
      userId: req.user._id 
    });

    if (!resume) {
      return res.status(404).json({ message: 'Resume not found' });
    }

    res.json({
      resume: {
        id: resume._id,
        resumeText: resume.resumeText,
        jdText: resume.jdText,
        parsedData: resume.parsedData,
        metadata: resume.metadata,
        createdAt: resume.createdAt,
        updatedAt: resume.updatedAt
      }
    });
  } catch (error) {
    console.error('Get resume error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/user/resume/:id
// @desc    Delete resume record
// @access  Private
router.delete('/resume/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid resume ID' });
    }

    const resume = await ResumeRecord.findOneAndDelete({ 
      _id: id, 
      userId: req.user._id 
    });

    if (!resume) {
      return res.status(404).json({ message: 'Resume not found' });
    }

    res.json({ message: 'Resume deleted successfully' });
  } catch (error) {
    console.error('Delete resume error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

