import axios from 'axios';
import {environment} from './environment';

const baseURL = environment.apiUrl;

export const api = axios.create({
  baseURL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Dropdowns only need employee names, not account details or permissions.
api.interceptors.request.use(config => {
  if (config.method === 'get' && config.url === '/users' &&
      typeof window !== 'undefined' && window.location.pathname !== '/users') {
    config.params = { ...config.params, lookup: '1' };
  }
  return config;
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

