import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import { useAuth } from '../auth/AuthContext';
import {
  TrendingUp,
  BarChart3,
  Calendar,
  PhoneCall,
  Users,
  FileCheck,
  CheckCircle2,
  Clock,
  AlertTriangle,
  DollarSign,
  Building2,
  Home,
  RefreshCw,
  Loader2,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  Info,
  Layers,
  ArrowUpRight,
  UserCheck,
  FileSpreadsheet
} from 'lucide-react';

// Dushanbe business date helper (YYYY-MM-DD)
const getDushanbeToday = () => {
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dushanbe' }).format(new Date());
  } catch {
    return new Date().toISOString().split('T')[0];
  }
};

export const SalesManagementDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const isSupervisor = ['ADMIN', 'DIRECTOR'].includes(user?.role);
  const isSalesManager = user?.role === 'SALES_MANAGER';

  // Sub-tabs: 'daily', 'weekly', 'blocks'
  const [activeSubTab, setActiveSubTab] = useState('daily');

  // Filter states
  const [selectedDate, setSelectedDate] = useState(getDushanbeToday());
  const [selectedWeeksCount, setSelectedWeeksCount] = useState(8);
  const [selectedBlockPeriod, setSelectedBlockPeriod] = useState(getDushanbeToday().slice(0, 7));
  const [selectedProjectId, setSelectedProjectId] = useState('ALL');
  const [selectedBuildingId, setSelectedBuildingId] = useState('ALL');
  const [selectedManagerId, setSelectedManagerId] = useState('ALL');

  // Data states
  const [dailyData, setDailyData] = useState(null);
  const [weeklyData, setWeeklyData] = useState(null);
  const [blockPlanFactData, setBlockPlanFactData] = useState(null);
  const [projects, setProjects] = useState([]);

  // UI state
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState(null);

  // Export full sales management analytics to Excel (.xlsx)
  const handleExportExcel = async () => {
    setIsExporting(true);
    try {
      const params = new URLSearchParams();
      params.set('date', selectedDate);
      params.set('weeksCount', selectedWeeksCount);
      params.set('period', selectedBlockPeriod);
      if (selectedProjectId !== 'ALL') params.set('projectId', selectedProjectId);
      if (selectedBuildingId !== 'ALL') params.set('buildingId', selectedBuildingId);
      if (selectedManagerId !== 'ALL') params.set('managerId', selectedManagerId);

      const res = await api.get(`/reports/sales-management/export.xlsx?${params.toString()}`, {
        responseType: 'blob'
      });

      const blob = res instanceof Blob ? res : new Blob([res], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `tozon-sales-management-${selectedDate}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to export Excel report:', err);
      alert('Ошибка при формировании Excel книги. Проверьте права доступа.');
    } finally {
      setIsExporting(false);
    }
  };

  // Drilldown modal state
  const [drilldownModal, setDrilldownModal] = useState({
    isOpen: false,
    title: '',
    type: '', // 'leads', 'calls', 'meetings', 'reservations', 'signedDeals', 'payments', 'overdueTasks', 'cancelledDeals'
    items: [],
    periodInfo: ''
  });

  // Modal search and pagination
  const [modalSearch, setModalSearch] = useState('');
  const [modalPage, setModalPage] = useState(1);
  const pageSize = 10;

  // Fetch Projects list
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const res = await api.get('/projects');
        const list = res.data?.projects || res.projects || res.data || [];
        if (Array.isArray(list)) {
          setProjects(list);
        }
      } catch (err) {
        console.error('Failed to load projects list:', err);
      }
    };
    fetchProjects();
  }, []);

  // Fetch report data based on active sub-tab
  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      if (activeSubTab === 'daily') {
        const params = { date: selectedDate };
        if (selectedProjectId !== 'ALL') params.projectId = selectedProjectId;
        if (selectedBuildingId !== 'ALL') params.buildingId = selectedBuildingId;
        if (selectedManagerId !== 'ALL') params.managerId = selectedManagerId;

        const res = await api.get('/reports/daily-briefing', { params });
        setDailyData(res.data || res);
      } else if (activeSubTab === 'weekly') {
        const params = {
          weeksCount: selectedWeeksCount,
          year: parseInt(selectedDate.split('-')[0], 10) || 2026
        };
        if (selectedProjectId !== 'ALL') params.projectId = selectedProjectId;
        if (selectedBuildingId !== 'ALL') params.buildingId = selectedBuildingId;
        if (selectedManagerId !== 'ALL') params.managerId = selectedManagerId;

        const res = await api.get('/reports/weekly-dynamics', { params });
        setWeeklyData(res.data || res);
      } else if (activeSubTab === 'blocks') {
        const params = { period: selectedBlockPeriod };
        if (selectedProjectId !== 'ALL') params.projectId = selectedProjectId;
        if (selectedManagerId !== 'ALL') params.managerId = selectedManagerId;

        const res = await api.get('/reports/plan-fact/blocks', { params });
        setBlockPlanFactData(res.data || res);
      }
    } catch (err) {
      console.error(`Error loading report [${activeSubTab}]:`, err);
      if (err.response?.status === 403) {
        setError('Доступ к аналитике управления продажами ограничен вашей ролью.');
      } else {
        setError('Не удалось загрузить аналитические данные. Проверьте соединение с сервером.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [
    activeSubTab,
    selectedDate,
    selectedWeeksCount,
    selectedBlockPeriod,
    selectedProjectId,
    selectedBuildingId,
    selectedManagerId
  ]);

  // Open drilldown modal
  const openDrilldown = (title, type, items = [], periodInfo = '') => {
    setDrilldownModal({
      isOpen: true,
      title,
      type,
      items: items || [],
      periodInfo
    });
    setModalSearch('');
    setModalPage(1);
  };

  const closeDrilldown = () => {
    setDrilldownModal({
      isOpen: false,
      title: '',
      type: '',
      items: [],
      periodInfo: ''
    });
    setModalSearch('');
    setModalPage(1);
  };

  // Filtered & Paginated items for Drilldown
  const filteredModalItems = useMemo(() => {
    if (!drilldownModal.items || drilldownModal.items.length === 0) return [];
    if (!modalSearch.trim()) return drilldownModal.items;

    const term = modalSearch.toLowerCase().trim();
    return drilldownModal.items.filter((item) => {
      const matchName = item.fullName?.toLowerCase().includes(term) || item.clientName?.toLowerCase().includes(term);
      const matchPhone = item.phone?.toLowerCase().includes(term);
      const matchContract = item.contractNumber?.toLowerCase().includes(term);
      const matchUnit = String(item.unitNumber || '').toLowerCase().includes(term);
      const matchManager = item.managerName?.toLowerCase().includes(term);
      const matchTitle = item.title?.toLowerCase().includes(term);
      return matchName || matchPhone || matchContract || matchUnit || matchManager || matchTitle;
    });
  }, [drilldownModal.items, modalSearch]);

  const totalPages = Math.ceil(filteredModalItems.length / pageSize) || 1;
  const paginatedModalItems = useMemo(() => {
    const start = (modalPage - 1) * pageSize;
    return filteredModalItems.slice(start, start + pageSize);
  }, [filteredModalItems, modalPage]);

  // Quick date chips
  const setQuickDate = (daysAgo) => {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    try {
      const formatted = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dushanbe' }).format(d);
      setSelectedDate(formatted);
    } catch {
      setSelectedDate(d.toISOString().split('T')[0]);
    }
  };

  return (
    <div className="space-y-6">
      {/* RBAC Notice for Managers */}
      {isSalesManager && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center justify-between text-amber-900 text-xs">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="h-5 w-5 text-amber-600 shrink-0" />
            <div>
              <span className="font-bold">Режим персональной аналитики менеджера:</span>{' '}
              <span>
                Отображаются только ваши показатели (лиды, звонки, брони, договоры, задачи). Ограничение защищено на стороне сервера.
              </span>
            </div>
          </div>
          <span className="text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-800 px-2 py-0.5 rounded-md border border-amber-300">
            RBAC Защита
          </span>
        </div>
      )}

      {/* Header and Controls */}
      <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-2xs space-y-4">
        {/* Sub-tab Switcher & Main Controls */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <TrendingUp className="h-6 w-6 text-blue-600" />
              <span>Панель управления продажами (Phase 3.7)</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Оперативная сводка дня, понедельная динамика темпа продаж и план-факт по блокам с прозрачной детализацией
            </p>
          </div>

          {/* Sub-tab Navigation */}
          <div className="flex items-center gap-1 bg-slate-100 p-1.5 rounded-2xl self-start md:self-auto">
            <button
              onClick={() => setActiveSubTab('daily')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition cursor-pointer flex items-center gap-1.5 ${
                activeSubTab === 'daily'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Clock className="h-3.5 w-3.5" />
              <span>Ежедневная сводка</span>
            </button>
            <button
              onClick={() => setActiveSubTab('weekly')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition cursor-pointer flex items-center gap-1.5 ${
                activeSubTab === 'weekly'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BarChart3 className="h-3.5 w-3.5" />
              <span>Недельная динамика</span>
            </button>
            <button
              onClick={() => setActiveSubTab('blocks')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition cursor-pointer flex items-center gap-1.5 ${
                activeSubTab === 'blocks'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Building2 className="h-3.5 w-3.5" />
              <span>План-факт по блокам</span>
            </button>
          </div>
        </div>

        {/* Dynamic Filter Controls Bar */}
        <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            {/* Daily Date Selector */}
            {activeSubTab === 'daily' && (
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-500">Дата сводки:</span>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setQuickDate(0)}
                    className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[10px] transition cursor-pointer"
                  >
                    Сегодня
                  </button>
                  <button
                    onClick={() => setQuickDate(1)}
                    className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[10px] transition cursor-pointer"
                  >
                    Вчера
                  </button>
                </div>
              </div>
            )}

            {/* Weekly Weeks Count Selector */}
            {activeSubTab === 'weekly' && (
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-500">Горизонт анализа:</span>
                <select
                  value={selectedWeeksCount}
                  onChange={(e) => setSelectedWeeksCount(Number(e.target.value))}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={4}>Последние 4 недели (1 месяц)</option>
                  <option value={8}>Последние 8 недель (2 месяца)</option>
                  <option value={12}>Последние 12 недель (1 квартал)</option>
                </select>
              </div>
            )}

            {/* Blocks Month Period Selector */}
            {activeSubTab === 'blocks' && (
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-500">Отчетный месяц:</span>
                <select
                  value={selectedBlockPeriod}
                  onChange={(e) => setSelectedBlockPeriod(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="2026-11">Ноябрь 2026</option>
                  <option value="2026-10">Октябрь 2026</option>
                  <option value="2026-09">Сентябрь 2026</option>
                  <option value="2026-08">Август 2026</option>
                </select>
              </div>
            )}

            {/* Common: Project Filter */}
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-slate-500">ЖК:</span>
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="ALL">Все объекты</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Manager Filter (Supervisor Only) */}
            {isSupervisor && (
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-slate-500">Менеджер:</span>
                <select
                  value={selectedManagerId}
                  onChange={(e) => setSelectedManagerId(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="ALL">Вся команда</option>
                  <option value="3">Дадочон Саидов (Менеджер 1)</option>
                  <option value="1">Admin (Руководство)</option>
                </select>
              </div>
            )}
          </div>

          {/* Action Buttons: Export Excel & Refresh */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportExcel}
              disabled={isExporting}
              title="Экспорт полной аналитики в книгу Excel (.xlsx)"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white border border-emerald-200 hover:border-emerald-600 text-xs font-bold transition cursor-pointer disabled:opacity-60 shadow-2xs"
            >
              {isExporting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <FileSpreadsheet className="h-3.5 w-3.5" />
              )}
              <span>{isExporting ? 'Формирование...' : 'Скачать Excel'}</span>
            </button>

            <button
              onClick={fetchData}
              title="Обновить аналитику"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Обновить</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main View Area with Loading, Error and Empty States */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center p-20 bg-white rounded-3xl border border-slate-200">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-3" />
          <p className="text-sm font-bold text-slate-700">Сборка данных оперативного управления...</p>
          <p className="text-xs text-slate-400 mt-1">Проверка целостности и расчет показателей в таймзоне Asia/Dushanbe</p>
        </div>
      ) : error ? (
        <div className="p-8 bg-rose-50 border border-rose-200 rounded-3xl text-center space-y-3">
          <AlertCircle className="h-8 w-8 text-rose-600 mx-auto" />
          <p className="text-sm font-bold text-rose-800">{error}</p>
          <button
            onClick={fetchData}
            className="inline-flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-xs"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Повторить загрузку</span>
          </button>
        </div>
      ) : (
        <>
          {/* ======================================================== */}
          {/* VIEW 1: DAILY BRIEFING (ЕЖЕДНЕВНАЯ СВОДКА)              */}
          {/* ======================================================== */}
          {activeSubTab === 'daily' && dailyData && (
            <div className="space-y-6">
              {/* Daily KPI Metric Cards Grid (Interactive Drilldown) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* 1. New Leads */}
                <div
                  onClick={() =>
                    openDrilldown(
                      'Новые лиды за день',
                      'leads',
                      dailyData.drilldowns?.newLeads || [],
                      `Дата: ${dailyData.date}`
                    )
                  }
                  className="rounded-3xl border border-blue-200 bg-white p-5 shadow-2xs hover:border-blue-400 hover:shadow-xs transition cursor-pointer group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wider">Новые лиды</span>
                    <span className="p-1.5 rounded-xl bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition">
                      <Users className="h-4 w-4" />
                    </span>
                  </div>
                  <div className="text-3xl font-black text-slate-900 mt-2">
                    {dailyData.summary?.newLeadsCount || 0}
                    <span className="text-xs font-bold text-slate-400 ml-1.5">обращений</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-blue-600 font-bold mt-3 pt-2 border-t border-slate-100">
                    <span>Показать реестр лидов</span>
                    <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition" />
                  </div>
                </div>

                {/* 2. Completed Calls & Meetings */}
                <div
                  onClick={() =>
                    openDrilldown(
                      'Выполненные звонки и встречи',
                      'calls',
                      [
                        ...(dailyData.drilldowns?.completedCalls || []),
                        ...(dailyData.drilldowns?.completedMeetings || [])
                      ],
                      `Дата: ${dailyData.date}`
                    )
                  }
                  className="rounded-3xl border border-indigo-200 bg-white p-5 shadow-2xs hover:border-indigo-400 hover:shadow-xs transition cursor-pointer group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-indigo-700 uppercase tracking-wider">Звонки / Встречи</span>
                    <span className="p-1.5 rounded-xl bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition">
                      <PhoneCall className="h-4 w-4" />
                    </span>
                  </div>
                  <div className="text-3xl font-black text-slate-900 mt-2">
                    {dailyData.summary?.completedCallsCount || 0}{' '}
                    <span className="text-slate-300 font-normal">/</span>{' '}
                    {dailyData.summary?.completedMeetingsCount || 0}
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-indigo-600 font-bold mt-3 pt-2 border-t border-slate-100">
                    <span>Всего взаимодействий: {dailyData.summary?.totalCompletedInteractions || 0}</span>
                    <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition" />
                  </div>
                </div>

                {/* 3. New Reservations */}
                <div
                  onClick={() =>
                    openDrilldown(
                      'Новые бронирования за день',
                      'reservations',
                      dailyData.drilldowns?.newReservations || [],
                      `Дата: ${dailyData.date}`
                    )
                  }
                  className="rounded-3xl border border-cyan-200 bg-white p-5 shadow-2xs hover:border-cyan-400 hover:shadow-xs transition cursor-pointer group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-cyan-700 uppercase tracking-wider">Новые бронирования</span>
                    <span className="p-1.5 rounded-xl bg-cyan-50 text-cyan-600 group-hover:bg-cyan-600 group-hover:text-white transition">
                      <Home className="h-4 w-4" />
                    </span>
                  </div>
                  <div className="text-3xl font-black text-slate-900 mt-2">
                    {dailyData.summary?.newReservationsCount || 0}
                    <span className="text-xs font-bold text-slate-400 ml-1.5">квартир</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-cyan-700 font-bold mt-3 pt-2 border-t border-slate-100">
                    <span>Объем: ${dailyData.summary?.newReservationsVolumeUsd?.toLocaleString('ru-RU') || '0'}</span>
                    <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition" />
                  </div>
                </div>

                {/* 4. Signed Contracts */}
                <div
                  onClick={() =>
                    openDrilldown(
                      'Подписанные договоры за день',
                      'signedDeals',
                      dailyData.drilldowns?.signedDeals || [],
                      `Дата: ${dailyData.date}`
                    )
                  }
                  className="rounded-3xl border border-emerald-300 bg-white p-5 shadow-2xs hover:border-emerald-500 hover:shadow-xs transition cursor-pointer group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">Подписано договоров</span>
                    <span className="p-1.5 rounded-xl bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition">
                      <FileCheck className="h-4 w-4" />
                    </span>
                  </div>
                  <div className="text-3xl font-black text-slate-900 mt-2">
                    {dailyData.summary?.signedDealsCount || 0}
                    <span className="text-xs font-bold text-slate-400 ml-1.5">сделок</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-emerald-700 font-bold mt-3 pt-2 border-t border-slate-100">
                    <span>
                      ${dailyData.summary?.signedDealsVolumeUsd?.toLocaleString('ru-RU') || '0'} ({dailyData.summary?.signedAreaM2 || 0} м²)
                    </span>
                    <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition" />
                  </div>
                </div>
              </div>

              {/* Cash Collections & Overdue Tasks Bar */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* USD Cash Collection */}
                <div
                  onClick={() =>
                    openDrilldown(
                      'Кассовые поступления USD за день',
                      'payments',
                      (dailyData.drilldowns?.postedPayments || []).filter((p) => p.currency === 'USD'),
                      `Дата: ${dailyData.date} | Валюта: USD`
                    )
                  }
                  className="rounded-3xl border border-emerald-200 bg-emerald-50/50 p-5 shadow-2xs hover:border-emerald-400 transition cursor-pointer group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">Поступления USD (касса/банк)</span>
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-emerald-200/80 text-emerald-900">USD</span>
                  </div>
                  <div className="text-2xl font-black text-emerald-950 mt-2">
                    ${dailyData.summary?.collectedCashUsd?.toLocaleString('ru-RU') || '0.00'}
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-emerald-800 font-semibold mt-2">
                    <span>Платежей: {dailyData.summary?.collectedCashByCurrency?.usd?.count || 0} шт</span>
                    <span className="underline group-hover:text-emerald-950">Реестр операций →</span>
                  </div>
                </div>

                {/* TJS Cash Collection */}
                <div
                  onClick={() =>
                    openDrilldown(
                      'Кассовые поступления TJS за день',
                      'payments',
                      (dailyData.drilldowns?.postedPayments || []).filter((p) => p.currency === 'TJS'),
                      `Дата: ${dailyData.date} | Валюта: TJS`
                    )
                  }
                  className="rounded-3xl border border-indigo-200 bg-indigo-50/50 p-5 shadow-2xs hover:border-indigo-400 transition cursor-pointer group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-indigo-800 uppercase tracking-wider">Поступления TJS (сомони)</span>
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-indigo-200/80 text-indigo-900">TJS</span>
                  </div>
                  <div className="text-2xl font-black text-indigo-950 mt-2">
                    {dailyData.summary?.collectedCashTjs?.toLocaleString('ru-RU') || '0.00'}{' '}
                    <span className="text-sm font-bold text-indigo-700">TJS</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-indigo-800 font-semibold mt-2">
                    <span>Платежей: {dailyData.summary?.collectedCashByCurrency?.tjs?.count || 0} шт</span>
                    <span className="underline group-hover:text-indigo-950">Реестр операций →</span>
                  </div>
                </div>

                {/* Overdue Tasks */}
                <div
                  onClick={() =>
                    openDrilldown(
                      'Просроченные задачи менеджеров',
                      'overdueTasks',
                      dailyData.drilldowns?.overdueTasks || [],
                      `Дата контроля: ${dailyData.date}`
                    )
                  }
                  className={`rounded-3xl border p-5 shadow-2xs hover:shadow-xs transition cursor-pointer group ${
                    (dailyData.summary?.overdueTasksCount || 0) > 0
                      ? 'border-rose-200 bg-rose-50/50'
                      : 'border-slate-200 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-[11px] font-bold uppercase tracking-wider ${
                        (dailyData.summary?.overdueTasksCount || 0) > 0 ? 'text-rose-800' : 'text-slate-500'
                      }`}
                    >
                      Просроченные задачи
                    </span>
                    <span
                      className={`p-1.5 rounded-xl ${
                        (dailyData.summary?.overdueTasksCount || 0) > 0
                          ? 'bg-rose-100 text-rose-700'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      <AlertTriangle className="h-4 w-4" />
                    </span>
                  </div>
                  <div
                    className={`text-2xl font-black mt-2 ${
                      (dailyData.summary?.overdueTasksCount || 0) > 0 ? 'text-rose-950' : 'text-slate-900'
                    }`}
                  >
                    {dailyData.summary?.overdueTasksCount || 0}
                    <span className="text-xs font-bold text-slate-400 ml-1.5">задач</span>
                  </div>
                  <div
                    className={`flex items-center justify-between text-[11px] font-semibold mt-2 ${
                      (dailyData.summary?.overdueTasksCount || 0) > 0 ? 'text-rose-700' : 'text-slate-500'
                    }`}
                  >
                    <span>Требуют срочного контроля</span>
                    <span className="underline">Открыть список →</span>
                  </div>
                </div>
              </div>

              {/* Financial Integrity Badge */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-start gap-3 text-xs text-slate-600">
                <Info className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-slate-800">Финансовая изоляция:</span> Фактические поступления в USD и TJS отображают реально поступившие в кассу и банк платежи. Они строго изолированы от объема подписанных договоров и не суммируются без официального валютного курса пересчета.
                </div>
              </div>

              {/* Manager Daily Breakdown Table */}
              <div className="rounded-3xl bg-white border border-slate-200 p-6 shadow-2xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900">Персональная активность менеджеров за день</h3>
                    <p className="text-xs text-slate-500">
                      Индивидуальные результаты обработки обращений, встреч, закрытия сделок и соблюдения регламентов
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-slate-400 self-start sm:self-auto">
                    Кликните на показатель для открытия реестра записей
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                      <tr>
                        <th className="p-3 pl-4">Сотрудник</th>
                        <th className="p-3 text-center">Новые лиды</th>
                        <th className="p-3 text-center">Звонки / Встречи</th>
                        <th className="p-3 text-center">Брони (шт / $)</th>
                        <th className="p-3 text-center">Договоры (шт / $)</th>
                        <th className="p-3 text-right">Касса USD ($)</th>
                        <th className="p-3 text-right">Касса TJS (сомони)</th>
                        <th className="p-3 text-center pr-4">Просрочено задач</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {(dailyData.managerDailyBreakdown || []).map((m) => (
                        <tr key={m.managerId} className="hover:bg-slate-50 transition">
                          <td className="p-3 pl-4">
                            <div className="font-bold text-slate-900">{m.name}</div>
                            <div className="text-[10px] text-slate-400">
                              {m.role === 'ADMIN' ? 'Руководство' : 'Менеджер продаж'}
                            </div>
                          </td>

                          {/* Leads */}
                          <td className="p-3 text-center">
                            <button
                              onClick={() =>
                                openDrilldown(
                                  `Новые лиды: ${m.name}`,
                                  'leads',
                                  (dailyData.drilldowns?.newLeads || []).filter(
                                    (l) => Number(l.managerId) === Number(m.managerId)
                                  ),
                                  `Менеджер: ${m.name} | Дата: ${dailyData.date}`
                                )
                              }
                              className={`px-2 py-0.5 rounded font-bold cursor-pointer transition ${
                                m.newLeadsCount > 0 ? 'bg-blue-100 text-blue-800 hover:bg-blue-200' : 'text-slate-400'
                              }`}
                            >
                              {m.newLeadsCount}
                            </button>
                          </td>

                          {/* Calls / Meetings */}
                          <td className="p-3 text-center font-bold text-slate-700">
                            {m.completedCallsCount} / {m.completedMeetingsCount}
                          </td>

                          {/* Reservations */}
                          <td className="p-3 text-center">
                            <button
                              onClick={() =>
                                openDrilldown(
                                  `Бронирования: ${m.name}`,
                                  'reservations',
                                  (dailyData.drilldowns?.newReservations || []).filter(
                                    (r) => Number(r.managerId) === Number(m.managerId)
                                  ),
                                  `Менеджер: ${m.name} | Дата: ${dailyData.date}`
                                )
                              }
                              className={`px-2 py-0.5 rounded font-bold cursor-pointer transition ${
                                m.newReservationsCount > 0
                                  ? 'bg-cyan-100 text-cyan-800 hover:bg-cyan-200'
                                  : 'text-slate-400'
                              }`}
                            >
                              {m.newReservationsCount > 0 ? `${m.newReservationsCount} ($${m.newReservationsVolumeUsd.toLocaleString('ru-RU')})` : '0'}
                            </button>
                          </td>

                          {/* Signed Deals */}
                          <td className="p-3 text-center">
                            <button
                              onClick={() =>
                                openDrilldown(
                                  `Договоры: ${m.name}`,
                                  'signedDeals',
                                  (dailyData.drilldowns?.signedDeals || []).filter(
                                    (s) => Number(s.managerId) === Number(m.managerId)
                                  ),
                                  `Менеджер: ${m.name} | Дата: ${dailyData.date}`
                                )
                              }
                              className={`px-2 py-0.5 rounded font-bold cursor-pointer transition ${
                                m.signedDealsCount > 0
                                  ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                                  : 'text-slate-400'
                              }`}
                            >
                              {m.signedDealsCount > 0 ? `${m.signedDealsCount} ($${m.signedDealsVolumeUsd.toLocaleString('ru-RU')})` : '0'}
                            </button>
                          </td>

                          {/* Cash USD */}
                          <td className="p-3 text-right font-black text-emerald-700">
                            ${m.collectedCashUsd.toLocaleString('ru-RU')}
                          </td>

                          {/* Cash TJS */}
                          <td className="p-3 text-right font-black text-indigo-700">
                            {m.collectedCashTjs.toLocaleString('ru-RU')} TJS
                          </td>

                          {/* Overdue Tasks */}
                          <td className="p-3 text-center pr-4">
                            {m.overdueTasksCount > 0 ? (
                              <button
                                onClick={() =>
                                  openDrilldown(
                                    `Просроченные задачи: ${m.name}`,
                                    'overdueTasks',
                                    (dailyData.drilldowns?.overdueTasks || []).filter(
                                      (t) => Number(t.managerId) === Number(m.managerId)
                                    ),
                                    `Менеджер: ${m.name}`
                                  )
                                }
                                className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 font-bold hover:bg-rose-200 transition cursor-pointer"
                              >
                                {m.overdueTasksCount} задач
                              </button>
                            ) : (
                              <span className="text-slate-400">0</span>
                            )}
                          </td>
                        </tr>
                      ))}
                      {(dailyData.managerDailyBreakdown || []).length === 0 && (
                        <tr>
                          <td colSpan={8} className="p-6 text-center text-slate-400">
                            Нет зафиксированных активностей за выбранную дату
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* VIEW 2: WEEKLY DYNAMICS (НЕДЕЛЬНАЯ ДИНАМИКА)             */}
          {/* ======================================================== */}
          {activeSubTab === 'weekly' && weeklyData && (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-2xs">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Всего лидов за период</span>
                  <div className="text-2xl font-black text-slate-900 mt-1">
                    {weeklyData.summary?.totalLeadsCount || 0}
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Входящий трафик за {weeklyData.periodRange?.weeksCount || 0} нед.
                  </p>
                </div>

                <div className="rounded-3xl border border-cyan-200 bg-cyan-50/40 p-4 shadow-2xs">
                  <span className="text-[10px] font-bold text-cyan-800 uppercase">Новых броней</span>
                  <div className="text-2xl font-black text-cyan-950 mt-1">
                    {weeklyData.summary?.totalReservationsCount || 0}
                  </div>
                  <p className="text-[10px] text-cyan-700 mt-1 font-semibold">
                    ${weeklyData.summary?.totalReservationsVolumeUsd?.toLocaleString('ru-RU') || '0'}
                  </p>
                </div>

                <div className="rounded-3xl border border-emerald-200 bg-emerald-50/40 p-4 shadow-2xs">
                  <span className="text-[10px] font-bold text-emerald-800 uppercase">Подписано договоров</span>
                  <div className="text-2xl font-black text-emerald-950 mt-1">
                    {weeklyData.summary?.totalSignedDealsCount || 0}
                  </div>
                  <p className="text-[10px] text-emerald-700 mt-1 font-semibold">
                    ${weeklyData.summary?.totalSignedDealsVolumeUsd?.toLocaleString('ru-RU') || '0'} ({weeklyData.summary?.totalSignedAreaM2 || 0} м²)
                  </p>
                </div>

                <div className="rounded-3xl border border-emerald-200 bg-white p-4 shadow-2xs">
                  <span className="text-[10px] font-bold text-emerald-700 uppercase">Поступления USD ($)</span>
                  <div className="text-2xl font-black text-emerald-900 mt-1">
                    ${weeklyData.summary?.totalPaymentsVolumeUsd?.toLocaleString('ru-RU') || '0.00'}
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Всего платежей: {weeklyData.summary?.totalPaymentsCount || 0}
                  </p>
                </div>

                <div className="rounded-3xl border border-indigo-200 bg-white p-4 shadow-2xs">
                  <span className="text-[10px] font-bold text-indigo-700 uppercase">Поступления TJS (сомони)</span>
                  <div className="text-2xl font-black text-indigo-900 mt-1">
                    {weeklyData.summary?.totalPaymentsVolumeTjs?.toLocaleString('ru-RU') || '0.00'}{' '}
                    <span className="text-xs">TJS</span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">Раздельный учет наличности</p>
                </div>
              </div>

              {/* Conversion Methodology Callout - DATA INTEGRITY RULE 8 */}
              <div className="bg-blue-50/70 border border-blue-200 rounded-3xl p-5 shadow-2xs flex items-start gap-3.5">
                <Info className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                <div className="space-y-1 text-xs">
                  <h4 className="font-extrabold text-blue-950">
                    Методологическое правило: Периодный темп продаж vs Когортная конверсия
                  </h4>
                  <p className="text-blue-900/80 leading-relaxed">
                    Периодный показатель <strong>«Темп продаж к лидам»</strong> вычисляется как отношение фактически подписанных договоров за календарную неделю к числу зарегистрированных за эту же неделю лидов. Он отражает <em>скорость и интенсивность продаж (sales velocity)</em>, но <strong>не является когортной конверсией</strong> конкретного лида от первого обращения до сделки.
                  </p>
                </div>
              </div>

              {/* Weekly Progression Table with Clickable Metrics */}
              <div className="rounded-3xl bg-white border border-slate-200 p-6 shadow-2xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900">Понедельная хронология динамики продаж</h3>
                    <p className="text-xs text-slate-500">
                      Периоды разбиты с понедельника по воскресенье (ISO недели) в таймзоне Asia/Dushanbe
                    </p>
                  </div>
                  <span className="text-[10px] font-bold bg-slate-100 text-slate-700 px-3 py-1 rounded-xl">
                    Интервал: {weeklyData.periodRange?.startDate} — {weeklyData.periodRange?.endDate}
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                      <tr>
                        <th className="p-3 pl-4">Неделя (Пн–Вс)</th>
                        <th className="p-3 text-center">Лиды</th>
                        <th className="p-3 text-center">Брони (шт / $)</th>
                        <th className="p-3 text-center">Договоры (шт / $)</th>
                        <th className="p-3 text-center">Площадь (м²)</th>
                        <th className="p-3 text-right">Поступления USD ($)</th>
                        <th className="p-3 text-right">Поступления TJS</th>
                        <th className="p-3 text-center">Темп продаж</th>
                        <th className="p-3 text-center pr-4">Реестр</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {(weeklyData.weeks || []).map((w) => (
                        <tr key={`${w.year}-W${w.weekNumber}`} className="hover:bg-slate-50 transition">
                          <td className="p-3 pl-4 font-bold text-slate-900">
                            <div>{w.label}</div>
                            <div className="text-[10px] font-normal text-slate-400">
                              {w.startDate} – {w.endDate}
                            </div>
                          </td>

                          {/* Leads */}
                          <td className="p-3 text-center">
                            <button
                              onClick={() =>
                                openDrilldown(
                                  `Лиды недели ${w.label}`,
                                  'leads',
                                  w.drilldowns?.leads || [],
                                  `Период: ${w.startDate} — ${w.endDate}`
                                )
                              }
                              className={`px-2 py-0.5 rounded font-bold cursor-pointer transition ${
                                w.leadsCount > 0 ? 'bg-blue-100 text-blue-800 hover:bg-blue-200' : 'text-slate-400'
                              }`}
                            >
                              {w.leadsCount}
                            </button>
                          </td>

                          {/* Reservations */}
                          <td className="p-3 text-center">
                            <button
                              onClick={() =>
                                openDrilldown(
                                  `Бронирования недели ${w.label}`,
                                  'reservations',
                                  w.drilldowns?.reservations || [],
                                  `Период: ${w.startDate} — ${w.endDate}`
                                )
                              }
                              className={`px-2 py-0.5 rounded font-bold cursor-pointer transition ${
                                w.reservationsCount > 0
                                  ? 'bg-cyan-100 text-cyan-800 hover:bg-cyan-200'
                                  : 'text-slate-400'
                              }`}
                            >
                              {w.reservationsCount > 0 ? `${w.reservationsCount} ($${w.reservationsVolumeUsd.toLocaleString('ru-RU')})` : '0'}
                            </button>
                          </td>

                          {/* Signed Contracts */}
                          <td className="p-3 text-center">
                            <button
                              onClick={() =>
                                openDrilldown(
                                  `Подписанные договоры недели ${w.label}`,
                                  'signedDeals',
                                  w.drilldowns?.signedDeals || [],
                                  `Период: ${w.startDate} — ${w.endDate}`
                                )
                              }
                              className={`px-2 py-0.5 rounded font-bold cursor-pointer transition ${
                                w.signedDealsCount > 0
                                  ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                                  : 'text-slate-400'
                              }`}
                            >
                              {w.signedDealsCount > 0 ? `${w.signedDealsCount} ($${w.signedDealsVolumeUsd.toLocaleString('ru-RU')})` : '0'}
                            </button>
                          </td>

                          {/* Area */}
                          <td className="p-3 text-center font-bold text-slate-700">
                            {w.signedAreaM2 > 0 ? `${w.signedAreaM2} м²` : '—'}
                          </td>

                          {/* Payments USD */}
                          <td className="p-3 text-right">
                            <button
                              onClick={() =>
                                openDrilldown(
                                  `Поступления USD недели ${w.label}`,
                                  'payments',
                                  (w.drilldowns?.payments || []).filter((p) => p.currency === 'USD'),
                                  `Период: ${w.startDate} — ${w.endDate}`
                                )
                              }
                              className="font-black text-emerald-700 hover:underline cursor-pointer"
                            >
                              ${w.paymentsVolumeUsd.toLocaleString('ru-RU')}
                            </button>
                          </td>

                          {/* Payments TJS */}
                          <td className="p-3 text-right">
                            <button
                              onClick={() =>
                                openDrilldown(
                                  `Поступления TJS недели ${w.label}`,
                                  'payments',
                                  (w.drilldowns?.payments || []).filter((p) => p.currency === 'TJS'),
                                  `Период: ${w.startDate} — ${w.endDate}`
                                )
                              }
                              className="font-black text-indigo-700 hover:underline cursor-pointer"
                            >
                              {w.paymentsVolumeTjs.toLocaleString('ru-RU')} TJS
                            </button>
                          </td>

                          {/* Sales Velocity */}
                          <td className="p-3 text-center">
                            <span
                              className={`px-2 py-0.5 rounded-md text-[10px] font-black ${
                                w.conversionPercent >= 100
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : w.conversionPercent > 0
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-slate-100 text-slate-500'
                              }`}
                            >
                              {w.conversionPercent}%
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="p-3 text-center pr-4">
                            <button
                              onClick={() =>
                                openDrilldown(
                                  `Все договоры недели ${w.label}`,
                                  'signedDeals',
                                  w.drilldowns?.signedDeals || [],
                                  `Период: ${w.startDate} — ${w.endDate}`
                                )
                              }
                              className="px-2.5 py-1 bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 rounded-lg text-[10px] font-bold transition cursor-pointer"
                            >
                              Сделки →
                            </button>
                          </td>
                        </tr>
                      ))}
                      {(weeklyData.weeks || []).length === 0 && (
                        <tr>
                          <td colSpan={9} className="p-6 text-center text-slate-400">
                            Нет данных за выбранный диапазон недель
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* VIEW 3: BLOCK PLAN-FACT (ПЛАН-ФАКТ ПО БЛОКАМ А И Б)       */}
          {/* ======================================================== */}
          {activeSubTab === 'blocks' && blockPlanFactData && (
            <div className="space-y-6">
              {/* Overall Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Plan vs Fact (Deals) */}
                <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-2xs">
                  <span className="text-[11px] font-bold text-slate-500 uppercase">План vs Факт (квартиры)</span>
                  <div className="text-2xl font-black text-slate-900 mt-1">
                    {blockPlanFactData.summary?.fact?.signedDealsCount || 0}{' '}
                    <span className="text-sm font-semibold text-slate-400">
                      / {blockPlanFactData.summary?.plan?.targetDealsCount || 0} кв.
                    </span>
                  </div>
                  <div className="text-xs font-bold text-blue-700 mt-2">
                    Выполнение: {blockPlanFactData.summary?.execution?.dealsPercent || 0}%
                  </div>
                </div>

                {/* Plan vs Fact (USD Volume) */}
                <div className="rounded-3xl border border-emerald-200 bg-emerald-50/40 p-5 shadow-2xs">
                  <span className="text-[11px] font-bold text-emerald-800 uppercase">Объем продаж (USD)</span>
                  <div className="text-2xl font-black text-emerald-950 mt-1">
                    ${blockPlanFactData.summary?.fact?.signedVolumeUsd?.toLocaleString('ru-RU') || '0'}
                  </div>
                  <div className="text-xs font-bold text-emerald-700 mt-2">
                    Цель: ${blockPlanFactData.summary?.plan?.targetVolumeUsd?.toLocaleString('ru-RU') || '0'} (
                    {blockPlanFactData.summary?.execution?.volumePercent || 0}%)
                  </div>
                </div>

                {/* Signed Area */}
                <div className="rounded-3xl border border-indigo-200 bg-indigo-50/40 p-5 shadow-2xs">
                  <span className="text-[11px] font-bold text-indigo-800 uppercase">Реализованная площадь</span>
                  <div className="text-2xl font-black text-indigo-950 mt-1">
                    {blockPlanFactData.summary?.fact?.signedAreaM2 || 0}{' '}
                    <span className="text-sm font-semibold text-indigo-600">м²</span>
                  </div>
                  <div className="text-xs text-indigo-700 mt-2 font-semibold">
                    Фактически подписанные договоры
                  </div>
                </div>

                {/* Active Reservations Pipeline (Strictly Isolated from Fact) */}
                <div className="rounded-3xl border border-cyan-200 bg-cyan-50/40 p-5 shadow-2xs">
                  <span className="text-[11px] font-bold text-cyan-800 uppercase">Пайплайн активных броней</span>
                  <div className="text-2xl font-black text-cyan-950 mt-1">
                    {blockPlanFactData.summary?.pipelineReserved?.reservedDealsCount || 0}{' '}
                    <span className="text-sm font-semibold text-cyan-700">кв.</span>
                  </div>
                  <div className="text-xs text-cyan-800 mt-2 font-semibold">
                    На сумму: ${blockPlanFactData.summary?.pipelineReserved?.reservedVolumeUsd?.toLocaleString('ru-RU') || '0'} (не входит в факт)
                  </div>
                </div>
              </div>

              {/* Comparative Matrix: Block A vs Block B Cards */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {(blockPlanFactData.blocks || []).map((block) => (
                  <div
                    key={block.buildingId}
                    className="rounded-3xl bg-white border border-slate-200 p-6 shadow-2xs space-y-5"
                  >
                    {/* Block Title and Badges */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-3 rounded-2xl bg-blue-50 text-blue-600">
                          <Building2 className="h-6 w-6" />
                        </div>
                        <div>
                          <h3 className="text-lg font-black text-slate-900">{block.buildingName}</h3>
                          <p className="text-xs text-slate-400">
                            {block.projectName || 'ЖК Somon Residence'} • ID: {block.buildingId}
                          </p>
                        </div>
                      </div>

                      <span
                        className={`px-3 py-1 rounded-xl text-xs font-black ${
                          block.execution?.dealsPercent >= 100
                            ? 'bg-emerald-100 text-emerald-800'
                            : block.execution?.dealsPercent > 0
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {block.execution?.dealsPercent}% плана
                      </span>
                    </div>

                    {/* Block Metrics Comparison Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {/* Deals Fact */}
                      <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
                        <span className="text-[10px] font-bold text-slate-500 uppercase">Договоры (факт)</span>
                        <div className="text-xl font-black text-slate-900 mt-1">
                          {block.fact?.signedDealsCount || 0}
                          <span className="text-xs text-slate-400 font-semibold ml-1">шт</span>
                        </div>
                        <div className="text-[10px] text-slate-500 mt-1">
                          План: {block.plan?.targetDealsCount || 0} шт
                        </div>
                      </div>

                      {/* Area Fact */}
                      <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
                        <span className="text-[10px] font-bold text-slate-500 uppercase">Площадь (факт)</span>
                        <div className="text-xl font-black text-slate-900 mt-1">
                          {block.fact?.signedAreaM2 || 0}
                          <span className="text-xs text-slate-400 font-semibold ml-1">м²</span>
                        </div>
                        <div className="text-[10px] text-slate-500 mt-1">
                          Ср. ${block.fact?.averagePricePerM2Usd || 0}/м²
                        </div>
                      </div>

                      {/* Volume Fact */}
                      <div className="p-3.5 rounded-2xl bg-emerald-50/50 border border-emerald-100">
                        <span className="text-[10px] font-bold text-emerald-800 uppercase">Объем (факт)</span>
                        <div className="text-xl font-black text-emerald-950 mt-1">
                          ${block.fact?.signedVolumeUsd?.toLocaleString('ru-RU') || '0'}
                        </div>
                        <div className="text-[10px] text-emerald-700 mt-1">
                          План: ${block.plan?.targetVolumeUsd?.toLocaleString('ru-RU') || '0'}
                        </div>
                      </div>

                      {/* Reservations Pipeline */}
                      <div className="p-3.5 rounded-2xl bg-cyan-50/50 border border-cyan-100">
                        <span className="text-[10px] font-bold text-cyan-800 uppercase">Брони (пайплайн)</span>
                        <div className="text-xl font-black text-cyan-950 mt-1">
                          {block.pipelineReserved?.reservedDealsCount || 0}
                          <span className="text-xs text-cyan-700 font-semibold ml-1">шт</span>
                        </div>
                        <div className="text-[10px] text-cyan-800 mt-1">
                          ${block.pipelineReserved?.reservedVolumeUsd?.toLocaleString('ru-RU') || '0'}
                        </div>
                      </div>
                    </div>

                    {/* Progress Bar of Volume Execution */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-600">Выполнение плана по объему:</span>
                        <span className="font-black text-slate-900">{block.execution?.volumePercent || 0}%</span>
                      </div>
                      <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full transition-all"
                          style={{ width: `${Math.min(100, block.execution?.volumePercent || 0)}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-slate-400 font-semibold">
                        <span>Отклонение от плана:</span>
                        <span
                          className={`font-bold ${
                            (block.execution?.volumeGapUsd || 0) <= 0 ? 'text-emerald-700' : 'text-rose-600'
                          }`}
                        >
                          {(block.execution?.volumeGapUsd || 0) <= 0
                            ? `Перевыполнение: +$${Math.abs(block.execution?.volumeGapUsd || 0).toLocaleString('ru-RU')}`
                            : `Недобор: -$${(block.execution?.volumeGapUsd || 0).toLocaleString('ru-RU')}`}
                        </span>
                      </div>
                    </div>

                    {/* Managers Breakdown in this Block */}
                    {block.managersBreakdown && block.managersBreakdown.length > 0 && (
                      <div className="pt-3 border-t border-slate-100 space-y-2">
                        <span className="text-xs font-bold text-slate-700">Результаты менеджеров в блоке:</span>
                        <div className="space-y-1.5">
                          {block.managersBreakdown.map((mb) => (
                            <div
                              key={mb.managerId}
                              className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs"
                            >
                              <div>
                                <span className="font-bold text-slate-800">{mb.name}</span>
                                <span className="text-[10px] text-slate-400 ml-2">
                                  {mb.signedCount} договоров ({mb.areaM2} м²)
                                </span>
                              </div>
                              <div className="text-right">
                                <span className="font-black text-emerald-700">
                                  ${mb.signedVolumeUsd.toLocaleString('ru-RU')}
                                </span>
                                {mb.reservedCount > 0 && (
                                  <span className="text-[10px] text-cyan-700 ml-2 font-semibold">
                                    + {mb.reservedCount} бронь
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Action Drilldown Buttons */}
                    <div className="pt-3 border-t border-slate-100 flex items-center gap-2">
                      <button
                        onClick={() =>
                          openDrilldown(
                            `Подписанные договоры: ${block.buildingName}`,
                            'signedDeals',
                            block.drilldowns?.signedDeals || [],
                            `Блок: ${block.buildingName} | Период: ${blockPlanFactData.period}`
                          )
                        }
                        className="flex-1 py-2 rounded-xl bg-slate-100 hover:bg-emerald-50 hover:text-emerald-800 text-slate-700 text-xs font-bold transition cursor-pointer text-center"
                      >
                        Реестр договоров ({block.fact?.signedDealsCount || 0})
                      </button>

                      <button
                        onClick={() =>
                          openDrilldown(
                            `Активные бронирования: ${block.buildingName}`,
                            'reservations',
                            block.drilldowns?.reservedDeals || [],
                            `Блок: ${block.buildingName} | Период: ${blockPlanFactData.period}`
                          )
                        }
                        className="flex-1 py-2 rounded-xl bg-slate-100 hover:bg-cyan-50 hover:text-cyan-800 text-slate-700 text-xs font-bold transition cursor-pointer text-center"
                      >
                        Реестр броней ({block.pipelineReserved?.reservedDealsCount || 0})
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* ======================================================== */}
      {/* INTERACTIVE DRILLDOWN MODAL (PAGINATION, SEARCH, LINKS)   */}
      {/* ======================================================== */}
      {drilldownModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <span>{drilldownModal.title}</span>
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800">
                    {filteredModalItems.length} записей
                  </span>
                </h3>
                {drilldownModal.periodInfo && (
                  <p className="text-xs text-slate-400 mt-0.5">{drilldownModal.periodInfo}</p>
                )}
              </div>

              <button
                onClick={closeDrilldown}
                aria-label="Закрыть модальное окно"
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Search Bar */}
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center gap-3">
              <div className="relative flex-1">
                <Search className="h-4 w-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Поиск по ФИО покупателя, телефону, номеру договора или менеджеру..."
                  value={modalSearch}
                  onChange={(e) => {
                    setModalSearch(e.target.value);
                    setModalPage(1);
                  }}
                  className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {modalSearch && (
                <button
                  onClick={() => setModalSearch('')}
                  className="text-xs font-bold text-slate-500 hover:text-slate-800 cursor-pointer"
                >
                  Сбросить
                </button>
              )}
            </div>

            {/* Modal Body / Table View */}
            <div className="flex-1 overflow-y-auto p-5">
              {filteredModalItems.length === 0 ? (
                <div className="py-16 text-center space-y-2">
                  <Layers className="h-8 w-8 text-slate-300 mx-auto" />
                  <p className="text-sm font-bold text-slate-600">Записей не обнаружено</p>
                  <p className="text-xs text-slate-400">По выбранным параметрам или поисковому запросу ничего не найдено</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                      {/* LEADS COLUMNS */}
                      {drilldownModal.type === 'leads' && (
                        <tr>
                          <th className="p-2.5 pl-3">ID / Клиент</th>
                          <th className="p-2.5">Телефон</th>
                          <th className="p-2.5">Источник</th>
                          <th className="p-2.5">Менеджер</th>
                          <th className="p-2.5 text-center">Статус</th>
                          <th className="p-2.5 text-center pr-3">Действие</th>
                        </tr>
                      )}

                      {/* DEALS / RESERVATIONS COLUMNS */}
                      {['reservations', 'signedDeals', 'cancelledDeals'].includes(drilldownModal.type) && (
                        <tr>
                          <th className="p-2.5 pl-3">Договор / Квартира</th>
                          <th className="p-2.5">Покупатель</th>
                          <th className="p-2.5">Площадь</th>
                          <th className="p-2.5 text-right">Стоимость</th>
                          <th className="p-2.5">Менеджер</th>
                          <th className="p-2.5 text-center">Статус</th>
                          <th className="p-2.5 text-center pr-3">Действие</th>
                        </tr>
                      )}

                      {/* PAYMENTS COLUMNS */}
                      {drilldownModal.type === 'payments' && (
                        <tr>
                          <th className="p-2.5 pl-3">Квитанция / ID</th>
                          <th className="p-2.5">Покупатель</th>
                          <th className="p-2.5">Квартира</th>
                          <th className="p-2.5 text-right">Сумма</th>
                          <th className="p-2.5">Способ оплаты</th>
                          <th className="p-2.5">Дата платежа</th>
                          <th className="p-2.5 text-center pr-3">Действие</th>
                        </tr>
                      )}

                      {/* CALLS / MEETINGS / TASKS COLUMNS */}
                      {['calls', 'overdueTasks'].includes(drilldownModal.type) && (
                        <tr>
                          <th className="p-2.5 pl-3">Тип / Задача</th>
                          <th className="p-2.5">Клиент</th>
                          <th className="p-2.5">Телефон</th>
                          <th className="p-2.5">Ответственный</th>
                          <th className="p-2.5 text-center">Срок / Дата</th>
                          <th className="p-2.5 text-center pr-3">Действие</th>
                        </tr>
                      )}
                    </thead>

                    <tbody className="divide-y divide-slate-100 font-medium">
                      {paginatedModalItems.map((item, idx) => (
                        <tr key={item.id || idx} className="hover:bg-slate-50 transition">
                          {/* LEADS ROW */}
                          {drilldownModal.type === 'leads' && (
                            <>
                              <td className="p-2.5 pl-3 font-bold text-slate-900">
                                <div>{item.fullName}</div>
                                <div className="text-[10px] text-slate-400 font-normal">Лид #{item.id}</div>
                              </td>
                              <td className="p-2.5 font-semibold text-slate-700">{item.phone || '—'}</td>
                              <td className="p-2.5 font-semibold text-slate-600">{item.source || 'Прямой'}</td>
                              <td className="p-2.5 font-semibold text-slate-700">{item.managerName || 'Не назначен'}</td>
                              <td className="p-2.5 text-center">
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-100 text-blue-800">
                                  {item.status || 'NEW'}
                                </span>
                              </td>
                              <td className="p-2.5 text-center pr-3">
                                <button
                                  onClick={() => {
                                    closeDrilldown();
                                    const params = new URLSearchParams();
                                    if (item.id) params.set('leadId', item.id);
                                    if (item.phone || item.fullName) params.set('search', item.phone || item.fullName);
                                    navigate(`/leads?${params.toString()}`);
                                  }}
                                  className="px-2.5 py-1 bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white rounded-lg text-[10px] font-bold transition cursor-pointer"
                                >
                                  В лид →
                                </button>
                              </td>
                            </>
                          )}

                          {/* DEALS / RESERVATIONS ROW */}
                          {['reservations', 'signedDeals', 'cancelledDeals'].includes(drilldownModal.type) && (
                            <>
                              <td className="p-2.5 pl-3 font-bold text-slate-900">
                                <div>{item.contractNumber ? `Договор ${item.contractNumber}` : `Сделка #${item.id}`}</div>
                                <div className="text-[10px] text-blue-600 font-semibold">
                                  Кв. №{item.unitNumber || '—'}
                                </div>
                              </td>
                              <td className="p-2.5 font-semibold text-slate-800">
                                <div>{item.clientName || 'Покупатель'}</div>
                                <div className="text-[10px] text-slate-400">{item.phone || ''}</div>
                              </td>
                              <td className="p-2.5 font-semibold text-slate-700">{item.areaM2 ? `${item.areaM2} м²` : '—'}</td>
                              <td className="p-2.5 text-right font-black text-slate-900">
                                ${item.finalPriceUsd?.toLocaleString('ru-RU') || '0'}
                              </td>
                              <td className="p-2.5 font-semibold text-slate-700">{item.managerName || '—'}</td>
                              <td className="p-2.5 text-center">
                                <span
                                  className={`px-2 py-0.5 rounded-md text-[10px] font-black ${
                                    drilldownModal.type === 'signedDeals'
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : drilldownModal.type === 'reservations'
                                      ? 'bg-cyan-100 text-cyan-800'
                                      : 'bg-rose-100 text-rose-800'
                                  }`}
                                >
                                  {drilldownModal.type === 'signedDeals'
                                    ? 'SIGNED'
                                    : drilldownModal.type === 'reservations'
                                    ? 'RESERVED'
                                    : 'CANCELLED'}
                                </span>
                              </td>
                              <td className="p-2.5 text-center pr-3">
                                <button
                                  onClick={() => {
                                    closeDrilldown();
                                    const params = new URLSearchParams();
                                    if (item.id) params.set('dealId', item.id);
                                    if (item.contractNumber) params.set('search', item.contractNumber);
                                    navigate(`/deals?${params.toString()}`);
                                  }}
                                  className="px-2.5 py-1 bg-slate-100 hover:bg-blue-600 text-slate-700 hover:text-white rounded-lg text-[10px] font-bold transition cursor-pointer"
                                >
                                  В сделку →
                                </button>
                              </td>
                            </>
                          )}

                          {/* PAYMENTS ROW */}
                          {drilldownModal.type === 'payments' && (
                            <>
                              <td className="p-2.5 pl-3 font-bold text-slate-900">
                                <div>ПКО #{item.id}</div>
                                <div className="text-[10px] text-slate-400">Договор: {item.contractNumber || '—'}</div>
                              </td>
                              <td className="p-2.5 font-semibold text-slate-800">{item.clientName || '—'}</td>
                              <td className="p-2.5 font-semibold text-slate-700">Кв. №{item.unitNumber || '—'}</td>
                              <td className="p-2.5 text-right font-black">
                                <span
                                  className={`px-2 py-0.5 rounded-md ${
                                    item.currency === 'USD'
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : 'bg-indigo-100 text-indigo-800'
                                  }`}
                                >
                                  {item.currency === 'USD' ? `$${item.amountFormatted?.toLocaleString('ru-RU')}` : `${item.amountFormatted?.toLocaleString('ru-RU')} TJS`}
                                </span>
                              </td>
                              <td className="p-2.5 font-semibold text-slate-600">{item.method || 'CASH'}</td>
                              <td className="p-2.5 font-semibold text-slate-600">{item.paymentDate || '—'}</td>
                              <td className="p-2.5 text-center pr-3">
                                <button
                                  onClick={() => {
                                    closeDrilldown();
                                    const params = new URLSearchParams();
                                    if (item.dealId) params.set('dealId', item.dealId);
                                    if (item.contractNumber) params.set('search', item.contractNumber);
                                    navigate(`/payments?${params.toString()}`);
                                  }}
                                  className="px-2.5 py-1 bg-slate-100 hover:bg-emerald-600 text-slate-700 hover:text-white rounded-lg text-[10px] font-bold transition cursor-pointer"
                                >
                                  Касса →
                                </button>
                              </td>
                            </>
                          )}

                          {/* CALLS / OVERDUE TASKS ROW */}
                          {['calls', 'overdueTasks'].includes(drilldownModal.type) && (
                            <>
                              <td className="p-2.5 pl-3 font-bold text-slate-900">
                                <div>{item.title || 'Задача'}</div>
                                <div className="text-[10px] text-slate-400">ID #{item.id}</div>
                              </td>
                              <td className="p-2.5 font-semibold text-slate-800">{item.clientName || '—'}</td>
                              <td className="p-2.5 font-semibold text-slate-600">{item.phone || '—'}</td>
                              <td className="p-2.5 font-semibold text-slate-700">{item.managerName || '—'}</td>
                              <td className="p-2.5 text-center font-bold">
                                <span
                                  className={`px-2 py-0.5 rounded-md text-[10px] ${
                                    drilldownModal.type === 'overdueTasks'
                                      ? 'bg-rose-100 text-rose-800'
                                      : 'bg-emerald-100 text-emerald-800'
                                  }`}
                                >
                                  {item.dueAt ? String(item.dueAt).split('T')[0] : item.completedAt ? String(item.completedAt).split('T')[0] : '—'}
                                </span>
                              </td>
                              <td className="p-2.5 text-center pr-3">
                                <button
                                  onClick={() => {
                                    closeDrilldown();
                                    const params = new URLSearchParams();
                                    const query = item.clientName || item.title || item.phone;
                                    if (query) params.set('search', query);
                                    navigate(`/tasks?${params.toString()}`);
                                  }}
                                  className="px-2.5 py-1 bg-slate-100 hover:bg-blue-600 text-slate-700 hover:text-white rounded-lg text-[10px] font-bold transition cursor-pointer"
                                >
                                  В задачи →
                                </button>
                              </td>
                            </>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Modal Pagination Footer */}
            {totalPages > 1 && (
              <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs font-semibold text-slate-600">
                <div>
                  Показано {(modalPage - 1) * pageSize + 1}–{Math.min(modalPage * pageSize, filteredModalItems.length)} из {filteredModalItems.length}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    disabled={modalPage <= 1}
                    onClick={() => setModalPage((p) => Math.max(1, p - 1))}
                    className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>

                  <span className="text-xs font-bold text-slate-800">
                    {modalPage} / {totalPages}
                  </span>

                  <button
                    disabled={modalPage >= totalPages}
                    onClick={() => setModalPage((p) => Math.min(totalPages, p + 1))}
                    className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
