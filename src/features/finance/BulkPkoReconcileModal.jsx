import React, { useState, useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { financeApi } from '../../api/finance.api';
import { useModalDismiss } from '../../hooks/useModalDismiss';
import { X, Layers, CheckSquare, Square, AlertTriangle, ShieldCheck, ArrowRight, RefreshCw, Calendar, Tag, CheckCircle2 } from 'lucide-react';

const REASON_OPTIONS = [
  'Бумажный ПКО',
  'Кассовая книга',
  'Банковский/платёжный документ',
  'Договор / приложение',
  'Подтверждение бухгалтера',
  'Массовая книга приходов',
  'Другое'
];

export const BulkPkoReconcileModal = ({ items = [], onClose }) => {
  const queryClient = useQueryClient();
  const [step, setStep] = useState('CLASSIFY'); // 'CLASSIFY' | 'CONFIRM'
  const [groupByDateMode, setGroupByDateMode] = useState(true);

  // Default common reason and comment for bulk
  const [bulkReason, setBulkReason] = useState('Бумажный ПКО');
  const [bulkComment, setBulkComment] = useState('Массовое восстановление исторических ПКО по кассовым первичным документам.');

  // Store editable state per item: { [id]: { selected: boolean, exchange_rate: string, amount_tjs: string, reason: string, comment: string } }
  const [itemStates, setItemStates] = useState(() => {
    const initial = {};
    (items || []).forEach(item => {
      const usdCredit = (item.amount_minor || 0) / 100 || Number(item.amount || 0);
      const comment = item.comment || '';
      const rateMatch = comment.match(/(?:Курс|rate):\s*([\d.]+)/i);
      const tjsMatch = comment.match(/(?:Внесено в кассу|Оприходовано|TJS|сомонӣ):\s*([\d\s,.]+)\s*(?:TJS|сомонӣ)/i);

      let rate = item.exchange_rate ? String(item.exchange_rate) : (rateMatch ? rateMatch[1] : '');
      let tjs = item.amount_tjs ? String(item.amount_tjs) : '';

      if (!tjs && tjsMatch && tjsMatch[1]) {
        const parsed = parseFloat(tjsMatch[1].replace(/\s/g, '').replace(',', '.'));
        if (!isNaN(parsed) && parsed > 0) tjs = String(parsed);
      }

      if (!tjs && rate && usdCredit > 0) {
        tjs = (usdCredit * Number(rate)).toFixed(2);
      }

      initial[item.id] = {
        selected: false,
        exchange_rate: rate,
        amount_tjs: tjs,
        reason: 'Бумажный ПКО',
        comment: ''
      };
    });
    return initial;
  });

  const { requestClose } = useModalDismiss({
    isOpen: true,
    onClose
  });

  // Calculate classified items
  const processedItems = useMemo(() => {
    return items.map(item => {
      const st = itemStates[item.id] || {};
      const usdCredit = (item.amount_minor || 0) / 100 || Number(item.amount || 0);
      const dateStr = item.date ? String(item.date).split('T')[0] : (item.payment_date ? String(item.payment_date).split('T')[0] : '—');
      
      let confidence = 'UNKNOWN';
      if (item.amount_tjs || (item.comment && /TJS|сомонӣ/i.test(item.comment))) {
        confidence = 'EXACT';
      } else if (item.exchange_rate) {
        confidence = 'DERIVABLE';
      } else if (st.exchange_rate && Number(st.exchange_rate) > 0) {
        confidence = 'SUGGESTED_SAME_DAY_RATE';
      }

      return {
        ...item,
        dateStr,
        usdCredit,
        confidence,
        st
      };
    });
  }, [items, itemStates]);

  // Group items by payment date
  const dateGroups = useMemo(() => {
    const groups = {};
    processedItems.forEach(item => {
      if (!groups[item.dateStr]) {
        groups[item.dateStr] = {
          date: item.dateStr,
          items: [],
          totalUsd: 0,
          groupRate: ''
        };
      }
      groups[item.dateStr].items.push(item);
      groups[item.dateStr].totalUsd += item.usdCredit;
    });
    return Object.values(groups).sort((a, b) => b.date.localeCompare(a.date));
  }, [processedItems]);

  // Handle selection toggles
  const toggleSelectAll = (select) => {
    setItemStates(prev => {
      const next = { ...prev };
      processedItems.forEach(item => {
        next[item.id] = { ...next[item.id], selected: select };
      });
      return next;
    });
  };

  const toggleSelectExact = () => {
    setItemStates(prev => {
      const next = { ...prev };
      processedItems.forEach(item => {
        const isExact = item.confidence === 'EXACT' || item.confidence === 'DERIVABLE';
        next[item.id] = { ...next[item.id], selected: isExact };
      });
      return next;
    });
  };

  const setGroupRate = (dateStr, rateValue) => {
    setItemStates(prev => {
      const next = { ...prev };
      processedItems.filter(i => i.dateStr === dateStr).forEach(item => {
        const usdCredit = item.usdCredit;
        const rateNum = Number(rateValue);
        const calcTjs = (rateNum > 0 && usdCredit > 0) ? (usdCredit * rateNum).toFixed(2) : next[item.id]?.amount_tjs;
        next[item.id] = {
          ...next[item.id],
          exchange_rate: rateValue,
          amount_tjs: calcTjs || next[item.id]?.amount_tjs || '',
          selected: Boolean(rateNum > 0 && calcTjs)
        };
      });
      return next;
    });
  };

  const updateItemState = (id, field, value) => {
    setItemStates(prev => {
      const current = prev[id] || {};
      const updated = { ...current, [field]: value };
      if (field === 'exchange_rate') {
        const rateNum = Number(value);
        const itemObj = processedItems.find(i => String(i.id) === String(id));
        if (rateNum > 0 && itemObj && itemObj.usdCredit > 0) {
          updated.amount_tjs = (itemObj.usdCredit * rateNum).toFixed(2);
        }
      }
      return { ...prev, [id]: updated };
    });
  };

  const selectedItems = useMemo(() => {
    return processedItems.filter(item => itemStates[item.id]?.selected);
  }, [processedItems, itemStates]);

  const bulkMutation = useMutation({
    mutationFn: financeApi.reconcileIncomeTjsBulk,
    onSuccess: (res) => {
      queryClient.invalidateQueries(['finance-income']);
      queryClient.invalidateQueries(['finance-cashflow']);
      alert(`Успешно восстановлено ${res?.reconciled_count || selectedItems.length} ПКО.`);
      onClose();
    },
    onError: (err) => {
      alert(`Ошибка при массовом восстановлении ПКО: ${err.message}`);
    }
  });

  const handleStartConfirm = () => {
    if (selectedItems.length === 0) {
      alert('Пожалуйста, выберите хотя бы один ПКО для массовой сверки.');
      return;
    }

    // Validate selected items
    for (const item of selectedItems) {
      const st = itemStates[item.id];
      const tjs = Number(st.amount_tjs);
      if (!tjs || tjs <= 0) {
        alert(`Для ПКО #${item.reference || item.id} не указана корректная сумма в TJS (должна быть больше 0).`);
        return;
      }
    }

    setStep('CONFIRM');
  };

  const handleExecuteBulkCommit = () => {
    const payloadItems = selectedItems.map(item => {
      const st = itemStates[item.id];
      const rate = Number(st.exchange_rate);
      return {
        payment_id: item.id,
        amount_tjs: Number(st.amount_tjs),
        exchange_rate: rate > 0 ? rate : null,
        reason: st.reason || bulkReason,
        comment: (st.comment || bulkComment).trim()
      };
    });

    bulkMutation.mutate({ items: payloadItems });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="relative w-full max-w-5xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-900 px-6 py-4 text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold tracking-tight">Массовая сверка исторических ПКО</h3>
              <p className="text-xs text-slate-400">Безопасное групповое восстановление сумм в Сомони (TJS)</p>
            </div>
          </div>
          <button
            onClick={requestClose}
            className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {step === 'CLASSIFY' ? (
          <div className="p-6 overflow-y-auto flex-1 space-y-5">
            {/* Selection & Grouping Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-xs">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-slate-700 mr-1">Выбор:</span>
                <button
                  onClick={toggleSelectExact}
                  className="px-3 py-1.5 rounded-xl bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-bold transition cursor-pointer"
                >
                  Выбрать EXACT
                </button>
                <button
                  onClick={() => toggleSelectAll(true)}
                  className="px-3 py-1.5 rounded-xl bg-blue-100 hover:bg-blue-200 text-blue-800 font-bold transition cursor-pointer"
                >
                  Выбрать все ({processedItems.length})
                </button>
                <button
                  onClick={() => toggleSelectAll(false)}
                  className="px-3 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold transition cursor-pointer"
                >
                  Снять выбор
                </button>
              </div>

              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 font-bold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={groupByDateMode}
                    onChange={e => setGroupByDateMode(e.target.checked)}
                    className="rounded border-slate-300 text-amber-600 focus:ring-amber-500 h-4 w-4"
                  />
                  <span>Группировка по дате ({dateGroups.length} дат)</span>
                </label>

                <div className="text-xs font-black text-amber-800 bg-amber-100 px-3 py-1.5 rounded-xl">
                  Выбрано: {selectedItems.length} из {processedItems.length} ПКО
                </div>
              </div>
            </div>

            {/* Grouped View vs Table View */}
            {groupByDateMode ? (
              <div className="space-y-4">
                {dateGroups.map(grp => (
                  <div key={grp.date} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
                    <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-emerald-600" />
                        <span className="font-extrabold text-sm text-slate-900">{grp.date}</span>
                        <span className="text-xs text-slate-500 font-medium ml-2">
                          ({grp.count} ПКО • всего ${grp.totalUsd.toLocaleString('ru-RU', { minimumFractionDigits: 2 })})
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-600">Единый курс даты:</span>
                        <input
                          type="number"
                          step="0.01"
                          placeholder="например 9.48"
                          onChange={e => setGroupRate(grp.date, e.target.value)}
                          className="w-28 rounded-xl border border-slate-300 bg-slate-50 px-2.5 py-1 text-xs font-mono font-bold text-slate-900 outline-none focus:border-amber-500 focus:bg-white"
                        />
                        <span className="text-xs text-slate-400 font-semibold">TJS/USD</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      {grp.items.map(item => {
                        const st = itemStates[item.id] || {};
                        return (
                          <div
                            key={item.id}
                            className={`flex flex-wrap items-center justify-between p-2.5 rounded-xl border transition gap-3 text-xs ${
                              st.selected ? 'bg-amber-50/60 border-amber-300' : 'bg-slate-50/50 border-slate-200'
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-[220px]">
                              <input
                                type="checkbox"
                                checked={Boolean(st.selected)}
                                onChange={e => updateItemState(item.id, 'selected', e.target.checked)}
                                className="h-4 w-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                              />
                              <div>
                                <span className="font-bold text-slate-900 block">{item.reference || `ПКО-${item.id}`}</span>
                                <span className="text-[11px] text-slate-500">{item.payer_name || 'Клиент не указан'}</span>
                              </div>
                            </div>

                            <div className="font-mono font-extrabold text-slate-800">
                              ${item.usdCredit.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} USD
                            </div>

                            <div className="flex items-center gap-3">
                              <div className="flex items-center gap-1.5">
                                <span className="text-[11px] font-bold text-slate-500">Курс:</span>
                                <input
                                  type="number"
                                  step="0.01"
                                  value={st.exchange_rate || ''}
                                  onChange={e => updateItemState(item.id, 'exchange_rate', e.target.value)}
                                  placeholder="Курс..."
                                  className="w-20 rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-mono font-bold outline-none focus:border-amber-500"
                                />
                              </div>

                              <div className="flex items-center gap-1.5">
                                <span className="text-[11px] font-bold text-slate-500">TJS:</span>
                                <input
                                  type="number"
                                  step="0.01"
                                  value={st.amount_tjs || ''}
                                  onChange={e => updateItemState(item.id, 'amount_tjs', e.target.value)}
                                  placeholder="Сумма TJS..."
                                  className="w-28 rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-mono font-bold text-emerald-700 outline-none focus:border-amber-500"
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
                    <tr>
                      <th className="p-3">Выбор</th>
                      <th className="p-3">Дата</th>
                      <th className="p-3">ПКО</th>
                      <th className="p-3">Клиент</th>
                      <th className="p-3">USD зачёт</th>
                      <th className="p-3">Курс</th>
                      <th className="p-3">Сумма TJS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {processedItems.map(item => {
                      const st = itemStates[item.id] || {};
                      return (
                        <tr key={item.id} className={st.selected ? 'bg-amber-50/50' : 'hover:bg-slate-50'}>
                          <td className="p-3">
                            <input
                              type="checkbox"
                              checked={Boolean(st.selected)}
                              onChange={e => updateItemState(item.id, 'selected', e.target.checked)}
                              className="h-4 w-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                            />
                          </td>
                          <td className="p-3 font-semibold text-slate-600">{item.dateStr}</td>
                          <td className="p-3 font-bold font-mono text-slate-900">{item.reference || `ПКО-${item.id}`}</td>
                          <td className="p-3 text-slate-700">{item.payer_name || '—'}</td>
                          <td className="p-3 font-mono font-bold text-slate-800">${item.usdCredit.toLocaleString('ru-RU', { minimumFractionDigits: 2 })}</td>
                          <td className="p-3">
                            <input
                              type="number"
                              step="0.01"
                              value={st.exchange_rate || ''}
                              onChange={e => updateItemState(item.id, 'exchange_rate', e.target.value)}
                              placeholder="Курс..."
                              className="w-20 rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-mono font-bold outline-none focus:border-amber-500"
                            />
                          </td>
                          <td className="p-3">
                            <input
                              type="number"
                              step="0.01"
                              value={st.amount_tjs || ''}
                              onChange={e => updateItemState(item.id, 'amount_tjs', e.target.value)}
                              placeholder="Сумма TJS..."
                              className="w-28 rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-mono font-bold text-emerald-700 outline-none focus:border-amber-500"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          /* Step 2: Pre-Commit Summary & Protection Check */
          <div className="p-6 overflow-y-auto flex-1 space-y-5">
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 space-y-2 text-xs">
              <div className="flex items-center gap-2 font-black text-amber-900 text-sm">
                <ShieldCheck className="h-5 w-5 text-amber-600" />
                <span>Предпросмотр массового восстановления данных ПКО</span>
              </div>
              <p className="text-amber-800">
                Вы восстанавливаете исторические кассовые записи в Сомони (TJS) для <strong className="font-extrabold">{selectedItems.length} ПКО</strong>.
              </p>
            </div>

            {/* Verification Counters Card */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200">
                <div className="text-[10px] font-bold text-emerald-700 uppercase">Зачёт по договорам</div>
                <div className="text-sm font-black text-emerald-950 mt-1">0.00 USD</div>
                <div className="text-[9px] text-emerald-600">Неизменно</div>
              </div>
              <div className="p-3 rounded-2xl bg-blue-50 border border-blue-200">
                <div className="text-[10px] font-bold text-blue-700 uppercase">Долг клиентов</div>
                <div className="text-sm font-black text-blue-950 mt-1">0.00 USD</div>
                <div className="text-[9px] text-blue-600">Неизменно</div>
              </div>
              <div className="p-3 rounded-2xl bg-purple-50 border border-purple-200">
                <div className="text-[10px] font-bold text-purple-700 uppercase">График / FIFO</div>
                <div className="text-sm font-black text-purple-950 mt-1">0.00 USD</div>
                <div className="text-[9px] text-purple-600">Неизменно</div>
              </div>
              <div className="p-3 rounded-2xl bg-teal-50 border border-teal-200">
                <div className="text-[10px] font-bold text-teal-700 uppercase">Кассовый остаток</div>
                <div className="text-sm font-black text-teal-950 mt-1">0.00 USD</div>
                <div className="text-[9px] text-teal-600">Неизменно</div>
              </div>
            </div>

            {/* Audit Grounds Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Основание восстановления (для всех)</label>
                <select
                  value={bulkReason}
                  onChange={e => setBulkReason(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 font-bold outline-none"
                >
                  {REASON_OPTIONS.map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Комментарий / источник данных (для всех)</label>
                <input
                  type="text"
                  value={bulkComment}
                  onChange={e => setBulkComment(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 outline-none font-medium"
                />
              </div>
            </div>

            {/* Selected Items Summary Table */}
            <div className="overflow-x-auto rounded-2xl border border-slate-200 max-h-60">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="p-2.5">Дата</th>
                    <th className="p-2.5">ПКО</th>
                    <th className="p-2.5">USD зачёт</th>
                    <th className="p-2.5">Курс TJS/USD</th>
                    <th className="p-2.5">Восстанавливаемая сумма TJS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedItems.map(item => {
                    const st = itemStates[item.id];
                    return (
                      <tr key={item.id} className="hover:bg-slate-50">
                        <td className="p-2.5 font-semibold text-slate-600">{item.dateStr}</td>
                        <td className="p-2.5 font-bold font-mono text-slate-900">{item.reference || `ПКО-${item.id}`}</td>
                        <td className="p-2.5 font-mono text-slate-800">${item.usdCredit.toLocaleString('ru-RU', { minimumFractionDigits: 2 })}</td>
                        <td className="p-2.5 font-mono font-bold text-amber-700">{st.exchange_rate || 'не указан'}</td>
                        <td className="p-2.5 font-mono font-black text-emerald-600">{Number(st.amount_tjs).toLocaleString('ru-RU', { minimumFractionDigits: 2 })} TJS</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Modal Footer Controls */}
        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-6 py-4 shrink-0">
          {step === 'CLASSIFY' ? (
            <>
              <button
                type="button"
                onClick={requestClose}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={handleStartConfirm}
                disabled={selectedItems.length === 0}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-6 py-2 text-xs font-bold text-white shadow-md hover:from-amber-600 hover:to-amber-700 transition cursor-pointer disabled:opacity-50"
              >
                <span>Проверить перед сохранением ({selectedItems.length})</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setStep('CLASSIFY')}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                ← Вернуться к выбору
              </button>
              <button
                type="button"
                onClick={handleExecuteBulkCommit}
                disabled={bulkMutation.isPending}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-2 text-xs font-bold text-white shadow-md hover:from-emerald-700 hover:to-teal-700 transition cursor-pointer disabled:opacity-50"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>{bulkMutation.isPending ? 'Выполнение массовой сверки...' : 'Подтвердить массовое восстановление'}</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
