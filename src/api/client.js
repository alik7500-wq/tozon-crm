import axios from 'axios';

const rawBaseUrl = import.meta.env.VITE_API_URL || 'https://tozon-backend.onrender.com/api';
const baseURL = rawBaseUrl.endsWith('/api') ? rawBaseUrl : `${rawBaseUrl.replace(/\/$/, '')}/api`;

export const api = axios.create({
  baseURL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Response interceptor for handling common errors
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const message = error.response?.data?.message || error.message || 'Произошла ошибка при выполнении запроса';
    return Promise.reject(new Error(message));
  }
);
