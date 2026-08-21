import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
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
  ArrowUpRight,
  Loader2,
  RefreshCw
} from 'lucide-react';

export const AnalyticsTwoPage = () => {
  const [selectedProjectId, setSelectedProjectId] = useState('ALL');
  const [currency, setCurrency] = useState('USD'); // 'USD' or 'TJS'
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [projects, setProjects] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const [stats, setStats] = useState({
    totalSignedRevenue: 0,
    signedDealsCount: 0,
    totalCollected: 0,
    collectedPercent: 0,
    outstandingDebt: 0,
    avgPriceM2: 0,
    funnelSteps: [],
    sources: [],
    monthlySales: [],
    monthlyRepayments: []
  });

  const rate = currency === 'USD' ? 1 : 10.9;
  const currSign = currency === 'USD' ? '$' : 'TJS';

  // Fetch Projects for filter
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const res = await api.get('/projects');
        const projList = res.data?.projects || res.projects || [];
        setProjects(projList);
      } catch (err) {
        console.error('Error fetching projects:', err);
      }
    };
    fetchProjects();
  }, []);

  // Fetch Analytics 2.0 real DB data
  const fetchAnalytics = async () => {
    try {
      setIsLoading(true);
      const params = { year: selectedYear };
      if (selectedProjectId && selectedProjectId !== 'ALL') {
        params.projectId = selectedProjectId;
      }

      const queryStr = new URLSearchParams(params).toString();
      const res = await api.get(`/reports/analytics-2?${queryStr}`);
      const data = res.data || res;
      if (data) {
        setStats(data);
      }
    } catch (err) {
      console.error('Error fetching analytics 2.0:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [selectedProjectId, selectedYear]);

  // Calculations for Charts
  const maxSale = Math.max(...(stats.monthlySales || []).map((m) => m.amount), 1000);
  const maxRepayment = Math.max(
    ...(stats.monthlyRepayments || []).map((m) => Math.max(m.plannedAmount || 0, m.actualAmount || 0, m.amount || 0)),
    1000
  );
  const maxFunnelCount = Math.max(...(stats.funnelSteps || []).map((s) => s.count), 1);

  // SVG Pie calculations for Sources
  const pieRadius = 35;
  const pieCircumference = 2 * Math.PI * pieRadius; // ~219.91
  let pieAccumulatedDash = 0;

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

        <div className="flex items-center flex-wrap gap-3">
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

          {/* Project Filter */}
          <div className="flex items-center gap-2 rounded-2xl bg-white border border-slate-200 p-1.5 shadow-2xs">
            <span className="text-xs font-bold text-slate-500 pl-2">ЖК:</span>
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="rounded-xl bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-900 outline-none cursor-pointer border border-slate-200"
            >
              <option value="ALL">Все объекты</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          {/* Year Filter */}
          <div className="flex items-center gap-2 rounded-2xl bg-white border border-slate-200 p-1.5 shadow-2xs">
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="rounded-xl bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-900 outline-none cursor-pointer border border-slate-200"
            >
              <option value={2026}>2026 год</option>
              <option value={2025}>2025 год</option>
              <option value={2024}>2024 год</option>
            </select>
          </div>

          <button
            onClick={fetchAnalytics}
            title="Обновить"
            className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-blue-600 hover:border-blue-200 transition cursor-pointer shadow-2xs"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <AnalyticsTabs />

      {isLoading ? (
        <div className="flex flex-col items-center justify-center p-16 bg-white rounded-3xl border border-slate-200">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-3" />
          <p className="text-sm font-semibold text-slate-600">Загрузка финансовых данных из базы данных...</p>
        </div>
      ) : (
        <>
          {/* KPI Cards Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1 */}
            <div className="rounded-3xl border border-blue-200 bg-white p-5 shadow-2xs space-y-1">
              <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
                <span>Общая сумма сделок</span>
                <Wallet className="h-4 w-4 text-blue-600" />
              </div>
              <div className="text-2xl font-black text-slate-900">
                {(stats.totalSignedRevenue * rate).toLocaleString('ru-RU', { maximumFractionDigits: 2 })} {currSign}
              </div>
              <div className="text-[11px] text-emerald-600 font-bold flex items-center gap-1 pt-1">
                <ArrowUpRight className="h-3.5 w-3.5" />
                <span>{stats.signedDealsCount} оформленных договоров</span>
              </div>
            </div>

            {/* Card 2 */}
            <div className="rounded-3xl border border-emerald-200 bg-white p-5 shadow-2xs space-y-1">
              <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
                <span>Всего принято денег</span>
                <DollarSign className="h-4 w-4 text-emerald-600" />
              </div>
              <div className="text-2xl font-black text-emerald-700">
                {(stats.totalCollected * rate).toLocaleString('ru-RU', { maximumFractionDigits: 2 })} {currSign}
              </div>
              <div className="text-[11px] text-slate-500 font-medium pt-1">
                {stats.collectedPercent}% от общего объема сделок
              </div>
            </div>

            {/* Card 3 */}
            <div className="rounded-3xl border border-rose-200 bg-white p-5 shadow-2xs space-y-1">
              <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
                <span>Остаток (Дебиторка)</span>
                <CreditCard className="h-4 w-4 text-rose-600" />
              </div>
              <div className="text-2xl font-black text-rose-700">
                {(stats.outstandingDebt * rate).toLocaleString('ru-RU', { maximumFractionDigits: 2 })} {currSign}
              </div>
              <div className="text-[11px] text-slate-500 font-medium pt-1">
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
                {(stats.avgPriceM2 * rate).toLocaleString('ru-RU', { maximumFractionDigits: 2 })} {currSign}/м²
              </div>
              <div className="text-[11px] text-slate-500 font-medium pt-1">
                По фактически проданным площадям
              </div>
            </div>
          </div>

          {/* Funnel & Deal Sources Row */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Visual Funnel */}
            <div className="lg:col-span-6 rounded-3xl bg-white border border-slate-200 p-6 shadow-2xs space-y-5">
              <h3 className="text-base font-extrabold text-slate-900">Воронка продаж</h3>

              <div className="space-y-3 pt-2">
                {(stats.funnelSteps || []).map((step) => {
                  const widthPct = step.count > 0 ? Math.max(12, (step.count / maxFunnelCount) * 100) : 4;
                  return (
                    <div key={step.label} className="space-y-1">
                      <div className="flex justify-between text-xs font-bold text-slate-700">
                        <span>{step.label}</span>
                        <span className="font-extrabold text-slate-900">{step.count}</span>
                      </div>
                      <div className="h-8 w-full bg-slate-100 rounded-xl overflow-hidden flex items-center p-1">
                        <div
                          style={{ width: `${widthPct}%` }}
                          className={`h-full rounded-lg ${step.color} transition-all duration-500 flex items-center justify-end pr-2.5 text-white text-xs font-black shadow-xs`}
                        >
                          {step.count > 0 ? step.count : ''}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Source of Deals (Pie Chart) */}
            <div className="lg:col-span-6 rounded-3xl bg-white border border-slate-200 p-6 shadow-2xs space-y-4">
              <h3 className="text-base font-extrabold text-slate-900">Источник сделок и лидов</h3>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pt-2">
                {/* SVG Pie Chart */}
                <div className="relative w-48 h-48 shrink-0 flex items-center justify-center">
                  {stats.sources && stats.sources.length > 0 ? (
                    <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                      <circle cx="50" cy="50" r={pieRadius} fill="none" stroke="#f1f5f9" strokeWidth="30" />
                      {stats.sources.map((src) => {
                        if (!src.count || src.pct <= 0) return null;
                        const segmentLength = (src.pct / 100) * pieCircumference;
                        const offset = pieAccumulatedDash;
                        pieAccumulatedDash += segmentLength;

                        return (
                          <circle
                            key={src.key}
                            cx="50"
                            cy="50"
                            r={pieRadius}
                            fill="none"
                            stroke={src.color}
                            strokeWidth="30"
                            strokeDasharray={`${segmentLength} ${pieCircumference}`}
                            strokeDashoffset={-offset}
                            className="transition-all duration-700"
                          />
                        );
                      })}
                    </svg>
                  ) : (
                    <div className="text-xs text-slate-400">Нет данных</div>
                  )}
                </div>

                {/* Legends */}
                <div className="flex-1 space-y-2 text-xs w-full">
                  {(stats.sources || []).map((s) => (
                    <div key={s.key} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                        <span className="text-slate-700 font-medium">{s.name}</span>
                      </div>
                      <div className="flex items-center gap-2 font-bold">
                        <span className="text-slate-500 font-semibold">{s.count} шт.</span>
                        <span className="text-slate-900">{s.pct}%</span>
                      </div>
                    </div>
                  ))}
                  {(!stats.sources || stats.sources.length === 0) && (
                    <div className="text-slate-400 text-xs">Нет источников</div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Chart: Monthly Sales Volume */}
          <div className="rounded-3xl bg-white border border-slate-200 p-6 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold text-slate-900">График продаж (Сумма по месяцам)</h3>
              <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-xl">{selectedYear} год</span>
            </div>

            <div className="h-64 flex items-end justify-between gap-2 pt-8 pb-2">
              {(stats.monthlySales || []).map((m) => {
                const heightPct = m.amount > 0 ? Math.max(10, (m.amount / maxSale) * 100) : 0;
                return (
                  <div key={m.month} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                    <div className="text-[10px] font-bold text-slate-700 opacity-0 group-hover:opacity-100 transition whitespace-nowrap">
                      {m.amount > 0 ? `${(m.amount * rate).toLocaleString('ru-RU')} ${currSign}` : '0'}
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
              <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-xl">График платежей ({selectedYear})</span>
            </div>

            <div className="h-64 flex items-end justify-between gap-2 pt-8 pb-2">
              {(stats.monthlyRepayments || []).map((m) => {
                const pAmount = m.plannedAmount || m.amount || 0;
                const heightPct = pAmount > 0 ? Math.max(8, (pAmount / maxRepayment) * 100) : (m.actualAmount > 0 ? 8 : 0);
                return (
                  <div key={m.month} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                    <div className="text-[10px] font-bold text-emerald-700 opacity-0 group-hover:opacity-100 transition whitespace-nowrap">
                      {pAmount > 0 ? `${(pAmount * rate).toLocaleString('ru-RU')} ${currSign}` : (m.actualAmount > 0 ? `Факт: ${(m.actualAmount * rate).toLocaleString('ru-RU')}` : '0')}
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
        </>
      )}
    </div>
  );
};
