const request = require('supertest');
const app = require('../server');
const User = require('../models/User');
const ResumeRecord = require('../models/ResumeRecord');
const mongoose = require('mongoose');

// Mock Gemini service
jest.mock('../services/geminiService', () => ({
  parseResumeAndJD: jest.fn().mockResolvedValue({
    success: true,
    data: JSON.stringify({
      name: 'Test User',
      email: 'test@example.com',
      skills: ['JavaScript', 'React', 'Node.js'],
      experience: [{
        company: 'Test Company',
        title: 'Software Engineer',
        start: '2020',
        end: '2023',
        bullets: ['Developed web applications']
      }],
      education: [{
        institution: 'Test University',
        degree: 'Computer Science',
        year: '2020'
      }],
      projects: [{
        name: 'Test Project',
        summary: 'A test project'
      }]
    }),
    processingTime: 1000,
    requestId: 'test-request-id'
  }),
  generateInterviewQuestions: jest.fn().mockResolvedValue({
    success: true,
    data: JSON.stringify([
      {
        question: 'Tell me about your experience with React',
        type: 'technical',
        difficulty: 'medium',
        rationale: 'Tests React knowledge',
        relatedSkills: ['React', 'JavaScript']
      }
    ]),
    processingTime: 2000,
    requestId: 'test-request-id'
  }),
  getCompanyQuestions: jest.fn().mockResolvedValue({
    success: true,
    data: JSON.stringify({
      company: 'Google',
      rounds: [{
        roundName: 'Technical Round',
        questions: [{
          question: 'What is the time complexity of binary search?',
          source: 'inferred',
          confidence: 0.8
        }]
      }],
      note: 'Sample questions'
    }),
    processingTime: 1500,
    requestId: 'test-request-id'
  }),
  getResourcesForJD: jest.fn().mockResolvedValue({
    success: true,
    data: JSON.stringify([
      {
        skill: 'JavaScript',
        resources: [{
          title: 'JavaScript MDN Docs',
          url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript',
          type: 'doc',
          summary: 'Official JavaScript documentation',
          estimatedTime: '10h'
        }]
      }
    ]),
    processingTime: 1200,
    requestId: 'test-request-id'
  })
}));

describe('Generation Endpoints', () => {
  let token;
  let resumeId;

  beforeEach(async () => {
    // Clear collections
    await User.deleteMany({});
    await ResumeRecord.deleteMany({});

    // Create a test user and get token
    const userData = {
      name: 'Test User',
      email: 'test@example.com',
      password: 'password123'
    };

    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send(userData);

    token = registerResponse.body.token;

    // Create a test resume
    const resumeData = {
      resumeText: 'Test resume content',
      jdText: 'Test job description',
      parsedData: {
        name: 'Test User',
        email: 'test@example.com',
        skills: ['JavaScript', 'React']
      }
    };

    const resumeResponse = await request(app)
      .post('/api/user/resume')
      .set('Authorization', `Bearer ${token}`)
      .send(resumeData);

    resumeId = resumeResponse.body.resumeId;
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  describe('POST /api/generate/questions', () => {
    it('should generate questions successfully', async () => {
      const response = await request(app)
        .post('/api/generate/questions')
        .set('Authorization', `Bearer ${token}`)
        .send({ resumeId })
        .expect(200);

      expect(response.body).toHaveProperty('questions');
      expect(response.body).toHaveProperty('processingTime');
      expect(Array.isArray(response.body.questions)).toBe(true);
    });

    it('should require authentication', async () => {
      await request(app)
        .post('/api/generate/questions')
        .send({ resumeId })
        .expect(401);
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/generate/questions')
        .set('Authorization', `Bearer ${token}`)
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('errors');
    });
  });

  describe('POST /api/generate/company-archive', () => {
    it('should fetch company archive successfully', async () => {
      const response = await request(app)
        .post('/api/generate/company-archive')
        .set('Authorization', `Bearer ${token}`)
        .send({ companyName: 'Google' })
        .expect(200);

      expect(response.body).toHaveProperty('company');
      expect(response.body).toHaveProperty('rounds');
      expect(response.body).toHaveProperty('processingTime');
    });

    it('should require authentication', async () => {
      await request(app)
        .post('/api/generate/company-archive')
        .send({ companyName: 'Google' })
        .expect(401);
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/generate/company-archive')
        .set('Authorization', `Bearer ${token}`)
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('errors');
    });
  });

  describe('POST /api/generate/resources', () => {
    it('should generate resources successfully', async () => {
      const response = await request(app)
        .post('/api/generate/resources')
        .set('Authorization', `Bearer ${token}`)
        .send({ jdText: 'We need JavaScript and React skills' })
        .expect(200);

      expect(response.body).toHaveProperty('skills');
      expect(response.body).toHaveProperty('processingTime');
      expect(Array.isArray(response.body.skills)).toBe(true);
    });

    it('should require authentication', async () => {
      await request(app)
        .post('/api/generate/resources')
        .send({ jdText: 'Test JD' })
        .expect(401);
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/generate/resources')
        .set('Authorization', `Bearer ${token}`)
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('errors');
    });
  });
});

