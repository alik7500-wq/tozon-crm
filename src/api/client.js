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
    if (error.config?.url?.startsWith('/integrations/instagram/')) {
      const explanations = {
        INSTAGRAM_PERMISSION_REQUIRED: 'Meta не разрешила доступ к перепискам. Проверьте разрешения приложения.',
        INSTAGRAM_RECONNECT_REQUIRED: 'Необходимо переподключить Instagram.',
        INSTAGRAM_ACCOUNT_MISMATCH: 'Токен Instagram не соответствует подключённому аккаунту. Переподключите Instagram.',
        INSTAGRAM_REPLY_WINDOW_CLOSED: 'Окно ответа закрыто. Дождитесь нового сообщения клиента.',
        INSTAGRAM_THREAD_OWNER_REQUIRED: 'Meta передала управление перепиской другому приложению. Проверьте маршрутизацию сообщений в Meta Business Suite.',
        INSTAGRAM_STORAGE_UNAVAILABLE: 'Сохранённая история временно недоступна. Повторите позже.',
        INSTAGRAM_RATE_LIMIT: 'Слишком много запросов. Повторите позже.',
        INSTAGRAM_CONVERSATION_NOT_FOUND: 'Переписка недоступна. Обновите список диалогов.'
      };
      const code = error.response?.data?.code;
      const normalized = new Error(explanations[code] || 'Не удалось выполнить запрос Instagram.');
      normalized.code = code;
      normalized.response = { status: error.response?.status, data: { code } };
      return Promise.reject(normalized);
    }
    const message = error.response?.data?.message || error.message || 'Произошла ошибка при выполнении запроса';
    return Promise.reject(Object.assign(new Error(message), { status: error.response?.status, code: error.code }));
  }
);

