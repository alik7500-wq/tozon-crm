import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import {
  TrendingUp,
  Users,
  FileCheck,
  FileX,
  Clock,
  CheckCircle2,
  AlertCircle,
  UserX,
  Filter,
  Calendar,
  Building2,
  ChevronRight,
  HelpCircle,
  ArrowUpRight,
  BarChart3,
  Percent,
  RefreshCw,
  ShieldAlert
} from 'lucide-react';

export const ManagerPerformanceView = ({ projects = [] }) => {
  const navigate = useNavigate();

  // Filters state
  const [period, setPeriod] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedManagerId, setSelectedManagerId] = useState('ALL');
  const [selectedProjectId, setSelectedProjectId] = useState('ALL');

  // Data state
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchPerformance = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = {
        period,
        managerId: selectedManagerId,
        projectId: selectedProjectId
      };
      if (period === 'custom' && startDate && endDate) {
        params.startDate = startDate;
        params.endDate = endDate;
      }

      const res = await api.get('/leads/performance', { params });
      setData(res.data.data || res.data || null);
    } catch (err) {
      console.error('Failed to fetch manager performance:', err);
      if (err.response?.status === 403) {
        setError('Доступ к аналитике эффективности отдела продаж ограничен вашей ролью.');
      } else {
        setError(err.response?.data?.message || 'Не удалось загрузить данные эффективности менеджеров.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPerformance();
  }, [period, selectedManagerId, selectedProjectId]);

  const summary = data?.summary || {};
  const systemWide = data?.systemWide || {};
  const managers = data?.managers || [];
  const funnel = data?.funnel || [];
  const lostReasons = data?.lostReasons || [];
  const isRestrictedToSelf = data?.isRestrictedToSelf || false;

  const [sortKey, setSortKey] = useState('salesVolume');
  const [sortOrder, setSortOrder] = useState('desc');

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortOrder('desc');
    }
  };

  const sortedManagers = useMemo(() => {
    if (!managers || managers.length === 0) return [];
    return [...managers].sort((a, b) => {
      let valA = 0;
      let valB = 0;
      switch (sortKey) {
        case 'name':
          return sortOrder === 'asc' ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
        case 'activeLeads':
          valA = a.kpi?.activeLeadsPortfolio ?? 0;
          valB = b.kpi?.activeLeadsPortfolio ?? 0;
          break;
        case 'newLeads':
          valA = a.kpi?.newLeadsPeriod ?? 0;
          valB = b.kpi?.newLeadsPeriod ?? 0;
          break;
        case 'signedDeals':
          valA = a.kpi?.signedDealsCount ?? 0;
          valB = b.kpi?.signedDealsCount ?? 0;
          break;
        case 'salesVolume':
          valA = a.kpi?.salesVolume ?? 0;
          valB = b.kpi?.salesVolume ?? 0;
          break;
        case 'conversion':
          valA = a.kpi?.cohortConversionRate ?? -1;
          valB = b.kpi?.cohortConversionRate ?? -1;
          break;
        case 'discipline':
          valA = a.kpi?.taskDisciplineRate ?? -1;
          valB = b.kpi?.taskDisciplineRate ?? -1;
          break;
        case 'lost':
          valA = a.kpi?.lostLeadsCount ?? 0;
          valB = b.kpi?.lostLeadsCount ?? 0;
          break;
        default:
          valA = a.kpi?.salesVolume ?? 0;
          valB = b.kpi?.salesVolume ?? 0;
      }
      return sortOrder === 'asc' ? valA - valB : valB - valA;
    });
  }, [managers, sortKey, sortOrder]);

  const formatMoney = (amount) => {
    if (!amount) return '0 сомони';
    return Number(amount).toLocaleString('ru-RU') + ' сомони';
  };

  return (
    <div className="space-y-6">
      {/* 1. Header & Filters Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-white p-4 border border-slate-200 shadow-2xs">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          {/* Period Selector */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs">
            <Calendar className="h-4 w-4 text-slate-400" />
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="bg-transparent font-bold text-slate-800 outline-none cursor-pointer"
            >
              <option value="all">За всё время</option>
              <option value="month">Текущий месяц</option>
              <option value="last_month">Прошлый месяц</option>
              <option value="quarter">Текущий квартал</option>
              <option value="week">Текущая неделя</option>
              <option value="today">Сегодня</option>
              <option value="custom">Произвольный период</option>
            </select>
          </div>

          {period === 'custom' && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-800"
              />
              <span className="text-slate-400 text-xs">—</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-800"
              />
              <button
                onClick={fetchPerformance}
                className="px-2.5 py-1 text-xs font-bold bg-tozon-blue text-white rounded-lg hover:bg-tozon-blue-hover transition"
              >
                Применить
              </button>
            </div>
          )}

          {/* Manager Selector (Disabled if Restricted to Self) */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs">
            <Users className="h-4 w-4 text-slate-400" />
            <select
              value={selectedManagerId}
              disabled={isRestrictedToSelf}
              onChange={(e) => setSelectedManagerId(e.target.value)}
              className={`bg-transparent font-bold text-slate-800 outline-none ${
                isRestrictedToSelf ? 'cursor-not-allowed opacity-75' : 'cursor-pointer'
              }`}
            >
              {!isRestrictedToSelf && <option value="ALL">Вся команда (Отдел продаж)</option>}
              {managers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.role === 'ADMIN' ? 'Админ' : 'Менеджер'})
                </option>
              ))}
            </select>
            {isRestrictedToSelf && (
              <span className="ml-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700">
                Мои показатели
              </span>
            )}
          </div>

          {/* Project Selector */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs">
            <Building2 className="h-4 w-4 text-slate-400" />
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="bg-transparent font-bold text-slate-800 outline-none cursor-pointer"
            >
              <option value="ALL">Все объекты ЖК</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Refresh Button */}
        <button
          onClick={fetchPerformance}
          disabled={isLoading}
          className="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-xl transition cursor-pointer"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Обновить</span>
        </button>
      </div>

      {/* Error state */}
      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-800 flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-rose-600 shrink-0" />
          <div className="text-xs font-semibold">{error}</div>
        </div>
      )}

      {/* 2. Interactive KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Новые лиды */}
        <div
          onClick={() => navigate(data?.summaryDrilldown?.newLeads || '/leads?status=NEW')}
          className="rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50/50 to-white p-4 shadow-2xs hover:shadow-md hover:border-blue-300 transition cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wider">Новые за период</span>
            <ArrowUpRight className="h-4 w-4 text-blue-400 group-hover:text-blue-600 transition" />
          </div>
          <div className="text-3xl font-black text-blue-950 mt-2">{summary.newLeadsPeriod ?? 0}</div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
            <span>В очереди сейчас (NEW): {summary.currentNewQueue ?? 0}</span>
          </div>
        </div>

        {/* KPI 2: Лиды в работе */}
        <div
          onClick={() => navigate(data?.summaryDrilldown?.activeLeads || '/leads?tab=control')}
          className="rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50/50 to-white p-4 shadow-2xs hover:shadow-md hover:border-indigo-300 transition cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-indigo-700 uppercase tracking-wider">В работе / Переговоры</span>
            <ArrowUpRight className="h-4 w-4 text-indigo-400 group-hover:text-indigo-600 transition" />
          </div>
          <div className="text-3xl font-black text-indigo-950 mt-2">{summary.activeLeadsPortfolio ?? 0}</div>
          <div className="text-[11px] text-slate-500 mt-1">Текущий портфель активных клиентов</div>
        </div>

        {/* KPI 3: Подписанные действующие договоры */}
        <div
          onClick={() => navigate(data?.summaryDrilldown?.signedDeals || '/deals?status=SIGNED')}
          className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50/50 to-white p-4 shadow-2xs hover:shadow-md hover:border-emerald-300 transition cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">Действующие договоры</span>
            <ArrowUpRight className="h-4 w-4 text-emerald-400 group-hover:text-emerald-600 transition" />
          </div>
          <div className="text-3xl font-black text-emerald-950 mt-2">{summary.signedDealsCount ?? 0}</div>
          <div className="text-[11px] font-bold text-emerald-700 mt-1">{formatMoney(summary.salesVolume)}</div>
        </div>

        {/* KPI 4: Расторгнутые договоры (Отдельная прозрачная карточка) */}
        <div
          onClick={() => navigate(data?.summaryDrilldown?.cancelledDeals || '/deals?status=CANCELLED')}
          className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-4 shadow-2xs hover:shadow-md hover:border-slate-300 transition cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Расторгнуто договоров</span>
            <ArrowUpRight className="h-4 w-4 text-slate-400 group-hover:text-slate-600 transition" />
          </div>
          <div className="text-3xl font-black text-slate-700 mt-2">{summary.cancelledDealsCount ?? 0}</div>
          <div className="text-[11px] text-slate-400 mt-1">Исключены из действующих продаж</div>
        </div>
      </div>

      {/* Secondary KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 5: Конверсия когорты */}
        <div className="rounded-2xl border border-purple-200 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-purple-700 uppercase tracking-wider">Конверсия когорты</span>
            <Percent className="h-4 w-4 text-purple-400" />
          </div>
          <div className="text-2xl font-black text-purple-950 mt-2">
            {summary.cohortConversionLabel || 'Недостаточно данных'}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Когорта лидов периода: {summary.cohortLeadsCount ?? 0}
          </div>
        </div>

        {/* KPI 6: Среднее время первого действия в CRM */}
        <div className="rounded-2xl border border-amber-200 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">Реакция в CRM (TTFA)</span>
            <Clock className="h-4 w-4 text-amber-500" />
          </div>
          <div className="text-xl font-black text-amber-950 mt-2">
            {summary.avgFirstActionLabel || 'Нет зафиксированных действий'}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">В рабочих часах 08:00–20:00 Asia/Dushanbe</div>
        </div>

        {/* KPI 7: Дисциплина выполнения задач */}
        <div
          onClick={() => navigate(data?.summaryDrilldown?.tasksOverdue || '/tasks?filter=overdue')}
          className="rounded-2xl border border-teal-200 bg-white p-4 shadow-2xs hover:shadow-md transition cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-teal-700 uppercase tracking-wider">Дисциплина задач</span>
            <ArrowUpRight className="h-4 w-4 text-teal-400 group-hover:text-teal-600 transition" />
          </div>
          <div className="text-2xl font-black text-teal-950 mt-2">{summary.taskDisciplineLabel || '—'}</div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
            <span className="text-emerald-600 font-semibold">Вовремя: {summary.tasksCompletedOnTime ?? 0}</span>
            <span className="text-rose-600 font-semibold">Просрочено: {summary.tasksCurrentlyOverdue ?? 0}</span>
          </div>
        </div>

        {/* KPI 8 & 9: Потерянные клиенты и Неназначенные */}
        <div
          onClick={() => navigate(data?.summaryDrilldown?.lostLeads || '/leads?status=LOST')}
          className="rounded-2xl border border-rose-200 bg-white p-4 shadow-2xs hover:shadow-md transition cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-rose-700 uppercase tracking-wider">Отказы / Не назначено</span>
            <ArrowUpRight className="h-4 w-4 text-rose-400 group-hover:text-rose-600 transition" />
          </div>
          <div className="text-2xl font-black text-rose-950 mt-2">
            {summary.lostLeadsCount ?? 0} <span className="text-sm font-normal text-slate-400">отказов</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
            <span>Без менеджера: {systemWide.unassignedActiveLeads ?? 0}</span>
            <span className="font-bold text-rose-600">{systemWide.unassignedLabel || '0%'}</span>
          </div>
        </div>
      </div>

      {/* 3. Managers Comparative Table (Only for Director & Admin) */}
      {!isRestrictedToSelf && managers.length > 0 && (
        <div className="rounded-2xl bg-white border border-slate-200 shadow-2xs overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black text-slate-900">Сравнение эффективности менеджеров</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Продажи отнесены строго к менеджеру сделки, лиды — к ответственному сотруднику
              </p>
            </div>
            <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-lg">
              Сотрудников: {managers.length}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/75 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                  <th onClick={() => handleSort('name')} className="px-6 py-3 cursor-pointer hover:text-slate-800 transition select-none">
                    Менеджер {sortKey === 'name' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
                  </th>
                  <th onClick={() => handleSort('activeLeads')} className="px-4 py-3 text-center cursor-pointer hover:text-slate-800 transition select-none">
                    Лидов в работе {sortKey === 'activeLeads' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
                  </th>
                  <th onClick={() => handleSort('newLeads')} className="px-4 py-3 text-center cursor-pointer hover:text-slate-800 transition select-none">
                    Новых за период {sortKey === 'newLeads' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
                  </th>
                  <th onClick={() => handleSort('signedDeals')} className="px-4 py-3 text-center cursor-pointer hover:text-slate-800 transition select-none">
                    Действующих сделок {sortKey === 'signedDeals' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
                  </th>
                  <th onClick={() => handleSort('salesVolume')} className="px-4 py-3 text-right cursor-pointer hover:text-slate-800 transition select-none">
                    Сумма продаж {sortKey === 'salesVolume' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
                  </th>
                  <th onClick={() => handleSort('conversion')} className="px-4 py-3 text-center cursor-pointer hover:text-slate-800 transition select-none">
                    Конверсия {sortKey === 'conversion' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
                  </th>
                  <th className="px-4 py-3 text-center">Реакция в CRM</th>
                  <th onClick={() => handleSort('discipline')} className="px-4 py-3 text-center cursor-pointer hover:text-slate-800 transition select-none">
                    Задачи (Вс / Пр) {sortKey === 'discipline' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
                  </th>
                  <th onClick={() => handleSort('lost')} className="px-4 py-3 text-center cursor-pointer hover:text-slate-800 transition select-none">
                    Отказы {sortKey === 'lost' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                {sortedManagers.map((m) => {
                  const k = m.kpi || {};
                  return (
                    <tr key={m.id} className="hover:bg-slate-50/80 transition">
                      <td className="px-6 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-700 text-xs shrink-0">
                            {m.name.charAt(0)}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900">{m.name}</div>
                            <div className="text-[10px] text-slate-400">
                              {m.role === 'ADMIN' ? 'Администратор' : 'Менеджер по продажам'}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Лидов в работе (Кликабельно) */}
                      <td className="px-4 py-3.5 text-center">
                        <button
                          onClick={() => navigate(m.drilldownUrls?.activeLeads || `/leads?responsibleUserId=${m.id}`)}
                          className="font-bold text-indigo-700 hover:text-indigo-900 hover:underline cursor-pointer"
                        >
                          {k.activeLeadsPortfolio ?? 0}
                        </button>
                      </td>

                      {/* Новых за период */}
                      <td className="px-4 py-3.5 text-center font-semibold text-slate-700">
                        {k.newLeadsPeriod ?? 0}
                      </td>

                      {/* Сделок подписано (Кликабельно) */}
                      <td className="px-4 py-3.5 text-center">
                        <button
                          onClick={() => navigate(m.drilldownUrls?.signedDeals || `/deals?responsibleUserId=${m.id}&status=SIGNED`)}
                          className="font-black text-emerald-700 hover:text-emerald-900 hover:underline cursor-pointer"
                        >
                          {k.signedDealsCount ?? 0}
                        </button>
                      </td>

                      {/* Сумма продаж */}
                      <td className="px-4 py-3.5 text-right font-black text-slate-900">
                        {formatMoney(k.salesVolume)}
                      </td>

                      {/* Конверсия когорты */}
                      <td className="px-4 py-3.5 text-center font-bold text-purple-700">
                        {k.cohortConversionLabel}
                      </td>

                      {/* Реакция */}
                      <td className="px-4 py-3.5 text-center text-[11px] text-slate-600">
                        {k.avgFirstActionLabel}
                      </td>

                      {/* Задачи: Вовремя / Просрочено */}
                      <td className="px-4 py-3.5 text-center">
                        <button
                          onClick={() => navigate(m.drilldownUrls?.tasksOverdue || `/tasks?assignedTo=${m.id}`)}
                          className="hover:underline cursor-pointer"
                        >
                          <span className="font-bold text-emerald-700">{k.tasksCompletedOnTime ?? 0}</span>
                          <span className="text-slate-400 mx-1">/</span>
                          <span className="font-bold text-rose-600">{k.tasksCurrentlyOverdue ?? 0}</span>
                        </button>
                      </td>

                      {/* Отказы */}
                      <td className="px-4 py-3.5 text-center font-semibold text-rose-700">
                        {k.lostLeadsCount ?? 0}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. Funnel and Loss Reasons Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Funnel */}
        <div className="rounded-2xl bg-white border border-slate-200 p-6 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-black text-slate-900">Воронка продаж CRM</h3>
            <span className="text-xs text-slate-400">Этапы конверсии клиентов</span>
          </div>

          <div className="space-y-3">
            {funnel.map((stage) => {
              const maxCount = Math.max(...funnel.map((s) => s.count), 1);
              const widthPct = Math.max(8, Math.round((stage.count / maxCount) * 100));

              return (
                <div key={stage.status} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-700">{stage.label}</span>
                    <span className="font-black text-slate-900">{stage.count}</span>
                  </div>
                  <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${widthPct}%`, backgroundColor: stage.color }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Reasons for Loss Breakdown */}
        <div className="rounded-2xl bg-white border border-slate-200 p-6 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-black text-slate-900">Причины отказов клиентов</h3>
            <span className="text-xs text-slate-400">Всего отказов: {summary.lostLeadsCount ?? 0}</span>
          </div>

          {lostReasons.length === 0 ? (
            <div className="h-40 flex flex-col items-center justify-center text-slate-400 text-xs">
              <CheckCircle2 className="h-8 w-8 text-emerald-400 mb-2" />
              <span>За выбранный период отказов не зафиксировано</span>
            </div>
          ) : (
            <div className="space-y-3">
              {lostReasons.map((r) => (
                <div key={r.code} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700">{r.label}</span>
                    <span className="font-bold text-slate-900">
                      {r.count} <span className="text-slate-400 font-normal">({r.pct}%)</span>
                    </span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-rose-500 rounded-full transition-all duration-500"
                      style={{ width: `${r.pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
