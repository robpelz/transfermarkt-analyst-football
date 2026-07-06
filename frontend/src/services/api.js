// src/services/api.js
import axios from 'axios';

// Environment Variable für Production/Development
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor für Logging (nur Dev)
if (import.meta.env.DEV) {
  api.interceptors.request.use(request => {
    console.log(`🚀 ${request.method?.toUpperCase()} ${request.url}`);
    return request;
  });
}

// Response Interceptor für Fehlerbehandlung
api.interceptors.response.use(
  response => response,
  error => {
    if (error.code === 'ECONNABORTED') {
      console.error('⏰ Request timeout');
    } else if (error.response?.status === 401) {
      // Redirect to login
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;