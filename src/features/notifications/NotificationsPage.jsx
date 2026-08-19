import React, { useState } from 'react';
import {
  Bell,
  CheckCircle2,
  AlertCircle,
  Clock,
  CreditCard,
  UserPlus,
  FileCheck,
  Trash2
} from 'lucide-react';

export const NotificationsPage = () => {
  const [notifications, setNotifications] = useState([
    {
      id: 1,
      type: 'PAYMENT',
      title: 'Наступает срок планового платежа',
      message: 'По договору СД-102 (Фарход Рахимов) срок оплаты очередного взноса через 3 дня.',
      created_at: new Date().toISOString(),
      read: false,
    },
    {
      id: 2,
      type: 'LEAD',
      title: 'Новый входящий лид',
      message: 'Заявка с сайта от Шахнозы Алиевой на 2-комнатную квартиру в ЖК TOZON PLAZA.',
      created_at: new Date(Date.now() - 3600000).toISOString(),
      read: false,
    },
    {
      id: 3,
      type: 'DEAL',
      title: 'Успешно оформлена новая бронь',
      message: 'Менеджер забронировал квартиру №45 в Блоке А.',
      created_at: new Date(Date.now() - 86400000).toISOString(),
      read: true,
    },
  ]);

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const clearAll = () => {
    setNotifications([]);
  };

  const getIcon = (type) => {
    switch (type) {
      case 'PAYMENT':
        return <CreditCard className="h-5 w-5 text-emerald-600" />;
      case 'LEAD':
        return <UserPlus className="h-5 w-5 text-purple-600" />;
      case 'DEAL':
        return <FileCheck className="h-5 w-5 text-blue-600" />;
      default:
        return <Bell className="h-5 w-5 text-slate-600" />;
    }
  };

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

        <div className="flex items-center gap-2">
          <button
            onClick={markAllAsRead}
            className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-2xs transition cursor-pointer"
          >
            Прочитать все
          </button>
          <button
            onClick={clearAll}
            className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-100 transition cursor-pointer"
          >
            Очистить
          </button>
        </div>
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center shadow-xs">
            <Bell className="h-10 w-10 text-slate-300 mb-2" />
            <h3 className="text-base font-bold text-slate-900">Уведомлений нет</h3>
            <p className="text-xs text-slate-500 mt-1">Все важные события обработаны.</p>
          </div>
        ) : (
          notifications.map((n) => (
            <div
              key={n.id}
              className={`rounded-2xl border p-4 transition flex items-start gap-4 ${
                n.read
                  ? 'bg-white/60 border-slate-200 opacity-75'
                  : 'bg-white border-blue-200 shadow-2xs'
              }`}
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-50 border border-slate-200">
                {getIcon(n.type)}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-sm font-bold text-slate-900">{n.title}</h4>
                  <span className="text-[11px] text-slate-400 whitespace-nowrap">
                    {new Date(n.created_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-600 leading-relaxed">{n.message}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
