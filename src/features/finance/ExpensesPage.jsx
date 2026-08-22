import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { financeApi } from '../../api/finance.api';
import { FinanceTabs } from '../../components/FinanceTabs';
import { useAuth } from '../auth/AuthContext';
import { 
  TrendingDown, Plus, Search, Calendar, Tag, FileText, Wallet, RefreshCw,
  DollarSign, CheckCircle2, User, CreditCard, X, Edit, Trash2, Save
} from 'lucide-react';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import dayjs from 'dayjs';

const COLORS = ['#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16', '#22c55e', '#0ea5e9', '#6366f1', '#a855f7', '#ec4899'];

export const ExpensesPage = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const [year, setYear] = useState(new Date().getFullYear());
  const [currency, setCurrency] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    amount: '',
    currency: 'TJS',
    date: dayjs().format('YYYY-MM-DD'),
    category: 'Строительные материалы',
    method: 'CASH',
    reference: '',
    recipient: '',
    description: '',
    auto_convert: true,
    exchange_rate: '10.90',
    source_currency: 'USD'
  });

  const { data: response, isLoading, refetch } = useQuery({
    queryKey: ['finance-expenses', year, currency, categoryFilter, search],
    queryFn: () => financeApi.getExpenses({ year, currency, category: categoryFilter, search })
  });

  const addMutation = useMutation({
    mutationFn: financeApi.addExpense,
    onSuccess: () => {
      queryClient.invalidateQueries(['finance-expenses']);
      queryClient.invalidateQueries(['finance-cashflow']);
      queryClient.invalidateQueries(['finance-income']);
      setShowAddModal(false);
      setFormData({
        amount: '',
        currency: 'TJS',
        date: dayjs().format('YYYY-MM-DD'),
        category: 'Строительные материалы',
        method: 'CASH',
        reference: '',
        recipient: '',
        description: '',
        auto_convert: true,
        exchange_rate: '10.90',
        source_currency: 'USD'
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

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.amount || Number(formData.amount) <= 0) return;
    addMutation.mutate(formData);
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
            <option value="Строительные материалы">Строительные материалы</option>
            <option value="Зарплата">Зарплата</option>
            <option value="Маркетинг и реклама">Маркетинг и реклама</option>
            <option value="Аренда и офис">Аренда и офис</option>
            <option value="Налоги и сборы">Налоги и сборы</option>
            <option value="Хозяйственные нужды">Хозяйственные нужды</option>
            <option value="Прочее">Прочее</option>
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
              onChange={(e) => setSearch(e.target.value)}
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
                    <span className="font-black text-rose-700">
                      {cat.amount.toLocaleString()} {expensesData.chartCurrency || 'USD'}
                    </span>
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

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
              <tr>
                <th className="p-3.5 pl-5">Дата</th>
                <th className="p-3.5">Документ / РКО</th>
                <th className="p-3.5">Получатель</th>
                <th className="p-3.5">Категория</th>
                <th className="p-3.5">Способ оплаты</th>
                <th className="p-3.5">Сумма расхода</th>
                <th className="p-3.5">Назначение / Комментарий</th>
                {isAdmin && <th className="p-3.5 pr-5 text-right">Действия</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {list.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50 transition">
                  <td className="p-3.5 pl-5 whitespace-nowrap text-slate-600">
                    <div className="flex items-center gap-1.5 font-bold">
                      <Calendar className="h-3.5 w-3.5 text-slate-400" />
                      {dayjs(item.date).format('DD.MM.YYYY')}
                    </div>
                  </td>
                  <td className="p-3.5 font-bold text-slate-900 font-mono">
                    {item.reference || `РКО-${item.id}`}
                  </td>
                  <td className="p-3.5 font-bold text-slate-900">
                    {item.recipient}
                  </td>
                  <td className="p-3.5">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-slate-100 text-slate-700">
                      <Tag className="h-3 w-3 text-slate-500" />
                      {item.category}
                    </span>
                  </td>
                  <td className="p-3.5">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-50 text-slate-600 border border-slate-200">
                      <CreditCard className="h-3 w-3" />
                      {item.method === 'CASH' ? 'Наличные' : item.method === 'BANK_TRANSFER' ? 'Банк' : item.method}
                    </span>
                  </td>
                  <td className="p-3.5 font-black text-sm text-rose-600 whitespace-nowrap">
                    -{item.amount.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} {item.currency}
                  </td>
                  <td className="p-3.5 text-slate-500 max-w-xs truncate" title={item.description}>
                    {item.description || '-'}
                  </td>
                  {isAdmin && (
                    <td className="p-3.5 pr-5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setEditingItem({
                            id: item.id,
                            amount: item.amount,
                            currency: item.currency,
                            date: item.date,
                            method: item.method || 'CASH',
                            category: item.category || 'Прочее',
                            recipient: item.recipient || '',
                            reference: item.reference || '',
                            description: item.description || ''
                          })}
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
                      </div>
                    </td>
                  )}
                </tr>
              ))}
              {list.length === 0 && (
                <tr>
                  <td colSpan={isAdmin ? 8 : 7} className="p-12 text-center text-slate-400">
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
                onClick={() => setEditingItem(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={(e) => {
              e.preventDefault();
              updateMutation.mutate(editingItem);
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
                  onClick={() => setEditingItem(null)}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 px-6 py-4 text-white">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
                  <TrendingDown className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold">Оформить расходный кассовый ордер (РКО)</h3>
                  <p className="text-xs text-slate-300">Регистрация расхода / выдачи денежных средств</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-700 hover:text-white transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              {/* Recipient */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Получатель средств (Кому выдано / Контрагент) *
                </label>
                <input
                  type="text"
                  required
                  value={formData.recipient}
                  onChange={e => setFormData({ ...formData, recipient: e.target.value })}
                  placeholder="ФИО сотрудника или название организации"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs outline-none focus:border-rose-500"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Категория расхода *
                </label>
                <select
                  required
                  value={formData.category}
                  onChange={e => setFormData({ ...formData, category: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-rose-500 cursor-pointer"
                >
                  <option value="Строительные материалы">Строительные материалы</option>
                  <option value="Зарплата">Зарплата сотрудникам / строителям</option>
                  <option value="Маркетинг и реклама">Маркетинг и реклама</option>
                  <option value="Аренда и офис">Аренда и содержание офиса</option>
                  <option value="Налоги и сборы">Налоги, сборы и лицензии</option>
                  <option value="Хозяйственные нужды">Хозяйственные нужды</option>
                  <option value="Прочее">Прочие расходы</option>
                </select>
              </div>

              {/* Amount and Currency */}
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
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
                    className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm font-black text-slate-900 outline-none focus:border-rose-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Валюта *
                  </label>
                  <select
                    value={formData.currency}
                    onChange={e => setFormData({ ...formData, currency: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-xs font-bold text-slate-800 outline-none focus:border-rose-500"
                  >
                    <option value="TJS">TJS (Сомони)</option>
                    <option value="USD">USD ($)</option>
                    <option value="RUB">RUB (Рубль)</option>
                    <option value="EUR">EUR (€)</option>
                  </select>
                </div>
              </div>

              {/* Auto-conversion block */}
              {formData.currency !== 'USD' && (
                <div className="rounded-2xl border border-amber-300 bg-amber-50/70 p-3.5 space-y-2.5 text-xs">
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 cursor-pointer font-bold text-amber-950 select-none">
                      <input
                        type="checkbox"
                        checked={formData.auto_convert}
                        onChange={e => setFormData({ ...formData, auto_convert: e.target.checked })}
                        className="h-4 w-4 rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
                      />
                      <span>Автоконвертация из кассы USD ($)</span>
                    </label>

                    {formData.auto_convert && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] text-amber-800 font-semibold">Курс: 1 USD =</span>
                        <input
                          type="number"
                          step="0.01"
                          value={formData.exchange_rate}
                          onChange={e => setFormData({ ...formData, exchange_rate: e.target.value })}
                          className="w-16 rounded-lg border border-amber-300 bg-white px-2 py-0.5 text-xs font-bold text-amber-950 outline-none text-center"
                        />
                        <span className="text-[11px] text-amber-800 font-semibold">{formData.currency}</span>
                      </div>
                    )}
                  </div>

                  {formData.auto_convert && (
                    <div className="pt-2 border-t border-amber-200/80 space-y-1 text-[11px] text-amber-900">
                      <div className="flex justify-between items-center">
                        <span>Будет списано с долларовой кассы:</span>
                        <strong className="text-xs font-black text-amber-950">
                          ${(parseFloat(formData.amount) / (parseFloat(formData.exchange_rate) || 10.9) || 0).toFixed(2)} USD
                        </strong>
                      </div>
                      <div className="flex justify-between items-center text-slate-600">
                        <span>Поступит в кассу {formData.currency} и сразу спишется:</span>
                        <strong className="text-emerald-700 font-bold">
                          +{formData.amount || 0} {formData.currency} → 0
                        </strong>
                      </div>
                      <p className="text-[10px] text-amber-800/80 italic pt-0.5">
                        * Баланс кассы {formData.currency} не уйдет в минус, списание произойдет из остатка USD по курсу.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Date & Payment Method */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Дата расхода *</label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={e => setFormData({ ...formData, date: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs outline-none focus:border-rose-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Форма оплаты *</label>
                  <select
                    value={formData.method}
                    onChange={e => setFormData({ ...formData, method: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-medium outline-none focus:border-rose-500 cursor-pointer"
                  >
                    <option value="CASH">💵 Наличные из кассы</option>
                    <option value="BANK_TRANSFER">🏦 Безналичный расчет (Банк)</option>
                    <option value="CARD">💳 Корпоративная карта</option>
                    <option value="OTHER">📁 Прочее</option>
                  </select>
                </div>
              </div>

              {/* Reference */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Номер документа / РКО / Накладная
                </label>
                <input
                  type="text"
                  value={formData.reference}
                  onChange={e => setFormData({ ...formData, reference: e.target.value })}
                  placeholder="Например: РКО-4019 / Чек №..."
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs outline-none focus:border-rose-500"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Назначение платежа / Описание</label>
                <textarea
                  rows="2"
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Подробное назначение расхода..."
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs outline-none focus:border-rose-500 resize-none"
                />
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={addMutation.isPending}
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 px-5 py-2 text-xs font-bold text-white shadow-md hover:from-rose-700 hover:to-red-700 transition cursor-pointer disabled:opacity-50"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span>{addMutation.isPending ? 'Сохранение...' : 'Зафиксировать расход'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
