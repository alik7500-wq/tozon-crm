import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { financeApi } from '../../api/finance.api';
import { 
  TrendingUp, Calendar, CreditCard, DollarSign, Filter, Search, Download
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import dayjs from 'dayjs';

export const IncomePage = () => {
  const [year, setYear] = useState(new Date().getFullYear());
  
  const { data: response, isLoading } = useQuery({
    queryKey: ['finance-income', year],
    queryFn: () => financeApi.getIncome({ year })
  });

  const incomeData = response?.data || { list: [], chartData: [] };
  const totalIncome = incomeData.list.reduce((sum, item) => sum + item.amount, 0);

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
            <TrendingUp className="h-6 w-6 text-emerald-500" />
            Доходы
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Поступления денежных средств от сделок и оплат клиентов
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
          <button className="flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-medium text-slate-700 border border-slate-200 hover:bg-slate-50 transition shadow-sm cursor-pointer">
            <Download className="h-4 w-4" />
            Экспорт
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* KPI Card */}
        <div className="rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 p-6 text-white shadow-lg shadow-emerald-500/20 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-20">
            <DollarSign className="h-24 w-24" />
          </div>
          <div>
            <p className="text-emerald-100 font-medium text-sm">Всего доходов ({year})</p>
            <h3 className="text-4xl font-extrabold mt-2 tracking-tight">
              {totalIncome.toLocaleString()} <span className="text-xl font-medium opacity-80">c.</span>
            </h3>
          </div>
          <div className="mt-6 flex items-center gap-2 text-sm font-medium text-emerald-100 bg-black/10 w-max px-3 py-1.5 rounded-lg backdrop-blur-sm">
            <TrendingUp className="h-4 w-4" />
            <span>Основано на фактических платежах</span>
          </div>
        </div>

        {/* Chart */}
        <div className="md:col-span-2 rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
          <h3 className="text-base font-bold text-slate-900 mb-6 flex items-center gap-2">
            <BarChart className="h-5 w-5 text-slate-400" />
            Динамика поступлений
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={incomeData.chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis 
                  dataKey="month" 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: '#64748b' }}
                  dy={10}
                />
                <YAxis 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: '#64748b' }}
                  tickFormatter={(val) => `${(val / 1000).toFixed(0)}k`}
                />
                <Tooltip 
                  cursor={{ fill: '#f1f5f9' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="amount" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl bg-white shadow-sm border border-slate-200 overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <h3 className="text-base font-bold text-slate-900">Последние поступления</h3>
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
                <th className="px-6 py-4">Клиент</th>
                <th className="px-6 py-4">Договор</th>
                <th className="px-6 py-4">Сумма</th>
                <th className="px-6 py-4">Метод</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {incomeData.list.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-6 py-4 text-slate-600 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-slate-400" />
                      {dayjs(item.date).format('DD.MM.YYYY')}
                    </div>
                  </td>
                  <td className="px-6 py-4 font-medium text-slate-900">{item.clientName}</td>
                  <td className="px-6 py-4 text-slate-600">{item.contract}</td>
                  <td className="px-6 py-4 font-bold text-emerald-600 whitespace-nowrap">
                    +{item.amount.toLocaleString()} с.
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium bg-slate-100 text-slate-700">
                      <CreditCard className="h-3.5 w-3.5 text-slate-500" />
                      {item.method === 'CASH' ? 'Наличные' : item.method === 'BANK_TRANSFER' ? 'Перевод' : item.method}
                    </span>
                  </td>
                </tr>
              ))}
              {incomeData.list.length === 0 && (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-slate-500">
                    Нет данных о поступлениях за выбранный период
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
