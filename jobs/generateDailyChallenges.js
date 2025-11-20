const DailyChallenge = require('../models/DailyChallenge');
const User = require('../models/User');
const geminiService = require('../services/geminiService');

function startOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

async function generateForAllUsers() {
  try {
    const today = startOfDay();
    const users = await User.find({}, '_id skills').lean();
    for (const u of users) {
      const existing = await DailyChallenge.findOne({ userId: u._id, date: { $gte: today } });
      if (existing) continue;
      const gen = await geminiService.generateDailyChallenge(u);
      const payload = gen.success && gen.data ? gen.data : {
        challengeType: 'general', difficulty: 'Medium', question: 'Practice any one algorithm today and write a summary.', answer: 'Pick sorting/searching/DP and implement with tests.'
      };
      await DailyChallenge.create({
        userId: u._id,
        date: new Date(),
        challengeType: payload.challengeType || 'general',
        difficulty: payload.difficulty || 'Medium',
        question: payload.question,
        answer: payload.answer,
        status: 'pending',
        generatedAt: new Date(),
      });
    }
    console.log(`Daily challenges generated for ${users.length} users`);
  } catch (err) {
    console.error('Daily challenge generation error:', err);
  }
}

module.exports = { generateForAllUsers };
