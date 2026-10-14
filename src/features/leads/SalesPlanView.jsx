import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../../api/client';
import { useAuth } from '../auth/AuthContext';
import {
  Target,
  Calendar,
  Building2,
  TrendingUp,
  FileCheck,
  FileX,
  AlertCircle,
  Clock,
  CheckCircle2,
  Lock,
  Edit3,
  History,
  X,
  ChevronRight,
  Filter,
  DollarSign,
  Briefcase,
  Users,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  ShieldAlert,
  Info
} from 'lucide-react';

export const SalesPlanView = ({ projects = [] }) => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const isDirector = user?.role === 'DIRECTOR';
  const isSalesManager = user?.role === 'SALES_MANAGER';

  // Get current Dushanbe month default (YYYY-MM)
  const defaultPeriod = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }, []);

  // Filter States
  const [period, setPeriod] = useState(defaultPeriod);
  const [selectedProjectId, setSelectedProjectId] = useState('ALL');
  const [selectedBuildingId, setSelectedBuildingId] = useState('ALL');

  // Main Performance Data
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Drilldown Modal
  const [drilldownType, setDrilldownType] = useState(null); // 'GROSS' | 'CANCELLATIONS' | 'NET' | null
  const [drilldownManagerId, setDrilldownManagerId] = useState(null);
  const [drilldownBuildingId, setDrilldownBuildingId] = useState(null);
  const [drilldownDeals, setDrilldownDeals] = useState([]);
  const [isLoadingDrilldown, setIsLoadingDrilldown] = useState(false);

  // Edit Plans Modal (ADMIN)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editScopeType, setEditScopeType] = useState('DEPARTMENT');
  const [editPlansList, setEditPlansList] = useState([]);
  const [editReason, setEditReason] = useState('');
  const [isSavingPlans, setIsSavingPlans] = useState(false);
  const [editError, setEditError] = useState(null);

  // Audit Logs Modal (ADMIN)
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [auditLogs, setAuditLogs] = useState([]);
  const [isLoadingAudit, setIsLoadingAudit] = useState(false);

  // Fetch Main Performance
  const fetchPerformance = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = { period };
      if (selectedProjectId !== 'ALL') params.projectId = selectedProjectId;
      if (selectedBuildingId !== 'ALL') params.buildingId = selectedBuildingId;

      const res = await api.get('/sales-plans/performance', { params });
      setData(res.data.data || res.data);
    } catch (err) {
      console.error('Failed to fetch sales plan performance:', err);
      if (err.response?.status === 403) {
        setError('Доступ к планам продаж запрещен для вашей роли.');
      } else {
        setError(err.response?.data?.message || 'Не удалось загрузить данные плана продаж.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPerformance();
  }, [period, selectedProjectId, selectedBuildingId]);

  // Available Buildings for Selected Project
  const availableBuildings = useMemo(() => {
    if (!data?.buildings) return [];
    if (selectedProjectId === 'ALL') return data.buildings;
    return data.buildings.filter(b => String(b.building.projectId) === String(selectedProjectId));
  }, [data, selectedProjectId]);

  // Load Drilldown Deals
  const handleOpenDrilldown = async (type, managerId = null, buildingId = null) => {
    setDrilldownType(type);
    setDrilldownManagerId(managerId);
    setDrilldownBuildingId(buildingId);
    setIsLoadingDrilldown(true);
    try {
      const params = { period, type };
      if (managerId) params.managerId = managerId;
      if (buildingId) params.buildingId = buildingId;
      const res = await api.get('/sales-plans/deals', { params });
      setDrilldownDeals(res.data.data || []);
    } catch (err) {
      console.error('Failed to fetch drilldown deals:', err);
      setDrilldownDeals([]);
    } finally {
      setIsLoadingDrilldown(false);
    }
  };

  // Open Edit Modal & Populate Form
  const handleOpenEditModal = () => {
    setEditError(null);
    setEditReason('');

    // Pre-populate Department & Managers plans
    const initialList = [];

    // 1. Department Plan
    const deptPlan = data?.department?.target || {};
    initialList.push({
      scope_type: 'DEPARTMENT',
      name: 'Отдел продаж (Компания)',
      target_deals_count: deptPlan.dealsCount || 0,
      target_volume_usd: deptPlan.volumeUsd || 0,
      status: deptPlan.status || 'DRAFT'
    });

    // 2. Managers Plans
    if (data?.managers) {
      for (const m of data.managers) {
        initialList.push({
          scope_type: 'MANAGER',
          manager_id: m.manager.id,
          name: m.manager.name,
          role: m.manager.role,
          target_deals_count: m.metrics?.target?.dealsCount || 0,
          target_volume_usd: m.metrics?.target?.volumeUsd || 0,
          status: m.metrics?.target?.status || 'DRAFT'
        });
      }
    }

    // 3. Buildings Plans
    if (data?.buildings) {
      for (const b of data.buildings) {
        initialList.push({
          scope_type: 'BUILDING',
          building_id: b.building.id,
          name: b.building.name,
          target_deals_count: b.metrics?.target?.dealsCount || 0,
          target_volume_usd: b.metrics?.target?.volumeUsd || 0,
          status: b.metrics?.target?.status || 'DRAFT'
        });
      }
    }

    setEditPlansList(initialList);
    setIsEditModalOpen(true);
  };

  // Save Plans Handler
  const handleSavePlans = async () => {
    setIsSavingPlans(true);
    setEditError(null);
    try {
      const payloadPlans = editPlansList.map(p => ({
        scope_type: p.scope_type,
        manager_id: p.manager_id || null,
        project_id: p.project_id || null,
        building_id: p.building_id || null,
        target_deals_count: Number(p.target_deals_count) || 0,
        target_volume_minor: Math.round((Number(p.target_volume_usd) || 0) * 100),
        currency: 'USD',
        status: p.status || 'DRAFT'
      }));

      await api.post('/sales-plans/batch', {
        period,
        plans: payloadPlans,
        reason: editReason
      });

      setIsEditModalOpen(false);
      await fetchPerformance();
    } catch (err) {
      console.error('Failed to save plans:', err);
      setEditError(err.response?.data?.message || 'Ошибка сохранения планов продаж');
    } finally {
      setIsSavingPlans(false);
    }
  };

  // Open Audit Logs Modal
  const handleOpenAuditModal = async () => {
    setIsAuditModalOpen(true);
    setIsLoadingAudit(true);
    try {
      const res = await api.get('/sales-plans/audit-logs');
      setAuditLogs(res.data.data || []);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
      setAuditLogs([]);
    } finally {
      setIsLoadingAudit(false);
    }
  };

  if (isLoading && !data) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="flex items-center gap-3 text-slate-500">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-tozon-blue border-t-transparent" />
          <span className="text-sm font-semibold">Загрузка данных плана продаж...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50/50 p-6 text-center">
        <AlertCircle className="mx-auto h-8 w-8 text-rose-500 mb-2" />
        <h3 className="text-sm font-black text-rose-900 uppercase tracking-wider">Ограничение доступа</h3>
        <p className="mt-1 text-xs text-rose-600">{error}</p>
      </div>
    );
  }

  const dept = data?.department || {};
  const pacing = data?.pacing || {};
  const managers = data?.managers || [];
  const buildings = data?.buildings || [];

  return (
    <div className="space-y-6">
      {/* 1. Header Toolbar: Period Selector, Project/Building Filters, Admin Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-white p-4 border border-slate-200 shadow-2xs">
        <div className="flex flex-wrap items-center gap-3">
          {/* Month Selector */}
          <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 border border-slate-200">
            <Calendar className="h-4 w-4 text-tozon-blue" />
            <span className="text-xs font-bold text-slate-700">Период:</span>
            <input
              type="month"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="bg-transparent text-xs font-black text-slate-900 outline-none cursor-pointer"
            />
          </div>

          {/* Quick Month Nav */}
          <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1 border border-slate-200">
            <button
              onClick={() => {
                const [y, m] = period.split('-').map(Number);
                const prev = new Date(Date.UTC(y, m - 2, 1));
                setPeriod(`${prev.getUTCFullYear()}-${String(prev.getUTCMonth() + 1).padStart(2, '0')}`);
              }}
              className="px-2 py-1 text-xs font-bold text-slate-600 hover:text-slate-900 rounded-lg hover:bg-white transition"
              title="Предыдущий месяц"
            >
              ← Пред
            </button>
            <button
              onClick={() => setPeriod(defaultPeriod)}
              className={`px-2 py-1 text-xs font-bold rounded-lg transition ${
                period === defaultPeriod ? 'bg-white text-tozon-blue shadow-2xs' : 'text-slate-600 hover:text-slate-900 hover:bg-white'
              }`}
            >
              Текущий
            </button>
            <button
              onClick={() => {
                const [y, m] = period.split('-').map(Number);
                const next = new Date(Date.UTC(y, m, 1));
                setPeriod(`${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, '0')}`);
              }}
              className="px-2 py-1 text-xs font-bold text-slate-600 hover:text-slate-900 rounded-lg hover:bg-white transition"
              title="Следующий месяц"
            >
              След →
            </button>
          </div>

          {/* Project Filter */}
          <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-1.5 border border-slate-200">
            <Building2 className="h-4 w-4 text-slate-400" />
            <select
              value={selectedProjectId}
              onChange={(e) => {
                setSelectedProjectId(e.target.value);
                setSelectedBuildingId('ALL');
              }}
              className="bg-transparent text-xs font-bold text-slate-700 outline-none cursor-pointer"
            >
              <option value="ALL">Все ЖК</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          {/* Building Filter */}
          <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-1.5 border border-slate-200">
            <Layers className="h-4 w-4 text-slate-400" />
            <select
              value={selectedBuildingId}
              onChange={(e) => setSelectedBuildingId(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-700 outline-none cursor-pointer"
            >
              <option value="ALL">Все строительные блоки</option>
              {availableBuildings.map(b => (
                <option key={b.building.id} value={b.building.id}>{b.building.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Admin Action Buttons */}
        {isAdmin && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleOpenAuditModal}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer shadow-2xs"
            >
              <History className="h-4 w-4 text-slate-500" />
              <span>История изменений</span>
            </button>
            <button
              onClick={handleOpenEditModal}
              className="flex items-center gap-1.5 rounded-xl bg-tozon-blue hover:bg-tozon-blue-hover px-3.5 py-2 text-xs font-black text-white shadow-md shadow-tozon-blue/20 transition cursor-pointer"
            >
              <Edit3 className="h-4 w-4" />
              <span>Настроить планы</span>
            </button>
          </div>
        )}
      </div>

      {/* 2. Working Days Pacing Calendar Banner */}
      <div className="rounded-2xl border border-slate-200 bg-linear-to-r from-slate-900 via-slate-800 to-indigo-950 p-4 text-white shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-emerald-400">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Рабочий календарь Asia/Dushanbe (Пн–Сб, 08:00–20:00)
                </span>
                <span className="rounded-md bg-emerald-500/20 px-2 py-0.5 text-[10px] font-black text-emerald-300">
                  {pacing.isCurrentPeriod ? 'Текущий месяц' : (pacing.isPastPeriod ? 'Закрытый период' : 'Будущий месяц')}
                </span>
              </div>
              <div className="text-sm font-semibold text-slate-200 mt-0.5">
                Прошло рабочих дней: <span className="font-black text-white">{pacing.elapsedWorkingDays}</span> из{' '}
                <span className="font-black text-white">{pacing.totalWorkingDays}</span> • Осталось:{' '}
                <span className="font-black text-emerald-300">{pacing.remainingWorkingDays} дн.</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="text-right">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Временной темп месяца</div>
              <div className="text-lg font-black text-white">{pacing.pacingPercent}%</div>
            </div>
            <div className="w-32 bg-white/10 rounded-full h-2.5 overflow-hidden">
              <div
                className="bg-emerald-400 h-2.5 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, pacing.pacingPercent)}%` }}
              />
            </div>
          </div>
        </div>

        {/* 3-day data guard notice */}
        {!pacing.hasSufficientDataForForecast && (
          <div className="mt-3 flex items-center gap-2 rounded-xl bg-amber-500/20 px-3 py-2 text-xs font-medium text-amber-200 border border-amber-500/30">
            <Info className="h-4 w-4 shrink-0 text-amber-400" />
            <span>
              <strong>Недостаточно статистики:</strong> расчет прогноза по фактическому темпу продаж активируется после первых 3 рабочих дней месяца.
            </span>
          </div>
        )}
      </div>

      {/* 3. Top 5 Metric KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Card 1: ПЛАН */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black text-slate-500 uppercase tracking-wider">План продаж</span>
            <span className={`text-[10px] font-black px-2 py-0.5 rounded-md ${
              dept.target?.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
            }`}>
              {dept.target?.status === 'APPROVED' ? 'Утвержден' : (dept.target?.status === 'DRAFT' ? 'Черновик' : 'Не задан')}
            </span>
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900">
            {dept.target?.dealsCount || 0} <span className="text-sm font-semibold text-slate-400">дог.</span>
          </div>
          <div className="text-xs font-bold text-tozon-blue mt-0.5">
            ${(dept.target?.volumeUsd || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} USD
          </div>
          <div className="text-[10px] text-slate-400 mt-2">
            Целевые ориентиры отдела
          </div>
        </div>

        {/* Card 2: ФАКТ (Net Sales) */}
        <div className="rounded-2xl border border-blue-200 bg-blue-50/40 p-4 shadow-2xs relative">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black text-blue-800 uppercase tracking-wider">Факт продаж (Net)</span>
            <button
              onClick={() => handleOpenDrilldown('NET')}
              className="text-[10px] font-bold text-tozon-blue hover:underline cursor-pointer"
            >
              Список →
            </button>
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900">
            {dept.net?.count || 0} <span className="text-sm font-semibold text-slate-400">дог.</span>
          </div>
          <div className="text-xs font-bold text-slate-900 mt-0.5">
            ${(dept.net?.volumeUsd || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} USD
          </div>
          <div className="flex items-center gap-2 mt-2 text-[10px]">
            <span
              onClick={() => handleOpenDrilldown('GROSS')}
              className="text-emerald-700 font-bold hover:underline cursor-pointer"
              title="Подписано в этом месяце"
            >
              Gross: {dept.gross?.count || 0} (${(dept.gross?.volumeUsd || 0).toLocaleString()})
            </span>
            <span className="text-slate-300">•</span>
            <span
              onClick={() => handleOpenDrilldown('CANCELLATIONS')}
              className="text-rose-600 font-bold hover:underline cursor-pointer"
              title="Расторгнуто в этом месяце"
            >
              Расторг: {dept.cancellations?.totalCount || 0}
            </span>
          </div>
        </div>

        {/* Card 3: ВЫПОЛНЕНИЕ ПЛАНА */}
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black text-emerald-800 uppercase tracking-wider">Выполнение плана</span>
            <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-md ${
              (dept.execution?.pacingPaceDifference || 0) >= 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
            }`}>
              {(dept.execution?.pacingPaceDifference || 0) >= 0
                ? `+${dept.execution?.pacingPaceDifference}%`
                : `${dept.execution?.pacingPaceDifference}%`}
            </span>
          </div>
          <div className="mt-2 text-2xl font-black text-emerald-900">
            {dept.execution?.dealsPercent || 0}% <span className="text-xs font-bold text-emerald-700">по дог.</span>
          </div>
          <div className="text-xs font-bold text-slate-700 mt-0.5">
            {dept.execution?.volumePercent || 0}% по объёму USD
          </div>
          {/* Progress Bar */}
          <div className="w-full bg-emerald-200/60 rounded-full h-1.5 mt-2.5 overflow-hidden">
            <div
              className="bg-emerald-600 h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, dept.execution?.dealsPercent || 0)}%` }}
            />
          </div>
        </div>

        {/* Card 4: ОТКЛОНЕНИЕ ОТ ПЛАНА */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black text-slate-500 uppercase tracking-wider">Отклонение</span>
            {(dept.net?.count || 0) >= (dept.target?.dealsCount || 0) ? (
              <ArrowUpRight className="h-4 w-4 text-emerald-600" />
            ) : (
              <ArrowDownRight className="h-4 w-4 text-rose-500" />
            )}
          </div>
          <div className={`mt-2 text-2xl font-black ${
            ((dept.net?.count || 0) - (dept.target?.dealsCount || 0)) >= 0 ? 'text-emerald-700' : 'text-rose-600'
          }`}>
            {((dept.net?.count || 0) - (dept.target?.dealsCount || 0)) > 0 ? '+' : ''}
            {(dept.net?.count || 0) - (dept.target?.dealsCount || 0)} <span className="text-sm font-semibold">дог.</span>
          </div>
          <div className={`text-xs font-bold mt-0.5 ${
            ((dept.net?.volumeUsd || 0) - (dept.target?.volumeUsd || 0)) >= 0 ? 'text-emerald-700' : 'text-rose-600'
          }`}>
            {((dept.net?.volumeUsd || 0) - (dept.target?.volumeUsd || 0)) > 0 ? '+' : ''}
            ${Math.round((dept.net?.volumeUsd || 0) - (dept.target?.volumeUsd || 0)).toLocaleString()} USD
          </div>
          <div className="text-[10px] text-slate-400 mt-2">
            Разница факта и целевого плана
          </div>
        </div>

        {/* Card 5: ПРОГНОЗ */}
        <div className="rounded-2xl border border-indigo-200 bg-indigo-50/40 p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black text-indigo-900 uppercase tracking-wider">Прогноз темпа</span>
            <span className="text-[10px] font-bold text-indigo-700">Run-rate</span>
          </div>
          {dept.forecast?.status === 'INSUFFICIENT_DATA' ? (
            <div className="mt-3">
              <span className="text-xs font-bold text-amber-700 bg-amber-100 px-2 py-1 rounded-md">
                Недостаточно статистики
              </span>
              <div className="text-[10px] text-slate-500 mt-2">Первые 3 рабочих дня</div>
            </div>
          ) : (
            <>
              <div className="mt-2 text-2xl font-black text-indigo-950">
                ~{dept.forecast?.deals ?? '-'} <span className="text-sm font-semibold text-slate-500">дог.</span>
              </div>
              <div className="text-xs font-bold text-indigo-900 mt-0.5">
                ~${(dept.forecast?.volumeUsd ?? 0).toLocaleString()} USD
              </div>
              <div className="text-[10px] font-bold text-indigo-600 mt-2">
                Отклонение: {dept.forecast?.deviationDeals > 0 ? '+' : ''}{dept.forecast?.deviationDeals ?? 0} дог.
              </div>
            </>
          )}
        </div>
      </div>

      {/* 4. Financial Separation Notice (Cash Collections vs Contract Sales) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl bg-amber-50 border border-amber-200/80 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-800">
            <DollarSign className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xs font-black uppercase tracking-wider text-amber-900">
              Финансовый факт: Кассовые поступления месяца vs Договорные обязательства
            </div>
            <div className="text-xs text-amber-800 mt-0.5">
              Фактически поступило платежей по договорам в {period}:{' '}
              <strong className="text-slate-900">${(dept.cashCollected?.volumeUsd || 0).toLocaleString()} USD</strong>{' '}
              (Коэффициент покрытия продаж: <strong>{dept.cashCollected?.cashToContractRatio || 0}%</strong>).
            </div>
          </div>
        </div>
        <div className="text-[11px] font-semibold text-amber-700 bg-amber-100/60 px-3 py-1.5 rounded-xl border border-amber-300/40">
          План продаж фиксирует контракты (Gross/Net), а не факт кассы
        </div>
      </div>

      {/* 5. Managers Table */}
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-2xs">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-tozon-blue" />
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
              {isSalesManager ? 'Мой план и факт продаж' : 'Выполнение плана по менеджерам'}
            </h3>
          </div>
          <span className="text-xs text-slate-500">
            {managers.length} {managers.length === 1 ? 'менеджер' : 'менеджеров'}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black uppercase tracking-wider text-slate-500">
                <th className="py-3 px-4">Менеджер</th>
                <th className="py-3 px-3 text-right">План (Дог.)</th>
                <th className="py-3 px-3 text-right">План ($ USD)</th>
                <th className="py-3 px-3 text-right text-emerald-700">Gross</th>
                <th className="py-3 px-3 text-right text-rose-600">Расторгнуто</th>
                <th className="py-3 px-3 text-right font-black text-slate-900">Факт Net ($ USD)</th>
                <th className="py-3 px-3 text-center">Выполнение %</th>
                <th className="py-3 px-3 text-right">Прогноз</th>
                <th className="py-3 px-4 text-center">Сделки</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {managers.length === 0 ? (
                <tr>
                  <td colSpan="9" className="py-6 text-center text-slate-400">
                    Нет данных по менеджерам за указанный период
                  </td>
                </tr>
              ) : (
                managers.map((m) => {
                  const met = m.metrics || {};
                  const exec = met.execution?.dealsPercent || 0;
                  return (
                    <tr key={m.manager.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-4 font-bold text-slate-900">
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded-full bg-slate-100 flex items-center justify-center font-black text-slate-600 text-xs">
                            {m.manager.name.charAt(0)}
                          </div>
                          <div>
                            <div>{m.manager.name}</div>
                            <div className="text-[10px] font-medium text-slate-400">{m.manager.role}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-slate-700">
                        {met.target?.dealsCount || 0}
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-slate-700">
                        ${(met.target?.volumeUsd || 0).toLocaleString()}
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-emerald-700">
                        {met.gross?.count || 0}
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-rose-600">
                        {met.cancellations?.totalCount || 0}
                      </td>
                      <td className="py-3 px-3 text-right font-black text-slate-900">
                        {met.net?.count || 0} <span className="text-slate-400 font-normal">дог.</span> •{' '}
                        ${(met.net?.volumeUsd || 0).toLocaleString()}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <span className="font-black text-slate-800">{exec}%</span>
                          <div className="w-14 bg-slate-200 rounded-full h-1.5 overflow-hidden">
                            <div
                              className="bg-tozon-blue h-1.5 rounded-full"
                              style={{ width: `${Math.min(100, exec)}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right font-medium text-indigo-900">
                        {met.forecast?.status === 'INSUFFICIENT_DATA' ? (
                          <span className="text-[10px] text-amber-700">Недостаточно дн.</span>
                        ) : (
                          `~${met.forecast?.deals ?? 0} дог.`
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => handleOpenDrilldown('NET', m.manager.id)}
                          className="px-2.5 py-1 text-[11px] font-bold text-tozon-blue bg-blue-50 hover:bg-blue-100 rounded-lg transition cursor-pointer"
                        >
                          Сделки
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 6. Projects & Residential Blocks Table */}
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-2xs">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-tozon-blue" />
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
              Выполнение плана по строительным блокам
            </h3>
          </div>
          <span className="text-xs text-slate-500">{buildings.length} блоков</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black uppercase tracking-wider text-slate-500">
                <th className="py-3 px-4">Блок / ЖК</th>
                <th className="py-3 px-3 text-right">План (Дог.)</th>
                <th className="py-3 px-3 text-right">План ($ USD)</th>
                <th className="py-3 px-3 text-right text-emerald-700">Gross</th>
                <th className="py-3 px-3 text-right text-rose-600">Расторгнуто</th>
                <th className="py-3 px-3 text-right font-black text-slate-900">Факт Net</th>
                <th className="py-3 px-3 text-center">Выполнение %</th>
                <th className="py-3 px-4 text-center">Сделки</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {buildings.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-6 text-center text-slate-400">
                    Нет данных по строительным блокам
                  </td>
                </tr>
              ) : (
                buildings.map((b) => {
                  const met = b.metrics || {};
                  const exec = met.execution?.dealsPercent || 0;
                  return (
                    <tr key={b.building.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-4 font-bold text-slate-900">
                        {b.building.name}
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-slate-700">
                        {met.target?.dealsCount || 0}
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-slate-700">
                        ${(met.target?.volumeUsd || 0).toLocaleString()}
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-emerald-700">
                        {met.gross?.count || 0}
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-rose-600">
                        {met.cancellations?.totalCount || 0}
                      </td>
                      <td className="py-3 px-3 text-right font-black text-slate-900">
                        {met.net?.count || 0} дог. • ${(met.net?.volumeUsd || 0).toLocaleString()}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <span className="font-black text-slate-800">{exec}%</span>
                          <div className="w-14 bg-slate-200 rounded-full h-1.5 overflow-hidden">
                            <div
                              className="bg-emerald-600 h-1.5 rounded-full"
                              style={{ width: `${Math.min(100, exec)}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => handleOpenDrilldown('NET', null, b.building.id)}
                          className="px-2.5 py-1 text-[11px] font-bold text-tozon-blue bg-blue-50 hover:bg-blue-100 rounded-lg transition cursor-pointer"
                        >
                          Сделки
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 7. Deals Drilldown Drawer / Modal */}
      {drilldownType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-4xl max-h-[85vh] rounded-3xl bg-white shadow-2xl flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <FileCheck className="h-5 w-5 text-tozon-blue" />
                <div>
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                    Расшифровка договоров ({drilldownType}) за {period}
                  </h3>
                  <div className="text-[11px] text-slate-500">
                    Только реально подписанные договоры с номером
                  </div>
                </div>
              </div>
              <button
                onClick={() => setDrilldownType(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-200 transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Filter Pills in Modal */}
            <div className="p-3 bg-white border-b border-slate-100 flex items-center gap-2">
              <button
                onClick={() => handleOpenDrilldown('GROSS', drilldownManagerId, drilldownBuildingId)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  drilldownType === 'GROSS' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Gross (Подписано)
              </button>
              <button
                onClick={() => handleOpenDrilldown('CANCELLATIONS', drilldownManagerId, drilldownBuildingId)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  drilldownType === 'CANCELLATIONS' ? 'bg-rose-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Cancellations (Расторгнуто)
              </button>
              <button
                onClick={() => handleOpenDrilldown('NET', drilldownManagerId, drilldownBuildingId)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  drilldownType === 'NET' ? 'bg-tozon-blue text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Все договоры периода (Net)
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 overflow-y-auto flex-1">
              {isLoadingDrilldown ? (
                <div className="py-12 text-center text-slate-400">Загрузка договоров...</div>
              ) : drilldownDeals.length === 0 ? (
                <div className="py-12 text-center text-slate-400">
                  Нет договоров, соответствующих выбранным критериям
                </div>
              ) : (
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black uppercase tracking-wider text-slate-500">
                      <th className="py-2.5 px-3">Договор №</th>
                      <th className="py-2.5 px-3">Клиент</th>
                      <th className="py-2.5 px-3">Блок / Квартира</th>
                      <th className="py-2.5 px-3">Менеджер</th>
                      <th className="py-2.5 px-3">Дата подписания</th>
                      <th className="py-2.5 px-3 text-right">Сумма USD</th>
                      <th className="py-2.5 px-3 text-center">Статус</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {drilldownDeals.map((d) => (
                      <tr key={d.id} className="hover:bg-slate-50 transition">
                        <td className="py-2.5 px-3 font-bold text-tozon-blue">
                          {d.contractNumber}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-slate-900">
                          {d.clientName}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600">
                          {d.buildingName}, кв. {d.unitNumber} {d.rooms ? `(${d.rooms} комн.)` : ''}
                        </td>
                        <td className="py-2.5 px-3 text-slate-700">
                          {d.managerName}
                        </td>
                        <td className="py-2.5 px-3 text-slate-500">
                          {d.signedAt || d.dealDate || '-'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-black text-slate-900">
                          ${(d.finalPriceUsd || 0).toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                            d.status === 'CANCELLED' ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'
                          }`}>
                            {d.status === 'CANCELLED' ? 'Расторгнут' : 'Действует'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">
                Всего записей: {drilldownDeals.length}
              </span>
              <button
                onClick={() => setDrilldownType(null)}
                className="px-4 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-100 transition cursor-pointer"
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. Plan Edit Modal (ADMIN ONLY) */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-3xl max-h-[90vh] rounded-3xl bg-white shadow-2xl flex flex-col overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5 text-tozon-blue" />
                <div>
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                    Настройка планов продаж на {period}
                  </h3>
                  <div className="text-[11px] text-slate-500">
                    Утверждение и корректировка целевых ориентиров (ADMIN ONLY)
                  </div>
                </div>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-200 transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Error in Modal */}
            {editError && (
              <div className="p-3 bg-rose-50 border-b border-rose-200 text-xs font-semibold text-rose-700 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{editError}</span>
              </div>
            )}

            {/* Body */}
            <div className="p-4 overflow-y-auto flex-1 space-y-4">
              {/* Mandatory Reason for in-month or past adjustments */}
              <div className="rounded-2xl bg-amber-50/70 border border-amber-200 p-3 space-y-1.5">
                <label className="text-xs font-black text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldAlert className="h-4 w-4 text-amber-700" />
                  <span>Обоснование изменений (обязательно от 10 символов)</span>
                </label>
                <input
                  type="text"
                  placeholder="Например: Утверждение плана на октябрь с учетом ввода нового блока"
                  value={editReason}
                  onChange={(e) => setEditReason(e.target.value)}
                  className="w-full rounded-xl border border-amber-300 bg-white px-3 py-2 text-xs font-semibold text-slate-900 outline-none focus:border-tozon-blue focus:ring-2 focus:ring-tozon-blue/20"
                />
              </div>

              {/* Plans Table */}
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black uppercase tracking-wider text-slate-500">
                    <th className="py-2.5 px-3">Уровень / Объект</th>
                    <th className="py-2.5 px-3">Тип</th>
                    <th className="py-2.5 px-3 text-right">План договоров</th>
                    <th className="py-2.5 px-3 text-right">План суммы ($ USD)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {editPlansList.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 transition">
                      <td className="py-2.5 px-3 font-bold text-slate-900">
                        {item.name}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          item.scope_type === 'DEPARTMENT'
                            ? 'bg-blue-100 text-blue-800'
                            : item.scope_type === 'MANAGER'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-purple-100 text-purple-800'
                        }`}>
                          {item.scope_type}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <input
                          type="number"
                          min="0"
                          value={item.target_deals_count}
                          onChange={(e) => {
                            const val = e.target.value;
                            setEditPlansList(prev => prev.map((p, i) => i === idx ? { ...p, target_deals_count: val } : p));
                          }}
                          className="w-20 text-right rounded-lg border border-slate-200 px-2 py-1 font-bold text-slate-900 outline-none focus:border-tozon-blue"
                        />
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <input
                          type="number"
                          min="0"
                          step="1000"
                          value={item.target_volume_usd}
                          onChange={(e) => {
                            const val = e.target.value;
                            setEditPlansList(prev => prev.map((p, i) => i === idx ? { ...p, target_volume_usd: val } : p));
                          }}
                          className="w-32 text-right rounded-lg border border-slate-200 px-2 py-1 font-bold text-slate-900 outline-none focus:border-tozon-blue"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-100 transition cursor-pointer"
              >
                Отмена
              </button>
              <button
                onClick={handleSavePlans}
                disabled={isSavingPlans || editReason.trim().length < 10}
                className={`flex items-center gap-2 rounded-xl px-5 py-2 text-xs font-black text-white shadow-md transition cursor-pointer ${
                  editReason.trim().length < 10 || isSavingPlans
                    ? 'bg-slate-300 cursor-not-allowed'
                    : 'bg-tozon-blue hover:bg-tozon-blue-hover shadow-tozon-blue/20'
                }`}
              >
                {isSavingPlans ? 'Сохранение...' : 'Сохранить и утвердить'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 9. Audit Logs Modal (ADMIN ONLY) */}
      {isAuditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-4xl max-h-[85vh] rounded-3xl bg-white shadow-2xl flex flex-col overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <History className="h-5 w-5 text-tozon-blue" />
                <div>
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                    История изменений и утверждений планов
                  </h3>
                  <div className="text-[11px] text-slate-500">
                    Неизменяемый журнал аудита корректировок планов продаж
                  </div>
                </div>
              </div>
              <button
                onClick={() => setIsAuditModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-200 transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-4 overflow-y-auto flex-1">
              {isLoadingAudit ? (
                <div className="py-12 text-center text-slate-400">Загрузка журнала...</div>
              ) : auditLogs.length === 0 ? (
                <div className="py-12 text-center text-slate-400">Записей аудита пока нет</div>
              ) : (
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black uppercase tracking-wider text-slate-500">
                      <th className="py-2.5 px-3">Дата / Время</th>
                      <th className="py-2.5 px-3">Автор</th>
                      <th className="py-2.5 px-3">Действие</th>
                      <th className="py-2.5 px-3">Обоснование</th>
                      <th className="py-2.5 px-3">Новые значения</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50 transition">
                        <td className="py-2.5 px-3 font-semibold text-slate-500">
                          {new Date(log.created_at).toLocaleString('ru-RU')}
                        </td>
                        <td className="py-2.5 px-3 font-bold text-slate-900">
                          {log.users?.name || 'Администратор'}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                            log.action === 'APPROVE'
                              ? 'bg-emerald-100 text-emerald-800'
                              : log.action === 'CREATE'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}>
                            {log.action}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-700 max-w-xs truncate">
                          {log.reason || '-'}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600 max-w-xs truncate">
                          {log.new_values}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end">
              <button
                onClick={() => setIsAuditModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-100 transition cursor-pointer"
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
