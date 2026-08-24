import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { useModalDismiss } from '../../hooks/useModalDismiss';
import {
  X,
  Clock,
  User,
  Phone,
  Calendar,
  Building2,
  CheckCircle2,
  AlertCircle,
  Plus,
  Search,
  DollarSign,
  FileText,
  ShieldCheck,
  Check,
  UserCheck
} from 'lucide-react';

export const ReserveApartmentModal = ({
  isOpen,
  onClose,
  unit,
  currency = 'USD',
  onReserved
}) => {
  const [activeClientTab, setActiveClientTab] = useState('existing'); // 'existing' or 'new'
  const [leads, setLeads] = useState([]);
  const [searchLead, setSearchLead] = useState('');
  const [selectedLead, setSelectedLead] = useState(null);
  const [isLoadingLeads, setIsLoadingLeads] = useState(false);

  // New Client Form
  const [newClientName, setNewClientName] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');

  // Reservation Terms
  const [reservationDays, setReservationDays] = useState(3);
  const [customDate, setCustomDate] = useState('');
  const [isCustomDate, setIsCustomDate] = useState(false);

  // Price & Deposit
  const areaM2 = unit ? (unit.area_m2_x100 / 100) : 50;
  const defaultPricePerM2 = unit?.price_per_m2_minor ? unit.price_per_m2_minor / 100 : 500;
  const [pricePerM2, setPricePerM2] = useState(defaultPricePerM2);
  const [depositAmount, setDepositAmount] = useState('');
  const [comment, setComment] = useState('');

  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (unit?.price_per_m2_minor) {
      setPricePerM2(unit.price_per_m2_minor / 100);
    }
  }, [unit]);

  useEffect(() => {
    if (!isOpen) return;
    const fetchLeads = async () => {
      setIsLoadingLeads(true);
      try {
        const res = await api.get('/leads');
        setLeads(res.data?.leads || res.leads || []);
      } catch (err) {
        console.error('Error loading leads:', err);
      } finally {
        setIsLoadingLeads(false);
      }
    };
    fetchLeads();
  }, [isOpen]);

  const isDirty = Boolean(
    selectedLead ||
    (activeClientTab === 'new' && (newClientName.trim() || newClientPhone.trim())) ||
    comment.trim() ||
    depositAmount
  );

  const { requestClose } = useModalDismiss({
    isOpen,
    onClose,
    isDirty,
    confirmMessage: 'Введенные данные бронирования не сохранены. Закрыть окно?'
  });

  if (!isOpen || !unit) return null;

  // Calculate Expiration Date
  const getCalculatedExpiryDate = () => {
    if (isCustomDate && customDate) {
      return customDate;
    }
    const d = new Date();
    d.setDate(d.getDate() + Number(reservationDays || 3));
    return d.toISOString().split('T')[0];
  };

  const expiryDate = getCalculatedExpiryDate();
  const calculatedTotalPrice = Math.round(areaM2 * (parseFloat(pricePerM2) || 0));

  const filteredLeads = leads.filter((l) => {
    if (!searchLead) return true;
    const s = searchLead.toLowerCase();
    return (
      (l.full_name && l.full_name.toLowerCase().includes(s)) ||
      (l.phone && l.phone.toLowerCase().includes(s))
    );
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    let leadId = selectedLead?.id;

    if (activeClientTab === 'new') {
      if (!newClientName.trim() || !newClientPhone.trim()) {
        setError('Укажите ФИО и номер телефона нового клиента');
        return;
      }

      setIsSubmitting(true);
      try {
        const leadRes = await api.post('/leads', {
          full_name: newClientName.trim(),
          phone: newClientPhone.trim(),
          source: 'DIRECT',
          status: 'NEGOTIATION',
          notes: comment ? `Бронь кв. №${unit.unit_number}: ${comment}` : `Бронь кв. №${unit.unit_number}`,
          interested_project_id: unit.floors?.sections?.buildings?.projects?.id || unit.project_id
        });
        const createdLead = leadRes.data?.lead || leadRes.lead;
        leadId = createdLead?.id;
      } catch (err) {
        setError(err.message || 'Ошибка создания клиента');
        setIsSubmitting(false);
        return;
      }
    } else {
      if (!leadId) {
        setError('Выберите клиента из базы или создайте нового');
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const basePriceMinor = Math.round(calculatedTotalPrice * 100);
      const depositMinor = depositAmount ? Math.round(parseFloat(depositAmount) * 100) : 0;

      const payload = {
        unit_id: unit.id,
        lead_id: leadId,
        status: 'RESERVED',
        payment_type: 'FULL',
        base_price_minor: basePriceMinor,
        final_price_minor: basePriceMinor,
        discount_minor: 0,
        down_payment_minor: depositMinor,
        reservation_expires_at: expiryDate,
        deal_date: new Date().toISOString().split('T')[0],
        notes: comment
      };

      const res = await api.post('/deals', payload);
      const deal = res.data?.deal || res.deal;

      if (onReserved) {
        onReserved(deal);
      }
      onClose();
    } catch (err) {
      setError(err.message || 'Ошибка бронирования квартиры');
    } finally {
      setIsSubmitting(false);
    }
  };

  const projectName = unit?.floors?.sections?.buildings?.projects?.name || unit?.project_name || 'ЖК';
  const buildingName = unit?.floors?.sections?.buildings?.name || unit?.building_name || 'Корпус';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="relative w-full max-w-4xl rounded-3xl border border-amber-200 bg-white p-4 sm:p-5 shadow-2xl space-y-3.5 max-h-[96vh] flex flex-col justify-between">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-600 text-white shadow-md shadow-amber-500/20 shrink-0">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-black text-slate-900 leading-tight">
                  Бронирование квартиры №{unit.unit_number}
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-300">
                  🟠 В бронь
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {projectName} • {buildingName} • {unit.rooms === 0 ? 'Студия' : `${unit.rooms} комн.`} • {areaM2.toFixed(1)} м² • Базовая цена: {defaultPricePerM2} {currency}/м²
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={requestClose}
            className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700 shrink-0 animate-in fade-in">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" />
            <span className="font-semibold">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* Main 2-Column Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {/* LEFT COLUMN: CLIENT & DURATION */}
            <div className="space-y-3 flex flex-col justify-between">
              {/* 1. Client selection */}
              <div className="rounded-2xl bg-slate-50 p-3 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5 text-amber-600" />
                    <span>1. Клиент / Покупатель *</span>
                  </label>
                  <div className="flex rounded-lg bg-white p-0.5 border border-slate-200 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setActiveClientTab('existing')}
                      className={`px-2.5 py-0.5 rounded-md font-bold transition cursor-pointer ${
                        activeClientTab === 'existing'
                          ? 'bg-amber-500 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Из базы
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveClientTab('new')}
                      className={`px-2.5 py-0.5 rounded-md font-bold transition cursor-pointer ${
                        activeClientTab === 'new'
                          ? 'bg-amber-500 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      + Новый клиент
                    </button>
                  </div>
                </div>

                {activeClientTab === 'existing' ? (
                  <div className="space-y-1.5">
                    {selectedLead ? (
                      <div className="flex items-center justify-between p-2 rounded-xl bg-amber-50/80 border border-amber-300">
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded-lg bg-amber-500 text-white flex items-center justify-center font-bold text-xs">
                            <UserCheck className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="font-extrabold text-xs text-slate-900">{selectedLead.full_name}</div>
                            <div className="text-[10px] text-slate-600">{selectedLead.phone}</div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setSelectedLead(null)}
                          className="text-[11px] font-bold text-amber-800 hover:text-amber-950 underline cursor-pointer px-1"
                        >
                          Сменить
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="relative">
                          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                          <input
                            type="text"
                            value={searchLead}
                            onChange={(e) => setSearchLead(e.target.value)}
                            placeholder="Поиск по ФИО или телефону..."
                            className="w-full rounded-xl border border-slate-300 bg-white pl-8 pr-3 py-1.5 text-xs outline-none focus:border-amber-500 font-medium"
                          />
                        </div>

                        <div className="max-h-28 overflow-y-auto space-y-1 pr-1">
                          {isLoadingLeads ? (
                            <div className="p-2 text-center text-[11px] text-slate-400">Загрузка клиентов...</div>
                          ) : filteredLeads.length === 0 ? (
                            <div className="p-2 text-center text-[11px] text-slate-400 bg-white rounded-lg border border-slate-200">
                              Не найдено. Перейдите на «+ Новый клиент».
                            </div>
                          ) : (
                            filteredLeads.slice(0, 8).map((lead) => {
                              const isSelected = selectedLead?.id === lead.id;
                              return (
                                <div
                                  key={lead.id}
                                  onClick={() => setSelectedLead(lead)}
                                  className={`flex items-center justify-between p-1.5 px-2.5 rounded-lg border text-xs cursor-pointer transition ${
                                    isSelected
                                      ? 'border-amber-500 bg-amber-50 shadow-xs'
                                      : 'border-slate-200 bg-white hover:border-amber-300 hover:bg-amber-50/40'
                                  }`}
                                >
                                  <div>
                                    <span className="font-bold text-slate-900">{lead.full_name}</span>
                                    <span className="text-[11px] text-slate-500 ml-2">{lead.phone}</span>
                                  </div>
                                  {isSelected && <CheckCircle2 className="h-3.5 w-3.5 text-amber-600" />}
                                </div>
                              );
                            })
                          )}
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2 pt-0.5">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-700 mb-1">
                        ФИО клиента *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Алиев Рустам"
                        value={newClientName}
                        onChange={(e) => setNewClientName(e.target.value)}
                        className="w-full rounded-xl border border-slate-300 bg-white px-2.5 py-1.5 text-xs outline-none focus:border-amber-500 font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-700 mb-1">
                        Номер телефона *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="+992 900 00 00 00"
                        value={newClientPhone}
                        onChange={(e) => setNewClientPhone(e.target.value)}
                        className="w-full rounded-xl border border-slate-300 bg-white px-2.5 py-1.5 text-xs outline-none focus:border-amber-500 font-medium"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* 2. Duration & Expiry */}
              <div className="rounded-2xl bg-slate-50 p-3 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-amber-600" />
                    <span>2. Срок действия брони</span>
                  </label>
                  <span className="text-xs font-black text-amber-800 bg-amber-100 px-2 py-0.5 rounded-md border border-amber-300">
                    До {new Date(expiryDate).toLocaleDateString('ru-RU')}
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-1.5">
                  {[
                    { days: 3, label: '3 дня' },
                    { days: 5, label: '5 дней' },
                    { days: 7, label: '7 дней' },
                    { days: 14, label: '14 дней' },
                  ].map((item) => (
                    <button
                      key={item.days}
                      type="button"
                      onClick={() => {
                        setIsCustomDate(false);
                        setReservationDays(item.days);
                      }}
                      className={`py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                        !isCustomDate && reservationDays === item.days
                          ? 'border-amber-500 bg-amber-500 text-white shadow-xs'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>

                <div className="flex items-center justify-between gap-2 pt-0.5">
                  <span className="text-[11px] text-slate-500 font-medium">Точная дата окончания:</span>
                  <input
                    type="date"
                    value={customDate}
                    onChange={(e) => {
                      setCustomDate(e.target.value);
                      setIsCustomDate(true);
                    }}
                    min={new Date().toISOString().split('T')[0]}
                    className={`rounded-xl border px-2.5 py-1 text-xs outline-none focus:border-amber-500 font-bold ${
                      isCustomDate ? 'border-amber-500 bg-amber-50/70 text-amber-950' : 'border-slate-300 bg-white text-slate-700'
                    }`}
                  />
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: FINANCIALS & COMMENT */}
            <div className="space-y-3 flex flex-col justify-between">
              {/* 3. Pricing */}
              <div className="rounded-2xl bg-slate-50 p-3 border border-slate-200 space-y-2.5">
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <DollarSign className="h-3.5 w-3.5 text-emerald-600" />
                  <span>3. Зафиксированная стоимость</span>
                </label>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-700 mb-1">
                      Цена за 1 м² ({currency})
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={pricePerM2}
                      onChange={(e) => setPricePerM2(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-black text-slate-900 outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-700 mb-1">
                      Итоговая фиксация
                    </label>
                    <div className="w-full rounded-xl border border-emerald-300 bg-emerald-50/80 px-2.5 py-1.5 text-xs font-black text-emerald-900">
                      {calculatedTotalPrice.toLocaleString()} {currency}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-700 mb-1">
                      Залог / Аванс ({currency})
                    </label>
                    <input
                      type="number"
                      min="0"
                      placeholder="0 (необязательно)"
                      value={depositAmount}
                      onChange={(e) => setDepositAmount(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 bg-white px-2.5 py-1.5 text-xs outline-none focus:border-amber-500 font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-700 mb-1">
                      Примечание к брони
                    </label>
                    <input
                      type="text"
                      placeholder="Клиент ждет подтверждения..."
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 bg-white px-2.5 py-1.5 text-xs outline-none focus:border-amber-500 font-medium"
                    />
                  </div>
                </div>
              </div>

              {/* 4. Quick Summary Card */}
              <div className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50/90 via-orange-50/50 to-amber-50/90 p-3 space-y-1.5 text-xs text-amber-950">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-600 font-semibold">Объект и квартира:</span>
                  <span className="font-black text-slate-900">
                    {projectName}, Кв. №{unit.unit_number} ({areaM2.toFixed(1)} м²)
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-600 font-semibold">Срок действия брони:</span>
                  <span className="font-bold text-amber-900">
                    До {new Date(expiryDate).toLocaleDateString('ru-RU')} ({isCustomDate ? 'по календарю' : `${reservationDays} дн.`})
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] pt-1 border-t border-amber-200/70">
                  <span className="text-slate-600 font-semibold">Итого к фиксации:</span>
                  <strong className="text-xs font-black text-amber-950">
                    {calculatedTotalPrice.toLocaleString()} {currency}
                    {depositAmount ? ` • Залог: ${parseFloat(depositAmount).toLocaleString()} ${currency}` : ''}
                  </strong>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100 shrink-0">
            <button
              type="button"
              onClick={requestClose}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
            >
              Отмена
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 px-6 py-2 text-xs font-bold text-white shadow-md shadow-amber-500/20 hover:from-amber-600 hover:to-orange-700 transition cursor-pointer disabled:opacity-60"
            >
              {isSubmitting ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <>
                  <Clock className="h-4 w-4" />
                  <span>Забронировать квартиру</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
