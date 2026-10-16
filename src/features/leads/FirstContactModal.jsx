import React, { useState } from 'react';
import { api } from '../../api/client';
import { X, PhoneCall, CheckCircle2, AlertCircle, Clock } from 'lucide-react';

export const FirstContactModal = ({ isOpen, onClose, lead, onRecorded }) => {
  const [outcome, setOutcome] = useState('REACHED');
  const [comment, setComment] = useState('');
  const [status, setStatus] = useState('IN_PROGRESS');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen || !lead) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      await api.post(`/leads/${lead.id}/first-contact`, {
        outcome,
        comment: comment.trim() || undefined,
        status: status || undefined
      });

      if (onRecorded) onRecorded();
      onClose();
    } catch (err) {
      setError(err.message || 'Ошибка фиксации первого контакта');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700">
              <PhoneCall className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">Зафиксировать контакт</h3>
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
              <span>Клиент:</span>
              <span className="font-bold text-slate-900">{lead.full_name}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Телефон:</span>
              <span className="font-semibold text-slate-800">{lead.phone || '—'}</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Результат звонка / связи <span className="text-rose-500">*</span>
            </label>
            <select
              value={outcome}
              onChange={(e) => {
                setOutcome(e.target.value);
                if (e.target.value === 'REACHED') setStatus('IN_PROGRESS');
                else setStatus('NEW');
              }}
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-900 outline-none focus:border-tozon-blue focus:ring-4 focus:ring-tozon-blue/10 cursor-pointer"
            >
              <option value="REACHED">Успешный контакт (клиент ответил)</option>
              <option value="NO_ANSWER">Не отвечает / Сброс</option>
              <option value="CALLBACK_REQUESTED">Просьба перезвонить позже</option>
              <option value="INVALID_NUMBER">Неверный номер / Ошибка связи</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Стадия воронки после контакта
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-900 outline-none focus:border-tozon-blue focus:ring-4 focus:ring-tozon-blue/10 cursor-pointer"
            >
              <option value="NEW">Оставить в "Новый" (требует повторной связи)</option>
              <option value="IN_PROGRESS">Перевести в "В работе" (квалификация)</option>
              <option value="NEGOTIATION">Перевести в "Переговоры" (подбор)</option>
              <option value="LOST">Перевести в "Отказ" (неактуально)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Комментарий менеджера
            </label>
            <textarea
              rows={2}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Краткие детали разговора, пожелания клиента по этажу/бюджету..."
              className="w-full rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-900 outline-none focus:border-tozon-blue focus:ring-4 focus:ring-tozon-blue/10 resize-none"
            />
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
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-xs font-bold text-white shadow-xs transition cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? 'Сохранение...' : 'Зафиксировать контакт'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
