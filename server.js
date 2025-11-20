require('dotenv').config();
const app = require('./app');
const { connectWithRetry } = require('./utils/db');
const { generateForAllUsers } = require('./jobs/generateDailyChallenges');

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// --- Daily Challenge Scheduler (local dev / long-running environments) ---
async function startDailyChallengeScheduler() {
  try {
    const cron = require('node-cron');
    // Run at midnight server time
    cron.schedule('0 0 * * *', generateForAllUsers);
    console.log('node-cron scheduled for daily challenges at 00:00');
  } catch (e) {
    console.warn('node-cron not installed; using 24h interval fallback');
    setInterval(generateForAllUsers, 24 * 60 * 60 * 1000);
  }

  // Kick once at server start to ensure availability today
  generateForAllUsers();
}

// Boot sequence: connect DB, then start scheduler
(async () => {
  const ok = await connectWithRetry();
  if (ok) {
    startDailyChallengeScheduler();
  } else {
    console.warn('Skipping daily challenge scheduler startup because MongoDB is not connected.');
  }
})();

module.exports = app;
