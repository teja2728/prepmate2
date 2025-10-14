const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const DailyChallenge = require('../models/DailyChallenge');
const ResumeRecord = require('../models/ResumeRecord');
const User = require('../models/User');
const geminiService = require('../services/geminiService');

const router = express.Router();

function startOfDay(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

async function getLatestProfile(userId) {
  const latestResume = await ResumeRecord.findOne({ userId }).sort({ createdAt: -1 }).lean();
  const user = await User.findById(userId).lean();
  return {
    resumeText: latestResume?.resumeText || '',
    jdText: latestResume?.jdText || '',
    skills: latestResume?.parsedData?.skills || user?.skills || [],
    experienceLevel: user?.experienceLevel || 'Fresher',
  };
}

async function generateChallengeForUser(userId) {
  const profile = await getLatestProfile(userId);
  const gen = await geminiService.generateDailyChallengeFromProfile(profile);
  if (gen.success && gen.data && gen.data.question) {
    return gen.data;
  }
  // Lightweight randomized fallback (no large hardcoded text)
  const types = ['coding', 'aptitude', 'sql', 'interview'];
  const diffs = ['Easy', 'Medium', 'Hard'];
  const type = types[Math.floor(Math.random() * types.length)];
  const diff = diffs[Math.floor(Math.random() * diffs.length)];
  const skill = (profile.skills && profile.skills[0]) || 'problem-solving';
  const question = `Create a short ${type} exercise focusing on ${skill}. Keep it concise and practical.`;
  const answer = `Outline your approach and verify with at least one example.`;
  return { challengeType: type, difficulty: diff, question, answer };
}

// GET /api/challenges/today
router.get('/today', authMiddleware, async (req, res) => {
  try {
    const userId = req.user._id;
    const today = startOfDay();

    let challenge = await DailyChallenge.findOne({ userId, date: { $gte: today } }).sort({ date: -1 });

    if (!challenge) {
      const payload = await generateChallengeForUser(userId);
      challenge = await DailyChallenge.create({
        userId,
        date: new Date(),
        challengeType: payload.challengeType || 'general',
        difficulty: payload.difficulty || 'Medium',
        question: payload.question,
        answer: payload.answer,
        status: 'pending',
        generatedAt: new Date(),
      });
    }

    res.json({ challenge });
  } catch (err) {
    console.error('Daily challenge /today error:', err);
    res.status(500).json({ message: 'Failed to fetch today\'s challenge' });
  }
});

// POST /api/challenges/submit
router.post('/submit', authMiddleware, async (req, res) => {
  try {
    const userId = req.user._id;
    const { challengeId, status } = req.body; // 'completed' | 'skipped'
    if (!challengeId) return res.status(400).json({ message: 'challengeId is required' });

    const challenge = await DailyChallenge.findOne({ _id: challengeId, userId });
    if (!challenge) return res.status(404).json({ message: 'Challenge not found' });

    challenge.status = status === 'skipped' ? 'skipped' : 'completed';
    if (challenge.status === 'completed') challenge.completedAt = new Date();
    await challenge.save();

    res.json({ message: 'Challenge updated', challenge });
  } catch (err) {
    console.error('Daily challenge /submit error:', err);
    res.status(500).json({ message: 'Failed to update challenge' });
  }
});

// GET /api/challenges/history?days=7
router.get('/history', authMiddleware, async (req, res) => {
  try {
    const userId = req.user._id;
    const days = Math.max(1, Math.min(90, Number(req.query.days) || 7));
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    const history = await DailyChallenge.find({ userId, createdAt: { $gte: cutoff } })
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();

    res.json({ history });
  } catch (err) {
    console.error('Daily challenge /history error:', err);
    res.status(500).json({ message: 'Failed to fetch challenge history' });
  }
});

// POST /api/challenges/refresh (optional)
router.post('/refresh', authMiddleware, async (req, res) => {
  try {
    const userId = req.user._id;
    const payload = await generateChallengeForUser(userId);
    const challenge = await DailyChallenge.create({
      userId,
      date: new Date(),
      challengeType: payload.challengeType || 'general',
      difficulty: payload.difficulty || 'Medium',
      question: payload.question,
      answer: payload.answer,
      status: 'pending',
      generatedAt: new Date(),
    });
    res.json({ challenge });
  } catch (err) {
    console.error('Daily challenge /refresh error:', err);
    res.status(500).json({ message: 'Failed to refresh challenge' });
  }
});

module.exports = router;
