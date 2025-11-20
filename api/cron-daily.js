const { connectToDatabase } = require('../utils/db');
const { generateForAllUsers } = require('../jobs/generateDailyChallenges');

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ message: 'Method Not Allowed' });
  }
  try {
    await connectToDatabase();
    await generateForAllUsers();
    res.status(200).json({ status: 'ok' });
  } catch (err) {
    console.error('Cron daily error:', err);
    res.status(500).json({ message: 'Failed to run daily generator' });
  }
};
