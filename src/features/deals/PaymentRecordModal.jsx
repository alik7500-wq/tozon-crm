import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import {
  X,
  CreditCard,
  Calendar,
  DollarSign,
  AlertCircle,
  CheckCircle2,
  FileText,
  Wallet
} from 'lucide-react';

export const PaymentRecordModal = ({
  isOpen,
  onClose,
  deal,
  initialScheduleId = null,
  onPaymentSuccess,
}) => {
  const [scheduleId, setScheduleId] = useState(initialScheduleId);
  const [amount, setAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [method, setMethod] = useState('CASH'); // CASH, BANK_TRANSFER, CARD, OTHER
  const [reference, setReference] = useState('');
  const [comment, setComment] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (deal) {
      setScheduleId(initialScheduleId);
      setError('');

      if (initialScheduleId && deal.schedules) {
        const targetSchedule = deal.schedules.find((s) => s.id === initialScheduleId);
        if (targetSchedule) {
          const remainingMinor = (targetSchedule.amount_minor || 0) - (targetSchedule.paid_amount_minor || 0);
          setAmount(String(Math.max(0, remainingMinor / 100)));
        }
      } else {
        // default to remaining debt or first unpaid installment
        if (deal.schedules && deal.schedules.length > 0) {
          const unpaid = deal.schedules.find((s) => s.status !== 'PAID');
          if (unpaid) {
            setScheduleId(unpaid.id);
            const remainingMinor = (unpaid.amount_minor || 0) - (unpaid.paid_amount_minor || 0);
            setAmount(String(Math.max(0, remainingMinor / 100)));
          } else {
            setAmount(String((deal.remaining_debt_minor || 0) / 100));
          }
        } else {
          setAmount(String((deal.remaining_debt_minor || 0) / 100));
        }
      }
    }
  }, [deal, initialScheduleId, isOpen]);

  if (!isOpen || !deal) return null;

  const currency = deal.currency || deal.project_currency || 'TJS';

  const handleScheduleChange = (e) => {
    const sId = e.target.value ? parseInt(e.target.value, 10) : null;
    setScheduleId(sId);
    if (sId && deal.schedules) {
      const selected = deal.schedules.find((s) => s.id === sId);
      if (selected) {
        const remainingMinor = (selected.amount_minor || 0) - (selected.paid_amount_minor || 0);
        setAmount(String(Math.max(0, remainingMinor / 100)));
      }
    }
  };

  const handleQuickFillTotalDebt = () => {
    setAmount(String((deal.remaining_debt_minor || 0) / 100));
    setScheduleId(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const parsedAmount = parseFloat(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      setError('Укажите корректную сумму платежа больше 0');
      return;
    }

    const amountMinor = Math.round(parsedAmount * 100);

    setIsLoading(true);
    try {
      const res = await api.post(`/deals/${deal.id}/payments`, {
        amount_minor: amountMinor,
        payment_date: paymentDate,
        method,
        schedule_id: scheduleId || null,
        reference: reference.trim() || null,
        comment: comment.trim() || null,
      });

      const updatedDeal = res.data?.deal || res.deal || res;
      if (onPaymentSuccess) {
        onPaymentSuccess(updatedDeal);
      }
      onClose();
    } catch (err) {
      setError(err.message || 'Ошибка сохранения платежа');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-gradient-to-r from-slate-900 to-slate-800 px-6 py-4 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <Wallet className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold">Принять оплату</h3>
              <p className="text-xs text-slate-300">
                Договор № {deal.contract_number} • {deal.lead_name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-700 hover:text-white transition cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" />
              <span>{error}</span>
            </div>
          )}

          {/* Deal summary block */}
          <div className="flex items-center justify-between rounded-xl bg-slate-50 border border-slate-200/80 p-3 text-xs">
            <div>
              <span className="text-slate-500 block">Квартира:</span>
              <strong className="text-slate-900">
                {deal.project_name}, Кв. №{deal.unit_number}
              </strong>
            </div>
            <div className="text-right">
              <span className="text-slate-500 block">Остаток долга:</span>
              <strong className="text-rose-600 font-bold text-sm">
                {((deal.remaining_debt_minor || 0) / 100).toLocaleString()} {currency}
              </strong>
            </div>
          </div>

          {/* Installment selection if schedules exist */}
          {deal.schedules && deal.schedules.length > 0 && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Привязать к платежу из графика:
              </label>
              <select
                value={scheduleId || ''}
                onChange={handleScheduleChange}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              >
                <option value="">-- Общий платеж по договору (без привязки к строке) --</option>
                {deal.schedules.map((s) => {
                  const sAmount = s.amount_minor / 100;
                  const sPaid = (s.paid_amount_minor || 0) / 100;
                  const sRemain = Math.max(0, sAmount - sPaid);
                  return (
                    <option key={s.id} value={s.id}>
                      Платеж №{s.payment_number} (до {s.due_date}) — План: {sAmount.toLocaleString()} {currency} | Остаток: {sRemain.toLocaleString()} {currency} [{s.status}]
                    </option>
                  );
                })}
              </select>
            </div>
          )}

          {/* Amount input */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-slate-700">
                Сумма платежа ({currency}) *
              </label>
              <button
                type="button"
                onClick={handleQuickFillTotalDebt}
                className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 cursor-pointer"
              >
                Оплатить весь остаток
              </button>
            </div>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                {currency}
              </span>
            </div>
          </div>

          {/* Date & Payment Method */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Дата платежа *
              </label>
              <input
                type="date"
                required
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Способ оплаты *
              </label>
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              >
                <option value="CASH">💵 Наличные (в кассу)</option>
                <option value="BANK_TRANSFER">🏦 Банковский перевод</option>
                <option value="CARD">💳 Банковская карта</option>
                <option value="OTHER">📁 Прочее / Эл. кошелек</option>
              </select>
            </div>
          </div>

          {/* Reference / Cheque number */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Номер чека / квитанции (ПКО / Референс)
            </label>
            <input
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="Например: ПКО-10492 / Банк Эсхата"
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Comment */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Примечание
            </label>
            <input
              type="text"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Дополнительные сведения о платеже..."
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Footer buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-2 text-xs font-bold text-white shadow-md hover:from-emerald-700 hover:to-teal-700 transition cursor-pointer disabled:opacity-50"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>{isLoading ? 'Сохранение...' : 'Зафиксировать оплату'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
