import axios from 'axios';

const PRODUCTION_API_URL = 'https://resume-analyzer-api-12if.onrender.com/api';

// Get backend URL from environment or use relative path for dev
const getBackendURL = () => {
  // In development, use relative path (vite proxy handles it)
  if (import.meta.env.DEV) {
    return '/api';
  }
  // In production, use environment variable or construct from window.location
  return import.meta.env.VITE_API_URL || PRODUCTION_API_URL;
};

const api = axios.create({
  baseURL: getBackendURL(),
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 responses
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
