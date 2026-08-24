import React, { useState } from 'react';
import { api } from '../../api/client';
import { useModalDismiss } from '../../hooks/useModalDismiss';
import { X, Clock, Calendar, AlertCircle } from 'lucide-react';

export const ExtendReservationModal = ({
  isOpen,
  onClose,
  deal,
  onExtended
}) => {
  const [newDate, setNewDate] = useState(() => {
    if (deal?.reservation_expires_at) {
      const d = new Date(deal.reservation_expires_at);
      d.setDate(d.getDate() + 3);
      return d.toISOString().split('T')[0];
    }
    const d = new Date();
    d.setDate(d.getDate() + 3);
    return d.toISOString().split('T')[0];
  });

  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { requestClose } = useModalDismiss({
    isOpen,
    onClose
  });

  if (!isOpen || !deal) return null;

  const handleAddDays = (days) => {
    const base = deal.reservation_expires_at ? new Date(deal.reservation_expires_at) : new Date();
    base.setDate(base.getDate() + days);
    setNewDate(base.toISOString().split('T')[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newDate) {
      setError('Укажите новую дату окончания брони');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      await api.post(`/deals/${deal.id}/extend-reservation`, {
        reservation_expires_at: newDate
      });
      if (onExtended) onExtended();
      onClose();
    } catch (err) {
      setError(err.message || 'Ошибка продления брони');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="relative w-full max-w-md rounded-3xl border border-amber-200 bg-white p-6 shadow-2xl space-y-5">
        <div className="flex items-start justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500 text-white shadow-xs">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">Продление срока брони</h3>
              <p className="text-xs text-slate-500">
                Текущий срок: {deal.reservation_expires_at ? new Date(deal.reservation_expires_at).toLocaleDateString('ru-RU') : '—'}
              </p>
            </div>
          </div>
          <button
            onClick={requestClose}
            className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">
              Быстро добавить дни:
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[3, 5, 7, 14].map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => handleAddDays(d)}
                  className="py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-amber-50 hover:border-amber-300 text-xs font-bold text-slate-700 transition cursor-pointer"
                >
                  +{d} дн.
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Новая дата окончания брони *
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="date"
                required
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="w-full rounded-xl border border-slate-300 bg-white pl-9 pr-3 py-2 text-xs font-bold text-slate-900 outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={requestClose}
              className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-xl bg-amber-500 hover:bg-amber-600 px-5 py-2 text-xs font-bold text-white shadow-xs transition cursor-pointer disabled:opacity-60"
            >
              {isSubmitting ? 'Сохранение...' : 'Сохранить новый срок'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
