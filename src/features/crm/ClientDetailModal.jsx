import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { api } from '../../api/client';
import {
  X,
  User,
  Phone,
  Building2,
  Calendar,
  DollarSign,
  FileText,
  FileCheck,
  CreditCard,
  History,
  Clock,
  MessageSquare,
  Send,
  UserCheck,
  MapPin,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Home,
  ChevronRight,
  ArrowLeft,
  Sparkles,
  UserPlus,
  Receipt,
  Plus
} from 'lucide-react';

export const ClientDetailModal = ({ isOpen, onClose, client, onClientUpdated }) => {
  const [activeTab, setActiveTab] = useState('INFO'); // 'INFO' or 'HISTORY'
  const [fullLead, setFullLead] = useState(null);
  const [clientDeals, setClientDeals] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [isSubmittingNote, setIsSubmittingNote] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  const loadClientDetails = async () => {
    if (!client) return;
    setIsLoading(true);
    try {
      // 1. If we have a lead ID, fetch full lead info with notes
      if (client.lead_id || client.id) {
        try {
          const leadRes = await api.get(`/leads/${client.lead_id || client.id}`);
          const leadData = leadRes.data?.lead || leadRes.lead;
          if (leadData) {
            setFullLead(leadData);
          }
        } catch (e) {
          console.log('Lead fetch skipped or not found:', e.message);
        }
      }

      // 2. Fetch all deals and filter those belonging to this client (by phone or name)
      const dealsRes = await api.get('/deals');
      const allDeals = dealsRes.data?.deals || dealsRes.deals || [];
      const matchingDeals = allDeals.filter(
        (d) =>
          (client.phone && d.lead_phone && d.lead_phone.replace(/\D/g, '') === client.phone.replace(/\D/g, '')) ||
          (client.name && d.lead_name && d.lead_name.toLowerCase().trim() === client.name.toLowerCase().trim()) ||
          (client.lead_id && d.lead_id === client.lead_id)
      );

      // Fetch detailed schedules & payments for matching deals
      const detailedDeals = await Promise.all(
        matchingDeals.map(async (d) => {
          try {
            const detailRes = await api.get(`/deals/${d.id}`);
            return detailRes.data?.deal || detailRes.deal || d;
          } catch {
            return d;
          }
        })
      );

      setClientDeals(detailedDeals);
    } catch (err) {
      console.error('Error loading full client info:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && client) {
      setActiveTab('INFO');
      setNewNote('');
      setToastMessage('');
      loadClientDetails();
    } else {
      setFullLead(null);
      setClientDeals([]);
    }
  }, [isOpen, client]);

  if (!isOpen || !client) return null;

  // Format currency
  const formatMoney = (minor) => {
    if (!minor && minor !== 0) return '0';
    return (minor / 100).toLocaleString('ru-RU');
  };

  // Format date helper
  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return `${d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })} в ${d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`;
  };

  // Handle adding new note to client history
  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!newNote.trim()) return;

    setIsSubmittingNote(true);
    try {
      const targetLeadId = fullLead?.id || client.lead_id || client.id;
      if (targetLeadId) {
        await api.post(`/leads/${targetLeadId}/notes`, { body: newNote.trim() });
      }

      // Add locally to notes list for immediate feedback
      const createdNote = {
        id: Date.now(),
        body: newNote.trim(),
        author_name: 'Вы (Менеджер)',
        created_at: new Date().toISOString(),
      };

      setFullLead((prev) => ({
        ...prev,
        notes_list: [createdNote, ...(prev?.notes_list || [])],
      }));

      setNewNote('');
      showToast('✓ Запись добавлена в историю клиента');
      if (onClientUpdated) onClientUpdated();
    } catch (err) {
      alert(err.message || 'Ошибка сохранения заметки в историю');
    } finally {
      setIsSubmittingNote(false);
    }
  };

  // Build unified chronological timeline of all events
  const buildTimeline = () => {
    const events = [];

    // 1. Initial client registration
    const regDate = fullLead?.created_at || client.created_at || clientDeals[0]?.created_at;
    if (regDate) {
      events.push({
        id: 'event-reg',
        type: 'REGISTRATION',
        title: 'Регистрация клиента в Tozon CRM',
        description: `Клиент ${client.name} добавлен в базу. Источник: ${fullLead?.source || client.source || 'Прямой контакт'}. Менеджер: ${fullLead?.responsible_user_name || client.manager_name || 'Admin'}.`,
        date: regDate,
        icon: UserPlus,
        color: 'emerald',
      });
    }

    // 2. Deals / Contracts
    clientDeals.forEach((deal) => {
      // Deal created
      events.push({
        id: `event-deal-${deal.id}`,
        type: 'DEAL',
        title: deal.status === 'SIGNED' ? `Подписание Договора №${deal.contract_number || deal.id}` : `Оформление брони на квартиру №${deal.unit_number || ''}`,
        description: `Объект: ${deal.project_name || 'ЖК'}, кв. №${deal.unit_number || '—'} (${deal.unit_rooms || '—'} комн., ${deal.unit_area || (deal.area_m2_x100 ? deal.area_m2_x100 / 100 : '—')} м²). Сумма договора: ${formatMoney(deal.final_price_minor)} ${deal.currency || 'USD'}. Форма оплаты: ${deal.payment_type === 'INSTALLMENT' ? 'Рассрочка' : deal.payment_type === 'BARTER' ? 'Бартер' : '100% оплата'}.`,
        date: deal.deal_date || deal.created_at,
        icon: FileCheck,
        color: 'blue',
      });

      // Payments from deal
      (deal.payments || []).forEach((p, pIdx) => {
        events.push({
          id: `event-pay-${deal.id}-${p.id || pIdx}`,
          type: 'PAYMENT',
          title: `Поступила оплата: ${formatMoney(p.amount_minor || p.amount * 100)} ${deal.currency || 'USD'}`,
          description: `Способ оплаты: ${p.method === 'BANK_TRANSFER' ? 'Безналичный перевод' : 'Наличные в кассу'}. Договор №${deal.contract_number || deal.id}. ${p.comment ? `Комментарий: "${p.comment}"` : ''}`,
          date: p.payment_date || p.created_at,
          icon: CreditCard,
          color: 'green',
        });
      });

      // Cancellation if cancelled
      if (deal.status === 'CANCELLED') {
        events.push({
          id: `event-cancel-${deal.id}`,
          type: 'CANCEL',
          title: `Сделка по кв. №${deal.unit_number || ''} отменена`,
          description: `Причина: ${deal.cancellation_reason || 'Не указана'}.`,
          date: deal.cancelled_at || deal.updated_at,
          icon: AlertCircle,
          color: 'rose',
        });
      }
    });

    // 3. Notes / Manager interactions
    (fullLead?.notes_list || []).forEach((n, nIdx) => {
      events.push({
        id: `event-note-${n.id || nIdx}`,
        type: 'NOTE',
        title: `Заметка менеджера (${n.author_name || fullLead?.responsible_user_name || 'Менеджер'})`,
        description: n.body,
        date: n.created_at,
        icon: MessageSquare,
        color: 'indigo',
      });
    });

    // Sort descending by date (newest first)
    return events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };

  const timeline = buildTimeline();

  // Aggregate totals
  const totalPurchases = clientDeals.reduce((sum, d) => sum + (d.final_price_minor || 0), 0) || client.totalPurchasesMinor || 0;
  const totalPaid = clientDeals.reduce((sum, d) => sum + (d.total_paid_minor || 0), 0) || client.totalPaidMinor || 0;
  const remainingDebt = Math.max(0, totalPurchases - totalPaid);

  const passportDisplay =
    fullLead?.passport_series && fullLead?.passport_number
      ? `${fullLead.passport_series} ${fullLead.passport_number}`
      : client.passport || 'Уточняется';

  return createPortal(
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs p-2 sm:p-6 flex justify-center items-center animate-in fade-in">
      <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col my-auto border border-slate-200 max-h-[92vh]">
        
        {/* Toast alert */}
        {toastMessage && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-emerald-600 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-lg animate-in slide-in-from-top-2">
            {toastMessage}
          </div>
        )}

        {/* Modal Top Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 to-cyan-500 font-black text-white text-base shadow-md shadow-blue-500/20">
              {client.name?.charAt(0) || 'К'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-extrabold tracking-tight text-white">{client.name}</h2>
                <span className="bg-blue-500/20 text-blue-300 border border-blue-400/30 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  Покупатель недвижимости
                </span>
              </div>
              <p className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                <span>{client.phone || 'Телефон не указан'}</span>
                <span>•</span>
                <span>Регистрация: {formatDate(client.created_at)}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {client.phone && (
              <a
                href={`tel:${client.phone}`}
                className="hidden sm:flex items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 px-3.5 py-1.5 text-xs font-bold text-white transition shadow-xs"
              >
                <Phone className="h-3.5 w-3.5" />
                <span>Позвонить</span>
              </a>
            )}

            <button
              onClick={onClose}
              className="rounded-xl p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center justify-between px-6 border-b border-slate-200 bg-slate-50 shrink-0">
          <div className="flex gap-2 py-2">
            <button
              onClick={() => setActiveTab('INFO')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeTab === 'INFO'
                  ? 'bg-white text-blue-700 shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <User className="h-4 w-4" />
              <span>Данные клиента</span>
            </button>

            <button
              onClick={() => setActiveTab('HISTORY')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeTab === 'HISTORY'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <History className="h-4 w-4" />
              <span>История клиента</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  activeTab === 'HISTORY' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                }`}
              >
                {timeline.length}
              </span>
            </button>
          </div>

          <div className="hidden sm:block text-xs font-medium text-slate-500">
            Менеджер: <strong className="text-slate-800">{fullLead?.responsible_user_name || client.manager_name || 'Admin'}</strong>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-white">
          {isLoading ? (
            <div className="h-64 flex items-center justify-center flex-col gap-2">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
              <span className="text-xs text-slate-500">Загрузка карточки клиента...</span>
            </div>
          ) : activeTab === 'INFO' ? (
            /* ================= VIEW 1: ДАННЫЕ КЛИЕНТА ================= */
            <div className="space-y-6 animate-in fade-in duration-200">
              
              {/* Financial KPI Highlights */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3.5">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Объем договоров</span>
                  <strong className="text-base sm:text-lg font-black text-slate-900 mt-0.5 block">
                    {formatMoney(totalPurchases)} <span className="text-xs font-semibold text-slate-500">USD/TJS</span>
                  </strong>
                </div>

                <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-3.5">
                  <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider block">Оплачено</span>
                  <strong className="text-base sm:text-lg font-black text-emerald-700 mt-0.5 block">
                    {formatMoney(totalPaid)} <span className="text-xs font-semibold text-emerald-600">USD/TJS</span>
                  </strong>
                </div>

                <div className="rounded-2xl border border-rose-200 bg-rose-50/50 p-3.5">
                  <span className="text-[11px] font-bold text-rose-700 uppercase tracking-wider block">Остаток долга</span>
                  <strong className="text-base sm:text-lg font-black text-rose-700 mt-0.5 block">
                    {formatMoney(remainingDebt)} <span className="text-xs font-semibold text-rose-600">USD/TJS</span>
                  </strong>
                </div>

                <div className="rounded-2xl border border-blue-200 bg-blue-50/50 p-3.5">
                  <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wider block">Квартир в собственности</span>
                  <strong className="text-base sm:text-lg font-black text-blue-900 mt-0.5 block">
                    {clientDeals.length || 1} <span className="text-xs font-semibold text-blue-600">объект(а)</span>
                  </strong>
                </div>
              </div>

              {/* Personal & Passport Details Grid */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4 shadow-2xs">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2.5">
                  <User className="h-4 w-4 text-blue-600" />
                  <span>Паспортные и контактные данные</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="space-y-1">
                    <span className="text-slate-500">ФИО Покупателя:</span>
                    <p className="font-bold text-slate-900 text-sm">{client.name}</p>
                  </div>

                  <div className="space-y-1">
                    <span className="text-slate-500">Основной телефон:</span>
                    <p className="font-bold text-blue-700 flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      <span>{client.phone || '—'}</span>
                    </p>
                  </div>

                  <div className="space-y-1">
                    <span className="text-slate-500">Серия и номер паспорта:</span>
                    <p className="font-mono font-bold text-slate-900">{passportDisplay}</p>
                  </div>

                  <div className="space-y-1">
                    <span className="text-slate-500">Кем выдан:</span>
                    <p className="font-medium text-slate-800">{fullLead?.passport_issued_by || 'МВД Республики Таджикистан'}</p>
                  </div>

                  <div className="space-y-1">
                    <span className="text-slate-500">Дата выдачи:</span>
                    <p className="font-medium text-slate-800">{formatDate(fullLead?.passport_issue_date)}</p>
                  </div>

                  <div className="space-y-1">
                    <span className="text-slate-500">Дата рождения:</span>
                    <p className="font-medium text-slate-800">{formatDate(fullLead?.birth_date)}</p>
                  </div>

                  <div className="sm:col-span-2 space-y-1">
                    <span className="text-slate-500">Адрес регистрации / проживания:</span>
                    <p className="font-medium text-slate-900 flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                      <span>{fullLead?.registration_address || client.address || 'Согдийская область, г. Худжанд'}</span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Real Estate Deals & Contracts */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4 shadow-2xs">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2.5">
                  <Building2 className="h-4 w-4 text-emerald-600" />
                  <span>Приобретенные объекты и договоры ({clientDeals.length})</span>
                </h3>

                {clientDeals.length === 0 ? (
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 text-xs flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Home className="h-4 w-4 text-slate-400" />
                      <span>
                        {client.projectName || 'ЖК'} (кв. №{client.unitNumber || '—'})
                      </span>
                    </div>
                    <span className="font-bold text-slate-900">{formatMoney(client.totalPurchasesMinor)} USD/TJS</span>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {clientDeals.map((d) => (
                      <div
                        key={d.id}
                        className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-2 hover:border-blue-300 transition"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-black text-slate-900 text-xs">
                              {d.project_name || 'ЖК'} — кв. №{d.unit_number}
                            </span>
                            <span className="text-[11px] font-semibold text-slate-500">
                              ({d.unit_rooms || '—'} комн., {d.unit_area || (d.area_m2_x100 ? d.area_m2_x100 / 100 : '—')} м²)
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md">
                              Договор № {d.contract_number || d.id}
                            </span>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                                d.status === 'SIGNED'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : d.status === 'RESERVED'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-slate-200 text-slate-700'
                              }`}
                            >
                              {d.status === 'SIGNED' ? 'Подписан' : d.status === 'RESERVED' ? 'Бронь' : d.status}
                            </span>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs pt-1">
                          <div>
                            <span className="text-slate-500 block text-[11px]">Стоимость:</span>
                            <strong className="text-slate-900">{formatMoney(d.final_price_minor)} {d.currency}</strong>
                          </div>
                          <div>
                            <span className="text-slate-500 block text-[11px]">Оплачено:</span>
                            <strong className="text-emerald-700">{formatMoney(d.total_paid_minor)} {d.currency}</strong>
                          </div>
                          <div>
                            <span className="text-slate-500 block text-[11px]">Форма оплаты:</span>
                            <span className="font-semibold text-slate-800">
                              {d.payment_type === 'INSTALLMENT' ? 'Рассрочка' : d.payment_type === 'BARTER' ? 'Бартер' : '100% оплата'}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-500 block text-[11px]">Дата сделки:</span>
                            <span className="text-slate-700">{formatDate(d.deal_date || d.created_at)}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ================= PROMINENT BOTTOM BUTTON: OPEN CLIENT HISTORY ================= */}
              <div className="pt-2">
                <button
                  onClick={() => setActiveTab('HISTORY')}
                  className="w-full flex items-center justify-between p-4 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-800 text-white font-bold shadow-lg shadow-blue-500/20 hover:shadow-xl transition-all duration-200 cursor-pointer group"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/20 backdrop-blur-xs text-white">
                      <History className="h-6 w-6" />
                    </div>
                    <div className="text-left">
                      <div className="text-sm font-black flex items-center gap-2 text-white">
                        <span>История клиента</span>
                        <span className="text-[11px] font-bold bg-white/25 text-white px-2 py-0.5 rounded-full">
                          {timeline.length} записей
                        </span>
                      </div>
                      <div className="text-xs text-blue-100 font-normal mt-0.5">
                        Открыть полную хронологию звонков, платежей, договоров и заметок
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs font-black text-white bg-white/20 px-4 py-2 rounded-xl group-hover:bg-white/30 transition shadow-xs">
                    <span>Открыть историю</span>
                    <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </div>
                </button>
              </div>

            </div>
          ) : (
            /* ================= VIEW 2: ИСТОРИЯ КЛИЕНТА / ТАЙМЛАЙН ================= */
            <div className="space-y-6 animate-in fade-in duration-200">
              
              {/* Back to Client Profile top prompt */}
              <div className="flex items-center justify-between bg-slate-50 p-3 rounded-2xl border border-slate-200">
                <button
                  onClick={() => setActiveTab('INFO')}
                  className="flex items-center gap-1.5 text-xs font-bold text-blue-700 hover:text-blue-900 transition cursor-pointer"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span>← Вернуться к данным клиента</span>
                </button>

                <div className="text-xs text-slate-500 font-semibold">
                  Хронология взаимодействий: <strong className="text-slate-900">{timeline.length} событий</strong>
                </div>
              </div>

              {/* Add Note Form */}
              <form onSubmit={handleAddNote} className="rounded-2xl border border-blue-200 bg-blue-50/40 p-4 space-y-3 shadow-2xs">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <MessageSquare className="h-4 w-4 text-blue-600" />
                    <span>Добавить запись в историю клиента</span>
                  </label>
                  <span className="text-[11px] text-slate-500">Результат звонка, встреча или договоренность</span>
                </div>

                <div className="relative">
                  <textarea
                    rows={2}
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder="Например: Созвонились с клиентом. Договорились о встрече в офисе в понедельник в 14:00 для обсуждения графика платежей..."
                    className="w-full rounded-xl border border-slate-300 bg-white p-3 text-xs text-slate-900 placeholder-slate-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition"
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={isSubmittingNote || !newNote.trim()}
                    className="flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 text-xs font-bold shadow-md transition cursor-pointer"
                  >
                    <Send className="h-3.5 w-3.5" />
                    <span>{isSubmittingNote ? 'Сохранение...' : 'Сохранить запись в историю'}</span>
                  </button>
                </div>
              </form>

              {/* Timeline list */}
              <div className="space-y-4">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                  Хронологическая лента событий
                </h4>

                {timeline.length === 0 ? (
                  <div className="text-center py-10 border border-dashed border-slate-200 rounded-2xl text-slate-400 text-xs">
                    История взаимодействий пока пуста
                  </div>
                ) : (
                  <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                    {timeline.map((item, idx) => {
                      const IconComponent = item.icon || Clock;
                      return (
                        <div key={item.id || idx} className="relative group">
                          {/* Dot / Icon indicator */}
                          <div
                            className={`absolute -left-6 top-0 flex h-6 w-6 items-center justify-center rounded-full ring-4 ring-white ${
                              item.color === 'green' || item.color === 'emerald'
                                ? 'bg-emerald-600 text-white'
                                : item.color === 'blue'
                                ? 'bg-blue-600 text-white'
                                : item.color === 'indigo'
                                ? 'bg-indigo-600 text-white'
                                : item.color === 'rose'
                                ? 'bg-rose-600 text-white'
                                : 'bg-slate-600 text-white'
                            }`}
                          >
                            <IconComponent className="h-3 w-3" />
                          </div>

                          {/* Event card */}
                          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs hover:border-slate-300 transition space-y-1.5 ml-2">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <h5 className="font-extrabold text-slate-900 text-xs">{item.title}</h5>
                              <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {formatDateTime(item.date)}
                              </span>
                            </div>

                            <p className="text-xs text-slate-700 leading-relaxed font-normal whitespace-pre-wrap">
                              {item.description}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-3.5 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500">
            {activeTab === 'INFO' ? (
              <span>Нажмите «История клиента» для просмотра таймлайна звонков и оплат</span>
            ) : (
              <span>Все записи сохраняются в карточке клиента</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {activeTab === 'HISTORY' ? (
              <button
                onClick={() => setActiveTab('INFO')}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 transition cursor-pointer"
              >
                К данным клиента
              </button>
            ) : (
              <button
                onClick={() => setActiveTab('HISTORY')}
                className="px-4 py-2 rounded-xl text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100 transition cursor-pointer flex items-center gap-1.5"
              >
                <History className="h-3.5 w-3.5" />
                <span>История клиента</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white transition cursor-pointer"
            >
              Закрыть
            </button>
          </div>
        </div>

      </div>
    </div>,
    document.body
  );
};
