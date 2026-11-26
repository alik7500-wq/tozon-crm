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
        INSTAGRAM_ACCOUNT_NOT_CONNECTED: 'Этот аккаунт не подключён или требует повторной авторизации.',
        INSTAGRAM_DISCONNECT_FAILED: 'Не удалось отключить аккаунт. Повторите попытку.',
        INSTAGRAM_ACCOUNT_MISMATCH: 'Токен Instagram не соответствует подключёнённому аккаунту. Переподключите Instagram.',
        INSTAGRAM_REPLY_WINDOW_CLOSED: 'Окно ответа закрыто. Дождитесь нового сообщения клиента.',
        INSTAGRAM_THREAD_OWNER_REQUIRED: 'Meta передала управление перепиской другому приложению. Проверьте маршрутизацию сообщений в Meta Business Suite.',
        INSTAGRAM_STORAGE_UNAVAILABLE: 'Сохранённая история временно недоступна. Повторите позже.',
        INSTAGRAM_RATE_LIMIT: 'Слишком много запросов. Повторите позже.',
        INSTAGRAM_CONVERSATION_NOT_FOUND: 'Переписка недоступна. Обновите список диалогов.',
        INSTAGRAM_ACCESS_DENIED: 'Недостаточно прав для работы с этим диалогом Instagram.',
        INSTAGRAM_SEND_UNCONFIRMED: 'Отправка не подтверждена. Выполните сверку перед повтором.',
        SEND_IN_PROGRESS: 'Отправка уже выполняется на сервере. Выполните сверку.',
        IDEMPOTENCY_CONFLICT: 'Ключ операции уже использован для другого сообщения.'
      };
      const hasHttpResponse = Boolean(error.response);
      const httpCode = error.response?.data?.code;
      const isTimeout = error.code === 'ECONNABORTED' || /timeout/i.test(String(error.message || ''));
      const isNetworkError = !hasHttpResponse;
      const code = httpCode || (!hasHttpResponse ? error.code : undefined);
      const fallbackMessage = isTimeout
        ? 'Превышено время ожидания ответа от сервера. Выполните сверку перед повтором.'
        : isNetworkError
          ? 'Потеряно соединение с сервером. Выполните сверку перед повтором.'
          : 'Не удалось выполнить запрос Instagram.';
      const normalized = new Error((httpCode && explanations[httpCode]) || fallbackMessage);
      normalized.code = code;
      normalized.status = error.response?.status;
      normalized.hasHttpResponse = hasHttpResponse;
      normalized.isTimeout = isTimeout;
      normalized.isNetworkError = isNetworkError;
      if (hasHttpResponse) {
        normalized.response = { status: error.response.status, data: { code: httpCode } };
      }
      return Promise.reject(normalized);
    }
    const message = error.response?.data?.message || error.message || 'Произошла ошибка при выполнении запроса';
    const normalized = new Error(message);
    normalized.status = error.response?.status;
    normalized.code = error.response?.data?.code || error.code;
    normalized.response = error.response;
    return Promise.reject(normalized);
  }
);

