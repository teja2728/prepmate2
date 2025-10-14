const request = require('supertest');
const app = require('../server');
const User = require('../models/User');
const ResumeRecord = require('../models/ResumeRecord');
const mongoose = require('mongoose');

describe('Resume Endpoints', () => {
  let token;
  let userId;

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
    userId = registerResponse.body.user.id;
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  describe('POST /api/user/resume', () => {
    it('should upload resume and JD successfully', async () => {
      const resumeData = {
        resumeText: 'John Doe\nSoftware Engineer\nSkills: JavaScript, React, Node.js',
        jdText: 'We are looking for a Software Engineer with experience in JavaScript and React.'
      };

      const response = await request(app)
        .post('/api/user/resume')
        .set('Authorization', `Bearer ${token}`)
        .send(resumeData)
        .expect(201);

      expect(response.body).toHaveProperty('resumeId');
      expect(response.body).toHaveProperty('parsedData');
    });

    it('should require authentication', async () => {
      const resumeData = {
        resumeText: 'Test resume',
        jdText: 'Test JD'
      };

      await request(app)
        .post('/api/user/resume')
        .send(resumeData)
        .expect(401);
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/user/resume')
        .set('Authorization', `Bearer ${token}`)
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('errors');
    });
  });

  describe('GET /api/user/resume', () => {
    beforeEach(async () => {
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

      await request(app)
        .post('/api/user/resume')
        .set('Authorization', `Bearer ${token}`)
        .send(resumeData);
    });

    it('should return user resumes', async () => {
      const response = await request(app)
        .get('/api/user/resume')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toHaveProperty('resumes');
      expect(Array.isArray(response.body.resumes)).toBe(true);
      expect(response.body.resumes.length).toBeGreaterThan(0);
    });

    it('should require authentication', async () => {
      await request(app)
        .get('/api/user/resume')
        .expect(401);
    });
  });

  describe('GET /api/user/resume/:id', () => {
    let resumeId;

    beforeEach(async () => {
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

      const response = await request(app)
        .post('/api/user/resume')
        .set('Authorization', `Bearer ${token}`)
        .send(resumeData);

      resumeId = response.body.resumeId;
    });

    it('should return specific resume', async () => {
      const response = await request(app)
        .get(`/api/user/resume/${resumeId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toHaveProperty('resume');
      expect(response.body.resume.id).toBe(resumeId);
    });

    it('should return 404 for non-existent resume', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      
      await request(app)
        .get(`/api/user/resume/${fakeId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
    });

    it('should require authentication', async () => {
      await request(app)
        .get(`/api/user/resume/${resumeId}`)
        .expect(401);
    });
  });
});



