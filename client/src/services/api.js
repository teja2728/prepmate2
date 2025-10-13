import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 seconds timeout for Gemini API calls
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
  resources: (jdText) => api.post('/api/generate/resources', { jdText }),
};

// Admin API
export const adminAPI = {
  getLogs: (params) => api.get('/api/admin/llm-logs', { params }),
  getStats: () => api.get('/api/admin/stats'),
};

export default api;

