import React, { useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useModalDismiss } from '../../hooks/useModalDismiss';
import {
  Users as UsersIcon,
  Plus,
  Search,
  ShieldCheck,
  UserCheck,
  Briefcase,
  Wallet,
  CheckCircle2,
  Lock,
  X
} from 'lucide-react';

export const UsersPage = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([
    {
      id: 1,
      name: 'Администратор Системы',
      email: 'admin@tozon.tj',
      role: 'ADMIN',
      status: 'ACTIVE',
      created_at: '2026-08-01',
    },
    {
      id: 2,
      name: 'Руководитель Отдела Продаж',
      email: 'director@tozon.tj',
      role: 'DIRECTOR',
      status: 'ACTIVE',
      created_at: '2026-08-05',
    },
    {
      id: 3,
      name: 'Менеджер по продажам (Алишер)',
      email: 'manager1@tozon.tj',
      role: 'SALES_MANAGER',
      status: 'ACTIVE',
      created_at: '2026-08-10',
    },
    {
      id: 4,
      name: 'Финансовый менеджер (Казначейство)',
      email: 'finance@tozon.tj',
      role: 'FINANCE_MANAGER',
      status: 'ACTIVE',
      created_at: '2026-08-12',
    },
  ]);

  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    role: 'SALES_MANAGER',
    password: '',
  });

  const isDirty = Boolean(newUser.name.trim() || newUser.email.trim() || newUser.password.trim());
  const { requestClose } = useModalDismiss({
    isOpen: isModalOpen,
    onClose: () => setIsModalOpen(false),
    isDirty,
    confirmMessage: 'Данные нового сотрудника не сохранены. Закрыть окно?'
  });

  const getRoleBadge = (role) => {
    switch (role) {
      case 'ADMIN':
        return { label: 'Администратор', bg: 'bg-rose-50 text-rose-700 border-rose-200', icon: ShieldCheck };
      case 'DIRECTOR':
        return { label: 'Директор', bg: 'bg-purple-50 text-purple-700 border-purple-200', icon: Briefcase };
      case 'SALES_MANAGER':
        return { label: 'Менеджер продаж', bg: 'bg-blue-50 text-blue-700 border-blue-200', icon: UserCheck };
      case 'FINANCE_MANAGER':
        return { label: 'Финансист', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: Wallet };
      default:
        return { label: role, bg: 'bg-slate-50 text-slate-700 border-slate-200', icon: UserCheck };
    }
  };

  const handleCreateUser = (e) => {
    e.preventDefault();
    setUsers((prev) => [
      ...prev,
      {
        id: Date.now(),
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        status: 'ACTIVE',
        created_at: new Date().toISOString().split('T')[0],
      },
    ]);
    setIsModalOpen(false);
    setNewUser({ name: '', email: '', role: 'SALES_MANAGER', password: '' });
  };

  const filteredUsers = users.filter((u) => {
    return (
      !search ||
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
    );
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <UsersIcon className="h-7 w-7 text-blue-600" />
            <span>Сотрудники и роли доступа</span>
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500">
            Управление учетными записями, менеджерами отдела продаж, финансистами и правами
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 text-xs font-bold transition shadow-md cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          <span>Добавить сотрудника</span>
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="flex items-center justify-between gap-4 rounded-2xl bg-white p-4 border border-slate-200 shadow-2xs">
        <div className="relative min-w-[240px] max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Поиск сотрудника по имени или email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3.5 py-1.5 text-xs text-slate-900 outline-none focus:border-blue-500 focus:bg-white transition"
          />
        </div>

        <div className="text-xs text-slate-500 font-semibold">
          Всего сотрудников: <strong className="text-slate-900">{filteredUsers.length}</strong>
        </div>
      </div>

      {/* Users Table */}
      <div className="rounded-2xl bg-white border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
              <tr>
                <th className="p-3.5 pl-5">ФИО Сотрудника</th>
                <th className="p-3.5">Email (Логин)</th>
                <th className="p-3.5">Роль в CRM</th>
                <th className="p-3.5">Статус</th>
                <th className="p-3.5">Дата регистрации</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.map((u) => {
                const badge = getRoleBadge(u.role);
                const Icon = badge.icon;
                return (
                  <tr key={u.id} className="hover:bg-slate-50 transition">
                    <td className="p-3.5 pl-5 font-bold text-slate-900 flex items-center gap-2.5">
                      <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-100 text-blue-800 font-black text-xs">
                        {u.name.charAt(0)}
                      </div>
                      <span>{u.name}</span>
                    </td>
                    <td className="p-3.5 font-medium text-slate-600">{u.email}</td>
                    <td className="p-3.5">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold border text-[10px] ${badge.bg}`}>
                        <Icon className="h-3 w-3" />
                        <span>{badge.label}</span>
                      </span>
                    </td>
                    <td className="p-3.5">
                      <span className="inline-flex items-center gap-1 text-emerald-700 font-bold text-[11px]">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                        <span>Активен</span>
                      </span>
                    </td>
                    <td className="p-3.5 text-slate-500">{u.created_at}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in">
          <div className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="text-lg font-bold text-slate-900">Новый сотрудник</h3>
              <button
                onClick={requestClose}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">ФИО сотрудника *</label>
                <input
                  type="text"
                  required
                  placeholder="Алиев Рустам"
                  value={newUser.name}
                  onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2 text-sm outline-none focus:border-blue-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Email (Логин) *</label>
                <input
                  type="email"
                  required
                  placeholder="rustam@tozon.tj"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2 text-sm outline-none focus:border-blue-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Роль в системе *</label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:bg-white"
                >
                  <option value="SALES_MANAGER">Менеджер по продажам</option>
                  <option value="FINANCE_MANAGER">Финансовый менеджер</option>
                  <option value="DIRECTOR">Директор</option>
                  <option value="ADMIN">Администратор</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Пароль *</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2 text-sm outline-none focus:border-blue-500 focus:bg-white"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={requestClose}
                  className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-blue-600 px-5 py-2 text-sm font-bold text-white shadow-md hover:bg-blue-700 transition"
                >
                  Создать
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
