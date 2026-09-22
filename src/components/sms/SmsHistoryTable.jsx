import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { MessageSquare, Clock, CheckCircle2, AlertTriangle, RefreshCw, Phone, User, ShieldAlert } from 'lucide-react';

export function SmsHistoryTable({ clientId = null }) {
  const [history, setHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchHistory = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const endpoint = clientId ? `/sms/history?clientId=${clientId}` : '/sms/history';
      const res = await api.get(endpoint);
      if (res.success && Array.isArray(res.data)) {
        setHistory(res.data);
      }
    } catch (err) {
      console.error('Error fetching SMS history:', err);
      setError('Не удалось загрузить историю SMS');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [clientId]);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'sent':
      case 'delivered':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3.5 h-3.5" />
            {status === 'delivered' ? 'Доставлено' : 'Отправлено'}
          </span>
        );
      case 'sending':
      case 'queued':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Clock className="w-3.5 h-3.5 animate-pulse" />
            В процессе
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <AlertTriangle className="w-3.5 h-3.5" />
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

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/40">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white">История отправленных SMS</h3>
            <p className="text-xs text-slate-400">Провайдер Payom.tj • Имя отправителя: TOZON-PLAZA</p>
          </div>
        </div>
        <button
          onClick={fetchHistory}
          disabled={isLoading}
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 px-3 py-1.5 rounded-lg border border-slate-800 hover:bg-slate-800 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          Обновить
        </button>
      </div>

      {/* Body */}
      {isLoading ? (
        <div className="p-8 text-center text-slate-500 text-sm">Загрузка истории...</div>
      ) : error ? (
        <div className="p-6 text-center text-rose-400 text-sm flex items-center justify-center gap-2">
          <ShieldAlert className="w-4 h-4" />
          {error}
        </div>
      ) : history.length === 0 ? (
        <div className="p-8 text-center text-slate-500 text-sm">
          История SMS сообщений пуста.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950/60 text-xs uppercase text-slate-500 border-b border-slate-800">
              <tr>
                <th className="px-6 py-3 font-medium">Дата & Время</th>
                {!clientId && <th className="px-6 py-3 font-medium">Клиент</th>}
                <th className="px-6 py-3 font-medium">Телефон</th>
                <th className="px-6 py-3 font-medium">Текст сообщения</th>
                <th className="px-6 py-3 font-medium">Отправитель</th>
                <th className="px-6 py-3 font-medium">Статус</th>
                <th className="px-6 py-3 font-medium">Менеджер CRM</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {history.map((row) => (
                <tr key={row.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="px-6 py-3.5 text-xs font-mono text-slate-400 whitespace-nowrap">
                    {new Date(row.created_at).toLocaleString('ru-RU')}
                  </td>
                  {!clientId && (
                    <td className="px-6 py-3.5 font-medium text-slate-200 whitespace-nowrap">
                      {row.client_name || '—'}
                    </td>
                  )}
                  <td className="px-6 py-3.5 font-mono text-emerald-400 text-xs whitespace-nowrap">
                    {row.phone}
                  </td>
                  <td className="px-6 py-3.5 text-slate-300 max-w-xs truncate" title={row.message}>
                    {row.message}
                  </td>
                  <td className="px-6 py-3.5 font-mono text-xs text-blue-400 whitespace-nowrap">
                    {row.sender_name || 'TOZON-PLAZA'}
                  </td>
                  <td className="px-6 py-3.5 whitespace-nowrap">
                    {getStatusBadge(row.status)}
                  </td>
                  <td className="px-6 py-3.5 text-xs text-slate-400 whitespace-nowrap">
                    {row.created_by_name || 'Система'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
