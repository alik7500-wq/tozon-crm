import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { financeApi } from '../../api/finance.api';
import { 
  Wallet, TrendingUp, TrendingDown, Download, BarChart3
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

export const CashflowPage = () => {
  const [year, setYear] = useState(new Date().getFullYear());
  
  const { data: response, isLoading } = useQuery({
    queryKey: ['finance-cashflow', year],
    queryFn: () => financeApi.getCashflow({ year })
  });

  const cashflowData = response?.data || { monthlyData: [], summary: { totalIncome: 0, totalExpense: 0, netCashflow: 0 } };
  const { totalIncome, totalExpense, netCashflow } = cashflowData.summary;

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
            <Wallet className="h-6 w-6 text-blue-500" />
            Движение денежных средств (ДДС)
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Сводный отчет по денежным потокам
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
        <div className="rounded-2xl bg-white p-5 border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
            <TrendingUp className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Поступления</p>
            <h3 className="text-2xl font-bold text-slate-900">{totalIncome.toLocaleString()} <span className="text-sm text-slate-500 font-normal">с.</span></h3>
          </div>
        </div>

        <div className="rounded-2xl bg-white p-5 border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-600">
            <TrendingDown className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Выплаты</p>
            <h3 className="text-2xl font-bold text-slate-900">{totalExpense.toLocaleString()} <span className="text-sm text-slate-500 font-normal">с.</span></h3>
          </div>
        </div>

        <div className={`rounded-2xl p-5 shadow-sm flex items-center gap-4 ${netCashflow >= 0 ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white' : 'bg-gradient-to-r from-rose-500 to-red-600 text-white'}`}>
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
            <Wallet className="h-6 w-6 text-white" />
          </div>
          <div>
            <p className="text-sm font-medium text-white/80">Чистый денежный поток</p>
            <h3 className="text-2xl font-bold text-white">{netCashflow.toLocaleString()} <span className="text-sm text-white/80 font-normal">с.</span></h3>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
        <h3 className="text-base font-bold text-slate-900 mb-6 flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-slate-400" />
          Динамика ДДС по месяцам
        </h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={cashflowData.monthlyData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
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
                formatter={(value) => `${value.toLocaleString()} с.`}
              />
              <Legend verticalAlign="top" height={36} iconType="circle" />
              <Bar dataKey="income" name="Доходы" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={40} />
              <Bar dataKey="expense" name="Расходы" fill="#f43f5e" radius={[4, 4, 0, 0]} maxBarSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Summary Table */}
      <div className="rounded-2xl bg-white shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <h3 className="text-base font-bold text-slate-900">Сводка по месяцам</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500 font-semibold">
              <tr>
                <th className="px-6 py-4">Месяц</th>
                <th className="px-6 py-4 text-right">Поступления</th>
                <th className="px-6 py-4 text-right">Выплаты</th>
                <th className="px-6 py-4 text-right">Чистый поток</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {cashflowData.monthlyData.map((item, idx) => (
                <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-6 py-4 font-medium text-slate-900">{item.month}</td>
                  <td className="px-6 py-4 text-right font-medium text-emerald-600">
                    {item.income > 0 ? `+${item.income.toLocaleString()}` : '0'} с.
                  </td>
                  <td className="px-6 py-4 text-right font-medium text-rose-600">
                    {item.expense > 0 ? `-${item.expense.toLocaleString()}` : '0'} с.
                  </td>
                  <td className={`px-6 py-4 text-right font-bold ${item.net >= 0 ? 'text-slate-900' : 'text-rose-600'}`}>
                    {item.net > 0 ? `+${item.net.toLocaleString()}` : item.net.toLocaleString()} с.
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-slate-50 border-t border-slate-200">
              <tr>
                <td className="px-6 py-4 font-bold text-slate-900">Итого за год</td>
                <td className="px-6 py-4 text-right font-bold text-emerald-600">{totalIncome.toLocaleString()} с.</td>
                <td className="px-6 py-4 text-right font-bold text-rose-600">{totalExpense.toLocaleString()} с.</td>
                <td className={`px-6 py-4 text-right font-bold ${netCashflow >= 0 ? 'text-slate-900' : 'text-rose-600'}`}>
                  {netCashflow.toLocaleString()} с.
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};
