import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { AnalyticsTabs } from '../../components/AnalyticsTabs';
import {
  Users,
  Target,
  CheckCircle2,
  XCircle,
  TrendingUp,
  PieChart as PieIcon,
  BarChart3,
  Sparkles,
  PhoneCall,
  MessageSquare,
  Loader2,
  RefreshCw
} from 'lucide-react';

export const AnalyticsThreePage = () => {
  const [selectedProjectId, setSelectedProjectId] = useState('ALL');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [projects, setProjects] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const [stats, setStats] = useState({
    totalLeads: 0,
    activeLeads: 0,
    wonLeads: 0,
    lostLeads: 0,
    conversionRate: 0,
    leadStages: [],
    leadSources: [],
    monthlyLeads: []
  });

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

  // Fetch Analytics 3.0 real DB data
  const fetchAnalytics = async () => {
    try {
      setIsLoading(true);
      const params = { year: selectedYear };
      if (selectedProjectId && selectedProjectId !== 'ALL') {
        params.projectId = selectedProjectId;
      }

      const queryStr = new URLSearchParams(params).toString();
      const res = await api.get(`/reports/analytics-3?${queryStr}`);
      const data = res.data || res;
      if (data) {
        setStats(data);
      }
    } catch (err) {
      console.error('Error fetching analytics 3.0:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [selectedProjectId, selectedYear]);

  // Calculations for Charts
  const maxLeads = Math.max(...(stats.monthlyLeads || []).map((m) => m.count), 4);
  const maxStageCount = Math.max(...(stats.leadStages || []).map((s) => s.count), 1);

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
            <Target className="h-7 w-7 text-blue-600" />
            <span>Аналитика 3.0 — Маркетинг и конверсия лидов</span>
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500">
            Эффективность рекламных каналов, конверсия лидов на этапах и динамика обращений клиентов
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-3">
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
          <p className="text-sm font-semibold text-slate-600">Загрузка маркетинговой аналитики...</p>
        </div>
      ) : (
        <>
          {/* KPI Cards Row */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {/* Card 1 */}
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-2xs space-y-1">
              <div className="text-slate-500 text-xs font-bold">Общее кол-во лидов</div>
              <div className="text-3xl font-black text-slate-900">{stats.totalLeads}</div>
              <div className="text-[11px] text-slate-400 font-medium pt-1">Все обращения</div>
            </div>

            {/* Card 2 */}
            <div className="rounded-3xl border border-blue-200 bg-white p-5 shadow-2xs space-y-1">
              <div className="text-slate-500 text-xs font-bold">Активные лиды</div>
              <div className="text-3xl font-black text-blue-700">{stats.activeLeads}</div>
              <div className="text-[11px] text-blue-600 font-medium pt-1">В работе у менеджеров</div>
            </div>

            {/* Card 3 */}
            <div className="rounded-3xl border border-emerald-200 bg-white p-5 shadow-2xs space-y-1">
              <div className="text-slate-500 text-xs font-bold">Успешные сделки</div>
              <div className="text-3xl font-black text-emerald-700">{stats.wonLeads}</div>
              <div className="text-[11px] text-emerald-600 font-medium pt-1">Оформлен договор</div>
            </div>

            {/* Card 4 */}
            <div className="rounded-3xl border border-rose-200 bg-white p-5 shadow-2xs space-y-1">
              <div className="text-slate-500 text-xs font-bold">Отказано</div>
              <div className="text-3xl font-black text-slate-500">{stats.lostLeads}</div>
              <div className="text-[11px] text-slate-400 font-medium pt-1">Потерянные лиды</div>
            </div>

            {/* Card 5 */}
            <div className="rounded-3xl border border-indigo-200 bg-white p-5 shadow-2xs space-y-1 col-span-2 sm:col-span-1">
              <div className="text-slate-500 text-xs font-bold">Конверсия</div>
              <div className="text-3xl font-black text-indigo-700">{stats.conversionRate} %</div>
              <div className="text-[11px] text-indigo-600 font-bold pt-1">Лид ➔ Договор</div>
            </div>
          </div>

          {/* Funnel & Source Row */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Stages Breakdown */}
            <div className="lg:col-span-6 rounded-3xl bg-white border border-slate-200 p-6 shadow-2xs space-y-5">
              <h3 className="text-base font-extrabold text-slate-900">Воронка лидов по этапам</h3>

              <div className="space-y-3 pt-2">
                {(stats.leadStages || []).map((stage) => {
                  const widthPct = stage.count > 0 ? Math.max(12, (stage.count / maxStageCount) * 100) : 3;
                  return (
                    <div key={stage.label} className="space-y-1">
                      <div className="flex justify-between text-xs font-bold text-slate-700">
                        <span>{stage.label}</span>
                        <span className="font-extrabold text-slate-900">{stage.count}</span>
                      </div>
                      <div className="h-7 w-full bg-slate-100 rounded-xl overflow-hidden flex items-center p-1">
                        <div
                          style={{ width: `${widthPct}%` }}
                          className={`h-full rounded-lg ${stage.color} transition-all duration-500 flex items-center justify-end pr-2 text-white text-xs font-black shadow-xs`}
                        >
                          {stage.count > 0 ? stage.count : ''}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Sources Pie Chart */}
            <div className="lg:col-span-6 rounded-3xl bg-white border border-slate-200 p-6 shadow-2xs space-y-4">
              <h3 className="text-base font-extrabold text-slate-900">Источники лидов</h3>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pt-2">
                {/* SVG Pie */}
                <div className="relative w-48 h-48 shrink-0 flex items-center justify-center">
                  {stats.leadSources && stats.leadSources.length > 0 ? (
                    <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                      <circle cx="50" cy="50" r={pieRadius} fill="none" stroke="#f1f5f9" strokeWidth="30" />
                      {stats.leadSources.map((s) => {
                        if (!s.count || s.pct <= 0) return null;
                        const segmentLength = (s.pct / 100) * pieCircumference;
                        const offset = pieAccumulatedDash;
                        pieAccumulatedDash += segmentLength;

                        return (
                          <circle
                            key={s.key}
                            cx="50"
                            cy="50"
                            r={pieRadius}
                            fill="none"
                            stroke={s.color}
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
                  {(stats.leadSources || []).map((s) => (
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
                  {(!stats.leadSources || stats.leadSources.length === 0) && (
                    <div className="text-slate-400 text-xs">Нет данных об источниках</div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Leads Generation Chart */}
          <div className="rounded-3xl bg-white border border-slate-200 p-6 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold text-slate-900">График лидов (Количество по месяцам)</h3>
              <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-xl">{selectedYear} год</span>
            </div>

            <div className="h-64 flex items-end justify-between gap-2 pt-8 pb-2">
              {(stats.monthlyLeads || []).map((m) => {
                const heightPct = m.count > 0 ? Math.max(15, (m.count / maxLeads) * 100) : 0;
                return (
                  <div key={m.month} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                    <div className="text-[10px] font-bold text-blue-700 opacity-0 group-hover:opacity-100 transition">
                      {m.count > 0 ? `${m.count} лид` : '0'}
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
        </>
      )}
    </div>
  );
};
