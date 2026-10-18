import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import { useAuth } from '../auth/AuthContext';
import { AnalyticsTabs } from '../../components/AnalyticsTabs';
import {
  TrendingUp,
  BarChart3,
  Target,
  Users,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileCheck,
  Calendar,
  Building2,
  Home,
  Layers,
  PhoneCall,
  Download,
  Filter,
  RefreshCw,
  Loader2,
  ArrowRight,
  TrendingDown,
  DollarSign,
  PieChart,
  Eye,
  Check
} from 'lucide-react';

export const SalesAnalyticsPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Active section tab: 'plan_fact', 'funnel', 'managers', 'demand'
  const [activeTab, setActiveTab] = useState('plan_fact');

  // Filters
  const [selectedProjectId, setSelectedProjectId] = useState('ALL');
  const [selectedBuildingId, setSelectedBuildingId] = useState('ALL');
  const [selectedManagerId, setSelectedManagerId] = useState('ALL');
  const [selectedPeriod, setSelectedPeriod] = useState('ALL');

  const [projects, setProjects] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState(null);

  // Data states
  const [planFactData, setPlanFactData] = useState(null);
  const [funnelData, setFunnelData] = useState(null);
  const [managersData, setManagersData] = useState(null);
  const [demandData, setDemandData] = useState(null);

  // Fetch project list
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const res = await api.get('/projects');
        const list = res.data?.projects || res.projects || [];
        setProjects(list);
      } catch (err) {
        console.error('Failed to load projects:', err);
      }
    };
    fetchProjects();
  }, []);

  // Fetch all analytics datasets
  const fetchAllAnalytics = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = {};
      if (selectedProjectId !== 'ALL') params.projectId = selectedProjectId;
      if (selectedBuildingId !== 'ALL') params.buildingId = selectedBuildingId;
      if (selectedManagerId !== 'ALL') params.managerId = selectedManagerId;
      if (selectedPeriod !== 'ALL') params.period = selectedPeriod;

      const [resPlanFact, resFunnel, resManagers, resDemand] = await Promise.all([
        api.get('/reports/sales-plan-fact', { params }),
        api.get('/reports/sales-funnel', { params }),
        api.get('/reports/sales-managers', { params }),
        api.get('/reports/apartment-demand', { params })
      ]);

      setPlanFactData(resPlanFact.data || resPlanFact);
      setFunnelData(resFunnel.data || resFunnel);
      setManagersData(resManagers.data || resManagers);
      setDemandData(resDemand.data || resDemand);
    } catch (err) {
      console.error('Failed to fetch sales analytics:', err);
      if (err.response?.status === 403) {
        setError('Доступ к аналитике продаж ограничен вашей ролью в системе.');
      } else {
        setError('Не удалось загрузить данные аналитики продаж.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAllAnalytics();
  }, [selectedProjectId, selectedBuildingId, selectedManagerId, selectedPeriod]);

  // Navigate to Deals with full filter preservation
  const navigateToDeals = ({ status, managerId, period }) => {
    const params = new URLSearchParams();
    if (status) params.set('status', status);

    const effManager = managerId || (selectedManagerId !== 'ALL' ? selectedManagerId : null);
    if (effManager && effManager !== 'ALL') {
      params.set('managerId', effManager);
    }

    if (selectedProjectId !== 'ALL') {
      params.set('projectId', selectedProjectId);
    }

    if (selectedBuildingId !== 'ALL') {
      params.set('buildingId', selectedBuildingId);
    }

    const effPeriod = period || (selectedPeriod !== 'ALL' ? selectedPeriod : null);
    if (effPeriod && effPeriod !== 'ALL') {
      params.set('period', effPeriod);
    }

    navigate(`/deals?${params.toString()}`);
  };

  // Export to CSV
  const handleExport = async (type) => {
    try {
      setIsExporting(true);
      const params = { type };
      if (selectedProjectId !== 'ALL') params.projectId = selectedProjectId;
      if (selectedBuildingId !== 'ALL') params.buildingId = selectedBuildingId;
      if (selectedManagerId !== 'ALL') params.managerId = selectedManagerId;
      if (selectedPeriod !== 'ALL') params.period = selectedPeriod;

      const response = await api.get('/reports/sales-analytics-export', {
        params,
        responseType: 'blob'
      });

      const blob = new Blob([response], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `tozon_sales_analytics_${type}_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Export failed:', err);
      alert('Ошибка при выгрузке отчета');
    } finally {
      setIsExporting(false);
    }
  };

  const isSalesManager = user?.role === 'SALES_MANAGER';

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <TrendingUp className="h-7 w-7 text-blue-600" />
            <span>Сквозная аналитика продаж и спроса (Phase 3.5)</span>
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500">
            План-факт выполнения, конверсия сквозной воронки, персональные KPI и реальный спрос на квартиры
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleExport(activeTab === 'plan_fact' ? 'plan_fact' : activeTab === 'managers' ? 'managers' : 'demand')}
            disabled={isExporting}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-blue-600 transition shadow-2xs cursor-pointer"
          >
            <Download className="h-3.5 w-3.5" />
            <span>{isExporting ? 'Экспорт...' : 'Экспорт в Excel (CSV)'}</span>
          </button>

          <button
            onClick={fetchAllAnalytics}
            title="Обновить данные"
            className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-blue-600 transition shadow-2xs cursor-pointer"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Global Analytics Tabs */}
      <AnalyticsTabs />

      {/* Global Filter Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-3.5 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          {/* Project Filter */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="font-bold text-slate-500">ЖК:</span>
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">Все объекты</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Block Filter */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="font-bold text-slate-500">Блок:</span>
            <select
              value={selectedBuildingId}
              onChange={(e) => setSelectedBuildingId(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">Все блоки</option>
              <option value="3">Блок Б (Худжанд)</option>
            </select>
          </div>

          {/* Manager Filter */}
          {!isSalesManager && (
            <div className="flex items-center gap-1.5 text-xs">
              <span className="font-bold text-slate-500">Менеджер:</span>
              <select
                value={selectedManagerId}
                onChange={(e) => setSelectedManagerId(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="ALL">Вся команда</option>
                {managersData?.managers && managersData.managers.length > 0 ? (
                  managersData.managers.map((m) => (
                    <option key={m.managerId} value={m.managerId}>
                      {m.name} ({m.role === 'ADMIN' ? 'Руководство' : 'Менеджер'})
                    </option>
                  ))
                ) : (
                  <>
                    <option value="3">Дадочон Саидов (Менеджер 1)</option>
                    <option value="1">Admin (Руководство)</option>
                  </>
                )}
              </select>
            </div>
          )}

          {/* Period Filter */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="font-bold text-slate-500">Период:</span>
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">Все периоды</option>
              <option value="2026-11">Ноябрь 2026</option>
              <option value="2026-10">Октябрь 2026</option>
              <option value="2026-09">Сентябрь 2026</option>
              <option value="2026-08">Август 2026</option>
            </select>
          </div>
        </div>

        {/* Mode switcher tabs */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('plan_fact')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              activeTab === 'plan_fact'
                ? 'bg-white text-blue-700 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            План и факт
          </button>
          <button
            onClick={() => setActiveTab('funnel')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              activeTab === 'funnel'
                ? 'bg-white text-blue-700 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Воронка продаж
          </button>
          <button
            onClick={() => setActiveTab('managers')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              activeTab === 'managers'
                ? 'bg-white text-blue-700 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            KPI менеджеров
          </button>
          <button
            onClick={() => setActiveTab('demand')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              activeTab === 'demand'
                ? 'bg-white text-blue-700 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Спрос на квартиры
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center p-20 bg-white rounded-3xl border border-slate-200">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-3" />
          <p className="text-sm font-semibold text-slate-600">Сборка аналитических показателей...</p>
        </div>
      ) : error ? (
        <div className="p-8 bg-rose-50 border border-rose-200 rounded-3xl text-center text-rose-700 font-semibold text-sm">
          {error}
        </div>
      ) : (
        <>
          {/* TAB 1: ПЛАН И ФАКТ ПРОДАЖ */}
          {activeTab === 'plan_fact' && planFactData && (
            <div className="space-y-6">
              {/* Summary KPIs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-2xs">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">План продаж (договоры)</span>
                  <div className="text-2xl font-black text-slate-900 mt-1">
                    {planFactData.summary.totalTargetDeals} <span className="text-sm font-semibold text-slate-400">квартир</span>
                  </div>
                  <div className="text-xs text-slate-500 mt-1 font-semibold">
                    Цель: ${planFactData.summary.totalTargetVolumeUsd.toLocaleString('ru-RU')}
                  </div>
                </div>

                <div className="rounded-3xl border border-emerald-200 bg-emerald-50/40 p-5 shadow-2xs">
                  <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">Фактические продажи</span>
                  <div className="text-2xl font-black text-emerald-800 mt-1">
                    {planFactData.summary.totalActualDeals} <span className="text-sm font-semibold text-emerald-600">квартир</span>
                  </div>
                  <div className="text-xs text-emerald-700 mt-1 font-semibold">
                    Объем: ${planFactData.summary.totalActualVolumeUsd.toLocaleString('ru-RU')}
                  </div>
                </div>

                <div className="rounded-3xl border border-blue-200 bg-blue-50/40 p-5 shadow-2xs">
                  <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wider">Выполнение плана (USD)</span>
                  <div className="text-2xl font-black text-blue-800 mt-1">
                    {planFactData.summary.volumeExecutionPercent}%
                  </div>
                  <div className="text-xs text-blue-600 mt-1 font-semibold">
                    По квартирам: {planFactData.summary.dealsExecutionPercent}%
                  </div>
                </div>

                <div className={`rounded-3xl border p-5 shadow-2xs ${
                  planFactData.summary.volumeGapUsd >= 0
                    ? 'border-emerald-200 bg-emerald-50/40 text-emerald-800'
                    : 'border-amber-200 bg-amber-50/40 text-amber-800'
                }`}>
                  <span className="text-[11px] font-bold uppercase tracking-wider">
                    {planFactData.summary.volumeGapUsd >= 0 ? 'Превышение плана' : 'Отклонение от плана'}
                  </span>
                  <div className="text-2xl font-black mt-1">
                    {planFactData.summary.volumeGapUsd >= 0 ? '+' : ''}${planFactData.summary.volumeGapUsd.toLocaleString('ru-RU')}
                  </div>
                  <div className="text-xs mt-1 font-semibold">
                    {planFactData.summary.dealsGap >= 0 ? '+' : ''}{planFactData.summary.dealsGap} квартир от цели
                  </div>
                </div>
              </div>

              {/* Monthly Comparison Table */}
              <div className="rounded-3xl bg-white border border-slate-200 p-6 shadow-2xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900">Помесячное сравнение плана и факта продаж</h3>
                    <p className="text-xs text-slate-500">
                      Сравнение плановых и фактически подписанных сделок без смешивания с бронированиями
                    </p>
                  </div>
                  <span className="text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-100 rounded-lg px-2.5 py-1 self-start sm:self-auto">
                    Изоляция уровней: Plans Not Summed
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                      <tr>
                        <th className="p-3 pl-4">Период</th>
                        <th className="p-3 text-center">План (кв)</th>
                        <th className="p-3 text-center">Факт (кв)</th>
                        <th className="p-3 text-center">% выполн.</th>
                        <th className="p-3 text-right">План ($)</th>
                        <th className="p-3 text-right">Факт ($)</th>
                        <th className="p-3 text-right">Отклонение ($)</th>
                        <th className="p-3 text-center">Брони (факт)</th>
                        <th className="p-3 text-center pr-4">Действие</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {planFactData.monthlyComparison.map((m) => (
                        <tr key={m.period} className="hover:bg-slate-50 transition">
                          <td className="p-3 pl-4 font-bold text-slate-900">{m.period}</td>
                          <td className="p-3 text-center font-semibold text-slate-600">
                            {m.target.dealsCount > 0 ? `${m.target.dealsCount} шт` : '—'}
                          </td>
                          <td className="p-3 text-center font-bold text-emerald-700">
                            {m.actual.signedDealsCount} шт
                          </td>
                          <td className="p-3 text-center font-bold">
                            <span className={`px-2 py-0.5 rounded-md text-[10px] ${
                              m.execution.dealsPercent >= 100
                                ? 'bg-emerald-100 text-emerald-800'
                                : m.execution.dealsPercent > 0
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-slate-100 text-slate-600'
                            }`}>
                              {m.execution.dealsPercent}%
                            </span>
                          </td>
                          <td className="p-3 text-right font-semibold text-slate-600">
                            {m.target.volumeUsd > 0 ? `$${m.target.volumeUsd.toLocaleString('ru-RU')}` : '—'}
                          </td>
                          <td className="p-3 text-right font-black text-slate-900">
                            ${m.actual.signedVolumeUsd.toLocaleString('ru-RU')}
                          </td>
                          <td className={`p-3 text-right font-bold ${
                            m.execution.volumeGapUsd >= 0 ? 'text-emerald-700' : 'text-rose-600'
                          }`}>
                            {m.execution.volumeGapUsd >= 0 ? '+' : ''}${m.execution.volumeGapUsd.toLocaleString('ru-RU')}
                          </td>
                          <td className="p-3 text-center font-semibold text-cyan-700">
                            {m.pipelineSupplementary.reservedCount > 0 ? (
                              <button
                                onClick={() => navigateToDeals({ status: 'RESERVED', period: m.period })}
                                className="hover:underline cursor-pointer"
                              >
                                {m.pipelineSupplementary.reservedCount} шт (${m.pipelineSupplementary.reservedVolumeUsd.toLocaleString('ru-RU')})
                              </button>
                            ) : (
                              '0'
                            )}
                          </td>
                          <td className="p-3 text-center pr-4">
                            <button
                              onClick={() => navigateToDeals({ status: 'SIGNED', period: m.period })}
                              className="px-2.5 py-1 bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 rounded-lg text-[10px] font-bold transition cursor-pointer"
                            >
                              Договоры →
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ВОРОНКА ПРОДАЖ */}
          {activeTab === 'funnel' && funnelData && (
            <div className="space-y-6">
              {/* Funnel Metrics Bar */}
              <div className="rounded-3xl bg-white border border-slate-200 p-6 shadow-2xs space-y-6">
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">Сквозная воронка продаж TOZON CRM</h3>
                  <p className="text-xs text-slate-500">
                    Переход покупателя по этапам жизненного цикла без дублирования сделок и лидов
                  </p>
                </div>

                {/* Visual Pipeline Progression */}
                <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                  {funnelData.stages.map((st, idx) => (
                    <div
                      key={st.id}
                      className="rounded-2xl border border-slate-200 p-4 bg-slate-50/50 flex flex-col justify-between relative overflow-hidden"
                    >
                      <div
                        className="absolute top-0 left-0 right-0 h-1.5"
                        style={{ backgroundColor: st.color }}
                      />
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                            Этап {idx + 1}
                          </span>
                          <span className="text-[10px] font-black text-slate-700">
                            {st.conversionFromPrev}%
                          </span>
                        </div>
                        <div className="text-sm font-extrabold text-slate-900 mt-1">{st.name}</div>
                        <div className="text-2xl font-black text-slate-900 mt-2">{st.count}</div>
                        {st.volumeUsd !== undefined && (
                          <div className="text-[11px] font-bold text-slate-600 mt-0.5">
                            ${st.volumeUsd.toLocaleString('ru-RU')}
                          </div>
                        )}
                        <p className="text-[10px] text-slate-500 mt-2">{st.description}</p>
                      </div>

                      <div className="mt-4 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[10px] font-bold">
                        <span className="text-slate-400">Прошли этап:</span>
                        <span className="text-slate-800">{st.reachedCount}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Transition cycle averages - DATA INTEGRITY GATE */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-100">
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-500 uppercase">Лид → Бронирование</span>
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                        Недоступно
                      </span>
                    </div>
                    <div className="text-xl font-black text-slate-400 mt-1">Н/Д</div>
                    <p className="text-[10px] text-slate-500 mt-1">Журнал смены стадий не ведётся в БД</p>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-500 uppercase">Бронь → Договор</span>
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                        Недоступно
                      </span>
                    </div>
                    <div className="text-xl font-black text-slate-400 mt-1">Н/Д</div>
                    <p className="text-[10px] text-slate-500 mt-1">Журнал статусов брони не сохраняется в БД</p>
                  </div>

                  <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-100">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-emerald-700 uppercase">Полный цикл сделки</span>
                      {funnelData.transitionCycleAverages?.fullCycleLeadToSignedAvgDays !== null && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800">
                          Фактический
                        </span>
                      )}
                    </div>
                    <div className="text-xl font-black text-emerald-900 mt-1">
                      {funnelData.transitionCycleAverages?.fullCycleLeadToSignedAvgDays !== null ? (
                        <>
                          {funnelData.transitionCycleAverages.fullCycleLeadToSignedAvgDays}{' '}
                          <span className="text-xs font-semibold">дней</span>
                        </>
                      ) : (
                        'Н/Д'
                      )}
                    </div>
                    <p className="text-[10px] text-emerald-600 mt-1">
                      {funnelData.transitionCycleAverages?.metrics?.fullCycleLeadToSigned?.notice || 'От даты создания лида до даты подписания'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Lost Reasons Section */}
              <div className="rounded-3xl bg-white border border-slate-200 p-6 shadow-2xs space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900">Причины отказа и потери лидов</h3>
                    <p className="text-xs text-slate-500">
                      Анализ причин срыва сделок на этапах квалификации и переговоров
                    </p>
                  </div>
                  <span className="text-xs font-bold text-rose-700 bg-rose-50 border border-rose-100 rounded-lg px-2.5 py-1">
                    Всего отказов: {funnelData.totalLostLeads}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  {funnelData.lostReasons.map((lr) => (
                    <div key={lr.code} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                      <div className="text-xs font-bold text-slate-800">{lr.label}</div>
                      <div className="flex items-baseline justify-between mt-2">
                        <span className="text-xl font-black text-slate-900">{lr.count}</span>
                        <span className="text-xs font-bold text-rose-600">{lr.percentOfLost}%</span>
                      </div>
                    </div>
                  ))}
                  {funnelData.lostReasons.length === 0 && (
                    <div className="col-span-4 text-center p-6 text-slate-400 text-xs">
                      Отказов за выбранный период не зафиксировано
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: KPI И ЭФФЕКТИВНОСТЬ МЕНЕДЖЕРОВ */}
          {activeTab === 'managers' && managersData && (
            <div className="space-y-6">
              {/* Team Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
                <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Закреплено лидов</span>
                  <div className="text-xl font-black text-slate-900 mt-1">{managersData.teamSummary.totalAssignedLeads}</div>
                </div>
                <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-100 shadow-2xs">
                  <span className="text-[10px] font-bold text-emerald-700 uppercase">Обработано лидов</span>
                  <div className="text-xl font-black text-emerald-900 mt-1">{managersData.teamSummary.totalProcessedLeads}</div>
                </div>
                <div className="p-4 rounded-2xl bg-rose-50/50 border border-rose-100 shadow-2xs">
                  <span className="text-[10px] font-bold text-rose-700 uppercase">Просрочено задач</span>
                  <div
                    onClick={() => navigate('/tasks?dateFilter=OVERDUE')}
                    className="text-xl font-black text-rose-900 mt-1 hover:underline cursor-pointer"
                  >
                    {managersData.teamSummary.totalOverdueTasks}
                  </div>
                </div>
                <div className="p-4 rounded-2xl bg-blue-50/50 border border-blue-100 shadow-2xs">
                  <span className="text-[10px] font-bold text-blue-700 uppercase">Звонки / Встречи</span>
                  <div className="text-xl font-black text-blue-900 mt-1">
                    {managersData.teamSummary.totalCompletedCalls} / {managersData.teamSummary.totalCompletedMeetings}
                  </div>
                </div>
                <div className="p-4 rounded-2xl bg-cyan-50/50 border border-cyan-100 shadow-2xs">
                  <span className="text-[10px] font-bold text-cyan-700 uppercase">Бронирования</span>
                  <div
                    onClick={() => navigateToDeals({ status: 'RESERVED' })}
                    className="text-xl font-black text-cyan-900 mt-1 hover:underline cursor-pointer"
                  >
                    {managersData.teamSummary.totalReservedDeals}
                  </div>
                </div>
                <div className="p-4 rounded-2xl bg-purple-50/50 border border-purple-100 shadow-2xs">
                  <span className="text-[10px] font-bold text-purple-700 uppercase">Объем продаж ($)</span>
                  <div className="text-xl font-black text-purple-900 mt-1">
                    ${managersData.teamSummary.totalSalesVolumeUsd.toLocaleString('ru-RU')}
                  </div>
                </div>
              </div>

              {/* Managers Table */}
              <div className="rounded-3xl bg-white border border-slate-200 p-6 shadow-2xs space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900">Персональные показатели сотрудников</h3>
                    <p className="text-xs text-slate-500">
                      Контроль соблюдения регламентов, активности звонков и конверсии в подписанные сделки
                    </p>
                  </div>
                  {managersData.isRestrictedToSelf && (
                    <span className="text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 rounded-lg px-2 py-0.5">
                      Режим менеджера: ограничен доступ
                    </span>
                  )}
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                      <tr>
                        <th className="p-3 pl-4">Сотрудник</th>
                        <th className="p-3 text-center">Лиды (Вс/Обр/Необр)</th>
                        <th className="p-3 text-center">Просрочено задач</th>
                        <th className="p-3 text-center">Звонки / Встречи</th>
                        <th className="p-3 text-center">Брони</th>
                        <th className="p-3 text-center">Договоры</th>
                        <th className="p-3 text-right">Объем ($)</th>
                        <th className="p-3 text-center pr-4">Конверсия</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {managersData.managers.map((m) => (
                        <tr key={m.managerId} className="hover:bg-slate-50 transition">
                          <td className="p-3 pl-4">
                            <div className="font-bold text-slate-900">{m.name}</div>
                            <div className="text-[10px] text-slate-400">{m.email}</div>
                          </td>
                          <td className="p-3 text-center">
                            <span className="font-bold text-slate-900">{m.assignedLeadsCount}</span>
                            <span className="text-slate-400 mx-1">/</span>
                            <span className="text-emerald-700 font-bold">{m.processedLeadsCount}</span>
                            <span className="text-slate-400 mx-1">/</span>
                            <span className="text-rose-600 font-bold">{m.unprocessedLeadsCount}</span>
                          </td>
                          <td className="p-3 text-center">
                            {m.overdueTasksCount > 0 ? (
                              <button
                                onClick={() => navigate(`/tasks?dateFilter=OVERDUE&assignedUserId=${m.managerId}`)}
                                className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 font-bold text-[10px] hover:underline cursor-pointer"
                              >
                                {m.overdueTasksCount} задач
                              </button>
                            ) : (
                              <span className="text-slate-400">0</span>
                            )}
                          </td>
                          <td className="p-3 text-center font-bold text-slate-700">
                            {m.completedCalls} / {m.completedMeetings}
                          </td>
                          <td className="p-3 text-center font-bold text-cyan-700">
                            {m.reservedDealsCount > 0 ? (
                              <button
                                onClick={() => navigateToDeals({ status: 'RESERVED', managerId: m.managerId })}
                                className="hover:underline cursor-pointer"
                              >
                                {m.reservedDealsCount}
                              </button>
                            ) : (
                              '0'
                            )}
                          </td>
                          <td className="p-3 text-center font-bold text-emerald-700">
                            {m.signedDealsCount > 0 ? (
                              <button
                                onClick={() => navigateToDeals({ status: 'SIGNED', managerId: m.managerId })}
                                className="hover:underline cursor-pointer"
                              >
                                {m.signedDealsCount}
                              </button>
                            ) : (
                              '0'
                            )}
                          </td>
                          <td className="p-3 text-right font-black text-slate-900">
                            ${m.salesVolumeUsd.toLocaleString('ru-RU')}
                          </td>
                          <td className="p-3 text-center pr-4">
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-100 text-blue-800">
                              {m.conversionRate}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: АНАЛИТИКА СПРОСА НА КВАРТИРЫ */}
          {activeTab === 'demand' && demandData && (
            <div className="space-y-6">
              {demandData.state === 'DATA_UNAVAILABLE' ? (
                <div className="rounded-3xl border border-amber-200 bg-amber-50/70 p-8 text-center space-y-3 shadow-2xs">
                  <div className="inline-flex p-3 rounded-2xl bg-amber-100 text-amber-700">
                    <AlertCircle className="h-7 w-7" />
                  </div>
                  <h3 className="text-base font-extrabold text-amber-900">
                    Данные аналитики спроса временно недоступны
                  </h3>
                  <p className="text-xs text-amber-800/80 max-w-md mx-auto">
                    Сервис временно не может загрузить информацию об интересах к квартирам. Попробуйте обновить данные позже.
                  </p>
                  <button
                    onClick={fetchAllAnalytics}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition shadow-xs cursor-pointer mt-2"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    <span>Повторить запрос</span>
                  </button>
                </div>
              ) : demandData.state === 'SUCCESS_EMPTY' ? (
                <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center space-y-3 shadow-2xs">
                  <div className="inline-flex p-3 rounded-2xl bg-slate-100 text-slate-500">
                    <Layers className="h-7 w-7" />
                  </div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    Интересы покупателей отсутствуют
                  </h3>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    За выбранный период и объекты нет зафиксированных интересов покупателей к квартирам.
                  </p>
                </div>
              ) : (
                <>
                  {/* Demand Summary Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-2xs">
                      <span className="text-[11px] font-bold text-slate-500 uppercase">Всего интересов</span>
                      <div className="text-2xl font-black text-slate-900 mt-1">
                        {demandData.summary.totalInterestsCount} <span className="text-xs font-semibold text-slate-400">сохранений</span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">По таблице lead_interested_units</p>
                    </div>

                <div className="rounded-3xl border border-blue-200 bg-blue-50/40 p-5 shadow-2xs">
                  <span className="text-[11px] font-bold text-blue-700 uppercase">Уникальных покупателей</span>
                  <div className="text-2xl font-black text-blue-800 mt-1">
                    {demandData.summary.uniqueBuyersCount} <span className="text-xs font-semibold text-blue-600">клиентов</span>
                  </div>
                  <p className="text-xs text-blue-600 mt-1">Отделены от повторных подборов</p>
                </div>

                <div className="rounded-3xl border border-indigo-200 bg-indigo-50/40 p-5 shadow-2xs">
                  <span className="text-[11px] font-bold text-indigo-700 uppercase">Лидер спроса (комнатность)</span>
                  <div className="text-2xl font-black text-indigo-800 mt-1">
                    {demandData.demandByRooms.reduce((prev, curr) => (curr.interestsCount > prev.interestsCount ? curr : prev), demandData.demandByRooms[0])?.rooms || '—'}
                  </div>
                  <p className="text-xs text-indigo-600 mt-1">Наибольшее число обращений</p>
                </div>

                <div className="rounded-3xl border border-teal-200 bg-teal-50/40 p-5 shadow-2xs">
                  <span className="text-[11px] font-bold text-teal-700 uppercase">Самый востребованный этаж</span>
                  <div className="text-2xl font-black text-teal-800 mt-1">
                    {demandData.demandByFloors.reduce((prev, curr) => (curr.interestsCount > prev.interestsCount ? curr : prev), demandData.demandByFloors[0])?.floorLabel || '—'}
                  </div>
                  <p className="text-xs text-teal-600 mt-1">Концентрация предпочтений</p>
                </div>
              </div>

              {/* Grid: Breakdown by Rooms, Floors, Area, and Price */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Rooms */}
                <div className="rounded-3xl bg-white border border-slate-200 p-5 shadow-2xs space-y-3">
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                    <Home className="h-4 w-4 text-blue-600" />
                    <span>По комнатности</span>
                  </h4>
                  <div className="space-y-2">
                    {demandData.demandByRooms.map((r) => (
                      <div key={r.rooms} className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                        <div>
                          <div className="font-bold text-slate-900 text-xs">{r.rooms}</div>
                          <div className="text-[10px] text-slate-400">{r.uniqueBuyersCount} покупателей</div>
                        </div>
                        <div className="text-right">
                          <span className="font-extrabold text-blue-700 text-xs">{r.interestsCount}</span>
                          <span className="text-[10px] text-slate-500 ml-1">({r.percentOfTotal}%)</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Floors */}
                <div className="rounded-3xl bg-white border border-slate-200 p-5 shadow-2xs space-y-3">
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                    <Layers className="h-4 w-4 text-cyan-600" />
                    <span>По этажам</span>
                  </h4>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {demandData.demandByFloors && demandData.demandByFloors.length > 0 ? (
                      demandData.demandByFloors.map((f) => (
                        <div key={f.floorNumber} className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                          <div>
                            <div className="font-bold text-slate-900 text-xs">{f.floorLabel}</div>
                            <div className="text-[10px] text-slate-400">{f.uniqueBuyersCount} покупателей</div>
                          </div>
                          <div className="text-right">
                            <span className="font-extrabold text-cyan-700 text-xs">{f.interestsCount}</span>
                            <span className="text-[10px] text-slate-500 ml-1">({f.percentOfTotal}%)</span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-4 text-center text-slate-400 text-xs font-semibold">
                        Нет сохраненных интересов по этажам
                      </div>
                    )}
                  </div>
                </div>

                {/* Area Bands */}
                <div className="rounded-3xl bg-white border border-slate-200 p-5 shadow-2xs space-y-3">
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                    <Building2 className="h-4 w-4 text-indigo-600" />
                    <span>По диапазонам площади</span>
                  </h4>
                  <div className="space-y-2">
                    {demandData.demandByArea.map((a) => (
                      <div key={a.id} className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                        <div>
                          <div className="font-bold text-slate-900 text-xs">{a.label}</div>
                          <div className="text-[10px] text-slate-400">{a.uniqueBuyersCount} покупателей</div>
                        </div>
                        <div className="text-right">
                          <span className="font-extrabold text-indigo-700 text-xs">{a.interestsCount}</span>
                          <span className="text-[10px] text-slate-500 ml-1">({a.percentOfTotal}%)</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Price Bands */}
                <div className="rounded-3xl bg-white border border-slate-200 p-5 shadow-2xs space-y-3">
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                    <DollarSign className="h-4 w-4 text-emerald-600" />
                    <span>По ценовым диапазонам</span>
                  </h4>
                  <div className="space-y-2">
                    {demandData.demandByPrice.map((p) => (
                      <div key={p.id} className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                        <div>
                          <div className="font-bold text-slate-900 text-xs">{p.label}</div>
                          <div className="text-[10px] text-slate-400">{p.uniqueBuyersCount} покупателей</div>
                        </div>
                        <div className="text-right">
                          <span className="font-extrabold text-emerald-700 text-xs">{p.interestsCount}</span>
                          <span className="text-[10px] text-slate-500 ml-1">({p.percentOfTotal}%)</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Top Demanded Units Table */}
              <div className="rounded-3xl bg-white border border-slate-200 p-6 shadow-2xs space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900">Самые востребованные квартиры</h3>
                    <p className="text-xs text-slate-500">
                      Рейтинг квартир по числу сохранений интересов менеджерами и уникальным покупателям
                    </p>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                      <tr>
                        <th className="p-3 pl-4">Квартира</th>
                        <th className="p-3">Комнат</th>
                        <th className="p-3">Площадь</th>
                        <th className="p-3">Этаж</th>
                        <th className="p-3">Блок</th>
                        <th className="p-3 text-right">Стоимость</th>
                        <th className="p-3 text-center">Статус</th>
                        <th className="p-3 text-center">Интересов (клиентов)</th>
                        <th className="p-3 text-center pr-4">Действие</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {demandData.topDemandedUnits.map((u) => (
                        <tr key={u.unitId} className="hover:bg-slate-50 transition">
                          <td className="p-3 pl-4 font-bold text-slate-900">
                            Кв. №{u.unitNumber}
                          </td>
                          <td className="p-3 font-semibold text-slate-700">{u.rooms}-комн.</td>
                          <td className="p-3 font-semibold text-slate-700">{u.areaM2} м²</td>
                          <td className="p-3 font-semibold text-slate-700">{u.floorNumber} этаж</td>
                          <td className="p-3 font-semibold text-slate-600">{u.buildingName}</td>
                          <td className="p-3 text-right font-black text-slate-900">
                            ${u.priceUsd.toLocaleString('ru-RU')}
                          </td>
                          <td className="p-3 text-center">
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                              u.currentStatus === 'AVAILABLE'
                                ? 'bg-emerald-100 text-emerald-800'
                                : u.currentStatus === 'RESERVED'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}>
                              {u.currentStatus === 'AVAILABLE' ? 'Свободна' : u.currentStatus === 'RESERVED' ? 'Бронь' : 'Продана'}
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            <span className="font-extrabold text-blue-700">{u.interestsCount}</span>
                            <span className="text-slate-400 mx-1">/</span>
                            <span className="font-bold text-slate-700">{u.uniqueBuyersCount}</span>
                          </td>
                          <td className="p-3 text-center pr-4">
                            <button
                              onClick={() => navigate('/apartments')}
                              className="px-2.5 py-1 bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 rounded-lg text-[10px] font-bold transition cursor-pointer"
                            >
                              Карточка →
                            </button>
                          </td>
                        </tr>
                      ))}
                      {demandData.topDemandedUnits.length === 0 && (
                        <tr>
                          <td colSpan={9} className="p-6 text-center text-slate-400">
                            Сохранённых интересов не найдено
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}
        </>
      )}
    </div>
  );
};
