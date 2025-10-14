const express = require('express');
const { body, validationResult } = require('express-validator');
const { authMiddleware } = require('../middleware/auth');
const UserProgress = require('../models/UserProgress');

const router = express.Router();

// POST /api/progress/mark
// Marks or unmarks a resource completion for a skill
router.post('/mark', authMiddleware, [
  body('skillName').notEmpty().withMessage('skillName is required'),
  body('resourceLink').optional().isString(),
  body('isCompleted').isBoolean().withMessage('isCompleted must be boolean'),
  body('skillTotal').optional().isInt({ min: 0 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Validation failed', errors: errors.array() });
    }

    const { skillName, resourceLink = null, isCompleted, skillTotal = null } = req.body;

    const update = {
      isCompleted,
      completedAt: isCompleted ? new Date() : null,
    };
    if (skillTotal !== null) update.skillTotal = skillTotal;

    const doc = await UserProgress.findOneAndUpdate(
      { userId: req.user._id, skillName, resourceLink },
      { $set: update, $setOnInsert: { userId: req.user._id, skillName, resourceLink } },
      { upsert: true, new: true }
    );

    // Optionally sync skillTotal across entries of the same skill
    if (skillTotal !== null) {
      await UserProgress.updateMany(
        { userId: req.user._id, skillName },
        { $set: { skillTotal } }
      );
    }

    res.json({ message: 'Progress updated', progress: doc });
  } catch (error) {
    console.error('Progress mark error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/progress/me
// Returns all progress entries for the current user
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const entries = await UserProgress.find({ userId: req.user._id }).sort({ updatedAt: -1 });
    res.json({ progress: entries });
  } catch (error) {
    console.error('Progress fetch error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
