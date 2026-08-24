import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { financeApi } from '../../api/finance.api';
import { useModalDismiss } from '../../hooks/useModalDismiss';
import { FinanceTabs } from '../../components/FinanceTabs';
import { useAuth } from '../auth/AuthContext';
import { 
  Wallet, TrendingUp, TrendingDown, RefreshCw, Calendar, ArrowUpRight, 
  ArrowDownRight, FileText, Search, CreditCard, Filter, ArrowRightLeft,
  DollarSign, CheckCircle2, Coins, X, Edit, Trash2, AlertCircle, Save
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import dayjs from 'dayjs';

export const CashflowPage = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const [year, setYear] = useState(new Date().getFullYear());
  const [currency, setCurrency] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL'); // ALL, INCOME, EXPENSE
  const [search, setSearch] = useState('');
  const [globalRate, setGlobalRate] = useState('9.27');
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  const queryClient = useQueryClient();

  const { data: eskhataRateData } = useQuery({
    queryKey: ['eskhata-rate'],
    queryFn: financeApi.getEskhataRate,
    staleTime: 10 * 60 * 1000
  });

  const liveEskhataRate = eskhataRateData?.sellRate ? String(eskhataRateData.sellRate) : '9.27';

  useEffect(() => {
    if (eskhataRateData?.sellRate) {
      setGlobalRate(String(eskhataRateData.sellRate));
      setConvertForm(prev => ({ ...prev, exchange_rate: String(eskhataRateData.sellRate) }));
    }
  }, [eskhataRateData]);

  const [convertForm, setConvertForm] = useState({
    from_currency: 'USD',
    to_currency: 'TJS',
    from_amount: '',
    exchange_rate: '9.27',
    date: dayjs().format('YYYY-MM-DD'),
    method: 'CASH',
    reference: '',
    comment: ''
  });

  const isConvertDirty = Boolean(convertForm.from_amount && parseFloat(convertForm.from_amount) > 0 || convertForm.comment.trim());
  const { requestClose: requestCloseConvert } = useModalDismiss({
    isOpen: showConvertModal,
    onClose: () => setShowConvertModal(false),
    isDirty: isConvertDirty,
    confirmMessage: 'Введенная операция обмена валюты не сохранена. Закрыть окно?'
  });

  const { requestClose: requestCloseEdit } = useModalDismiss({
    isOpen: Boolean(editingItem),
    onClose: () => setEditingItem(null),
    isDirty: Boolean(editingItem?.amount && parseFloat(editingItem.amount) > 0),
    confirmMessage: 'Изменения проводки не сохранены. Закрыть окно?'
  });

  const { data: response, isLoading, refetch } = useQuery({
    queryKey: ['finance-cashflow', year, currency, typeFilter, search],
    queryFn: () => financeApi.getCashflow({ year, currency, type: typeFilter, search })
  });

  const convertMutation = useMutation({
    mutationFn: financeApi.convertCurrency,
    onSuccess: () => {
      queryClient.invalidateQueries(['finance-cashflow']);
      queryClient.invalidateQueries(['finance-income']);
      queryClient.invalidateQueries(['finance-expenses']);
      setShowConvertModal(false);
      setConvertForm({
        from_currency: 'USD',
        to_currency: 'TJS',
        from_amount: '',
        exchange_rate: liveEskhataRate,
        date: dayjs().format('YYYY-MM-DD'),
        method: 'CASH',
        reference: '',
        comment: ''
      });
    }
  });

  const updateIncomeMutation = useMutation({
    mutationFn: financeApi.updateIncome,
    onSuccess: () => {
      queryClient.invalidateQueries(['finance-cashflow']);
      queryClient.invalidateQueries(['finance-income']);
      setEditingItem(null);
    },
    onError: (err) => {
      alert(`Ошибка при сохранении ПКО: ${err.message}`);
    }
  });

  const updateExpenseMutation = useMutation({
    mutationFn: financeApi.updateExpense,
    onSuccess: () => {
      queryClient.invalidateQueries(['finance-cashflow']);
      queryClient.invalidateQueries(['finance-expenses']);
      setEditingItem(null);
    },
    onError: (err) => {
      alert(`Ошибка при сохранении РКО: ${err.message}`);
    }
  });

  const deleteIncomeMutation = useMutation({
    mutationFn: financeApi.deleteIncome,
    onSuccess: () => {
      queryClient.invalidateQueries(['finance-cashflow']);
      queryClient.invalidateQueries(['finance-income']);
    },
    onError: (err) => {
      alert(`Ошибка при удалении ПКО: ${err.message}`);
    }
  });

  const deleteExpenseMutation = useMutation({
    mutationFn: financeApi.deleteExpense,
    onSuccess: () => {
      queryClient.invalidateQueries(['finance-cashflow']);
      queryClient.invalidateQueries(['finance-expenses']);
    },
    onError: (err) => {
      alert(`Ошибка при удалении РКО: ${err.message}`);
    }
  });

  const cashflowData = response || { 
    summaryByCurrency: {}, 
    availableCurrencies: ['USD', 'TJS'], 
    monthlyData: [], 
    chartCurrency: 'USD',
    transactions: [] 
  };

  const summary = cashflowData.summaryByCurrency || {};
  const transactions = cashflowData.transactions || [];
  const availableYears = cashflowData.availableYears && cashflowData.availableYears.length > 0
    ? cashflowData.availableYears
    : [year - 1, year, year + 1, year + 2];

  // Calculate Consolidated Equivalent Balance
  const usdNet = summary.USD?.netCashflow || 0;
  const tjsNet = summary.TJS?.netCashflow || 0;
  const rateNum = parseFloat(globalRate) || 10.90;
  const totalEquivalentInTjs = (usdNet * rateNum) + tjsNet;
  const totalEquivalentInUsd = usdNet + (rateNum > 0 ? (tjsNet / rateNum) : 0);

  const handleConvertSubmit = (e) => {
    e.preventDefault();
    if (!convertForm.from_amount || Number(convertForm.from_amount) <= 0) return;
    convertMutation.mutate(convertForm);
  };

  const handleEditClick = (t) => {
    setEditingItem({
      id: t.rawId,
      type: t.type,
      amount: t.amount,
      currency: t.currency,
      date: t.date,
      method: t.method || 'CASH',
      reference: t.reference || '',
      comment: t.comment || '',
      category: t.category || 'Прочее',
      recipient: t.counterparty || '',
      payer_name: t.counterparty || ''
    });
  };

  const handleSaveEdit = (e) => {
    e.preventDefault();
    if (!editingItem) return;
    if (editingItem.type === 'INCOME') {
      updateIncomeMutation.mutate(editingItem);
    } else {
      updateExpenseMutation.mutate(editingItem);
    }
  };

  const handleDeleteClick = (t) => {
    const isIncome = t.type === 'INCOME';
    const typeLabel = isIncome ? 'приходный ордер (ПКО)' : 'расходный ордер (РКО)';
    if (window.confirm(`Вы уверены, что хотите удалить ${typeLabel} "${t.reference}" на сумму ${t.amount} ${t.currency}?`)) {
      if (isIncome) {
        deleteIncomeMutation.mutate(t.rawId);
      } else {
        deleteExpenseMutation.mutate(t.rawId);
      }
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Wallet className="h-7 w-7 text-blue-600" />
            <span>Движение денежных средств (ДДС)</span>
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500">
            Сводный баланс касс, чистый денежный поток, валютообмен и единый журнал кассовых операций
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
            onClick={() => setShowConvertModal(true)}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-blue-600/20 hover:from-blue-700 hover:to-indigo-700 transition cursor-pointer"
          >
            <ArrowRightLeft className="h-4 w-4" />
            <span>Конвертация / Обмен валют</span>
          </button>
        </div>
      </div>

      {/* Finance Navigation Tabs */}
      <FinanceTabs />

      {/* Consolidated Equivalent Banner */}
      <div className="rounded-3xl border border-indigo-100 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 shadow-md relative overflow-hidden space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
                Сводный капитал компании (Фактический остаток средств)
              </span>
              <div className="flex items-center gap-1.5 text-xs text-indigo-200">
                <span className="font-semibold text-indigo-300">🏦 Курс Эсхата (Продажа): 1 USD =</span>
                <input
                  type="number"
                  step="0.01"
                  value={globalRate}
                  onChange={e => setGlobalRate(e.target.value)}
                  className="w-16 rounded-md border border-indigo-400/40 bg-white/10 px-1.5 py-0.5 text-xs font-black text-white outline-none text-center"
                />
                <span className="font-bold">TJS</span>
              </div>
            </div>

            <div className="mt-3 flex items-baseline gap-3 flex-wrap">
              <span className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                ${totalEquivalentInUsd.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                <span className="text-lg font-bold text-indigo-300 ml-1.5">USD</span>
              </span>
              <span className="text-sm font-semibold text-indigo-200/80">
                (≈ {totalEquivalentInTjs.toLocaleString('ru-RU', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} сомони (TJS))
              </span>
            </div>
            <p className="text-xs text-indigo-300/80 mt-1">
              Фактический общий остаток денежных средств во всех кассах компании
            </p>

            {/* Cash desks breakdown pills */}
            <div className="mt-3.5 flex items-center gap-2.5 flex-wrap text-xs">
              <span className="text-[11px] font-bold text-indigo-300">Фактический остаток в кассах:</span>
              <div className="flex items-center gap-1.5 bg-white/10 hover:bg-white/15 px-3 py-1.5 rounded-xl border border-white/15 backdrop-blur-xs transition">
                <span>💵</span>
                <span className="text-indigo-200 font-medium">Касса USD:</span>
                <strong className="text-white font-black">${(summary.USD?.netCashflow || 0).toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
              </div>
              <div className="flex items-center gap-1.5 bg-white/10 hover:bg-white/15 px-3 py-1.5 rounded-xl border border-white/15 backdrop-blur-xs transition">
                <span>🇹🇯</span>
                <span className="text-indigo-200 font-medium">Касса TJS:</span>
                <strong className="text-white font-black">{(summary.TJS?.netCashflow || 0).toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} сомони</strong>
              </div>
              {summary.RUB && (summary.RUB?.netCashflow !== 0) && (
                <div className="flex items-center gap-1.5 bg-white/10 hover:bg-white/15 px-3 py-1.5 rounded-xl border border-white/15 backdrop-blur-xs transition">
                  <span>🇷🇺</span>
                  <span className="text-indigo-200 font-medium">Касса RUB:</span>
                  <strong className="text-white font-black">{(summary.RUB?.netCashflow || 0).toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₽</strong>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowConvertModal(true)}
              className="flex items-center gap-2 rounded-2xl bg-white/15 hover:bg-white/25 border border-white/20 px-4 py-2.5 text-xs font-bold text-white transition backdrop-blur-md cursor-pointer"
            >
              <Coins className="h-4 w-4 text-amber-300" />
              <span>Сконвертировать USD в TJS</span>
            </button>
          </div>
        </div>

        {/* Sales, Area, Discounts & Receivables metrics grid inside Banner */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-4 border-t border-indigo-500/20 text-xs">
          {/* 1. Реализовано м² */}
          <div className="rounded-2xl bg-white/10 p-3.5 border border-white/10 backdrop-blur-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-indigo-200 text-[11px] font-semibold">
              <span>📐 Продано площади</span>
              <span className="text-indigo-300">Договоры</span>
            </div>
            <div className="my-1.5">
              <span className="text-xl font-black text-white">
                {(cashflowData.salesSummary?.totalSoldAreaM2 || 0).toLocaleString('ru-RU')} <span className="text-xs font-bold text-indigo-300">м²</span>
              </span>
            </div>
            <p className="text-[10px] text-indigo-300/80 truncate">
              Сумма: ${(cashflowData.salesSummary?.totalContractSumUsd || 0).toLocaleString()} USD
            </p>
          </div>

          {/* 2. Сумма скидки */}
          <div className="rounded-2xl bg-white/10 p-3.5 border border-white/10 backdrop-blur-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-indigo-200 text-[11px] font-semibold">
              <span>🏷️ Предоставлено скидок</span>
              <span className="text-amber-300 text-[10px] font-bold">Скидка</span>
            </div>
            <div className="my-1.5">
              <span className="text-xl font-black text-amber-300">
                ${(cashflowData.salesSummary?.totalDiscountSumUsd || 0).toLocaleString('ru-RU', { minimumFractionDigits: 0 })} <span className="text-xs font-bold text-indigo-200">USD</span>
              </span>
            </div>
            <p className="text-[10px] text-indigo-300/80 truncate">
              ≈ {((cashflowData.salesSummary?.totalDiscountSumUsd || 0) * rateNum).toLocaleString('ru-RU', { maximumFractionDigits: 0 })} сомони
            </p>
          </div>

          {/* 3. Ожидаемый остаток (сумма рассрочки) */}
          <div className="rounded-2xl bg-white/10 p-3.5 border border-white/10 backdrop-blur-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-indigo-200 text-[11px] font-semibold">
              <span>⏳ Ожидаемый остаток (Рассрочка)</span>
              <span className="text-emerald-300 text-[10px] font-bold">К оплате</span>
            </div>
            <div className="my-1.5">
              <span className="text-xl font-black text-emerald-300">
                ${(cashflowData.salesSummary?.totalReceivableSumUsd || 0).toLocaleString('ru-RU', { minimumFractionDigits: 0 })} <span className="text-xs font-bold text-indigo-200">USD</span>
              </span>
            </div>
            <p className="text-[10px] text-indigo-300/80 truncate">
              ≈ {((cashflowData.salesSummary?.totalReceivableSumUsd || 0) * rateNum).toLocaleString('ru-RU', { maximumFractionDigits: 0 })} сомони к внесению
            </p>
          </div>

          {/* 4. Сконвертировано */}
          <div className="rounded-2xl bg-white/10 p-3.5 border border-white/10 backdrop-blur-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-indigo-200 text-[11px] font-semibold">
              <span>🔄 Сконвертировано ({year} г.)</span>
              <span className="text-indigo-300 text-[10px]">Касса</span>
            </div>
            <div className="my-1.5 flex items-center gap-1.5 flex-wrap">
              <span className="text-sm font-black text-rose-300">
                -${(cashflowData.conversionsSummary?.totalConvertedFromUsd || 0).toLocaleString()} USD
              </span>
              <span className="text-indigo-400">→</span>
              <span className="text-sm font-black text-emerald-300">
                +{(cashflowData.conversionsSummary?.totalConvertedToTjs || 0).toLocaleString()} TJS
              </span>
            </div>
            <p className="text-[10px] text-indigo-300/80">
              {cashflowData.conversionsSummary?.conversionOperationsCount || 0} операций обмена
            </p>
          </div>
        </div>
      </div>

      {/* Currency Balances & FX Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* USD Cash Flow Card */}
        <div className="rounded-3xl border border-blue-200 bg-white p-5 shadow-2xs relative overflow-hidden flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-blue-700 uppercase tracking-wider flex items-center gap-1.5">
                <span>💵</span> Сальдо в USD ($)
              </span>
              <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-100">
                USD
              </span>
            </div>

            <div className="grid grid-cols-3 gap-1.5 mt-3 text-center">
              <div className="p-1.5 rounded-xl bg-emerald-50/70 border border-emerald-100">
                <span className="text-[9px] font-bold text-emerald-700 block">Приход</span>
                <span className="text-xs font-black text-emerald-800 mt-0.5 block truncate">
                  +${(summary.USD?.totalIncome || 0).toLocaleString()}
                </span>
              </div>
              <div className="p-1.5 rounded-xl bg-rose-50/70 border border-rose-100">
                <span className="text-[9px] font-bold text-rose-700 block">Расход</span>
                <span className="text-xs font-black text-rose-800 mt-0.5 block truncate">
                  -${(summary.USD?.totalExpense || 0).toLocaleString()}
                </span>
              </div>
              <div className={`p-1.5 rounded-xl border ${
                (summary.USD?.netCashflow || 0) >= 0 ? 'bg-blue-50/70 border-blue-100 text-blue-900' : 'bg-red-50/70 border-red-100 text-red-900'
              }`}>
                <span className="text-[9px] font-bold text-slate-600 block">Сальдо</span>
                <span className="text-xs font-black mt-0.5 block truncate">
                  ${(summary.USD?.netCashflow || 0).toLocaleString()}
                </span>
              </div>
            </div>
          </div>
          <p className="text-[10px] text-slate-400 mt-2">Остаток в долларовой кассе</p>
        </div>

        {/* TJS Cash Flow Card */}
        <div className="rounded-3xl border border-emerald-200 bg-white p-5 shadow-2xs relative overflow-hidden flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider flex items-center gap-1.5">
                <span>🇹🇯</span> Сальдо в TJS (Сомони)
              </span>
              <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">
                TJS
              </span>
            </div>

            <div className="grid grid-cols-3 gap-1.5 mt-3 text-center">
              <div className="p-1.5 rounded-xl bg-emerald-50/70 border border-emerald-100">
                <span className="text-[9px] font-bold text-emerald-700 block">Приход</span>
                <span className="text-xs font-black text-emerald-800 mt-0.5 block truncate">
                  +{(summary.TJS?.totalIncome || 0).toLocaleString()}
                </span>
              </div>
              <div className="p-1.5 rounded-xl bg-rose-50/70 border border-rose-100">
                <span className="text-[9px] font-bold text-rose-700 block">Расход</span>
                <span className="text-xs font-black text-rose-800 mt-0.5 block truncate">
                  -{(summary.TJS?.totalExpense || 0).toLocaleString()}
                </span>
              </div>
              <div className={`p-1.5 rounded-xl border ${
                (summary.TJS?.netCashflow || 0) >= 0 ? 'bg-emerald-50/70 border-emerald-100 text-emerald-900' : 'bg-red-50/70 border-red-100 text-red-900'
              }`}>
                <span className="text-[9px] font-bold text-slate-600 block">Сальдо</span>
                <span className="text-xs font-black mt-0.5 block truncate">
                  {(summary.TJS?.netCashflow || 0).toLocaleString()}
                </span>
              </div>
            </div>
          </div>
          <p className="text-[10px] text-slate-400 mt-2">Остаток в кассе сомони</p>
        </div>

        {/* FX Gain / Loss Card */}
        <div className="rounded-3xl border border-indigo-200 bg-white p-5 shadow-2xs relative overflow-hidden flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-indigo-700 uppercase tracking-wider flex items-center gap-1.5">
                <span>📈</span> Курсовая разница ({year})
              </span>
              <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black ${
                (cashflowData.fxSummary?.isProfit ?? true) ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
              }`}>
                {(cashflowData.fxSummary?.isProfit ?? true) ? 'ВЫГОДА' : 'УБЫТОК'}
              </span>
            </div>

            <div className="mt-2">
              <div className={`text-xl font-black ${
                (cashflowData.fxSummary?.isProfit ?? true) ? 'text-emerald-700' : 'text-rose-700'
              }`}>
                {(cashflowData.fxSummary?.fxGainLossUsd || 0) >= 0 ? '+' : ''}
                ${(cashflowData.fxSummary?.fxGainLossUsd || 0).toLocaleString('ru-RU', { minimumFractionDigits: 2 })}
                <span className="text-[11px] font-bold text-slate-500 ml-1 block sm:inline">
                  ({(cashflowData.fxSummary?.fxGainLossTjs || 0) >= 0 ? '+' : ''}
                  {(cashflowData.fxSummary?.fxGainLossTjs || 0).toLocaleString()} TJS)
                </span>
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">
                Экономия за счет разницы курсов оплат и расходов
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-1 mt-2 pt-2 border-t border-slate-100 text-[10px]">
            <div>
              <span className="text-slate-400 block">Курс приёма:</span>
              <strong className="text-slate-800 font-bold">{cashflowData.fxSummary?.avgIncomeRate || 10.80}</strong>
            </div>
            <div>
              <span className="text-slate-400 block">Курс расхода:</span>
              <strong className="text-slate-800 font-bold">{cashflowData.fxSummary?.avgExpenseRate || 10.90}</strong>
            </div>
          </div>
        </div>

        {/* Global Stats Card */}
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Всего операций</span>
            <span className="p-1.5 rounded-xl bg-slate-100 text-slate-600">📊</span>
          </div>
          <div className="my-1">
            <div className="text-2xl font-black text-slate-900 tracking-tight">
              {transactions.length} <span className="text-xs font-normal text-slate-400">ордеров</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">ПКО, РКО и автоконвертации</p>
          </div>
          <div className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
            <TrendingUp className="h-3 w-3" />
            <span>Сквозной кассовый учет</span>
          </div>
        </div>
      </div>

      {/* Filter and Currency Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-4 rounded-3xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold text-slate-500 mr-1">Валюта:</span>
          {['ALL', 'USD', 'TJS', 'RUB'].map((cur) => (
            <button
              key={cur}
              onClick={() => setCurrency(cur)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                currency === cur
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cur === 'ALL' ? 'Все валюты' : cur}
            </button>
          ))}

          <span className="text-xs font-bold text-slate-500 mx-2">Тип:</span>
          {[
            { id: 'ALL', label: 'Все' },
            { id: 'INCOME', label: 'Приход (ПКО)' },
            { id: 'EXPENSE', label: 'Расход (РКО)' }
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setTypeFilter(t.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                typeFilter === t.id
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 bg-slate-50 p-1 rounded-2xl border border-slate-200">
            <span className="text-[11px] font-bold text-slate-500 px-2">Год:</span>
            {availableYears.map(y => (
              <button
                key={y}
                onClick={() => setYear(y)}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition cursor-pointer ${
                  year === y
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-200/70'
                }`}
              >
                {y}
              </button>
            ))}
          </div>

          <div className="relative min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Поиск по ордерам ДДС..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-8 pr-3 py-1.5 text-xs text-slate-900 outline-none focus:border-blue-500 focus:bg-white transition"
            />
          </div>
        </div>
      </div>

      {/* Monthly Dynamics Chart */}
      <div className="rounded-3xl bg-white p-6 shadow-2xs border border-slate-200">
        <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-blue-600" />
            Сравнение поступлений и выплат ({cashflowData.chartCurrency || 'USD'}) за {year} год
          </span>
          <span className="text-xs text-slate-400 font-medium">Доходы vs Расходы</span>
        </h3>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={cashflowData.monthlyData || []} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} dy={8} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={(val) => val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val} />
              <Tooltip
                cursor={{ fill: '#f8fafc' }}
                contentStyle={{ borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.05)' }}
                formatter={(val, name) => [`${val.toLocaleString()} ${cashflowData.chartCurrency || 'USD'}`, name === 'income' ? 'Поступления' : 'Выплаты']}
              />
              <Legend verticalAlign="top" height={36} iconType="circle" />
              <Bar dataKey="income" name="Поступления (+)" fill="#10b981" radius={[6, 6, 0, 0]} maxBarSize={30} />
              <Bar dataKey="expense" name="Выплаты (-)" fill="#f43f5e" radius={[6, 6, 0, 0]} maxBarSize={30} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Unified Transaction Ledger */}
      <div className="rounded-3xl bg-white shadow-2xs border border-slate-200 overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
            <FileText className="h-4 w-4 text-blue-600" />
            <span>Единый журнал кассовых и банковских операций (ДДС)</span>
          </h3>
          <span className="text-xs font-semibold text-slate-400">
            Найдено операций: {transactions.length}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
              <tr>
                <th className="p-3.5 pl-5">Дата</th>
                <th className="p-3.5">Тип</th>
                <th className="p-3.5">Документ</th>
                <th className="p-3.5">Контрагент / Клиент</th>
                <th className="p-3.5">Статья / Категория</th>
                <th className="p-3.5">Способ оплаты</th>
                <th className="p-3.5 text-right">Сумма операции</th>
                <th className="p-3.5">Примечание</th>
                {isAdmin && <th className="p-3.5 pr-5 text-right">Действия</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {transactions.map((t) => {
                const isIncome = t.type === 'INCOME';
                const isConversion = t.category === 'Конвертация валюты' || t.title?.includes('Конвертация');
                return (
                  <tr key={t.id} className={`transition ${isConversion ? 'bg-indigo-50/30 hover:bg-indigo-50/60' : 'hover:bg-slate-50'}`}>
                    <td className="p-3.5 pl-5 whitespace-nowrap text-slate-600">
                      <div className="flex items-center gap-1.5 font-bold">
                        <Calendar className="h-3.5 w-3.5 text-slate-400" />
                        {dayjs(t.date).format('DD.MM.YYYY')}
                      </div>
                    </td>
                    <td className="p-3.5">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-extrabold ${
                        isConversion
                          ? 'bg-indigo-100 text-indigo-800'
                          : isIncome
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}>
                        {isConversion ? (
                          <ArrowRightLeft className="h-3 w-3" />
                        ) : isIncome ? (
                          <ArrowUpRight className="h-3 w-3" />
                        ) : (
                          <ArrowDownRight className="h-3 w-3" />
                        )}
                        {isConversion ? 'КОНВЕРТАЦИЯ' : isIncome ? 'ПРИХОД (ПКО)' : 'РАСХОД (РКО)'}
                      </span>
                    </td>
                    <td className="p-3.5 font-bold text-slate-900 font-mono">
                      {t.reference}
                    </td>
                    <td className="p-3.5">
                      <div className="font-bold text-slate-900">{t.counterparty}</div>
                      <div className="text-[10px] text-slate-400">{t.title}</div>
                    </td>
                    <td className="p-3.5">
                      <span className={`px-2 py-0.5 rounded-lg font-medium ${
                        isConversion ? 'bg-indigo-100 text-indigo-800 font-bold' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {t.category}
                      </span>
                    </td>
                    <td className="p-3.5">
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600">
                        <CreditCard className="h-3 w-3 text-slate-400" />
                        {t.method === 'CASH' ? 'Наличные' : t.method === 'BANK_TRANSFER' ? 'Банк' : t.method}
                      </span>
                    </td>
                    <td className={`p-3.5 text-right font-black text-sm whitespace-nowrap ${
                      isIncome ? 'text-emerald-600' : 'text-rose-600'
                    }`}>
                      {isIncome ? '+' : '-'}{t.amount.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} {t.currency}
                    </td>
                    <td className="p-3.5 text-slate-500 max-w-xs truncate" title={t.comment}>
                      {t.comment || '-'}
                    </td>
                    {isAdmin && (
                      <td className="p-3.5 pr-5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleEditClick(t)}
                            title="Редактировать запись (Админ)"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition cursor-pointer"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteClick(t)}
                            title="Удалить запись (Админ)"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
              {transactions.length === 0 && (
                <tr>
                  <td colSpan={isAdmin ? 9 : 8} className="p-12 text-center text-slate-400">
                    Нет финансовых операций по заданным критериям
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
                  <h3 className="text-sm font-bold">Редактирование {editingItem.type === 'INCOME' ? 'прихода (ПКО)' : 'расхода (РКО)'}</h3>
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

            <form onSubmit={handleSaveEdit} className="p-6 space-y-3.5 text-xs">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">Сумма *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={editingItem.amount}
                    onChange={e => setEditingItem({ ...editingItem, amount: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-black text-slate-900 outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Валюта *</label>
                  <select
                    value={editingItem.currency}
                    onChange={e => setEditingItem({ ...editingItem, currency: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-bold outline-none"
                  >
                    <option value="USD">USD</option>
                    <option value="TJS">TJS</option>
                    <option value="RUB">RUB</option>
                  </select>
                </div>
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
                <label className="block font-bold text-slate-700 mb-1">Номер документа / Референс</label>
                <input
                  type="text"
                  value={editingItem.reference}
                  onChange={e => setEditingItem({ ...editingItem, reference: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-1.5 outline-none"
                />
              </div>

              {editingItem.type === 'EXPENSE' && (
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Категория расхода</label>
                  <input
                    type="text"
                    value={editingItem.category}
                    onChange={e => setEditingItem({ ...editingItem, category: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-1.5 outline-none"
                  />
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {editingItem.type === 'INCOME' ? 'Плательщик / Клиент' : 'Получатель / Контрагент'}
                </label>
                <input
                  type="text"
                  value={editingItem.type === 'INCOME' ? (editingItem.payer_name || '') : (editingItem.recipient || '')}
                  onChange={e => {
                    if (editingItem.type === 'INCOME') {
                      setEditingItem({ ...editingItem, payer_name: e.target.value });
                    } else {
                      setEditingItem({ ...editingItem, recipient: e.target.value });
                    }
                  }}
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-1.5 outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Примечание / Назначение</label>
                <textarea
                  rows="2"
                  value={editingItem.comment}
                  onChange={e => setEditingItem({ ...editingItem, comment: e.target.value, description: e.target.value })}
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
                  disabled={updateIncomeMutation.isPending || updateExpenseMutation.isPending}
                  className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-5 py-2 font-bold text-white shadow-md hover:bg-blue-700 cursor-pointer disabled:opacity-50"
                >
                  <Save className={`h-4 w-4 ${(updateIncomeMutation.isPending || updateExpenseMutation.isPending) ? 'animate-spin' : ''}`} />
                  <span>{(updateIncomeMutation.isPending || updateExpenseMutation.isPending) ? 'Сохранение...' : 'Сохранить'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manual Conversion Modal */}
      {showConvertModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="relative w-full max-w-3xl rounded-3xl border border-slate-200 bg-white p-4 sm:p-5 shadow-2xl space-y-3.5 max-h-[96vh] flex flex-col justify-between">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 -mx-4 -mt-4 sm:-mx-5 sm:-mt-5 px-5 py-3.5 text-white rounded-t-3xl shrink-0">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 shrink-0">
                  <ArrowRightLeft className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-black leading-tight">Валютообмен кассы (Конвертация)</h3>
                  <p className="text-xs text-indigo-200">Списание из кассы USD с зачислением в кассу TJS</p>
                </div>
              </div>
              <button
                type="button"
                onClick={requestCloseConvert}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleConvertSubmit} className="space-y-3.5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {/* Left Column: Currencies, Amounts, Exchange Rate */}
                <div className="space-y-3 flex flex-col justify-between">
                  <div className="rounded-2xl bg-slate-50 p-3 border border-slate-200 space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">Списать из кассы *</label>
                        <select
                          value={convertForm.from_currency}
                          onChange={e => setConvertForm({ ...convertForm, from_currency: e.target.value })}
                          className="w-full rounded-xl border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-bold outline-none focus:border-indigo-500"
                        >
                          <option value="USD">Касса USD ($)</option>
                          <option value="TJS">Касса TJS (Сомони)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">Зачислить в кассу *</label>
                        <select
                          value={convertForm.to_currency}
                          onChange={e => setConvertForm({ ...convertForm, to_currency: e.target.value })}
                          className="w-full rounded-xl border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-bold outline-none focus:border-indigo-500"
                        >
                          <option value="TJS">Касса TJS (Сомони)</option>
                          <option value="USD">Касса USD ($)</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Сумма ({convertForm.from_currency}) *
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0.01"
                          required
                          value={convertForm.from_amount}
                          onChange={e => setConvertForm({ ...convertForm, from_amount: e.target.value })}
                          placeholder="1000"
                          className="w-full rounded-xl border border-slate-300 bg-white px-2.5 py-1.5 text-sm font-black text-slate-900 outline-none focus:border-indigo-500"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center justify-between">
                          <span>Курс обмена *</span>
                          <span className="text-[9px] font-bold text-indigo-900 bg-indigo-100 px-1 py-0.2 rounded">🏦 Эсхата</span>
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            step="0.01"
                            required
                            value={convertForm.exchange_rate}
                            onChange={e => setConvertForm({ ...convertForm, exchange_rate: e.target.value })}
                            className="w-full rounded-xl border border-slate-300 bg-white px-2.5 py-1.5 text-sm font-black text-slate-900 outline-none focus:border-indigo-500"
                          />
                          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">TJS</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Calculation Preview */}
                  <div className="rounded-2xl border border-indigo-200 bg-indigo-50/70 p-2.5 space-y-1 text-xs">
                    <div className="flex justify-between items-center text-slate-700 text-[11px]">
                      <span>Списание:</span>
                      <strong className="text-rose-600 font-bold">
                        -{Number(convertForm.from_amount || 0).toLocaleString()} {convertForm.from_currency}
                      </strong>
                    </div>
                    <div className="flex justify-between items-center text-slate-700 text-[11px]">
                      <span>Зачисление:</span>
                      <strong className="text-emerald-700 font-black text-xs">
                        +{(Number(convertForm.from_amount || 0) * (parseFloat(convertForm.exchange_rate) || 9.27)).toLocaleString()} {convertForm.to_currency}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Right Column: Date, Movement Method, Comment */}
                <div className="space-y-3 flex flex-col justify-between">
                  <div className="rounded-2xl bg-slate-50 p-3 border border-slate-200 space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">Дата операции *</label>
                        <input
                          type="date"
                          required
                          value={convertForm.date}
                          onChange={e => setConvertForm({ ...convertForm, date: e.target.value })}
                          className="w-full rounded-xl border border-slate-300 bg-white px-2.5 py-1.5 text-xs outline-none focus:border-indigo-500 font-medium"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">Способ перемещения</label>
                        <select
                          value={convertForm.method}
                          onChange={e => setConvertForm({ ...convertForm, method: e.target.value })}
                          className="w-full rounded-xl border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-bold outline-none cursor-pointer"
                        >
                          <option value="CASH">💵 Наличные в кассу</option>
                          <option value="BANK_TRANSFER">🏦 Банковский перевод</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Основание / Примечание</label>
                      <input
                        type="text"
                        value={convertForm.comment}
                        onChange={e => setConvertForm({ ...convertForm, comment: e.target.value })}
                        placeholder="Пополнение кассы сомони..."
                        className="w-full rounded-xl border border-slate-300 bg-white px-2.5 py-1.5 text-xs outline-none focus:border-indigo-500 font-medium"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100 shrink-0">
                <button
                  type="button"
                  onClick={requestCloseConvert}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={convertMutation.isPending}
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 px-6 py-2 text-xs font-bold text-white shadow-md hover:from-indigo-700 hover:to-blue-700 transition cursor-pointer disabled:opacity-50"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span>{convertMutation.isPending ? 'Выполняется...' : 'Выполнить конвертацию'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
