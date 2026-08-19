import React, { useState } from 'react';
import { AnalyticsTabs } from '../../components/AnalyticsTabs';
import {
  TrendingUp,
  DollarSign,
  Wallet,
  CreditCard,
  Building2,
  PieChart as PieIcon,
  BarChart3,
  Calendar,
  Layers,
  ChevronDown,
  ArrowUpRight
} from 'lucide-react';

export const AnalyticsTwoPage = () => {
  const [selectedProject, setSelectedProject] = useState('TOZON PLAZA');
  const [currency, setCurrency] = useState('USD'); // 'USD' or 'TJS'
  const [timeRange, setTimeRange] = useState('YEAR');

  const rate = currency === 'USD' ? 1 : 10.9;
  const currSign = currency === 'USD' ? '$' : 'TJS';

  // Sales Monthly Data
  const monthlySales = [
    { month: 'Январь', amount: 0 },
    { month: 'Февраль', amount: 316327.5 },
    { month: 'Март', amount: 155898.68 },
    { month: 'Апрель', amount: 68761.0 },
    { month: 'Май', amount: 66595.0 },
    { month: 'Июнь', amount: 0 },
    { month: 'Июль', amount: 81833.8 },
    { month: 'Август', amount: 0 },
    { month: 'Сентябрь', amount: 0 },
    { month: 'Октябрь', amount: 0 },
    { month: 'Ноябрь', amount: 0 },
    { month: 'Декабрь', amount: 0 },
  ];

  const maxSale = Math.max(...monthlySales.map((m) => m.amount), 350000);

  // Repayment Monthly Data
  const monthlyRepayments = [
    { month: 'Январь', amount: 0 },
    { month: 'Февраль', amount: 63737.0 },
    { month: 'Март', amount: 56057.6 },
    { month: 'Апрель', amount: 10749.58 },
    { month: 'Май', amount: 34038.37 },
    { month: 'Июнь', amount: 17684.04 },
    { month: 'Июль', amount: 17684.04 },
    { month: 'Август', amount: 23378.53 },
    { month: 'Сентябрь', amount: 18373.53 },
    { month: 'Октябрь', amount: 23378.53 },
    { month: 'Ноябрь', amount: 20709.87 },
    { month: 'Декабрь', amount: 20709.87 },
  ];

  const maxRepayment = Math.max(...monthlyRepayments.map((m) => m.amount), 70000);

  // Sources Data
  const sources = [
    { name: 'Жители', pct: 28, color: '#3b82f6' },
    { name: 'Случайный покупатель', pct: 22, color: '#06b6d4' },
    { name: 'Шиноси Асрорхон', pct: 15, color: '#6366f1' },
    { name: 'Шиноси Илхомчон', pct: 14, color: '#10b981' },
    { name: 'Шиноси Рохбар', pct: 10, color: '#14b8a6' },
    { name: 'Шиноси Мубинчон', pct: 6, color: '#f59e0b' },
    { name: 'Шиноси Олимчон', pct: 5, color: '#8b5cf6' },
  ];

  // Funnel Steps
  const funnelSteps = [
    { label: 'Рассрочка', count: 20, color: 'bg-emerald-600' },
    { label: 'Договора', count: 20, color: 'bg-blue-600' },
    { label: 'Лиды', count: 6, color: 'bg-amber-500' },
    { label: 'Бронь', count: 4, color: 'bg-teal-500' },
    { label: 'Полная оплата', count: 0, color: 'bg-slate-400' },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Header & Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <TrendingUp className="h-7 w-7 text-blue-600" />
            <span>Аналитика 2.0 — Аналитика продаж и финансов</span>
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500">
            Финансовые потоки, воронка конверсии, каналы привлечения сделок и динамика поступления оплат
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Currency Toggle */}
          <div className="flex items-center rounded-xl bg-slate-200/80 p-1 border border-slate-300">
            <button
              onClick={() => setCurrency('USD')}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                currency === 'USD'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              USD ($)
            </button>
            <button
              onClick={() => setCurrency('TJS')}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                currency === 'TJS'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              TJS (Сомони)
            </button>
          </div>

          <div className="flex items-center gap-2 rounded-2xl bg-white border border-slate-200 p-1.5 shadow-2xs">
            <span className="text-xs font-bold text-slate-500 pl-2">ЖК:</span>
            <select
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              className="rounded-xl bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-900 outline-none cursor-pointer border border-slate-200"
            >
              <option value="TOZON PLAZA">TOZON PLAZA</option>
              <option value="SOMON RESIDENCE">SOMON RESIDENCE</option>
            </select>
          </div>
        </div>
      </div>

      <AnalyticsTabs />

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1 */}
        <div className="rounded-3xl border border-blue-200 bg-white p-5 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
            <span>Общая сумма сделок</span>
            <Wallet className="h-4 w-4 text-blue-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">
            {(689415.98 * rate).toLocaleString('ru-RU', { maximumFractionDigits: 2 })} {currSign}
          </div>
          <div className="text-[11px] text-emerald-600 font-bold flex items-center gap-1 pt-1">
            <ArrowUpRight className="h-3.5 w-3.5" />
            <span>20 оформленных договоров</span>
          </div>
        </div>

        {/* Card 2 */}
        <div className="rounded-3xl border border-emerald-200 bg-white p-5 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
            <span>Всего принято денег</span>
            <DollarSign className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-700">
            {(205125.15 * rate).toLocaleString('ru-RU', { maximumFractionDigits: 2 })} {currSign}
          </div>
          <div className="text-[11px] text-slate-400 font-medium pt-1">
            29.7% от общего объема
          </div>
        </div>

        {/* Card 3 */}
        <div className="rounded-3xl border border-rose-200 bg-white p-5 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
            <span>Остаток денег (Дебиторка)</span>
            <CreditCard className="h-4 w-4 text-rose-600" />
          </div>
          <div className="text-2xl font-black text-rose-700">
            {(484290.83 * rate).toLocaleString('ru-RU', { maximumFractionDigits: 2 })} {currSign}
          </div>
          <div className="text-[11px] text-slate-400 font-medium pt-1">
            По графику будущих платежей
          </div>
        </div>

        {/* Card 4 */}
        <div className="rounded-3xl border border-purple-200 bg-white p-5 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
            <span>Средняя цена за квадрат</span>
            <Building2 className="h-4 w-4 text-purple-600" />
          </div>
          <div className="text-2xl font-black text-purple-700">
            {(513.23 * rate).toLocaleString('ru-RU', { maximumFractionDigits: 2 })} {currSign}/м²
          </div>
          <div className="text-[11px] text-slate-400 font-medium pt-1">
            В продажах по ЖК {selectedProject}
          </div>
        </div>
      </div>

      {/* Funnel & Deal Sources Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Visual Funnel */}
        <div className="lg:col-span-6 rounded-3xl bg-white border border-slate-200 p-6 shadow-2xs space-y-5">
          <h3 className="text-base font-extrabold text-slate-900">Воронка продаж</h3>

          <div className="space-y-3 pt-2">
            {funnelSteps.map((step, i) => {
              const widthPct = Math.max(15, (step.count / 20) * 100);
              return (
                <div key={step.label} className="space-y-1">
                  <div className="flex justify-between text-xs font-bold text-slate-700">
                    <span>{step.label}</span>
                    <span className="font-extrabold text-slate-900">{step.count}</span>
                  </div>
                  <div className="h-8 w-full bg-slate-100 rounded-xl overflow-hidden flex items-center p-1">
                    <div
                      style={{ width: `${step.count > 0 ? widthPct : 4}%` }}
                      className={`h-full rounded-lg ${step.color} transition-all duration-500 flex items-center justify-end pr-2.5 text-white text-xs font-black shadow-xs`}
                    >
                      {step.count > 0 && step.count}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Source of Deals (Pie Chart) */}
        <div className="lg:col-span-6 rounded-3xl bg-white border border-slate-200 p-6 shadow-2xs space-y-4">
          <h3 className="text-base font-extrabold text-slate-900">Источник сделок</h3>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pt-2">
            {/* SVG Pie Chart */}
            <div className="relative w-48 h-48 shrink-0">
              <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                <circle cx="50" cy="50" r="35" fill="none" stroke="#3b82f6" strokeWidth="30" strokeDasharray="61.5 219.9" strokeDashoffset="0" />
                <circle cx="50" cy="50" r="35" fill="none" stroke="#06b6d4" strokeWidth="30" strokeDasharray="48.3 219.9" strokeDashoffset="-61.5" />
                <circle cx="50" cy="50" r="35" fill="none" stroke="#6366f1" strokeWidth="30" strokeDasharray="33 219.9" strokeDashoffset="-109.8" />
                <circle cx="50" cy="50" r="35" fill="none" stroke="#10b981" strokeWidth="30" strokeDasharray="30.7 219.9" strokeDashoffset="-142.8" />
                <circle cx="50" cy="50" r="35" fill="none" stroke="#14b8a6" strokeWidth="30" strokeDasharray="22 219.9" strokeDashoffset="-173.5" />
                <circle cx="50" cy="50" r="35" fill="none" stroke="#f59e0b" strokeWidth="30" strokeDasharray="13.2 219.9" strokeDashoffset="-195.5" />
                <circle cx="50" cy="50" r="35" fill="none" stroke="#8b5cf6" strokeWidth="30" strokeDasharray="11 219.9" strokeDashoffset="-208.7" />
              </svg>
            </div>

            {/* Legends */}
            <div className="flex-1 space-y-2 text-xs">
              {sources.map((s) => (
                <div key={s.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                    <span className="text-slate-700 font-medium">{s.name}</span>
                  </div>
                  <span className="font-bold text-slate-900">{s.pct}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Chart: Monthly Sales Volume */}
      <div className="rounded-3xl bg-white border border-slate-200 p-6 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-extrabold text-slate-900">График продаж (Сумма по месяцам)</h3>
          <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-xl">2026 год</span>
        </div>

        <div className="h-64 flex items-end justify-between gap-2 pt-8 pb-2">
          {monthlySales.map((m) => {
            const heightPct = m.amount > 0 ? Math.max(10, (m.amount / maxSale) * 100) : 0;
            return (
              <div key={m.month} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                <div className="text-[10px] font-bold text-slate-700 opacity-0 group-hover:opacity-100 transition whitespace-nowrap">
                  {m.amount > 0 ? `${(m.amount * rate / 1000).toFixed(0)}k ${currSign}` : '0'}
                </div>
                <div className="w-full max-w-[48px] bg-slate-100 rounded-xl overflow-hidden flex items-end h-full">
                  <div
                    style={{ height: `${heightPct}%` }}
                    className="w-full bg-blue-600 hover:bg-blue-700 transition-all rounded-t-xl"
                  />
                </div>
                <span className="text-[11px] font-bold text-slate-500 truncate w-full text-center">
                  {m.month.slice(0, 3)}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Chart: Monthly Repayments */}
      <div className="rounded-3xl bg-white border border-slate-200 p-6 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-extrabold text-slate-900">Ежемесячное погашение (План оплат по рассрочке)</h3>
          <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-xl">График платежей</span>
        </div>

        <div className="h-64 flex items-end justify-between gap-2 pt-8 pb-2">
          {monthlyRepayments.map((m) => {
            const heightPct = m.amount > 0 ? Math.max(8, (m.amount / maxRepayment) * 100) : 0;
            return (
              <div key={m.month} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                <div className="text-[10px] font-bold text-emerald-700 opacity-0 group-hover:opacity-100 transition whitespace-nowrap">
                  {m.amount > 0 ? `${(m.amount * rate / 1000).toFixed(1)}k` : '0'}
                </div>
                <div className="w-full max-w-[48px] bg-slate-100 rounded-xl overflow-hidden flex items-end h-full">
                  <div
                    style={{ height: `${heightPct}%` }}
                    className="w-full bg-emerald-500 hover:bg-emerald-600 transition-all rounded-t-xl"
                  />
                </div>
                <span className="text-[11px] font-bold text-slate-500 truncate w-full text-center">
                  {m.month.slice(0, 3)}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
