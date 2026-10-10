import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import {
  Bell,
  AlertCircle,
  CreditCard,
  UserPlus,
  FileCheck,
  Smartphone,
  ChevronRight,
  CheckCheck,
  Check,
  Inbox,
  RefreshCw
} from 'lucide-react';

export const NotificationsPage = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    unread: 0,
    payments: 0,
    leads_and_reservations: 0,
    sms_failed: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeCategory, setActiveCategory] = useState('all'); // 'all', 'unread', 'payments', 'leads', 'sms'
  const [pendingReadIds, setPendingReadIds] = useState(new Set());
  const [isMarkingAllRead, setIsMarkingAllRead] = useState(false);

  // Fetch aggregated stats across ALL notifications for the user from server
  const fetchStats = useCallback(async () => {
    try {
      const res = await api.get('/notifications/stats');
      if (res?.data) {
        setStats(res.data);
      }
    } catch (err) {
      console.warn('Failed to fetch notification stats:', err);
    }
  }, []);

  // Fetch notification list from server for active category
  const fetchNotifications = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const queryCategory = activeCategory === 'all' ? '' : activeCategory;
      const res = await api.get(`/notifications?limit=200${queryCategory ? `&category=${queryCategory}` : ''}`);
      const list = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
      setNotifications(list);
      await fetchStats();
    } catch (err) {
      setError(err.message || 'Ошибка загрузки уведомлений');
      setNotifications([]);
    } finally {
      setIsLoading(false);
    }
  }, [activeCategory, fetchStats]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const markAllAsRead = async () => {
    if (stats.unread === 0 || isMarkingAllRead) return;
    const confirmed = window.confirm(`Вы действительно хотите отметить все (${stats.unread}) непрочитанные уведомления как прочитанные?`);
    if (!confirmed) return;

    setIsMarkingAllRead(true);
    try {
      const res = await api.post('/notifications/read-all');
      if (res && res.success !== false) {
        // Success: update local state & stats
        setNotifications((prev) =>
          Array.isArray(prev) ? prev.map((n) => ({ ...n, is_read: true })) : []
        );
        setStats((prev) => ({ ...prev, unread: 0 }));
      } else {
        throw new Error(res?.error?.message || 'Сбой обновления уведомлений');
      }
    } catch (err) {
      alert(err.message || 'Не удалось обновить статус уведомлений на сервере');
    } finally {
      setIsMarkingAllRead(false);
    }
  };

  const markSingleAsRead = async (e, notificationId) => {
    if (e) e.stopPropagation();

    // Prevent duplicate/debounced requests on rapid clicks
    if (pendingReadIds.has(notificationId)) return;

    setPendingReadIds((prev) => new Set(prev).add(notificationId));

    try {
      const res = await api.patch(`/notifications/${notificationId}/read`);
      if (res && res.success !== false) {
        // Success: update local status & decrement unread count
        setNotifications((prev) =>
          Array.isArray(prev)
            ? prev.map((item) => (item.id === notificationId ? { ...item, is_read: true } : item))
            : []
        );
        setStats((prev) => ({ ...prev, unread: Math.max(0, prev.unread - 1) }));
      } else {
        throw new Error(res?.error?.message || 'Не удалось обновить статус');
      }
    } catch (err) {
      alert(`Ошибка: ${err.message || 'Не удалось отметить уведомление как прочитанное'}`);
    } finally {
      setPendingReadIds((prev) => {
        const next = new Set(prev);
        next.delete(notificationId);
        return next;
      });
    }
  };

  const handleNotificationClick = async (n) => {
    // If notification is unread, attempt PATCH first
    if (!n.is_read) {
      if (pendingReadIds.has(n.id)) return;
      setPendingReadIds((prev) => new Set(prev).add(n.id));

      try {
        const res = await api.patch(`/notifications/${n.id}/read`);
        if (res && res.success !== false) {
          setNotifications((prev) =>
            Array.isArray(prev)
              ? prev.map((item) => (item.id === n.id ? { ...item, is_read: true } : item))
              : []
          );
          setStats((prev) => ({ ...prev, unread: Math.max(0, prev.unread - 1) }));
        } else {
          throw new Error(res?.error?.message || 'Не удалось обновить статус');
        }
      } catch (err) {
        alert(`Ошибка: ${err.message || 'Сбой обновления статуса уведомления. Переход отменен.'}`);
        setPendingReadIds((prev) => {
          const next = new Set(prev);
          next.delete(n.id);
          return next;
        });
        return; // Do NOT navigate on PATCH failure!
      }

      setPendingReadIds((prev) => {
        const next = new Set(prev);
        next.delete(n.id);
        return next;
      });
    }

    // Deep-link navigation based on action_url, entity_type & type
    const type = n.event_type || n.type;
    if (n.action_url) {
      navigate(n.action_url);
    } else if (n.entity_type === 'LEAD' || type === 'LEAD_CREATED' || type === 'LEAD_UNASSIGNED') {
      navigate(n.entity_id ? `/clients?clientId=${n.entity_id}` : '/clients');
    } else if (n.entity_type === 'DEAL' || type === 'RESERVATION_CREATED' || type === 'PAYMENT_DUE' || type === 'PAYMENT_OVERDUE') {
      navigate(n.entity_id ? `/deals?dealId=${n.entity_id}` : '/deals');
    } else if (n.entity_type === 'SMS' || type === 'SMS_FAILED') {
      navigate('/crm/sms-notifications');
    }
  };

  const maskPhoneNumber = (text) => {
    if (!text || typeof text !== 'string') return text;
    return text.replace(/(\+?992)?[\s-]*(\d{2})[\s-]*(\d{3})[\s-]*(\d{2})[\s-]*(\d{2})/g, (match, prefix, p1, p2, p3, p4) => {
      const p = prefix ? prefix : '+992';
      return `${p}******${p4}`;
    });
  };

  const getIcon = (type) => {
    switch (type) {
      case 'PAYMENT_DUE':
        return <CreditCard className="h-5 w-5 text-emerald-600" />;
      case 'PAYMENT_OVERDUE':
      case 'MANAGER_TASK_OVERDUE':
        return <AlertCircle className="h-5 w-5 text-rose-600" />;
      case 'LEAD_CREATED':
      case 'LEAD_UNASSIGNED':
        return <UserPlus className="h-5 w-5 text-purple-600" />;
      case 'RESERVATION_CREATED':
      case 'MEETING_REMINDER':
        return <FileCheck className="h-5 w-5 text-blue-600" />;
      case 'CALL_REMINDER':
        return <Bell className="h-5 w-5 text-blue-600" />;
      case 'SMS_FAILED':
        return <Smartphone className="h-5 w-5 text-amber-600" />;
      default:
        return <Bell className="h-5 w-5 text-slate-600" />;
    }
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderEmptyState = () => {
    let message = 'Уведомлений нет. Все важные события обработаны.';
    let subMessage = 'Здесь будут появляться системные сообщения и уведомления.';

    if (activeCategory === 'unread') {
      message = 'Все уведомления прочитаны';
      subMessage = 'У вас нет новых непрочитанных сообщений.';
    } else if (activeCategory === 'payments') {
      message = 'Уведомлений по платежам нет';
      subMessage = 'Графики платежей и просрочки в порядке.';
    } else if (activeCategory === 'leads') {
      message = 'Нет новых заявок и бронирований';
      subMessage = 'Уведомления о новых клиентах и бронях пока отсутствуют.';
    } else if (activeCategory === 'sms') {
      message = 'Ошибок отправки SMS не обнаружено';
      subMessage = 'Все SMS-оповещения доставляются без сбоев.';
    }

    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center shadow-2xs">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50 border border-slate-200 mb-3 text-slate-400">
          <Inbox className="h-6 w-6" />
        </div>
        <h3 className="text-base font-bold text-slate-900">{message}</h3>
        <p className="text-xs text-slate-500 mt-1 max-w-sm">{subMessage}</p>
      </div>
    );
  };

  const safeNotifications = Array.isArray(notifications) ? notifications : [];

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12 px-1 sm:px-4">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Bell className="h-7 w-7 text-blue-600" />
            <span>Интерактивный центр уведомлений</span>
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500">
            Системные события, платежи, просрочки, новые заявки и ошибки доставки
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchNotifications}
            title="Обновить список"
            aria-label="Обновить список"
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer shadow-2xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-slate-500 ${isLoading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Обновить</span>
          </button>

          {stats.unread > 0 && (
            <button
              onClick={markAllAsRead}
              disabled={isMarkingAllRead}
              title="Отметить все как прочитанные"
              aria-label="Отметить все как прочитанные"
              className="flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3.5 py-2 text-xs font-bold text-blue-700 hover:bg-blue-100 disabled:opacity-50 transition cursor-pointer shadow-2xs"
            >
              <CheckCheck className="h-4 w-4" />
              <span>Прочитать все ({stats.unread})</span>
            </button>
          )}
        </div>
      </div>

      {/* 1. Clickable Metric Banners (Primary Filter Mechanism) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* Banner: Все */}
        <div
          onClick={() => setActiveCategory('all')}
          title="Фильтр: Все уведомления"
          role="button"
          tabIndex={0}
          aria-label="Фильтр: Все уведомления"
          className={`p-3.5 rounded-2xl border transition cursor-pointer flex flex-col justify-between ${
            activeCategory === 'all'
              ? 'bg-blue-50/80 border-blue-300 ring-2 ring-blue-500/20 shadow-xs'
              : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold text-slate-600">Все</span>
            <Bell className="h-4 w-4 text-blue-600" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-xl font-black text-slate-900">{stats.total}</span>
            <span className="text-[11px] font-semibold text-slate-500">всего</span>
          </div>
        </div>

        {/* Banner: Непрочитанные */}
        <div
          onClick={() => setActiveCategory('unread')}
          title="Фильтр: Непрочитанные"
          role="button"
          tabIndex={0}
          aria-label="Фильтр: Непрочитанные"
          className={`p-3.5 rounded-2xl border transition cursor-pointer flex flex-col justify-between ${
            activeCategory === 'unread'
              ? 'bg-rose-50/80 border-rose-300 ring-2 ring-rose-500/20 shadow-xs'
              : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold text-rose-700">Непрочитанные</span>
            <AlertCircle className="h-4 w-4 text-rose-600" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-xl font-black text-rose-900">{stats.unread}</span>
            {stats.unread > 0 ? (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-600 text-white">
                новые
              </span>
            ) : (
              <span className="text-[11px] font-semibold text-slate-400">0</span>
            )}
          </div>
        </div>

        {/* Banner: Платежи */}
        <div
          onClick={() => setActiveCategory('payments')}
          title="Фильтр: Платежи"
          role="button"
          tabIndex={0}
          aria-label="Фильтр: Платежи"
          className={`p-3.5 rounded-2xl border transition cursor-pointer flex flex-col justify-between ${
            activeCategory === 'payments'
              ? 'bg-emerald-50/80 border-emerald-300 ring-2 ring-emerald-500/20 shadow-xs'
              : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold text-emerald-700">Платежи</span>
            <CreditCard className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-xl font-black text-emerald-900">{stats.payments}</span>
            <span className="text-[11px] font-semibold text-slate-500">сроки</span>
          </div>
        </div>

        {/* Banner: Лиды и брони */}
        <div
          onClick={() => setActiveCategory('leads')}
          title="Фильтр: Лиды и брони"
          role="button"
          tabIndex={0}
          aria-label="Фильтр: Лиды и брони"
          className={`p-3.5 rounded-2xl border transition cursor-pointer flex flex-col justify-between ${
            activeCategory === 'leads'
              ? 'bg-purple-50/80 border-purple-300 ring-2 ring-purple-500/20 shadow-xs'
              : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold text-purple-700">Лиды и брони</span>
            <UserPlus className="h-4 w-4 text-purple-600" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-xl font-black text-purple-900">{stats.leads_and_reservations}</span>
            <span className="text-[11px] font-semibold text-slate-500">заявки</span>
          </div>
        </div>

        {/* Banner: Ошибки SMS */}
        <div
          onClick={() => setActiveCategory('sms')}
          title="Фильтр: Ошибки SMS"
          role="button"
          tabIndex={0}
          aria-label="Фильтр: Ошибки SMS"
          className={`p-3.5 rounded-2xl border transition cursor-pointer flex flex-col justify-between ${
            activeCategory === 'sms'
              ? 'bg-amber-50/80 border-amber-300 ring-2 ring-amber-500/20 shadow-xs'
              : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold text-amber-700">Ошибки SMS</span>
            <Smartphone className="h-4 w-4 text-amber-600" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-xl font-black text-amber-900">{stats.sms_failed}</span>
            <span className="text-[11px] font-semibold text-slate-500">сбои</span>
          </div>
        </div>
      </div>

      {/* Notifications List Content */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center p-12 text-slate-400 bg-white rounded-2xl border border-slate-200 shadow-2xs">
          <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-blue-600 mb-2"></div>
          <p className="text-xs font-medium">Загрузка уведомлений...</p>
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50/50 p-6 text-center text-rose-700">
          <AlertCircle className="h-6 w-6 mx-auto mb-2 text-rose-500" />
          <p className="text-xs font-bold">{error}</p>
          <button
            onClick={fetchNotifications}
            className="mt-3 inline-flex items-center px-3 py-1.5 rounded-lg bg-rose-100 hover:bg-rose-200 text-rose-800 text-xs font-bold transition cursor-pointer"
          >
            Повторить попытку
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {safeNotifications.length === 0 ? (
            renderEmptyState()
          ) : (
            safeNotifications.map((n) => {
              const type = n.event_type || n.type;
              const isPending = pendingReadIds.has(n.id);
              return (
                <div
                  key={n.id}
                  onClick={() => handleNotificationClick(n)}
                  className={`rounded-2xl border p-4 transition flex items-start gap-3.5 cursor-pointer group relative ${
                    n.is_read
                      ? 'bg-white/70 border-slate-200 opacity-80 hover:opacity-100 hover:bg-slate-50'
                      : 'bg-white border-blue-200 ring-1 ring-blue-500/10 shadow-2xs hover:border-blue-400 hover:shadow-xs'
                  } ${isPending ? 'pointer-events-none opacity-60' : ''}`}
                >
                  {/* Unread Accent Indicator Dot */}
                  {!n.is_read && (
                    <span className="absolute top-4 left-2.5 h-2 w-2 rounded-full bg-blue-600 ring-2 ring-white"></span>
                  )}

                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-50 border border-slate-200 group-hover:scale-105 transition-transform ml-1">
                    {getIcon(type)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className={`text-sm ${!n.is_read ? 'font-black text-slate-900' : 'font-bold text-slate-700'}`}>
                        {n.title}
                      </h4>
                      <span className="text-[11px] font-medium text-slate-400 whitespace-nowrap">
                        {formatTime(n.created_at)}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-600 leading-relaxed break-words">{maskPhoneNumber(n.message)}</p>
                  </div>

                  <div className="flex items-center gap-2 self-center shrink-0">
                    {!n.is_read && (
                      <button
                        onClick={(e) => markSingleAsRead(e, n.id)}
                        disabled={isPending}
                        title="Отметить прочитанным"
                        aria-label="Отметить прочитанным"
                        className="p-2 min-h-[36px] min-w-[36px] flex items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-400 hover:text-blue-600 hover:bg-blue-50 disabled:opacity-50 transition cursor-pointer shadow-2xs"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                    )}
                    <div
                      title="Открыть связанную запись"
                      aria-label="Открыть связанную запись"
                      className="p-2 min-h-[36px] min-w-[36px] flex items-center justify-center rounded-xl border border-transparent group-hover:border-blue-100 group-hover:bg-blue-50 text-slate-300 group-hover:text-blue-600 transition-all cursor-pointer"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};
