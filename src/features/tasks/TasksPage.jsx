import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { useModalDismiss } from '../../hooks/useModalDismiss';
import {
  CheckSquare,
  Plus,
  Search,
  Filter,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  Phone,
  MessageSquare,
  FileText,
  User,
  X,
  Trash2,
  Sparkles,
  Building2,
  Check
} from 'lucide-react';

export const TasksPage = () => {
  const [tasks, setTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState('ALL'); // ALL, TODAY, OVERDUE, COMPLETED
  const [statusFilter, setStatusFilter] = useState('ALL'); // ALL, OPEN, COMPLETED
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [newTask, setNewTask] = useState({
    title: '',
    type: 'CALL',
    client_name: '',
    phone: '',
    project_name: '',
    due_date: new Date().toISOString().split('T')[0],
    priority: 'NORMAL',
    description: '',
  });

  const isDirty = Boolean(newTask.title.trim() || newTask.client_name.trim() || newTask.description.trim());
  const { requestClose } = useModalDismiss({
    isOpen: isModalOpen,
    onClose: () => setIsModalOpen(false),
    isDirty,
    confirmMessage: 'Данные новой задачи не сохранены. Закрыть окно?'
  });

  const fetchTasks = async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/tasks', {
        params: {
          search,
          status: statusFilter,
          dateFilter: dateFilter !== 'ALL' ? dateFilter : undefined,
        },
      });
      const data = res.data?.tasks || res.tasks || [];
      setTasks(data);
    } catch (err) {
      console.error('Error fetching tasks:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [dateFilter, statusFilter]);

  const toggleTaskStatus = async (task) => {
    const nextStatus = task.status === 'COMPLETED' ? 'OPEN' : 'COMPLETED';
    try {
      // Optimistic update
      setTasks((prev) =>
        prev.map((t) => (t.id === task.id ? { ...t, status: nextStatus } : t))
      );
      await api.patch(`/tasks/${task.id}/status`, { status: nextStatus });
    } catch (err) {
      alert(err.message || 'Ошибка обновления статуса задачи');
      fetchTasks();
    }
  };

  const handleDeleteTask = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm('Удалить эту задачу?')) return;
    try {
      setTasks((prev) => prev.filter((t) => t.id !== id));
      await api.delete(`/tasks/${id}`);
    } catch (err) {
      alert(err.message || 'Ошибка удаления задачи');
      fetchTasks();
    }
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!newTask.title.trim()) return;

    try {
      setIsSubmitting(true);
      const res = await api.post('/tasks', newTask);
      const created = res.data?.task || res.task;
      if (created) {
        setTasks((prev) => [created, ...prev]);
      } else {
        fetchTasks();
      }
      setIsModalOpen(false);
      setNewTask({
        title: '',
        type: 'CALL',
        client_name: '',
        phone: '',
        project_name: '',
        due_date: new Date().toISOString().split('T')[0],
        priority: 'NORMAL',
        description: '',
      });
    } catch (err) {
      alert(err.message || 'Ошибка создания задачи');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredTasks = tasks.filter((t) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      (t.title && t.title.toLowerCase().includes(s)) ||
      (t.client_name && t.client_name.toLowerCase().includes(s)) ||
      (t.phone && t.phone.toLowerCase().includes(s)) ||
      (t.project_name && t.project_name.toLowerCase().includes(s))
    );
  });

  const openTasksCount = tasks.filter((t) => t.status === 'OPEN').length;
  const completedTasksCount = tasks.filter((t) => t.status === 'COMPLETED').length;
  const todayTasksCount = tasks.filter((t) => t.isToday).length;
  const overdueTasksCount = tasks.filter((t) => t.isOverdue).length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <CheckSquare className="h-7 w-7 text-blue-600" />
            <span>Задачи и напоминания</span>
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500">
            Автоматические и ручные задачи по лидам, броням, договорам купли-продажи и срокам оплаты
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 text-xs font-bold transition shadow-md cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          <span>Создать задачу</span>
        </button>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase">Всего задач в БД</span>
          <div className="text-2xl font-black text-slate-900 mt-1">{tasks.length}</div>
        </div>

        <div className="rounded-2xl border border-blue-200 bg-blue-50/50 p-4 shadow-2xs">
          <span className="text-[11px] font-bold text-blue-700 uppercase">В работе (OPEN)</span>
          <div className="text-2xl font-black text-blue-700 mt-1">{openTasksCount}</div>
        </div>

        <div className="rounded-2xl border border-rose-200 bg-rose-50/50 p-4 shadow-2xs">
          <span className="text-[11px] font-bold text-rose-700 uppercase">Просроченные</span>
          <div className="text-2xl font-black text-rose-700 mt-1">{overdueTasksCount}</div>
        </div>

        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 shadow-2xs">
          <span className="text-[11px] font-bold text-emerald-700 uppercase">Выполненные</span>
          <div className="text-2xl font-black text-emerald-700 mt-1">{completedTasksCount}</div>
        </div>
      </div>

      {/* Controls & Filter */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-white p-4 border border-slate-200 shadow-2xs">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="relative min-w-[240px] max-w-sm flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Поиск по названию, клиенту, телефону или ЖК..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3.5 py-1.5 text-xs text-slate-900 outline-none focus:border-blue-500 focus:bg-white transition"
            />
          </div>

          <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1 border border-slate-200">
            {[
              { id: 'ALL', label: 'Все' },
              { id: 'TODAY', label: 'На сегодня' },
              { id: 'OVERDUE', label: 'Просроченные' },
              { id: 'COMPLETED', label: 'Выполненные' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setDateFilter(f.id)}
                className={`rounded-lg px-3 py-1 text-xs font-bold transition cursor-pointer ${
                  dateFilter === f.id
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Task List */}
      {isLoading ? (
        <div className="h-64 rounded-3xl bg-white border border-slate-200 flex items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
            <span className="text-xs text-slate-500">Загрузка задач из базы данных...</span>
          </div>
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-white p-12 text-center shadow-xs">
          <CheckSquare className="h-12 w-12 text-slate-300 mb-2" />
          <h3 className="text-base font-bold text-slate-900">Задач нет</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm">
            Задачи формируются автоматически при поступлении лидов, оформлении броней и графиков рассрочки.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTasks.map((task) => (
            <div
              key={task.id}
              className={`rounded-2xl border p-4 transition flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                task.status === 'COMPLETED'
                  ? 'bg-slate-50/70 border-slate-200 opacity-60'
                  : task.isOverdue
                  ? 'bg-rose-50/30 border-rose-200 shadow-2xs'
                  : 'bg-white border-slate-200 hover:border-blue-300 shadow-2xs'
              }`}
            >
              <div className="flex items-start gap-3.5">
                <button
                  onClick={() => toggleTaskStatus(task)}
                  className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border transition cursor-pointer ${
                    task.status === 'COMPLETED'
                      ? 'bg-emerald-600 border-emerald-600 text-white'
                      : 'border-slate-300 hover:border-blue-600 bg-white text-transparent'
                  }`}
                >
                  <Check className="h-4 w-4" />
                </button>

                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`text-sm font-bold ${
                        task.status === 'COMPLETED'
                          ? 'line-through text-slate-500'
                          : 'text-slate-900'
                      }`}
                    >
                      {task.title}
                    </span>

                    {task.priority === 'HIGH' && (
                      <span className="rounded-md bg-rose-50 px-2 py-0.5 text-[10px] font-extrabold text-rose-700 border border-rose-200 uppercase">
                        Срочно
                      </span>
                    )}

                    {task.type === 'RESERVATION_EXPIRY' && (
                      <span className="rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-extrabold text-amber-700 border border-amber-200 uppercase">
                        Контроль брони
                      </span>
                    )}

                    {task.type === 'PAYMENT_CONTROL' && (
                      <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-extrabold text-emerald-700 border border-emerald-200 uppercase">
                        Контроль оплаты
                      </span>
                    )}
                  </div>

                  {task.description && (
                    <p className="text-xs text-slate-600 leading-relaxed max-w-2xl">
                      {task.description}
                    </p>
                  )}

                  <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-slate-500">
                    {task.client_name && (
                      <span className="flex items-center gap-1 text-slate-800 font-semibold">
                        <User className="h-3.5 w-3.5 text-slate-400" />
                        {task.client_name}
                      </span>
                    )}

                    {task.phone && (
                      <a
                        href={`tel:${task.phone}`}
                        className="flex items-center gap-1 text-blue-600 font-bold hover:underline"
                      >
                        <Phone className="h-3.5 w-3.5 text-blue-500" />
                        <span>{task.phone}</span>
                      </a>
                    )}

                    {task.project_name && (
                      <span className="flex items-center gap-1 text-slate-600 font-medium">
                        <Building2 className="h-3.5 w-3.5 text-slate-400" />
                        {task.project_name} {task.unit_number && `(кв. №${task.unit_number})`}
                      </span>
                    )}

                    <span
                      className={`flex items-center gap-1 font-semibold ${
                        task.isOverdue ? 'text-rose-600' : 'text-slate-500'
                      }`}
                    >
                      <Calendar className="h-3.5 w-3.5 text-slate-400" />
                      Срок: {new Date(task.due_date).toLocaleDateString('ru-RU')}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => toggleTaskStatus(task)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                    task.status === 'COMPLETED'
                      ? 'border-slate-300 text-slate-600 hover:bg-slate-100'
                      : 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100'
                  }`}
                >
                  {task.status === 'COMPLETED' ? 'Вернуть в работу' : 'Выполнить'}
                </button>

                <button
                  onClick={(e) => handleDeleteTask(task.id, e)}
                  title="Удалить задачу"
                  className="p-1.5 rounded-xl text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition cursor-pointer"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Task Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
          <div className="relative w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-extrabold text-slate-900">Новая задача</h3>
              <button
                onClick={requestClose}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Название задачи *
                </label>
                <input
                  type="text"
                  required
                  placeholder="например: Позвонить по поводу первого взноса"
                  value={newTask.title}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2 text-xs outline-none focus:border-blue-500 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">ФИО клиента</label>
                  <input
                    type="text"
                    placeholder="Алиев Бахром"
                    value={newTask.client_name}
                    onChange={(e) => setNewTask({ ...newTask, client_name: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2 text-xs outline-none focus:border-blue-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Телефон</label>
                  <input
                    type="text"
                    placeholder="+992 90 000 0000"
                    value={newTask.phone}
                    onChange={(e) => setNewTask({ ...newTask, phone: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2 text-xs outline-none focus:border-blue-500 focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Срок исполнения *</label>
                  <input
                    type="date"
                    required
                    value={newTask.due_date}
                    onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2 text-xs outline-none focus:border-blue-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Приоритет</label>
                  <select
                    value={newTask.priority}
                    onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs outline-none focus:border-blue-500 focus:bg-white"
                  >
                    <option value="LOW">Низкий</option>
                    <option value="NORMAL">Обычный</option>
                    <option value="HIGH">Срочно (Высокий)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Описание / Комментарий</label>
                <textarea
                  rows={2}
                  placeholder="Дополнительные детали задачи..."
                  value={newTask.description}
                  onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 p-2.5 text-xs outline-none focus:border-blue-500 focus:bg-white"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={requestClose}
                  className="rounded-xl px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-xl bg-blue-600 hover:bg-blue-700 px-5 py-2 text-xs font-bold text-white shadow-md transition disabled:opacity-50"
                >
                  {isSubmitting ? 'Сохранение...' : 'Сохранить'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
