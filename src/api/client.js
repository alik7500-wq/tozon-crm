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
  (response) => {
    const method = response.config?.method?.toLowerCase();
    const url = response.config?.url || '';
    const signing = method === 'post' && (/^\/deals\/[^/]+\/sign$/.test(url) || /^\/deals\/?$/.test(url));
    const payload = response.data;
    const deal = payload?.data?.deal || payload?.deal || payload?.data;
    if (signing && deal?.id && (deal.status === 'SIGNED' || /\/sign$/.test(url))) {
      setTimeout(() => window.dispatchEvent(new CustomEvent('tozon:contract-signed', { detail: deal })), 0);
    }
    return response.data;
  },
  (error) => {
    const message = error.response?.data?.message || error.message || 'Произошла ошибка при выполнении запроса';
    return Promise.reject(new Error(message));
  }
);
