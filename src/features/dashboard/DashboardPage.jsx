import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import { useAuth } from '../auth/AuthContext';
import { formatContractNumber } from '../../utils/formatters';
import {
  Building2,
  Users,
  FileCheck,
  CreditCard,
  Clock,
  TrendingUp,
  PlusCircle,
  ArrowUpRight,
  Sparkles,
  Layers,
  CheckCircle2,
  Calendar,
  Phone,
  AlertCircle
} from 'lucide-react';

export const DashboardPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [statsData, setStatsData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDashboardStats = async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/dashboard/stats');
      setStatsData(res.data || res);
    } catch (err) {
      console.error('Error fetching dashboard stats:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const units = statsData?.units || { available_units: 0, reserved_units: 0, sold_units: 0, total_units: 0 };
  const leads = statsData?.leads || { new_leads: 0, total_leads: 0 };
  const deals = statsData?.deals || { total_deals: 0, total_volume_minor: 0 };
  const recentDeals = statsData?.recentDeals || [];
  const upcomingPayments = statsData?.upcomingPayments || [];

  const cards = [
    {
      title: 'Свободные квартиры',
      value: units.available_units.toLocaleString(),
      description: `Из ${units.total_units.toLocaleString()} квартир в базе`,
      icon: Building2,
      color: 'from-emerald-500 to-teal-600',
      bgColor: 'bg-emerald-50 text-emerald-700',
      badge: 'В наличии',
      link: '/projects',
    },
    {
      title: 'Активные брони',
      value: units.reserved_units.toLocaleString(),
      description: 'Зарезервировано клиентами',
      icon: Clock,
      color: 'from-amber-500 to-orange-600',
      bgColor: 'bg-amber-50 text-amber-700',
      badge: 'Бронь',
      link: '/projects',
    },
    {
      title: 'Проданные квартиры',
      value: units.sold_units.toLocaleString(),
      description: deals.total_volume_minor > 0 
        ? `${(deals.total_volume_minor / 100).toLocaleString()} в договорах` 
        : 'Подписанные сделки',
      icon: FileCheck,
      color: 'from-blue-500 to-indigo-600',
      bgColor: 'bg-blue-50 text-blue-700',
      badge: 'Договоры',
      link: '/deals',
    },
    {
      title: 'Новые лиды',
      value: leads.new_leads.toLocaleString(),
      description: `Всего в воронке: ${leads.total_leads.toLocaleString()}`,
      icon: Users,
      color: 'from-purple-500 to-pink-600',
      bgColor: 'bg-purple-50 text-purple-700',
      badge: 'Заявки',
      link: '/leads',
    },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white p-6 sm:p-8 shadow-lg shadow-blue-500/10">
        <div className="absolute -right-10 -bottom-10 h-64 w-64 rounded-full bg-white/10 blur-2xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white backdrop-blur-xs mb-3 border border-white/20">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Панель управления Tozon CRM</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Добро пожаловать, {user?.name || 'Super Admin'}!
            </h1>
            <p className="mt-1 text-sm text-blue-100 max-w-xl">
              Система готова к работе. Управляйте объектами недвижимости, планировками, ведите базу клиентов и оформляйте сделки.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => navigate('/projects')}
              className="flex items-center gap-2 rounded-xl bg-white text-blue-700 px-4 py-2.5 text-sm font-bold shadow-md hover:bg-blue-50 transition cursor-pointer"
            >
              <Building2 className="h-4 w-4 text-blue-600" />
              <span>Объекты (ЖК)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Operational Stats Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <div
              key={idx}
              onClick={() => navigate(stat.link)}
              className="rounded-2xl bg-white border border-slate-200 p-5 shadow-xs hover:shadow-md hover:border-blue-300 transition-all duration-200 cursor-pointer group"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider group-hover:text-blue-600 transition">
                  {stat.title}
                </span>
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr ${stat.color} shadow-sm`}>
                  <Icon className="h-5 w-5 text-white" />
                </div>
              </div>
              <div className="flex items-baseline justify-between mt-2">
                <span className="text-3xl font-black text-slate-900 tracking-tight">
                  {isLoading ? '...' : stat.value}
                </span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${stat.bgColor}`}>
                  {stat.badge}
                </span>
              </div>
              <p className="mt-2 text-xs text-slate-500">{stat.description}</p>
            </div>
          );
        })}
      </div>

      {/* Two Column Layout: Payments Schedule & Recent Deals */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Upcoming Payments / Recent Deals */}
        <div className="lg:col-span-2 space-y-6">
          {/* Upcoming Payments Schedule */}
          <div className="rounded-2xl bg-white border border-slate-200 p-6 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <CreditCard className="h-5 w-5 text-blue-600" />
                <h3 className="text-base font-bold text-slate-900">Ближайшие плановые платежи</h3>
              </div>
              <button
                onClick={() => navigate('/payments')}
                className="text-xs font-bold text-blue-600 hover:underline"
              >
                Все платежи →
              </button>
            </div>

            {upcomingPayments.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-8 text-center">
                <CreditCard className="h-10 w-10 text-slate-300 mb-2" />
                <p className="text-sm font-semibold text-slate-700">Платежей пока нет</p>
                <p className="text-xs text-slate-500 mt-1 max-w-sm">
                  Графики платежей появятся здесь автоматически после оформления первой сделки с рассрочкой.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                    <tr>
                      <th className="p-3 pl-4">Договор</th>
                      <th className="p-3">Покупатель</th>
                      <th className="p-3">Объект</th>
                      <th className="p-3">Дата платежа</th>
                      <th className="p-3 text-right pr-4">Сумма</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {upcomingPayments.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50 transition">
                        <td className="p-3 pl-4 font-bold text-blue-700 font-mono">{formatContractNumber(p.contract_number)}</td>
                        <td className="p-3 font-semibold text-slate-900">{p.lead_name}</td>
                        <td className="p-3 text-slate-600">Кв. №{p.unit_number} ({p.project_name})</td>
                        <td className="p-3 text-slate-700 font-medium">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5 text-slate-400" />
                            {new Date(p.due_date).toLocaleDateString('ru-RU')}
                          </span>
                        </td>
                        <td className="p-3 text-right pr-4 font-black text-slate-900">
                          {(p.amount_minor / 100).toLocaleString()} {p.currency || 'USD'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Recent Deals */}
          <div className="rounded-2xl bg-white border border-slate-200 p-6 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <FileCheck className="h-5 w-5 text-emerald-600" />
                <h3 className="text-base font-bold text-slate-900">Последние оформленные сделки</h3>
              </div>
              <button
                onClick={() => navigate('/deals')}
                className="text-xs font-bold text-blue-600 hover:underline"
              >
                Все сделки →
              </button>
            </div>

            {recentDeals.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-6 text-center">
                <FileCheck className="h-8 w-8 text-slate-300 mb-1" />
                <p className="text-xs text-slate-500">Оформленных договоров пока нет</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {recentDeals.map((d) => (
                  <div key={d.id} className="py-3 flex items-center justify-between hover:bg-slate-50 px-2 rounded-xl transition">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-blue-700 text-xs font-mono">{formatContractNumber(d.contract_number)}</span>
                        <span className="text-xs font-bold text-slate-900">• {d.lead_name}</span>
                        <span className="text-[11px] text-slate-400">({d.lead_phone})</span>
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {d.project_name} • {d.building_name} • Кв. №{d.unit_number} ({d.unit_rooms} комн.)
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-sm font-black text-slate-900">
                        {(d.final_price_minor / 100).toLocaleString()} {d.currency || 'USD'}
                      </div>
                      <div className="text-[10px] font-bold text-emerald-600 uppercase">
                        {d.payment_type === 'INSTALLMENT' ? 'Рассрочка' : d.payment_type === 'BARTER' ? 'Бартер' : '100% Оплата'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right 1 Col: Quick Workflow */}
        <div className="space-y-6">
          <div className="rounded-2xl bg-white border border-slate-200 p-6 shadow-xs">
            <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Layers className="h-5 w-5 text-blue-600" />
              <span>Быстрый старт</span>
            </h3>

            <div className="space-y-3">
              <button
                onClick={() => navigate('/projects')}
                className="flex w-full items-center justify-between rounded-xl bg-slate-50 p-3.5 border border-slate-200 text-left hover:border-blue-300 hover:bg-blue-50/40 transition group cursor-pointer"
              >
                <div>
                  <div className="text-sm font-semibold text-slate-800 group-hover:text-blue-600 transition">
                    1. Объекты и шахматка
                  </div>
                  <div className="text-xs text-slate-500">Просмотр квартир, свободных и проданных</div>
                </div>
                <ArrowUpRight className="h-4 w-4 text-slate-400 group-hover:text-blue-600 transition" />
              </button>

              <button
                onClick={() => navigate('/leads')}
                className="flex w-full items-center justify-between rounded-xl bg-slate-50 p-3.5 border border-slate-200 text-left hover:border-blue-300 hover:bg-blue-50/40 transition group cursor-pointer"
              >
                <div>
                  <div className="text-sm font-semibold text-slate-800 group-hover:text-blue-600 transition">
                    2. База лидов
                  </div>
                  <div className="text-xs text-slate-500">Воронка клиентов, контакты и заметки</div>
                </div>
                <ArrowUpRight className="h-4 w-4 text-slate-400 group-hover:text-blue-600 transition" />
              </button>

              <button
                onClick={() => navigate('/settings')}
                className="flex w-full items-center justify-between rounded-xl bg-slate-50 p-3.5 border border-slate-200 text-left hover:border-blue-300 hover:bg-blue-50/40 transition group cursor-pointer"
              >
                <div>
                  <div className="text-sm font-semibold text-slate-800 group-hover:text-blue-600 transition">
                    3. Меню Настройки
                  </div>
                  <div className="text-xs text-slate-500">Создание ЖК, генератор этажей и структура</div>
                </div>
                <ArrowUpRight className="h-4 w-4 text-slate-400 group-hover:text-blue-600 transition" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
