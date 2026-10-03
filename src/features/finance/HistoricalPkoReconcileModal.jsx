import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { financeApi } from '../../api/finance.api';
import { useModalDismiss } from '../../hooks/useModalDismiss';
import { X, ShieldAlert, FileText, CheckCircle2, AlertTriangle, ArrowRight, HelpCircle } from 'lucide-react';

const REASON_OPTIONS = [
  'Бумажный ПКО',
  'Кассовая книга',
  'Банковский/платёжный документ',
  'Договор / приложение',
  'Подтверждение бухгалтера',
  'Другое'
];

export const HistoricalPkoReconcileModal = ({ payment, onClose }) => {
  const queryClient = useQueryClient();
  const [step, setStep] = useState('FORM'); // 'FORM' | 'CONFIRM'
  const [formData, setFormData] = useState({
    amount_tjs: '',
    exchange_rate: '',
    reason: 'Бумажный ПКО',
    comment: ''
  });

  const { requestClose } = useModalDismiss({
    isOpen: Boolean(payment),
    onClose
  });

  const reconcileMutation = useMutation({
    mutationFn: financeApi.reconcileIncomeTjs,
    onSuccess: () => {
      queryClient.invalidateQueries(['finance-income']);
      queryClient.invalidateQueries(['finance-cashflow']);
      onClose();
    },
    onError: (err) => {
      alert(`Ошибка при восстановлении TJS суммы ПКО: ${err.message}`);
    }
  });

  if (!payment) return null;

  const currentUsdCredit = Number(payment.amount || (payment.amount_minor ? payment.amount_minor / 100 : 0));
  const enteredTjs = Number(formData.amount_tjs || 0);
  const enteredRate = Number(formData.exchange_rate || 0);

  const calculatedUsd = (enteredTjs > 0 && enteredRate > 0)
    ? Number((enteredTjs / enteredRate).toFixed(2))
    : currentUsdCredit;

  const diffUsd = (enteredTjs > 0 && enteredRate > 0)
    ? Number((calculatedUsd - currentUsdCredit).toFixed(2))
    : 0;

  const getOperationTypeLabel = () => {
    if (payment.operationType === 'INVESTMENT' || payment.category === 'Инвестиции партнёров') {
      return 'Инвестиция партнёра';
    }
    if (payment.transferId || payment.operationType === 'INTERNAL_CASH_TRANSFER') {
      return 'Внутреннее перемещение';
    }
    if (payment.dealId || payment.contract) {
      return 'Платёж по договору';
    }
    return 'Прямой приход';
  };

  const handleSubmitForm = (e) => {
    e.preventDefault();
    if (!enteredTjs || enteredTjs <= 0) {
      alert('Пожалуйста, укажите корректную сумму в TJS (больше 0)');
      return;
    }
    if (!formData.reason) {
      alert('Пожалуйста, выберите основание восстановления');
      return;
    }
    if (!formData.comment || !formData.comment.trim()) {
      alert('Пожалуйста, введите комментарий / источник данных');
      return;
    }
    setStep('CONFIRM');
  };

  const handleConfirmReconcile = () => {
    reconcileMutation.mutate({
      id: payment.id,
      amount_tjs: enteredTjs,
      exchange_rate: enteredRate > 0 ? enteredRate : null,
      amount_usd: calculatedUsd,
      reason: formData.reason,
      comment: formData.comment.trim()
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-900 px-6 py-4 text-white">
          <div className="flex items-center gap-2.5">
            <FileText className="h-5 w-5 text-emerald-400" />
            <div>
              <h3 className="text-sm font-bold">Восстановление исторической суммы ПКО</h3>
              <p className="text-[11px] text-slate-400">Сверка кассового снимка • Администратор</p>
            </div>
          </div>
          <button
            onClick={requestClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {step === 'FORM' ? (
          <form onSubmit={handleSubmitForm} className="p-6 space-y-4 text-xs">
            
            {/* Readonly Record Summary */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 grid grid-cols-2 gap-2.5 text-slate-700">
              <div>
                <span className="text-[10px] text-slate-400 block">Документ / Номер:</span>
                <span className="font-mono font-bold text-slate-900">{payment.reference || `ПКО-${payment.id}`}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">Дата платежа:</span>
                <span className="font-semibold">{payment.date || '—'}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">Плательщик / Клиент:</span>
                <span className="font-bold text-slate-900 truncate block" title={payment.clientName}>{payment.clientName || '—'}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">Тип операции:</span>
                <span className="font-semibold text-emerald-700">{getOperationTypeLabel()}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">Договор / Контракт:</span>
                <span className="font-semibold">{payment.contract || '—'}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">Зачтено по договору (USD):</span>
                <span className="font-black text-amber-700">${currentUsdCredit.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} USD</span>
              </div>
            </div>

            {/* Warning callout */}
            <div className="p-3 rounded-xl bg-blue-50/80 border border-blue-200 text-blue-900 text-[11px] leading-snug flex items-start gap-2">
              <ShieldAlert className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
              <div>
                Фиксация фактической суммы TJS сохраняет физический снимок кассы. Это действие <strong>НЕ меняет</strong> сумму сделки в USD, задолженность клиента, FIFO и график платежей.
              </div>
            </div>

            {/* Inputs */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Фактически принято в кассу * (TJS)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={formData.amount_tjs}
                  onChange={e => setFormData({ ...formData, amount_tjs: e.target.value })}
                  placeholder="напр. 44000.00"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-black text-emerald-700 outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Исторический курс USD (необязательно)
                </label>
                <input
                  type="number"
                  step="0.0001"
                  min="0.0001"
                  value={formData.exchange_rate}
                  onChange={e => setFormData({ ...formData, exchange_rate: e.target.value })}
                  placeholder="напр. 9.48"
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-bold outline-none focus:border-purple-500"
                />
              </div>
            </div>

            {/* Live Calculation Preview */}
            {enteredTjs > 0 && (
              <div className="p-3 rounded-xl bg-purple-50 border border-purple-200 space-y-1.5 text-[11px] text-purple-900">
                <div className="flex justify-between items-center">
                  <span>Сумма, зачтённая по договору:</span>
                  <span className="font-bold">${currentUsdCredit.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} USD</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Расчёт по введённым TJS и курсу:</span>
                  <span className="font-bold font-mono">${calculatedUsd.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} USD</span>
                </div>
                {enteredRate > 0 && (
                  <div className="flex justify-between items-center pt-1 border-t border-purple-200/80 font-bold">
                    <span>Разница к учёту сделки:</span>
                    <span className={diffUsd === 0 ? 'text-slate-600' : diffUsd > 0 ? 'text-emerald-700' : 'text-amber-700'}>
                      {diffUsd >= 0 ? `+${diffUsd}` : diffUsd} USD
                    </span>
                  </div>
                )}
                {!enteredRate && (
                  <div className="text-[10px] text-purple-700 italic pt-1 border-t border-purple-200/80">
                    Курс не указан: эквивалент по договору сохранится ${currentUsdCredit} USD.
                  </div>
                )}
              </div>
            )}

            {/* Reason & Comment */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Основание восстановления *
              </label>
              <select
                value={formData.reason}
                onChange={e => setFormData({ ...formData, reason: e.target.value })}
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-semibold outline-none focus:border-emerald-500 cursor-pointer"
              >
                {REASON_OPTIONS.map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Комментарий / источник данных *
              </label>
              <textarea
                required
                rows={2}
                value={formData.comment}
                onChange={e => setFormData({ ...formData, comment: e.target.value })}
                placeholder="например: Сверено с бумажным ПКО №0006 от 12.02.2026. Фактически получено 44 000 TJS."
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs outline-none focus:border-emerald-500 resize-none"
              />
            </div>

            {/* Form Buttons */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={requestClose}
                className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
              >
                Отмена
              </button>
              <button
                type="submit"
                className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-5 py-2 text-xs font-bold text-white hover:bg-emerald-700 transition cursor-pointer shadow-md"
              >
                <span>Далее к подтверждению</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </form>
        ) : (
          /* CONFIRM STEP */
          <div className="p-6 space-y-4 text-xs">
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 space-y-2">
              <div className="font-extrabold flex items-center gap-2 text-sm text-amber-950">
                <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
                <span>Подтверждение восстановления исторической суммы</span>
              </div>
              <p className="text-[11px] leading-relaxed text-amber-800">
                Вы восстанавливаете исторические данные ПКО <strong>{payment.reference || `ПКО-${payment.id}`}</strong>:
              </p>
              
              <div className="p-3 rounded-xl bg-white/80 border border-amber-200/80 space-y-1 text-xs">
                <div className="flex justify-between font-bold text-emerald-900">
                  <span>Фактически получено:</span>
                  <span>{enteredTjs.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} TJS</span>
                </div>
                <div className="flex justify-between text-slate-700">
                  <span>Сумма по договору останется:</span>
                  <span>{currentUsdCredit.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} USD</span>
                </div>
                <div className="flex justify-between text-slate-700">
                  <span>Исторический курс:</span>
                  <span>{enteredRate > 0 ? enteredRate : 'Не указан'}</span>
                </div>
                <div className="flex justify-between text-slate-700">
                  <span>Основание:</span>
                  <span className="font-semibold">{formData.reason}</span>
                </div>
              </div>

              <div className="text-[10px] text-amber-800 bg-amber-100/60 p-2.5 rounded-lg border border-amber-200">
                ⚠️ Эта операция <strong>НЕ изменит</strong> задолженность клиента, FIFO, график платежей и кассовый баланс.
              </div>
            </div>

            <div className="text-slate-600 text-[11px]">
              <strong>Комментарий:</strong> {formData.comment}
            </div>

            {/* Confirm Buttons */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setStep('FORM')}
                disabled={reconcileMutation.isPending}
                className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={handleConfirmReconcile}
                disabled={reconcileMutation.isPending}
                className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-2 text-xs font-bold text-white hover:from-emerald-700 hover:to-teal-700 transition cursor-pointer shadow-md disabled:opacity-50"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>{reconcileMutation.isPending ? 'Сохранение...' : 'Подтвердить восстановление'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
