import axios from 'axios';

// Get the base URL or use a default
const baseURL = import.meta.env.VITE_API_URL + "/api" || 'http://localhost:3000/api';


// Create axios instance with base URL
const api = axios.create({
  baseURL,
  timeout: 10000,
  // Enable sending cookies with requests
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - we no longer need token handling
api.interceptors.request.use(
  (config) => {
    // No need to set Authorization header - we'll use session cookies
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for handling errors
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Do not automatically redirect on 401
    // Let the calling code handle the error and do redirects where appropriate
    return Promise.reject(error);
  }
);

export default api; 