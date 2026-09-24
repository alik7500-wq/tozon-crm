import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import {
  Inbox,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Eye,
  Ban,
  ShieldAlert,
  ChevronLeft,
  ChevronRight,
  Filter
} from 'lucide-react';
import { SmsOutboxEventDetailModal } from './SmsOutboxEventDetailModal';

export function SmsOutboxQueueTable({ onCountChange }) {
  const [events, setEvents] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState('AWAITING_CONFIRMATION');
  const [eventTypeFilter, setEventTypeFilter] = useState('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const [selectedEventId, setSelectedEventId] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const fetchEvents = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        status: statusFilter,
        eventType: eventTypeFilter,
        page: String(page),
        limit: '20'
      });

      const res = await api.get(`/sms/events?${params.toString()}`);
      if (res.success && res.data) {
        setEvents(res.data.events || []);
        setTotal(res.data.total || 0);
        setTotalPages(res.data.totalPages || 1);
        if (onCountChange && statusFilter === 'AWAITING_CONFIRMATION') {
          onCountChange(res.data.total || 0);
        }
      } else {
        setEvents([]);
        setTotal(0);
        setTotalPages(1);
      }
    } catch (err) {
      console.error('Error fetching SMS Outbox events:', err);
      setError('Не удалось загрузить очередь SMS Outbox');
      setEvents([]);
      setTotal(0);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [statusFilter, eventTypeFilter, page]);

  const handleOpenDetail = (id) => {
    setSelectedEventId(id);
    setIsDetailModalOpen(true);
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'AWAITING_CONFIRMATION':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Clock className="w-3.5 h-3.5" />
            Ожидает подтверждения
          </span>
        );
      case 'PROCESSING':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            Обрабатывается
          </span>
        );
      case 'SENT':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Отправлено
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-500/10 text-slate-400 border border-slate-500/20">
            <Ban className="w-3.5 h-3.5" />
            Отменено
          </span>
        );
      case 'DELIVERY_UNKNOWN':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <AlertTriangle className="w-3.5 h-3.5" />
            Статус доставки неизвестен
          </span>
        );
      case 'FAILED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <ShieldAlert className="w-3.5 h-3.5" />
            Ошибка
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded text-xs bg-slate-800 text-slate-400">
            {status}
          </span>
        );
    }
  };

  const getEventTypeLabel = (type) => {
    switch (type) {
      case 'PAYMENT_REMINDER':
        return 'Напоминание об оплате';
      case 'DEBT_OVERDUE':
        return 'Задолженность';
      case 'MEETING_REMINDER':
        return 'Встреча';
      case 'CONTRACT_SIGNED':
        return 'Договор подписан';
      case 'PAYMENT_RECEIVED':
        return 'Подтверждение оплаты';
      default:
        return type;
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl space-y-0">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 px-6 py-4 border-b border-slate-800 bg-slate-950/40">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Inbox className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              Очередь SMS Outbox
              {total > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-xs font-mono font-extrabold border border-amber-500/30">
                  {total}
                </span>
              )}
            </h3>
            <p className="text-xs text-slate-400">Событийные уведомления с обязательным подтверждением менеджером</p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={fetchEvents}
            disabled={isLoading}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 px-3 py-1.5 rounded-lg border border-slate-800 hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Обновить
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="px-6 py-3 bg-slate-950/20 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: 'AWAITING_CONFIRMATION', label: 'Ожидают подтверждения' },
            { id: 'ALL', label: 'Все события' },
            { id: 'SENT', label: 'Отправлено' },
            { id: 'DELIVERY_UNKNOWN', label: 'Неизвестная доставка' },
            { id: 'CANCELLED', label: 'Отменено' },
            { id: 'FAILED', label: 'Ошибки' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setStatusFilter(tab.id);
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition whitespace-nowrap cursor-pointer ${
                statusFilter === tab.id
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Event Type Select */}
        <div className="flex items-center gap-2 text-xs">
          <Filter className="w-3.5 h-3.5 text-slate-500" />
          <select
            value={eventTypeFilter}
            onChange={(e) => {
              setEventTypeFilter(e.target.value);
              setPage(1);
            }}
            className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-blue-500"
          >
            <option value="ALL">Все типы</option>
            <option value="PAYMENT_REMINDER">Напоминание об оплате</option>
            <option value="DEBT_OVERDUE">Задолженность</option>
            <option value="MEETING_REMINDER">Встреча</option>
            <option value="CONTRACT_SIGNED">Договор подписан</option>
          </select>
        </div>
      </div>

      {/* Table Body / Loading / Empty */}
      {isLoading ? (
        <div className="p-12 text-center text-slate-400 space-y-3">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-400" />
          <p className="text-sm">Загрузка очереди SMS...</p>
        </div>
      ) : error ? (
        <div className="p-8 text-center text-rose-400 text-sm flex items-center justify-center gap-2">
          <ShieldAlert className="w-4 h-4" />
          {error}
        </div>
      ) : events.length === 0 ? (
        <div className="p-12 text-center bg-slate-900/40 space-y-3">
          <div className="w-14 h-14 rounded-full bg-slate-800/80 text-slate-400 border border-slate-700/60 flex items-center justify-center mx-auto shadow-inner">
            <Inbox className="w-7 h-7" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-slate-200">
              {statusFilter === 'AWAITING_CONFIRMATION'
                ? 'Нет SMS, ожидающих подтверждения'
                : 'События SMS Outbox не найдены'}
            </h4>
            <p className="text-xs text-slate-400 mt-1">
              {statusFilter === 'AWAITING_CONFIRMATION'
                ? 'Когда появяться плановые уведомления, менеджеры смогут подтвердить или отклонить их здесь.'
                : 'Попробуйте изменить фильтры или выбрать другой статус.'}
            </p>
          </div>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-950/60 text-xs uppercase text-slate-500 border-b border-slate-800">
                <tr>
                  <th className="px-6 py-3 font-medium">Дата / Время</th>
                  <th className="px-6 py-3 font-medium">Тип уведомления</th>
                  <th className="px-6 py-3 font-medium">Шаблон</th>
                  <th className="px-6 py-3 font-medium">Статус</th>
                  <th className="px-6 py-3 font-medium text-right">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {events.map((evt) => (
                  <tr key={evt.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-6 py-3.5 text-xs font-mono text-slate-400 whitespace-nowrap">
                      {new Date(evt.created_at).toLocaleString('ru-RU')}
                    </td>
                    <td className="px-6 py-3.5 font-semibold text-slate-200 whitespace-nowrap">
                      <div>{getEventTypeLabel(evt.event_type)}</div>
                      <div className="text-[11px] font-mono text-slate-500 font-normal">Key: {evt.idempotency_key}</div>
                    </td>
                    <td className="px-6 py-3.5 text-xs font-mono text-blue-400 whitespace-nowrap">
                      {evt.template_code}
                    </td>
                    <td className="px-6 py-3.5 whitespace-nowrap">
                      {getStatusBadge(evt.status)}
                    </td>
                    <td className="px-6 py-3.5 whitespace-nowrap text-right">
                      <button
                        type="button"
                        onClick={() => handleOpenDetail(evt.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 transition font-medium cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5 text-blue-400" />
                        Просмотреть
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-3 border-t border-slate-800 bg-slate-950/40 text-xs text-slate-400">
              <div>
                Страница <span className="font-bold text-white">{page}</span> из <span className="font-bold text-white">{totalPages}</span> (всего {total})
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1.5 rounded-lg border border-slate-800 hover:bg-slate-800 disabled:opacity-40 transition cursor-pointer flex items-center gap-1"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  Назад
                </button>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="px-3 py-1.5 rounded-lg border border-slate-800 hover:bg-slate-800 disabled:opacity-40 transition cursor-pointer flex items-center gap-1"
                >
                  Вперёд
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Outbox Detail Modal */}
      <SmsOutboxEventDetailModal
        eventId={selectedEventId}
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        onRefreshQueue={fetchEvents}
      />
    </div>
  );
}
