import React, { useState, useEffect, useCallback } from 'react';
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
  const [quickFilter, setQuickFilter] = useState(''); // 'ALL', 'NEW', 'UNASSIGNED', 'AWAITING_CONTACT', 'OVERDUE', 'IN_PROGRESS', 'CLOSED'

  // Modals / Drawer
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
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

  const fetchStats = async () => {
    try {
      const res = await api.get('/leads/stats');
      if (res.data?.stats) {
        setStats(res.data.stats);
      }
    } catch (err) {
      console.warn('Failed to fetch lead stats:', err);
    }
  };

  const fetchLeads = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = {};
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      if (projectFilter) params.projectId = projectFilter;
      if (quickFilter) params.quickFilter = quickFilter;

      const res = await api.get('/leads', { params });
      setLeads(res.data.leads || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [search, statusFilter, projectFilter, quickFilter]);

  const fetchProjects = async () => {
    try {
      const res = await api.get('/projects');
      setProjects(res.data.projects || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchProjects();
    fetchStats();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchLeads();
      fetchStats();
    }, 200);
    return () => clearTimeout(timer);
  }, [fetchLeads]);

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
    try {
      await api.patch(`/leads/${leadId}/status`, { status: newStatus });
      fetchLeads();
      fetchStats();
    } catch (err) {
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

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  if (quickFilter) setQuickFilter('');
                }}
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-800 outline-none focus:border-tozon-blue cursor-pointer"
              >
                <option value="">Все стадии воронки</option>
                <option value="NEW">Новый</option>
                <option value="IN_PROGRESS">В работе</option>
                <option value="NEGOTIATION">Переговоры</option>
                <option value="WON">Сделка</option>
                <option value="LOST">Отказ</option>
              </select>
            </div>
          </div>

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
              onSelectLead={handleSelectLead}
              onEditLead={handleEditLead}
              onStatusChange={handleQuickStatusChange}
              onAddNewLead={() => setIsCreateModalOpen(true)}
            />
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
        </>
      )}

      {/* Modals */}
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
