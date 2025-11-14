const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  college: { type: String, default: '' },
  degree: { type: String, default: '' },
  year: { type: String, default: '' },
  skills: {
    type: [String],
    default: []
  },
  goal: { type: String, default: '' },
  linkedin: { type: String, default: '' },
  github: { type: String, default: '' },
  profilePic: { type: String, default: '' },
  savedResources: [{
    skill: { type: String, required: true },
    title: { type: String, required: true },
    url: { type: String, required: true },
    description: { type: String, required: true },
    savedAt: { type: Date, default: Date.now }
  }],
  improvedResume: {
    summary: { type: String, default: '' },
    overallScore: { type: Number, default: 0 },
    recommendations: [{
      section: String,
      current: String,
      improved: String,
      confidence: Number,
      reason: String,
    }],
    improvedResume: { type: String, default: '' },
    updatedAt: { type: Date, default: Date.now }
  }
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Remove password from JSON output
userSchema.methods.toJSON = function() {
  const user = this.toObject();
  delete user.password;
  return user;
};

module.exports = mongoose.model('User', userSchema);
