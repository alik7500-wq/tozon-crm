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
  AlertCircle
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
  const [responsibleUserId, setResponsibleUserId] = useState('');
  const [paymentType, setPaymentType] = useState('FULL');
  const [installmentMonths, setInstallmentMonths] = useState('0');
  const [reservationExpiresAt, setReservationExpiresAt] = useState('');
  const [barterDescription, setBarterDescription] = useState('');

  // Populate form from deal prop
  useEffect(() => {
    if (deal) {
      setContractNumber(deal.contract_number || '');
      setDealDate(deal.deal_date || deal.created_at?.split('T')[0] || '');
      setLeadName(deal.lead_name || '');
      setLeadPhone(deal.lead_phone || '');
      setPassportSeries(deal.passport_series || '');
      setPassportNumber(deal.passport_number || '');
      setResponsibleUserId(deal.responsible_user_id ? String(deal.responsible_user_id) : '');
      setPaymentType(deal.payment_type || 'FULL');
      setInstallmentMonths(String(deal.installment_months || 0));
      setReservationExpiresAt(deal.reservation_expires_at ? deal.reservation_expires_at.split('T')[0] : '');
      setBarterDescription(deal.barter_description || '');
      setError('');
    }
  }, [deal, isOpen]);

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
      responsibleUserId !== (deal.responsible_user_id ? String(deal.responsible_user_id) : '') ||
      paymentType !== (deal.payment_type || 'FULL') ||
      installmentMonths !== String(deal.installment_months || 0) ||
      reservationExpiresAt !== (deal.reservation_expires_at ? deal.reservation_expires_at.split('T')[0] : '') ||
      barterDescription !== (deal.barter_description || '')
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
      const payload = {
        contract_number: contractNumber.trim(),
        deal_date: dealDate,
        lead_name: leadName.trim(),
        lead_phone: leadPhone.trim(),
        passport_series: passportSeries.trim(),
        passport_number: passportNumber.trim(),
        responsible_user_id: responsibleUserId ? parseInt(responsibleUserId, 10) : null,
        payment_type: paymentType,
        installment_months: parseInt(installmentMonths, 10) || 0,
        reservation_expires_at: reservationExpiresAt || null,
        barter_description: barterDescription.trim() || null
      };

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
      <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-3.5 border-b border-slate-100 bg-slate-50/70">
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
                Договор №{deal.contract_number} • Кв. №{deal.unit_number} ({deal.project_name})
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

        {/* Body Form - Unified 2-Column Layout */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          
          {error && (
            <div className="flex items-center gap-2 rounded-xl bg-rose-50 border border-rose-200 p-2.5 text-rose-700 font-medium text-xs">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            
            {/* Left Card: Dates, Contract & Payment Terms */}
            <div className="bg-amber-50/30 rounded-2xl p-4 border border-amber-200/60 space-y-3">
              <div className="flex items-center gap-2 font-bold text-slate-900 text-xs pb-1 border-b border-amber-200/50">
                <Calendar className="h-3.5 w-3.5 text-amber-600" />
                <span>Дата, договор и условия</span>
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
                    onChange={(e) => setPaymentType(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition cursor-pointer"
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
                    value={installmentMonths}
                    onChange={(e) => setInstallmentMonths(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
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

            {/* Right Card: Buyer & Passport Info */}
            <div className="bg-slate-50/70 rounded-2xl p-4 border border-slate-200/90 space-y-3">
              <div className="flex items-center gap-2 font-bold text-slate-900 text-xs pb-1 border-b border-slate-200/60">
                <User className="h-3.5 w-3.5 text-blue-600" />
                <span>Данные покупателя</span>
              </div>

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

              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Серия
                  </label>
                  <input
                    type="text"
                    value={passportSeries}
                    onChange={(e) => setPassportSeries(e.target.value)}
                    placeholder="А"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
                  />
                </div>

                <div className="col-span-2">
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
              </div>
            </div>

          </div>

          {/* Footer actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
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
