import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { useModalDismiss } from '../../hooks/useModalDismiss';
import {
  X,
  Pencil,
  Calendar,
  FileCheck,
  User,
  Phone,
  CreditCard,
  Building2,
  ShieldCheck,
  Save,
  AlertCircle,
  Lock,
  Coins,
  DollarSign,
  Info
} from 'lucide-react';

export const EditDealModal = ({
  isOpen,
  onClose,
  deal,
  onDealUpdated
}) => {
  const [users, setUsers] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Form State
  const [contractNumber, setContractNumber] = useState('');
  const [dealDate, setDealDate] = useState('');
  const [leadName, setLeadName] = useState('');
  const [leadPhone, setLeadPhone] = useState('');
  const [passportSeries, setPassportSeries] = useState('');
  const [passportNumber, setPassportNumber] = useState('');
  const [inn, setInn] = useState('');
  const [responsibleUserId, setResponsibleUserId] = useState('');
  const [paymentType, setPaymentType] = useState('FULL');
  const [installmentMonths, setInstallmentMonths] = useState('0');
  const [reservationExpiresAt, setReservationExpiresAt] = useState('');
  const [barterDescription, setBarterDescription] = useState('');

  // Financial State
  const [pricePerM2, setPricePerM2] = useState('');
  const [finalPrice, setFinalPrice] = useState('');
  const [discount, setDiscount] = useState('');
  const [downPayment, setDownPayment] = useState('');
  const [exchangeRate, setExchangeRate] = useState('');

  // Paid deal lock status
  const totalPaidMinor = deal
    ? (deal.total_paid_minor || 0) || (deal.payments || []).reduce((s, p) => s + (p.amount_minor || 0), 0)
    : 0;
  const isPaidDeal = totalPaidMinor > 0;
  const remainingDebtMinor = deal ? Math.max(0, (deal.final_price_minor || 0) - totalPaidMinor) : 0;

  const areaM2 = deal
    ? (deal.area_m2_x100 ? deal.area_m2_x100 / 100 : (deal.units?.area_m2_x100 ? deal.units.area_m2_x100 / 100 : 0))
    : 0;

  const unitCommercialPricePerM2 = deal
    ? (deal.unit_price_per_m2_minor
        ? deal.unit_price_per_m2_minor / 100
        : (deal.units?.price_per_m2_minor ? deal.units.price_per_m2_minor / 100 : 0))
    : 0;

  // Populate form from deal prop
  useEffect(() => {
    if (deal) {
      setContractNumber(deal.contract_number || '');
      setDealDate(deal.deal_date || deal.created_at?.split('T')[0] || '');
      setLeadName(deal.lead_name || '');
      setLeadPhone(deal.lead_phone || '');
      setPassportSeries(deal.passport_series || '');
      setPassportNumber(deal.passport_number || '');
      setInn(deal.inn || '');
      setResponsibleUserId(deal.responsible_user_id ? String(deal.responsible_user_id) : '');
      setPaymentType(deal.payment_type || 'FULL');
      setInstallmentMonths(String(deal.installment_months || 0));
      setReservationExpiresAt(deal.reservation_expires_at ? deal.reservation_expires_at.split('T')[0] : '');
      setBarterDescription(deal.barter_description || '');

      const initialPricePerM2 = deal.deal_price_per_m2_minor
        ? deal.deal_price_per_m2_minor / 100
        : (areaM2 > 0 && deal.final_price_minor
            ? Math.round((deal.final_price_minor / areaM2)) / 100
            : (deal.final_price_minor ? deal.final_price_minor / 100 : 0));

      setPricePerM2(String(initialPricePerM2));
      setFinalPrice(String((deal.final_price_minor || 0) / 100));
      setDiscount(String((deal.discount_minor || 0) / 100));
      setDownPayment(String((deal.down_payment_minor || 0) / 100));
      setExchangeRate(deal.exchange_rate ? String(deal.exchange_rate) : '');
      setError('');
    }
  }, [deal, isOpen]);

  // Auto calculate final price when pricePerM2 changes if area is available
  const handlePricePerM2Change = (val) => {
    if (isPaidDeal) return;
    setPricePerM2(val);
    const p = parseFloat(val);
    const disc = parseFloat(discount) || 0;
    if (!isNaN(p) && areaM2 > 0) {
      setFinalPrice(String(Math.round(areaM2 * p - disc)));
    }
  };

  // Fetch users for manager selector
  useEffect(() => {
    if (isOpen) {
      api.get('/users')
        .then(res => setUsers(res.data?.users || res.users || []))
        .catch(err => console.error('Failed to load users for manager selector:', err));
    }
  }, [isOpen]);

  const isDirty = Boolean(
    deal && (
      contractNumber !== (deal.contract_number || '') ||
      dealDate !== (deal.deal_date || deal.created_at?.split('T')[0] || '') ||
      leadName !== (deal.lead_name || '') ||
      leadPhone !== (deal.lead_phone || '') ||
      passportSeries !== (deal.passport_series || '') ||
      passportNumber !== (deal.passport_number || '') ||
      inn !== (deal.inn || '') ||
      responsibleUserId !== (deal.responsible_user_id ? String(deal.responsible_user_id) : '') ||
      paymentType !== (deal.payment_type || 'FULL') ||
      installmentMonths !== String(deal.installment_months || 0) ||
      reservationExpiresAt !== (deal.reservation_expires_at ? deal.reservation_expires_at.split('T')[0] : '') ||
      barterDescription !== (deal.barter_description || '') ||
      pricePerM2 !== String(deal.deal_price_per_m2_minor ? deal.deal_price_per_m2_minor / 100 : 0) ||
      finalPrice !== String((deal.final_price_minor || 0) / 100) ||
      discount !== String((deal.discount_minor || 0) / 100) ||
      downPayment !== String((deal.down_payment_minor || 0) / 100) ||
      exchangeRate !== String(deal.exchange_rate || '')
    )
  );

  const { requestClose } = useModalDismiss({
    isOpen: Boolean(isOpen && deal),
    onClose,
    isDirty,
    confirmMessage: 'В форме редактирования есть несохраненные изменения. Закрыть без сохранения?'
  });

  if (!isOpen || !deal) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!dealDate) {
      setError('Укажите дату договора / сделки');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const pM2 = parseFloat(pricePerM2) || 0;
      const fPrice = parseFloat(finalPrice) || 0;
      const disc = parseFloat(discount) || 0;
      const dPmt = parseFloat(downPayment) || 0;
      const rate = exchangeRate ? parseFloat(exchangeRate) : null;

      const payload = {
        contract_number: contractNumber.trim(),
        deal_date: dealDate,
        lead_name: leadName.trim(),
        lead_phone: leadPhone.trim(),
        passport_series: passportSeries.trim(),
        passport_number: passportNumber.trim(),
        inn: inn.trim() || null,
        responsible_user_id: responsibleUserId ? parseInt(responsibleUserId, 10) : null,
        payment_type: paymentType,
        installment_months: parseInt(installmentMonths, 10) || 0,
        reservation_expires_at: reservationExpiresAt || null,
        barter_description: barterDescription.trim() || null
      };

      // Only include financial terms in payload if unpaid
      if (!isPaidDeal) {
        payload.deal_price_per_m2_minor = Math.round(pM2 * 100);
        payload.final_price_minor = Math.round(fPrice * 100);
        payload.discount_minor = Math.round(disc * 100);
        payload.down_payment_minor = Math.round(dPmt * 100);
        payload.exchange_rate = rate;
      }

      const res = await api.patch(`/deals/${deal.id}`, payload);
      const updatedDeal = res.data?.deal || res.deal;

      if (onDealUpdated) {
        onDealUpdated(updatedDeal);
      }
      onClose();
    } catch (err) {
      console.error('Failed to update deal:', err);
      setError(err.message || 'Ошибка сохранения изменений сделки');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-3.5 border-b border-slate-100 bg-slate-50/70 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 border border-amber-200/60 shadow-2xs">
              <Pencil className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-slate-900 leading-tight">Редактирование сделки</h2>
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-extrabold text-amber-800 border border-amber-300/60 uppercase tracking-wide">
                  <ShieldCheck className="h-2.5 w-2.5" /> Только Администратор
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Договор №{deal.contract_number} • Кв. №{deal.unit_number} ({deal.project_name || 'TOZON PLAZA'})
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={requestClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body Form - Unified Scrollable 3-Block Layout */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs overflow-y-auto">
          
          {error && (
            <div className="flex items-center gap-2 rounded-xl bg-rose-50 border border-rose-200 p-2.5 text-rose-700 font-medium text-xs">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Paid Deal Protection Banner */}
          {isPaidDeal && (
            <div className="flex items-center gap-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 p-3 text-amber-900 text-xs font-semibold">
              <Lock className="h-4 w-4 shrink-0 text-amber-600" />
              <span>
                Финансовые условия заблокированы для редактирования, поскольку по сделке уже зарегистрирована оплата <strong>${(totalPaidMinor / 100).toLocaleString('ru-RU', { minimumFractionDigits: 2 })} USD</strong>.
              </span>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            
            {/* Block A: Dates, Contract & Payment Terms */}
            <div className="bg-amber-50/30 rounded-2xl p-4 border border-amber-200/60 space-y-3">
              <div className="flex items-center justify-between font-bold text-slate-900 text-xs pb-1 border-b border-amber-200/50">
                <div className="flex items-center gap-2">
                  <Calendar className="h-3.5 w-3.5 text-amber-600" />
                  <span>Блок А. Договор и условия</span>
                </div>
                <span className="text-[10px] font-mono text-slate-500">№{contractNumber}</span>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Дата сделки <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={dealDate}
                    onChange={(e) => setDealDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Номер договора
                  </label>
                  <input
                    type="text"
                    value={contractNumber}
                    onChange={(e) => setContractNumber(e.target.value)}
                    placeholder="0010"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-mono font-bold text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Ответственный менеджер
                  </label>
                  <select
                    value={responsibleUserId}
                    onChange={(e) => setResponsibleUserId(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition cursor-pointer"
                  >
                    <option value="">Не назначен</option>
                    {users.map(u => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.role})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Форма оплаты
                  </label>
                  <select
                    value={paymentType}
                    disabled={isPaidDeal}
                    onChange={(e) => setPaymentType(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition cursor-pointer disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
                  >
                    <option value="FULL">100% Оплата</option>
                    <option value="INSTALLMENT">Рассрочка</option>
                    <option value="BARTER">100% Бартер</option>
                    <option value="PARTIAL_BARTER">Бартер + Доплата</option>
                  </select>
                </div>
              </div>

              {paymentType === 'INSTALLMENT' && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Срок рассрочки (мес.)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="60"
                    disabled={isPaidDeal}
                    value={installmentMonths}
                    onChange={(e) => setInstallmentMonths(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
                  />
                </div>
              )}

              {deal.status === 'RESERVED' && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Дата окончания брони
                  </label>
                  <input
                    type="date"
                    value={reservationExpiresAt}
                    onChange={(e) => setReservationExpiresAt(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
                  />
                </div>
              )}

              {(paymentType === 'BARTER' || paymentType === 'PARTIAL_BARTER') && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Описание бартера
                  </label>
                  <input
                    type="text"
                    value={barterDescription}
                    onChange={(e) => setBarterDescription(e.target.value)}
                    placeholder="Toyota Camry 2022..."
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
                  />
                </div>
              )}
            </div>

            {/* Block B: Financial Terms & Snapshot */}
            <div className="bg-blue-50/30 rounded-2xl p-4 border border-blue-200/60 space-y-3">
              <div className="flex items-center justify-between font-bold text-slate-900 text-xs pb-1 border-b border-blue-200/50">
                <div className="flex items-center gap-2">
                  <Coins className="h-3.5 w-3.5 text-blue-600" />
                  <span>Блок B. Финансовые условия и Snapshot</span>
                </div>
                {isPaidDeal && (
                  <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-md border border-amber-300">
                    Read-Only
                  </span>
                )}
              </div>

              {/* Unit Area & Commercial Price Info */}
              <div className="grid grid-cols-2 gap-2 bg-white/80 p-2.5 rounded-xl border border-slate-200/60 text-[11px]">
                <div>
                  <span className="text-slate-500 block">Площадь квартиры:</span>
                  <span className="font-extrabold text-slate-900">{areaM2} м²</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Цена по прайсу (Unit):</span>
                  <span className="font-extrabold text-slate-700">{unitCommercialPricePerM2 > 0 ? `${unitCommercialPricePerM2.toLocaleString('ru-RU')} USD/м²` : '—'}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[10px] font-bold text-slate-700 mb-1">
                    Цена продажи за 1 м² (USD)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    disabled={isPaidDeal}
                    value={pricePerM2}
                    onChange={(e) => handlePricePerM2Change(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-extrabold text-blue-700 outline-none focus:border-blue-500 transition disabled:bg-slate-100 disabled:text-slate-600 disabled:cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-700 mb-1">
                    Сумма договора (USD)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    disabled={isPaidDeal}
                    value={finalPrice}
                    onChange={(e) => setFinalPrice(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-extrabold text-emerald-700 outline-none focus:border-blue-500 transition disabled:bg-slate-100 disabled:text-slate-600 disabled:cursor-not-allowed"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-1">
                    Скидка (USD)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    disabled={isPaidDeal}
                    value={discount}
                    onChange={(e) => setDiscount(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-2 py-1.5 text-xs font-semibold text-slate-800 outline-none focus:border-blue-500 transition disabled:bg-slate-100 disabled:text-slate-600 disabled:cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-1">
                    Перв. взнос (USD)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    disabled={isPaidDeal}
                    value={downPayment}
                    onChange={(e) => setDownPayment(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-2 py-1.5 text-xs font-semibold text-slate-800 outline-none focus:border-blue-500 transition disabled:bg-slate-100 disabled:text-slate-600 disabled:cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-1">
                    Курс (TJS/USD)
                  </label>
                  <input
                    type="number"
                    step="0.0001"
                    disabled={isPaidDeal}
                    value={exchangeRate}
                    placeholder="—"
                    onChange={(e) => setExchangeRate(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-2 py-1.5 text-xs font-semibold text-slate-800 outline-none focus:border-blue-500 transition disabled:bg-slate-100 disabled:text-slate-600 disabled:cursor-not-allowed"
                  />
                </div>
              </div>

              {/* Paid vs Remaining Stats */}
              <div className="grid grid-cols-2 gap-2 bg-emerald-50/60 p-2.5 rounded-xl border border-emerald-200/60 text-[11px]">
                <div>
                  <span className="text-emerald-700 block font-semibold">Фактически оплачено:</span>
                  <span className="font-black text-emerald-800 text-xs">${(totalPaidMinor / 100).toLocaleString('ru-RU', { minimumFractionDigits: 2 })} USD</span>
                </div>
                <div>
                  <span className="text-slate-600 block font-semibold">Остаток задолженности:</span>
                  <span className="font-black text-slate-900 text-xs">${(remainingDebtMinor / 100).toLocaleString('ru-RU', { minimumFractionDigits: 2 })} USD</span>
                </div>
              </div>

            </div>

          </div>

          {/* Block C: Buyer & Passport Info (Full-width card below) */}
          <div className="bg-slate-50/70 rounded-2xl p-4 border border-slate-200/90 space-y-3">
            <div className="flex items-center gap-2 font-bold text-slate-900 text-xs pb-1 border-b border-slate-200/60">
              <User className="h-3.5 w-3.5 text-blue-600" />
              <span>Блок C. Данные покупателя (Разрешено для редактирования)</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  ФИО Покупателя
                </label>
                <input
                  type="text"
                  value={leadName}
                  onChange={(e) => setLeadName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Телефон
                </label>
                <input
                  type="text"
                  value={leadPhone}
                  onChange={(e) => setLeadPhone(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Серия паспорта
                </label>
                <input
                  type="text"
                  value={passportSeries}
                  onChange={(e) => setPassportSeries(e.target.value)}
                  placeholder="А"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Номер паспорта
                </label>
                <input
                  type="text"
                  value={passportNumber}
                  onChange={(e) => setPassportNumber(e.target.value)}
                  placeholder="1234567"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-mono font-bold text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  ИНН / РМА
                </label>
                <input
                  type="text"
                  value={inn}
                  onChange={(e) => setInn(e.target.value)}
                  placeholder="665151074"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-mono font-bold text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
                />
              </div>
            </div>
          </div>

          {/* Footer actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 shrink-0">
            <button
              type="button"
              onClick={requestClose}
              className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 transition cursor-pointer text-xs"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold transition shadow-xs cursor-pointer text-xs disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {isSubmitting ? 'Сохранение...' : 'Сохранить изменения'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
