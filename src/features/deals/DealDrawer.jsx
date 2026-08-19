import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { PaymentRecordModal } from './PaymentRecordModal';
import {
  X,
  FileCheck,
  User,
  Phone,
  Calendar,
  Building2,
  Home,
  DollarSign,
  CreditCard,
  Printer,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  ShieldCheck,
  Plus,
  Car,
  FileText,
  BadgeAlert,
  ChevronRight,
  TrendingUp,
  MapPin
} from 'lucide-react';

export const DealDrawer = ({
  isOpen,
  onClose,
  dealId,
  onDealUpdated,
  onOpenContractPrint,
}) => {
  const [deal, setDeal] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Modals inside drawer
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedScheduleIdForPayment, setSelectedScheduleIdForPayment] = useState(null);
  const [isCancelPromptOpen, setIsCancelPromptOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [isExtendPromptOpen, setIsExtendPromptOpen] = useState(false);
  const [newExtendExpiresAt, setNewExtendExpiresAt] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchDealDetail = async () => {
    if (!dealId) return;
    setIsLoading(true);
    setError('');
    try {
      const res = await api.get(`/deals/${dealId}`);
      setDeal(res.data?.deal || res.deal || null);
    } catch (err) {
      setError(err.message || 'Ошибка загрузки сделки');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && dealId) {
      fetchDealDetail();
      setIsCancelPromptOpen(false);
      setIsExtendPromptOpen(false);
    } else {
      setDeal(null);
    }
  }, [isOpen, dealId]);

  if (!isOpen) return null;

  const handleSignDeal = async () => {
    if (!window.confirm('Подписать договор по данной брони? Квартира перейдет в статус «ПРОДАНО».')) return;
    setActionLoading(true);
    try {
      const res = await api.post(`/deals/${deal.id}/sign`);
      const updated = res.data?.deal || res.deal;
      setDeal(updated);
      if (onDealUpdated) onDealUpdated(updated);
    } catch (err) {
      alert(err.message || 'Ошибка подписания сделки');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelDeal = async () => {
    if (!cancelReason.trim() && deal.status === 'SIGNED') {
      alert('Укажите причину отмены');
      return;
    }
    setActionLoading(true);
    try {
      const res = await api.post(`/deals/${deal.id}/cancel`, { reason: cancelReason });
      const updated = res.data?.deal || res.deal;
      setDeal(updated);
      setIsCancelPromptOpen(false);
      if (onDealUpdated) onDealUpdated(updated);
    } catch (err) {
      alert(err.message || 'Ошибка отмены сделки');
    } finally {
      setActionLoading(false);
    }
  };

  const handleExtendReservation = async () => {
    if (!newExtendExpiresAt) {
      alert('Выберите новую дату');
      return;
    }
    setActionLoading(true);
    try {
      const res = await api.post(`/deals/${deal.id}/extend-reservation`, {
        reservation_expires_at: newExtendExpiresAt,
      });
      const updated = res.data?.deal || res.deal;
      setDeal(updated);
      setIsExtendPromptOpen(false);
      if (onDealUpdated) onDealUpdated(updated);
    } catch (err) {
      alert(err.message || 'Ошибка продления брони');
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenPayment = (sId = null) => {
    setSelectedScheduleIdForPayment(sId);
    setIsPaymentModalOpen(true);
  };

  const handlePaymentSuccess = (updatedDeal) => {
    setDeal(updatedDeal);
    if (onDealUpdated) onDealUpdated(updatedDeal);
  };

  const currency = deal?.currency || deal?.project_currency || 'TJS';
  const finalPrice = deal ? (deal.final_price_minor / 100) : 0;
  const totalPaid = deal ? (deal.total_paid_minor / 100) : 0;
  const remainingDebt = deal ? (deal.remaining_debt_minor / 100) : 0;
  const paidPercent = finalPrice > 0 ? Math.min(100, Math.round((totalPaid / finalPrice) * 100)) : 0;

  const getStatusBadge = (status) => {
    switch (status) {
      case 'SIGNED':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="h-3.5 w-3.5" /> Подписан / Продано
          </span>
        );
      case 'RESERVED':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700 border border-amber-200">
            <Clock className="h-3.5 w-3.5" /> Бронь (до {deal?.reservation_expires_at || '—'})
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-3 py-1 text-xs font-bold text-rose-700 border border-rose-200">
            <XCircle className="h-3.5 w-3.5" /> Отменен
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
            {status}
          </span>
        );
    }
  };

  const getScheduleStatusBadge = (status) => {
    switch (status) {
      case 'PAID':
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-800">
            <CheckCircle2 className="h-3 w-3" /> Оплачено
          </span>
        );
      case 'PARTIAL':
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-800">
            <Clock className="h-3 w-3" /> Частично
          </span>
        );
      case 'OVERDUE':
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-rose-100 px-2 py-0.5 text-[11px] font-bold text-rose-800">
            <AlertCircle className="h-3 w-3" /> Просрочен
          </span>
        );
      case 'DUE':
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-blue-100 px-2 py-0.5 text-[11px] font-bold text-blue-800">
            <Clock className="h-3 w-3" /> Сегодня
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
            Ожидается
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/50 backdrop-blur-xs flex justify-end animate-in fade-in">
      <div className="relative w-full max-w-3xl bg-white shadow-2xl flex flex-col h-full overflow-y-auto">
        {/* Top Sticky Header */}
        <div className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 backdrop-blur-md px-6 py-4 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-sm">
              <FileCheck className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">
                  {deal ? `Договор № ${deal.contract_number}` : 'Карточка сделки'}
                </h2>
                {deal && getStatusBadge(deal.status)}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {deal ? `Дата: ${deal.deal_date || deal.created_at?.split('T')[0]} • Менеджер: ${deal.manager_name || 'Не назначен'}` : 'Загрузка данных...'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {deal && onOpenContractPrint && (
              <button
                onClick={() => onOpenContractPrint(deal)}
                className="flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-xs transition cursor-pointer"
                title="Печать / Экспорт в PDF"
              >
                <Printer className="h-3.5 w-3.5 text-blue-600" />
                <span>Печать договора</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center p-12 text-slate-400">
            <div className="text-center space-y-2">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-xs font-medium">Загрузка информации о сделке...</p>
            </div>
          </div>
        ) : error || !deal ? (
          <div className="p-8 text-center text-rose-600">
            <AlertCircle className="h-8 w-8 mx-auto mb-2 text-rose-500" />
            <p className="text-sm font-bold">{error || 'Сделка не найдена'}</p>
          </div>
        ) : (
          <div className="p-6 space-y-6 flex-1">
            {/* Quick Action Banner */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-gradient-to-r from-slate-900 to-indigo-950 text-white shadow-md">
              <div className="space-y-0.5">
                <span className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider block">
                  Текущий статус расчетов
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-xl font-extrabold tracking-tight">
                    {totalPaid.toLocaleString()} {currency}
                  </span>
                  <span className="text-xs text-slate-400 font-medium">
                    из {finalPrice.toLocaleString()} {currency} ({paidPercent}%)
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {deal.status === 'RESERVED' && (
                  <>
                    <button
                      onClick={handleSignDeal}
                      disabled={actionLoading}
                      className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-500 transition cursor-pointer disabled:opacity-50"
                    >
                      <ShieldCheck className="h-4 w-4" />
                      <span>Подписать договор</span>
                    </button>
                    <button
                      onClick={() => setIsExtendPromptOpen(true)}
                      className="flex items-center gap-1.5 rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 text-xs font-bold text-amber-300 hover:bg-slate-700 transition cursor-pointer"
                    >
                      <Clock className="h-3.5 w-3.5" />
                      <span>Продлить бронь</span>
                    </button>
                  </>
                )}

                {deal.status !== 'CANCELLED' && remainingDebt > 0 && (
                  <button
                    onClick={() => handleOpenPayment(null)}
                    className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 px-4 py-2 text-xs font-bold text-white shadow-md hover:from-blue-600 hover:to-cyan-600 transition cursor-pointer"
                  >
                    <CreditCard className="h-4 w-4" />
                    <span>Принять оплату</span>
                  </button>
                )}

                {deal.status !== 'CANCELLED' && (
                  <button
                    onClick={() => setIsCancelPromptOpen(true)}
                    className="rounded-xl bg-slate-800/80 border border-slate-700/80 px-3 py-2 text-xs font-bold text-rose-300 hover:bg-rose-950/50 hover:text-rose-200 transition cursor-pointer"
                  >
                    Отменить
                  </button>
                )}
              </div>
            </div>

            {/* Cancel Modal inline dialog */}
            {isCancelPromptOpen && (
              <div className="rounded-2xl border border-rose-200 bg-rose-50/80 p-4 space-y-3 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-rose-900 flex items-center gap-1.5">
                    <AlertCircle className="h-4 w-4 text-rose-600" />
                    Подтверждение отмены сделки
                  </h4>
                  <button onClick={() => setIsCancelPromptOpen(false)} className="text-xs text-slate-400 hover:text-slate-600">
                    ✕
                  </button>
                </div>
                <p className="text-xs text-rose-700">
                  При отмене квартира №{deal.unit_number} будет возвращена в статус <strong>СВОБОДНА</strong>.
                </p>
                <div>
                  <label className="block text-[11px] font-semibold text-rose-900 mb-1">Причина отмены:</label>
                  <input
                    type="text"
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    placeholder="Например: отказ клиента, не внесена оплата..."
                    className="w-full rounded-xl border border-rose-300 bg-white px-3 py-1.5 text-xs outline-none focus:border-rose-500"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setIsCancelPromptOpen(false)}
                    className="rounded-lg bg-white border border-slate-300 px-3 py-1 text-xs font-bold text-slate-700"
                  >
                    Отмена
                  </button>
                  <button
                    onClick={handleCancelDeal}
                    disabled={actionLoading}
                    className="rounded-lg bg-rose-600 px-4 py-1 text-xs font-bold text-white shadow-xs hover:bg-rose-700 disabled:opacity-50"
                  >
                    Подтвердить отмену
                  </button>
                </div>
              </div>
            )}

            {/* Extend Reservation inline dialog */}
            {isExtendPromptOpen && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4 space-y-3 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                    <Clock className="h-4 w-4 text-amber-600" />
                    Продление срока бронирования
                  </h4>
                  <button onClick={() => setIsExtendPromptOpen(false)} className="text-xs text-slate-400 hover:text-slate-600">
                    ✕
                  </button>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-amber-900 mb-1">Новая дата окончания брони:</label>
                  <input
                    type="date"
                    value={newExtendExpiresAt}
                    onChange={(e) => setNewExtendExpiresAt(e.target.value)}
                    className="w-full rounded-xl border border-amber-300 bg-white px-3 py-1.5 text-xs outline-none focus:border-amber-500"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setIsExtendPromptOpen(false)}
                    className="rounded-lg bg-white border border-slate-300 px-3 py-1 text-xs font-bold text-slate-700"
                  >
                    Отмена
                  </button>
                  <button
                    onClick={handleExtendReservation}
                    disabled={actionLoading}
                    className="rounded-lg bg-amber-600 px-4 py-1 text-xs font-bold text-white shadow-xs hover:bg-amber-700 disabled:opacity-50"
                  >
                    Сохранить срок
                  </button>
                </div>
              </div>
            )}

            {/* SECTION 1 & 2: Buyer & Apartment in 2 columns */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Buyer Card */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-900 border-b border-slate-200/80 pb-2">
                  <User className="h-4 w-4 text-blue-600" />
                  <span>Покупатель (Клиент)</span>
                </div>

                <div className="space-y-2 text-xs">
                  <div>
                    <span className="text-slate-500 text-[11px] block">ФИО:</span>
                    <strong className="text-slate-900 text-sm">{deal.lead_name}</strong>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-slate-500 text-[11px] block">Телефон:</span>
                      <strong className="text-slate-900 flex items-center gap-1">
                        <Phone className="h-3 w-3 text-emerald-600" />
                        {deal.lead_phone}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[11px] block">Дата рождения:</span>
                      <span className="text-slate-800 font-medium">{deal.birth_date || 'Не указана'}</span>
                    </div>
                  </div>

                  <div className="bg-white p-2.5 rounded-xl border border-slate-200/80 space-y-1">
                    <span className="text-[11px] font-bold text-slate-600 block">Паспортные данные:</span>
                    <p className="text-slate-800 text-[11px]">
                      Серия/№: <strong>{deal.passport_series || '—'} {deal.passport_number || '—'}</strong><br />
                      Выдан: <span>{deal.passport_issued_by || '—'}</span> (от {deal.passport_issue_date || '—'})
                    </p>
                    <p className="text-slate-800 text-[11px]">
                      Прописка: <span>{deal.registration_address || '—'}</span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Unit Card */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-900 border-b border-slate-200/80 pb-2">
                  <Building2 className="h-4 w-4 text-indigo-600" />
                  <span>Объект и квартира</span>
                </div>

                <div className="space-y-2 text-xs">
                  <div>
                    <span className="text-slate-500 text-[11px] block">Жилой комплекс:</span>
                    <strong className="text-slate-900 text-sm">{deal.project_name}</strong>
                    <p className="text-[11px] text-slate-500">{deal.project_address}</p>
                  </div>

                  <div className="grid grid-cols-3 gap-2 bg-white p-2.5 rounded-xl border border-slate-200/80 text-center">
                    <div>
                      <span className="text-slate-400 text-[10px] block">Корпус/Секция</span>
                      <strong className="text-slate-800 text-xs">{deal.building_name}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] block">Этаж</span>
                      <strong className="text-slate-800 text-xs">{deal.floor_number} этаж</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] block">Квартира №</span>
                      <strong className="text-blue-600 text-sm font-bold">№{deal.unit_number}</strong>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-slate-500 text-[11px] block">Комнат / Площадь:</span>
                      <strong className="text-slate-900">
                        {deal.unit_rooms} комн. • {(deal.area_m2_x100 / 100).toFixed(2)} м²
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[11px] block">Цена за 1 м²:</span>
                      <strong className="text-slate-900">
                        {((deal.price_per_m2_minor || 0) / 100).toLocaleString()} {currency}
                      </strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION 3: Financial Summary Cards */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4 shadow-xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <DollarSign className="h-4 w-4 text-emerald-600" />
                  Финансовый расчет договора
                </h3>
                <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-700">
                  {deal.payment_type === 'INSTALLMENT' && 'Рассрочка'}
                  {deal.payment_type === 'FULL' && '100% Оплата'}
                  {deal.payment_type === 'BARTER' && '100% Бартер'}
                  {deal.payment_type === 'PARTIAL_BARTER' && 'Бартер + Доплата'}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-[11px] text-slate-500 block">Базовая стоимость</span>
                  <strong className="text-xs font-bold text-slate-800">
                    {((deal.base_price_minor || 0) / 100).toLocaleString()} {currency}
                  </strong>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-[11px] text-slate-500 block">Скидка / Дисконт</span>
                  <strong className="text-xs font-bold text-emerald-600">
                    {deal.discount_minor > 0 ? `-${((deal.discount_minor || 0) / 100).toLocaleString()} ${currency}` : '0'}
                  </strong>
                </div>

                <div className="p-3 rounded-xl bg-blue-50/60 border border-blue-100">
                  <span className="text-[11px] text-blue-700 font-medium block">Итоговая сумма</span>
                  <strong className="text-sm font-extrabold text-blue-900">
                    {finalPrice.toLocaleString()} {currency}
                  </strong>
                </div>

                <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-100">
                  <span className="text-[11px] text-emerald-700 font-medium block">Первоначальный взнос</span>
                  <strong className="text-xs font-bold text-emerald-900">
                    {((deal.down_payment_minor || 0) / 100).toLocaleString()} {currency}
                  </strong>
                </div>
              </div>

              {/* Barter info if present */}
              {(deal.payment_type === 'BARTER' || deal.payment_type === 'PARTIAL_BARTER') && deal.barter_description && (
                <div className="flex items-start gap-3 rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-900">
                  <Car className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block font-bold">Бартерный взаимозачет:</strong>
                    <p className="mt-0.5">{deal.barter_description}</p>
                    {deal.barter_amount_minor > 0 && (
                      <span className="text-[11px] font-semibold text-amber-700">
                        Оценочная стоимость: {((deal.barter_amount_minor || 0) / 100).toLocaleString()} {currency}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Progress Bar */}
              <div className="space-y-1.5 pt-1">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-slate-600">Оплачено: {totalPaid.toLocaleString()} {currency} ({paidPercent}%)</span>
                  <span className="text-rose-600 font-bold">Остаток долга: {remainingDebt.toLocaleString()} {currency}</span>
                </div>
                <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-500"
                    style={{ width: `${paidPercent}%` }}
                  />
                </div>
              </div>
            </div>

            {/* SECTION 4: Payment Schedule */}
            {deal.schedules && deal.schedules.length > 0 && (
              <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4 shadow-xs">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                      <Calendar className="h-4 w-4 text-blue-600" />
                      График платежей по рассрочке ({deal.schedules.length} мес.)
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Ежемесячные плановые платежи и статус их фактического погашения
                    </p>
                  </div>

                  {remainingDebt > 0 && (
                    <button
                      onClick={() => handleOpenPayment(null)}
                      className="flex items-center gap-1 rounded-xl bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-100 border border-blue-200 transition cursor-pointer"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Внести платеж</span>
                    </button>
                  )}
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-600">
                        <th className="py-2.5 px-3">№</th>
                        <th className="py-2.5 px-3">Срок оплаты</th>
                        <th className="py-2.5 px-3 text-right">План ({currency})</th>
                        <th className="py-2.5 px-3 text-right">Оплачено ({currency})</th>
                        <th className="py-2.5 px-3 text-right">Остаток ({currency})</th>
                        <th className="py-2.5 px-3 text-center">Статус</th>
                        <th className="py-2.5 px-3 text-right">Действие</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {deal.schedules.map((s) => {
                        const amount = s.amount_minor / 100;
                        const paid = (s.paid_amount_minor || 0) / 100;
                        const remain = Math.max(0, amount - paid);

                        return (
                          <tr key={s.id} className="hover:bg-slate-50/80 transition">
                            <td className="py-2.5 px-3 font-bold text-slate-700">№{s.payment_number}</td>
                            <td className="py-2.5 px-3 font-medium text-slate-900 flex items-center gap-1">
                              <Calendar className="h-3 w-3 text-slate-400" />
                              {s.due_date}
                            </td>
                            <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                              {amount.toLocaleString()}
                            </td>
                            <td className="py-2.5 px-3 text-right font-semibold text-emerald-700">
                              {paid > 0 ? paid.toLocaleString() : '—'}
                            </td>
                            <td className="py-2.5 px-3 text-right font-bold text-rose-600">
                              {remain > 0 ? remain.toLocaleString() : '0'}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              {getScheduleStatusBadge(s.status)}
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              {remain > 0 ? (
                                <button
                                  onClick={() => handleOpenPayment(s.id)}
                                  className="rounded-lg bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition cursor-pointer"
                                >
                                  Оплатить
                                </button>
                              ) : (
                                <span className="text-[11px] text-emerald-600 font-bold flex items-center justify-end gap-0.5">
                                  <CheckCircle2 className="h-3 w-3" /> Закрыт
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* SECTION 5: Actual Payments Log */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4 shadow-xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                    <CreditCard className="h-4 w-4 text-emerald-600" />
                    История фактических платежей ({deal.payments?.length || 0})
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Все внесенные денежные поступления по данному договору
                  </p>
                </div>

                {remainingDebt > 0 && (
                  <button
                    onClick={() => handleOpenPayment(null)}
                    className="flex items-center gap-1 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 shadow-xs transition cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>+ Внести оплату</span>
                  </button>
                )}
              </div>

              {(!deal.payments || deal.payments.length === 0) ? (
                <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 rounded-xl">
                  Пока не зафиксировано ни одной оплаты. Нажмите «Принять оплату».
                </div>
              ) : (
                <div className="space-y-2">
                  {deal.payments.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <strong className="text-xs text-slate-900 font-bold">
                            +{(p.amount_minor / 100).toLocaleString()} {currency}
                          </strong>
                          <span className="rounded-md bg-white border border-slate-200 px-1.5 py-0.5 text-[10px] font-bold text-slate-600">
                            {p.method === 'CASH' && '💵 Наличные'}
                            {p.method === 'BANK_TRANSFER' && '🏦 Банк'}
                            {p.method === 'CARD' && '💳 Карта'}
                            {p.method === 'OTHER' && '📁 Прочее'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500">
                          Дата: <strong>{p.payment_date}</strong> {p.reference ? `• Чек/Референс: ${p.reference}` : ''} {p.created_by_name ? `• Принял: ${p.created_by_name}` : ''}
                        </p>
                        {p.comment && (
                          <p className="text-[10px] text-slate-600 italic">Примечание: {p.comment}</p>
                        )}
                      </div>

                      <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-lg">
                        <CheckCircle2 className="h-3 w-3" /> Проведено
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Payment Record Modal */}
      {isPaymentModalOpen && (
        <PaymentRecordModal
          isOpen={isPaymentModalOpen}
          onClose={() => setIsPaymentModalOpen(false)}
          deal={deal}
          initialScheduleId={selectedScheduleIdForPayment}
          onPaymentSuccess={handlePaymentSuccess}
        />
      )}
    </div>
  );
};
