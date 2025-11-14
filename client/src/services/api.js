import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 180000, // 180 seconds timeout for Gemini API calls
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (email, password) => api.post('/api/auth/login', { email, password }),
  register: (name, email, password) => api.post('/api/auth/register', { name, email, password }),
  getMe: () => api.get('/api/auth/me'),
};

// Resume API
export const resumeAPI = {
  upload: (formData) => api.post('/api/user/resume', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  getAll: () => api.get('/api/user/resume'),
  getById: (id) => api.get(`/api/user/resume/${id}`),
  delete: (id) => api.delete(`/api/user/resume/${id}`),
};

// Generation API
export const generateAPI = {
  questions: (data) => api.post('/api/generate/questions', data),
  companyArchive: (companyName) => api.post('/api/generate/company-archive', { companyName }),
  // Accepts { resumeId } or { resumeText, jdText }
  resources: (payload) => api.post('/api/generate/resources', payload),
  resumeSuggestions: (payload) => api.post('/api/generate/resume-suggestions', payload),
  resumeImprover: (payload) => api.post('/api/generate/resume-improver', payload),
};

// Resume Improver API
export const resumeImproverAPI = {
  analyze: (payload = {}) => api.post('/api/resume-improver/analyze', payload),
  history: () => api.get('/api/resume-improver/history'),
  report: (id) => api.get(`/api/resume-improver/report/${id}`, { responseType: 'blob' }),
};

// Admin API
export const adminAPI = {
  getLogs: (params) => api.get('/api/admin/llm-logs', { params }),
  getStats: () => api.get('/api/admin/stats'),
};

// Resources API (new endpoints)
export const resourcesAPI = {
  save: ({ title, link, description }) => api.post('/api/resources/save', { title, link, description }),
  getSaved: () => api.get('/api/resources/saved'),
  remove: (id) => api.delete(`/api/resources/${id}`),
};

// Daily Challenges API
export const challengesAPI = {
  today: () => api.get('/api/challenges/today'),
  submit: (payload) => api.post('/api/challenges/submit', payload),
  history: (days = 7) => api.get('/api/challenges/history', { params: { days } }),
  refresh: () => api.post('/api/challenges/refresh'),
};

// Progress API
export const progressAPI = {
  mark: ({ skillName, resourceLink = null, isCompleted, skillTotal = null }) =>
    api.post('/api/progress/mark', { skillName, resourceLink, isCompleted, skillTotal }),
  getMine: () => api.get('/api/progress/me'),
};

// User API
export const userAPI = {
  updateProfile: (payload) => api.put('/api/user/profile/update', payload),
};

// Gemini API
export const geminiAPI = {
  analyzeProfile: (profile) => api.post('/api/gemini/profile/analyze', { profile }),
};

export default api;



