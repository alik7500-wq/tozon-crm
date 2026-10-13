import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../../api/client';
import { useAuth } from '../auth/AuthContext';
import {
  AlertCircle,
  Clock,
  CheckCircle2,
  AlertTriangle,
  UserX,
  Search,
  RefreshCw,
  Plus,
  ChevronRight,
  ExternalLink,
  User,
  CalendarClock,
  CheckSquare,
  X
} from 'lucide-react';

export const LeadControlView = ({ onSelectLead, projects = [], onLeadUpdated }) => {
  const { user } = useAuth();
  const canReassign = user && ['ADMIN', 'DIRECTOR'].includes(user.role);

  const [slaData, setSlaData] = useState(null);
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [search, setSearch] = useState('');
  const [slaStatusFilter, setSlaStatusFilter] = useState('ALL');
  const [projectFilter, setProjectFilter] = useState('ALL');
  const [managerFilter, setManagerFilter] = useState('ALL');
  const [page, setPage] = useState(1);

  // Quick Task Modal
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [taskLead, setTaskLead] = useState(null);
  const [taskTitle, setTaskTitle] = useState('Первичный звонок клиенту');
  const [taskType, setTaskType] = useState('CALL');
  const [taskDueDate, setTaskDueDate] = useState(new Date().toISOString().split('T')[0]);
  const [taskPriority, setTaskPriority] = useState('HIGH');
  const [taskDescription, setTaskDescription] = useState('');
  const [isSubmittingTask, setIsSubmittingTask] = useState(false);

  // Reassignment state
  const [reassigningId, setReassigningId] = useState(null);
  const [toastMessage, setToastMessage] = useState('');

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  const fetchUsers = async () => {
    try {
      const res = await api.get('/users');
      const list = res.data?.users || res.users || [];
      setUsers(list.filter((u) => u.is_active));
    } catch (err) {
      console.warn('Failed to fetch users:', err);
    }
  };

  const fetchSlaData = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const params = { page, limit: 50 };
      if (search) params.search = search;
      if (slaStatusFilter && slaStatusFilter !== 'ALL') params.slaStatus = slaStatusFilter;
      if (projectFilter && projectFilter !== 'ALL') params.projectId = projectFilter;
      if (managerFilter && managerFilter !== 'ALL') params.responsibleUserId = managerFilter;

      const res = await api.get('/leads/sla-control', { params });
      const data = res.data || res;
      setSlaData(data);
    } catch (err) {
      setError(err.message || 'Ошибка загрузки данных SLA-контроля');
    } finally {
      setIsLoading(false);
    }
  }, [search, slaStatusFilter, projectFilter, managerFilter, page]);

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchSlaData();
    }, 200);
    return () => clearTimeout(timer);
  }, [fetchSlaData]);

  // Handle 1-click reassignment (Admin & Director only)
  const handleReassignManager = async (leadId, newUserId) => {
    if (!canReassign) return;
    setReassigningId(leadId);
    try {
      const targetUserId = newUserId ? Number(newUserId) : null;
      await api.patch(`/leads/${leadId}`, { responsible_user_id: targetUserId });
      showToast('Ответственный менеджер успешно обновлен');
      fetchSlaData();
      if (onLeadUpdated) onLeadUpdated();
    } catch (err) {
      alert(err.message || 'Ошибка при переназначении менеджера');
    } finally {
      setReassigningId(null);
    }
  };

  // Open Quick Task Modal
  const openQuickTaskModal = (lead) => {
    setTaskLead(lead);
    setTaskTitle(`Связаться с ${lead.full_name}`);
    setTaskType('CALL');
    setTaskDueDate(new Date().toISOString().split('T')[0]);
    setTaskPriority('HIGH');
    setTaskDescription('');
    setIsTaskModalOpen(true);
  };

  // Submit Quick Task
  const handleSubmitTask = async (e) => {
    e.preventDefault();
    if (!taskLead || !taskTitle.trim()) return;

    setIsSubmittingTask(true);
    try {
      await api.post('/tasks', {
        title: taskTitle.trim(),
        type: taskType,
        due_date: taskDueDate,
        priority: taskPriority,
        description: taskDescription.trim(),
        lead_id: taskLead.id,
        client_name: taskLead.full_name,
        phone: taskLead.phone,
        assigned_user_id: taskLead.responsible_user_id || user?.id || 1
      });

      showToast(`Задача создана для ${taskLead.full_name}`);
      setIsTaskModalOpen(false);
      setTaskLead(null);
      fetchSlaData();
      if (onLeadUpdated) onLeadUpdated();
    } catch (err) {
      alert(err.message || 'Ошибка создания задачи');
    } finally {
      setIsSubmittingTask(false);
    }
  };

  const summary = slaData?.summary || {
    totalActive: 0,
    unassignedCount: 0,
    contactWarningCount: 0,
    contactOverdueCount: 0,
    stagnantCount: 0,
    overdueTasksCount: 0,
    onTrackCount: 0,
    attentionRequiredCount: 0
  };

  const leadsList = slaData?.leads || [];
  const pagination = slaData?.pagination || { total: 0, page: 1, limit: 50, totalPages: 1 };

  return (
    <div className="space-y-6">
      {/* Toast Banner */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl bg-slate-900 text-white px-4 py-3 shadow-xl text-xs font-bold animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* SLA Metric Counter Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* 1. Unassigned */}
        <div
          onClick={() => setSlaStatusFilter(slaStatusFilter === 'UNASSIGNED' ? 'ALL' : 'UNASSIGNED')}
          className={`p-3.5 rounded-2xl border transition cursor-pointer flex flex-col justify-between ${
            slaStatusFilter === 'UNASSIGNED'
              ? 'bg-rose-50 border-rose-300 ring-2 ring-rose-500/20 shadow-xs'
              : 'bg-white border-slate-200 hover:border-rose-200 hover:bg-rose-50/30 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between text-slate-500 mb-1.5">
            <span className="text-[11px] font-bold text-rose-700 uppercase tracking-wider">Без ответственного</span>
            <UserX className="h-4 w-4 text-rose-600" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-rose-900">{summary.unassignedCount}</span>
            <span className="text-[10px] font-semibold text-rose-600">&gt;15 мин</span>
          </div>
        </div>

        {/* 2. Contact Overdue (>2h) */}
        <div
          onClick={() => setSlaStatusFilter(slaStatusFilter === 'OVERDUE_CONTACT' ? 'ALL' : 'OVERDUE_CONTACT')}
          className={`p-3.5 rounded-2xl border transition cursor-pointer flex flex-col justify-between ${
            slaStatusFilter === 'OVERDUE_CONTACT'
              ? 'bg-rose-50 border-rose-300 ring-2 ring-rose-500/20 shadow-xs'
              : 'bg-white border-slate-200 hover:border-rose-200 hover:bg-rose-50/30 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between text-slate-500 mb-1.5">
            <span className="text-[11px] font-bold text-rose-700 uppercase tracking-wider">Без контакта (&gt;2ч)</span>
            <AlertCircle className="h-4 w-4 text-rose-600" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-rose-900">{summary.contactOverdueCount}</span>
            <span className="text-[10px] font-semibold text-rose-600">SLA нарушен</span>
          </div>
        </div>

        {/* 3. Contact Warning (>1h) */}
        <div
          onClick={() => setSlaStatusFilter(slaStatusFilter === 'WARNING_CONTACT' ? 'ALL' : 'WARNING_CONTACT')}
          className={`p-3.5 rounded-2xl border transition cursor-pointer flex flex-col justify-between ${
            slaStatusFilter === 'WARNING_CONTACT'
              ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-500/20 shadow-xs'
              : 'bg-white border-slate-200 hover:border-amber-200 hover:bg-amber-50/30 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between text-slate-500 mb-1.5">
            <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">Ожидают (&gt;1ч)</span>
            <Clock className="h-4 w-4 text-amber-600" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-amber-900">{summary.contactWarningCount}</span>
            <span className="text-[10px] font-semibold text-amber-600">Внимание</span>
          </div>
        </div>

        {/* 4. Overdue Tasks */}
        <div
          onClick={() => setSlaStatusFilter(slaStatusFilter === 'OVERDUE_TASK' ? 'ALL' : 'OVERDUE_TASK')}
          className={`p-3.5 rounded-2xl border transition cursor-pointer flex flex-col justify-between ${
            slaStatusFilter === 'OVERDUE_TASK'
              ? 'bg-rose-50 border-rose-300 ring-2 ring-rose-500/20 shadow-xs'
              : 'bg-white border-slate-200 hover:border-rose-200 hover:bg-rose-50/30 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between text-slate-500 mb-1.5">
            <span className="text-[11px] font-bold text-rose-700 uppercase tracking-wider">Просрочены задачи</span>
            <CalendarClock className="h-4 w-4 text-rose-600" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-rose-900">{summary.overdueTasksCount}</span>
            <span className="text-[10px] font-semibold text-rose-600">Срочно</span>
          </div>
        </div>

        {/* 5. Stagnant (>48h) */}
        <div
          onClick={() => setSlaStatusFilter(slaStatusFilter === 'STAGNANT' ? 'ALL' : 'STAGNANT')}
          className={`p-3.5 rounded-2xl border transition cursor-pointer flex flex-col justify-between ${
            slaStatusFilter === 'STAGNANT'
              ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-500/20 shadow-xs'
              : 'bg-white border-slate-200 hover:border-amber-200 hover:bg-amber-50/30 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between text-slate-500 mb-1.5">
            <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">Без движения (&gt;48ч)</span>
            <AlertTriangle className="h-4 w-4 text-amber-600" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-amber-900">{summary.stagnantCount}</span>
            <span className="text-[10px] font-semibold text-amber-600">Нет задач</span>
          </div>
        </div>

        {/* 6. On Track */}
        <div
          onClick={() => setSlaStatusFilter(slaStatusFilter === 'ON_TRACK' ? 'ALL' : 'ON_TRACK')}
          className={`p-3.5 rounded-2xl border transition cursor-pointer flex flex-col justify-between ${
            slaStatusFilter === 'ON_TRACK'
              ? 'bg-emerald-50 border-emerald-300 ring-2 ring-emerald-500/20 shadow-xs'
              : 'bg-white border-slate-200 hover:border-emerald-200 hover:bg-emerald-50/30 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between text-slate-500 mb-1.5">
            <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">В графике</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-emerald-900">{summary.onTrackCount}</span>
            <span className="text-[10px] font-semibold text-emerald-600">Норма</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-3.5 border border-slate-200 shadow-2xs">
        <div className="flex flex-wrap items-center gap-2.5 flex-1">
          {/* Search */}
          <div className="relative min-w-[220px] max-w-sm flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Поиск по клиенту или телефону..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3.5 py-1.5 text-xs text-slate-900 outline-none focus:border-tozon-blue focus:bg-white focus:ring-4 focus:ring-tozon-blue/10 transition"
            />
          </div>

          {/* SLA Filter Dropdown */}
          <select
            value={slaStatusFilter}
            onChange={(e) => setSlaStatusFilter(e.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-800 outline-none focus:border-tozon-blue cursor-pointer"
          >
            <option value="ALL">Все SLA статусы</option>
            <option value="ATTENTION_REQUIRED">⚠️ Все требующие внимания</option>
            <option value="UNASSIGNED">🔴 Без ответственного (&gt;15м)</option>
            <option value="OVERDUE_CONTACT">🔴 Просрочен контакт (&gt;2ч)</option>
            <option value="WARNING_CONTACT">🟠 Ожидает контакта (&gt;1ч)</option>
            <option value="OVERDUE_TASK">🔴 Просрочена задача</option>
            <option value="STAGNANT">🟡 Без движения (&gt;48ч)</option>
            <option value="ON_TRACK">🟢 В графике</option>
          </select>

          {/* Manager Filter (Visible to Admin/Director) */}
          {canReassign && (
            <select
              value={managerFilter}
              onChange={(e) => setManagerFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-800 outline-none focus:border-tozon-blue cursor-pointer"
            >
              <option value="ALL">Все менеджеры</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.role === 'SALES_MANAGER' ? 'Менеджер' : u.role})
                </option>
              ))}
            </select>
          )}

          {/* Project Filter */}
          <select
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-800 outline-none focus:border-tozon-blue cursor-pointer"
          >
            <option value="ALL">Все объекты</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={fetchSlaData}
          title="Обновить данные"
          className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700 transition cursor-pointer"
        >
          <RefreshCw className={`h-3.5 w-3.5 text-slate-500 ${isLoading ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">Обновить</span>
        </button>
      </div>

      {/* Main SLA Control Table */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-2xs overflow-hidden">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center p-16 text-slate-400">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent mb-3" />
            <p className="text-xs font-semibold text-slate-500">Загрузка данных контроля обработки...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-rose-700">
            <AlertCircle className="h-6 w-6 mx-auto mb-2 text-rose-500" />
            <p className="text-xs font-bold">{error}</p>
            <button
              onClick={fetchSlaData}
              className="mt-3 inline-flex items-center px-3 py-1.5 rounded-lg bg-rose-100 hover:bg-rose-200 text-rose-800 text-xs font-bold transition cursor-pointer"
            >
              Повторить попытку
            </button>
          </div>
        ) : leadsList.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto mb-2.5 opacity-80" />
            <h3 className="text-sm font-bold text-slate-800">Все лиды обработаны вовремя</h3>
            <p className="text-xs text-slate-500 mt-1">
              По выбранным фильтрам нет просроченных или проблемных обращений.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/75 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Клиент / Телефон</th>
                  <th className="py-3 px-3">Ответственный менеджер</th>
                  <th className="py-3 px-3">SLA Статус / Ожидание</th>
                  <th className="py-3 px-3">Первый контакт</th>
                  <th className="py-3 px-3">Последнее действие</th>
                  <th className="py-3 px-3">Следующий шаг</th>
                  <th className="py-3 px-4 text-right">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {leadsList.map((lead) => {
                  const badge = lead.sla_badge || { label: 'В графике', color: 'emerald' };
                  let badgeClass = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                  if (badge.color === 'rose') {
                    badgeClass = 'bg-rose-50 text-rose-700 border-rose-200 animate-pulse';
                  } else if (badge.color === 'amber') {
                    badgeClass = 'bg-amber-50 text-amber-800 border-amber-200';
                  } else if (badge.color === 'blue') {
                    badgeClass = 'bg-blue-50 text-blue-700 border-blue-200';
                  }

                  return (
                    <tr
                      key={lead.id}
                      className="hover:bg-slate-50/80 transition group"
                    >
                      {/* 1. Client & Contact */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col">
                          <button
                            onClick={() => onSelectLead(lead)}
                            className="text-left font-bold text-slate-900 group-hover:text-blue-600 transition hover:underline cursor-pointer flex items-center gap-1.5"
                          >
                            <span>{lead.full_name}</span>
                            <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition" />
                          </button>
                          <div className="flex items-center gap-2 mt-0.5 text-slate-500">
                            <span className="font-mono text-[11px]">{lead.phone}</span>
                            {lead.project_name && (
                              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
                                {lead.project_name}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* 2. Manager Assignment (with 1-click reassignment for Admin/Director) */}
                      <td className="py-3.5 px-3">
                        {canReassign ? (
                          <div className="relative">
                            <select
                              value={lead.responsible_user_id || ''}
                              onChange={(e) => handleReassignManager(lead.id, e.target.value)}
                              disabled={reassigningId === lead.id}
                              className={`rounded-lg border px-2 py-1 text-xs font-semibold outline-none transition cursor-pointer ${
                                !lead.responsible_user_id
                                  ? 'border-rose-300 bg-rose-50/60 text-rose-800 font-bold'
                                  : 'border-slate-200 bg-white text-slate-800 hover:border-blue-400'
                              } ${reassigningId === lead.id ? 'opacity-50' : ''}`}
                            >
                              <option value="">Не назначен</option>
                              {users.map((u) => (
                                <option key={u.id} value={u.id}>
                                  {u.name}
                                </option>
                              ))}
                            </select>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                            <User className="h-3.5 w-3.5 text-slate-400" />
                            <span>{lead.responsible_user_name}</span>
                          </div>
                        )}
                      </td>

                      {/* 3. SLA Status & Waiting Time */}
                      <td className="py-3.5 px-3">
                        <div className="flex flex-col items-start gap-1">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${badgeClass}`}>
                            {badge.color === 'rose' && <AlertCircle className="h-3 w-3" />}
                            {badge.color === 'amber' && <Clock className="h-3 w-3" />}
                            {badge.color === 'emerald' && <CheckCircle2 className="h-3 w-3" />}
                            <span>{badge.label}</span>
                          </span>
                        </div>
                      </td>

                      {/* 4. First Contact Signal */}
                      <td className="py-3.5 px-3">
                        {lead.first_contact_recorded ? (
                          <div className="flex flex-col">
                            <span className="text-[11px] font-bold text-emerald-700 flex items-center gap-1">
                              <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                              <span>Подтверждён</span>
                            </span>
                            <span className="text-[10px] text-slate-500">
                              {lead.first_contact_signal || 'Зафиксирован'}
                            </span>
                          </div>
                        ) : (
                          <div className="flex flex-col">
                            <span className="text-[11px] font-bold text-rose-700 flex items-center gap-1">
                              <Clock className="h-3 w-3 text-rose-500" />
                              <span>Ожидает</span>
                            </span>
                            <span className="text-[10px] text-slate-400">
                              Нет действий менеджера
                            </span>
                          </div>
                        )}
                      </td>

                      {/* 5. Last Activity */}
                      <td className="py-3.5 px-3">
                        <div className="flex flex-col text-slate-600">
                          <span className="font-semibold text-[11px]">
                            {lead.last_activity_type}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {lead.hours_since_last_activity === 0
                              ? 'Менее часа назад'
                              : `${lead.hours_since_last_activity} ч. назад`}
                          </span>
                        </div>
                      </td>

                      {/* 6. Next Task / Step */}
                      <td className="py-3.5 px-3">
                        {lead.next_task ? (
                          <div className="flex flex-col">
                            <span
                              className={`font-semibold text-[11px] truncate max-w-[160px] ${
                                lead.next_task.is_overdue ? 'text-rose-700 font-bold' : 'text-slate-800'
                              }`}
                              title={lead.next_task.title}
                            >
                              {lead.next_task.title}
                            </span>
                            <span
                              className={`text-[10px] font-mono ${
                                lead.next_task.is_overdue ? 'text-rose-600 font-bold' : 'text-slate-500'
                              }`}
                            >
                              Срок: {lead.next_task.due_date} {lead.next_task.is_overdue ? '(просрочена)' : ''}
                            </span>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                            <AlertTriangle className="h-3 w-3 text-amber-500" />
                            <span>Нет задачи</span>
                          </span>
                        )}
                      </td>

                      {/* 7. Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openQuickTaskModal(lead)}
                            title="Поставить задачу по лиду"
                            className="flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50/80 hover:bg-blue-100 px-2 py-1 text-[11px] font-bold text-blue-700 transition cursor-pointer"
                          >
                            <Plus className="h-3 w-3" />
                            <span className="hidden sm:inline">Задача</span>
                          </button>

                          <button
                            onClick={() => onSelectLead(lead)}
                            title="Открыть карточку клиента"
                            className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 px-2 py-1 text-[11px] font-bold text-slate-700 transition cursor-pointer"
                          >
                            <span>Карточка</span>
                            <ChevronRight className="h-3 w-3 text-slate-400" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
            <div>
              Показано {leadsList.length} из {pagination.total} активных лидов
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 font-bold disabled:opacity-40 transition cursor-pointer hover:bg-slate-100"
              >
                Назад
              </button>
              <span className="px-2 font-semibold">
                {page} / {pagination.totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                disabled={page >= pagination.totalPages}
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 font-bold disabled:opacity-40 transition cursor-pointer hover:bg-slate-100"
              >
                Вперед
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Quick Task Creation Modal */}
      {isTaskModalOpen && taskLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <CheckSquare className="h-5 w-5 text-blue-600" />
                <h3 className="text-base font-extrabold text-slate-900">Быстрое назначение задачи</h3>
              </div>
              <button
                onClick={() => setIsTaskModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitTask} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Клиент</label>
                <div className="rounded-xl bg-slate-50 border border-slate-200 p-2.5 text-slate-800">
                  <div className="font-bold">{taskLead.full_name}</div>
                  <div className="text-slate-500 font-mono text-[11px]">{taskLead.phone}</div>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Название задачи *</label>
                <input
                  type="text"
                  required
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-blue-600 transition"
                  placeholder="Например: Повторный звонок, согласование условий"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Тип задачи</label>
                  <select
                    value={taskType}
                    onChange={(e) => setTaskType(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-blue-600 cursor-pointer"
                  >
                    <option value="CALL">Звонок</option>
                    <option value="MEETING">Встреча / Показ</option>
                    <option value="DOCUMENT">Подготовка договора</option>
                    <option value="OTHER">Другое</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Приоритет</label>
                  <select
                    value={taskPriority}
                    onChange={(e) => setTaskPriority(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-blue-600 cursor-pointer"
                  >
                    <option value="HIGH">Высокий</option>
                    <option value="NORMAL">Обычный</option>
                    <option value="LOW">Низкий</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Срок выполнения (дата) *</label>
                <input
                  type="date"
                  required
                  value={taskDueDate}
                  onChange={(e) => setTaskDueDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-blue-600 transition"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Комментарий к задаче</label>
                <textarea
                  rows={2}
                  value={taskDescription}
                  onChange={(e) => setTaskDescription(e.target.value)}
                  placeholder="Дополнительные детали для менеджера..."
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-blue-600 transition"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsTaskModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingTask || !taskTitle.trim()}
                  className="rounded-xl bg-blue-600 hover:bg-blue-700 px-4 py-2 text-xs font-bold text-white shadow-md shadow-blue-500/20 disabled:opacity-50 transition cursor-pointer"
                >
                  {isSubmittingTask ? 'Сохранение...' : 'Поставить задачу'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
