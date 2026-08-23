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
  ShieldCheck
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

  const { requestClose } = useModalDismiss({
    isOpen,
    onClose
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in overflow-y-auto">
      <div className="relative w-full max-w-xl max-h-[92vh] overflow-y-auto rounded-3xl border border-amber-200 bg-white p-6 shadow-2xl space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-600 text-white shadow-md shadow-amber-500/20">
              <Clock className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-slate-900">
                  Бронирование квартиры №{unit.unit_number}
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-300">
                  🟠 В бронь
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {projectName} • {buildingName} • {unit.rooms === 0 ? 'Студия' : `${unit.rooms} комн.`} • {areaM2.toFixed(1)} м²
              </p>
            </div>
          </div>

          <button
            onClick={requestClose}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-700">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-500 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* STEP 1: CLIENT SELECTION */}
          <div className="rounded-2xl bg-slate-50 p-4 border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800">
                1. Клиент / Покупатель *
              </label>
              <div className="flex rounded-xl bg-white p-1 border border-slate-200 text-xs">
                <button
                  type="button"
                  onClick={() => setActiveClientTab('existing')}
                  className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer ${
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
                  className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer ${
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
              <div className="space-y-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={searchLead}
                    onChange={(e) => setSearchLead(e.target.value)}
                    placeholder="Поиск по ФИО или телефону..."
                    className="w-full rounded-xl border border-slate-300 bg-white pl-9 pr-3 py-2 text-xs outline-none focus:border-amber-500"
                  />
                </div>

                <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                  {isLoadingLeads ? (
                    <div className="p-4 text-center text-xs text-slate-400">Загрузка клиентов...</div>
                  ) : filteredLeads.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-400 bg-white rounded-xl border border-slate-200">
                      Клиенты не найдены. Переключитесь на вкладку «+ Новый клиент».
                    </div>
                  ) : (
                    filteredLeads.map((lead) => {
                      const isSelected = selectedLead?.id === lead.id;
                      return (
                        <div
                          key={lead.id}
                          onClick={() => setSelectedLead(lead)}
                          className={`flex items-center justify-between p-2.5 rounded-xl border text-xs cursor-pointer transition ${
                            isSelected
                              ? 'border-amber-500 bg-amber-50/80 shadow-xs ring-1 ring-amber-500'
                              : 'border-slate-200 bg-white hover:border-slate-300'
                          }`}
                        >
                          <div>
                            <div className="font-bold text-slate-900">{lead.full_name}</div>
                            <div className="text-[11px] text-slate-500">{lead.phone}</div>
                          </div>
                          {isSelected && <CheckCircle2 className="h-4 w-4 text-amber-600" />}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    ФИО клиента *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Алиев Рустам"
                    value={newClientName}
                    onChange={(e) => setNewClientName(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Номер телефона *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="+992 900 00 00 00"
                    value={newClientPhone}
                    onChange={(e) => setNewClientPhone(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs outline-none focus:border-amber-500"
                  />
                </div>
              </div>
            )}
          </div>

          {/* STEP 2: DURATION & EXPIRATION DATE */}
          <div className="rounded-2xl bg-slate-50 p-4 border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-amber-600" />
                <span>2. Срок действия брони</span>
              </label>
              <span className="text-xs font-black text-amber-700 bg-amber-100/80 px-2 py-0.5 rounded-md border border-amber-300">
                До {new Date(expiryDate).toLocaleDateString('ru-RU')}
              </span>
            </div>

            <div className="grid grid-cols-4 gap-2">
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
                  className={`py-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
                    !isCustomDate && reservationDays === item.days
                      ? 'border-amber-500 bg-amber-500 text-white shadow-xs'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 pt-1">
              <span className="text-[11px] text-slate-500">Либо укажите точную дату:</span>
              <input
                type="date"
                value={customDate}
                onChange={(e) => {
                  setCustomDate(e.target.value);
                  setIsCustomDate(true);
                }}
                min={new Date().toISOString().split('T')[0]}
                className={`rounded-xl border px-3 py-1.5 text-xs outline-none focus:border-amber-500 font-medium ${
                  isCustomDate ? 'border-amber-500 bg-amber-50/50' : 'border-slate-300 bg-white'
                }`}
              />
            </div>
          </div>

          {/* STEP 3: FINANCIAL TERMS (OPTIONAL FIXATION) */}
          <div className="rounded-2xl bg-slate-50 p-4 border border-slate-200 space-y-3">
            <label className="text-xs font-bold text-slate-800 block">
              3. Зафиксированная стоимость квартиры
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Цена за 1 м² ({currency})
                </label>
                <input
                  type="number"
                  min="1"
                  value={pricePerM2}
                  onChange={(e) => setPricePerM2(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Итоговая зафиксированная цена
                </label>
                <div className="w-full rounded-xl border border-slate-200 bg-slate-100 px-3 py-2 text-xs font-extrabold text-slate-900">
                  {calculatedTotalPrice.toLocaleString()} {currency}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Сумма внесенного залога / аванса ({currency}) (необязательно)
              </label>
              <input
                type="number"
                min="0"
                placeholder="0"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Примечание / комментарий к брони
              </label>
              <input
                type="text"
                placeholder="Например: клиент ждет одобрения или перевод денег"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={requestClose}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
            >
              Отмена
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 px-6 py-2.5 text-xs font-bold text-white shadow-md shadow-amber-500/20 hover:from-amber-600 hover:to-orange-700 transition cursor-pointer disabled:opacity-60"
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
