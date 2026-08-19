import React, { useState } from 'react';
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
  X
} from 'lucide-react';

export const TasksPage = () => {
  const [tasks, setTasks] = useState([
    {
      id: 1,
      title: 'Позвонить клиенту по поводу рассрочки',
      type: 'CALL',
      client_name: 'Фарход Рахимов',
      phone: '+992 92 777 8899',
      project_name: 'ЖК TOZON PLAZA',
      unit_number: '45',
      due_date: new Date().toISOString().split('T')[0],
      priority: 'HIGH',
      status: 'OPEN',
    },
    {
      id: 2,
      title: 'Встреча в офисе продаж для подписания договора',
      type: 'MEETING',
      client_name: 'Шахноза Алиева',
      phone: '+992 93 555 1234',
      project_name: 'TOZON PLAZA 2',
      unit_number: '12',
      due_date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
      priority: 'NORMAL',
      status: 'OPEN',
    },
    {
      id: 3,
      title: 'Подготовить расчет графика платежей на 24 месяца',
      type: 'DOCUMENT',
      client_name: 'Илхом Каримов',
      phone: '+992 92 333 4455',
      project_name: 'ЖК TOZON PLAZA',
      unit_number: '78',
      due_date: new Date(Date.now() + 172800000).toISOString().split('T')[0],
      priority: 'LOW',
      status: 'OPEN',
    },
  ]);

  const [filter, setFilter] = useState('ALL'); // ALL, TODAY, OVERDUE, COMPLETED
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTask, setNewTask] = useState({
    title: '',
    type: 'CALL',
    client_name: '',
    phone: '',
    due_date: new Date().toISOString().split('T')[0],
    priority: 'NORMAL',
  });

  const toggleTaskStatus = (id) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === id ? { ...t, status: t.status === 'OPEN' ? 'COMPLETED' : 'OPEN' } : t
      )
    );
  };

  const handleCreateTask = (e) => {
    e.preventDefault();
    setTasks((prev) => [
      {
        ...newTask,
        id: Date.now(),
        status: 'OPEN',
      },
      ...prev,
    ]);
    setIsModalOpen(false);
    setNewTask({
      title: '',
      type: 'CALL',
      client_name: '',
      phone: '',
      due_date: new Date().toISOString().split('T')[0],
      priority: 'NORMAL',
    });
  };

  const filteredTasks = tasks.filter((t) => {
    const matchesSearch =
      !search ||
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      t.client_name.toLowerCase().includes(search.toLowerCase());

    if (filter === 'COMPLETED') return matchesSearch && t.status === 'COMPLETED';
    if (filter === 'OPEN') return matchesSearch && t.status === 'OPEN';
    return matchesSearch;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <CheckSquare className="h-7 w-7 text-indigo-600" />
            <span>Задачи и напоминания</span>
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500">
            Контроль звонков, встреч, подготовки договоров и сроков оплаты клиентов
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 text-xs font-bold transition shadow-md cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          <span>Создать задачу</span>
        </button>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase">Всего задач</span>
          <div className="text-2xl font-black text-slate-900 mt-1">{tasks.length}</div>
        </div>

        <div className="rounded-2xl border border-indigo-200 bg-indigo-50/50 p-4 shadow-2xs">
          <span className="text-[11px] font-bold text-indigo-700 uppercase">Открытые</span>
          <div className="text-2xl font-black text-indigo-700 mt-1">
            {tasks.filter((t) => t.status === 'OPEN').length}
          </div>
        </div>

        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 shadow-2xs">
          <span className="text-[11px] font-bold text-emerald-700 uppercase">Выполненные</span>
          <div className="text-2xl font-black text-emerald-700 mt-1">
            {tasks.filter((t) => t.status === 'COMPLETED').length}
          </div>
        </div>

        <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4 shadow-2xs">
          <span className="text-[11px] font-bold text-amber-700 uppercase">Срочные (HIGH)</span>
          <div className="text-2xl font-black text-amber-700 mt-1">
            {tasks.filter((t) => t.priority === 'HIGH' && t.status === 'OPEN').length}
          </div>
        </div>
      </div>

      {/* Controls & Filter */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-white p-4 border border-slate-200 shadow-2xs">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="relative min-w-[240px] max-w-sm flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Поиск по названию или клиенту..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3.5 py-1.5 text-xs text-slate-900 outline-none focus:border-indigo-500 focus:bg-white transition"
            />
          </div>

          <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1 border border-slate-200">
            {['ALL', 'OPEN', 'COMPLETED'].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`rounded-lg px-3 py-1 text-xs font-bold transition cursor-pointer ${
                  filter === f
                    ? 'bg-white text-indigo-700 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {f === 'ALL' ? 'Все' : f === 'OPEN' ? 'В работе' : 'Выполнено'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Task List */}
      <div className="space-y-3">
        {filteredTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center shadow-xs">
            <CheckSquare className="h-10 w-10 text-slate-300 mb-2" />
            <h3 className="text-base font-bold text-slate-900">Задач нет</h3>
            <p className="text-xs text-slate-500 mt-1">Все задачи выполнены или не созданы.</p>
          </div>
        ) : (
          filteredTasks.map((task) => (
            <div
              key={task.id}
              className={`rounded-2xl border p-4 transition flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                task.status === 'COMPLETED'
                  ? 'bg-slate-50/70 border-slate-200 opacity-60'
                  : 'bg-white border-slate-200 hover:border-indigo-300 shadow-2xs'
              }`}
            >
              <div className="flex items-start gap-3.5">
                <button
                  onClick={() => toggleTaskStatus(task.id)}
                  className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border transition cursor-pointer ${
                    task.status === 'COMPLETED'
                      ? 'bg-emerald-600 border-emerald-600 text-white'
                      : 'border-slate-300 hover:border-indigo-600 bg-white text-transparent'
                  }`}
                >
                  <CheckCircle2 className="h-4 w-4" />
                </button>

                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-sm font-bold ${
                        task.status === 'COMPLETED' ? 'line-through text-slate-500' : 'text-slate-900'
                      }`}
                    >
                      {task.title}
                    </span>
                    {task.priority === 'HIGH' && (
                      <span className="rounded-md bg-rose-50 px-2 py-0.5 text-[10px] font-extrabold text-rose-700 border border-rose-200 uppercase">
                        Срочно
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                    {task.client_name && (
                      <span className="flex items-center gap-1 text-slate-700 font-semibold">
                        <User className="h-3.5 w-3.5 text-slate-400" />
                        {task.client_name}
                      </span>
                    )}
                    {task.phone && (
                      <span className="flex items-center gap-1 text-blue-600">
                        <Phone className="h-3.5 w-3.5 text-blue-400" />
                        {task.phone}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5 text-slate-400" />
                      Срок: {new Date(task.due_date).toLocaleDateString('ru-RU')}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => toggleTaskStatus(task.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                    task.status === 'COMPLETED'
                      ? 'border-slate-300 text-slate-600 hover:bg-slate-100'
                      : 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100'
                  }`}
                >
                  {task.status === 'COMPLETED' ? 'Вернуть в работу' : 'Выполнить'}
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create Task Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in">
          <div className="relative w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="text-lg font-bold text-slate-900">Новая задача</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="mt-4 space-y-4">
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
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2 text-sm outline-none focus:border-indigo-500 focus:bg-white"
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
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2 text-sm outline-none focus:border-indigo-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Телефон</label>
                  <input
                    type="text"
                    placeholder="+992 90 000 0000"
                    value={newTask.phone}
                    onChange={(e) => setNewTask({ ...newTask, phone: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2 text-sm outline-none focus:border-indigo-500 focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Срок исполнения</label>
                  <input
                    type="date"
                    required
                    value={newTask.due_date}
                    onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2 text-sm outline-none focus:border-indigo-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Приоритет</label>
                  <select
                    value={newTask.priority}
                    onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:bg-white"
                  >
                    <option value="LOW">Низкий</option>
                    <option value="NORMAL">Обычный</option>
                    <option value="HIGH">Срочно (Высокий)</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-indigo-600 px-5 py-2 text-sm font-bold text-white shadow-md hover:bg-indigo-700 transition"
                >
                  Сохранить
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
