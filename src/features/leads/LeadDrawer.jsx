import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import {
  X,
  User,
  Phone,
  Building2,
  Calendar,
  DollarSign,
  FileText,
  MessageSquare,
  Send,
  Edit2,
  Clock,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  FileCheck,
  ChevronRight,
  Sparkles,
  Layers,
  Check,
  Trash2
} from 'lucide-react';

export const LeadDrawer = ({ isOpen, onClose, leadId, onLeadUpdated, onEditLead }) => {
  const [lead, setLead] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('notes'); // 'notes', 'info', 'deals'
  const [newNote, setNewNote] = useState('');
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const fetchLeadDetails = async () => {
    if (!leadId) return;
    setIsLoading(true);
    try {
      const res = await api.get(`/leads/${leadId}`);
      const data = res.data?.lead || res.lead || res;
      setLead(data);
    } catch (err) {
      console.error('Ошибка загрузки лида:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && leadId) {
      fetchLeadDetails();
      setToastMessage('');
    }
  }, [isOpen, leadId]);

  if (!isOpen || !leadId) return null;

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  const getStatusName = (status) => {
    switch (status) {
      case 'NEW': return 'Новый';
      case 'IN_PROGRESS': return 'В работе';
      case 'NEGOTIATION': return 'Переговоры';
      case 'WON': return 'Сделка (WON)';
      case 'LOST': return 'Отказ (LOST)';
      default: return status;
    }
  };

  const handleStatusChange = async (newStatus) => {
    if (!lead || lead.status === newStatus) return;

    const prevStatus = lead.status;
    // Optimistic UI update
    setLead((prev) => ({ ...prev, status: newStatus }));
    setIsUpdatingStatus(true);

    try {
      const res = await api.patch(`/leads/${leadId}/status`, { status: newStatus });
      const updatedLead = res.data?.lead || res.lead || res;
      if (updatedLead && updatedLead.id) {
        setLead((prev) => ({ ...prev, ...updatedLead }));
      }
      showToast(`✓ Стадия воронки изменена на «${getStatusName(newStatus)}»`);
      if (onLeadUpdated) onLeadUpdated();
    } catch (err) {
      setLead((prev) => ({ ...prev, status: prevStatus }));
      alert(err.message || 'Ошибка обновления стадии воронки');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleAddNote = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!newNote || !newNote.trim()) return;

    const noteBody = newNote.trim();
    setIsAddingNote(true);

    try {
      const res = await api.post(`/leads/${leadId}/notes`, { body: noteBody });
      const savedNote = res.data?.note || res.note || res;

      const fullNote = savedNote && savedNote.id ? savedNote : {
        id: Date.now(),
        lead_id: leadId,
        body: noteBody,
        author_name: 'Менеджер',
        created_at: new Date().toISOString(),
      };

      setLead((prev) => ({
        ...prev,
        notes_list: [fullNote, ...(prev?.notes_list || [])],
      }));
      setNewNote('');
      showToast('✓ Заметка успешно добавлена в историю!');
      if (onLeadUpdated) onLeadUpdated();
    } catch (err) {
      alert(err.message || 'Ошибка добавления заметки');
    } finally {
      setIsAddingNote(false);
    }
  };

  const handleQuickChip = (text) => {
    setNewNote((prev) => (prev ? `${prev} • ${text}` : text));
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'NEW':
        return { label: 'Новый', bg: 'bg-blue-50 text-blue-700 border-blue-200' };
      case 'IN_PROGRESS':
        return { label: 'В работе', bg: 'bg-amber-50 text-amber-700 border-amber-200' };
      case 'NEGOTIATION':
        return { label: 'Переговоры', bg: 'bg-purple-50 text-purple-700 border-purple-200' };
      case 'WON':
        return { label: 'Сделка (WON)', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
      case 'LOST':
        return { label: 'Отказ (LOST)', bg: 'bg-rose-50 text-rose-700 border-rose-200' };
      default:
        return { label: status, bg: 'bg-slate-50 text-slate-700 border-slate-200' };
    }
  };

  const stages = [
    {
      key: 'NEW',
      label: 'Новый',
      normalClass: 'bg-blue-50/70 border-blue-200 text-blue-800 hover:bg-blue-100 hover:border-blue-400',
      activeClass: 'bg-blue-600 border-blue-600 text-white shadow-md ring-2 ring-blue-300',
    },
    {
      key: 'IN_PROGRESS',
      label: 'В работе',
      normalClass: 'bg-amber-50/70 border-amber-200 text-amber-800 hover:bg-amber-100 hover:border-amber-400',
      activeClass: 'bg-amber-500 border-amber-500 text-white shadow-md ring-2 ring-amber-300',
    },
    {
      key: 'NEGOTIATION',
      label: 'Переговоры',
      normalClass: 'bg-purple-50/70 border-purple-200 text-purple-800 hover:bg-purple-100 hover:border-purple-400',
      activeClass: 'bg-purple-600 border-purple-600 text-white shadow-md ring-2 ring-purple-300',
    },
    {
      key: 'WON',
      label: 'Сделка',
      normalClass: 'bg-emerald-50/70 border-emerald-200 text-emerald-800 hover:bg-emerald-100 hover:border-emerald-400',
      activeClass: 'bg-emerald-600 border-emerald-600 text-white shadow-md ring-2 ring-emerald-300',
    },
    {
      key: 'LOST',
      label: 'Отказ',
      normalClass: 'bg-rose-50/70 border-rose-200 text-rose-800 hover:bg-rose-100 hover:border-rose-400',
      activeClass: 'bg-rose-600 border-rose-600 text-white shadow-md ring-2 ring-rose-300',
    },
  ];

  const notesCount = lead?.notes_list?.length || 0;
  const dealsCount = lead?.deals_list?.length || 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-900/40 backdrop-blur-xs animate-in fade-in">
      <div className="relative h-full w-full max-w-xl bg-white shadow-2xl flex flex-col border-l border-slate-200 animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 p-5 bg-slate-50/70">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-slate-900">{lead?.full_name || 'Загрузка...'}</h3>
              {lead && (
                <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${getStatusBadge(lead.status).bg}`}>
                  {getStatusBadge(lead.status).label}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Тел: <strong className="text-slate-700">{lead?.phone}</strong> {lead?.secondary_phone && `• Доп: ${lead.secondary_phone}`}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {lead && (
              <button
                type="button"
                onClick={() => onEditLead(lead)}
                className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-2xs transition cursor-pointer"
              >
                <Edit2 className="h-3.5 w-3.5" />
                <span>Редактировать</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Toast Alert */}
        {toastMessage && (
          <div className="bg-emerald-50 border-b border-emerald-200 px-5 py-2.5 text-xs font-bold text-emerald-800 flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{toastMessage}</span>
          </div>
        )}

        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="flex flex-col items-center gap-2">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-purple-600 border-t-transparent" />
              <span className="text-xs text-slate-500">Загрузка данных лида...</span>
            </div>
          </div>
        ) : lead ? (
          <div className="flex-1 overflow-y-auto flex flex-col">
            {/* Quick Status Bar */}
            <div className="p-5 border-b border-slate-200 bg-white space-y-2.5">
              <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                <span className="flex items-center gap-1.5 text-purple-700">
                  <Sparkles className="h-4 w-4" />
                  <span>Стадия воронки продаж:</span>
                </span>
                <span className="text-[11px] text-slate-400 font-normal">Нажмите кнопку для переключения</span>
              </div>

              {/* 5 Stage Buttons */}
              <div className="grid grid-cols-5 gap-2">
                {stages.map((st) => {
                  const isActive = lead.status === st.key;
                  return (
                    <button
                      key={st.key}
                      type="button"
                      onClick={() => handleStatusChange(st.key)}
                      disabled={isUpdatingStatus}
                      className={`py-2 px-1 rounded-xl text-xs font-bold transition-all text-center flex flex-col items-center justify-center gap-0.5 border cursor-pointer select-none active:scale-95 ${
                        isActive
                          ? st.activeClass
                          : st.normalClass
                      }`}
                    >
                      <span className="leading-tight">{st.label}</span>
                      {isActive && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-slate-200 px-5 bg-slate-50/50 gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('notes')}
                className={`py-3 px-3 text-xs font-bold transition border-b-2 flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'notes'
                    ? 'border-purple-600 text-purple-700 bg-white shadow-2xs'
                    : 'border-transparent text-slate-500 hover:text-slate-900'
                }`}
              >
                <MessageSquare className="h-3.5 w-3.5 text-purple-600" />
                <span>Заметки менеджера</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${activeTab === 'notes' ? 'bg-purple-100 text-purple-800' : 'bg-slate-200 text-slate-600'}`}>
                  {notesCount}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('info')}
                className={`py-3 px-3 text-xs font-bold transition border-b-2 flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'info'
                    ? 'border-purple-600 text-purple-700 bg-white shadow-2xs'
                    : 'border-transparent text-slate-500 hover:text-slate-900'
                }`}
              >
                <User className="h-3.5 w-3.5" />
                <span>Паспорт и данные</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('deals')}
                className={`py-3 px-3 text-xs font-bold transition border-b-2 flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'deals'
                    ? 'border-purple-600 text-purple-700 bg-white shadow-2xs'
                    : 'border-transparent text-slate-500 hover:text-slate-900'
                }`}
              >
                <FileCheck className="h-3.5 w-3.5" />
                <span>Сделки</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${activeTab === 'deals' ? 'bg-purple-100 text-purple-800' : 'bg-slate-200 text-slate-600'}`}>
                  {dealsCount}
                </span>
              </button>
            </div>

            {/* Tab Body */}
            <div className="p-6 space-y-6 flex-1">
              {/* TAB 1: NOTES & TIMELINE */}
              {activeTab === 'notes' && (
                <div className="space-y-4">
                  {/* Quick templates chips */}
                  <div>
                    <span className="text-[11px] font-semibold text-slate-500 block mb-1.5">
                      Быстрые шаблоны заметок (кликните для вставки):
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        '📞 Успешный созвон',
                        '🤝 Встреча в офисе',
                        '⏳ Перезвонить через 3 дня',
                        '📍 Смотрит планировку 2к',
                        '💰 Ждет одобрения бюджета',
                        '❌ Отказ: дорого',
                      ].map((chip) => (
                        <button
                          key={chip}
                          type="button"
                          onClick={() => handleQuickChip(chip)}
                          className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-700 hover:bg-purple-50 hover:border-purple-300 hover:text-purple-700 transition cursor-pointer shadow-2xs"
                        >
                          {chip}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Add Note Form */}
                  <form onSubmit={handleAddNote} className="space-y-2.5">
                    <div className="relative">
                      <textarea
                        rows={3}
                        placeholder="Напишите комментарий, результат звонка или договоренность (Enter для быстрой отправки)..."
                        value={newNote}
                        onChange={(e) => setNewNote(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleAddNote();
                          }
                        }}
                        className="w-full rounded-xl border border-slate-300 bg-white p-3 text-xs outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200 shadow-2xs resize-none"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-slate-400">Нажмите Enter для быстрой отправки</span>
                      <button
                        type="submit"
                        disabled={isAddingNote || !newNote.trim()}
                        className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white shadow-md hover:bg-blue-700 transition disabled:opacity-50 cursor-pointer"
                      >
                        <Send className="h-3.5 w-3.5" />
                        <span>{isAddingNote ? 'Сохранение...' : 'Добавить заметку'}</span>
                      </button>
                    </div>
                  </form>

                  {/* Timeline History */}
                  <div className="space-y-3 pt-2">
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Хронология общения ({notesCount})
                    </h4>

                    {lead.notes_list && lead.notes_list.length > 0 ? (
                      <div className="space-y-2.5">
                        {lead.notes_list.map((note) => (
                          <div
                            key={note.id}
                            className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs space-y-1.5 hover:border-purple-200 transition"
                          >
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="font-bold text-slate-900 flex items-center gap-1.5">
                                <div className="h-5 w-5 rounded-full bg-purple-100 text-purple-700 font-bold flex items-center justify-center text-[10px]">
                                  {(note.author_name || 'М')[0]}
                                </div>
                                {note.author_name || 'Менеджер'}
                              </span>
                              <span className="text-slate-400 flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {new Date(note.created_at).toLocaleString('ru-RU', {
                                  day: 'numeric',
                                  month: 'short',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                            </div>
                            <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap pl-6">
                              {note.body}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 bg-slate-50 border border-dashed border-slate-200 rounded-xl space-y-2">
                        <MessageSquare className="h-8 w-8 text-slate-300 mx-auto" />
                        <p className="text-xs font-medium text-slate-500">Заметок пока нет</p>
                        <p className="text-[11px] text-slate-400">Напишите результат первого звонка выше</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 2: PASSPORT & PREFERENCES */}
              {activeTab === 'info' && (
                <div className="space-y-4">
                  {/* Preferences */}
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Потребности клиента</h4>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="text-slate-400 block">Интересующий ЖК:</span>
                        <strong className="text-slate-900">{lead.interested_project_name || 'Не выбран'}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Комнатность:</span>
                        <strong className="text-slate-900">
                          {lead.desired_rooms === 0 ? 'Студия' : lead.desired_rooms ? `${lead.desired_rooms}-комнатная` : 'Любая'}
                        </strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Бюджет:</span>
                        <strong className="text-slate-900">
                          {lead.budget_max_minor ? `${(lead.budget_max_minor / 100).toLocaleString()} TJS` : 'Не указан'}
                        </strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Источник:</span>
                        <strong className="text-slate-900">{lead.source}</strong>
                      </div>
                    </div>
                  </div>

                  {/* Passport Data Block */}
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Паспортные данные</h4>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="text-slate-400 block">Серия и номер:</span>
                        <strong className="text-slate-900">
                          {lead.passport_series || ''} {lead.passport_number || 'Не заполнен'}
                        </strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Дата рождения:</span>
                        <strong className="text-slate-900">
                          {lead.birth_date ? new Date(lead.birth_date).toLocaleDateString('ru-RU') : '—'}
                        </strong>
                      </div>
                      <div className="col-span-2">
                        <span className="text-slate-400 block">Кем и когда выдан:</span>
                        <strong className="text-slate-900">
                          {lead.passport_issued_by || '—'} {lead.passport_issue_date && `от ${new Date(lead.passport_issue_date).toLocaleDateString('ru-RU')}`}
                        </strong>
                      </div>
                      <div className="col-span-2">
                        <span className="text-slate-400 block">Адрес регистрации (прописка):</span>
                        <strong className="text-slate-900">{lead.registration_address || '—'}</strong>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: DEALS */}
              {activeTab === 'deals' && (
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Связанные сделки и договоры ({dealsCount})
                  </h4>

                  {lead.deals_list && lead.deals_list.length > 0 ? (
                    <div className="space-y-2">
                      {lead.deals_list.map((d) => (
                        <div key={d.id} className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/40 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-900">
                              Договор №{d.contract_number}
                            </span>
                            <span className="text-xs font-bold text-emerald-700 bg-white px-2 py-0.5 rounded-md border border-emerald-200">
                              {d.status}
                            </span>
                          </div>
                          <div className="text-xs text-slate-600">
                            Объект: <strong>{d.project_name}</strong> • Квартира №{d.unit_number}
                          </div>
                          <div className="text-xs font-extrabold text-blue-700">
                            Сумма: {(d.final_price_minor / 100).toLocaleString()} {d.currency}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 bg-slate-50 border border-dashed border-slate-200 rounded-xl space-y-2">
                      <FileCheck className="h-8 w-8 text-slate-300 mx-auto" />
                      <p className="text-xs font-medium text-slate-500">Сделок пока не оформлено</p>
                      <p className="text-[11px] text-slate-400">Сделку можно оформить прямо из шахматки квартир</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};
