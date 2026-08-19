import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { LeadKanbanView } from '../leads/LeadKanbanView';
import { CreateLeadModal } from '../leads/CreateLeadModal';
import { LeadDrawer } from '../leads/LeadDrawer';
import { Kanban, Plus, Search, Filter, Sparkles, Building2 } from 'lucide-react';

export const PipelinePage = () => {
  const [leads, setLeads] = useState([]);
  const [projects, setProjects] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [projectFilter, setProjectFilter] = useState('');

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedLeadId, setSelectedLeadId] = useState(null);

  const fetchLeads = async () => {
    setIsLoading(true);
    try {
      const params = {};
      if (search) params.search = search;
      if (projectFilter) params.projectId = projectFilter;

      const res = await api.get('/leads', { params });
      setLeads(res.data?.leads || res.leads || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchProjects = async () => {
    try {
      const res = await api.get('/projects');
      setProjects(res.data?.projects || res.projects || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    fetchLeads();
  }, [search, projectFilter]);

  const handleQuickStatusChange = async (leadId, newStatus) => {
    try {
      await api.patch(`/leads/${leadId}/status`, { status: newStatus });
      fetchLeads();
    } catch (err) {
      alert(err.message || 'Ошибка обновления стадии');
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Kanban className="h-7 w-7 text-purple-600" />
            <span>Воронка продаж</span>
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500">
            Визуальное перемещение лидов по этапам сделки (Новый → Переговоры → Бронь → Сделка)
          </p>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-md hover:from-purple-700 hover:to-indigo-700 transition cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          <span>Добавить лида</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-white p-4 border border-slate-200 shadow-2xs">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="relative min-w-[240px] max-w-sm flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Поиск по ФИО или телефону..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3.5 py-1.5 text-xs text-slate-900 outline-none focus:border-purple-500 focus:bg-white transition"
            />
          </div>

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
        </div>

        <div className="text-xs text-slate-500 font-semibold">
          Всего в воронке: <strong className="text-slate-900">{leads.length}</strong>
        </div>
      </div>

      {/* Kanban Board */}
      {isLoading ? (
        <div className="h-72 rounded-2xl bg-white border border-slate-200 flex items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-purple-600 border-t-transparent" />
            <span className="text-xs text-slate-500">Загрузка воронки...</span>
          </div>
        </div>
      ) : (
        <LeadKanbanView
          leads={leads}
          onSelectLead={(l) => setSelectedLeadId(l.id)}
          onStatusChange={handleQuickStatusChange}
          onAddNewLead={() => setIsCreateModalOpen(true)}
        />
      )}

      {/* Create Modal */}
      <CreateLeadModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreated={fetchLeads}
        projects={projects}
      />

      {/* Lead Drawer */}
      <LeadDrawer
        isOpen={Boolean(selectedLeadId)}
        onClose={() => setSelectedLeadId(null)}
        leadId={selectedLeadId}
        onLeadUpdated={fetchLeads}
      />
    </div>
  );
};
