import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { financeApi } from '../../api/finance.api';
import { dictionariesApi } from '../../api/dictionaries.api';
import { useModalDismiss } from '../../hooks/useModalDismiss';
import { formatContractNumber } from '../../utils/formatters';
import {
  X,
  CreditCard,
  Calendar,
  DollarSign,
  AlertCircle,
  CheckCircle2,
  FileText,
  Wallet,
  Building2,
  User,
  ArrowRightLeft,
  Coins
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

  // Cash desks and currencies
  const [cashDesk, setCashDesk] = useState('MAIN_CASHIER');
  const [cashCurrency, setCashCurrency] = useState('USD'); // USD or TJS
  const [exchangeRate, setExchangeRate] = useState('9.27'); // default Eskhata USD/TJS rate
  const [paymentMethods, setPaymentMethods] = useState([]);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const dealCurrency = deal?.currency || deal?.project_currency || 'USD';

  useEffect(() => {
    if (isOpen) {
      financeApi.getEskhataRate()
        .then(res => {
          const rate = res?.data?.sellRate || res?.sellRate;
          if (rate) setExchangeRate(String(rate));
        })
        .catch(() => {});

      dictionariesApi.getItems('PAYMENT_METHOD')
        .then(items => {
          if (items && items.length > 0) setPaymentMethods(items);
        })
        .catch(() => {});
    }
  }, [isOpen]);

  useEffect(() => {
    if (deal) {
      setScheduleId(initialScheduleId);
      setError('');
      setCashCurrency(dealCurrency === 'TJS' ? 'TJS' : 'USD');

      let targetAmount = 0;
      if (initialScheduleId && deal.schedules) {
        const targetSchedule = deal.schedules.find((s) => s.id === initialScheduleId);
        if (targetSchedule) {
          const remainingMinor = (targetSchedule.amount_minor || 0) - (targetSchedule.paid_amount_minor || 0);
          targetAmount = Math.max(0, remainingMinor / 100);
        }
      } else {
        if (deal.schedules && deal.schedules.length > 0) {
          const unpaid = deal.schedules.find((s) => s.status !== 'PAID');
          if (unpaid) {
            setScheduleId(unpaid.id);
            const remainingMinor = (unpaid.amount_minor || 0) - (unpaid.paid_amount_minor || 0);
            targetAmount = Math.max(0, remainingMinor / 100);
          } else {
            targetAmount = (deal.remaining_debt_minor || 0) / 100;
          }
        } else {
          targetAmount = (deal.remaining_debt_minor || 0) / 100;
        }
      }

      setAmount(String(targetAmount > 0 ? targetAmount : ''));
    }
  }, [deal, initialScheduleId, isOpen]);

  const isDirty = Boolean(amount && parseFloat(amount) > 0 || reference.trim() || comment.trim());

  const { requestClose } = useModalDismiss({
    isOpen: Boolean(isOpen && deal),
    onClose,
    isDirty,
    confirmMessage: 'Внесенные данные платежа не сохранены. Вы действительно хотите закрыть окно?'
  });

  if (!isOpen || !deal) return null;

  const cashDesksList = [
    { id: 'MAIN_CASHIER', name: 'Главная касса компании (Бухгалтерия)', icon: '🏢' },
    { id: 'DIRECTOR', name: 'Касса Директора (Руководство)', icon: '👔' },
    { id: 'SALES_MANAGER', name: `Касса Менеджера продаж (${deal.manager_name || 'Отдел продаж'})`, icon: '💼' },
    { id: 'FINANCE_OFFICE', name: 'Касса Казначейства / Финансового отдела', icon: '🏦' },
    { id: 'BANK_ACCOUNT', name: 'Расчетный счет в банке (Безналичные)', icon: '🏛' },
  ];

  const handleScheduleChange = (e) => {
    const sId = e.target.value ? parseInt(e.target.value, 10) : null;
    setScheduleId(sId);
    if (sId && deal.schedules) {
      const selected = deal.schedules.find((s) => s.id === sId);
      if (selected) {
        const remainingMinor = (selected.amount_minor || 0) - (selected.paid_amount_minor || 0);
        const rem = Math.max(0, remainingMinor / 100);
        if (cashCurrency === dealCurrency) {
          setAmount(String(rem));
        } else if (dealCurrency === 'USD' && cashCurrency === 'TJS') {
          const rate = parseFloat(exchangeRate) || 10.9;
          setAmount(String((rem * rate).toFixed(2)));
        } else if (dealCurrency === 'TJS' && cashCurrency === 'USD') {
          const rate = parseFloat(exchangeRate) || 10.9;
          setAmount(String((rem / rate).toFixed(2)));
        }
      }
    }
  };

  const handleQuickFillTotalDebt = () => {
    const rem = (deal.remaining_debt_minor || 0) / 100;
    if (cashCurrency === dealCurrency) {
      setAmount(String(rem));
    } else if (dealCurrency === 'USD' && cashCurrency === 'TJS') {
      const rate = parseFloat(exchangeRate) || 10.9;
      setAmount(String((rem * rate).toFixed(2)));
    } else if (dealCurrency === 'TJS' && cashCurrency === 'USD') {
      const rate = parseFloat(exchangeRate) || 10.9;
      setAmount(String((rem / rate).toFixed(2)));
    }
    setScheduleId(null);
  };

  // Convert input amount to deal base currency
  const calculateDealEquivalent = () => {
    const entered = parseFloat(amount) || 0;
    const rate = parseFloat(exchangeRate) || 10.9;
    if (cashCurrency === dealCurrency) {
      return entered;
    }
    if (dealCurrency === 'USD' && cashCurrency === 'TJS') {
      return entered > 0 && rate > 0 ? entered / rate : 0;
    }
    if (dealCurrency === 'TJS' && cashCurrency === 'USD') {
      return entered > 0 && rate > 0 ? entered * rate : 0;
    }
    return entered;
  };

  const dealEquivalent = calculateDealEquivalent();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const parsedAmount = parseFloat(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      setError('Укажите корректную сумму платежа больше 0');
      return;
    }

    const equivalentInDealCurrency = calculateDealEquivalent();
    const amountMinor = Math.round(equivalentInDealCurrency * 100);

    const selectedDeskObj = cashDesksList.find((c) => c.id === cashDesk);
    const deskName = selectedDeskObj ? selectedDeskObj.name : cashDesk;

    const fullCommentParts = [];
    fullCommentParts.push(`[Касса: ${deskName}] [Раздел: ${cashCurrency}]`);
    if (cashCurrency !== dealCurrency) {
      fullCommentParts.push(`Внесено в кассу: ${parsedAmount.toLocaleString()} ${cashCurrency} (Курс: ${exchangeRate})`);
    }
    if (comment.trim()) {
      fullCommentParts.push(comment.trim());
    }

    setIsLoading(true);
    try {
      const res = await api.post(`/deals/${deal.id}/payments`, {
        amount_minor: amountMinor,
        payment_date: paymentDate,
        method,
        schedule_id: scheduleId || null,
        reference: reference.trim() ? `${reference.trim()} (${cashCurrency})` : `Касса: ${cashCurrency}`,
        comment: fullCommentParts.join(' • '),
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in overflow-y-auto">
      <div className="relative w-full max-w-lg my-8 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 px-6 py-4 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <Wallet className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold">Принять оплату в кассу</h3>
              <p className="text-xs text-slate-300">
                Договор № {formatContractNumber(deal.contract_number)} • {deal.lead_name}
              </p>
            </div>
          </div>
          <button
            onClick={requestClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-700 hover:text-white transition cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" />
              <span>{error}</span>
            </div>
          )}

          {/* Deal summary block */}
          <div className="flex items-center justify-between rounded-2xl bg-slate-50 border border-slate-200/80 p-3.5 text-xs">
            <div>
              <span className="text-slate-400 block font-semibold">Объект и квартира:</span>
              <strong className="text-slate-900">
                {deal.project_name}, Кв. №{deal.unit_number}
              </strong>
            </div>
            <div className="text-right">
              <span className="text-slate-400 block font-semibold">Остаток долга по договору:</span>
              <strong className="text-rose-600 font-black text-sm">
                {((deal.remaining_debt_minor || 0) / 100).toLocaleString()} {dealCurrency}
              </strong>
            </div>
          </div>

          {/* 1. Касса ответственного лица */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-blue-600" />
              <span>Касса ответственного лица *</span>
            </label>
            <select
              value={cashDesk}
              onChange={(e) => setCashDesk(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-blue-500 focus:bg-white transition cursor-pointer"
            >
              {cashDesksList.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.icon} {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* 2. Раздел валюты в кассе: USD / Сомони (TJS) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <Coins className="h-3.5 w-3.5 text-emerald-600" />
              <span>Раздел валюты кассы *</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setCashCurrency('USD')}
                className={`flex items-center justify-center gap-2 rounded-xl py-2 px-3 text-xs font-bold border transition cursor-pointer ${
                  cashCurrency === 'USD'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <span>💵</span>
                <span>Раздел USD (Доллары)</span>
              </button>

              <button
                type="button"
                onClick={() => setCashCurrency('TJS')}
                className={`flex items-center justify-center gap-2 rounded-xl py-2 px-3 text-xs font-bold border transition cursor-pointer ${
                  cashCurrency === 'TJS'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <span>🇹🇯</span>
                <span>Раздел Сомони (TJS)</span>
              </button>
            </div>
          </div>

          {/* If currency conversion is needed */}
          {cashCurrency !== dealCurrency && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-3.5 space-y-2 text-xs">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="font-bold text-amber-900 flex items-center gap-1">
                  <ArrowRightLeft className="h-3.5 w-3.5 text-amber-700" />
                  Конвертация ({cashCurrency} → {dealCurrency})
                </span>
                <div className="flex items-center gap-1.5 text-[11px]">
                  <span className="inline-flex items-center gap-1 font-bold text-amber-900 bg-amber-200/80 px-2 py-0.5 rounded-md border border-amber-300">
                    🏦 Эсхата (Продажа):
                  </span>
                  <span className="text-amber-800 font-semibold">1 USD =</span>
                  <input
                    type="number"
                    step="0.01"
                    value={exchangeRate}
                    onChange={(e) => setExchangeRate(e.target.value)}
                    className="w-16 rounded-md border border-amber-300 bg-white px-1.5 py-0.5 text-xs font-black text-amber-950 outline-none text-center shadow-xs"
                  />
                  <span className="text-amber-800 font-bold">TJS</span>
                </div>
              </div>

              <div className="flex justify-between items-center text-[11px] text-amber-900 pt-1 border-t border-amber-200/60">
                <span>Будет списано с долга по договору:</span>
                <strong className="text-xs text-amber-950 font-black">
                  {dealEquivalent.toFixed(2)} {dealCurrency}
                </strong>
              </div>
            </div>
          )}

          {/* Amount input */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-slate-700">
                Сумма к внесению в кассу ({cashCurrency}) *
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
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2.5 text-base font-black text-slate-900 outline-none focus:border-blue-500 focus:bg-white"
              />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 font-extrabold text-xs text-slate-500">
                {cashCurrency}
              </span>
            </div>
          </div>

          {/* Schedule link selection */}
          {deal.schedules && deal.schedules.length > 0 && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Привязать к платежу из графика рассрочки:
              </label>
              <select
                value={scheduleId || ''}
                onChange={handleScheduleChange}
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-medium outline-none focus:border-blue-500 focus:bg-white cursor-pointer"
              >
                <option value="">Без привязки к конкретному платежу</option>
                {deal.schedules.map((s, idx) => {
                  const rem = Math.max(0, (s.amount_minor || 0) - (s.paid_amount_minor || 0)) / 100;
                  const isPaid = s.status === 'PAID' || rem <= 0;
                  return (
                    <option key={s.id} value={s.id} disabled={isPaid}>
                      Платеж №{s.payment_number || idx + 1} (до {s.due_date}) — План: {((s.amount_minor || 0) / 100).toLocaleString()} {dealCurrency} | Остаток: {rem.toLocaleString()} {dealCurrency} [{s.status}]
                    </option>
                  );
                })}
              </select>
            </div>
          )}

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
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs outline-none focus:border-blue-500 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Способ оплаты *
              </label>
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-medium outline-none focus:border-blue-500 focus:bg-white cursor-pointer"
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
              className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs outline-none focus:border-blue-500 focus:bg-white"
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
              className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs outline-none focus:border-blue-500 focus:bg-white"
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
