import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { useAuth } from '../auth/AuthContext';
import { useModalDismiss } from '../../hooks/useModalDismiss';
import {
  PERMISSION_GROUPS,
  ALL_PERMISSIONS,
  ROLE_DEFAULTS,
  ACCESS_PROFILE,
  normalizePermissions,
  canWriteSection
} from '../../utils/permissions';
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
  X,
  Trash2,
  Loader2,
  KeyRound,
  Edit2,
  ShieldAlert,
  Check,
  SlidersHorizontal,
  Info,
  Package
} from 'lucide-react';

export const UsersPage = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleCode, setNewRoleCode] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState(null); // null = create new, number = editing existing
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'SALES_MANAGER',
    password: '',
    permissions: normalizePermissions(ROLE_DEFAULTS.SALES_MANAGER || []),
    is_active: 1,
  });

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/users');
      const list = res.data?.users || res.users || [];
      setUsers(list);
    } catch (err) {
      console.error('Ошибка загрузки пользователей:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    api.get('/roles').then(res => setRoles(res.data?.roles || [])).catch(console.error);
  }, []);

  const openCreateModal = () => {
    setEditingUserId(null);
    setFormData({
      name: '',
      email: '',
      role: 'SALES_MANAGER',
      is_sales_rep: true,
      password: '',
      permissions: normalizePermissions(ROLE_DEFAULTS.SALES_MANAGER || []),
      is_active: 1,
    });
    setIsModalOpen(true);
  };

  const openEditModal = (u) => {
    setEditingUserId(u.id);
    let userPerms = Array.isArray(u.permissions) ? u.permissions : [];
    if (u.role === 'ADMIN' && (userPerms.includes('*') || userPerms.length === 0)) {
      userPerms = ALL_PERMISSIONS;
    }
    const isSalesRep = u.is_sales_rep !== undefined ? Boolean(u.is_sales_rep) : (u.role === 'SALES_MANAGER');
    setFormData({
      name: u.name || '',
      email: u.email || '',
      role: u.role || 'SALES_MANAGER',
      is_sales_rep: isSalesRep,
      password: '', // optional on edit
      permissions: normalizePermissions(userPerms),
      is_active: u.is_active ? 1 : 0,
    });
    setIsModalOpen(true);
  };

  const isDirty = Boolean(
    formData.name.trim() || formData.email.trim() || formData.password.trim()
  );

  const { requestClose } = useModalDismiss({
    isOpen: isModalOpen,
    onClose: () => setIsModalOpen(false),
    isDirty: !editingUserId && isDirty,
    confirmMessage: 'Данные сотрудника не сохранены. Закрыть окно?'
  });

  const handleRoleChange = (newRole) => {
    const defaultPerms = roles.find(r => r.code === newRole)?.permissions || ROLE_DEFAULTS[newRole] || [];
    setFormData((prev) => ({
      ...prev,
      role: newRole,
      is_sales_rep: newRole === 'SALES_MANAGER',
      permissions: normalizePermissions(defaultPerms)
    }));
  };

  const canManageUsers = canWriteSection(currentUser, 'users.manage');
  const togglePermission = (row, mode) => {
    setFormData(prev => {
      const next = new Set(prev.permissions || []);
      next.delete('*');
      next.add(ACCESS_PROFILE);
      const key = mode === 'read' ? row.readKey : row.writeKey;
      if (next.has(key)) {
        next.delete(key);
        if (mode === 'read') next.delete(row.writeKey);
      } else {
        next.add(key);
        if (mode === 'write') next.add(row.readKey);
      }
      return { ...prev, permissions: [...next] };
    });
  };
  const toggleGroupPermissions = group => {
    const keys = group.permissions.flatMap(p => [p.readKey, p.writeKey]);
    setFormData(prev => {
      const current = prev.permissions || [];
      const all = keys.every(k => current.includes(k));
      return { ...prev, permissions: all
        ? current.filter(k => !keys.includes(k))
        : [...new Set([...current, ACCESS_PROFILE, ...keys])] };
    });
  };
  const selectAllPermissions = () => setFormData(prev => ({ ...prev, permissions: [ACCESS_PROFILE, ...ALL_PERMISSIONS, ...(prev.permissions || []).filter(k => k === 'finance.restricted')] }));
  const clearAllPermissions = () => setFormData(prev => ({ ...prev, permissions: [ACCESS_PROFILE, ...(prev.permissions || []).filter(k => k === 'finance.restricted')] }));

  const getRoleBadge = (role) => {
    const found = roles.find(r => r.code === role);
    if (found && !found.is_system) return { label: found.name, bg: 'bg-slate-50 text-slate-700 border-slate-200', icon: UserCheck };
    switch (role) {
      case 'ADMIN':
        return { label: 'Администратор', bg: 'bg-rose-50 text-rose-700 border-rose-200', icon: ShieldCheck };
      case 'DIRECTOR':
        return { label: 'Директор', bg: 'bg-purple-50 text-purple-700 border-purple-200', icon: Briefcase };
      case 'SALES_MANAGER':
      case 'MANAGER':
        return { label: 'Менеджер продаж', bg: 'bg-blue-50 text-blue-700 border-blue-200', icon: UserCheck };
      case 'WAREHOUSE_MANAGER':
        return { label: 'Заведующий складом', bg: 'bg-amber-50 text-amber-700 border-amber-200', icon: Package };
      case 'CASHIER':
        return { label: 'Кассир', bg: 'bg-teal-50 text-teal-700 border-teal-200', icon: Wallet };
      case 'FINANCE_MANAGER':
        return { label: 'Финансист', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: Wallet };
      default:
        return { label: role, bg: 'bg-slate-50 text-slate-700 border-slate-200', icon: UserCheck };
    }
  };

  const handleSaveUser = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim()) {
      alert('Пожалуйста, укажите ФИО и Email сотрудника');
      return;
    }
    if (!editingUserId && !formData.password.trim()) {
      alert('Пожалуйста, укажите пароль для нового сотрудника');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingUserId) {
        // Edit existing
        const payload = {
          name: formData.name.trim(),
          email: formData.email.trim(),
          role: formData.role,
          is_sales_rep: Boolean(formData.is_sales_rep),
          permissions: formData.permissions,
          is_active: formData.is_active
        };
        if (formData.password.trim()) {
          payload.password = formData.password.trim();
        }
        await api.patch(`/users/${editingUserId}`, payload);
      } else {
        // Create new
        await api.post('/users', {
          name: formData.name.trim(),
          email: formData.email.trim(),
          role: formData.role,
          is_sales_rep: Boolean(formData.is_sales_rep),
          password: formData.password.trim(),
          permissions: formData.permissions
        });
      }

      setIsModalOpen(false);
      await fetchUsers();
    } catch (err) {
      alert(err.message || 'Ошибка при сохранении сотрудника');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteUser = async (u) => {
    if (String(u.id) === String(currentUser?.id)) {
      alert('Нельзя удалить собственную учетную запись');
      return;
    }
    if (!window.confirm(`Вы уверены, что хотите удалить сотрудника "${u.name}" (${u.email})?`)) {
      return;
    }

    try {
      await api.delete(`/users/${u.id}`);
      await fetchUsers();
    } catch (err) {
      alert(err.message || 'Ошибка при удалении сотрудника');
    }
  };

  const filteredUsers = users.filter((u) => {
    return (
      !search ||
      (u.name && u.name.toLowerCase().includes(search.toLowerCase())) ||
      (u.email && u.email.toLowerCase().includes(search.toLowerCase()))
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
            Управление учетными записями, правами доступа по функциям и паролями сотрудников
          </p>
        </div>

        {canManageUsers && (
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 text-xs font-bold transition shadow-md shadow-blue-500/20 cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Добавить сотрудника</span>
          </button>
        )}
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
                <th className="p-3.5">Активные доступы</th>
                <th className="p-3.5">Статус</th>
                <th className="p-3.5">Дата регистрации</th>
                {canManageUsers && (
                  <th className="p-3.5 text-right pr-5">Действия</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={canManageUsers ? 7 : 6} className="p-8 text-center text-slate-400">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-blue-600 mb-2" />
                    Загрузка списка пользователей...
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={canManageUsers ? 7 : 6} className="p-8 text-center text-slate-400">
                    Сотрудники не найдены
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const badge = getRoleBadge(u.role);
                  const Icon = badge.icon;
                  const formattedDate = u.created_at
                    ? new Date(u.created_at).toLocaleDateString('ru-RU')
                    : '—';

                  const userPerms = Array.isArray(u.permissions) ? u.permissions : [];
                  const isFullAdmin = u.role === 'ADMIN' || userPerms.includes('*');
                  const countPerms = isFullAdmin ? ALL_PERMISSIONS.length : userPerms.length;

                  return (
                    <tr key={u.id} className="hover:bg-slate-50/80 transition">
                      <td className="p-3.5 pl-5 font-bold text-slate-900 flex items-center gap-2.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-100 text-blue-800 font-black text-xs">
                          {(u.name || 'U').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <span>{u.name || 'Без имени'}</span>
                          {String(u.id) === String(currentUser?.id) && (
                            <span className="ml-2 text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-normal">
                              Вы
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-3.5 font-medium text-slate-600">{u.email}</td>
                      <td className="p-3.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold border text-[10px] ${badge.bg}`}>
                            <Icon className="h-3 w-3" />
                            <span>{badge.label}</span>
                          </span>
                          {Boolean(u.is_sales_rep) && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full font-bold border text-[10px] bg-sky-50 text-sky-700 border-sky-200">
                              Отдел продаж
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-3.5">
                        {isFullAdmin ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold">
                            <ShieldCheck className="h-3.5 w-3.5" />
                            <span>Полный доступ (Все модули)</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-100 text-[11px] font-semibold">
                            <KeyRound className="h-3 w-3 text-blue-500" />
                            <span>{countPerms} из {ALL_PERMISSIONS.length} функций</span>
                          </span>
                        )}
                      </td>
                      <td className="p-3.5">
                        <span className={`inline-flex items-center gap-1 font-bold text-[11px] ${u.is_active ? 'text-emerald-700' : 'text-slate-400'}`}>
                          <CheckCircle2 className={`h-3.5 w-3.5 ${u.is_active ? 'text-emerald-500' : 'text-slate-300'}`} />
                          <span>{u.is_active ? 'Активен' : 'Отключен'}</span>
                        </span>
                      </td>
                      <td className="p-3.5 text-slate-500">{formattedDate}</td>
                      {canManageUsers && (
                        <td className="p-3.5 text-right pr-5">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => openEditModal(u)}
                              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 text-[11px] font-bold transition cursor-pointer"
                              title="Настроить права и доступы"
                            >
                              <SlidersHorizontal className="h-3 w-3" />
                              <span>Доступы</span>
                            </button>

                            {currentUser?.role === 'ADMIN' && String(u.id) !== String(currentUser?.id) && (
                              <button
                                onClick={() => handleDeleteUser(u)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                                title="Удалить сотрудника"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Create or Edit User with Granular Permissions */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs overflow-y-auto animate-in fade-in">
          <div className="relative w-full max-w-5xl my-8 rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-slate-50/50 shrink-0">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md shadow-blue-500/20">
                  <KeyRound className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    {editingUserId ? 'Редактирование сотрудника и доступов' : 'Новый сотрудник и настройка прав'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Настройте учетные данные и определите доступные функции CRM
                  </p>
                </div>
              </div>

              <button
                onClick={requestClose}
                className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSaveUser} className="overflow-y-auto p-6 space-y-6 flex-1">
              {/* Section 1: User Profile Info */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <span>1. Основные данные и учетная запись</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      ФИО сотрудника *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Алиев Рустам"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs text-slate-900 outline-none focus:border-blue-500 focus:bg-white transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Email (Логин для входа) *
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="rustam@tozon.tj"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs text-slate-900 outline-none focus:border-blue-500 focus:bg-white transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Базовая роль (Шаблон прав) *
                    </label>
                    <select
                      value={formData.role}
                      onChange={(e) => handleRoleChange(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 outline-none focus:border-blue-500 focus:bg-white transition"
                    >
                      <option value="SALES_MANAGER">Менеджер по продажам (CRM, шахматка, лиды, сделки)</option>
                      <option value="WAREHOUSE_MANAGER">Заведующий складом (Склад стройматериалов, учет, списание, остатки)</option>
                      <option value="CASHIER">Кассир (ПКО, приём платежей)</option>
                      <option value="FINANCE_MANAGER">Финансовый менеджер (Касса, платежи, ДДС, должники)</option>
                      <option value="DIRECTOR">Директор (Аналитика, продажи, финансы, отчеты)</option>
                      <option value="ADMIN">Администратор (Полный неограниченный доступ)</option>
                      {roles.filter(r => r.is_active && !["ADMIN","DIRECTOR","SALES_MANAGER","WAREHOUSE_MANAGER","FINANCE_MANAGER","CASHIER"].includes(r.code)).map(r => <option key={r.code} value={r.code}>{r.name}</option>)}
                    </select>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="checkbox"
                      id="is_sales_rep_check"
                      checked={Boolean(formData.is_sales_rep)}
                      onChange={(e) => setFormData(prev => ({ ...prev, is_sales_rep: e.target.checked }))}
                      className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                    <label htmlFor="is_sales_rep_check" className="text-xs font-semibold text-slate-700 cursor-pointer select-none">
                      Сотрудник отдела продаж (участвует в воронке лидов, планах продаж и расчете KPI)
                    </label>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      {editingUserId ? 'Новый пароль (оставьте пустым, если не меняется)' : 'Пароль для входа *'}
                    </label>
                    <input
                      type="password"
                      required={!editingUserId}
                      placeholder={editingUserId ? '•••••••• (без изменений)' : '••••••••'}
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs text-slate-900 outline-none focus:border-blue-500 focus:bg-white transition"
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Granular Permissions */}
              <div className="space-y-4 pt-4 border-t border-slate-100">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                      <span>2. Разрешения и доступ к функциям</span>
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Чтение — просмотр данных. Добавление / редактирование — внесение изменений. Для изменения требуется чтение.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-100">
                      Выбрано: {ALL_PERMISSIONS.filter(k => formData.permissions?.includes(k)).length} из {ALL_PERMISSIONS.length}
                    </span>
                    <button
                      type="button"
                      onClick={selectAllPermissions}
                      className="text-[11px] font-bold text-slate-600 hover:text-blue-600 px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 transition cursor-pointer"
                    >
                      Выбрать все
                    </button>
                    <button
                      type="button"
                      onClick={clearAllPermissions}
                      className="text-[11px] font-bold text-slate-600 hover:text-rose-600 px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 transition cursor-pointer"
                    >
                      Снять все
                    </button>
                  </div>
                </div>

                {formData.role === 'ADMIN' && <p className="text-xs text-amber-700">Администратор имеет полный доступ. Для ограничения прав выберите другую роль.</p>}
                {/* Permission Groups Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {PERMISSION_GROUPS.map((group) => {
                    const groupKeys = group.permissions.flatMap((p) => [p.readKey, p.writeKey]);
                    const selectedInGroup = groupKeys.filter((k) =>
                      formData.permissions?.includes(k)
                    );
                    const isAllSelected = selectedInGroup.length === groupKeys.length;

                    return (
                      <div
                        key={group.id}
                        className="rounded-xl border border-slate-200/80 bg-slate-50/40 p-3.5 space-y-2.5 transition hover:border-slate-300"
                      >
                        <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                          <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                            <span>{group.title}</span>
                          </span>

                          <button
                            type="button"
                            onClick={() => toggleGroupPermissions(group)}
                            className="text-[10px] font-bold text-blue-600 hover:text-blue-800 transition cursor-pointer"
                          >
                            {isAllSelected ? 'Снять' : 'Все в группе'}
                          </button>
                        </div>

                        <div className="grid grid-cols-[minmax(0,1fr)_60px_96px] gap-2 text-[10px] font-bold text-slate-500 pb-1">
                          <span>Раздел</span><span className="text-center">Чтение</span><span className="text-center">Добавление / редактирование</span>
                        </div>
                        <div className="space-y-2">
                          {group.permissions.map(p => (
                            <div key={p.key} className="grid grid-cols-[minmax(0,1fr)_60px_96px] items-center gap-2 p-2 rounded-lg border border-slate-200 bg-white">
                              <div className="text-[11px] leading-tight min-w-0">
                                <div className="font-bold text-slate-800">{p.label}</div>
                                <div className="text-[10px] text-slate-400 mt-0.5">{p.desc}</div>
                              </div>
                              {['read', 'write'].map(mode => (
                                <label key={mode} className="flex items-center justify-center min-h-9 cursor-pointer">
                                  <input type="checkbox"
                                    aria-label={`${p.label}: ${mode === 'read' ? 'Чтение' : 'Добавление / редактирование'}`}
                                    checked={Boolean(formData.permissions?.includes(mode === 'read' ? p.readKey : p.writeKey))}
                                    onChange={() => togglePermission(p, mode)}
                                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer" />
                                </label>
                              ))}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 sticky bottom-0 bg-white">
                <button
                  type="button"
                  onClick={requestClose}
                  disabled={isSubmitting}
                  className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-xl bg-blue-600 px-5 py-2 text-xs font-bold text-white shadow-md shadow-blue-500/20 hover:bg-blue-700 transition cursor-pointer disabled:opacity-50 flex items-center gap-2"
                >
                  {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  <span>{editingUserId ? 'Сохранить изменения' : 'Создать сотрудника'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

