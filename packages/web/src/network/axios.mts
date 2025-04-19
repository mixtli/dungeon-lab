import axios from 'axios';

// Create an instance of axios with default config
// Use type assertion for Vite's import.meta.env
const baseURL = (import.meta.env?.VITE_API_URL as string | undefined) || 'http://localhost:3000';

// Create axios instance with base URL and session cookie support
const api = axios.create({
  baseURL,
  timeout: 10000,
  withCredentials: true,  // Enable sending cookies with requests
  headers: {
    'Content-Type': 'application/json',
  },
});

export default api; 