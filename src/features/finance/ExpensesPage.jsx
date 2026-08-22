import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { financeApi } from '../../api/finance.api';
import { 
  TrendingDown, Plus, Search, Calendar, Tag, FileText, Download, Wallet
} from 'lucide-react';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import dayjs from 'dayjs';

const COLORS = ['#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16', '#22c55e', '#0ea5e9', '#6366f1', '#a855f7', '#ec4899'];

export const ExpensesPage = () => {
  const [year, setYear] = useState(new Date().getFullYear());
  const [showAddModal, setShowAddModal] = useState(false);
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    amount: '',
    date: dayjs().format('YYYY-MM-DD'),
    category: 'Офис',
    description: ''
  });

  const { data: response, isLoading } = useQuery({
    queryKey: ['finance-expenses', year],
    queryFn: () => financeApi.getExpenses({ year })
  });

  const addMutation = useMutation({
    mutationFn: financeApi.addExpense,
    onSuccess: () => {
      queryClient.invalidateQueries(['finance-expenses']);
      queryClient.invalidateQueries(['finance-cashflow']);
      setShowAddModal(false);
      setFormData({ ...formData, amount: '', description: '' });
    }
  });

  const expensesData = response?.data || { list: [], categoriesChart: [] };
  const totalExpenses = expensesData.list.reduce((sum, item) => sum + item.amount, 0);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.amount || !formData.date || !formData.category) return;
    addMutation.mutate({
      ...formData,
      amount: Number(formData.amount)
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <TrendingDown className="h-6 w-6 text-rose-500" />
            Расходы
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Учет операционных, маркетинговых и прочих расходов
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <select 
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all cursor-pointer"
          >
            {[2023, 2024, 2025, 2026, 2027].map(y => (
              <option key={y} value={y}>{y} год</option>
            ))}
          </select>
          <button 
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700 transition shadow-sm shadow-blue-500/30 cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            Добавить
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* KPI Card */}
        <div className="rounded-2xl bg-gradient-to-br from-rose-500 to-red-600 p-6 text-white shadow-lg shadow-rose-500/20 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-20">
            <Wallet className="h-24 w-24" />
          </div>
          <div>
            <p className="text-rose-100 font-medium text-sm">Всего расходов ({year})</p>
            <h3 className="text-4xl font-extrabold mt-2 tracking-tight">
              {totalExpenses.toLocaleString()} <span className="text-xl font-medium opacity-80">c.</span>
            </h3>
          </div>
          <div className="mt-6 flex items-center gap-2 text-sm font-medium text-rose-100 bg-black/10 w-max px-3 py-1.5 rounded-lg backdrop-blur-sm">
            <TrendingDown className="h-4 w-4" />
            <span>Вычтено из ДДС</span>
          </div>
        </div>

        {/* Chart */}
        <div className="md:col-span-2 rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
          <h3 className="text-base font-bold text-slate-900 mb-2 flex items-center gap-2">
            <PieChart className="h-5 w-5 text-slate-400" />
            Структура расходов
          </h3>
          <div className="h-64">
            {expensesData.categoriesChart.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={expensesData.categoriesChart}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="amount"
                  >
                    {expensesData.categoriesChart.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value) => `${value.toLocaleString()} с.`}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Legend verticalAlign="middle" align="right" layout="vertical" iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-400 text-sm">
                Нет данных для графика
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl bg-white shadow-sm border border-slate-200 overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <h3 className="text-base font-bold text-slate-900">Журнал расходов</h3>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input 
              type="text"
              placeholder="Поиск..."
              className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all w-64"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500 font-semibold">
              <tr>
                <th className="px-6 py-4">Дата</th>
                <th className="px-6 py-4">Категория</th>
                <th className="px-6 py-4">Описание</th>
                <th className="px-6 py-4">Сумма</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {expensesData.list.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-6 py-4 text-slate-600 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-slate-400" />
                      {dayjs(item.date).format('DD.MM.YYYY')}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium bg-slate-100 text-slate-700">
                      <Tag className="h-3.5 w-3.5 text-slate-500" />
                      {item.category}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-600 max-w-xs truncate" title={item.description}>
                    {item.description || '-'}
                  </td>
                  <td className="px-6 py-4 font-bold text-rose-600 whitespace-nowrap">
                    -{item.amount.toLocaleString()} с.
                  </td>
                </tr>
              ))}
              {expensesData.list.length === 0 && (
                <tr>
                  <td colSpan="4" className="px-6 py-12 text-center text-slate-500">
                    Нет записей о расходах за выбранный период
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Expense Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900">Добавить расход</h2>
              <button 
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 transition"
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Сумма (с.) *</label>
                <input 
                  type="number" 
                  required 
                  min="0"
                  step="0.01"
                  value={formData.amount}
                  onChange={e => setFormData({...formData, amount: e.target.value})}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none"
                  placeholder="0.00"
                />
              </div>
              
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Дата *</label>
                <input 
                  type="date" 
                  required 
                  value={formData.date}
                  onChange={e => setFormData({...formData, date: e.target.value})}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Категория *</label>
                <select 
                  required
                  value={formData.category}
                  onChange={e => setFormData({...formData, category: e.target.value})}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none"
                >
                  <option value="Офис">Офис</option>
                  <option value="Зарплата">Зарплата</option>
                  <option value="Маркетинг">Маркетинг</option>
                  <option value="Налоги">Налоги</option>
                  <option value="Хозяйственные">Хозяйственные</option>
                  <option value="Прочее">Прочее</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Описание</label>
                <textarea 
                  rows="2"
                  value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none resize-none"
                  placeholder="За что произведена оплата..."
                ></textarea>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3">
                <button 
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Отмена
                </button>
                <button 
                  type="submit"
                  disabled={addMutation.isPending}
                  className="px-6 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition shadow-sm disabled:opacity-50"
                >
                  {addMutation.isPending ? 'Сохранение...' : 'Сохранить'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
