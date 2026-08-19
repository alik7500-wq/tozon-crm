import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthContext';
import {
  LayoutDashboard,
  Building2,
  Users,
  FileCheck,
  CreditCard,
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
  Plus,
  Home,
  Kanban,
  CheckSquare,
  FileText,
  Calendar,
  AlertCircle,
  BarChart3,
  UserPlus,
  Zap,
  Smartphone,
  MessageSquare
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
    inventory: true,
    finance: true,
    settings: false,
  });

  const toggleMenu = (key) => {
    setExpandedMenus((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Auto-expand menu when on its sub-route
  useEffect(() => {
    const path = location.pathname;
    if (
      path.startsWith('/leads') ||
      path.startsWith('/deals') ||
      path.startsWith('/clients') ||
      path.startsWith('/crm')
    ) {
      setExpandedMenus((prev) => ({ ...prev, crm: true }));
    }
    if (path.startsWith('/finance')) {
      setExpandedMenus((prev) => ({ ...prev, finance: true }));
    }
    if (path.startsWith('/projects') || path === '/apartments') {
      setExpandedMenus((prev) => ({ ...prev, inventory: true }));
    }
  }, [location.pathname]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navGroups = [
    { type: 'link', label: 'Обзор', path: '/', icon: LayoutDashboard },
    { type: 'link', label: 'Задачи', path: '/tasks', icon: CheckSquare },
    {
      type: 'group',
      id: 'crm',
      label: 'CRM',
      icon: Users,
      children: [
        { label: 'Лиды', path: '/leads', icon: UserPlus },
        { label: 'Сделки', path: '/deals', icon: FileCheck },
        { label: 'Клиенты', path: '/clients', icon: Users },
        { label: 'SMS-оповещения', path: '/crm/sms-notifications', icon: Smartphone },
        { label: 'SMS шаблоны', path: '/crm/sms-templates', icon: MessageSquare },
      ],
    },
    {
      type: 'group',
      id: 'inventory',
      label: 'Проекты',
      icon: Building2,
      children: [
        { label: 'Объекты ЖК', path: '/projects', icon: Building2 },
        { label: 'Квартиры', path: '/apartments', icon: Home },
      ],
    },
    { type: 'link', label: 'Аналитика', path: '/reports', icon: BarChart3 },
    {
      type: 'group',
      id: 'finance',
      label: 'Финансы',
      icon: CreditCard,
      children: [
        { label: 'Календарь платежей', path: '/finance/calendar', icon: Calendar },
        { label: 'Должники', path: '/finance/debtors', icon: AlertCircle },
      ],
    },
    { type: 'link', label: 'Платежи', path: '/payments', icon: CreditCard },
    { type: 'link', label: 'Автоматизация', path: '/automation', icon: Zap },
    { type: 'link', label: 'Уведомления', path: '/notifications', icon: Bell },
  ];

  if (user?.role === 'ADMIN') {
    navGroups.push({ type: 'link', label: 'Пользователи', path: '/users', icon: Users });
    navGroups.push({ type: 'link', label: 'Настройки', path: '/settings', icon: Settings });
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 text-slate-900">
      {/* Sidebar */}
      <aside
        className={`relative flex flex-col border-r border-slate-200 bg-white transition-all duration-300 z-30 shadow-xs ${
          isSidebarOpen ? 'w-64' : 'w-20'
        }`}
      >
        {/* Brand */}
        <div className="flex h-16 items-center justify-between px-4 border-b border-slate-200">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-500 shadow-md shadow-blue-500/20">
              <Building2 className="h-5 w-5 text-white" />
            </div>
            {isSidebarOpen && (
              <div className="flex flex-col">
                <span className="font-extrabold tracking-tight text-slate-900 leading-tight text-base">TOZON CRM</span>
                <span className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase">Real Estate</span>
              </div>
            )}
          </div>
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition cursor-pointer"
          >
            <Menu className="h-4 w-4" />
          </button>
        </div>

        {/* Navigation links */}
        <nav className="flex-1 space-y-1 p-3 overflow-y-auto">
          {navGroups.map((item) => {
            if (item.type === 'link') {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === '/'}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-xl px-3 py-2 text-xs font-semibold transition duration-150 group ${
                      isActive
                        ? 'bg-blue-50 text-blue-700 font-bold border border-blue-200/80 shadow-2xs'
                        : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
                    }`
                  }
                >
                  <Icon className="h-4.5 w-4.5 shrink-0 transition-colors group-hover:text-blue-600" />
                  {isSidebarOpen && <span className="truncate">{item.label}</span>}
                </NavLink>
              );
            }

            // Group with Submenu
            const Icon = item.icon;
            const isGroupActive = item.children.some((c) => location.pathname === c.path);
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
                      ? 'text-blue-700 bg-blue-50/50 font-bold'
                      : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Icon className={`h-4.5 w-4.5 shrink-0 ${isGroupActive ? 'text-blue-600' : 'text-slate-500'}`} />
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
                      return (
                        <NavLink
                          key={sub.path}
                          to={sub.path}
                          className={({ isActive }) =>
                            `flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[11px] transition ${
                              isActive
                                ? 'bg-blue-600 text-white font-bold shadow-2xs'
                                : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900 font-medium'
                            }`
                          }
                        >
                          <SubIcon className="h-3.5 w-3.5 shrink-0 opacity-80" />
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
        <div className="p-3 border-t border-slate-200 bg-slate-50/50">
          <div className="flex items-center justify-between rounded-xl bg-white p-2.5 border border-slate-200 shadow-2xs">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-700 font-bold text-xs border border-blue-200">
                {user?.name?.charAt(0) || 'U'}
              </div>
              {isSidebarOpen && (
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-semibold text-slate-900 truncate">{user?.name}</span>
                  <span className="flex items-center gap-1 text-[11px] text-blue-600 font-medium">
                    {user?.role === 'ADMIN' ? (
                      <>
                        <ShieldCheck className="h-3 w-3" /> Администратор
                      </>
                    ) : (
                      <>
                        <UserCheck className="h-3 w-3" /> Менеджер
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
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-10 py-2 text-xs text-slate-900 placeholder-slate-400 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/10"
            />
          </div>

          {/* Quick Actions & Notifications */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-1.5 border border-slate-200 text-xs text-slate-600">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>База данных: <strong className="text-slate-800">SQLite WAL</strong></span>
            </div>

            <NavLink
              to="/notifications"
              title="Уведомления"
              className="relative rounded-xl border border-slate-200 bg-white p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition cursor-pointer"
            >
              <Bell className="h-4 w-4" />
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-blue-600 ring-2 ring-white"></span>
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
