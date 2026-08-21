import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { AnalyticsTabs } from '../../components/AnalyticsTabs';
import {
  Building2,
  PieChart,
  Layers,
  TrendingUp,
  Loader2,
  RefreshCw
} from 'lucide-react';

export const AnalyticsOnePage = () => {
  const [selectedProjectId, setSelectedProjectId] = useState('ALL');
  const [selectedType, setSelectedType] = useState('ALL');
  const [projects, setProjects] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    totalUnits: 0,
    totalArea: 0,
    totalSum: 0,
    avgPriceM2: 0,
    statusBreakdown: [],
    blocks: [],
    floors: []
  });

  // Fetch Projects list for filter
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

  // Fetch Analytics 1.0 real DB data
  const fetchAnalytics = async () => {
    try {
      setIsLoading(true);
      const params = {};
      if (selectedProjectId && selectedProjectId !== 'ALL') {
        params.projectId = selectedProjectId;
      }
      if (selectedType && selectedType !== 'ALL') {
        params.unitType = selectedType;
      }

      const queryStr = new URLSearchParams(params).toString();
      const res = await api.get(`/reports/analytics-1${queryStr ? '?' + queryStr : ''}`);
      const data = res.data || res;
      if (data) {
        setStats(data);
      }
    } catch (err) {
      console.error('Error fetching analytics 1.0 stats:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [selectedProjectId, selectedType]);

  // SVG Donut calculation
  const radius = 38;
  const circumference = 2 * Math.PI * radius; // ~238.76
  let accumulatedDash = 0;

  const currentProjectName = selectedProjectId === 'ALL'
    ? 'Все объекты'
    : (projects.find(p => String(p.id) === String(selectedProjectId))?.name || 'ЖК');

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

          <div className="flex items-center gap-2 rounded-2xl bg-white border border-slate-200 p-1.5 shadow-2xs">
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="rounded-xl bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-900 outline-none cursor-pointer border border-slate-200"
            >
              <option value="ALL">Все типы помещений</option>
              <option value="APARTMENT">Квартиры</option>
              <option value="COMMERCIAL">Коммерция / Паркинг</option>
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
          <p className="text-sm font-semibold text-slate-600">Загрузка аналитических данных...</p>
        </div>
      ) : (
        <>
          {/* SECTION 1: Donut & Main Status Table */}
          <div className="rounded-3xl bg-white border border-slate-200 p-6 shadow-2xs">
            <h3 className="text-base font-extrabold text-slate-900 mb-6 flex items-center justify-between">
              <span>Статистика по объекту: {currentProjectName}</span>
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                Всего: {stats.totalUnits} помещений
              </span>
            </h3>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              {/* Donut Chart Visual (SVG) */}
              <div className="lg:col-span-4 flex flex-col items-center justify-center">
                <div className="relative w-56 h-56 flex items-center justify-center">
                  <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                    <circle cx="50" cy="50" r={radius} fill="none" stroke="#f1f5f9" strokeWidth="12" />
                    {stats.statusBreakdown.map((item) => {
                      if (!item.count || item.percent <= 0) return null;
                      const segmentLength = (item.percent / 100) * circumference;
                      const offset = accumulatedDash;
                      accumulatedDash += segmentLength;

                      return (
                        <circle
                          key={item.key}
                          cx="50"
                          cy="50"
                          r={radius}
                          fill="none"
                          stroke={item.color}
                          strokeWidth="12"
                          strokeDasharray={`${segmentLength} ${circumference}`}
                          strokeDashoffset={-offset}
                          className="transition-all duration-700"
                        />
                      );
                    })}
                  </svg>

                  <div className="absolute flex flex-col items-center justify-center text-center pointer-events-none">
                    <span className="text-3xl font-black text-slate-900 leading-none">{stats.totalUnits}</span>
                    <span className="text-[11px] font-semibold text-slate-400 mt-1 uppercase tracking-wider">помещений</span>
                  </div>
                </div>

                <div className="flex flex-wrap justify-center gap-3 mt-4 text-[11px] font-bold text-slate-600">
                  {stats.statusBreakdown.map((row) => (
                    <span key={row.key} className="flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: row.color }} />
                      {row.label} ({row.percent}%)
                    </span>
                  ))}
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
                          {row.priceM2 > 0 ? `$${row.priceM2.toLocaleString('ru-RU')}` : '0'}
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
                      <td className="p-3 text-right">${stats.avgPriceM2.toLocaleString('ru-RU')}</td>
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
                <span>Аналитика по блокам и корпусам</span>
                <span className="bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-lg text-xs font-bold border border-blue-200">
                  {currentProjectName}
                </span>
              </h3>
              <span className="text-xs text-slate-500 font-semibold">Номерной фонд</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                  <tr>
                    <th className="p-3 pl-4">Блоки</th>
                    <th className="p-3 text-center">Продано</th>
                    <th className="p-3 text-center">Бронь</th>
                    <th className="p-3 text-center">Свободно</th>
                    <th className="p-3 text-center">Заблокировано</th>
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
                      <td className="p-3 text-center text-slate-500">{b.blocked || 0}</td>
                      <td className="p-3 text-center font-extrabold text-slate-900">{b.total}</td>
                      <td className="p-3 pl-6 pr-4">
                        <div className="h-6 w-full rounded-lg bg-slate-100 overflow-hidden flex text-[10px] font-bold text-white shadow-2xs">
                          {b.soldPct > 0 && (
                            <div style={{ width: `${b.soldPct}%` }} className="bg-rose-500 flex items-center justify-center" title={`Продано: ${b.soldPct}%`}>
                              {b.soldPct > 8 && `${b.soldPct}%`}
                            </div>
                          )}
                          {b.resvdPct > 0 && (
                            <div style={{ width: `${b.resvdPct}%` }} className="bg-amber-400 flex items-center justify-center text-slate-900" title={`Бронь: ${b.resvdPct}%`}>
                              {b.resvdPct > 8 && `${b.resvdPct}%`}
                            </div>
                          )}
                          {b.freePct > 0 && (
                            <div style={{ width: `${b.freePct}%` }} className="bg-emerald-500 flex items-center justify-center" title={`Свободно: ${b.freePct}%`}>
                              {b.freePct > 15 && `${b.freePct}%`}
                            </div>
                          )}
                          {b.blockedPct > 0 && (
                            <div style={{ width: `${b.blockedPct}%` }} className="bg-slate-400 flex items-center justify-center" title={`Заблокировано: ${b.blockedPct}%`}>
                              {b.blockedPct > 8 && `${b.blockedPct}%`}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {stats.blocks.length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-6 text-center text-slate-400 font-medium">Нет данных по корпусам для выбранного фильтра</td>
                    </tr>
                  )}
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
                    <th className="p-3 pl-4">Этаж</th>
                    <th className="p-3 text-center">Свободно</th>
                    <th className="p-3 text-center">Продано</th>
                    <th className="p-3 text-center">Бронь</th>
                    <th className="p-3 text-center">Заблокировано</th>
                    <th className="p-3 text-center">Всего</th>
                    <th className="p-3 pl-6 pr-4 w-72">График заполнения</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {stats.floors.map((f) => (
                    <tr key={f.floor} className="hover:bg-slate-50 transition">
                      <td className="p-3 pl-4 font-bold text-slate-900">{f.name || `Этаж ${f.floor}`}</td>
                      <td className="p-3 text-center font-bold text-emerald-600">{f.available}</td>
                      <td className="p-3 text-center font-bold text-rose-600">{f.sold}</td>
                      <td className="p-3 text-center font-bold text-amber-600">{f.reserved}</td>
                      <td className="p-3 text-center text-slate-500">{f.blocked || 0}</td>
                      <td className="p-3 text-center font-black text-slate-900">{f.total}</td>
                      <td className="p-3 pl-6 pr-4">
                        <div className="h-5 w-full rounded-lg bg-slate-100 overflow-hidden flex text-[9px] font-bold text-white shadow-2xs">
                          {f.soldPct > 0 && (
                            <div style={{ width: `${f.soldPct}%` }} className="bg-rose-500 flex items-center justify-center">
                              {f.soldPct > 8 && `${f.soldPct}%`}
                            </div>
                          )}
                          {f.resvdPct > 0 && (
                            <div style={{ width: `${f.resvdPct}%` }} className="bg-amber-400 text-slate-900 flex items-center justify-center">
                              {f.resvdPct > 8 && `${f.resvdPct}%`}
                            </div>
                          )}
                          {f.freePct > 0 && (
                            <div style={{ width: `${f.freePct}%` }} className="bg-emerald-500 flex items-center justify-center">
                              {f.freePct > 15 && `${f.freePct}%`}
                            </div>
                          )}
                          {f.blockedPct > 0 && (
                            <div style={{ width: `${f.blockedPct}%` }} className="bg-slate-400 flex items-center justify-center">
                              {f.blockedPct > 8 && `${f.blockedPct}%`}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {stats.floors.length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-6 text-center text-slate-400 font-medium">Нет данных по этажам для выбранного фильтра</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
