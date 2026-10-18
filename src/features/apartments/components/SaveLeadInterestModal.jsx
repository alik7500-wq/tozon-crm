import React, { useState, useEffect } from 'react';
import { api } from '../../../api/client';
import {
  X,
  Heart,
  User,
  Search,
  Calendar,
  Clock,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Building2,
  Home,
  MessageSquare,
  Tag,
  ArrowRight
} from 'lucide-react';

export const SaveLeadInterestModal = ({
  isOpen,
  onClose,
  unit,
  currency = 'USD',
  onSaved
}) => {
  const [leads, setLeads] = useState([]);
  const [isLoadingLeads, setIsLoadingLeads] = useState(false);
  const [selectedLeadId, setSelectedLeadId] = useState('');
  const [leadSearch, setLeadSearch] = useState('');
  const [priority, setPriority] = useState('HIGH');
  const [comment, setComment] = useState('');
  
  // Default next contact date: 3 days ahead
  const getDefaultDate = () => {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    return d.toISOString().split('T')[0];
  };

  const [nextContactDate, setNextContactDate] = useState(getDefaultDate());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchLeads();
      setErrorMessage('');
    }
  }, [isOpen]);

  const fetchLeads = async () => {
    try {
      setIsLoadingLeads(true);
      const res = await api.get('/leads');
      const list = res.data?.leads || res.leads || [];
      // Filter out archived or lost leads
      const activeLeads = list.filter((l) => l.status !== 'LOST');
      setLeads(activeLeads);
      if (activeLeads.length > 0 && !selectedLeadId) {
        setSelectedLeadId(String(activeLeads[0].id));
      }
    } catch (err) {
      console.error('Error fetching leads:', err);
      setErrorMessage('Не удалось загрузить список клиентов');
    } finally {
      setIsLoadingLeads(false);
    }
  };

  if (!isOpen || !unit) return null;

  const filteredLeads = leads.filter((l) => {
    if (!leadSearch) return true;
    const q = leadSearch.toLowerCase();
    return (
      (l.full_name && l.full_name.toLowerCase().includes(q)) ||
      (l.phone && l.phone.toLowerCase().includes(q))
    );
  });

  const selectedLead = leads.find((l) => String(l.id) === String(selectedLeadId));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedLeadId) {
      setErrorMessage('Пожалуйста, выберите клиента');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage('');

      await api.post(`/leads/${selectedLeadId}/interested-units`, {
        unit_id: unit.id,
        priority,
        comment: comment.trim(),
        next_contact_date: nextContactDate || null
      });

      if (onSaved) {
        onSaved({
          unitId: unit.id,
          leadId: selectedLeadId,
          priority,
          leadName: selectedLead?.full_name
        });
      }
      onClose();
    } catch (err) {
      console.error('Error saving lead interest:', err);
      setErrorMessage(err.message || 'Ошибка сохранения интереса клиента');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="relative w-full max-w-lg rounded-3xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-purple-50/70">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-purple-600 text-white shadow-md">
              <Heart className="h-5 w-5 fill-white" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">
                Зафиксировать интерес клиента
              </h3>
              <p className="text-xs text-purple-800 mt-0.5">
                Привязка квартиры к лиду с приоритетом и датой следующего контакта
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Selected Unit Brief Strip */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-200/70 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <Home className="h-4 w-4 text-purple-600" />
            <span className="font-bold text-slate-900">
              Кв. №{unit.unit_number} ({unit.rooms === 0 ? 'Студия' : `${unit.rooms}-комн.`})
            </span>
            <span className="text-slate-400">•</span>
            <span className="text-slate-600">{unit.building_name}, {unit.floor_number} этаж</span>
          </div>
          <div className="font-extrabold text-blue-700">
            {unit.totalPrice > 0 ? `${unit.totalPrice.toLocaleString()} ${currency}` : '—'}
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {errorMessage && (
            <div className="flex items-center gap-2 rounded-xl bg-rose-50 border border-rose-200 p-3 text-rose-800 font-semibold">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Lead Picker */}
          <div>
            <label className="block text-slate-700 font-bold mb-1.5 flex items-center justify-between">
              <span>Клиент / Лид</span>
              <span className="text-slate-400 font-normal">Активные клиенты CRM</span>
            </label>

            {/* Quick search input */}
            <div className="relative mb-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Поиск по имени или телефону..."
                value={leadSearch}
                onChange={(e) => setLeadSearch(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-8 pr-3 py-1.5 text-xs text-slate-900 outline-none focus:border-purple-500 focus:bg-white transition"
              />
            </div>

            <select
              value={selectedLeadId}
              onChange={(e) => setSelectedLeadId(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-purple-500 cursor-pointer"
              required
            >
              {filteredLeads.length === 0 ? (
                <option value="">Лиды не найдены</option>
              ) : (
                filteredLeads.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.full_name} ({l.phone}) — {l.status}
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Priority Picker */}
          <div>
            <label className="block text-slate-700 font-bold mb-1.5">
              Приоритет интереса
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setPriority('HIGH')}
                className={`py-2 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  priority === 'HIGH'
                    ? 'bg-rose-50 border-rose-300 text-rose-700 shadow-2xs ring-1 ring-rose-400'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span className="h-2 w-2 rounded-full bg-rose-500"></span>
                <span>Высокий (Топ)</span>
              </button>

              <button
                type="button"
                onClick={() => setPriority('MEDIUM')}
                className={`py-2 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  priority === 'MEDIUM'
                    ? 'bg-amber-50 border-amber-300 text-amber-700 shadow-2xs ring-1 ring-amber-400'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span className="h-2 w-2 rounded-full bg-amber-500"></span>
                <span>Средний</span>
              </button>

              <button
                type="button"
                onClick={() => setPriority('LOW')}
                className={`py-2 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  priority === 'LOW'
                    ? 'bg-blue-50 border-blue-300 text-blue-700 shadow-2xs ring-1 ring-blue-400'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span className="h-2 w-2 rounded-full bg-blue-500"></span>
                <span>Низкий</span>
              </button>
            </div>
          </div>

          {/* Comment */}
          <div>
            <label className="block text-slate-700 font-bold mb-1.5 flex items-center justify-between">
              <span>Комментарий менеджера</span>
              <span className="text-slate-400 font-normal">Что понравилось, условия</span>
            </label>
            <textarea
              rows={2}
              placeholder="Например: Клиент выбирает между 2-комнатными, понравился вид на проспект, ждет решения банка..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-900 outline-none focus:border-purple-500 focus:bg-white transition"
            />
          </div>

          {/* Next Contact Date */}
          <div>
            <label className="block text-slate-700 font-bold mb-1.5 flex items-center justify-between">
              <span>Дата следующего контакта</span>
              <span className="text-purple-700 font-semibold text-[11px] flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>Авто-создание задачи</span>
              </span>
            </label>
            <div className="relative">
              <input
                type="date"
                value={nextContactDate}
                onChange={(e) => setNextContactDate(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-900 outline-none focus:border-purple-500 cursor-pointer"
              />
            </div>
            <p className="mt-1 text-[11px] text-slate-500">
              В расписании менеджера появится напоминание связаться с клиентом по данной квартире.
            </p>
          </div>

          {/* Actions */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold transition cursor-pointer"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !selectedLeadId}
              className="flex items-center gap-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold px-5 py-2 text-xs shadow-md transition disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>Сохранение...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Сохранить интерес</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
