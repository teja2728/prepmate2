const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const generateRoutes = require('./routes/generate');
const resourcesRoutes = require('./routes/resources');
const adminRoutes = require('./routes/admin');
const progressRoutes = require('./routes/progress');
const challengesRoutes = require('./routes/dailyChallengeRoutes');
const geminiRoutes = require('./routes/gemini');
const resumeImproverRoutes = require('./routes/resumeImprover');
const DailyChallenge = require('./models/DailyChallenge');
const User = require('./models/User');
const geminiService = require('./services/geminiService');

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true
}));

// Trust proxy for rate limiting
app.set('trust proxy', 1);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// MongoDB connection with retry/backoff and helpful logs
async function connectWithRetry(retries = 5, delayMs = 3000) {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error('MongoDB connection error: MONGO_URI is not set');
    process.exit(1);
  }
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await mongoose.connect(uri, {
        // options are safe across mongoose v6+ (ignored if not needed)
        serverSelectionTimeoutMS: 10000,
        socketTimeoutMS: 45000,
      });
      console.log('MongoDB connected successfully');
      return true;
    } catch (err) {
      console.error(`MongoDB connection attempt ${attempt} failed:`, err?.message || err);
      if (attempt < retries) {
        console.log(`Retrying MongoDB connection in ${Math.round(delayMs / 1000)}s...`);
        await new Promise(r => setTimeout(r, delayMs));
      } else {
        console.error('All MongoDB connection attempts failed. Check that your IP is whitelisted in Atlas and the URI is correct.');
        return false;
      }
    }
  }
}

mongoose.connection.on('error', (err) => {
  console.error('MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.warn('MongoDB disconnected');
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use("/api/generate", generateRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/resources', resourcesRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/challenges', challengesRoutes);
app.use('/api/gemini', geminiRoutes);
app.use('/api/resume-improver', resumeImproverRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// --- Daily Challenge Scheduler ---
async function startDailyChallengeScheduler() {
  const generateForAllUsers = async () => {
    try {
      const startOfDay = (d = new Date()) => { const x = new Date(d); x.setHours(0,0,0,0); return x; };
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
  };

  try {
    const cron = require('node-cron');
    // Run at midnight server time
    cron.schedule('0 0 * * *', generateForAllUsers);
    console.log('node-cron scheduled for daily challenges at 00:00');
  } catch (e) {
    console.warn('node-cron not installed; using 24h interval fallback');
    setInterval(generateForAllUsers, 24 * 60 * 60 * 1000);
  }

  // kick once at server start to ensure availability today
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
