import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { financeApi } from '../../api/finance.api';
import { FinanceTabs } from '../../components/FinanceTabs';
import { 
  Wallet, TrendingUp, TrendingDown, RefreshCw, Calendar, ArrowUpRight, 
  ArrowDownRight, FileText, Search, CreditCard, Filter
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import dayjs from 'dayjs';

export const CashflowPage = () => {
  const [year, setYear] = useState(new Date().getFullYear());
  const [currency, setCurrency] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL'); // ALL, INCOME, EXPENSE
  const [search, setSearch] = useState('');

  const { data: response, isLoading, refetch } = useQuery({
    queryKey: ['finance-cashflow', year, currency, typeFilter, search],
    queryFn: () => financeApi.getCashflow({ year, currency, type: typeFilter, search })
  });

  const cashflowData = response || { 
    summaryByCurrency: {}, 
    availableCurrencies: ['USD', 'TJS'], 
    monthlyData: [], 
    chartCurrency: 'USD',
    transactions: [] 
  };

  const summary = cashflowData.summaryByCurrency || {};
  const activeCur = currency !== 'ALL' ? currency : 'USD';
  const curSummary = summary[activeCur] || { totalIncome: 0, totalExpense: 0, netCashflow: 0 };
  const transactions = cashflowData.transactions || [];
  const availableYears = cashflowData.availableYears && cashflowData.availableYears.length > 0
    ? cashflowData.availableYears
    : [year - 1, year, year + 1, year + 2];

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
            Сводный баланс поступлений и выплат, чистый денежный поток и единый журнал кассовых операций
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
        </div>
      </div>

      {/* Finance Navigation Tabs */}
      <FinanceTabs />

      {/* Currency Balances Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* USD Cash Flow Card */}
        <div className="rounded-3xl border border-blue-200 bg-white p-5 shadow-2xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-700 uppercase tracking-wider flex items-center gap-1.5">
              <span>💵</span> Сальдо в USD ($) ({year})
            </span>
            <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-100">
              USD
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-slate-100 text-center">
            <div className="p-2 rounded-2xl bg-emerald-50/70 border border-emerald-100">
              <span className="text-[10px] font-bold text-emerald-700 block">Приход</span>
              <span className="text-sm font-black text-emerald-800 mt-0.5 block">
                +${(summary.USD?.totalIncome || 0).toLocaleString()}
              </span>
            </div>
            <div className="p-2 rounded-2xl bg-rose-50/70 border border-rose-100">
              <span className="text-[10px] font-bold text-rose-700 block">Расход</span>
              <span className="text-sm font-black text-rose-800 mt-0.5 block">
                -${(summary.USD?.totalExpense || 0).toLocaleString()}
              </span>
            </div>
            <div className={`p-2 rounded-2xl border ${
              (summary.USD?.netCashflow || 0) >= 0 ? 'bg-blue-50/70 border-blue-100 text-blue-900' : 'bg-red-50/70 border-red-100 text-red-900'
            }`}>
              <span className="text-[10px] font-bold text-slate-600 block">Чистый поток</span>
              <span className="text-sm font-black mt-0.5 block">
                ${(summary.USD?.netCashflow || 0).toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* TJS Cash Flow Card */}
        <div className="rounded-3xl border border-emerald-200 bg-white p-5 shadow-2xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider flex items-center gap-1.5">
              <span>🇹🇯</span> Сальдо в TJS (Сомони) ({year})
            </span>
            <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">
              TJS
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-slate-100 text-center">
            <div className="p-2 rounded-2xl bg-emerald-50/70 border border-emerald-100">
              <span className="text-[10px] font-bold text-emerald-700 block">Приход</span>
              <span className="text-sm font-black text-emerald-800 mt-0.5 block">
                +{(summary.TJS?.totalIncome || 0).toLocaleString()}
              </span>
            </div>
            <div className="p-2 rounded-2xl bg-rose-50/70 border border-rose-100">
              <span className="text-[10px] font-bold text-rose-700 block">Расход</span>
              <span className="text-sm font-black text-rose-800 mt-0.5 block">
                -{(summary.TJS?.totalExpense || 0).toLocaleString()}
              </span>
            </div>
            <div className={`p-2 rounded-2xl border ${
              (summary.TJS?.netCashflow || 0) >= 0 ? 'bg-emerald-50/70 border-emerald-100 text-emerald-900' : 'bg-red-50/70 border-red-100 text-red-900'
            }`}>
              <span className="text-[10px] font-bold text-slate-600 block">Чистый поток</span>
              <span className="text-sm font-black mt-0.5 block">
                {(summary.TJS?.netCashflow || 0).toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Global Net Card */}
        <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-900 to-slate-800 text-white p-5 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Всего операций в ДДС</span>
            <span className="p-1.5 rounded-xl bg-white/10 text-white">📊</span>
          </div>
          <div className="my-2">
            <div className="text-3xl font-black text-white tracking-tight">
              {transactions.length} <span className="text-sm font-normal text-slate-300">ордеров</span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">Включая все приходы (ПКО) и расходы (РКО)</p>
          </div>
          <div className="text-[11px] text-emerald-400 font-bold flex items-center gap-1">
            <TrendingUp className="h-3.5 w-3.5" />
            <span>Сквозной учет по кассам компании</span>
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
                <th className="p-3.5 pr-5">Примечание</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {transactions.map((t) => {
                const isIncome = t.type === 'INCOME';
                return (
                  <tr key={t.id} className="hover:bg-slate-50 transition">
                    <td className="p-3.5 pl-5 whitespace-nowrap text-slate-600">
                      <div className="flex items-center gap-1.5 font-bold">
                        <Calendar className="h-3.5 w-3.5 text-slate-400" />
                        {dayjs(t.date).format('DD.MM.YYYY')}
                      </div>
                    </td>
                    <td className="p-3.5">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-extrabold ${
                        isIncome ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                      }`}>
                        {isIncome ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                        {isIncome ? 'ПРИХОД (ПКО)' : 'РАСХОД (РКО)'}
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
                      <span className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 font-medium">
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
                    <td className="p-3.5 pr-5 text-slate-400 max-w-xs truncate" title={t.comment}>
                      {t.comment || '-'}
                    </td>
                  </tr>
                );
              })}
              {transactions.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-slate-400">
                    Нет финансовых операций по заданным критериям
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
