import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { financeApi } from '../../api/finance.api';
import { FinanceTabs } from '../../components/FinanceTabs';
import { useAuth } from '../auth/AuthContext';
import { 
  TrendingUp, Plus, Search, Calendar, DollarSign, Coins, CreditCard, 
  User, FileText, CheckCircle2, RefreshCw, Filter, ArrowUpRight, Building2, X,
  Edit, Trash2, Save
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import dayjs from 'dayjs';

export const IncomePage = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const [year, setYear] = useState(new Date().getFullYear());
  const [currency, setCurrency] = useState('ALL');
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [dealsList, setDealsList] = useState([]);

  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    deal_id: '',
    payer_name: '',
    amount: '',
    currency: 'USD',
    date: dayjs().format('YYYY-MM-DD'),
    method: 'CASH',
    reference: '',
    comment: ''
  });

  const { data: response, isLoading, refetch } = useQuery({
    queryKey: ['finance-income', year, currency, search],
    queryFn: () => financeApi.getIncome({ year, currency, search })
  });

  useEffect(() => {
    financeApi.getDealsForSelect().then(data => setDealsList(data || [])).catch(() => {});
  }, []);

  const addMutation = useMutation({
    mutationFn: financeApi.addIncome,
    onSuccess: () => {
      queryClient.invalidateQueries(['finance-income']);
      queryClient.invalidateQueries(['finance-cashflow']);
      setShowAddModal(false);
      setFormData({
        deal_id: '',
        payer_name: '',
        amount: '',
        currency: 'USD',
        date: dayjs().format('YYYY-MM-DD'),
        method: 'CASH',
        reference: '',
        comment: ''
      });
    }
  });

  const updateMutation = useMutation({
    mutationFn: financeApi.updateIncome,
    onSuccess: () => {
      queryClient.invalidateQueries(['finance-income']);
      queryClient.invalidateQueries(['finance-cashflow']);
      setEditingItem(null);
    },
    onError: (err) => {
      alert(`Ошибка при сохранении ПКО: ${err.message}`);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: financeApi.deleteIncome,
    onSuccess: () => {
      queryClient.invalidateQueries(['finance-income']);
      queryClient.invalidateQueries(['finance-cashflow']);
    },
    onError: (err) => {
      alert(`Ошибка при удалении ПКО: ${err.message}`);
    }
  });

  const incomeData = response || { list: [], totalsByCurrency: {}, availableCurrencies: ['USD', 'TJS'], chartData: [] };
  const totals = incomeData.totalsByCurrency || {};
  const list = incomeData.list || [];
  const availableYears = incomeData.availableYears && incomeData.availableYears.length > 0
    ? incomeData.availableYears
    : [year - 1, year, year + 1, year + 2];

  const handleDealSelect = (e) => {
    const dId = e.target.value;
    const selected = dealsList.find(d => String(d.id) === String(dId));
    if (selected) {
      setFormData(prev => ({
        ...prev,
        deal_id: dId,
        payer_name: selected.lead_name || '',
        currency: selected.currency || 'USD',
        reference: prev.reference || `ПКО к дог. ${selected.contract_number || selected.id}`
      }));
    } else {
      setFormData(prev => ({ ...prev, deal_id: '' }));
    }
  };

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
            <TrendingUp className="h-7 w-7 text-emerald-600" />
            <span>Доходы и приходные ордера (ПКО)</span>
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500">
            Учет всех оприходованных денежных средств по кассам, договорам и валютам
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
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-emerald-600/20 hover:from-emerald-700 hover:to-teal-700 transition cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Оформить приход (ПКО)</span>
          </button>
        </div>
      </div>

      {/* Finance Navigation Tabs */}
      <FinanceTabs />

      {/* Currency KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-3xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50/40 p-5 shadow-2xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Приход в USD ($)</span>
            <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600">💵</span>
          </div>
          <div className="text-2xl font-black text-emerald-950 mt-2">
            ${(totals.USD || 0).toLocaleString('ru-RU', { minimumFractionDigits: 2 })}
          </div>
          <p className="text-[11px] text-emerald-600/90 mt-1 font-medium">Оприходовано в долларах США ({year} г.)</p>
        </div>

        <div className="rounded-3xl border border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50/40 p-5 shadow-2xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-700 uppercase tracking-wider">Приход в TJS (Сомони)</span>
            <span className="p-2 rounded-xl bg-blue-500/10 text-blue-600">🇹🇯</span>
          </div>
          <div className="text-2xl font-black text-blue-950 mt-2">
            {(totals.TJS || 0).toLocaleString('ru-RU', { minimumFractionDigits: 2 })} <span className="text-sm font-semibold">TJS</span>
          </div>
          <p className="text-[11px] text-blue-600/90 mt-1 font-medium">Оприходовано в сомони ({year} г.)</p>
        </div>

        {totals.RUB !== undefined && (
          <div className="rounded-3xl border border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50/40 p-5 shadow-2xs relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-purple-700 uppercase tracking-wider">Приход в RUB (Рубли)</span>
              <span className="p-2 rounded-xl bg-purple-500/10 text-purple-600">🇷🇺</span>
            </div>
            <div className="text-2xl font-black text-purple-950 mt-2">
              {(totals.RUB || 0).toLocaleString('ru-RU', { minimumFractionDigits: 2 })} <span className="text-sm font-semibold">₽</span>
            </div>
            <p className="text-[11px] text-purple-600/90 mt-1 font-medium">Оприходовано в рублях ({year} г.)</p>
          </div>
        )}

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Всего операций</span>
            <span className="p-2 rounded-xl bg-slate-100 text-slate-600">📑</span>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">
            {list.length} <span className="text-xs font-normal text-slate-400">ордеров</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Зафиксировано в кассах системы</p>
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
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cur === 'ALL' ? 'Все валюты' : cur}
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
                    ? 'bg-emerald-600 text-white shadow-xs'
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
              placeholder="Поиск по клиенту, договору..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-8 pr-3 py-1.5 text-xs text-slate-900 outline-none focus:border-emerald-500 focus:bg-white transition"
            />
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="rounded-3xl bg-white p-6 shadow-2xs border border-slate-200">
        <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-emerald-600" />
            Динамика поступлений ({incomeData.chartCurrency || 'USD'}) по месяцам {year}
          </span>
          <span className="text-xs text-slate-400 font-medium">Сумма в выбранной валюте</span>
        </h3>
        <div className="h-60">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={incomeData.chartData || []}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} dy={8} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={(val) => val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val} />
              <Tooltip
                cursor={{ fill: '#f8fafc' }}
                contentStyle={{ borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.05)' }}
                formatter={(val) => [`${val.toLocaleString()} ${incomeData.chartCurrency || 'USD'}`, 'Поступления']}
              />
              <Bar dataKey="amount" fill="#10b981" radius={[6, 6, 0, 0]} maxBarSize={36} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Payments Table */}
      <div className="rounded-3xl bg-white shadow-2xs border border-slate-200 overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
            <FileText className="h-4 w-4 text-emerald-600" />
            <span>Журнал приходных кассовых ордеров (ПКО)</span>
          </h3>
          <span className="text-xs font-semibold text-slate-400">
            Записей: {list.length}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
              <tr>
                <th className="p-3.5 pl-5">Дата</th>
                <th className="p-3.5">Документ / ПКО</th>
                <th className="p-3.5">Плательщик / Клиент</th>
                <th className="p-3.5">Договор / Назначение</th>
                <th className="p-3.5">Способ оплаты</th>
                <th className="p-3.5">Сумма прихода</th>
                <th className="p-3.5">Ответственный</th>
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
                    {item.reference || `ПКО-${item.id}`}
                  </td>
                  <td className="p-3.5">
                    <div className="font-bold text-slate-900">{item.clientName}</div>
                    {item.clientPhone && <div className="text-[10px] text-slate-400">{item.clientPhone}</div>}
                  </td>
                  <td className="p-3.5 text-slate-600">
                    <span className="px-2 py-0.5 rounded-lg bg-blue-50 text-blue-700 font-bold border border-blue-100">
                      {item.contract}
                    </span>
                  </td>
                  <td className="p-3.5">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-slate-100 text-slate-700">
                      <CreditCard className="h-3 w-3 text-slate-500" />
                      {item.method === 'CASH' ? 'Наличные' : item.method === 'BANK_TRANSFER' ? 'Банк' : item.method === 'CARD' ? 'Карта' : item.method}
                    </span>
                  </td>
                  <td className="p-3.5 font-black text-sm text-emerald-600 whitespace-nowrap">
                    +{item.amount.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} {item.currency}
                  </td>
                  <td className="p-3.5 text-slate-500">
                    <div className="text-[11px] font-semibold text-slate-700">{item.createdByName}</div>
                    {item.comment && <div className="text-[10px] text-slate-400 truncate max-w-xs" title={item.comment}>{item.comment}</div>}
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
                            reference: item.reference || '',
                            comment: item.comment || '',
                            payer_name: item.clientName || ''
                          })}
                          title="Редактировать ПКО (Админ)"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition cursor-pointer"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm(`Вы уверены, что хотите удалить ПКО "${item.reference || item.id}" на сумму ${item.amount} ${item.currency}?`)) {
                              deleteMutation.mutate(item.id);
                            }
                          }}
                          title="Удалить ПКО (Админ)"
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
                    Нет зарегистрированных приходов по выбранным фильтрам
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
                  <h3 className="text-sm font-bold">Редактирование прихода (ПКО)</h3>
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
                  <label className="block font-bold text-slate-700 mb-1">Сумма прихода *</label>
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
                <label className="block font-bold text-slate-700 mb-1">Номер ПКО / Референс</label>
                <input
                  type="text"
                  value={editingItem.reference}
                  onChange={e => setEditingItem({ ...editingItem, reference: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-1.5 outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Плательщик / Клиент</label>
                <input
                  type="text"
                  value={editingItem.payer_name}
                  onChange={e => setEditingItem({ ...editingItem, payer_name: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-1.5 outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Примечание</label>
                <textarea
                  rows="2"
                  value={editingItem.comment}
                  onChange={e => setEditingItem({ ...editingItem, comment: e.target.value })}
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
                  className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-5 py-2 font-bold text-white shadow-md hover:bg-blue-700 cursor-pointer disabled:opacity-50"
                >
                  <Save className={`h-4 w-4 ${updateMutation.isPending ? 'animate-spin' : ''}`} />
                  <span>{updateMutation.isPending ? 'Сохранение...' : 'Сохранить'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: New Income Order (ПКО) */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 px-6 py-4 text-white">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  <TrendingUp className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold">Оформить приходный кассовый ордер (ПКО)</h3>
                  <p className="text-xs text-slate-300">Регистрация поступления денежных средств</p>
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
              {/* Optional deal link */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Привязать к сделке / договору (необязательно):
                </label>
                <select
                  value={formData.deal_id}
                  onChange={handleDealSelect}
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-medium outline-none focus:border-emerald-500 focus:bg-white"
                >
                  <option value="">-- Прямое поступление (без привязки к сделке) --</option>
                  {dealsList.map(d => (
                    <option key={d.id} value={d.id}>
                      Договор {d.contract_number || `СД-${d.id}`} • {d.lead_name} ({d.project_name})
                    </option>
                  ))}
                </select>
              </div>

              {/* Payer Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ФИО Плательщика / Клиент *
                </label>
                <input
                  type="text"
                  required
                  value={formData.payer_name}
                  onChange={e => setFormData({ ...formData, payer_name: e.target.value })}
                  placeholder="ФИО клиента или контрагента"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs outline-none focus:border-emerald-500"
                />
              </div>

              {/* Amount and Currency */}
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Сумма поступления *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={formData.amount}
                    onChange={e => setFormData({ ...formData, amount: e.target.value })}
                    placeholder="0.00"
                    className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm font-black text-slate-900 outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Валюта *
                  </label>
                  <select
                    value={formData.currency}
                    onChange={e => setFormData({ ...formData, currency: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-xs font-bold text-slate-800 outline-none focus:border-emerald-500"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="TJS">TJS (Сомони)</option>
                    <option value="RUB">RUB (Рубль)</option>
                    <option value="EUR">EUR (€)</option>
                  </select>
                </div>
              </div>

              {/* Date & Payment Method */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Дата платежа *</label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={e => setFormData({ ...formData, date: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Способ оплаты *</label>
                  <select
                    value={formData.method}
                    onChange={e => setFormData({ ...formData, method: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-medium outline-none focus:border-emerald-500 cursor-pointer"
                  >
                    <option value="CASH">💵 Наличные в кассу</option>
                    <option value="BANK_TRANSFER">🏦 Банковский перевод</option>
                    <option value="CARD">💳 Банковская карта</option>
                    <option value="OTHER">📁 Прочее / Эл. кошелек</option>
                  </select>
                </div>
              </div>

              {/* Reference */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Номер чека / ПКО / Референс
                </label>
                <input
                  type="text"
                  value={formData.reference}
                  onChange={e => setFormData({ ...formData, reference: e.target.value })}
                  placeholder="Например: ПКО-10449 / Банк Эсхата"
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs outline-none focus:border-emerald-500"
                />
              </div>

              {/* Comment */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Примечание / Назначение</label>
                <textarea
                  rows="2"
                  value={formData.comment}
                  onChange={e => setFormData({ ...formData, comment: e.target.value })}
                  placeholder="Детали или назначение платежа..."
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs outline-none focus:border-emerald-500 resize-none"
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
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-2 text-xs font-bold text-white shadow-md hover:from-emerald-700 hover:to-teal-700 transition cursor-pointer disabled:opacity-50"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span>{addMutation.isPending ? 'Сохранение...' : 'Зафиксировать приход'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
