const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const DailyChallenge = require('../models/DailyChallenge');
const User = require('../models/User');
const geminiService = require('../services/geminiService');

const router = express.Router();

function startOfDay(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

// 🧠 Helper to create dynamic prompt based on user data
function buildDynamicPrompt(user) {
  const resume = user.resumeText || "General software engineering resume";
  const jd = user.jobDescriptionText || "Generic placement-oriented job description";
  const skills = Array.isArray(user.skills) && user.skills.length > 0 ? user.skills.join(', ') : "programming, problem-solving";
  const experience = user.experienceLevel || "Intermediate";

  return `
  You are an AI placement coach generating a daily personalized interview challenge.

  Consider this user's background:
  - Name: ${user.name || "User"}
  - Skills: ${skills}
  - Experience Level: ${experience}
  - Resume Summary: ${resume}
  - Target Job Description: ${jd}

  Generate ONE challenge that best suits their profile.
  The challenge could be coding, aptitude, behavioral, or conceptual.
  Choose intelligently based on resume and JD.

  Respond ONLY in valid JSON with this structure:
  {
    "challengeType": "coding" | "aptitude" | "behavioral" | "conceptual",
    "difficulty": "Easy" | "Medium" | "Hard",
    "question": "string",
    "answer": "string"
  }
  `;
}

// 🧩 GET /api/challenges/today
router.get('/today', authMiddleware, async (req, res) => {
  try {
    const userId = req.user._id;
    const today = startOfDay();

    // Check if today’s challenge already exists
    let challenge = await DailyChallenge.findOne({ userId, date: { $gte: today } }).sort({ date: -1 });

    if (!challenge) {
      const user = await User.findById(userId).lean();

      // ✨ Build dynamic prompt using resume + JD
      const prompt = buildDynamicPrompt(user);

      // Call Gemini to generate challenge
      const gen = await geminiService.generate(prompt);

      let payload = null;
      try {
        payload = gen?.data ? JSON.parse(gen.data) : null;
      } catch (err) {
        console.warn("Gemini output not valid JSON. Falling back...");
      }

      // 🎯 Fallback if Gemini fails
      if (!payload || !payload.question) {
        const sampleChallenges = [
          {
            challengeType: "coding",
            difficulty: "Medium",
            question: "Implement a function to remove duplicates from an array.",
            answer: "Use a Set or filter method to remove duplicates."
          },
          {
            challengeType: "aptitude",
            difficulty: "Easy",
            question: "If a train travels 60 km in 1.5 hours, what’s its speed?",
            answer: "Speed = Distance / Time = 60 / 1.5 = 40 km/h"
          },
          {
            challengeType: "behavioral",
            difficulty: "Medium",
            question: "Describe a time you overcame a team challenge.",
            answer: "Explain context, your role, action, and result."
          }
        ];
        payload = sampleChallenges[Math.floor(Math.random() * sampleChallenges.length)];
      }

      // ✅ Store in DB
      challenge = await DailyChallenge.create({
        userId,
        date: new Date(),
        challengeType: payload.challengeType,
        difficulty: payload.difficulty,
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

// ✅ POST /api/challenges/submit
router.post('/submit', authMiddleware, async (req, res) => {
  try {
    const userId = req.user._id;
    const { challengeId, status } = req.body; // completed | skipped
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

// 📜 GET /api/challenges/history?days=7
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

module.exports = router;
