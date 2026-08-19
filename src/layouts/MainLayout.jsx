import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthContext';
import {
  CheckSquare,
  Users2,
  Building2,
  Home,
  BarChart3,
  Percent,
  CreditCard,
  Calendar,
  AlertCircle,
  Zap,
  Settings,
  LogOut,
  Search,
  ChevronRight,
  ChevronDown,
  ShieldCheck,
  UserCheck,
  Bell,
  Menu,
  X,
  FileCheck,
  FileText,
  UserPlus,
  Send,
  MessageSquare,
  LayoutDashboard,
  Layers,
  Sparkles
} from 'lucide-react';

export const MainLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Expand state for nested menus
  const [expandedMenus, setExpandedMenus] = useState({
    crm: true,
    projects: false,
    analytics: false,
    finance: false,
    payments: false,
    settings: false,
  });

  const toggleMenu = (key) => {
    setExpandedMenus((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Auto-expand menu when navigating to its sub-route
  useEffect(() => {
    const path = location.pathname;
    const search = location.search;

    if (
      path === '/leads' ||
      path === '/deals' ||
      path === '/contracts' ||
      (path === '/automation' && (search.includes('tab=templates') || search.includes('tab=logs')))
    ) {
      setExpandedMenus((prev) => ({ ...prev, crm: true }));
    }
    if (path.startsWith('/projects') || path === '/apartments') {
      setExpandedMenus((prev) => ({ ...prev, projects: true }));
    }
    if (path === '/reports' || path === '/') {
      setExpandedMenus((prev) => ({ ...prev, analytics: true }));
    }
    if (path.startsWith('/finance/debtors')) {
      setExpandedMenus((prev) => ({ ...prev, finance: true }));
    }
    if (path === '/payments' || path === '/finance/calendar') {
      setExpandedMenus((prev) => ({ ...prev, payments: true }));
    }
  }, [location.pathname, location.search]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navStructure = [
    { type: 'link', label: 'Задачи', path: '/tasks', icon: CheckSquare },
    {
      type: 'group',
      id: 'crm',
      label: 'CRM',
      icon: Users2,
      children: [
        { label: 'Лиды', path: '/leads', icon: UserPlus },
        { label: 'Сделки', path: '/deals', icon: FileCheck },
        { label: 'Клиенты', path: '/contracts', icon: FileText },
        { label: 'SMS-оповещения', path: '/automation?tab=logs', icon: Send },
        { label: 'SMS шаблоны', path: '/automation?tab=templates', icon: MessageSquare },
      ],
    },
    {
      type: 'group',
      id: 'projects',
      label: 'Проекты',
      icon: Building2,
      children: [
        { label: 'Объекты ЖК', path: '/projects', icon: Building2 },
        { label: 'Квартиры', path: '/apartments', icon: Home },
      ],
    },
    {
      type: 'group',
      id: 'analytics',
      label: 'Аналитика',
      icon: BarChart3,
      children: [
        { label: 'Отчеты и KPI', path: '/reports', icon: BarChart3 },
        { label: 'Обзор CRM', path: '/', icon: LayoutDashboard },
      ],
    },
    {
      type: 'group',
      id: 'finance',
      label: 'Финансы',
      icon: Percent,
      children: [
        { label: 'Должники', path: '/finance/debtors', icon: AlertCircle },
      ],
    },
    {
      type: 'group',
      id: 'payments',
      label: 'Платежи',
      icon: CreditCard,
      children: [
        { label: 'Реестр оплат', path: '/payments', icon: CreditCard },
        { label: 'Календарь платежей', path: '/finance/calendar', icon: Calendar },
      ],
    },
    {
      type: 'link',
      label: 'SMART BPM',
      path: '/automation',
      icon: Zap,
      badge: 'NEW',
    },
  ];

  if (user?.role === 'ADMIN') {
    navStructure.push({
      type: 'group',
      id: 'settings',
      label: 'Настройки',
      icon: Settings,
      children: [
        { label: 'Пользователи', path: '/users', icon: UserCheck },
        { label: 'Системные настройки', path: '/settings', icon: Settings },
      ],
    });
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 text-slate-900 font-sans">
      {/* Sidebar */}
      <aside
        className={`relative flex flex-col border-r border-slate-200 bg-white transition-all duration-300 z-30 shadow-xs ${
          isSidebarOpen ? 'w-64' : 'w-20'
        }`}
      >
        {/* Brand Header */}
        <div className="flex h-16 items-center justify-between px-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="flex items-center justify-center rounded-xl bg-amber-400 px-2.5 py-1 text-slate-950 font-black text-xs shadow-xs tracking-tight">
              crm
            </div>
            {isSidebarOpen && (
              <span className="font-extrabold text-base tracking-tight text-slate-900">
                tozon.tj
              </span>
            )}
          </div>
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition cursor-pointer"
          >
            <Menu className="h-4 w-4" />
          </button>
        </div>

        {/* Navigation list */}
        <nav className="flex-1 space-y-1 p-3 overflow-y-auto">
          {navStructure.map((item) => {
            if (item.type === 'link') {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === '/'}
                  className={({ isActive }) =>
                    `flex items-center justify-between rounded-xl px-3 py-2.5 text-xs font-semibold transition duration-150 group ${
                      isActive
                        ? 'bg-amber-400 text-slate-950 font-bold shadow-xs'
                        : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
                    }`
                  }
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Icon className="h-4.5 w-4.5 shrink-0 transition-colors" />
                    {isSidebarOpen && <span className="truncate">{item.label}</span>}
                  </div>
                  {isSidebarOpen && item.badge && (
                    <span className="rounded-md bg-amber-400 px-1.5 py-0.5 text-[9px] font-black text-slate-950 shadow-2xs uppercase">
                      {item.badge}
                    </span>
                  )}
                </NavLink>
              );
            }

            // Collapsible Group
            const Icon = item.icon;
            const isGroupActive = item.children.some(
              (c) => location.pathname + location.search === c.path || location.pathname === c.path.split('?')[0]
            );
            const isExpanded = expandedMenus[item.id];

            return (
              <div key={item.id} className="space-y-0.5">
                <button
                  type="button"
                  onClick={() => {
                    if (!isSidebarOpen) {
                      setIsSidebarOpen(true);
                    }
                    toggleMenu(item.id);
                  }}
                  className={`w-full flex items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold transition duration-150 group cursor-pointer ${
                    isGroupActive
                      ? 'text-slate-950 font-bold bg-slate-100'
                      : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Icon className={`h-4.5 w-4.5 shrink-0 ${isGroupActive ? 'text-slate-900' : 'text-slate-400'}`} />
                    {isSidebarOpen && <span className="truncate">{item.label}</span>}
                  </div>
                  {isSidebarOpen && (
                    <div className="text-slate-400 group-hover:text-slate-600">
                      {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                    </div>
                  )}
                </button>

                {/* Submenu Items */}
                {isSidebarOpen && isExpanded && (
                  <div className="pl-6 pr-1 space-y-0.5 animate-in fade-in duration-150">
                    {item.children.map((sub) => {
                      const SubIcon = sub.icon;
                      const isSubActive =
                        location.pathname + location.search === sub.path ||
                        (location.pathname === sub.path && !location.search && !sub.path.includes('?'));

                      return (
                        <NavLink
                          key={sub.path}
                          to={sub.path}
                          className={`flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[11px] transition ${
                            isSubActive
                              ? 'bg-amber-400 text-slate-950 font-bold shadow-xs'
                              : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900 font-medium'
                          }`}
                        >
                          <SubIcon className="h-3.5 w-3.5 shrink-0 opacity-70" />
                          <span className="truncate">{sub.label}</span>
                        </NavLink>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* User Card & Logout bottom */}
        <div className="p-3 border-t border-slate-100 bg-slate-50/50">
          <div className="flex items-center justify-between rounded-xl bg-white p-2.5 border border-slate-200 shadow-2xs">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-900 font-bold text-xs border border-amber-200">
                {user?.name?.charAt(0) || 'U'}
              </div>
              {isSidebarOpen && (
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-semibold text-slate-900 truncate">{user?.name}</span>
                  <span className="flex items-center gap-1 text-[11px] text-slate-500 font-medium">
                    {user?.role === 'ADMIN' ? (
                      <>
                        <ShieldCheck className="h-3 w-3 text-amber-600" /> Администратор
                      </>
                    ) : (
                      <>
                        <UserCheck className="h-3 w-3 text-blue-600" /> Менеджер
                      </>
                    )}
                  </span>
                </div>
              )}
            </div>
            {isSidebarOpen && (
              <button
                onClick={handleLogout}
                title="Выйти"
                className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition cursor-pointer"
              >
                <LogOut className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Topbar Header */}
        <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-6 z-20 shadow-2xs">
          {/* Global Search Bar */}
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Поиск по ФИО, телефону, номеру договора или квартиры..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-10 py-2 text-xs text-slate-900 placeholder-slate-400 outline-none transition focus:border-amber-400 focus:bg-white focus:ring-2 focus:ring-amber-400/20"
            />
          </div>

          {/* Quick Actions & Notifications */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-1.5 border border-slate-200 text-xs text-slate-600">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>База данных: <strong className="text-slate-800">Postgres / SQLite</strong></span>
            </div>

            <NavLink
              to="/notifications"
              title="Уведомления"
              className="relative rounded-xl border border-slate-200 bg-white p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition cursor-pointer"
            >
              <Bell className="h-4 w-4" />
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-amber-500 ring-2 ring-white"></span>
            </NavLink>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto bg-slate-50 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
