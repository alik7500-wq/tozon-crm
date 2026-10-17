import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { X, UserCheck, AlertCircle, History, Clock } from 'lucide-react';

export const AssignLeadModal = ({ isOpen, onClose, lead, onAssigned }) => {
  const [salesReps, setSalesReps] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingReps, setIsLoadingReps] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setSelectedUserId(lead?.responsible_user_id ? String(lead.responsible_user_id) : '');
    setReason('');
    setError('');

    const fetchSalesReps = async () => {
      setIsLoadingReps(true);
      try {
        const res = await api.get('/users');
        const allUsers = res.data?.users || res.users || [];
        // Strict filter: only active users with is_sales_rep === true
        const reps = allUsers.filter(u => {
          const isActive = u.is_active === 1 || u.is_active === true || u.is_active === '1';
          const isRep = u.is_sales_rep === true || u.is_sales_rep === 1 || u.is_sales_rep === 'true';
          return isActive && isRep;
        });
        setSalesReps(reps);
      } catch (err) {
        console.error('Failed to fetch sales reps:', err);
        setError('Не удалось загрузить список менеджеров');
      } finally {
        setIsLoadingReps(false);
      }
    };

    fetchSalesReps();
  }, [isOpen, lead]);

  if (!isOpen || !lead) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      const targetUserId = selectedUserId ? Number(selectedUserId) : null;
      await api.patch(`/leads/${lead.id}/assign`, {
        responsible_user_id: targetUserId,
        reason: reason.trim() || undefined
      });

      if (onAssigned) onAssigned();
      onClose();
    } catch (err) {
      setError(err.message || 'Ошибка при назначении менеджера');
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentResponsibleName = lead.responsible_user_name || (lead.responsible_user_id ? 'Менеджер' : 'Общий пул (Не назначен)');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-50 text-purple-700">
              <UserCheck className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">Назначить менеджера</h3>
              <p className="text-xs text-slate-500">Заявка #{lead.id}: {lead.full_name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
            <div className="flex justify-between text-slate-600">
              <span>Текущий ответственный:</span>
              <span className="font-bold text-slate-900">{currentResponsibleName}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Телефон клиента:</span>
              <span className="font-semibold text-slate-800">{lead.phone || '—'}</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Сотрудник отдела продаж <span className="text-rose-500">*</span>
            </label>
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              disabled={isLoadingReps}
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-900 outline-none focus:border-tozon-blue focus:ring-4 focus:ring-tozon-blue/10 cursor-pointer"
            >
              <option value="">— Оставить в общем пуле (Не назначен) —</option>
              {salesReps.map((rep) => (
                <option key={rep.id} value={rep.id}>
                  {rep.name} ({rep.role === 'SALES_MANAGER' ? 'Менеджер продаж' : rep.role})
                </option>
              ))}
            </select>
            <p className="mt-1 text-[11px] text-slate-400">
              Доступны только активные менеджеры отдела продаж (is_sales_rep = true).
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Причина назначения / переназначения
            </label>
            <textarea
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Например: Первичное распределение из пула / Замена по загрузке..."
              className="w-full rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-900 outline-none focus:border-tozon-blue focus:ring-4 focus:ring-tozon-blue/10 resize-none"
            />
          </div>

          {/* SLA Notice */}
          <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-800 text-[11px] flex items-start gap-2">
            <Clock className="h-4 w-4 shrink-0 text-blue-600 mt-0.5" />
            <div>
              <span className="font-bold">Регламент первого контакта:</span> после назначения у менеджера запустится 15-минутный рабочий SLA для связи с клиентом.
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isLoadingReps}
              className="px-4 py-2 rounded-xl bg-tozon-blue hover:bg-tozon-blue/90 text-xs font-bold text-white shadow-xs transition cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? 'Сохранение...' : 'Подтвердить назначение'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
