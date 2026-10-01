import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import {
  Bell,
  AlertCircle,
  CreditCard,
  UserPlus,
  FileCheck,
  Smartphone,
  ChevronRight
} from 'lucide-react';

export const NotificationsPage = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchNotifications = async () => {
    setIsLoading(true);
    setError('');
    try {
      const res = await api.get('/notifications');
      // Extract array safely from canonical API response { success: true, data: [...] }
      const list = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
      setNotifications(list);
    } catch (err) {
      // Graceful error handling without crashing ErrorBoundary
      setError(err.message || 'Ошибка загрузки уведомлений');
      setNotifications([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const markAllAsRead = async () => {
    try {
      await api.post('/notifications/read-all');
      setNotifications((prev) =>
        Array.isArray(prev) ? prev.map((n) => ({ ...n, is_read: true })) : []
      );
    } catch (err) {
      alert(err.message || 'Ошибка обновления уведомлений');
    }
  };

  const handleNotificationClick = async (n) => {
    if (!n.is_read) {
      try {
        await api.patch(`/notifications/${n.id}/read`);
        setNotifications((prev) =>
          Array.isArray(prev)
            ? prev.map((item) => (item.id === n.id ? { ...item, is_read: true } : item))
            : []
        );
      } catch (err) {
        console.warn('Failed to mark notification as read:', err);
      }
    }

    // Deep-link navigation based on entity_type & entity_id
    if (n.entity_type === 'LEAD') {
      navigate(n.entity_id ? `/clients?clientId=${n.entity_id}` : '/clients');
    } else if (n.entity_type === 'DEAL') {
      navigate(n.entity_id ? `/deals?dealId=${n.entity_id}` : '/deals');
    } else if (n.entity_type === 'SMS') {
      navigate('/crm/sms-notifications');
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'PAYMENT_DUE':
        return <CreditCard className="h-5 w-5 text-emerald-600" />;
      case 'PAYMENT_OVERDUE':
        return <AlertCircle className="h-5 w-5 text-rose-600" />;
      case 'LEAD_CREATED':
        return <UserPlus className="h-5 w-5 text-purple-600" />;
      case 'RESERVATION_CREATED':
        return <FileCheck className="h-5 w-5 text-blue-600" />;
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

  // Always enforce array guarantee
  const safeNotifications = Array.isArray(notifications) ? notifications : [];
  const unreadCount = safeNotifications.filter(n => !n?.is_read).length;

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Bell className="h-7 w-7 text-blue-600" />
            <span>Центр уведомлений</span>
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500">
            Системные события, оповещения о сроках оплат, просрочках и новых заявках
          </p>
        </div>

        {unreadCount > 0 && (
          <div className="flex items-center gap-2">
            <button
              onClick={markAllAsRead}
              className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-2xs transition cursor-pointer"
            >
              Прочитать все ({unreadCount})
            </button>
          </div>
        )}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center p-12 text-slate-400 bg-white rounded-2xl border border-slate-200 shadow-xs">
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
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center shadow-xs">
              <Bell className="h-10 w-10 text-slate-300 mb-2" />
              <h3 className="text-base font-bold text-slate-900">Уведомлений нет</h3>
              <p className="text-xs text-slate-500 mt-1">Все важные события обработаны.</p>
            </div>
          ) : (
            safeNotifications.map((n) => (
              <div
                key={n.id}
                onClick={() => handleNotificationClick(n)}
                className={`rounded-2xl border p-4 transition flex items-start gap-4 cursor-pointer group ${
                  n.is_read
                    ? 'bg-white/60 border-slate-200 opacity-75 hover:opacity-100 hover:bg-slate-50'
                    : 'bg-white border-blue-200 shadow-2xs hover:border-blue-300 hover:shadow-xs'
                }`}
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-50 border border-slate-200 group-hover:scale-105 transition-transform">
                  {getIcon(n.type || n.event_type)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className={`text-sm ${!n.is_read ? 'font-black text-slate-900' : 'font-bold text-slate-700'}`}>
                      {n.title}
                    </h4>
                    <span className="text-[11px] text-slate-400 whitespace-nowrap">
                      {formatTime(n.created_at)}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-600 leading-relaxed">{n.message}</p>
                </div>

                <div className="self-center text-slate-300 group-hover:text-blue-600 transition-colors">
                  <ChevronRight className="h-4 w-4" />
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
