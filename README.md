# Prepmate - MERN Stack Placement Trainer

A comprehensive placement training web application built with MongoDB, Express, React, and Node.js, powered exclusively by Google's Gemini API for all language processing and content generation.

## 🚀 Features

- **User Authentication**: Secure JWT-based registration and login
- **Resume & Job Description Upload**: Single-page form for uploading and storing resume and JD data
- **AI-Powered Question Generation**: Generate ~10 tailored interview questions based on resume and JD
- **Company-Specific Archives**: Retrieve previous-year interview questions round-wise for any company
- **Skill-Based Resource Discovery**: Curated learning resources for every skill in the job description
- **Secure File Handling**: MongoDB GridFS for secure file storage
- **Real-time Parsing**: Live preview of resume parsing results
- **Admin Dashboard**: LLM interaction logs and system statistics

## 🛠 Tech Stack

- **Backend**: Node.js, Express.js, MongoDB with Mongoose
- **Frontend**: React.js with modern hooks and routing
- **AI Engine**: Google Gemini API (exclusive LLM)
- **Authentication**: JWT tokens
- **File Storage**: MongoDB GridFS
- **Testing**: Jest for unit and integration tests
- **Styling**: Tailwind CSS
- **UI Components**: Lucide React icons

## 📋 Prerequisites

- Node.js (v16 or higher)
- MongoDB (local or cloud instance)
- Google Gemini API key
- Git

## 🔧 Installation

1. **Clone the repository:**
```bash
git clone <repository-url>
cd prepmate
```

2. **Install backend dependencies:**
```bash
npm install
```

3. **Install frontend dependencies:**
```bash
cd client
npm install
cd ..
```

4. **Create environment file:**
```bash
# Linux/Mac
cp env.example .env

# Windows
copy env.example .env
```

5. **Configure environment variables in `.env`:**
```env
MONGO_URI=mongodb://localhost:27017/prepmate
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
GEMINI_API_KEY=your-gemini-api-key-here
PORT=5000
NODE_ENV=development
REACT_APP_URL=
BACKEND_URL=http://localhost:5000
FRONTEND_URL=http://localhost:3000
```

6. **Start MongoDB:**
```bash
# If using local MongoDB
mongod

# Or use MongoDB Atlas (cloud)
# Update MONGO_URI in .env with your Atlas connection string
```

## 🚀 Running the Application

### Quick Setup (Windows)
```cmd
# Run the setup script
setup.bat

# Then start the application
npm run dev:full
```

### Development Mode (Full Stack)
```bash
npm run dev:full
```
This starts both backend (port 5000) and frontend (port 3000) concurrently.

### Backend Only
```bash
npm run dev
```

### Frontend Only
```bash
npm run client
```

### Production
```bash
npm run client:build
npm start
```

## 📚 API Documentation

### Authentication Endpoints
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user info

### Resume & Job Description Endpoints
- `POST /api/user/resume` - Upload resume and JD (multipart/form-data)
- `GET /api/user/resume` - Get user's resume/JD list
- `GET /api/user/resume/:id` - Get specific resume/JD
- `DELETE /api/user/resume/:id` - Delete resume/JD

### AI Generation Endpoints
- `POST /api/generate/questions` - Generate interview questions
- `POST /api/generate/company-archive` - Get company-specific questions
- `POST /api/generate/resources` - Get skill-based resources

### Admin Endpoints
- `GET /api/admin/llm-logs` - View LLM interaction logs (admin only)
- `GET /api/admin/stats` - Get system statistics (admin only)

## 🤖 Gemini API Usage

The application uses Google's Gemini API exclusively for:
- Resume and JD parsing into structured JSON
- Interview question generation (10 questions with difficulty levels)
- Company-specific question retrieval with confidence scores
- Skill-based resource discovery with learning materials

### Prompt Templates

All Gemini interactions use structured prompt templates for consistency:

1. **Resume Parsing**: Extracts name, email, skills, experience, education, projects
2. **Question Generation**: Creates behavioral, technical, coding, design, and aptitude questions
3. **Company Archive**: Retrieves round-wise interview questions with source attribution
4. **Resource Discovery**: Finds learning materials for each skill in the JD

### Example Gemini Prompts

```javascript
// Resume Parsing
System: You are an extraction agent. Output only JSON matching the schema...
User: Here is the resume text: <<<RESUME_TEXT>>>...

// Question Generation  
System: You are an expert placement trainer. Return a JSON array of 10 question objects...
User: Use this resume JSON: <<<RESUME_JSON>>> and this JD text: <<<JD_TEXT>>>...
```

## 🧪 Testing

### Run All Tests
```bash
npm test
```

### Run Tests in Watch Mode
```bash
npm run test:watch
```

### Test Coverage
- Authentication endpoints (register, login, JWT validation)
- Resume management (upload, retrieve, delete)
- AI generation endpoints (questions, company archive, resources)
- Error handling and validation

## 🔒 Security Features

- JWT-based authentication with 7-day expiration
- Input validation and sanitization using express-validator
- Rate limiting (100 requests per 15 minutes per IP)
- Secure file upload handling with type validation
- PII protection in Gemini prompts (passwords excluded)
- Helmet.js for security headers
- CORS configuration for frontend communication

## 📁 File Storage

Resumes are stored using MongoDB GridFS for:
- Secure file storage with metadata
- Efficient retrieval and streaming
- Scalability and backup
- File type validation (TXT, PDF, DOC, DOCX)

## 🌐 Frontend Features

- **Responsive Design**: Mobile-first approach with Tailwind CSS
- **Modern UI**: Clean, professional interface with loading states
- **Real-time Feedback**: Toast notifications for user actions
- **Protected Routes**: JWT-based route protection
- **File Upload**: Drag-and-drop file upload with preview
- **Tabbed Interface**: Organized results display (Questions, Company Archive, Resources)

## 📊 Database Schema

### User Model
```javascript
{
  name: String,
  email: String (unique),
  password: String (hashed),
  role: String (user/admin),
  createdAt: Date
}
```

### ResumeRecord Model
```javascript
{
  userId: ObjectId,
  resumeText: String,
  resumeFileRef: ObjectId,
  jdText: String,
  parsedData: Object,
  metadata: Object,
  createdAt: Date
}
```

### QuestionRecord Model
```javascript
{
  userId: ObjectId,
  resumeId: ObjectId,
  generatedQuestions: [{
    question: String,
    type: String,
    difficulty: String,
    rationale: String,
    relatedSkills: [String]
  }],
  createdAt: Date
}
```

## 🚀 Deployment

### Environment Setup
1. Set production environment variables
2. Configure MongoDB Atlas or production MongoDB
3. Set up Google Gemini API key
4. Configure CORS for production domain

### CI/CD Environment Variables
Set these in your deployment provider (e.g., Vercel → Project Settings → Environment Variables):

- `REACT_APP_URL`
  - Leave empty for same-origin (recommended on Vercel where frontend and API Functions share a domain)
  - Or set to your API base URL (e.g., `https://api.myapp.com`) if frontend and backend are on different domains
- `BACKEND_URL`
  - Public URL of your backend (e.g., `https://myapp.vercel.app` or `https://api.myapp.com`)
  - Optional utility for server-side link generation/logging
- `FRONTEND_URL`
  - The exact frontend origin allowed by CORS (e.g., `https://myapp.vercel.app` or `https://myapp.com`)
  - If multiple origins, consider a comma-separated list and custom CORS logic

### Build and Deploy
```bash
# Build frontend
npm run client:build

# Start production server
npm start
```

### Docker Deployment (Optional)
```dockerfile
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN cd client && npm ci && npm run build
EXPOSE 5000
CMD ["npm", "start"]
```

## 📝 Postman Collection

Import the provided Postman collection (`postman/Prepmate_API.postman_collection.json`) to test all API endpoints with sample data.

## 🔧 Configuration

### Environment Variables
- `MONGO_URI`: MongoDB connection string
- `JWT_SECRET`: Secret key for JWT token signing
- `GEMINI_API_KEY`: Google Gemini API key
- `PORT`: Server port (default: 5000)
- `NODE_ENV`: Environment (development/production)
- `REACT_APP_URL`: Frontend API base URL embedded at build time. Leave empty for same-origin; set full API base if API is on another domain.
- `BACKEND_URL`: Public URL of the backend (default http://localhost:5000). Optional helper for server-generated links.
- `FRONTEND_URL`: Frontend URL allowed in CORS (default http://localhost:3000). Set to production domain when deployed.

### Gemini API Configuration
- Model: `gemini-pro`
- Temperature: Default (adjustable in service)
- Timeout: 30 seconds
- Rate limiting: Respects Gemini API limits

## 🐛 Troubleshooting

### Common Issues

1. **MongoDB Connection Error**
   - Check MongoDB is running: `mongod` (local) or verify Atlas connection
   - Verify MONGO_URI in .env file
   - Check network connectivity
   - For Windows: Install MongoDB Community Server or use MongoDB Atlas

2. **Gemini API Error**
   - Verify GEMINI_API_KEY is correct in .env
   - Get API key from [Google AI Studio](https://makersuite.google.com/app/apikey)
   - Check API quota and limits
   - Ensure internet connectivity

3. **JWT Token Issues**
   - Check JWT_SECRET is set in .env
   - Verify token expiration (7 days)
   - Clear browser localStorage

4. **File Upload Issues**
   - Check file size limits (5MB)
   - Verify file type support (TXT, PDF, DOC, DOCX)
   - Check multer configuration

5. **Deprecated Package Warnings**
   - These are common and don't affect functionality
   - Updated packages: multer@2.x, supertest@7.x
   - React-scripts vulnerabilities are known and don't impact security

6. **Windows-Specific Issues**
   - Use `copy` instead of `cp` for file operations
   - Use `setup.bat` for automated setup
   - Ensure Node.js and npm are installed
   - Use PowerShell or Command Prompt

### Getting Started Checklist

- [ ] Node.js (v16+) installed
- [ ] MongoDB running (local or Atlas)
- [ ] Gemini API key obtained
- [ ] .env file configured
- [ ] Dependencies installed (`npm install`)
- [ ] Client dependencies installed (`cd client && npm install`)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Follow existing code style
- Add tests for new functionality
- Update documentation
- Use meaningful commit messages

## 📄 License

MIT License - see LICENSE file for details

## 🙏 Acknowledgments

- Google Gemini API for AI capabilities
- MongoDB for data storage
- React and Express.js communities
- Tailwind CSS for styling framework
