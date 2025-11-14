const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const geminiService = require('../services/geminiService');
const LLMLog = require('../models/LLMLog');

const router = express.Router();

router.post('/analyze-progress', authMiddleware, async (req, res) => {
  try {
    const payload = req.body || {};
    const systemPrompt = 'Return ONLY valid JSON with this exact schema: { "insights": ["", "", ""] }';
    const userPrompt = `Analyze this student's performance metrics and generate 3 short, actionable bullet insights:\n${JSON.stringify(payload)}`;

    const llm = await geminiService.generateContent(userPrompt, systemPrompt);
    let insights = [];
    if (llm && llm.success && llm.data) {
      let raw = llm.data;
      if (typeof raw !== 'string') {
        const obj = raw;
        if (obj && Array.isArray(obj.insights)) insights = obj.insights;
      } else {
        raw = raw.replace(/```json\s*/gi, '').replace(/```/g, '');
        raw = raw.replace(/[\u2018\u2019\u201C\u201D]/g, '"');
        raw = raw.replace(/,(\s*[}\]])/g, '$1');
        try {
          const obj = JSON.parse(raw);
          if (obj && Array.isArray(obj.insights)) insights = obj.insights;
        } catch (_) {
          // fallback: split lines
          insights = raw.split('\n').map(s => s.trim()).filter(Boolean).slice(0, 3);
        }
      }
    }

    if (!Array.isArray(insights) || insights.length === 0) {
      insights = [
        'You have a consistent upward trend. Keep reinforcing weaker skills.',
        'Resume alignment is improving. Add concrete metrics to experience.',
        'Maintain daily practice to extend your streak and retention.'
      ];
    }

    try {
      await LLMLog.create({
        userId: req.user._id,
        endpoint: '/api/gemini/analyze-progress',
        promptType: 'progress_insights',
        requestData: geminiService.sanitizeForLogging(payload),
        responseData: { insights },
        processingTime: llm?.processingTime || 0,
        success: true,
        geminiRequestId: llm?.requestId || null,
      });
    } catch (_) {}

    res.json({ insights, processingTime: llm?.processingTime || 0 });
  } catch (error) {
    console.error('Gemini analyze-progress error:', error);
    res.status(500).json({ message: 'Failed to analyze progress' });
  }
});

module.exports = router;
// Profile analysis endpoint
// POST /api/gemini/profile/analyze
router.post('/profile/analyze', authMiddleware, async (req, res) => {
  try {
    const profile = req.body?.profile || {};
    const systemPrompt = 'Return ONLY valid JSON with this exact schema: { "suggestions": ["", "", ""] }';
    const userPrompt = `Analyze this student profile and recommend 3 career improvements (skills or actions) as short bullet points. Keep each under 16 words.\n${JSON.stringify(profile)}`;
    const llm = await geminiService.generateContent(userPrompt, systemPrompt);
    let suggestions = [];
    if (llm?.success && llm?.data) {
      let raw = llm.data;
      if (typeof raw !== 'string') {
        const obj = raw;
        if (obj && Array.isArray(obj.suggestions)) suggestions = obj.suggestions;
      } else {
        raw = raw.replace(/```json\s*/gi, '').replace(/```/g, '');
        raw = raw.replace(/[\u2018\u2019\u201C\u201D]/g, '"');
        raw = raw.replace(/,(\s*[}\]])/g, '$1');
        try {
          const obj = JSON.parse(raw);
          if (obj && Array.isArray(obj.suggestions)) suggestions = obj.suggestions;
        } catch (_) {
          suggestions = raw.split('\n').map(s => s.replace(/^[-*]\s*/, '').trim()).filter(Boolean).slice(0,3);
        }
      }
    }
    if (!Array.isArray(suggestions) || suggestions.length === 0) {
      suggestions = [
        'Add STAR-format bullets to projects with metrics.',
        'Target 2 trending frameworks aligned to your goal.',
        'Refine LinkedIn headline to your target role.',
      ];
    }
    try {
      await LLMLog.create({
        userId: req.user._id,
        endpoint: '/api/gemini/profile/analyze',
        promptType: 'profile_insights',
        requestData: geminiService.sanitizeForLogging(profile),
        responseData: { suggestions },
        processingTime: llm?.processingTime || 0,
        success: true,
        geminiRequestId: llm?.requestId || null,
      });
    } catch (_) {}
    res.json({ suggestions, processingTime: llm?.processingTime || 0 });
  } catch (error) {
    console.error('Gemini profile analyze error:', error);
    res.status(500).json({ message: 'Failed to analyze profile' });
  }
});
