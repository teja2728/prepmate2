const express = require('express');
const multer = require('multer');
const { body, validationResult } = require('express-validator');
const mongoose = require('mongoose');
const { authMiddleware } = require('../middleware/auth');
const ResumeRecord = require('../models/ResumeRecord');
const geminiService = require('../services/geminiService');
const LLMLog = require('../models/LLMLog');
const User = require('../models/User');

const router = express.Router();
let warnedPdfParse = false;

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

// @route   PUT /api/user/profile/update
// @desc    Update user profile fields
// @access  Private
router.put('/profile/update', authMiddleware, async (req, res) => {
  try {
    const userId = req.user._id;
    const allowed = ['name','college','degree','year','skills','goal','linkedin','github','profilePic'];
    const update = {};
    for (const k of allowed) {
      if (typeof req.body[k] !== 'undefined') update[k] = req.body[k];
    }
    const updatedUser = await User.findByIdAndUpdate(userId, update, { new: true }).select('-password');
    res.json(updatedUser);
  } catch (err) {
    res.status(500).json({ error: 'Profile update failed' });
  }
});

// Helper function to extract text from uploaded file (async)
const extractTextFromFile = async (file) => {
  try {
    if (!file) return '';
    if (file.mimetype === 'text/plain') {
      return file.buffer.toString('utf-8');
    }
    if (file.mimetype === 'application/pdf') {
      try {
        let pdfParse = null;
        try { pdfParse = require('pdf-parse'); } catch {}
        if (pdfParse && typeof pdfParse === 'object' && typeof pdfParse.default === 'function') {
          pdfParse = pdfParse.default;
        }
        if (typeof pdfParse !== 'function') {
          try {
            const mod = await import('pdf-parse');
            pdfParse = mod?.default || mod;
          } catch {}
        }
        if (typeof pdfParse === 'function') {
          const data = await pdfParse(file.buffer);
          return data.text || '';
        }
        throw new Error('pdf-parse module did not export a function');
      } catch (e) {
        if (!warnedPdfParse) {
          console.warn('pdf-parse not available or failed, falling back:', e.message);
          warnedPdfParse = true;
        }
      }
    }
    if (
      file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      file.mimetype === 'application/msword'
    ) {
      try {
        const mammoth = require('mammoth');
        const result = await mammoth.extractRawText({ buffer: file.buffer });
        return result.value || '';
      } catch (e) {
        console.warn('mammoth not available or failed, falling back:', e.message);
      }
    }
  } catch (err) {
    console.warn('extractTextFromFile error:', err?.message || err);
  }
  return `[File content from ${file?.originalname || 'unknown'} - text extraction not implemented for ${file?.mimetype || 'unknown'}]`;
};

// @route   POST /api/user/resume
// @desc    Upload resume and job description
// @access  Private
router.post('/resume', authMiddleware, upload.fields([
  { name: 'resumeFile', maxCount: 1 },
  { name: 'jdFile', maxCount: 1 }
]), [
  body('jdText').optional().isString(),
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
    let finalJDText = jdText;

    // Handle resume file if present
    const resumeFile = req.files?.resumeFile?.[0];
    if (resumeFile) {
      finalResumeText = await extractTextFromFile(resumeFile);
    }

    // Handle JD file if present
    const jdFile = req.files?.jdFile?.[0];
    if (jdFile) {
      finalJDText = await extractTextFromFile(jdFile);
    }

    if (!finalResumeText) {
      return res.status(400).json({ message: 'Resume text or file is required' });
    }
    if (!finalJDText) {
      return res.status(400).json({ message: 'Job description text or file is required' });
    }

    // Parse resume using Gemini
    const parseResult = await geminiService.parseResumeAndJD(finalResumeText, finalJDText);
    
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
      requestData: geminiService.sanitizeForLogging({ resumeText: finalResumeText, jdText: finalJDText }),
      responseData: parsedData,
      processingTime: parseResult.processingTime,
      success: true,
      geminiRequestId: parseResult.requestId
    });

    // Create resume record
    const resumeRecord = new ResumeRecord({
      userId: req.user._id,
      resumeText: finalResumeText,
      jdText: finalJDText,
      parsedData,
      metadata: {
        resume: resumeFile ? {
          fileName: resumeFile.originalname,
          fileSize: resumeFile.size,
          mimeType: resumeFile.mimetype,
          uploadDate: new Date()
        } : null,
        jd: jdFile ? {
          fileName: jdFile.originalname,
          fileSize: jdFile.size,
          mimeType: jdFile.mimetype,
          uploadDate: new Date()
        } : null
      }
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

// @route   POST /api/user/resources/save
// @desc    Save a favorite learning resource for the user
// @access  Private
router.post('/resources/save', authMiddleware, [
  body('skill').notEmpty().withMessage('Skill is required'),
  body('title').notEmpty().withMessage('Title is required'),
  body('url').isURL().withMessage('Valid URL is required'),
  body('description').notEmpty().withMessage('Description is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Validation failed', errors: errors.array() });
    }

    const { skill, title, url, description } = req.body;

    // Avoid duplicates by URL
    const updated = await User.findOneAndUpdate(
      { _id: req.user._id, 'savedResources.url': { $ne: url } },
      { $push: { savedResources: { skill, title, url, description } } },
      { new: true }
    ).select('savedResources');

    // If resource already exists (duplicate URL), return unchanged list
    const userDoc = updated || await User.findById(req.user._id).select('savedResources');

    res.status(200).json({ message: 'Saved resources updated', savedResources: userDoc.savedResources });
  } catch (error) {
    console.error('Save resource error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/user/resources/saved
// @desc    Get user's saved learning resources
// @access  Private
router.get('/resources/saved', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('savedResources');
    res.json({ savedResources: user?.savedResources || [] });
  } catch (error) {
    console.error('Get saved resources error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;



