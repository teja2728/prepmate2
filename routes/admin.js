const express = require('express');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');
const LLMLog = require('../models/LLMLog');

const router = express.Router();

// @route   GET /api/admin/llm-logs
// @desc    Get LLM interaction logs (admin only)
// @access  Private (Admin)
router.get('/llm-logs', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { page = 1, limit = 50, endpoint, userId } = req.query;
    
    const query = {};
    if (endpoint) query.endpoint = endpoint;
    if (userId) query.userId = userId;

    const logs = await LLMLog.find(query)
      .populate('userId', 'name email')
      .sort({ timestamp: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .select('-requestData.password -requestData.resumeText');

    const total = await LLMLog.countDocuments(query);

    res.json({
      logs: logs.map(log => ({
        id: log._id,
        userId: log.userId ? {
          id: log.userId._id,
          name: log.userId.name,
          email: log.userId.email
        } : null,
        endpoint: log.endpoint,
        promptType: log.promptType,
        requestData: log.requestData,
        responseData: log.responseData,
        processingTime: log.processingTime,
        success: log.success,
        errorMessage: log.errorMessage,
        geminiRequestId: log.geminiRequestId,
        timestamp: log.timestamp
      })),
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    console.error('Get LLM logs error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/admin/stats
// @desc    Get system statistics (admin only)
// @access  Private (Admin)
router.get('/stats', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const User = require('../models/User');
    const ResumeRecord = require('../models/ResumeRecord');
    const QuestionRecord = require('../models/QuestionRecord');
    const CompanyArchiveRecord = require('../models/CompanyArchiveRecord');

    const [
      totalUsers,
      totalResumes,
      totalQuestions,
      totalCompanyArchives,
      recentLogs,
      errorLogs
    ] = await Promise.all([
      User.countDocuments(),
      ResumeRecord.countDocuments(),
      QuestionRecord.countDocuments(),
      CompanyArchiveRecord.countDocuments(),
      LLMLog.countDocuments({ timestamp: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } }),
      LLMLog.countDocuments({ success: false, timestamp: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } })
    ]);

    res.json({
      stats: {
        totalUsers,
        totalResumes,
        totalQuestions,
        totalCompanyArchives,
        recentLogs24h: recentLogs,
        errorLogs24h: errorLogs,
        successRate: recentLogs > 0 ? ((recentLogs - errorLogs) / recentLogs * 100).toFixed(2) : 100
      }
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

