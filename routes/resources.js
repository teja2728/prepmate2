const express = require('express');
const { body, validationResult } = require('express-validator');
const mongoose = require('mongoose');
const { authMiddleware } = require('../middleware/auth');
const SavedResource = require('../models/SavedResource');

const router = express.Router();

// POST /api/resources/save -> Save a resource for a user
router.post('/save', authMiddleware, [
  body('title').notEmpty().withMessage('Title is required'),
  body('link').isURL().withMessage('Valid link is required'),
  body('description').notEmpty().withMessage('Description is required'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Validation failed', errors: errors.array() });
    }

    const { title, link, description } = req.body;

    // Upsert to avoid duplicates per user+link
    const doc = await SavedResource.findOneAndUpdate(
      { userId: req.user._id, link },
      { $setOnInsert: { title, link, description, savedAt: new Date() } },
      { upsert: true, new: true }
    );

    res.status(200).json({ message: 'Resource saved', resource: doc });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(200).json({ message: 'Resource already saved' });
    }
    console.error('Save resource error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/resources/saved -> Get all saved resources for current user
router.get('/saved', authMiddleware, async (req, res) => {
  try {
    const items = await SavedResource.find({ userId: req.user._id }).sort({ savedAt: -1 });
    res.json({ resources: items });
  } catch (error) {
    console.error('Get saved resources error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/resources/:id -> Delete a saved resource (optional)
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid id' });
    }

    const deleted = await SavedResource.findOneAndDelete({ _id: id, userId: req.user._id });
    if (!deleted) {
      return res.status(404).json({ message: 'Resource not found' });
    }

    res.json({ message: 'Resource removed' });
  } catch (error) {
    console.error('Delete saved resource error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
