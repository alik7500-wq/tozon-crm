import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { AnalyticsTabs } from '../../components/AnalyticsTabs';
import {
  BarChart3,
  Building2,
  PieChart,
  Layers,
  TrendingUp,
  Filter,
  CheckCircle2,
  Clock,
  Home,
  DollarSign
} from 'lucide-react';

export const AnalyticsOnePage = () => {
  const [selectedProject, setSelectedProject] = useState('TOZON PLAZA');
  const [selectedType, setSelectedType] = useState('ALL');
  const [projects, setProjects] = useState([]);
  const [stats, setStats] = useState({
    totalUnits: 141,
    totalArea: 9441.71,
    totalSum: 893323.18,
    avgPriceM2: 417.23,
    statusBreakdown: [
      { key: 'SOLD', label: 'Продано', count: 20, area: 1343.28, sum: 689415.98, priceM2: 513.23, percent: 14.18, color: '#ef4444' },
      { key: 'EXCHANGE', label: 'Житель — Обмен', count: 5, area: 366.39, sum: 35610.00, priceM2: 97.19, percent: 3.55, color: '#94a3b8' },
      { key: 'EXCHANGE_PLUS', label: 'Житель — Обмен + Доплата', count: 2, area: 140.78, sum: 15996.00, priceM2: 113.62, percent: 1.42, color: '#cbd5e1' },
      { key: 'RESERVED', label: 'Бронь', count: 4, area: 290.65, sum: 152301.20, priceM2: 524.00, percent: 2.84, color: '#eab308' },
      { key: 'AVAILABLE', label: 'Свободно', count: 110, area: 7300.61, sum: 0, priceM2: 0, percent: 78.01, color: '#10b981' },
    ],
    blocks: [
      { name: 'Блок А', sold: 7, reserved: 2, available: 51, resident: 2, total: 62, soldPct: 11.3, resPct: 3.2, freePct: 82.3, resvdPct: 3.2 },
      { name: 'Блок Б', sold: 13, reserved: 2, available: 59, resident: 6, total: 80, soldPct: 16.3, resPct: 7.5, freePct: 73.8, resvdPct: 2.5 },
    ],
    floors: [
      { floor: 2, resident: 1, available: 13, sold: 1, reserved: 1, total: 16, soldPct: 6.25, freePct: 81.25, resPct: 6.25, resvdPct: 6.25 },
      { floor: 3, resident: 5, available: 11, sold: 0, reserved: 0, total: 16, soldPct: 0, freePct: 68.75, resPct: 31.25, resvdPct: 0 },
      { floor: 4, resident: 2, available: 12, sold: 2, reserved: 0, total: 16, soldPct: 12.5, freePct: 75.0, resPct: 12.5, resvdPct: 0 },
      { floor: 5, resident: 0, available: 10, sold: 5, reserved: 1, total: 16, soldPct: 31.25, freePct: 62.5, resPct: 0, resvdPct: 6.25 },
      { floor: 6, resident: 1, available: 8, sold: 6, reserved: 1, total: 16, soldPct: 37.5, freePct: 50.0, resPct: 6.25, resvdPct: 6.25 },
    ]
  });

  useEffect(() => {
    const fetchRealData = async () => {
      try {
        const res = await api.get('/projects');
        const projList = res.data?.projects || res.projects || [];
        setProjects(projList);
        if (projList.length > 0) {
          setSelectedProject(projList[0].name);
        }
      } catch (err) {
        console.error('Error fetching project stats:', err);
      }
    };
    fetchRealData();
  }, []);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Top Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <PieChart className="h-7 w-7 text-blue-600" />
            <span>Аналитика 1.0 — Статистика по объектам ЖК</span>
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500">
            Распределение номерного фонда, статус помещений, площади, стоимость за м² и прогресс по блокам и этажам
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-2xl bg-white border border-slate-200 p-1.5 shadow-2xs">
            <span className="text-xs font-bold text-slate-500 pl-2">ЖК:</span>
            <select
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              className="rounded-xl bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-900 outline-none cursor-pointer border border-slate-200"
            >
              {projects.length > 0 ? (
                projects.map((p) => <option key={p.id} value={p.name}>{p.name}</option>)
              ) : (
                <option value="TOZON PLAZA">TOZON PLAZA</option>
              )}
            </select>
          </div>

          <div className="flex items-center gap-2 rounded-2xl bg-white border border-slate-200 p-1.5 shadow-2xs">
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="rounded-xl bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-900 outline-none cursor-pointer border border-slate-200"
            >
              <option value="ALL">Все типы помещений</option>
              <option value="APARTMENT">Квартиры</option>
              <option value="COMMERCIAL">Коммерция</option>
              <option value="PARKING">Паркинг</option>
            </select>
          </div>
        </div>
      </div>

      <AnalyticsTabs />

      {/* SECTION 1: Donut & Main Status Table */}
      <div className="rounded-3xl bg-white border border-slate-200 p-6 shadow-2xs">
        <h3 className="text-base font-extrabold text-slate-900 mb-6 flex items-center justify-between">
          <span>Статистика по ЖК: {selectedProject}</span>
          <span className="text-xs font-bold px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
            Всего: {stats.totalUnits} помещений
          </span>
        </h3>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Donut Chart Visual (SVG) */}
          <div className="lg:col-span-4 flex flex-col items-center justify-center">
            <div className="relative w-56 h-56 flex items-center justify-center">
              <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                {/* SVG Donut Segments */}
                <circle cx="50" cy="50" r="38" fill="none" stroke="#e2e8f0" strokeWidth="12" />
                {/* Available 78% (Green) */}
                <circle
                  cx="50" cy="50" r="38" fill="none"
                  stroke="#10b981" strokeWidth="12"
                  strokeDasharray="186 238.7" strokeDashoffset="0"
                />
                {/* Sold 14.18% (Red) */}
                <circle
                  cx="50" cy="50" r="38" fill="none"
                  stroke="#ef4444" strokeWidth="12"
                  strokeDasharray="33.8 238.7" strokeDashoffset="-186"
                />
                {/* Reserved 2.84% (Yellow) */}
                <circle
                  cx="50" cy="50" r="38" fill="none"
                  stroke="#eab308" strokeWidth="12"
                  strokeDasharray="6.7 238.7" strokeDashoffset="-219.8"
                />
                {/* Resident Exchange (Slate) */}
                <circle
                  cx="50" cy="50" r="38" fill="none"
                  stroke="#94a3b8" strokeWidth="12"
                  strokeDasharray="12 238.7" strokeDashoffset="-226.5"
                />
              </svg>

              <div className="absolute flex flex-col items-center justify-center text-center">
                <span className="text-3xl font-black text-slate-900 leading-none">{stats.totalUnits}</span>
                <span className="text-[11px] font-semibold text-slate-400 mt-1 uppercase tracking-wider">помещений</span>
              </div>
            </div>

            <div className="flex flex-wrap justify-center gap-3 mt-4 text-[11px] font-bold text-slate-600">
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Свободно (78%)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-rose-500" /> Продано (14.2%)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-amber-500" /> Бронь (2.8%)
              </span>
            </div>
          </div>

          {/* Status Breakdown Table */}
          <div className="lg:col-span-8 overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                <tr>
                  <th className="p-3 pl-4">Статус</th>
                  <th className="p-3 text-right">шт.</th>
                  <th className="p-3 text-right">Площадь (м²)</th>
                  <th className="p-3 text-right">Сумма ($)</th>
                  <th className="p-3 text-right">Цена за м²</th>
                  <th className="p-3 text-right pr-4">% от шт.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {stats.statusBreakdown.map((row) => (
                  <tr key={row.key} className="hover:bg-slate-50 transition">
                    <td className="p-3 pl-4 flex items-center gap-2.5">
                      <span className="h-3 w-3 rounded-xs shrink-0" style={{ backgroundColor: row.color }} />
                      <span className="font-bold text-slate-900">{row.label}</span>
                    </td>
                    <td className="p-3 text-right font-bold text-slate-800">{row.count}</td>
                    <td className="p-3 text-right text-slate-600">{row.area.toLocaleString('ru-RU')}</td>
                    <td className="p-3 text-right font-black text-slate-900">
                      {row.sum > 0 ? `$${row.sum.toLocaleString('ru-RU')}` : '0'}
                    </td>
                    <td className="p-3 text-right text-slate-600">
                      {row.priceM2 > 0 ? `$${row.priceM2}` : '0'}
                    </td>
                    <td className="p-3 text-right pr-4 font-bold text-slate-700">{row.percent}%</td>
                  </tr>
                ))}
                {/* Total Row */}
                <tr className="bg-slate-50/80 font-black text-slate-900 border-t border-slate-200">
                  <td className="p-3 pl-4">Итого</td>
                  <td className="p-3 text-right">{stats.totalUnits}</td>
                  <td className="p-3 text-right">{stats.totalArea.toLocaleString('ru-RU')}</td>
                  <td className="p-3 text-right">${stats.totalSum.toLocaleString('ru-RU')}</td>
                  <td className="p-3 text-right">${stats.avgPriceM2}</td>
                  <td className="p-3 text-right pr-4">100%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* SECTION 2: Analytics by Block / Building */}
      <div className="rounded-3xl bg-white border border-slate-200 p-6 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
            <span>Аналитика по блоку</span>
            <span className="bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-lg text-xs font-bold border border-blue-200">
              {selectedProject}
            </span>
          </h3>

          <span className="text-xs text-slate-500 font-semibold">Помещения</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
              <tr>
                <th className="p-3 pl-4">Блоки</th>
                <th className="p-3 text-center">Продано</th>
                <th className="p-3 text-center">Бронь</th>
                <th className="p-3 text-center">Свободно</th>
                <th className="p-3 text-center">Житель</th>
                <th className="p-3 text-center">Всего</th>
                <th className="p-3 pl-6 pr-4 w-72">Распределение (%)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {stats.blocks.map((b) => (
                <tr key={b.name} className="hover:bg-slate-50 transition">
                  <td className="p-3 pl-4 font-bold text-slate-900">{b.name}</td>
                  <td className="p-3 text-center font-bold text-rose-600">{b.sold}</td>
                  <td className="p-3 text-center font-bold text-amber-600">{b.reserved}</td>
                  <td className="p-3 text-center font-bold text-emerald-600">{b.available}</td>
                  <td className="p-3 text-center text-slate-600">{b.resident}</td>
                  <td className="p-3 text-center font-extrabold text-slate-900">{b.total}</td>
                  <td className="p-3 pl-6 pr-4">
                    {/* Stacked Progress Bar */}
                    <div className="h-6 w-full rounded-lg bg-slate-100 overflow-hidden flex text-[10px] font-bold text-white shadow-2xs">
                      <div style={{ width: `${b.soldPct}%` }} className="bg-rose-500 flex items-center justify-center" title={`Продано: ${b.soldPct}%`}>
                        {b.soldPct > 8 && `${b.soldPct}%`}
                      </div>
                      <div style={{ width: `${b.resvdPct}%` }} className="bg-amber-400 flex items-center justify-center text-slate-900" title={`Бронь: ${b.resvdPct}%`}>
                        {b.resvdPct > 5 && `${b.resvdPct}%`}
                      </div>
                      <div style={{ width: `${b.freePct}%` }} className="bg-emerald-500 flex items-center justify-center" title={`Свободно: ${b.freePct}%`}>
                        {b.freePct > 15 && `${b.freePct}%`}
                      </div>
                      <div style={{ width: `${b.resPct}%` }} className="bg-slate-400 flex items-center justify-center" title={`Житель: ${b.resPct}%`}>
                        {b.resPct > 6 && `${b.resPct}%`}
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION 3: Analytics by Floor */}
      <div className="rounded-3xl bg-white border border-slate-200 p-6 shadow-2xs space-y-4">
        <h3 className="text-base font-extrabold text-slate-900">Статистика по этажам</h3>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
              <tr>
                <th className="p-3 pl-4">Этажи</th>
                <th className="p-3 text-center">Житель</th>
                <th className="p-3 text-center">Свободно</th>
                <th className="p-3 text-center">Продано</th>
                <th className="p-3 text-center">Бронь</th>
                <th className="p-3 text-center">Всего</th>
                <th className="p-3 pl-6 pr-4 w-72">График заполнения</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {stats.floors.map((f) => (
                <tr key={f.floor} className="hover:bg-slate-50 transition">
                  <td className="p-3 pl-4 font-bold text-slate-900">Этаж {f.floor}</td>
                  <td className="p-3 text-center text-slate-600">{f.resident}</td>
                  <td className="p-3 text-center font-bold text-emerald-600">{f.available}</td>
                  <td className="p-3 text-center font-bold text-rose-600">{f.sold}</td>
                  <td className="p-3 text-center font-bold text-amber-600">{f.reserved}</td>
                  <td className="p-3 text-center font-black text-slate-900">{f.total}</td>
                  <td className="p-3 pl-6 pr-4">
                    <div className="h-5 w-full rounded-lg bg-slate-100 overflow-hidden flex text-[9px] font-bold text-white shadow-2xs">
                      {f.soldPct > 0 && (
                        <div style={{ width: `${f.soldPct}%` }} className="bg-rose-500 flex items-center justify-center">
                          {f.soldPct}%
                        </div>
                      )}
                      {f.resvdPct > 0 && (
                        <div style={{ width: `${f.resvdPct}%` }} className="bg-amber-400 text-slate-900 flex items-center justify-center">
                          {f.resvdPct}%
                        </div>
                      )}
                      {f.freePct > 0 && (
                        <div style={{ width: `${f.freePct}%` }} className="bg-emerald-500 flex items-center justify-center">
                          {f.freePct}%
                        </div>
                      )}
                      {f.resPct > 0 && (
                        <div style={{ width: `${f.resPct}%` }} className="bg-slate-400 flex items-center justify-center">
                          {f.resPct}%
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
