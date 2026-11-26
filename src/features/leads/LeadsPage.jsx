import React, { useState, useEffect, useCallback, useRef, lazy, Suspense } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../../api/client';
import { useAuth } from '../auth/AuthContext';
import { LeadKanbanView } from './LeadKanbanView';
import { LeadTableView } from './LeadTableView';
import { LeadControlView } from './LeadControlView';
import { ManagerPerformanceView } from './ManagerPerformanceView';
import { SalesPlanView } from './SalesPlanView';
import { CreateLeadModal } from './CreateLeadModal';
import { AssignLeadModal } from './AssignLeadModal';
import { FirstContactModal } from './FirstContactModal';
import { LeadDrawer } from './LeadDrawer';
import {
  Plus,
  Search,
  Kanban,
  Table as TableIcon,
  ShieldAlert,
  TrendingUp,
  Target,
  Inbox,
  UserX,
  Clock,
  AlertTriangle,
  Briefcase,
  CheckCircle2,
  Check
} from 'lucide-react';

const LeadIntakeModal = lazy(() => import('./LeadIntakeModal').then(module => ({ default: module.LeadIntakeModal })));

export const LeadsPage = () => {
  const { user } = useAuth();
  const canAssign = user && ['ADMIN', 'DIRECTOR'].includes(user.role);

  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const initialMode = tabParam === 'control' ? 'control' : (tabParam === 'performance' ? 'performance' : (tabParam === 'sales-plan' ? 'sales-plan' : 'kanban'));

  const [leads, setLeads] = useState([]);
  const [projects, setProjects] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState(initialMode); // 'kanban', 'table', 'control', or 'performance'

  // Summary statistics for 7 clickable metric cards
  const [stats, setStats] = useState({
    total: 0,
    new: 0,
    unassigned: 0,
    awaiting_contact: 0,
    overdue: 0,
    in_progress: 0,
    closed: 0
  });

  // Filters
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [statusFilter, setStatusFilter] = useState('');
  const [projectFilter, setProjectFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [managerFilter, setManagerFilter] = useState('ALL');
  const [createdFrom, setCreatedFrom] = useState('');
  const [createdTo, setCreatedTo] = useState('');
  const [taskStateFilter, setTaskStateFilter] = useState('');
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [archiveFilter, setArchiveFilter] = useState('active');
  const [quickFilter, setQuickFilter] = useState(''); // 'ALL', 'NEW', 'UNASSIGNED', 'AWAITING_CONTACT', 'OVERDUE', 'IN_PROGRESS', 'CLOSED'
  const [serverTotal, setServerTotal] = useState(null);
  const [stageCounts, setStageCounts] = useState(null);
  const [nextCursor, setNextCursor] = useState(null);
  const [users, setUsers] = useState([]);
  const [fetchError, setFetchError] = useState('');

  // Modals / Drawer
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isIntakeOpen, setIsIntakeOpen] = useState(false);
  const [selectedLeadId, setSelectedLeadId] = useState(searchParams.get('leadId') ? Number(searchParams.get('leadId')) : null);
  const [leadToEdit, setLeadToEdit] = useState(null);

  useEffect(() => {
    const leadIdParam = searchParams.get('leadId');
    if (leadIdParam) {
      setSelectedLeadId(Number(leadIdParam));
    }
    const searchParam = searchParams.get('search');
    if (searchParam && !search) {
      setSearch(searchParam);
    }
  }, [searchParams]);

  // Assignment & First-contact modals (Phase 2)
  const [leadToAssign, setLeadToAssign] = useState(null);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [leadForContact, setLeadForContact] = useState(null);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);

  // Toast
  const [toastMessage, setToastMessage] = useState('');
  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  const handleSetViewMode = (mode) => {
    setViewMode(mode);
    if (mode === 'control') {
      setSearchParams({ tab: 'control' });
    } else if (mode === 'performance') {
      setSearchParams({ tab: 'performance' });
    } else if (mode === 'sales-plan') {
      setSearchParams({ tab: 'sales-plan' });
    } else {
      setSearchParams({});
    }
  };

  const leadRefreshBusy = useRef(false);
  const leadRequest = useRef(0);
  const statsRequest = useRef(0);
  const boardGenerationRef = useRef(0);
  const columnRequestRef = useRef({});
  const leadsRef = useRef([]);
  const boardColumnsRef = useRef(null);
  const leadsContextRef = useRef('');
  const backoffMsRef = useRef(5000);
  const [boardColumns, setBoardColumns] = useState(null);
  const [loadingBoardStage, setLoadingBoardStage] = useState(null);
  const [syncStatus, setSyncStatus] = useState(() => (typeof navigator !== 'undefined' && navigator.onLine === false ? 'offline' : 'online'));
  const [lastSyncAt, setLastSyncAt] = useState(null);

  leadsRef.current = leads;
  boardColumnsRef.current = boardColumns;

  const flattenBoardColumns = useCallback((cols) => {
    if (!cols) return [];
    const seen = new Set();
    const out = [];
    for (const col of Object.values(cols)) {
      for (const l of (col?.leads || [])) {
        const k = String(l.id_str || l.id);
        if (!seen.has(k)) {
          seen.add(k);
          out.push(l);
        }
      }
    }
    return out;
  }, []);

  const buildUnifiedFilterParams = useCallback(() => {
    const params = {};
    if (search) params.search = search;
    if (statusFilter) params.stage = statusFilter;
    if (projectFilter) params.projectId = projectFilter;
    if (sourceFilter) params.source = sourceFilter;
    if (canAssign && managerFilter && managerFilter !== 'ALL') params.managerId = managerFilter;
    if (createdFrom) params.createdFrom = createdFrom;
    if (createdTo) params.createdTo = createdTo;
    if (taskStateFilter) params.taskState = taskStateFilter;
    if (unreadOnly) params.unread = 'true';
    if (archiveFilter && archiveFilter !== 'active') params.archive = archiveFilter;
    if (quickFilter) params.quickFilter = quickFilter;
    return params;
  }, [search, statusFilter, projectFilter, sourceFilter, managerFilter, createdFrom, createdTo, taskStateFilter, unreadOnly, archiveFilter, quickFilter, canAssign]);

  const fetchStats = useCallback(async () => {
    const reqId = ++statsRequest.current;
    const ctx = leadsContextRef.current;
    try {
      const res = await api.get('/leads/stats', { params: buildUnifiedFilterParams() });
      if (reqId !== statsRequest.current || ctx !== leadsContextRef.current) return;
      if (res.data?.stats) {
        setStats(res.data.stats);
      }
      if (res.data?.stageCounts) {
        setStageCounts(res.data.stageCounts);
      }
    } catch (err) {
      console.warn('Failed to fetch lead stats:', err);
    }
  }, [buildUnifiedFilterParams]);

  const fetchLeads = useCallback(async (quiet = false, appendCursor = null) => {
    const requestId = ++leadRequest.current;
    const ctx = `${JSON.stringify(buildUnifiedFilterParams())}:${viewMode}`;
    leadsContextRef.current = ctx;
    if (!quiet && !appendCursor) setIsLoading(true);
    if (!quiet) setFetchError('');
    try {
      if (viewMode === 'kanban' && !appendCursor) {
        const boardGenAtStart = boardGenerationRef.current;
        const currentCols = boardColumnsRef.current;
        const perStageLimit = quiet && currentCols
          ? Math.min(100, Math.max(20, ...Object.values(currentCols).map((c) => (c?.leads || []).length)))
          : 20;
        const baseParams = buildUnifiedFilterParams();
        const res = await api.get('/leads/board', { params: { ...baseParams, perStageLimit } });
        if (requestId !== leadRequest.current || ctx !== leadsContextRef.current) return false;
        if (quiet && boardGenAtStart !== boardGenerationRef.current) return false;

        const incomingCols = res.data?.boardColumns || null;
        let finalCols = incomingCols;

        // If any column had >100 cards loaded, refresh its full loaded range in bounded pages (<=100/page)
        if (quiet && currentCols && incomingCols) {
          finalCols = { ...incomingCols };
          for (const [stageKey, colData] of Object.entries(incomingCols)) {
            const prevLen = (currentCols[stageKey]?.leads || []).length;
            let colLeads = [...(colData?.leads || [])];
            let colCursor = colData?.nextCursor || null;
            while (prevLen > colLeads.length && colCursor) {
              const pageRes = await api.get('/leads', {
                params: { ...baseParams, stage: stageKey, cursor: colCursor, limit: 100 }
              });
              if (requestId !== leadRequest.current || ctx !== leadsContextRef.current || boardGenAtStart !== boardGenerationRef.current) {
                return false;
              }
              const more = pageRes.data?.leads || [];
              const seenIds = new Set(colLeads.map((l) => String(l.id_str || l.id)));
              for (const item of more) {
                const k = String(item.id_str || item.id);
                if (!seenIds.has(k)) {
                  seenIds.add(k);
                  colLeads.push(item);
                }
              }
              const nextColCursor = pageRes.data?.nextCursor || null;
              if (!nextColCursor || nextColCursor === colCursor || more.length === 0) {
                colCursor = nextColCursor === colCursor ? null : nextColCursor;
                break;
              }
              colCursor = nextColCursor;
            }
            finalCols[stageKey] = {
              leads: colLeads,
              total: colData?.total ?? colLeads.length,
              nextCursor: colCursor
            };
          }
        }

        if (requestId === leadRequest.current && ctx === leadsContextRef.current && (!quiet || boardGenAtStart === boardGenerationRef.current)) {
          setBoardColumns(finalCols);
          const flattened = flattenBoardColumns(finalCols);
          setLeads(flattened);
          setServerTotal(typeof res.data?.total === 'number' ? res.data.total : flattened.length);
          if (res.data?.stageCounts) setStageCounts(res.data.stageCounts);
          if (res.data?.stats) setStats(res.data.stats);
          setNextCursor(null);
          setSyncStatus('online');
          setLastSyncAt(new Date().toISOString());
          backoffMsRef.current = 5000;
        }
        return true;
      }

      const baseParams = buildUnifiedFilterParams();
      if (quiet && !appendCursor && leadsRef.current.length > 500) {
        // Refresh entire loaded range (>500) using bounded keyset pages (<=500/page) so no unverified tail remains
        const targetCount = leadsRef.current.length;
        const collected = [];
        const seenIds = new Set();
        let cursor = null;
        let lastPageRes = null;

        do {
          const pageRes = await api.get('/leads', {
            params: { ...baseParams, limit: 500, ...(cursor ? { cursor } : {}) }
          });
          if (requestId !== leadRequest.current || ctx !== leadsContextRef.current) return false;
          lastPageRes = pageRes;
          const pageLeads = pageRes.data?.leads || [];
          for (const item of pageLeads) {
            const k = String(item.id_str || item.id);
            if (!seenIds.has(k)) {
              seenIds.add(k);
              collected.push(item);
            }
          }
          const next = pageRes.data?.nextCursor || null;
          if (!next || next === cursor || pageLeads.length === 0) {
            cursor = next === cursor ? null : next;
            break;
          }
          cursor = next;
        } while (collected.length < targetCount);

        if (requestId === leadRequest.current && ctx === leadsContextRef.current && lastPageRes) {
          setBoardColumns(null);
          setLeads(collected);
          setServerTotal(typeof lastPageRes.data?.total === 'number' ? lastPageRes.data.total : collected.length);
          if (lastPageRes.data?.stageCounts) setStageCounts(lastPageRes.data.stageCounts);
          setNextCursor(cursor);
          setSyncStatus('online');
          setLastSyncAt(new Date().toISOString());
          backoffMsRef.current = 5000;
        }
        return true;
      }

      const loadedCount = quiet && !appendCursor ? Math.min(500, Math.max(50, leadsRef.current.length)) : undefined;
      const params = {
        ...baseParams,
        ...(loadedCount ? { limit: loadedCount } : {}),
        ...(appendCursor ? { cursor: appendCursor } : {})
      };

      const res = await api.get('/leads', { params });
      if (requestId === leadRequest.current && ctx === leadsContextRef.current) {
        const incoming = res.data?.leads || [];
        setBoardColumns(null);
        setLeads((prev) => {
          if (appendCursor) {
            const seen = new Set(prev.map((l) => String(l.id_str || l.id)));
            return [...prev, ...incoming.filter((l) => !seen.has(String(l.id_str || l.id)))];
          }
          return incoming;
        });
        setServerTotal(typeof res.data?.total === 'number' ? res.data.total : incoming.length);
        if (res.data?.stageCounts) setStageCounts(res.data.stageCounts);
        setNextCursor(res.data?.nextCursor || null);
        setSyncStatus('online');
        setLastSyncAt(new Date().toISOString());
        backoffMsRef.current = 5000;
      }
      return true;
    } catch (err) {
      if (requestId === leadRequest.current && ctx === leadsContextRef.current) {
        if (!quiet) setFetchError(err.message || 'Не удалось загрузить список лидов');
        const offlineNow = typeof navigator !== 'undefined' && navigator.onLine === false;
        setSyncStatus(offlineNow ? 'offline' : 'reconnecting');
        backoffMsRef.current = Math.min(30000, backoffMsRef.current * 2);
      }
      return false;
    } finally {
      if (requestId === leadRequest.current) setIsLoading(false);
    }
  }, [buildUnifiedFilterParams, flattenBoardColumns, viewMode]);

  const handleLoadMoreColumn = useCallback(async (stageKey) => {
    const colCursor = boardColumns?.[stageKey]?.nextCursor;
    if (!colCursor || loadingBoardStage) return;
    const ctx = `${JSON.stringify(buildUnifiedFilterParams())}:${viewMode}`;
    const colReqId = (columnRequestRef.current[stageKey] || 0) + 1;
    columnRequestRef.current[stageKey] = colReqId;
    boardGenerationRef.current += 1;
    setLoadingBoardStage(stageKey);
    try {
      const params = {
        ...buildUnifiedFilterParams(),
        stage: stageKey,
        cursor: colCursor,
        limit: 20
      };
      const res = await api.get('/leads', { params });
      if (ctx !== leadsContextRef.current || columnRequestRef.current[stageKey] !== colReqId) {
        return;
      }
      const incoming = res.data?.leads || [];
      boardGenerationRef.current += 1;
      setBoardColumns((prev) => {
        if (!prev || !prev[stageKey]) return prev;
        const existingIds = new Set((prev[stageKey].leads || []).map((l) => String(l.id_str || l.id)));
        const merged = [...(prev[stageKey].leads || []), ...incoming.filter((l) => !existingIds.has(String(l.id_str || l.id)))];
        const nextCols = {
          ...prev,
          [stageKey]: {
            ...prev[stageKey],
            leads: merged,
            nextCursor: res.data?.nextCursor || null
          }
        };
        setLeads(flattenBoardColumns(nextCols));
        return nextCols;
      });
    } catch (err) {
      if (ctx === leadsContextRef.current) {
        setFetchError(err.message || 'Не удалось догрузить колонку');
      }
    } finally {
      if (columnRequestRef.current[stageKey] === colReqId) {
        setLoadingBoardStage(null);
      }
    }
  }, [boardColumns, buildUnifiedFilterParams, flattenBoardColumns, loadingBoardStage, viewMode]);

  const handleExportLeads = () => {
    const qs = new URLSearchParams(buildUnifiedFilterParams()).toString();
    const base = api.defaults?.baseURL || '/api';
    window.open(`${base}/leads/export${qs ? `?${qs}` : ''}`, '_blank', 'noopener,noreferrer');
  };

  const fetchProjects = async () => {
    try {
      const res = await api.get('/projects');
      setProjects(res.data.projects || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await api.get('/users');
      setUsers((res.data?.users || res.users || []).filter((u) => u.is_active));
    } catch { /* ignore */ }
  };

  useEffect(() => {
    fetchProjects();
    fetchUsers();
    fetchStats();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchLeads();
      fetchStats();
    }, 200);
    return () => clearTimeout(timer);
  }, [fetchLeads]);

  useEffect(() => {
    let alive = true;
    let timerId = null;

    const scheduleNext = () => {
      if (!alive) return;
      if (timerId) clearTimeout(timerId);
      timerId = setTimeout(tick, backoffMsRef.current);
    };

    const tick = async () => {
      if (!alive || document.hidden || leadRefreshBusy.current) {
        scheduleNext();
        return;
      }
      if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        setSyncStatus('offline');
        scheduleNext();
        return;
      }
      leadRefreshBusy.current = true;
      try {
        await Promise.all([fetchLeads(true), fetchStats()]);
      } finally {
        leadRefreshBusy.current = false;
        scheduleNext();
      }
    };

    const handleOnline = () => {
      backoffMsRef.current = 5000;
      setSyncStatus('reconnecting');
      void tick();
    };
    const handleOffline = () => {
      setSyncStatus('offline');
    };

    scheduleNext();
    window.addEventListener('focus', tick);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      alive = false;
      if (timerId) clearTimeout(timerId);
      window.removeEventListener('focus', tick);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [fetchLeads, fetchStats]);

  const handleSelectLead = (lead) => {
    setSelectedLeadId(lead.id);
  };

  const handleEditLead = (lead) => {
    setLeadToEdit(lead);
    setIsCreateModalOpen(true);
  };

  const handleLeadSaved = (lead) => {
    fetchLeads();
    fetchStats();
    if (selectedLeadId === lead.id) {
      setSelectedLeadId(lead.id);
    }
  };

  const handleQuickStatusChange = async (leadId, newStatus) => {
    const current = leads.find((l) => l.id === leadId);
    try {
      await api.patch(`/leads/${leadId}/status`, {
        status: newStatus,
        stage: newStatus,
        version: current?.version
      });
      fetchLeads();
      fetchStats();
    } catch (err) {
      if (err?.status === 409) {
        showToast('Карточка была изменена другим пользователем — список обновлён');
        fetchLeads();
        fetchStats();
        return;
      }
      alert(err.message || 'Ошибка обновления статуса');
    }
  };

  const handleOpenAssignModal = (lead) => {
    setLeadToAssign(lead);
    setIsAssignModalOpen(true);
  };

  const handleOpenContactModal = (lead) => {
    setLeadForContact(lead);
    setIsContactModalOpen(true);
  };

  const handleLeadAssigned = () => {
    showToast('Менеджер успешно назначен на заявку');
    fetchLeads();
    fetchStats();
  };

  const handleContactRecorded = () => {
    showToast('Первый контакт с клиентом успешно зафиксирован');
    fetchLeads();
    fetchStats();
  };

  // Toggle quick filter on clicking a KPI card
  const handleCardClick = (filterKey) => {
    setQuickFilter(prev => (prev === filterKey ? '' : filterKey));
    // Clear conflicting status filter if set
    if (statusFilter) setStatusFilter('');
  };

  return (
    <div className="space-y-6">
      {/* Toast Banner */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl bg-slate-900 text-white px-4 py-3 shadow-xl text-xs font-bold animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Лиды и Воронка продаж</h1>
          <p className="mt-1 text-sm text-slate-500">
            Входящий пул, распределение менеджеров, регламент первого контакта (15 мин SLA) и воронка
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* View Mode Switcher */}
          <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1 border border-slate-200">
            <button
              onClick={() => handleSetViewMode('kanban')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                viewMode === 'kanban'
                  ? 'bg-tozon-blue text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Kanban className="h-3.5 w-3.5" />
              <span>Воронка</span>
            </button>

            <button
              onClick={() => handleSetViewMode('table')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-tozon-blue text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <TableIcon className="h-3.5 w-3.5" />
              <span>Таблица</span>
            </button>

            <button
              onClick={() => handleSetViewMode('list')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                viewMode === 'list'
                  ? 'bg-tozon-blue text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Briefcase className="h-3.5 w-3.5" />
              <span>Список</span>
            </button>

            <button
              onClick={() => handleSetViewMode('control')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                viewMode === 'control'
                  ? 'bg-tozon-blue text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <ShieldAlert className="h-3.5 w-3.5 text-amber-500" />
              <span>Контроль обработки</span>
            </button>

            <button
              onClick={() => handleSetViewMode('performance')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                viewMode === 'performance'
                  ? 'bg-tozon-blue text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
              <span>Эффективность</span>
            </button>

            <button
              onClick={() => handleSetViewMode('sales-plan')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                viewMode === 'sales-plan'
                  ? 'bg-tozon-blue text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Target className="h-3.5 w-3.5 text-blue-400" />
              <span>План продаж</span>
            </button>
          </div>

          <button
            onClick={() => {
              setLeadToEdit(null);
              setIsCreateModalOpen(true);
            }}
            className="flex items-center justify-center gap-2 rounded-xl bg-tozon-red hover:bg-tozon-red-hover px-4 py-2 text-xs font-black text-white shadow-md shadow-tozon-red/20 transition cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Добавить лида</span>
          </button>
          {canAssign && <button onClick={() => setIsIntakeOpen(true)} className="rounded-xl border border-blue-200 bg-white px-4 py-2.5 font-semibold text-blue-700 shadow-sm">Импорт / Google Форма</button>}
        </div>
      </div>

      {viewMode === 'control' ? (
        <LeadControlView
          onSelectLead={handleSelectLead}
          projects={projects}
          onLeadUpdated={() => { fetchLeads(); fetchStats(); }}
        />
      ) : viewMode === 'performance' ? (
        <ManagerPerformanceView projects={projects} />
      ) : viewMode === 'sales-plan' ? (
        <SalesPlanView projects={projects} />
      ) : (
        <>
          {/* Phase 2: 7 Clickable Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            {/* 1. Всего заявок */}
            <div
              onClick={() => handleCardClick('ALL')}
              className={`p-3.5 rounded-2xl border transition cursor-pointer flex flex-col justify-between ${
                quickFilter === 'ALL'
                  ? 'bg-slate-900 border-slate-900 text-white ring-2 ring-slate-900/20 shadow-md'
                  : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50 shadow-2xs'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className={`text-[10px] font-bold uppercase tracking-wider ${quickFilter === 'ALL' ? 'text-slate-300' : 'text-slate-500'}`}>
                  Всего заявок
                </span>
                <Inbox className={`h-4 w-4 ${quickFilter === 'ALL' ? 'text-white' : 'text-slate-400'}`} />
              </div>
              <div className="flex items-baseline justify-between">
                <span className={`text-2xl font-black ${quickFilter === 'ALL' ? 'text-white' : 'text-slate-900'}`}>{stats.total}</span>
                <span className={`text-[10px] font-semibold ${quickFilter === 'ALL' ? 'text-slate-300' : 'text-slate-400'}`}>Вся база</span>
              </div>
            </div>

            {/* 2. Новые */}
            <div
              onClick={() => handleCardClick('NEW')}
              className={`p-3.5 rounded-2xl border transition cursor-pointer flex flex-col justify-between ${
                quickFilter === 'NEW'
                  ? 'bg-blue-600 border-blue-600 text-white ring-2 ring-blue-500/20 shadow-md'
                  : 'bg-blue-50/40 border-blue-200 hover:border-blue-300 hover:bg-blue-50/70 shadow-2xs'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className={`text-[10px] font-bold uppercase tracking-wider ${quickFilter === 'NEW' ? 'text-blue-100' : 'text-blue-700'}`}>
                  Новые
                </span>
                <Clock className={`h-4 w-4 ${quickFilter === 'NEW' ? 'text-white' : 'text-blue-600'}`} />
              </div>
              <div className="flex items-baseline justify-between">
                <span className={`text-2xl font-black ${quickFilter === 'NEW' ? 'text-white' : 'text-blue-900'}`}>{stats.new}</span>
                <span className={`text-[10px] font-semibold ${quickFilter === 'NEW' ? 'text-blue-100' : 'text-blue-600'}`}>Входящие</span>
              </div>
            </div>

            {/* 3. Без ответственного (Пул) */}
            <div
              onClick={() => handleCardClick('UNASSIGNED')}
              className={`p-3.5 rounded-2xl border transition cursor-pointer flex flex-col justify-between ${
                quickFilter === 'UNASSIGNED'
                  ? 'bg-rose-600 border-rose-600 text-white ring-2 ring-rose-500/20 shadow-md'
                  : 'bg-rose-50/40 border-rose-200 hover:border-rose-300 hover:bg-rose-50/70 shadow-2xs'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className={`text-[10px] font-bold uppercase tracking-wider ${quickFilter === 'UNASSIGNED' ? 'text-rose-100' : 'text-rose-700'}`}>
                  В пуле (Свободные)
                </span>
                <UserX className={`h-4 w-4 ${quickFilter === 'UNASSIGNED' ? 'text-white' : 'text-rose-600'}`} />
              </div>
              <div className="flex items-baseline justify-between">
                <span className={`text-2xl font-black ${quickFilter === 'UNASSIGNED' ? 'text-white' : 'text-rose-900'}`}>{stats.unassigned}</span>
                <span className={`text-[10px] font-semibold ${quickFilter === 'UNASSIGNED' ? 'text-rose-100' : 'text-rose-600'}`}>Без сотрудника</span>
              </div>
            </div>

            {/* 4. Ожидают первого контакта */}
            <div
              onClick={() => handleCardClick('AWAITING_CONTACT')}
              className={`p-3.5 rounded-2xl border transition cursor-pointer flex flex-col justify-between ${
                quickFilter === 'AWAITING_CONTACT'
                  ? 'bg-amber-500 border-amber-500 text-white ring-2 ring-amber-500/20 shadow-md'
                  : 'bg-amber-50/40 border-amber-200 hover:border-amber-300 hover:bg-amber-50/70 shadow-2xs'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className={`text-[10px] font-bold uppercase tracking-wider ${quickFilter === 'AWAITING_CONTACT' ? 'text-amber-100' : 'text-amber-700'}`}>
                  Ожидают связи
                </span>
                <Clock className={`h-4 w-4 ${quickFilter === 'AWAITING_CONTACT' ? 'text-white' : 'text-amber-600'}`} />
              </div>
              <div className="flex items-baseline justify-between">
                <span className={`text-2xl font-black ${quickFilter === 'AWAITING_CONTACT' ? 'text-white' : 'text-amber-900'}`}>{stats.awaiting_contact}</span>
                <span className={`text-[10px] font-semibold ${quickFilter === 'AWAITING_CONTACT' ? 'text-amber-100' : 'text-amber-600'}`}>15 мин SLA</span>
              </div>
            </div>

            {/* 5. Просроченные */}
            <div
              onClick={() => handleCardClick('OVERDUE')}
              className={`p-3.5 rounded-2xl border transition cursor-pointer flex flex-col justify-between ${
                quickFilter === 'OVERDUE'
                  ? 'bg-red-700 border-red-700 text-white ring-2 ring-red-500/20 shadow-md'
                  : 'bg-red-50/40 border-red-200 hover:border-red-300 hover:bg-red-50/70 shadow-2xs'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className={`text-[10px] font-bold uppercase tracking-wider ${quickFilter === 'OVERDUE' ? 'text-red-100' : 'text-red-700'}`}>
                  Просрочены
                </span>
                <AlertTriangle className={`h-4 w-4 ${quickFilter === 'OVERDUE' ? 'text-white' : 'text-red-600'}`} />
              </div>
              <div className="flex items-baseline justify-between">
                <span className={`text-2xl font-black ${quickFilter === 'OVERDUE' ? 'text-white' : 'text-red-900'}`}>{stats.overdue}</span>
                <span className={`text-[10px] font-semibold ${quickFilter === 'OVERDUE' ? 'text-red-100' : 'text-red-600'}`}>SLA нарушен</span>
              </div>
            </div>

            {/* 6. В работе */}
            <div
              onClick={() => handleCardClick('IN_PROGRESS')}
              className={`p-3.5 rounded-2xl border transition cursor-pointer flex flex-col justify-between ${
                quickFilter === 'IN_PROGRESS'
                  ? 'bg-purple-600 border-purple-600 text-white ring-2 ring-purple-500/20 shadow-md'
                  : 'bg-purple-50/40 border-purple-200 hover:border-purple-300 hover:bg-purple-50/70 shadow-2xs'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className={`text-[10px] font-bold uppercase tracking-wider ${quickFilter === 'IN_PROGRESS' ? 'text-purple-100' : 'text-purple-700'}`}>
                  В работе
                </span>
                <Briefcase className={`h-4 w-4 ${quickFilter === 'IN_PROGRESS' ? 'text-white' : 'text-purple-600'}`} />
              </div>
              <div className="flex items-baseline justify-between">
                <span className={`text-2xl font-black ${quickFilter === 'IN_PROGRESS' ? 'text-white' : 'text-purple-900'}`}>{stats.in_progress}</span>
                <span className={`text-[10px] font-semibold ${quickFilter === 'IN_PROGRESS' ? 'text-purple-100' : 'text-purple-600'}`}>Переговоры</span>
              </div>
            </div>

            {/* 7. Завершённые */}
            <div
              onClick={() => handleCardClick('CLOSED')}
              className={`p-3.5 rounded-2xl border transition cursor-pointer flex flex-col justify-between ${
                quickFilter === 'CLOSED'
                  ? 'bg-emerald-600 border-emerald-600 text-white ring-2 ring-emerald-500/20 shadow-md'
                  : 'bg-emerald-50/40 border-emerald-200 hover:border-emerald-300 hover:bg-emerald-50/70 shadow-2xs'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className={`text-[10px] font-bold uppercase tracking-wider ${quickFilter === 'CLOSED' ? 'text-emerald-100' : 'text-emerald-700'}`}>
                  Завершенные
                </span>
                <CheckCircle2 className={`h-4 w-4 ${quickFilter === 'CLOSED' ? 'text-white' : 'text-emerald-600'}`} />
              </div>
              <div className="flex items-baseline justify-between">
                <span className={`text-2xl font-black ${quickFilter === 'CLOSED' ? 'text-white' : 'text-emerald-900'}`}>{stats.closed}</span>
                <span className={`text-[10px] font-semibold ${quickFilter === 'CLOSED' ? 'text-emerald-100' : 'text-emerald-600'}`}>Сделки / Отказы</span>
              </div>
            </div>
          </div>

          {/* Active quick filter reset pill */}
          {quickFilter && (
            <div className="flex items-center gap-2 text-xs text-slate-600 bg-slate-100 px-3 py-1.5 rounded-xl w-fit">
              <span>Активный фильтр: <strong>{
                quickFilter === 'ALL' ? 'Все заявки' :
                quickFilter === 'NEW' ? 'Новые' :
                quickFilter === 'UNASSIGNED' ? 'В пуле (Свободные)' :
                quickFilter === 'AWAITING_CONTACT' ? 'Ожидают первого контакта' :
                quickFilter === 'OVERDUE' ? 'Просроченные' :
                quickFilter === 'IN_PROGRESS' ? 'В работе' : 'Завершенные'
              }</strong></span>
              <button
                onClick={() => setQuickFilter('')}
                className="text-slate-400 hover:text-slate-700 font-bold ml-1 cursor-pointer"
              >
                ✕ Сбросить
              </button>
            </div>
          )}

          {/* Controls Bar: Search, Filters */}
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-white p-4 border border-slate-200 shadow-2xs">
            <div className="flex flex-wrap items-center gap-3 flex-1">
              {/* Search Input */}
              <div className="relative min-w-[240px] max-w-sm flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Поиск по ФИО, телефону, паспорту..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3.5 py-1.5 text-xs text-slate-900 outline-none focus:border-tozon-blue focus:bg-white focus:ring-4 focus:ring-tozon-blue/10 transition"
                />
              </div>

              {/* Project Filter */}
              <select
                value={projectFilter}
                onChange={(e) => setProjectFilter(e.target.value)}
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-800 outline-none focus:border-tozon-blue cursor-pointer"
              >
                <option value="">Все объекты</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>

              {/* Status / Stage Filter */}
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  if (quickFilter) setQuickFilter('');
                }}
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-800 outline-none focus:border-tozon-blue cursor-pointer"
              >
                <option value="">Все стадии воронки</option>
                <option value="NEW">Новый лид</option>
                <option value="IN_PROGRESS">В работе</option>
                <option value="NEGOTIATION">Переговоры</option>
                <option value="MEETING_SCHEDULED">Встреча назначена</option>
                <option value="SHOWING_DONE">Показ проведён</option>
                <option value="RESERVED">Бронь</option>
                <option value="CONTRACT_PREP">Подготовка договора</option>
                <option value="SIGNED">Договор подписан</option>
                <option value="LOST">Отказ / закрыто</option>
              </select>

              {/* Source Filter */}
              <select
                value={sourceFilter}
                onChange={(e) => setSourceFilter(e.target.value)}
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-800 outline-none focus:border-tozon-blue cursor-pointer"
              >
                <option value="">Все источники</option>
                <option value="INSTAGRAM">Instagram</option>
                <option value="WHATSAPP">WhatsApp</option>
                <option value="TELEGRAM">Telegram</option>
                <option value="PHONE">Звонок</option>
                <option value="WEBSITE">Сайт</option>
                <option value="WALK_IN">Визит в офис</option>
                <option value="REFERRAL">Рекомендация</option>
              </select>

              {/* Manager Filter (Supervisors only) */}
              {canAssign && (
                <select
                  value={managerFilter}
                  onChange={(e) => setManagerFilter(e.target.value)}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-800 outline-none focus:border-tozon-blue cursor-pointer"
                >
                  <option value="ALL">Все менеджеры</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              )}

              <input
                type="date"
                aria-label="Создан с"
                value={createdFrom}
                onChange={(e) => setCreatedFrom(e.target.value)}
                className="rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-800"
              />
              <input
                type="date"
                aria-label="Создан по"
                value={createdTo}
                onChange={(e) => setCreatedTo(e.target.value)}
                className="rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-800"
              />

              <select
                aria-label="Состояние задачи"
                value={taskStateFilter}
                onChange={(e) => setTaskStateFilter(e.target.value)}
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-800"
              >
                <option value="">Любые задачи</option>
                <option value="NO_TASK">Без задачи</option>
                <option value="PAUSED">На паузе</option>
                <option value="OVERDUE">Просрочена задача</option>
                <option value="HAS_OPEN">Есть открытая</option>
              </select>

              <select
                aria-label="Архив"
                value={archiveFilter}
                onChange={(e) => setArchiveFilter(e.target.value)}
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-800"
              >
                <option value="active">Активные</option>
                <option value="archived">Архивные</option>
                <option value="all">Все (с архивом)</option>
              </select>

              <label className="inline-flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
                <input type="checkbox" checked={unreadOnly} onChange={(e) => setUnreadOnly(e.target.checked)} />
                <span>Непрочитанные</span>
              </label>

              <button
                type="button"
                onClick={handleExportLeads}
                className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Экспорт Excel
              </button>
            </div>

            <div className="flex items-center gap-3 text-xs font-semibold text-slate-500">
              <span data-testid="leads-sync-status" className="text-[11px] font-normal text-slate-400">
                {syncStatus === 'offline' ? 'Нет сети' : syncStatus === 'reconnecting' ? 'Повторное подключение…' : lastSyncAt ? `Онлайн · Обновлено ${new Date(lastSyncAt).toLocaleTimeString('ru-RU')}` : 'Онлайн'}
              </span>
              <span>Всего по выборке: <strong className="text-slate-900">{serverTotal ?? leads.length}</strong></span>
            </div>
          </div>

          {fetchError && (
            <div role="alert" className="flex items-center justify-between rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-700">
              <span>{fetchError}</span>
              <button type="button" onClick={() => fetchLeads()} className="rounded-lg bg-white px-3 py-1 text-rose-700 border border-rose-200 hover:bg-rose-100">
                Повторить
              </button>
            </div>
          )}

          {/* Main Content */}
          {isLoading ? (
            <div className="h-72 rounded-2xl bg-white border border-slate-200 flex items-center justify-center">
              <div className="flex flex-col items-center gap-2">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-purple-600 border-t-transparent" />
                <span className="text-xs text-slate-500">Загрузка лидов...</span>
              </div>
            </div>
          ) : viewMode === 'kanban' ? (
            <LeadKanbanView
              leads={leads}
              boardColumns={boardColumns}
              stageCounts={stageCounts}
              onLoadMoreColumn={handleLoadMoreColumn}
              loadingColumn={loadingBoardStage}
              onSelectLead={handleSelectLead}
              onEditLead={handleEditLead}
              onStatusChange={handleQuickStatusChange}
              onAddNewLead={() => setIsCreateModalOpen(true)}
            />
          ) : viewMode === 'list' ? (
            <div className="divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white">
              {leads.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">По выбранным фильтрам лидов не найдено</div>
              ) : leads.map((lead) => (
                <div
                  key={lead.id}
                  onClick={() => handleSelectLead(lead)}
                  className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 hover:bg-slate-50 cursor-pointer"
                >
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-900">#{lead.id} • {lead.full_name}</div>
                    <div className="text-[11px] text-slate-500">
                      {lead.phone || 'Телефон не указан'} • {lead.source_code || lead.source || '—'} • {lead.interested_project_name || 'Проект не указан'}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="rounded-lg bg-slate-100 px-2 py-0.5 font-semibold text-slate-700">{lead.stage || lead.status}</span>
                    <span className="text-[11px] text-slate-500">{lead.responsible_user_name || 'Пул'}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <LeadTableView
              leads={leads}
              onSelectLead={handleSelectLead}
              onEditLead={handleEditLead}
              onStatusChange={handleQuickStatusChange}
              onAssignLead={handleOpenAssignModal}
              onFirstContact={handleOpenContactModal}
              canAssign={canAssign}
            />
          )}

          {nextCursor && (
            <div className="flex justify-center">
              <button
                type="button"
                onClick={() => fetchLeads(false, nextCursor)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
              >
                Загрузить ещё (показано {leads.length} из {serverTotal ?? '—'})
              </button>
            </div>
          )}
        </>
      )}

      {/* Modals */}
      {isIntakeOpen && <Suspense fallback={<p role="status">Открывается импорт…</p>}><LeadIntakeModal onClose={() => setIsIntakeOpen(false)} onImported={() => { fetchLeads(); fetchStats(); }} /></Suspense>}
      <CreateLeadModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        projects={projects}
        leadToEdit={leadToEdit}
        onSaved={handleLeadSaved}
      />

      <AssignLeadModal
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        lead={leadToAssign}
        onAssigned={handleLeadAssigned}
      />

      <FirstContactModal
        isOpen={isContactModalOpen}
        onClose={() => setIsContactModalOpen(false)}
        lead={leadForContact}
        onRecorded={handleContactRecorded}
      />

      <LeadDrawer
        isOpen={Boolean(selectedLeadId)}
        onClose={() => setSelectedLeadId(null)}
        leadId={selectedLeadId}
        onLeadUpdated={() => { fetchLeads(); fetchStats(); }}
        onEditLead={handleEditLead}
      />
    </div>
  );
};
