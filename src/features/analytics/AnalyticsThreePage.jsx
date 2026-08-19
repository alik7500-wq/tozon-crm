import React, { useState } from 'react';
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
  MessageSquare
} from 'lucide-react';

export const AnalyticsThreePage = () => {
  const [selectedProject, setSelectedProject] = useState('TOZON PLAZA');

  const leadStages = [
    { label: 'В очереди', count: 0, color: 'bg-slate-300' },
    { label: 'Консультация', count: 0, color: 'bg-blue-400' },
    { label: 'Презентация в офисе', count: 0, color: 'bg-indigo-400' },
    { label: 'Принимают решение', count: 5, color: 'bg-amber-500' },
    { label: 'Повторный звонок', count: 0, color: 'bg-purple-400' },
    { label: 'Отказ', count: 0, color: 'bg-rose-500' },
    { label: 'Успешно (Сделка)', count: 1, color: 'bg-emerald-600' },
  ];

  const leadSources = [
    { name: 'Instagram / Соцсети', pct: 45, color: '#3b82f6' },
    { name: 'Telegram', pct: 25, color: '#06b6d4' },
    { name: 'Facebook', pct: 15, color: '#6366f1' },
    { name: 'Рекомендация / Знакомые', pct: 10, color: '#10b981' },
    { name: 'Прямой визит в офис', pct: 5, color: '#f59e0b' },
  ];

  const monthlyLeads = [
    { month: 'Январь', count: 1 },
    { month: 'Февраль', count: 3 },
    { month: 'Март', count: 2 },
    { month: 'Апрель', count: 0 },
    { month: 'Май', count: 0 },
    { month: 'Июнь', count: 0 },
    { month: 'Июль', count: 1 },
    { month: 'Август', count: 0 },
    { month: 'Сентябрь', count: 0 },
    { month: 'Октябрь', count: 0 },
    { month: 'Ноябрь', count: 0 },
    { month: 'Декабрь', count: 0 },
  ];

  const maxLeads = Math.max(...monthlyLeads.map((m) => m.count), 4);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Header */}
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

      <AnalyticsTabs />

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {/* Card 1 */}
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-2xs space-y-1">
          <div className="text-slate-500 text-xs font-bold">Общее кол-во лидов</div>
          <div className="text-3xl font-black text-slate-900">6</div>
          <div className="text-[11px] text-slate-400 font-medium pt-1">Все обращения</div>
        </div>

        {/* Card 2 */}
        <div className="rounded-3xl border border-blue-200 bg-white p-5 shadow-2xs space-y-1">
          <div className="text-slate-500 text-xs font-bold">Активные лиды</div>
          <div className="text-3xl font-black text-blue-700">5</div>
          <div className="text-[11px] text-blue-600 font-medium pt-1">В работе у менеджеров</div>
        </div>

        {/* Card 3 */}
        <div className="rounded-3xl border border-emerald-200 bg-white p-5 shadow-2xs space-y-1">
          <div className="text-slate-500 text-xs font-bold">Успешные сделки</div>
          <div className="text-3xl font-black text-emerald-700">1</div>
          <div className="text-[11px] text-emerald-600 font-medium pt-1">Оформлен договор</div>
        </div>

        {/* Card 4 */}
        <div className="rounded-3xl border border-rose-200 bg-white p-5 shadow-2xs space-y-1">
          <div className="text-slate-500 text-xs font-bold">Отказано</div>
          <div className="text-3xl font-black text-slate-500">0</div>
          <div className="text-[11px] text-slate-400 font-medium pt-1">Потерянные лиды</div>
        </div>

        {/* Card 5 */}
        <div className="rounded-3xl border border-indigo-200 bg-white p-5 shadow-2xs space-y-1 col-span-2 sm:col-span-1">
          <div className="text-slate-500 text-xs font-bold">Конверсия</div>
          <div className="text-3xl font-black text-indigo-700">16.67 %</div>
          <div className="text-[11px] text-indigo-600 font-bold pt-1">Лид ➔ Покупатель</div>
        </div>
      </div>

      {/* Funnel & Source Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Stages Breakdown */}
        <div className="lg:col-span-6 rounded-3xl bg-white border border-slate-200 p-6 shadow-2xs space-y-5">
          <h3 className="text-base font-extrabold text-slate-900">Воронка лидов по этапам</h3>

          <div className="space-y-3 pt-2">
            {leadStages.map((stage) => (
              <div key={stage.label} className="space-y-1">
                <div className="flex justify-between text-xs font-bold text-slate-700">
                  <span>{stage.label}</span>
                  <span className="font-extrabold text-slate-900">{stage.count}</span>
                </div>
                <div className="h-7 w-full bg-slate-100 rounded-xl overflow-hidden flex items-center p-1">
                  <div
                    style={{ width: `${stage.count > 0 ? (stage.count / 6) * 100 : 3}%` }}
                    className={`h-full rounded-lg ${stage.color} transition-all duration-500 flex items-center justify-end pr-2 text-white text-xs font-black shadow-xs`}
                  >
                    {stage.count > 0 && stage.count}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Sources Pie Chart */}
        <div className="lg:col-span-6 rounded-3xl bg-white border border-slate-200 p-6 shadow-2xs space-y-4">
          <h3 className="text-base font-extrabold text-slate-900">Источники лидов</h3>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pt-2">
            {/* SVG Pie */}
            <div className="relative w-48 h-48 shrink-0">
              <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                <circle cx="50" cy="50" r="35" fill="none" stroke="#3b82f6" strokeWidth="30" strokeDasharray="98.9 219.9" strokeDashoffset="0" />
                <circle cx="50" cy="50" r="35" fill="none" stroke="#06b6d4" strokeWidth="30" strokeDasharray="55 219.9" strokeDashoffset="-98.9" />
                <circle cx="50" cy="50" r="35" fill="none" stroke="#6366f1" strokeWidth="30" strokeDasharray="33 219.9" strokeDashoffset="-153.9" />
                <circle cx="50" cy="50" r="35" fill="none" stroke="#10b981" strokeWidth="30" strokeDasharray="22 219.9" strokeDashoffset="-186.9" />
                <circle cx="50" cy="50" r="35" fill="none" stroke="#f59e0b" strokeWidth="30" strokeDasharray="11 219.9" strokeDashoffset="-208.9" />
              </svg>
            </div>

            {/* Legends */}
            <div className="flex-1 space-y-2 text-xs">
              {leadSources.map((s) => (
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

      {/* Leads Generation Chart */}
      <div className="rounded-3xl bg-white border border-slate-200 p-6 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-extrabold text-slate-900">График лидов (Количество по месяцам)</h3>
          <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-xl">2026 год</span>
        </div>

        <div className="h-64 flex items-end justify-between gap-2 pt-8 pb-2">
          {monthlyLeads.map((m) => {
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
    </div>
  );
};
