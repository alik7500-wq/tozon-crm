import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { financeApi } from '../../api/finance.api';
import { dictionariesApi } from '../../api/dictionaries.api';
import { useModalDismiss } from '../../hooks/useModalDismiss';
import { ExpenseReceiptPrintModal } from './ExpenseReceiptPrintModal';
import { FinanceTabs } from '../../components/FinanceTabs';
import { useAuth } from '../auth/AuthContext';
import { 
  buildCashDesksList, 
  extractCashDeskFromComment, 
  updateCommentWithCashDesk,
  cleanCashDeskFromComment,
  resolveCashDesk
} from '../../utils/cashDesks';
import { 
  TrendingDown, Plus, Search, Calendar, Tag, FileText, Wallet, RefreshCw,
  DollarSign, CheckCircle2, User, CreditCard, X, Edit, Trash2, Save, Printer,
  ArrowRightLeft, ArrowRight
} from 'lucide-react';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import dayjs from 'dayjs';

const COLORS = ['#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16', '#22c55e', '#0ea5e9', '#6366f1', '#a855f7', '#ec4899'];

export const ExpensesPage = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const isManager = user?.role === 'SALES_MANAGER' || user?.role === 'MANAGER';
  const DADOJON_DESK_ID = 'fba621e6-4ebe-4459-8623-19f46d864cc6';

  const [year, setYear] = useState(new Date().getFullYear());
  const [currency, setCurrency] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [deskFilter, setDeskFilter] = useState('ALL');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [printableExpense, setPrintableExpense] = useState(null);

  const handleDeskFilter = (deskName) => {
    if (isManager) return; // Менеджер видит только свою кассу
    if (deskFilter === deskName) {
      setDeskFilter('');
      setSearch('');
    } else {
      setDeskFilter(deskName);
      setSearch(deskName);
    }
  };

  const queryClient = useQueryClient();

  const { data: cashDesksDict = [] } = useQuery({
    queryKey: ['dictionaries', 'CASH_DESK'],
    queryFn: () => dictionariesApi.getItems('CASH_DESK')
  });

  const allCashDesks = useMemo(() => buildCashDesksList(cashDesksDict), [cashDesksDict]);

  const { data: expenseCategories = [] } = useQuery({
    queryKey: ['dictionaries', 'EXPENSE_CATEGORY'],
    queryFn: () => dictionariesApi.getItems('EXPENSE_CATEGORY')
  });

  const { data: paymentMethods = [] } = useQuery({
    queryKey: ['dictionaries', 'PAYMENT_METHOD'],
    queryFn: () => dictionariesApi.getItems('PAYMENT_METHOD')
  });

  const { data: eskhataRateData } = useQuery({
    queryKey: ['eskhata-rate'],
    queryFn: financeApi.getEskhataRate,
    staleTime: 10 * 60 * 1000
  });

  const liveEskhataRate = eskhataRateData?.sellRate ? String(eskhataRateData.sellRate) : '9.27';

  const [formData, setFormData] = useState({
    amount: '',
    currency: 'TJS',
    date: dayjs().format('YYYY-MM-DD'),
    category: 'Строительные материалы',
    cash_desk: isManager ? 'Касса менеждера (Дадочон)' : 'Касса Отдела продаж (Акмалхон)',
    cash_desk_id: isManager ? DADOJON_DESK_ID : 'ab90800a-73af-4cf7-88c2-397c304e2edf',
    method: 'CASH',
    reference: '',
    recipient: '',
    description: '',
    attachment: '',
    auto_convert: true,
    exchange_rate: '9.27',
    source_currency: 'USD',
    idempotency_key: `EXP-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
  });

  useEffect(() => {
    if (isManager) {
      setFormData(prev => {
        if (prev.cash_desk_id === DADOJON_DESK_ID && prev.cash_desk === 'Касса менеждера (Дадочон)') {
          return prev;
        }
        return {
          ...prev,
          cash_desk: 'Касса менеждера (Дадочон)',
          cash_desk_id: DADOJON_DESK_ID
        };
      });
      setDeskFilter(prev => prev === 'Касса менеджера (Дадочон)' ? prev : 'Касса менеджера (Дадочон)');
    } else if (allCashDesks.length > 0) {
      setFormData(prev => {
        const resolved = resolveCashDesk(prev.cash_desk_id || prev.cash_desk, allCashDesks);
        const nextName = resolved?.name || allCashDesks[0]?.name;
        const nextId = resolved?.id || allCashDesks[0]?.id;
        if (prev.cash_desk === nextName && prev.cash_desk_id === nextId) {
          return prev;
        }
        return {
          ...prev,
          cash_desk: nextName,
          cash_desk_id: nextId
        };
      });
    }
  }, [allCashDesks, isManager]);

  useEffect(() => {
    if (expenseCategories.length > 0) {
      setFormData(prev => {
        if (prev.category) return prev;
        return { ...prev, category: expenseCategories[0].name };
      });
    }
  }, [expenseCategories]);

  useEffect(() => {
    if (eskhataRateData?.sellRate) {
      const rateStr = String(eskhataRateData.sellRate);
      setFormData(prev => {
        if (prev.exchange_rate === rateStr) return prev;
        return { ...prev, exchange_rate: rateStr };
      });
    }
  }, [eskhataRateData]);

  const isAddDirty = Boolean(formData.amount && parseFloat(formData.amount) > 0 || formData.recipient.trim() || formData.description.trim());
  const { requestClose: requestCloseAdd } = useModalDismiss({
    isOpen: showAddModal,
    onClose: () => setShowAddModal(false),
    isDirty: isAddDirty,
    confirmMessage: 'Введенный расход не сохранен. Закрыть окно?'
  });

  const { requestClose: requestCloseEdit } = useModalDismiss({
    isOpen: Boolean(editingItem),
    onClose: () => setEditingItem(null),
    isDirty: Boolean(editingItem?.amount && parseFloat(editingItem.amount) > 0),
    confirmMessage: 'Изменения расхода не сохранены. Закрыть окно?'
  });

  const { data: response, isLoading, refetch } = useQuery({
    queryKey: ['finance-expenses', year, currency, categoryFilter, search],
    queryFn: () => financeApi.getExpenses({ year, currency, category: categoryFilter, search })
  });

  const addMutation = useMutation({
    mutationFn: financeApi.addExpense,
    onSuccess: (data) => {
      queryClient.invalidateQueries(['finance-expenses']);
      queryClient.invalidateQueries(['finance-cashflow']);
      queryClient.invalidateQueries(['finance-income']);
      setShowAddModal(false);
      const createdExpense = data?.data || data || {
        id: `РКО-${Date.now().toString().slice(-4)}`,
        amount: formData.amount,
        amount_minor: Math.round(Number(formData.amount) * 100),
        currency: formData.currency,
        expense_date: formData.date,
        recipient: formData.recipient,
        category: formData.category,
        reference: formData.reference,
        description: formData.description,
        attachment: formData.attachment,
        method: formData.method
      };
      const conv = createdExpense?.conversion;
      const isAutoConverted = Boolean(conv?.has_conversion || (formData.auto_convert && formData.currency === 'TJS'));

      if (isAutoConverted) {
        const cleanDesc = (formData.description || '').replace(/\[IDEMP:[^\]]+\]\s*/gi, '').trim();
        const amtTjs = conv?.target_amount_tjs || Number(formData.amount);
        const rate = conv?.exchange_rate || parseFloat(formData.exchange_rate) || 9.27;
        const amtUsd = conv?.source_amount_usd || (rate > 0 ? Number((amtTjs / rate).toFixed(2)) : 0);

        setCreatedConversionReport({
          is_auto_converted: true,
          main_reference: conv?.main_expense_reference || createdExpense.reference || `РКО-${createdExpense.id}`,
          conv_expense_reference: conv?.conv_expense_reference || null,
          conv_payment_reference: conv?.conv_payment_reference || null,
          amount_tjs: amtTjs,
          amount_usd: amtUsd,
          exchange_rate: rate,
          cash_desk_name: formData.cash_desk,
          recipient: formData.recipient,
          category: formData.category,
          description: cleanDesc,
          date: formData.date,
          createdExpense: {
            ...createdExpense,
            amount: amtTjs,
            currency: 'TJS',
            exchange_rate: rate,
            amount_usd: amtUsd,
            description: cleanDesc
          }
        });
      } else {
        setPrintableExpense(createdExpense);
      }

      setFormData({
        amount: '',
        currency: 'TJS',
        date: dayjs().format('YYYY-MM-DD'),
        category: 'Строительные материалы',
        method: 'CASH',
        reference: '',
        recipient: '',
        description: '',
        attachment: '',
        auto_convert: true,
        exchange_rate: liveEskhataRate,
        source_currency: 'USD',
        idempotency_key: `EXP-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
      });
    }
  });

  const updateMutation = useMutation({
    mutationFn: financeApi.updateExpense,
    onSuccess: () => {
      queryClient.invalidateQueries(['finance-expenses']);
      queryClient.invalidateQueries(['finance-cashflow']);
      setEditingItem(null);
    },
    onError: (err) => {
      alert(`Ошибка при сохранении расхода: ${err.message}`);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: financeApi.deleteExpense,
    onSuccess: () => {
      queryClient.invalidateQueries(['finance-expenses']);
      queryClient.invalidateQueries(['finance-cashflow']);
    },
    onError: (err) => {
      alert(`Ошибка при удалении: ${err.message}`);
    }
  });

  const expensesData = response || { list: [], totalsByCurrency: {}, availableCurrencies: ['USD', 'TJS'], categoriesChart: [] };
  const totals = expensesData.totalsByCurrency || {};
  const list = expensesData.list || [];
  const availableYears = expensesData.availableYears && expensesData.availableYears.length > 0
    ? expensesData.availableYears
    : [year - 1, year, year + 1, year + 2];

  const [isTransfer, setIsTransfer] = useState(false);
  const [createdTransferPair, setCreatedTransferPair] = useState(null);
  const [createdConversionReport, setCreatedConversionReport] = useState(null);
  const [transferForm, setTransferForm] = useState({
    source_cash_desk_id: '',
    destination_cash_desk_id: '',
    operation_type: 'INTERNAL_CASH_TRANSFER',
    currency: 'USD',
    amount: '',
    exchange_rate: liveEskhataRate,
    date: dayjs().format('YYYY-MM-DD'),
    recipient: '',
    description: ''
  });

  useEffect(() => {
    if (cashDesksDict && cashDesksDict.length >= 2) {
      setTransferForm(prev => {
        const akmal = cashDesksDict.find(d => d.code === 'SALES_MANAGER' || (d.name && d.name.includes('Акмалхон')));
        const ilhom = cashDesksDict.find(d => d.code === 'MAIN_CASHIER' || (d.name && d.name.includes('Илхомчон')));
        const nextSource = prev.source_cash_desk_id || akmal?.id || cashDesksDict[0].id;
        const nextDest = prev.destination_cash_desk_id || ilhom?.id || cashDesksDict[1].id;
        if (prev.source_cash_desk_id === nextSource && prev.destination_cash_desk_id === nextDest) return prev;
        return {
          ...prev,
          source_cash_desk_id: nextSource,
          destination_cash_desk_id: nextDest
        };
      });
    }
  }, [cashDesksDict]);

  useEffect(() => {
    if (eskhataRateData?.sellRate) {
      const rateStr = String(eskhataRateData.sellRate);
      setTransferForm(prev => {
        if (prev.exchange_rate === rateStr) return prev;
        return { ...prev, exchange_rate: rateStr };
      });
    }
  }, [eskhataRateData]);

  const transferMutation = useMutation({
    mutationFn: financeApi.createTransfer,
    onSuccess: (res) => {
      queryClient.invalidateQueries(['finance-expenses']);
      queryClient.invalidateQueries(['finance-cashflow']);
      queryClient.invalidateQueries(['finance-income']);
      setShowAddModal(false);
      const resultData = res?.data || res;
      setCreatedTransferPair(resultData);
      setTransferForm(prev => ({
        ...prev,
        amount: '',
        recipient: '',
        description: '',
        date: dayjs().format('YYYY-MM-DD')
      }));
    },
    onError: (err) => {
      alert(`Ошибка при оформлении перемещения: ${err.message || err}`);
    }
  });

  const handleTransferSubmit = (e) => {
    e.preventDefault();
    if (!transferForm.source_cash_desk_id || !transferForm.destination_cash_desk_id) {
      alert('Выберите обе кассы');
      return;
    }
    if (transferForm.source_cash_desk_id === transferForm.destination_cash_desk_id) {
      alert('Касса-источник и касса-получатель должны быть разными!');
      return;
    }
    const cleanAmountStr = String(transferForm.amount || '').replace(',', '.').trim();
    const amt = parseFloat(cleanAmountStr);
    if (!amt || amt <= 0) {
      alert('Сумма должна быть больше нуля');
      return;
    }
    const payload = {
      source_cash_desk_id: transferForm.source_cash_desk_id,
      destination_cash_desk_id: transferForm.destination_cash_desk_id,
      operation_type: transferForm.operation_type,
      currency: transferForm.currency,
      date: transferForm.date,
      recipient: transferForm.recipient || (transferForm.operation_type === 'PAYMENT_ON_BEHALF' ? 'Контрагент' : 'Касса-получатель'),
      description: transferForm.description || 'Внутреннее перемещение между кассами',
      idempotency_key: `TX-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    };

    if (transferForm.currency === 'TJS') {
      const cleanRateStr = String(transferForm.exchange_rate || '').replace(',', '.').trim();
      const rate = parseFloat(cleanRateStr);
      if (!rate || rate <= 0) {
        alert('Укажите корректный курс валюты');
        return;
      }
      payload.amount_tjs = amt;
      payload.exchange_rate = rate;
      payload.amount_usd = Number((amt / rate).toFixed(2));
      payload.amount = payload.amount_usd;
    } else {
      payload.amount_usd = amt;
      payload.amount = amt;
    }

    transferMutation.mutate(payload);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const cleanFormDataAmount = String(formData.amount || '').replace(',', '.').trim();
    if (!cleanFormDataAmount || Number(cleanFormDataAmount) <= 0) return;
    const resolved = resolveCashDesk(formData.cash_desk_id || formData.cash_desk, allCashDesks);
    const finalDeskName = isManager ? 'Касса менеждера (Дадочон)' : (resolved?.name || formData.cash_desk);
    const finalDeskId = isManager ? DADOJON_DESK_ID : (resolved?.id || formData.cash_desk_id || null);
    const cleanDesc = cleanCashDeskFromComment(formData.description);
    const finalDesc = updateCommentWithCashDesk(cleanDesc, finalDeskName);
    const keyToUse = formData.idempotency_key || `EXP-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    if (!formData.idempotency_key) {
      setFormData(prev => ({ ...prev, idempotency_key: keyToUse }));
    }
    addMutation.mutate({
      ...formData,
      amount: cleanFormDataAmount,
      idempotency_key: keyToUse,
      cash_desk: finalDeskName,
      cash_desk_id: finalDeskId,
      description: finalDesc
    });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <TrendingDown className="h-7 w-7 text-rose-600" />
            <span>Расходы и расходные ордера (РКО)</span>
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500">
            Учет прямых затрат, зарплат, маркетинга, стройматериалов и операционных расходов
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => refetch()}
            title="Обновить"
            className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-blue-600 transition shadow-2xs cursor-pointer"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-rose-600/20 hover:from-rose-700 hover:to-red-700 transition cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Оформить расход (РКО)</span>
          </button>
        </div>
      </div>

      {/* Finance Navigation Tabs */}
      <FinanceTabs />

      {/* Currency KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-3xl border border-rose-200 bg-gradient-to-br from-rose-50 to-red-50/40 p-5 shadow-2xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-700 uppercase tracking-wider">Расход в USD ($)</span>
            <span className="p-2 rounded-xl bg-rose-500/10 text-rose-600">💵</span>
          </div>
          <div className="text-2xl font-black text-rose-950 mt-2">
            ${(totals.USD || 0).toLocaleString('ru-RU', { minimumFractionDigits: 2 })}
          </div>
          <p className="text-[11px] text-rose-600/90 mt-1 font-medium">Выплачено в долларах США ({year} г.)</p>
        </div>

        <div className="rounded-3xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50/40 p-5 shadow-2xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">Расход в TJS (Сомони)</span>
            <span className="p-2 rounded-xl bg-amber-500/10 text-amber-600">🇹🇯</span>
          </div>
          <div className="text-2xl font-black text-amber-950 mt-2">
            {(totals.TJS || 0).toLocaleString('ru-RU', { minimumFractionDigits: 2 })} <span className="text-sm font-semibold">TJS</span>
          </div>
          <p className="text-[11px] text-amber-600/90 mt-1 font-medium">Выплачено в сомони ({year} г.)</p>
        </div>

        {totals.RUB !== undefined && (
          <div className="rounded-3xl border border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50/40 p-5 shadow-2xs relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-purple-700 uppercase tracking-wider">Расход в RUB (Рубли)</span>
              <span className="p-2 rounded-xl bg-purple-500/10 text-purple-600">🇷🇺</span>
            </div>
            <div className="text-2xl font-black text-purple-950 mt-2">
              {(totals.RUB || 0).toLocaleString('ru-RU', { minimumFractionDigits: 2 })} <span className="text-sm font-semibold">₽</span>
            </div>
            <p className="text-[11px] text-purple-600/90 mt-1 font-medium">Выплачено в рублях ({year} г.)</p>
          </div>
        )}

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Всего ордеров</span>
            <span className="p-2 rounded-xl bg-slate-100 text-slate-600">📤</span>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">
            {list.length} <span className="text-xs font-normal text-slate-400">РКО</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Оформлено выплат</p>
        </div>
      </div>

      {/* Cash Desk Filter Buttons */}
      {allCashDesks.length > 0 && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-2xs p-4">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 mr-1">
              <Wallet className="h-3.5 w-3.5 text-rose-600" />
              <span>Касса:</span>
            </div>
            {isManager ? (
              <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-rose-600 text-white shadow-xs">
                <span>💼</span>
                <span>Касса менеджера (Дадочон)</span>
                <span className="px-1.5 py-0.5 rounded bg-white/20 text-[10px] ml-1">Персональная</span>
              </div>
            ) : (
              <>
                <button
                  onClick={() => { setDeskFilter(''); setSearch(''); }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    !deskFilter
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Все кассы
                </button>
                {allCashDesks.map((desk) => (
                  <button
                    key={desk.id}
                    onClick={() => handleDeskFilter(desk.name)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                      deskFilter === desk.name
                        ? 'bg-rose-600 text-white shadow-xs ring-2 ring-rose-500/30'
                        : 'bg-slate-100 text-slate-600 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 border border-transparent'
                    }`}
                  >
                    <span className="text-sm">{desk.icon}</span>
                    <span>{desk.name.replace(/^Касса\s+/i, '').replace(/\s*\(.*?\)\s*$/, '').trim()}</span>
                  </button>
                ))}
              </>
            )}
          </div>
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-4 rounded-3xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold text-slate-500 mr-1">Валюта:</span>
          {['ALL', 'USD', 'TJS', 'RUB'].map((cur) => (
            <button
              key={cur}
              onClick={() => setCurrency(cur)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                currency === cur
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cur === 'ALL' ? 'Все валюты' : cur}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700 outline-none cursor-pointer"
          >
            <option value="ALL">Все категории</option>
            {expenseCategories.map(cat => (
              <option key={cat.id || cat.name} value={cat.name}>{cat.name}</option>
            ))}
          </select>

          <div className="flex items-center gap-1.5 bg-slate-50 p-1 rounded-2xl border border-slate-200">
            <span className="text-[11px] font-bold text-slate-500 px-2">Год:</span>
            {availableYears.map(y => (
              <button
                key={y}
                onClick={() => setYear(y)}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition cursor-pointer ${
                  year === y
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-200/70'
                }`}
              >
                {y}
              </button>
            ))}
          </div>

          <div className="relative min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Поиск по получателю, описанию..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); if (!e.target.value) setDeskFilter(''); }}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-8 pr-3 py-1.5 text-xs text-slate-900 outline-none focus:border-rose-500 focus:bg-white transition"
            />
          </div>
        </div>
      </div>

      {/* Chart and Structure */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-3xl bg-white p-6 shadow-2xs border border-slate-200">
          <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Tag className="h-4 w-4 text-rose-600" />
              Структура расходов по категориям ({expensesData.chartCurrency || 'USD'})
            </span>
          </h3>
          <div className="h-64">
            {expensesData.categoriesChart && expensesData.categoriesChart.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={expensesData.categoriesChart}
                    cx="50%"
                    cy="50%"
                    innerRadius={65}
                    outerRadius={95}
                    paddingAngle={4}
                    dataKey="amount"
                  >
                    {expensesData.categoriesChart.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => [`${value.toLocaleString()} ${expensesData.chartCurrency || 'USD'}`, 'Расход']}
                    contentStyle={{ borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.05)' }}
                  />
                  <Legend verticalAlign="middle" align="right" layout="vertical" iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 text-xs">
                <Wallet className="h-8 w-8 mb-2 opacity-30" />
                <span>Нет данных о расходах по выбранной валюте ({expensesData.chartCurrency || 'USD'})</span>
              </div>
            )}
          </div>
        </div>

        {/* Quick Category Summary */}
        <div className="rounded-3xl bg-white p-6 shadow-2xs border border-slate-200 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 mb-3">Категории выплат ({year})</h3>
            <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
              {expensesData.categoriesChart && expensesData.categoriesChart.length > 0 ? (
                expensesData.categoriesChart.map((cat, idx) => (
                  <div key={cat.name} className="flex items-center justify-between text-xs p-2 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                      <span className="font-bold text-slate-800">{cat.name}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-black text-rose-700">
                        {cat.amount.toLocaleString()} {expensesData.chartCurrency || 'USD'}
                      </span>
                      {currency === 'ALL' && cat.breakdown?.TJS && (
                        <div className="text-[10px] text-slate-400 font-medium">
                          {cat.breakdown.TJS.toLocaleString()} TJS
                        </div>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-400 py-4 text-center">Категории не сформированы</p>
              )}
            </div>
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="w-full mt-4 py-2.5 rounded-xl border border-dashed border-rose-300 bg-rose-50/50 hover:bg-rose-50 text-rose-700 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Добавить расход в журнал</span>
          </button>
        </div>
      </div>

      {/* Expenses Table */}
      <div className="rounded-3xl bg-white shadow-2xs border border-slate-200 overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
            <FileText className="h-4 w-4 text-rose-600" />
            <span>Журнал расходных кассовых ордеров (РКО)</span>
          </h3>
          <span className="text-xs font-semibold text-slate-400">
            Всего записей: {list.length}
          </span>
        </div>

        <div className="overflow-x-auto w-full">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold text-[11px] uppercase tracking-wider">
              <tr>
                <th className="py-2.5 pl-4 pr-2 whitespace-nowrap">Дата</th>
                <th className="py-2.5 px-2 whitespace-nowrap">РКО</th>
                <th className="py-2.5 px-2.5">Получатель</th>
                <th className="py-2.5 px-2 text-center whitespace-nowrap">Категория</th>
                <th className="py-2.5 px-2 text-center whitespace-nowrap">Оплата</th>
                <th className="py-2.5 px-2.5 whitespace-nowrap">Сумма расхода</th>
                <th className="py-2.5 px-2.5">Назначение</th>
                <th className="py-2.5 pr-4 text-right whitespace-nowrap">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {list.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/80 transition">
                  <td className="py-2.5 pl-4 pr-2 whitespace-nowrap text-slate-600 font-semibold text-[11px]">
                    {dayjs(item.date).format('DD.MM.YYYY')}
                  </td>
                  <td className="py-2.5 px-2 font-bold text-slate-900 font-mono text-[11px] whitespace-nowrap">
                    {item.reference || `РКО-${item.id}`}
                  </td>
                  <td className="py-2.5 px-2.5 font-bold text-slate-900 text-xs leading-tight line-clamp-1" title={item.recipient}>
                    {item.recipient}
                  </td>
                  <td className="py-2.5 px-2 text-center whitespace-nowrap">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700">
                      <Tag className="h-2.5 w-2.5 text-slate-500" />
                      {item.category}
                    </span>
                  </td>
                  <td className="py-2.5 px-2 text-center whitespace-nowrap">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-50 text-slate-600 border border-slate-200">
                      <CreditCard className="h-2.5 w-2.5" />
                      {item.method === 'CASH' ? 'Наличные' : item.method === 'BANK_TRANSFER' ? 'Банк' : item.method}
                    </span>
                  </td>
                  <td className="py-2.5 px-2.5 font-black text-xs sm:text-sm text-rose-600 whitespace-nowrap">
                    -{item.amount.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} {item.currency}
                  </td>
                  <td className="py-2.5 px-2.5 text-slate-500 text-[11px] max-w-[200px] truncate" title={item.description}>
                    {item.description ? item.description.replace(/\[Касса:\s*[^\]]+\]\s*/gi, '').replace(/\[IDEMP:[^\]]+\]\s*/gi, '').trim() || '-' : '-'}
                  </td>
                  <td className="py-2.5 pr-4 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => setPrintableExpense({
                          id: item.id,
                          amount: item.amount,
                          amount_minor: Math.round(item.amount * 100),
                          currency: item.currency,
                          expense_date: item.date,
                          recipient: item.recipient,
                          category: item.category,
                          reference: item.reference,
                          description: (item.description || '').replace(/\[IDEMP:[^\]]+\]\s*/gi, '').trim(),
                          attachment: item.attachment || item.appendix || '',
                          method: item.method,
                          exchange_rate: item.exchange_rate || null,
                          amount_usd: item.amount_usd || null,
                          created_by_name: item.createdByName
                        })}
                        title="Печать РКО (Ордер расхода)"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                      >
                        <Printer className="h-4 w-4" />
                      </button>
                      {isAdmin && (
                        <>
                          <button
                            onClick={() => {
                              const targetDeskId = item.cashDeskId || item.cash_desk_id;
                              const extractedCommentDesk = extractCashDeskFromComment(item.description);
                              const resolved = resolveCashDesk(targetDeskId || extractedCommentDesk, allCashDesks);
                              const cleanDesc = cleanCashDeskFromComment(item.description);

                              setEditingItem({
                                id: item.id,
                                amount: item.amount,
                                currency: item.currency,
                                date: item.date,
                                method: item.method || 'CASH',
                                category: item.category || 'Прочее',
                                recipient: item.recipient || '',
                                reference: item.reference || '',
                                description: cleanDesc,
                                cash_desk: resolved?.name || allCashDesks[0]?.name || '',
                                cash_desk_id: resolved?.id || allCashDesks[0]?.id || null
                              });
                            }}
                            title="Редактировать РКО (Админ)"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition cursor-pointer"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => {
                              if (window.confirm(`Вы уверены, что хотите удалить РКО "${item.reference || item.id}" на сумму ${item.amount} ${item.currency}?`)) {
                                deleteMutation.mutate(item.id);
                              }
                            }}
                            title="Удалить РКО (Админ)"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {list.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-slate-400">
                    Нет зарегистрированных расходов по выбранным фильтрам
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Admin Edit Modal */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-900 px-6 py-4 text-white">
              <div className="flex items-center gap-2.5">
                <Edit className="h-5 w-5 text-amber-400" />
                <div>
                  <h3 className="text-sm font-bold">Редактирование расхода (РКО)</h3>
                  <p className="text-[11px] text-slate-400">Только для администратора</p>
                </div>
              </div>
              <button
                onClick={requestCloseEdit}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={(e) => {
              e.preventDefault();
              const cleanDesc = cleanCashDeskFromComment(editingItem.description);
              const finalDesc = updateCommentWithCashDesk(cleanDesc, editingItem.cash_desk);
              const resolved = resolveCashDesk(editingItem.cash_desk_id || editingItem.cash_desk, allCashDesks);
              updateMutation.mutate({
                ...editingItem,
                cash_desk: resolved?.name || editingItem.cash_desk,
                cash_desk_id: resolved?.id || editingItem.cash_desk_id || null,
                description: finalDesc
              });
            }} className="p-6 space-y-3.5 text-xs">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">Сумма расхода *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={editingItem.amount}
                    onChange={e => setEditingItem({ ...editingItem, amount: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-black text-slate-900 outline-none focus:border-rose-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Валюта *</label>
                  <select
                    value={editingItem.currency}
                    onChange={e => setEditingItem({ ...editingItem, currency: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-bold outline-none"
                  >
                    <option value="TJS">TJS</option>
                    <option value="USD">USD</option>
                    <option value="RUB">RUB</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Wallet className="h-3.5 w-3.5 text-rose-600" />
                    <span>Касса списания средств *</span>
                  </span>
                </label>
                <select
                  value={editingItem.cash_desk || ''}
                  onChange={(e) => {
                    const newDesk = e.target.value;
                    const resolved = resolveCashDesk(newDesk, allCashDesks);
                    setEditingItem({
                      ...editingItem,
                      cash_desk: resolved?.name || newDesk,
                      cash_desk_id: resolved?.id || null
                    });
                  }}
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-rose-500 focus:bg-white transition cursor-pointer"
                >
                  {allCashDesks.map((c) => (
                    <option key={c.id || c.name} value={c.name}>
                      {c.icon} {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Дата *</label>
                  <input
                    type="date"
                    required
                    value={editingItem.date}
                    onChange={e => setEditingItem({ ...editingItem, date: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-1.5 outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Способ оплаты</label>
                  <select
                    value={editingItem.method}
                    onChange={e => setEditingItem({ ...editingItem, method: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-1.5 outline-none"
                  >
                    <option value="CASH">Наличные</option>
                    <option value="BANK_TRANSFER">Банковский перевод</option>
                    <option value="CARD">Карта</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Категория расхода *</label>
                <input
                  type="text"
                  required
                  value={editingItem.category}
                  onChange={e => setEditingItem({ ...editingItem, category: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-1.5 outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Получатель (Контрагент)</label>
                <input
                  type="text"
                  value={editingItem.recipient}
                  onChange={e => setEditingItem({ ...editingItem, recipient: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-1.5 outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Номер РКО / Референс</label>
                <input
                  type="text"
                  value={editingItem.reference}
                  onChange={e => setEditingItem({ ...editingItem, reference: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-1.5 outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Назначение / Описание</label>
                <textarea
                  rows="2"
                  value={editingItem.description}
                  onChange={e => setEditingItem({ ...editingItem, description: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-1.5 outline-none resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={requestCloseEdit}
                  className="rounded-xl border border-slate-300 px-4 py-2 font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={updateMutation.isPending}
                  className="flex items-center gap-1.5 rounded-xl bg-rose-600 px-5 py-2 font-bold text-white shadow-md hover:bg-rose-700 cursor-pointer disabled:opacity-50"
                >
                  <Save className={`h-4 w-4 ${updateMutation.isPending ? 'animate-spin' : ''}`} />
                  <span>{updateMutation.isPending ? 'Сохранение...' : 'Сохранить'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: New Expense Order (РКО) */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="relative w-full max-w-2xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 px-5 py-3 text-white">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
                  <TrendingDown className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold">Оформить расходный кассовый ордер (РКО)</h3>
                  <p className="text-[11px] text-slate-300">Регистрация расхода / выдачи денежных средств</p>
                </div>
              </div>
              <button
                onClick={requestCloseAdd}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-700 hover:text-white transition cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Mode Switcher Tabs */}
            {!isManager ? (
              <div className="flex rounded-2xl bg-slate-100 p-1 mx-4 sm:mx-5 mt-3 border border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsTransfer(false)}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition cursor-pointer ${
                    !isTransfer
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Обычный расход (РКО)
                </button>
                <button
                  type="button"
                  onClick={() => setIsTransfer(true)}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 ${
                    isTransfer
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <ArrowRightLeft className="h-3.5 w-3.5" />
                  <span>Внутреннее перемещение / Оплата за другую кассу</span>
                </button>
              </div>
            ) : null}

            {isTransfer ? (
              /* Internal Transfer Form */
              <form onSubmit={handleTransferSubmit} className="p-4 sm:p-5 space-y-3 text-xs">
                {/* Source and Destination Desks */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-blue-50/50 rounded-2xl border border-blue-200/70">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                      <Wallet className="h-3.5 w-3.5 text-rose-600" />
                      <span>Касса-источник (Списание / РКО) *</span>
                    </label>
                    <select
                      required
                      value={transferForm.source_cash_desk_id}
                      onChange={e => {
                        const newSrc = e.target.value;
                        setTransferForm(prev => {
                          const updated = { ...prev, source_cash_desk_id: newSrc };
                          if (prev.destination_cash_desk_id === newSrc) {
                            const alternative = cashDesksDict.find(d => d.id !== newSrc);
                            updated.destination_cash_desk_id = alternative ? alternative.id : '';
                          }
                          return updated;
                        });
                      }}
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-800 outline-none focus:border-blue-500 cursor-pointer"
                    >
                      {cashDesksDict.map(d => (
                        <option key={d.id} value={d.id}>
                          {d.icon || '🏢'} {d.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                      <Wallet className="h-3.5 w-3.5 text-emerald-600" />
                      <span>Касса-получатель (Зачисление / ПКО) *</span>
                    </label>
                    <select
                      required
                      value={transferForm.destination_cash_desk_id}
                      onChange={e => setTransferForm({ ...transferForm, destination_cash_desk_id: e.target.value })}
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-800 outline-none focus:border-blue-500 cursor-pointer"
                    >
                      {cashDesksDict
                        .filter(d => d.id !== transferForm.source_cash_desk_id)
                        .map(d => (
                          <option key={d.id} value={d.id}>
                            {d.icon || '🏢'} {d.name}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Operation Type */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Тип операции *
                    </label>
                    <select
                      value={transferForm.operation_type}
                      onChange={e => setTransferForm({ ...transferForm, operation_type: e.target.value })}
                      className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-800 outline-none focus:border-blue-500 cursor-pointer"
                    >
                      <option value="INTERNAL_CASH_TRANSFER">Внутреннее перемещение между кассами</option>
                      <option value="PAYMENT_ON_BEHALF">Оплата за другую кассу</option>
                    </select>
                  </div>

                  {/* Recipient */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Фактический получатель денег *
                    </label>
                    <input
                      type="text"
                      required
                      value={transferForm.recipient}
                      onChange={e => setTransferForm({ ...transferForm, recipient: e.target.value })}
                      placeholder={transferForm.operation_type === 'PAYMENT_ON_BEHALF' ? 'Контрагент / Организация' : 'Касса-получатель'}
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* Amount and Currency */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Сумма фактической оплаты *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      required
                      value={transferForm.amount}
                      onChange={e => setTransferForm({ ...transferForm, amount: e.target.value })}
                      placeholder="0.00"
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-sm font-black text-slate-900 outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Валюта оплаты *
                    </label>
                    <select
                      value={transferForm.currency}
                      onChange={e => setTransferForm({ ...transferForm, currency: e.target.value })}
                      className="w-full rounded-xl border border-slate-300 bg-slate-50 px-2 py-1.5 text-xs font-bold text-slate-800 outline-none focus:border-blue-500 cursor-pointer"
                    >
                      <option value="USD">USD ($)</option>
                      <option value="TJS">TJS (Сомони)</option>
                    </select>
                  </div>
                </div>

                {/* Rate and USD Equivalent for TJS */}
                {transferForm.currency === 'TJS' && (
                  <div className="rounded-xl border border-amber-300 bg-amber-50/80 p-3 space-y-2">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-1.5 text-[11px]">
                        <span className="font-bold text-amber-900">Фактический курс операции:</span>
                        <input
                          type="number"
                          step="0.0001"
                          required
                          value={transferForm.exchange_rate}
                          onChange={e => setTransferForm({ ...transferForm, exchange_rate: e.target.value })}
                          className="w-24 rounded-md border border-amber-300 bg-white px-2 py-1 text-xs font-black text-amber-950 outline-none text-center shadow-xs"
                        />
                        <span className="text-amber-800 font-bold">TJS за 1 USD</span>
                      </div>
                      <span className="text-[10px] text-amber-800 bg-amber-200/70 px-2 py-0.5 rounded-md font-semibold">
                        🏦 Банк Эсхата: {liveEskhataRate}
                      </span>
                    </div>

                    <div className="p-2 bg-white rounded-lg border border-amber-200 flex items-center justify-between text-xs">
                      <span className="text-slate-600">Эквивалент USD (будет списан в РКО и зачислен в ПКО):</span>
                      <span className="font-black text-amber-950 text-sm">
                        ${(parseFloat(transferForm.amount) / (parseFloat(transferForm.exchange_rate) || 1) || 0).toFixed(2)} USD
                      </span>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Date */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Дата операции *</label>
                    <input
                      type="date"
                      required
                      value={transferForm.date}
                      onChange={e => setTransferForm({ ...transferForm, date: e.target.value })}
                      className="w-full rounded-xl border border-slate-300 bg-slate-50 px-2.5 py-1.5 text-xs outline-none focus:border-blue-500"
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Назначение платежа / Примечание
                    </label>
                    <input
                      type="text"
                      value={transferForm.description}
                      onChange={e => setTransferForm({ ...transferForm, description: e.target.value })}
                      placeholder="Назначение платежа..."
                      className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* Buttons */}
                <div className="flex items-center justify-end gap-3 pt-2.5 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={requestCloseAdd}
                    className="rounded-xl border border-slate-300 px-4 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                  >
                    Отмена
                  </button>
                  <button
                    type="submit"
                    disabled={transferMutation.isPending}
                    className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-1.5 text-xs font-bold text-white shadow-md hover:from-blue-700 hover:to-indigo-700 transition cursor-pointer disabled:opacity-50"
                  >
                    <ArrowRightLeft className={`h-4 w-4 ${transferMutation.isPending ? 'animate-spin' : ''}`} />
                    <span>{transferMutation.isPending ? 'Создание документов...' : 'Выполнить перемещение (Атомарно)'}</span>
                  </button>
                </div>
              </form>
            ) : (
              /* Modal Form */
              <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-3 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Recipient */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Получатель средств (Кому выдано / Контрагент) *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.recipient}
                      onChange={e => setFormData({ ...formData, recipient: e.target.value })}
                      placeholder="ФИО сотрудника или название"
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs outline-none focus:border-rose-500"
                    />
                  </div>

                  {/* Category */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Категория расхода *
                    </label>
                    <select
                      required
                      value={formData.category}
                      onChange={e => setFormData({ ...formData, category: e.target.value })}
                      className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-800 outline-none focus:border-rose-500 cursor-pointer"
                    >
                      {expenseCategories.map(cat => (
                        <option key={cat.id || cat.name} value={cat.name}>{cat.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Cash Desk */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <Wallet className="h-3.5 w-3.5 text-rose-600" />
                        <span>Касса списания средств *</span>
                      </span>
                      {isManager && (
                        <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 text-[10px] font-bold">
                          Персональная касса
                        </span>
                      )}
                    </label>
                    {isManager ? (
                      <div className="w-full rounded-xl border border-slate-200 bg-slate-100/90 px-3 py-1.5 text-xs font-bold text-slate-700 flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span>💼</span>
                          <span>Касса менеджера (Дадочон)</span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-medium">Фиксировано</span>
                      </div>
                    ) : (
                      <select
                        value={formData.cash_desk || ''}
                        onChange={e => {
                          const desk = allCashDesks.find(c => c.name === e.target.value);
                          setFormData({ 
                            ...formData, 
                            cash_desk: e.target.value,
                            cash_desk_id: desk?.id || null
                          });
                        }}
                        className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-800 outline-none focus:border-rose-500 cursor-pointer"
                      >
                        {allCashDesks.map(c => (
                          <option key={c.id || c.name} value={c.name}>
                            {c.icon} {c.name}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  {/* Amount and Currency */}
                  <div>
                    <div className="grid grid-cols-5 gap-2">
                      <div className="col-span-3">
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Сумма расхода *
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0.01"
                          required
                          value={formData.amount}
                          onChange={e => setFormData({ ...formData, amount: e.target.value })}
                          placeholder="0.00"
                          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-sm font-black text-slate-900 outline-none focus:border-rose-500"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Валюта *
                        </label>
                        <select
                          value={formData.currency}
                          onChange={e => setFormData({ ...formData, currency: e.target.value })}
                          className="w-full rounded-xl border border-slate-300 bg-slate-50 px-2 py-1.5 text-xs font-bold text-slate-800 outline-none focus:border-rose-500"
                        >
                          <option value="TJS">TJS (Сомони)</option>
                          <option value="USD">USD ($)</option>
                          <option value="RUB">RUB (Рубль)</option>
                          <option value="EUR">EUR (€)</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Date & Payment Method */}
                  <div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">Дата *</label>
                        <input
                          type="date"
                          required
                          value={formData.date}
                          onChange={e => setFormData({ ...formData, date: e.target.value })}
                          className="w-full rounded-xl border border-slate-300 bg-slate-50 px-2.5 py-1.5 text-xs outline-none focus:border-rose-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">Оплата *</label>
                        <select
                          value={formData.method}
                          onChange={e => setFormData({ ...formData, method: e.target.value })}
                          className="w-full rounded-xl border border-slate-300 bg-slate-50 px-2 py-1.5 text-xs font-medium outline-none focus:border-rose-500 cursor-pointer"
                        >
                          {paymentMethods.map(m => (
                            <option key={m.id || m.code || m.name} value={m.code || m.name}>
                              {m.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Auto-conversion block (Compact) */}
                  {formData.currency !== 'USD' && (
                    <div className="sm:col-span-2 rounded-xl border border-amber-300 bg-amber-50/80 p-2.5 space-y-1.5">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <label className="flex items-center gap-1.5 cursor-pointer font-bold text-amber-950 select-none text-xs">
                          <input
                            type="checkbox"
                            checked={formData.auto_convert}
                            onChange={e => setFormData({ ...formData, auto_convert: e.target.checked })}
                            className="h-3.5 w-3.5 rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
                          />
                          <span>Автоконвертация из кассы USD ($)</span>
                        </label>

                        {formData.auto_convert && (
                          <div className="flex items-center gap-1.5 text-[11px]">
                            <span className="inline-flex items-center gap-1 font-bold text-amber-900 bg-amber-200/80 px-2 py-0.5 rounded-md border border-amber-300">
                              🏦 Эсхата (Продажа):
                            </span>
                            <span className="text-amber-800 font-semibold">1 USD =</span>
                            <input
                              type="number"
                              step="0.01"
                              value={formData.exchange_rate}
                              onChange={e => setFormData({ ...formData, exchange_rate: e.target.value })}
                              className="w-16 rounded-md border border-amber-300 bg-white px-1.5 py-0.5 text-xs font-black text-amber-950 outline-none text-center shadow-xs"
                            />
                            <span className="text-amber-800 font-bold">{formData.currency}</span>
                          </div>
                        )}
                      </div>

                      {formData.auto_convert && (
                        <div className="flex items-center justify-between flex-wrap gap-2 pt-1 border-t border-amber-200/80 text-[11px] text-amber-900">
                          <span>
                            Списание с USD кассы: <strong className="text-amber-950 font-black">${(parseFloat(formData.amount) / (parseFloat(formData.exchange_rate) || 10.9) || 0).toFixed(2)} USD</strong>
                          </span>
                          <span className="text-emerald-700 font-bold">
                            В кассу {formData.currency}: +{formData.amount || 0} → 0
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Reference */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Номер документа / РКО / Накладная
                    </label>
                    <input
                      type="text"
                      value={formData.reference}
                      onChange={e => setFormData({ ...formData, reference: e.target.value })}
                      placeholder="Например: РКО-4019 / Чек №..."
                      className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs outline-none focus:border-rose-500"
                    />
                  </div>

                  {/* Description / Назначение */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Назначение платежа / Описание
                    </label>
                    <input
                      type="text"
                      value={formData.description}
                      onChange={e => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Подробное назначение расхода..."
                      className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs outline-none focus:border-rose-500"
                    />
                  </div>

                  {/* Attachment / Замима */}
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Замима (Приложение / Документ-основание)
                    </label>
                    <input
                      type="text"
                      value={formData.attachment}
                      onChange={e => setFormData({ ...formData, attachment: e.target.value })}
                      placeholder="Например: Шартномаи нотариалии ҷуброн аз 03.02.2026 сол"
                      className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs outline-none focus:border-rose-500"
                    />
                  </div>
                </div>

                {/* Buttons */}
                <div className="flex items-center justify-end gap-3 pt-2.5 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={requestCloseAdd}
                    className="rounded-xl border border-slate-300 px-4 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                  >
                    Отмена
                  </button>
                  <button
                    type="submit"
                    disabled={addMutation.isPending}
                    className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 px-5 py-1.5 text-xs font-bold text-white shadow-md hover:from-rose-700 hover:to-red-700 transition cursor-pointer disabled:opacity-50"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    <span>{addMutation.isPending ? 'Сохранение...' : 'Зафиксировать расход'}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Modal: Transfer Success Confirmation */}
      {createdTransferPair && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-emerald-200 bg-white shadow-2xl p-6 text-center space-y-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900">Внутреннее перемещение выполнено</h3>
              <p className="text-xs text-slate-500 mt-1">Документы успешно созданы в единой атомарной транзакции</p>
            </div>
            <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4 text-left space-y-2.5 text-xs">
              <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                <span className="text-slate-500">Сумма операции:</span>
                <span className="font-bold text-slate-900">
                  {createdTransferPair.amount_tjs ? `${createdTransferPair.amount_tjs} TJS (${createdTransferPair.amount_usd} USD)` : `${createdTransferPair.amount_usd} USD`}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-rose-600 font-bold">Расход (РКО кассы-источника):</span>
                <span className="font-mono font-black text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                  {createdTransferPair.source_reference}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-emerald-600 font-bold">Приход (ПКО кассы-получателя):</span>
                <span className="font-mono font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  {createdTransferPair.destination_reference}
                </span>
              </div>
              {createdTransferPair.exchange_rate && (
                <div className="flex justify-between items-center pt-2 border-t border-slate-200 text-slate-500">
                  <span>Курс конвертации:</span>
                  <span>{createdTransferPair.exchange_rate}</span>
                </div>
              )}
            </div>
            <button
              onClick={() => setCreatedTransferPair(null)}
              className="w-full py-2.5 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 transition cursor-pointer"
            >
              Закрыть
            </button>
          </div>
        </div>
      )}

      {/* Modal: Auto-Conversion & Expense Report Confirmation */}
      {createdConversionReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-emerald-200 bg-white shadow-2xl p-6 text-center space-y-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900">Автоконвертация и расход выполнены</h3>
              <p className="text-xs text-slate-500 mt-1">Документы успешно созданы в единой атомарной транзакции</p>
            </div>

            <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4 text-left space-y-2.5 text-xs">
              <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                <span className="text-slate-500 font-medium">Сумма расхода:</span>
                <span className="font-black text-rose-600 text-sm">
                  {createdConversionReport.amount_tjs?.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} TJS
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Списание с кассы USD:</span>
                <span className="font-bold text-slate-900">
                  ${createdConversionReport.amount_usd?.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} USD
                </span>
              </div>

              {createdConversionReport.exchange_rate && (
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">Курс конвертации (Эсхата):</span>
                  <span className="font-semibold text-slate-700">
                    1 USD = {createdConversionReport.exchange_rate} TJS
                  </span>
                </div>
              )}

              {createdConversionReport.cash_desk_name && (
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">Касса списания:</span>
                  <span className="font-bold text-slate-800 truncate max-w-[200px]" title={createdConversionReport.cash_desk_name}>
                    {createdConversionReport.cash_desk_name}
                  </span>
                </div>
              )}

              {/* Цепочка документов */}
              <div className="pt-2 border-t border-slate-200 space-y-2">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Созданные документы:</div>

                {createdConversionReport.conv_expense_reference && (
                  <div className="flex justify-between items-center">
                    <span className="text-rose-600 font-medium">Расход конвертации (USD):</span>
                    <span className="font-mono font-black text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                      {createdConversionReport.conv_expense_reference}
                    </span>
                  </div>
                )}

                {createdConversionReport.conv_payment_reference && (
                  <div className="flex justify-between items-center">
                    <span className="text-emerald-600 font-medium">Приход конвертации (TJS):</span>
                    <span className="font-mono font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      {createdConversionReport.conv_payment_reference}
                    </span>
                  </div>
                )}

                <div className="flex justify-between items-center">
                  <span className="text-blue-600 font-bold">Ордер расхода (РКО):</span>
                  <span className="font-mono font-black text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                    {createdConversionReport.main_reference}
                  </span>
                </div>
              </div>

              {(createdConversionReport.recipient || createdConversionReport.description) && (
                <div className="pt-2 border-t border-slate-200 space-y-1">
                  {createdConversionReport.recipient && (
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 font-medium">Получатель:</span>
                      <span className="font-bold text-slate-800">{createdConversionReport.recipient}</span>
                    </div>
                  )}
                  {createdConversionReport.description && (
                    <div className="text-[11px] text-slate-500 truncate" title={createdConversionReport.description}>
                      <span className="text-slate-400">Назначение: </span>{createdConversionReport.description}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  const exp = createdConversionReport.createdExpense;
                  setCreatedConversionReport(null);
                  if (exp) setPrintableExpense(exp);
                }}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 text-white font-bold text-xs hover:from-rose-700 hover:to-red-700 transition cursor-pointer shadow-md shadow-rose-600/20"
              >
                <Printer className="h-4 w-4" />
                <span>Печать РКО</span>
              </button>
              <button
                type="button"
                onClick={() => setCreatedConversionReport(null)}
                className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-50 transition cursor-pointer"
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Printable Expense Receipt Modal */}
      {printableExpense && (
        <ExpenseReceiptPrintModal
          expense={printableExpense}
          onClose={() => setPrintableExpense(null)}
        />
      )}
    </div>
  );
};
