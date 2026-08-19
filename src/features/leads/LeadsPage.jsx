import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { LeadKanbanView } from './LeadKanbanView';
import { LeadTableView } from './LeadTableView';
import { CreateLeadModal } from './CreateLeadModal';
import { LeadDrawer } from './LeadDrawer';
import {
  Users,
  Plus,
  Search,
  Filter,
  Kanban,
  Table as TableIcon,
  Building2,
  TrendingUp,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles
} from 'lucide-react';

export const LeadsPage = () => {
  const [leads, setLeads] = useState([]);
  const [projects, setProjects] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState('kanban'); // 'kanban' or 'table'

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [projectFilter, setProjectFilter] = useState('');

  // Modals / Drawer
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedLeadId, setSelectedLeadId] = useState(null);
  const [leadToEdit, setLeadToEdit] = useState(null);

  const fetchLeads = async () => {
    setIsLoading(true);
    try {
      const params = {};
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      if (projectFilter) params.projectId = projectFilter;

      const res = await api.get('/leads', { params });
      setLeads(res.data.leads || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

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
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchLeads();
    }, 200);
    return () => clearTimeout(timer);
  }, [search, statusFilter, projectFilter]);

  const handleSelectLead = (lead) => {
    setSelectedLeadId(lead.id);
  };

  const handleEditLead = (lead) => {
    setLeadToEdit(lead);
    setIsCreateModalOpen(true);
  };

  const handleLeadSaved = (lead) => {
    fetchLeads();
    if (selectedLeadId === lead.id) {
      setSelectedLeadId(lead.id);
    }
  };

  const handleQuickStatusChange = async (leadId, newStatus) => {
    try {
      await api.patch(`/leads/${leadId}/status`, { status: newStatus });
      fetchLeads();
    } catch (err) {
      alert(err.message || 'Ошибка обновления статуса');
    }
  };

  // Metrics
  const totalLeads = leads.length;
  const inProgressLeads = leads.filter((l) => ['NEW', 'IN_PROGRESS', 'NEGOTIATION'].includes(l.status)).length;
  const wonLeads = leads.filter((l) => l.status === 'WON').length;
  const lostLeads = leads.filter((l) => l.status === 'LOST').length;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Лиды и Воронка продаж</h1>
          <p className="mt-1 text-sm text-slate-500">
            База потенциальных покупателей, паспортные данные, заметки и воронка сделок
          </p>
        </div>

        <button
          onClick={() => {
            setLeadToEdit(null);
            setIsCreateModalOpen(true);
          }}
          className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 px-4 py-2.5 text-xs font-bold text-white shadow-md transition cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          <span>Добавить лида</span>
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase">Всего лидов</span>
          <div className="text-2xl font-black text-slate-900 mt-1">{totalLeads}</div>
        </div>

        <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4 shadow-2xs">
          <span className="text-[11px] font-bold text-amber-700 uppercase">В работе / Переговоры</span>
          <div className="text-2xl font-black text-amber-700 mt-1">{inProgressLeads}</div>
        </div>

        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 shadow-2xs">
          <span className="text-[11px] font-bold text-emerald-700 uppercase">Сделки (WON)</span>
          <div className="text-2xl font-black text-emerald-700 mt-1">{wonLeads}</div>
        </div>

        <div className="rounded-2xl border border-rose-200 bg-rose-50/50 p-4 shadow-2xs">
          <span className="text-[11px] font-bold text-rose-700 uppercase">Отказы (LOST)</span>
          <div className="text-2xl font-black text-rose-700 mt-1">{lostLeads}</div>
        </div>
      </div>

      {/* Controls Bar: Search, Filters & View Mode Switcher */}
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
              className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3.5 py-1.5 text-xs text-slate-900 outline-none focus:border-purple-500 focus:bg-white transition"
            />
          </div>

          {/* Project Filter */}
          <select
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-800 outline-none focus:border-purple-500 cursor-pointer"
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
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-800 outline-none focus:border-purple-500 cursor-pointer"
          >
            <option value="">Все стадии</option>
            <option value="NEW">Новый</option>
            <option value="IN_PROGRESS">В работе</option>
            <option value="NEGOTIATION">Переговоры</option>
            <option value="WON">Сделка</option>
            <option value="LOST">Отказ</option>
          </select>
        </div>

        {/* View Switcher */}
        <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1 border border-slate-200">
          <button
            onClick={() => setViewMode('kanban')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-bold transition cursor-pointer ${
              viewMode === 'kanban'
                ? 'bg-white text-purple-700 shadow-2xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Kanban className="h-3.5 w-3.5" />
            <span>Канбан</span>
          </button>

          <button
            onClick={() => setViewMode('table')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-bold transition cursor-pointer ${
              viewMode === 'table'
                ? 'bg-white text-purple-700 shadow-2xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <TableIcon className="h-3.5 w-3.5" />
            <span>Таблица</span>
          </button>
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
          onStatusChange={handleQuickStatusChange}
          onAddNewLead={() => setIsCreateModalOpen(true)}
        />
      ) : (
        <LeadTableView
          leads={leads}
          onSelectLead={handleSelectLead}
          onEditLead={handleEditLead}
          onStatusChange={handleQuickStatusChange}
        />
      )}

      {/* Create / Edit Modal */}
      <CreateLeadModal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setLeadToEdit(null);
        }}
        onCreated={handleLeadSaved}
        leadToEdit={leadToEdit}
        projects={projects}
      />

      {/* Detailed Lead Drawer */}
      <LeadDrawer
        isOpen={Boolean(selectedLeadId)}
        onClose={() => setSelectedLeadId(null)}
        leadId={selectedLeadId}
        onLeadUpdated={fetchLeads}
        onEditLead={(lead) => {
          setSelectedLeadId(null);
          handleEditLead(lead);
        }}
      />
    </div>
  );
};
