import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { financeApi } from '../../api/finance.api';
import { dictionariesApi } from '../../api/dictionaries.api';
import { useModalDismiss } from '../../hooks/useModalDismiss';
import { PaymentReceiptPrintModal } from '../finance/PaymentReceiptPrintModal';
import { formatContractNumber } from '../../utils/formatters';
import { useAuth } from '../auth/AuthContext';
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
  Coins,
  Printer
} from 'lucide-react';

export const PaymentRecordModal = ({
  isOpen,
  onClose,
  deal,
  initialScheduleId = null,
  onPaymentSuccess,
}) => {
  const { user } = useAuth();
  const isManager = user?.role === 'SALES_MANAGER' || user?.id === 3;
  const DADOJON_CASH_DESK_ID = 'fba621e6-4ebe-4459-8623-19f46d864cc6';
  const AKMALHON_CASH_DESK_ID = 'ab90800a-73af-4cf7-88c2-397c304e2edf';
  const ILHOMJON_CASH_DESK_ID = '6ddf2f64-0a77-4aeb-8daf-a391b2da0141';

  const [scheduleId, setScheduleId] = useState(initialScheduleId);
  const [amount, setAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [method, setMethod] = useState('CASH'); // CASH, BANK_TRANSFER, CARD, OTHER
  const [reference, setReference] = useState('');
  const [comment, setComment] = useState('');

  // Cash desks and currencies
  const [selectedCashDeskId, setSelectedCashDeskId] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [cashDesksDict, setCashDesksDict] = useState([]);
  const [cashCurrency, setCashCurrency] = useState('TJS'); // Default TJS (национальная валюта)
  const [exchangeRate, setExchangeRate] = useState('9.27'); // default Eskhata USD/TJS rate
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [formIdempotencyKey, setFormIdempotencyKey] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const [recordedPayment, setRecordedPayment] = useState(null);
  const [updatedDealResult, setUpdatedDealResult] = useState(null);
  const [paymentReport, setPaymentReport] = useState(null);

  const dealCurrency = deal?.currency || deal?.project_currency || 'USD';

  useEffect(() => {
    if (isOpen) {
      setFormIdempotencyKey(`pko_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`);
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

      dictionariesApi.getItems('CASH_DESK', { purpose: 'income' })
        .then(items => {
          if (items && items.length > 0) setCashDesksDict(items);
        })
        .catch(() => {});
    }
  }, [isOpen]);

  useEffect(() => {
    if (deal) {
      setScheduleId(initialScheduleId);
      setError('');
      setCashCurrency('TJS'); // Default always Сомони (TJS)

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

      const rate = parseFloat(exchangeRate) || 9.27;
      if (dealCurrency === 'USD') {
        const amountTJS = targetAmount > 0 ? (targetAmount * rate).toFixed(2) : '';
        setAmount(String(amountTJS));
      } else {
        setAmount(String(targetAmount > 0 ? targetAmount : ''));
      }
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

  if (paymentReport) {
    return (
      <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
        <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-emerald-200 bg-white shadow-2xl p-6 text-center space-y-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-900">Оплата принята и сконвертирована</h3>
            <p className="text-xs text-slate-500 mt-1">Платеж успешно зарегистрирован в единой транзакции</p>
          </div>

          <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4 text-left space-y-2.5 text-xs">
            <div className="flex justify-between items-center pb-2 border-b border-slate-200">
              <span className="text-slate-500 font-medium">Внесено в кассу:</span>
              <span className="font-black text-emerald-600 text-sm">
                +{paymentReport.amount_tjs?.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} TJS
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-slate-500 font-medium">Эквивалент в сделке (USD):</span>
              <span className="font-bold text-slate-900">
                ${paymentReport.amount_usd?.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} USD
              </span>
            </div>

            {paymentReport.exchange_rate && (
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Курс пересчета (Эсхата):</span>
                <span className="font-semibold text-slate-700">
                  1 USD = {paymentReport.exchange_rate} TJS
                </span>
              </div>
            )}

            <div className="flex justify-between items-center">
              <span className="text-slate-500 font-medium">Касса зачисления:</span>
              <span className="font-bold text-slate-800 truncate max-w-[200px]" title={paymentReport.cash_desk_name}>
                {paymentReport.cash_desk_name}
              </span>
            </div>

            <div className="pt-2 border-t border-slate-200 space-y-2">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Созданный документ:</div>
              <div className="flex justify-between items-center">
                <span className="text-emerald-600 font-bold">Ордер прихода (ПКО):</span>
                <span className="font-mono font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  {paymentReport.reference}
                </span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-200 space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Договор:</span>
                <span className="font-bold text-slate-800">№ {paymentReport.contract_number}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Плательщик:</span>
                <span className="font-bold text-slate-800">{paymentReport.payer_name}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => {
                const p = paymentReport.payment;
                setPaymentReport(null);
                setRecordedPayment(p);
              }}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold text-xs hover:from-emerald-700 hover:to-teal-700 transition cursor-pointer shadow-md shadow-emerald-600/20"
            >
              <Printer className="h-4 w-4" />
              <span>Печать ПКО (Квитанция)</span>
            </button>
            <button
              type="button"
              onClick={() => {
                if (onPaymentSuccess && updatedDealResult) {
                  onPaymentSuccess(updatedDealResult);
                }
                setPaymentReport(null);
                onClose();
              }}
              className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-50 transition cursor-pointer"
            >
              Закрыть
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (recordedPayment) {
    return (
      <PaymentReceiptPrintModal
        payment={recordedPayment}
        deal={deal}
        onClose={() => {
          if (onPaymentSuccess && updatedDealResult) {
            onPaymentSuccess(updatedDealResult);
          }
          setRecordedPayment(null);
          onClose();
        }}
      />
    );
  }

  const MANAGER_ALLOWED_DESK_IDS = [
    AKMALHON_CASH_DESK_ID,
    ILHOMJON_CASH_DESK_ID,
    DADOJON_CASH_DESK_ID
  ];

  const rawDesks = (cashDesksDict && cashDesksDict.length > 0)
    ? cashDesksDict.map(d => ({
        id: d.id || d.code,
        code: d.code,
        name: d.name,
        icon: d.icon || (d.code?.includes('MANAGER') ? '💼' : '🏢')
      }))
    : [
        { id: AKMALHON_CASH_DESK_ID, code: 'SALES_MANAGER', name: 'Касса Отдела продаж (Акмалхон)', icon: '💼' },
        { id: ILHOMJON_CASH_DESK_ID, code: 'MAIN_CASHIER', name: 'Касса компании "Тозон" (Илхомчон)', icon: '🏢' },
        { id: DADOJON_CASH_DESK_ID, code: 'SALES_MANAGER_Dadojon', name: 'Касса менеджера (Дадочон)', icon: '💼' },
        { id: 'BANK_ACCOUNT', code: 'BANK_ACCOUNT', name: 'Расчетный счет в банке (Безналичные)', icon: '🏛' },
      ];

  const cashDesksList = isManager
    ? rawDesks.filter(d => 
        MANAGER_ALLOWED_DESK_IDS.includes(d.id) || 
        ['SALES_MANAGER', 'MAIN_CASHIER', 'SALES_MANAGER_Dadojon'].includes(d.code)
      )
    : rawDesks;

  const handleCurrencyChange = (newCurrency) => {
    if (newCurrency === cashCurrency) return;
    const currentVal = parseFloat(amount);
    const rate = parseFloat(exchangeRate) || 9.27;
    if (currentVal && currentVal > 0) {
      if (cashCurrency === 'USD' && newCurrency === 'TJS') {
        setAmount(String((currentVal * rate).toFixed(2)));
      } else if (cashCurrency === 'TJS' && newCurrency === 'USD') {
        setAmount(String((currentVal / rate).toFixed(2)));
      }
    }
    setCashCurrency(newCurrency);
  };

  const handleScheduleChange = (e) => {
    const sId = e.target.value ? parseInt(e.target.value, 10) : null;
    setScheduleId(sId);
    if (sId && deal.schedules) {
      const selected = deal.schedules.find((s) => s.id === sId);
      if (selected) {
        if (selected.due_date) {
          setPaymentDate(selected.due_date);
        }
        const remainingMinor = (selected.amount_minor || 0) - (selected.paid_amount_minor || 0);
        const rem = Math.max(0, remainingMinor / 100);
        if (cashCurrency === dealCurrency) {
          setAmount(String(rem));
        } else if (dealCurrency === 'USD' && cashCurrency === 'TJS') {
          const rate = parseFloat(exchangeRate) || 9.27;
          setAmount(String((rem * rate).toFixed(2)));
        } else if (dealCurrency === 'TJS' && cashCurrency === 'USD') {
          const rate = parseFloat(exchangeRate) || 9.27;
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
      const rate = parseFloat(exchangeRate) || 9.27;
      setAmount(String((rem * rate).toFixed(2)));
    } else if (dealCurrency === 'TJS' && cashCurrency === 'USD') {
      const rate = parseFloat(exchangeRate) || 9.27;
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

    if (!selectedCashDeskId) {
      setError('Необходимо обязательно выбрать кассу зачисления (кому переданы деньги)');
      return;
    }

    // Если это менеджер, запрашиваем обязательное подтверждение передачи денег перед проведением
    if (isManager) {
      setShowConfirmModal(true);
      return;
    }

    await doExecutePayment();
  };

  const doExecutePayment = async () => {
    setError('');
    const parsedAmount = parseFloat(amount);
    const equivalentInDealCurrency = calculateDealEquivalent();
    const amountMinor = Math.round(equivalentInDealCurrency * 100);

    const activeDeskId = selectedCashDeskId;
    const selectedDeskObj = cashDesksList.find((c) => c.id === activeDeskId || c.code === activeDeskId);
    const deskName = selectedDeskObj ? selectedDeskObj.name : 'Касса Отдела продаж (Акмалхон)';

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
      const cleanRef = reference.trim() 
        ? (reference.trim().toUpperCase().startsWith('ПКО') ? reference.trim() : `ПКО-${reference.trim()}`)
        : `ПКО-${Date.now().toString().slice(-4)}`;

      const res = await api.post(`/deals/${deal.id}/payments`, {
        amount_minor: amountMinor,
        payment_date: paymentDate,
        method,
        schedule_id: scheduleId || null,
        reference: cleanRef,
        comment: fullCommentParts.join(' • '),
        cash_desk_id: activeDeskId,
        idempotency_key: formIdempotencyKey
      });

      // Cash payment details in TJS for official PKO receipt
      const cashAmountTJS = cashCurrency === 'TJS' 
        ? parsedAmount 
        : Number((parsedAmount * (parseFloat(exchangeRate) || 9.27)).toFixed(2));

      const createdPayment = {
        id: res.data?.payment?.id || res.data?.id || res.id || 'ПКО',
        payment_number: cleanRef,
        payment_date: paymentDate,
        amount: cashAmountTJS,
        amount_minor: Math.round(cashAmountTJS * 100),
        currency: 'TJS',
        cash_amount: cashAmountTJS,
        cash_currency: 'TJS',
        exchange_rate: exchangeRate,
        payment_method: method,
        method: method,
        reference: cleanRef,
        payer_name: deal.lead_name || deal.buyer_name,
        comment: fullCommentParts.join(' • ')
      };

      const updatedDeal = res.data?.deal || res.deal || res;
      setUpdatedDealResult(updatedDeal);

      // If paid in TJS (or conversion happened), show the conversion & payment report modal first
      if (cashCurrency === 'TJS' || cashCurrency !== dealCurrency) {
        setPaymentReport({
          payment: createdPayment,
          deal: updatedDeal || deal,
          amount_tjs: cashAmountTJS,
          amount_usd: equivalentInDealCurrency,
          exchange_rate: exchangeRate,
          cash_desk_name: deskName,
          reference: cleanRef,
          payer_name: deal.lead_name || deal.buyer_name,
          contract_number: formatContractNumber(deal.contract_number),
          payment_date: paymentDate,
          method: method
        });
      } else {
        setRecordedPayment(createdPayment);
      }
    } catch (err) {
      setError(err.message || 'Ошибка сохранения платежа');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="relative w-full max-w-4xl rounded-3xl border border-slate-200 bg-white p-4 sm:p-5 shadow-2xl space-y-3.5 max-h-[96vh] flex flex-col justify-between">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 -mx-4 -mt-4 sm:-mx-5 sm:-mt-5 px-5 py-3.5 text-white rounded-t-3xl shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shrink-0">
              <Wallet className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-black leading-tight">Принять оплату в кассу</h3>
              <p className="text-xs text-slate-300">
                Договор № {formatContractNumber(deal.contract_number)} • {deal.lead_name}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={requestClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition cursor-pointer"
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
            {/* LEFT COLUMN: SUMMARY, CASH DESK, CURRENCY */}
            <div className="space-y-3 flex flex-col justify-between">
              {/* Deal summary block */}
              <div className="flex items-center justify-between rounded-2xl bg-slate-50 border border-slate-200/80 p-3 text-xs">
                <div>
                  <span className="text-slate-400 block font-semibold text-[11px]">Объект и квартира:</span>
                  <strong className="text-slate-900 font-bold text-xs">
                    {deal.project_name}, Кв. №{deal.unit_number}
                  </strong>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 block font-semibold text-[11px]">Остаток долга:</span>
                  <strong className="text-rose-600 font-black text-sm">
                    {((deal.remaining_debt_minor || 0) / 100).toLocaleString()} {dealCurrency}
                  </strong>
                </div>
              </div>

              {/* 1. Касса зачисления / Кому переданы деньги */}
              <div className="rounded-2xl bg-slate-50 p-3 border border-slate-200 space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5 text-blue-600" />
                    <span>{isManager ? 'Касса зачисления / Кому переданы деньги *' : 'Касса получения средств *'}</span>
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 text-[10px] font-bold">
                    Обязательный выбор
                  </span>
                </label>
                <select
                  value={selectedCashDeskId}
                  onChange={(e) => setSelectedCashDeskId(e.target.value)}
                  className={`w-full rounded-xl border px-3 py-2 text-xs font-bold outline-none focus:border-blue-500 transition cursor-pointer ${
                    !selectedCashDeskId ? 'border-amber-400 bg-amber-50/50 text-slate-500' : 'border-slate-300 bg-white text-slate-800'
                  }`}
                  required
                >
                  <option value="">-- Выберите кассу зачисления / кому переданы деньги * --</option>
                  {cashDesksList.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.icon} {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* 2. Раздел валюты в кассе: USD / Сомони (TJS) */}
              <div className="rounded-2xl bg-slate-50 p-3 border border-slate-200 space-y-2">
                <label className="block text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Coins className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Раздел валюты кассы *</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleCurrencyChange('TJS')}
                    className={`flex items-center justify-center gap-1.5 rounded-xl py-1.5 px-3 text-xs font-bold border transition cursor-pointer ${
                      cashCurrency === 'TJS'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-md ring-2 ring-emerald-500/20'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <span>🇹🇯</span>
                    <span>Раздел Сомони (TJS)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleCurrencyChange('USD')}
                    className={`flex items-center justify-center gap-1.5 rounded-xl py-1.5 px-3 text-xs font-bold border transition cursor-pointer ${
                      cashCurrency === 'USD'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-md ring-2 ring-blue-500/20'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <span>💵</span>
                    <span>Раздел USD ($)</span>
                  </button>
                </div>

                {/* If currency conversion is needed */}
                {cashCurrency !== dealCurrency && (
                  <div className="rounded-xl border border-amber-300 bg-amber-50/80 p-2.5 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between flex-wrap gap-1.5">
                      <span className="font-bold text-amber-900 flex items-center gap-1 text-[11px]">
                        <ArrowRightLeft className="h-3.5 w-3.5 text-amber-700" />
                        Конвертация ({cashCurrency} → {dealCurrency})
                      </span>
                      <div className="flex items-center gap-1 text-[11px]">
                        <span className="inline-flex items-center gap-1 font-bold text-amber-950 bg-amber-200/90 px-1.5 py-0.5 rounded text-[10px] border border-amber-300">
                          🏦 Эсхата:
                        </span>
                        <span className="text-amber-900 font-semibold">1 USD =</span>
                        <input
                          type="number"
                          step="0.01"
                          value={exchangeRate}
                          onChange={(e) => setExchangeRate(e.target.value)}
                          className="w-14 rounded border border-amber-300 bg-white px-1 py-0.5 text-xs font-black text-amber-950 outline-none text-center shadow-xs"
                        />
                        <span className="text-amber-900 font-bold text-[10px]">TJS</span>
                      </div>
                    </div>

                    <div className="flex justify-between items-center text-[11px] text-amber-950 pt-1 border-t border-amber-200">
                      <span>Будет списано с долга:</span>
                      <strong className="text-xs text-amber-950 font-black">
                        {dealEquivalent.toFixed(2)} {dealCurrency}
                      </strong>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT COLUMN: AMOUNT, SCHEDULE, DATE & METHOD, COMMENT */}
            <div className="space-y-3 flex flex-col justify-between">
              {/* Amount input */}
              <div className="rounded-2xl bg-slate-50 p-3 border border-slate-200 space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-700">
                    Сумма к внесению в кассу ({cashCurrency}) *
                  </label>
                  <button
                    type="button"
                    onClick={handleQuickFillTotalDebt}
                    className="text-[11px] font-bold text-blue-600 hover:text-blue-700 cursor-pointer"
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
                    className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-1.5 text-base font-black text-slate-900 outline-none focus:border-emerald-500"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 font-black text-xs text-slate-400">
                    {cashCurrency}
                  </span>
                </div>
              </div>

              {/* Schedule link selection */}
              {deal.schedules && deal.schedules.length > 0 && (
                <div className="rounded-2xl bg-slate-50 p-3 border border-slate-200 space-y-1">
                  <label className="block text-xs font-bold text-slate-700">
                    Привязать к платежу из графика:
                  </label>
                  <select
                    value={scheduleId || ''}
                    onChange={handleScheduleChange}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value="">Без привязки к конкретному платежу</option>
                    {deal.schedules.map((s, idx) => {
                      const rem = Math.max(0, (s.amount_minor || 0) - (s.paid_amount_minor || 0)) / 100;
                      const isPaid = s.status === 'PAID' || rem <= 0;
                      return (
                        <option key={s.id} value={s.id} disabled={isPaid}>
                          №{s.payment_number || idx + 1} (до {s.due_date}) — План: {((s.amount_minor || 0) / 100).toLocaleString()} {dealCurrency} | Остаток: {rem.toLocaleString()} {dealCurrency} [{s.status}]
                        </option>
                      );
                    })}
                  </select>
                </div>
              )}

              {/* Date & Payment Method */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-bold text-slate-700">
                      Дата платежа (ПКО) *
                    </label>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setPaymentDate(new Date().toISOString().split('T')[0])}
                        className="text-[10px] text-blue-600 font-bold hover:underline cursor-pointer"
                        title="Установить сегодняшнюю дату"
                      >
                        Сегодня
                      </button>
                      {scheduleId && (() => {
                        const s = deal.schedules?.find(x => x.id === scheduleId);
                        if (s?.due_date && s.due_date !== paymentDate) {
                          return (
                            <button
                              type="button"
                              onClick={() => setPaymentDate(s.due_date)}
                              className="text-[10px] text-emerald-600 font-bold hover:underline cursor-pointer ml-1"
                              title={`Установить дату по графику: ${s.due_date}`}
                            >
                              По графику
                            </button>
                          );
                        }
                        return null;
                      })()}
                    </div>
                  </div>
                  <input
                    type="date"
                    required
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-2.5 py-1.5 text-xs outline-none focus:border-blue-500 font-bold text-slate-900 shadow-2xs"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Способ оплаты *
                  </label>
                  <select
                    value={method}
                    onChange={(e) => setMethod(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-bold outline-none focus:border-blue-500 cursor-pointer"
                  >
                    {paymentMethods && paymentMethods.length > 0 ? (
                      paymentMethods.map((pm) => (
                        <option key={pm.code || pm.id} value={pm.code || pm.id}>
                          {pm.name}
                        </option>
                      ))
                    ) : (
                      <>
                        <option value="CASH">💵 Наличные (в кассу)</option>
                        <option value="BANK_TRANSFER">🏦 Банковский перевод</option>
                        <option value="CARD">💳 Банковская карта</option>
                        <option value="OTHER">📁 Прочее / Эл. кошелек</option>
                      </>
                    )}
                  </select>
                </div>
              </div>

              {/* Reference & Comment */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Номер чека / ПКО
                  </label>
                  <input
                    type="text"
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    placeholder="ПКО-10492..."
                    className="w-full rounded-xl border border-slate-300 bg-white px-2.5 py-1.5 text-xs outline-none focus:border-blue-500 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Примечание
                  </label>
                  <input
                    type="text"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Основание платежа..."
                    className="w-full rounded-xl border border-slate-300 bg-white px-2.5 py-1.5 text-xs outline-none focus:border-blue-500 font-medium"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Footer buttons */}
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
              disabled={isLoading || !selectedCashDeskId}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-2 text-xs font-bold text-white shadow-md shadow-emerald-600/20 hover:from-emerald-700 hover:to-teal-700 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>{isLoading ? 'Сохранение...' : 'Зафиксировать оплату'}</span>
            </button>
          </div>
        </form>

        {/* Confirmation Modal before creating PKO */}
        {showConfirmModal && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in">
            <div className="relative w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl space-y-4">
              <div className="flex items-start gap-3.5">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-100 text-amber-600 shrink-0">
                  <AlertCircle className="h-6 w-6" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-900 leading-snug">Подтверждение передачи средств</h4>
                  <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                    Деньги будут зачислены в: <strong className="text-slate-900 font-bold">{cashDesksList.find(c => c.id === selectedCashDeskId)?.name || 'выбранную кассу'}</strong>.
                  </p>
                  <p className="mt-2 text-xs text-amber-800 font-bold bg-amber-50 rounded-xl p-2.5 border border-amber-200/80">
                    Подтвердите, что средства фактически переданы владельцу этой кассы.
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowConfirmModal(false)}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                >
                  Отмена
                </button>
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={() => {
                    setShowConfirmModal(false);
                    doExecutePayment();
                  }}
                  className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-2 text-xs font-bold text-white shadow-md hover:from-blue-700 hover:to-indigo-700 transition cursor-pointer flex items-center gap-2"
                >
                  {isLoading ? 'Проведение...' : 'Подтверждаю, деньги переданы'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
