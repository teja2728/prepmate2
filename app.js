const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();
const { FRONTEND_URL } = require('./config');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const generateRoutes = require('./routes/generate');
const resourcesRoutes = require('./routes/resources');
const adminRoutes = require('./routes/admin');
const progressRoutes = require('./routes/progress');
const challengesRoutes = require('./routes/dailyChallengeRoutes');
const geminiRoutes = require('./routes/gemini');
const resumeImproverRoutes = require('./routes/resumeImprover');

const app = express();

app.use(helmet());
app.use(cors({
  origin: FRONTEND_URL === '' ? true : FRONTEND_URL,
  credentials: true
}));

app.set('trust proxy', 1);

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/generate', generateRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/resources', resourcesRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/challenges', challengesRoutes);
app.use('/api/gemini', geminiRoutes);
app.use('/api/resume-improver', resumeImproverRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

app.use('*', (req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

module.exports = app;
