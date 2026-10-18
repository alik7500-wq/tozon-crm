import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import { useAuth } from '../auth/AuthContext';
import {
  AlertTriangle,
  Clock,
  Users,
  PhoneCall,
  Calendar,
  Sliders,
  Settings,
  CheckCircle2,
  AlertCircle,
  Home,
  RefreshCw,
  Loader2,
  ArrowRight,
  UserCheck,
  UserX,
  Sparkles,
  ShieldAlert,
  ChevronRight,
  Check,
  X,
  FileText
} from 'lucide-react';

export const SalesControlPanel = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const isSupervisor = ['ADMIN', 'DIRECTOR'].includes(user?.role);

  // States
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeDrilldown, setActiveDrilldown] = useState('unassigned'); // 'unassigned', 'no_contact', 'overdue_tasks', 'stale_leads', 'expiring_reservations', 'workloads', 'winback'

  // Win-back opportunities
  const [winbackOpportunities, setWinbackOpportunities] = useState([]);
  const [isLoadingWinback, setIsLoadingWinback] = useState(false);
  const [selectedWinbackLead, setSelectedWinbackLead] = useState(null);

  // Distribution settings modal state
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settings, setSettings] = useState({
    enabled: false,
    algorithm: 'LEAST_LOADED',
    maxOpenLeadsPerRep: 25,
    excludedUserIds: [],
    workingHoursOnly: false
  });
  const [eligibleReps, setEligibleReps] = useState([]);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [saveToast, setSaveToast] = useState(null);

  // Fetch supervisor control data
  const fetchControlData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.get('/reports/sales-control');
      const payload = res.data || res;
      setData(payload);

      // Default active tab based on role and numbers
      if (!isSupervisor) {
        setActiveDrilldown('overdue_tasks');
      } else if (payload.summary?.unassignedLeadsCount > 0) {
        setActiveDrilldown('unassigned');
      } else if (payload.summary?.noContactLeadsCount > 0) {
        setActiveDrilldown('no_contact');
      } else if (payload.summary?.overdueTasksCount > 0) {
        setActiveDrilldown('overdue_tasks');
      } else {
        setActiveDrilldown('workloads');
      }
    } catch (err) {
      console.error('Failed to load sales control data:', err);
      if (err.response?.status === 403) {
        setError('Доступ к оперативному контролю продаж ограничен для вашей роли.');
      } else {
        setError('Не удалось загрузить данные оперативного контроля продаж.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch distribution settings
  const fetchDistributionSettings = async () => {
    if (!isSupervisor) return;
    try {
      const res = await api.get('/leads/distribution/settings');
      const payload = res.data || res;
      if (payload.settings) {
        setSettings(payload.settings);
      }
      if (payload.eligibleReps) {
        setEligibleReps(payload.eligibleReps);
      }
    } catch (err) {
      console.warn('Failed to load distribution settings:', err.message);
    }
  };

  // Fetch win-back opportunities
  const fetchWinback = async () => {
    setIsLoadingWinback(true);
    try {
      const res = await api.get('/leads/winback/opportunities');
      const payload = res.data?.opportunities || res.opportunities || [];
      setWinbackOpportunities(payload);
    } catch (err) {
      console.warn('Failed to load winback opportunities:', err.message);
    } finally {
      setIsLoadingWinback(false);
    }
  };

  useEffect(() => {
    fetchControlData();
    fetchDistributionSettings();
    fetchWinback();
  }, []);

  // Save distribution settings handler
  const handleSaveSettings = async () => {
    setIsSavingSettings(true);
    try {
      const res = await api.post('/leads/distribution/settings', settings);
      const updated = res.data?.settings || res.settings;
      setSettings(updated);
      setSaveToast('Настройки авто-распределения успешно сохранены!');
      setTimeout(() => setSaveToast(null), 3000);
      setIsSettingsOpen(false);
      fetchControlData();
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Ошибка сохранения настроек');
    } finally {
      setIsSavingSettings(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-slate-200">
        <Loader2 className="h-10 w-10 text-blue-600 animate-spin mb-3" />
        <p className="text-sm font-bold text-slate-700">Загрузка оперативного контроля продаж...</p>
        <p className="text-xs text-slate-400 mt-1">Проверка SLA первого контакта, просроченных задач и нагрузки команды</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 bg-rose-50 border border-rose-200 rounded-3xl text-center space-y-3">
        <AlertTriangle className="h-10 w-10 text-rose-500 mx-auto" />
        <h3 className="text-base font-black text-rose-900">{error}</h3>
        <button
          onClick={fetchControlData}
          className="inline-flex items-center gap-2 px-4 py-2 bg-rose-600 text-white rounded-xl text-xs font-bold hover:bg-rose-700 transition"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Попробовать снова</span>
        </button>
      </div>
    );
  }

  const summary = data?.summary || {};
  const drilldowns = data?.drilldowns || {};

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {saveToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2.5 text-xs font-bold animate-bounce">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          <span>{saveToast}</span>
        </div>
      )}

      {/* Control Header & Settings Bar */}
      <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-2xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <ShieldAlert className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-lg font-black text-slate-900 tracking-tight">
                Панель оперативного контроля продаж (Phase 3.6)
              </h2>
              <p className="text-xs text-slate-500">
                Контроль регламентов 15-мин SLA, отсутствия контактов, просрочек и равномерного распределения
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Distribution Status Pill */}
          {isSupervisor && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
              <span className={`h-2 w-2 rounded-full ${settings.enabled ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
              <span className="text-slate-600 font-medium">Автораспределение:</span>
              <span className={`font-bold ${settings.enabled ? 'text-emerald-700' : 'text-slate-500'}`}>
                {settings.enabled ? 'Включено' : 'Выключено'}
              </span>
            </div>
          )}

          {isSupervisor && (
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 transition cursor-pointer"
            >
              <Sliders className="h-3.5 w-3.5 text-slate-600" />
              <span>Настройка правил</span>
            </button>
          )}

          <button
            onClick={fetchControlData}
            title="Обновить метрики"
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* 6 Clickable Metric Indicator Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {/* Metric 1: Unassigned Leads (Supervisors only) */}
        {isSupervisor ? (
          <button
            type="button"
            onClick={() => setActiveDrilldown('unassigned')}
            className={`p-4 rounded-2xl border text-left transition cursor-pointer flex flex-col justify-between ${
              activeDrilldown === 'unassigned'
                ? 'bg-purple-50/70 border-purple-300 ring-2 ring-purple-500/20 shadow-sm'
                : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-purple-700 uppercase tracking-wider">Пул заявок</span>
              <Users className="h-4 w-4 text-purple-500" />
            </div>
            <div className="mt-3">
              <div className="text-2xl font-black text-slate-900">{summary.unassignedLeadsCount || 0}</div>
              <div className="text-[11px] text-slate-500 mt-0.5 leading-snug">Без ответственного</div>
            </div>
            <div className="mt-3 pt-2 border-t border-purple-100 text-[10px] font-bold text-purple-600 flex items-center gap-1">
              <span>Открыть пул</span>
              <ChevronRight className="h-3 w-3" />
            </div>
          </button>
        ) : (
          <div className="p-4 rounded-2xl border border-slate-100 bg-slate-50/50 text-left opacity-60">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Пул заявок</span>
              <Users className="h-4 w-4 text-slate-400" />
            </div>
            <div className="mt-3">
              <div className="text-2xl font-black text-slate-400">—</div>
              <div className="text-[11px] text-slate-400 mt-0.5 leading-snug">Только директор</div>
            </div>
          </div>
        )}

        {/* Metric 2: Leads without First Contact (15-min SLA violation / pending) */}
        <button
          type="button"
          onClick={() => setActiveDrilldown('no_contact')}
          className={`p-4 rounded-2xl border text-left transition cursor-pointer flex flex-col justify-between ${
            activeDrilldown === 'no_contact'
              ? 'bg-rose-50/70 border-rose-300 ring-2 ring-rose-500/20 shadow-sm'
              : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-rose-700 uppercase tracking-wider">15 мин SLA</span>
            <PhoneCall className="h-4 w-4 text-rose-500" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-900">{summary.noContactLeadsCount || 0}</div>
            <div className="text-[11px] text-slate-500 mt-0.5 leading-snug">Без первого звонка</div>
          </div>
          <div className="mt-3 pt-2 border-t border-rose-100 text-[10px] font-bold text-rose-600 flex items-center gap-1">
            <span>Контроль SLA</span>
            <ChevronRight className="h-3 w-3" />
          </div>
        </button>

        {/* Metric 3: Overdue Tasks */}
        <button
          type="button"
          onClick={() => setActiveDrilldown('overdue_tasks')}
          className={`p-4 rounded-2xl border text-left transition cursor-pointer flex flex-col justify-between ${
            activeDrilldown === 'overdue_tasks'
              ? 'bg-amber-50/70 border-amber-300 ring-2 ring-amber-500/20 shadow-sm'
              : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">Задачи</span>
            <Clock className="h-4 w-4 text-amber-500" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-900">{summary.overdueTasksCount || 0}</div>
            <div className="text-[11px] text-slate-500 mt-0.5 leading-snug">Просроченные задачи</div>
          </div>
          <div className="mt-3 pt-2 border-t border-amber-100 text-[10px] font-bold text-amber-600 flex items-center gap-1">
            <span>Список задач</span>
            <ChevronRight className="h-3 w-3" />
          </div>
        </button>

        {/* Metric 4: Stale Leads (>48 hours without next contact scheduled) */}
        <button
          type="button"
          onClick={() => setActiveDrilldown('stale_leads')}
          className={`p-4 rounded-2xl border text-left transition cursor-pointer flex flex-col justify-between ${
            activeDrilldown === 'stale_leads'
              ? 'bg-orange-50/70 border-orange-300 ring-2 ring-orange-500/20 shadow-sm'
              : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-orange-700 uppercase tracking-wider">&gt;48 часов</span>
            <AlertCircle className="h-4 w-4 text-orange-500" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-900">{summary.staleLeadsCount || 0}</div>
            <div className="text-[11px] text-slate-500 mt-0.5 leading-snug">Без повторного звонка</div>
          </div>
          <div className="mt-3 pt-2 border-t border-orange-100 text-[10px] font-bold text-orange-600 flex items-center gap-1">
            <span>Реактивация</span>
            <ChevronRight className="h-3 w-3" />
          </div>
        </button>

        {/* Metric 5: Expiring Reservations (within 48h) */}
        <button
          type="button"
          onClick={() => setActiveDrilldown('expiring_reservations')}
          className={`p-4 rounded-2xl border text-left transition cursor-pointer flex flex-col justify-between ${
            activeDrilldown === 'expiring_reservations'
              ? 'bg-indigo-50/70 border-indigo-300 ring-2 ring-indigo-500/20 shadow-sm'
              : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-indigo-700 uppercase tracking-wider">Бронь</span>
            <Calendar className="h-4 w-4 text-indigo-500" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-900">{summary.expiringReservationsCount || 0}</div>
            <div className="text-[11px] text-slate-500 mt-0.5 leading-snug">Истекает срок брони</div>
          </div>
          <div className="mt-3 pt-2 border-t border-indigo-100 text-[10px] font-bold text-indigo-600 flex items-center gap-1">
            <span>Контроль брони</span>
            <ChevronRight className="h-3 w-3" />
          </div>
        </button>

        {/* Metric 6: Team Workload & High Load Managers */}
        {isSupervisor ? (
          <button
            type="button"
            onClick={() => setActiveDrilldown('workloads')}
            className={`p-4 rounded-2xl border text-left transition cursor-pointer flex flex-col justify-between ${
              activeDrilldown === 'workloads'
                ? 'bg-emerald-50/70 border-emerald-300 ring-2 ring-emerald-500/20 shadow-sm'
                : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">Нагрузка</span>
              <UserCheck className="h-4 w-4 text-emerald-500" />
            </div>
            <div className="mt-3">
              <div className="text-2xl font-black text-slate-900">
                {drilldowns.managerWorkloads?.filter(m => m.status === 'OVERLOADED' || m.status === 'HIGH_LOAD').length || 0}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5 leading-snug">Менеджеры в перегрузке</div>
            </div>
            <div className="mt-3 pt-2 border-t border-emerald-100 text-[10px] font-bold text-emerald-600 flex items-center gap-1">
              <span>Лимиты команды</span>
              <ChevronRight className="h-3 w-3" />
            </div>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setActiveDrilldown('winback')}
            className={`p-4 rounded-2xl border text-left transition cursor-pointer flex flex-col justify-between ${
              activeDrilldown === 'winback'
                ? 'bg-blue-50/70 border-blue-300 ring-2 ring-blue-500/20 shadow-sm'
                : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wider">Альтернативы</span>
              <Sparkles className="h-4 w-4 text-blue-500" />
            </div>
            <div className="mt-3">
              <div className="text-2xl font-black text-slate-900">{winbackOpportunities.length}</div>
              <div className="text-[11px] text-slate-500 mt-0.5 leading-snug">Возврат клиентов</div>
            </div>
            <div className="mt-3 pt-2 border-t border-blue-100 text-[10px] font-bold text-blue-600 flex items-center gap-1">
              <span>Предложения</span>
              <ChevronRight className="h-3 w-3" />
            </div>
          </button>
        )}
      </div>

      {/* Interactive Drill-down Views */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xs overflow-hidden">
        {/* Navigation sub-tabs */}
        <div className="border-b border-slate-200 px-6 py-4 flex items-center justify-between flex-wrap gap-3 bg-slate-50/50">
          <div className="flex items-center gap-2 flex-wrap">
            {isSupervisor && (
              <button
                type="button"
                onClick={() => setActiveDrilldown('unassigned')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  activeDrilldown === 'unassigned'
                    ? 'bg-purple-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:bg-slate-200'
                }`}
              >
                Пул неназначенных ({drilldowns.unassignedLeads?.length || 0})
              </button>
            )}

            <button
              type="button"
              onClick={() => setActiveDrilldown('no_contact')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeDrilldown === 'no_contact'
                  ? 'bg-rose-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-200'
              }`}
            >
              Нарушение 15-мин SLA ({drilldowns.noContactLeads?.length || 0})
            </button>

            <button
              type="button"
              onClick={() => setActiveDrilldown('overdue_tasks')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeDrilldown === 'overdue_tasks'
                  ? 'bg-amber-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-200'
              }`}
            >
              Просроченные задачи ({drilldowns.overdueTasks?.length || 0})
            </button>

            <button
              type="button"
              onClick={() => setActiveDrilldown('stale_leads')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeDrilldown === 'stale_leads'
                  ? 'bg-orange-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-200'
              }`}
            >
              Без контакта &gt;48ч ({drilldowns.staleLeads?.length || 0})
            </button>

            <button
              type="button"
              onClick={() => setActiveDrilldown('expiring_reservations')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeDrilldown === 'expiring_reservations'
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-200'
              }`}
            >
              Истекающие брони ({drilldowns.expiringReservations?.length || 0})
            </button>

            {isSupervisor && (
              <button
                type="button"
                onClick={() => setActiveDrilldown('workloads')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  activeDrilldown === 'workloads'
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:bg-slate-200'
                }`}
              >
                Нагрузка менеджеров ({drilldowns.managerWorkloads?.length || 0})
              </button>
            )}

            <button
              type="button"
              onClick={() => setActiveDrilldown('winback')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeDrilldown === 'winback'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-200'
              }`}
            >
              Возврат клиентов (Win-Back: {winbackOpportunities.length})
            </button>
          </div>
        </div>

        {/* View Content 1: Unassigned Leads */}
        {activeDrilldown === 'unassigned' && (
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="text-sm font-black text-slate-900">Неназначенные входящие заявки</h4>
                <p className="text-xs text-slate-500">
                  Заявки, поступившие через форму сайта или вебхук, ожидающие ручного назначения или включения автораспределения
                </p>
              </div>
            </div>

            {(!drilldowns.unassignedLeads || drilldowns.unassignedLeads.length === 0) ? (
              <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-700">Все входящие лиды успешно распределены!</p>
                <p className="text-[11px] text-slate-400 mt-0.5">В общем пуле нет заявок без ответственного менеджера.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                      <th className="py-2.5 px-3">ФИО клиента</th>
                      <th className="py-2.5 px-3">Телефон</th>
                      <th className="py-2.5 px-3">Источник</th>
                      <th className="py-2.5 px-3">Время в пуле</th>
                      <th className="py-2.5 px-3 text-right">Действие</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {drilldowns.unassignedLeads.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/80 transition">
                        <td className="py-3 px-3 font-bold text-slate-900">{item.fullName}</td>
                        <td className="py-3 px-3 text-slate-600 font-mono">{item.phone || '—'}</td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 font-semibold text-[10px]">
                            {item.source}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`px-2 py-0.5 rounded-lg font-bold text-[10px] ${
                              item.isOverduePool
                                ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {item.workingMinutesInPool} раб. мин {item.isOverduePool ? '(!)' : ''}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => navigate(`/leads?search=${encodeURIComponent(item.phone || item.fullName)}`)}
                            className="px-3 py-1.5 rounded-xl bg-purple-50 text-purple-700 hover:bg-purple-100 font-bold text-xs transition cursor-pointer"
                          >
                            Назначить
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* View Content 2: Leads without First Contact (15-min SLA violation) */}
        {activeDrilldown === 'no_contact' && (
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="text-sm font-black text-slate-900">Нарушение регламента первого звонка (15 минут)</h4>
                <p className="text-xs text-slate-500">
                  Менеджер назначен, но первичный контакт не совершен в рабочее время компании (Asia/Dushanbe)
                </p>
              </div>
            </div>

            {(!drilldowns.noContactLeads || drilldowns.noContactLeads.length === 0) ? (
              <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-700">Все назначенные заявки обработаны вовремя!</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Нет просрочек по регламенту 15-минутного первичного контакта.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                      <th className="py-2.5 px-3">ФИО клиента</th>
                      <th className="py-2.5 px-3">Телефон</th>
                      <th className="py-2.5 px-3">Менеджер</th>
                      <th className="py-2.5 px-3">Прошло времени</th>
                      <th className="py-2.5 px-3">Статус SLA</th>
                      <th className="py-2.5 px-3 text-right">Действие</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {drilldowns.noContactLeads.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/80 transition">
                        <td className="py-3 px-3 font-bold text-slate-900">{item.fullName}</td>
                        <td className="py-3 px-3 text-slate-600 font-mono">{item.phone || '—'}</td>
                        <td className="py-3 px-3 font-semibold text-slate-800">{item.managerName}</td>
                        <td className="py-3 px-3 font-mono text-slate-700">{item.workingMinutesElapsed} раб. мин</td>
                        <td className="py-3 px-3">
                          {item.isOverdue ? (
                            <span className="px-2 py-0.5 rounded-lg bg-rose-100 text-rose-800 font-bold text-[10px] border border-rose-200">
                              Просрочено на +{item.overdueMinutes} мин
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-lg bg-amber-100 text-amber-800 font-bold text-[10px] border border-amber-200">
                              Срок истекает
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => navigate(`/leads?search=${encodeURIComponent(item.phone || item.fullName)}`)}
                            className="px-3 py-1.5 rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-100 font-bold text-xs transition cursor-pointer"
                          >
                            Зафиксировать звонок
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* View Content 3: Overdue Tasks */}
        {activeDrilldown === 'overdue_tasks' && (
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="text-sm font-black text-slate-900">Просроченные задачи менеджеров</h4>
                <p className="text-xs text-slate-500">
                  Запланированные звонки, встречи и согласования, срок выполнения которых наступил ранее сегодняшней даты
                </p>
              </div>
            </div>

            {(!drilldowns.overdueTasks || drilldowns.overdueTasks.length === 0) ? (
              <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-700">Просроченных задач нет!</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Все звонки и встречи закрыты по графику.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                      <th className="py-2.5 px-3">Задача</th>
                      <th className="py-2.5 px-3">Клиент</th>
                      <th className="py-2.5 px-3">Менеджер</th>
                      <th className="py-2.5 px-3">Срок</th>
                      <th className="py-2.5 px-3">Просрочка</th>
                      <th className="py-2.5 px-3 text-right">Действие</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {drilldowns.overdueTasks.map((t) => (
                      <tr key={t.id} className="hover:bg-slate-50/80 transition">
                        <td className="py-3 px-3">
                          <div className="font-bold text-slate-900">{t.title}</div>
                          <div className="text-[10px] text-slate-400 font-semibold">{t.type}</div>
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-semibold text-slate-800">{t.clientName}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{t.phone}</div>
                        </td>
                        <td className="py-3 px-3 font-semibold text-slate-800">{t.managerName}</td>
                        <td className="py-3 px-3 text-slate-600 font-mono">{t.dueDate}</td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded-lg bg-rose-100 text-rose-800 font-bold text-[10px] border border-rose-200">
                            {t.daysOverdue} дн. просрочки
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => navigate('/tasks')}
                            className="px-3 py-1.5 rounded-xl bg-amber-50 text-amber-700 hover:bg-amber-100 font-bold text-xs transition cursor-pointer"
                          >
                            К задачам
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* View Content 4: Stale Leads (>48 hours without contact) */}
        {activeDrilldown === 'stale_leads' && (
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="text-sm font-black text-slate-900">Покупатели без повторного контакта (&gt;48 часов)</h4>
                <p className="text-xs text-slate-500">
                  Активные лиды в воронке, по которым нет никаких открытых задач и нет действий более двух суток
                </p>
              </div>
            </div>

            {(!drilldowns.staleLeads || drilldowns.staleLeads.length === 0) ? (
              <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-700">Зависших покупателей нет!</p>
                <p className="text-[11px] text-slate-400 mt-0.5">По всем лидам запланированы очередные звонки и встречи.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                      <th className="py-2.5 px-3">ФИО клиента</th>
                      <th className="py-2.5 px-3">Телефон</th>
                      <th className="py-2.5 px-3">Этап воронки</th>
                      <th className="py-2.5 px-3">Менеджер</th>
                      <th className="py-2.5 px-3">Простой</th>
                      <th className="py-2.5 px-3 text-right">Действие</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {drilldowns.staleLeads.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/80 transition">
                        <td className="py-3 px-3 font-bold text-slate-900">{item.fullName}</td>
                        <td className="py-3 px-3 text-slate-600 font-mono">{item.phone || '—'}</td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded-lg bg-blue-50 text-blue-700 font-bold text-[10px]">
                            {item.status}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-semibold text-slate-800">{item.managerName}</td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded-lg bg-orange-100 text-orange-800 font-bold text-[10px] border border-orange-200">
                            {Math.round(item.hoursInactive / 24)} дн. ({item.hoursInactive} ч.)
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => navigate(`/leads?search=${encodeURIComponent(item.phone || item.fullName)}`)}
                            className="px-3 py-1.5 rounded-xl bg-orange-50 text-orange-700 hover:bg-orange-100 font-bold text-xs transition cursor-pointer"
                          >
                            Запланировать звонок
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* View Content 5: Expiring Reservations */}
        {activeDrilldown === 'expiring_reservations' && (
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="text-sm font-black text-slate-900">Бронирования с приближающимся сроком окончания</h4>
                <p className="text-xs text-slate-500">
                  Брони, срок фиксации которых истекает в течение 48 часов или уже истек (требуют подписания договора или снятия)
                </p>
              </div>
            </div>

            {(!drilldowns.expiringReservations || drilldowns.expiringReservations.length === 0) ? (
              <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-700">Нет броней с критическим сроком!</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Все активные бронирования в пределах комфортного регламента.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                      <th className="py-2.5 px-3">Договор / Бронь</th>
                      <th className="py-2.5 px-3">Квартира</th>
                      <th className="py-2.5 px-3">Покупатель</th>
                      <th className="py-2.5 px-3">Менеджер</th>
                      <th className="py-2.5 px-3">Срок брони</th>
                      <th className="py-2.5 px-3 text-right">Действие</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {drilldowns.expiringReservations.map((d) => (
                      <tr key={d.id} className="hover:bg-slate-50/80 transition">
                        <td className="py-3 px-3 font-bold text-slate-900">{d.contractNumber}</td>
                        <td className="py-3 px-3 font-semibold text-slate-800">
                          Кв. №{d.unitNumber} ({d.projectName})
                        </td>
                        <td className="py-3 px-3 font-semibold text-slate-800">{d.clientName}</td>
                        <td className="py-3 px-3 text-slate-700">{d.managerName}</td>
                        <td className="py-3 px-3">
                          {d.isExpired ? (
                            <span className="px-2 py-0.5 rounded-lg bg-rose-100 text-rose-800 font-bold text-[10px] border border-rose-200">
                              Срок истек!
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-lg bg-indigo-100 text-indigo-800 font-bold text-[10px] border border-indigo-200">
                              Осталось {d.hoursUntilExpiry} ч.
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => navigate('/deals')}
                            className="px-3 py-1.5 rounded-xl bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-bold text-xs transition cursor-pointer"
                          >
                            К сделке
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* View Content 6: Team Workloads & Capacity */}
        {activeDrilldown === 'workloads' && isSupervisor && (
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="text-sm font-black text-slate-900">Загрузка и лимиты менеджеров отдела продаж</h4>
                <p className="text-xs text-slate-500">
                  Текущее количество активных заявок, процент утилизации лимита и наличие просроченных задач
                </p>
              </div>
            </div>

            {(!drilldowns.managerWorkloads || drilldowns.managerWorkloads.length === 0) ? (
              <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <Users className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-700">Нет активных менеджеров продаж в системе.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                      <th className="py-2.5 px-3">Менеджер</th>
                      <th className="py-2.5 px-3">Активные лиды</th>
                      <th className="py-2.5 px-3">Лимит нагрузки</th>
                      <th className="py-2.5 px-3">Утилизация %</th>
                      <th className="py-2.5 px-3">Просрочки</th>
                      <th className="py-2.5 px-3">Статус автораспределения</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {drilldowns.managerWorkloads.map((m) => (
                      <tr key={m.id} className="hover:bg-slate-50/80 transition">
                        <td className="py-3 px-3 font-bold text-slate-900">{m.name}</td>
                        <td className="py-3 px-3 font-mono text-slate-700 font-bold">{m.openLeadsCount}</td>
                        <td className="py-3 px-3 text-slate-500">{m.capacityLimit} заявок</td>
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2">
                            <div className="w-24 bg-slate-100 rounded-full h-2 overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  m.capacityUtilizationPercent >= 100
                                    ? 'bg-rose-500'
                                    : m.capacityUtilizationPercent >= 80
                                    ? 'bg-amber-500'
                                    : 'bg-emerald-500'
                                }`}
                                style={{ width: `${Math.min(100, m.capacityUtilizationPercent)}%` }}
                              />
                            </div>
                            <span className="font-mono text-[10px] font-bold text-slate-700">
                              {m.capacityUtilizationPercent}%
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          {m.overdueTasksCount > 0 ? (
                            <span className="px-2 py-0.5 rounded-lg bg-rose-50 text-rose-700 font-bold text-[10px]">
                              {m.overdueTasksCount} задач
                            </span>
                          ) : (
                            <span className="text-slate-400 font-semibold">—</span>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          {m.isExcluded ? (
                            <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 font-bold text-[10px] border border-slate-200">
                              Исключен (отпуск/больничный)
                            </span>
                          ) : m.status === 'OVERLOADED' ? (
                            <span className="px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 font-bold text-[10px] border border-rose-200">
                              Лимит исчерпан
                            </span>
                          ) : m.status === 'HIGH_LOAD' ? (
                            <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold text-[10px] border border-amber-200">
                              Высокая загрузка
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px] border border-emerald-200">
                              Готов к заявкам
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* View Content 7: Win-Back Opportunities & Alternative Units */}
        {activeDrilldown === 'winback' && (
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="text-sm font-black text-slate-900">
                  Возврат покупателей (Win-Back по альтернативным квартирам)
                </h4>
                <p className="text-xs text-slate-500">
                  Лиды, желаемая квартира которых продана или забронирована, но в каталоге есть доступные похожие планировки
                </p>
              </div>
            </div>

            {winbackOpportunities.length === 0 ? (
              <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <Sparkles className="h-8 w-8 text-blue-400 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-700">Нет упущенных покупателей с проданными интересами.</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Все сохраненные интересы лидов свободны либо уже оформлены в сделки.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {winbackOpportunities.map((opp) => (
                  <div
                    key={opp.lead_id}
                    className="p-4 rounded-2xl border border-slate-200 bg-white hover:border-blue-300 transition shadow-2xs space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-black text-slate-900 text-sm">{opp.lead_name}</span>
                          <span className="text-xs font-mono text-slate-500">{opp.lead_phone}</span>
                          <span className="px-2 py-0.5 rounded-lg bg-blue-50 text-blue-700 font-bold text-[10px]">
                            {opp.lead_status}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">Ответственный: {opp.manager_name}</p>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="px-3 py-1 rounded-xl bg-purple-50 text-purple-700 font-bold text-xs">
                          {opp.total_matching_alternatives} доступных альтернатив
                        </span>
                        <button
                          type="button"
                          onClick={() => navigate(`/leads?search=${encodeURIComponent(opp.lead_phone || opp.lead_name)}`)}
                          className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition cursor-pointer"
                        >
                          Открыть карточку
                        </button>
                      </div>
                    </div>

                    {/* Unavailable Interests & Suggested Alternatives */}
                    <div className="space-y-2">
                      {opp.unavailable_units.map((u) => (
                        <div key={u.unit_id} className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                          <div className="flex items-center justify-between text-xs mb-2">
                            <span className="font-bold text-slate-800">
                              Желаемая кв. №{u.unit_number} ({u.rooms} комн., {u.areaM2} м²)
                            </span>
                            <span className="px-2 py-0.5 rounded-lg bg-rose-100 text-rose-800 font-bold text-[10px]">
                              {u.status === 'SOLD' ? 'Продана' : 'В брони'}
                            </span>
                          </div>

                          {u.best_alternative && (
                            <div className="flex items-center justify-between bg-white p-2.5 rounded-lg border border-emerald-200">
                              <div className="flex items-center gap-2">
                                <Sparkles className="h-4 w-4 text-emerald-600 shrink-0" />
                                <div>
                                  <div className="text-xs font-bold text-slate-900">
                                    Рекомендуемая свободная кв. №{u.best_alternative.unit_number} (
                                    {u.best_alternative.building_name}, {u.best_alternative.floor_number} этаж)
                                  </div>
                                  <div className="text-[11px] text-slate-500">
                                    {u.best_alternative.rooms} комн. • {u.best_alternative.areaM2} м² • $
                                    {u.best_alternative.totalPrice.toLocaleString()}
                                  </div>
                                </div>
                              </div>
                              <span className="px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-700 font-bold text-[10px] shrink-0">
                                {u.best_alternative.matchScore}% совпадение
                              </span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Settings Modal: Automated Lead Distribution */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                  <Sliders className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Настройки авто-распределения</h3>
                  <p className="text-xs text-slate-500">Управление алгоритмом и лимитами отдела продаж</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsSettingsOpen(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Toggle Enable */}
              <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                <div>
                  <div className="text-xs font-bold text-slate-900">Автоматическое распределение лидов</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Если выключено, все новые заявки поступают в общий пул для ручного назначения
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.enabled}
                    onChange={(e) => setSettings({ ...settings, enabled: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              {/* Algorithm Choice */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Алгоритм распределения</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSettings({ ...settings, algorithm: 'LEAST_LOADED' })}
                    className={`p-3 rounded-2xl border text-left transition cursor-pointer ${
                      settings.algorithm === 'LEAST_LOADED'
                        ? 'border-blue-500 bg-blue-50 text-blue-900 font-bold'
                        : 'border-slate-200 bg-white text-slate-600'
                    }`}
                  >
                    <div className="text-xs font-bold">Наименее загруженному</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">Балансировка активных лидов</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSettings({ ...settings, algorithm: 'ROUND_ROBIN' })}
                    className={`p-3 rounded-2xl border text-left transition cursor-pointer ${
                      settings.algorithm === 'ROUND_ROBIN'
                        ? 'border-blue-500 bg-blue-50 text-blue-900 font-bold'
                        : 'border-slate-200 bg-white text-slate-600'
                    }`}
                  >
                    <div className="text-xs font-bold">По кругу (Round-Robin)</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">Строгая циклическая очередь</div>
                  </button>
                </div>
              </div>

              {/* Max Capacity Limit */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700">Макс. открытых лидов на менеджера</label>
                  <span className="font-mono text-xs font-bold text-blue-600">{settings.maxOpenLeadsPerRep} заявок</span>
                </div>
                <input
                  type="number"
                  min="5"
                  max="100"
                  value={settings.maxOpenLeadsPerRep}
                  onChange={(e) => setSettings({ ...settings, maxOpenLeadsPerRep: Number(e.target.value) })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Working Hours Only */}
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-200">
                <div>
                  <div className="text-xs font-bold text-slate-900">Только в рабочее время (Asia/Dushanbe)</div>
                  <div className="text-[11px] text-slate-500">Вне рабочих часов направлять заявки в общий пул</div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.workingHoursOnly}
                  onChange={(e) => setSettings({ ...settings, workingHoursOnly: e.target.checked })}
                  className="h-4 w-4 rounded-sm border-slate-300 text-blue-600 focus:ring-blue-500"
                />
              </div>

              {/* Excluded Managers (Leave / Sick Leave) */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Исключить из распределения (отпуск / больничный)</label>
                <div className="max-h-36 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-2xl bg-white p-2">
                  {eligibleReps.length === 0 ? (
                    <div className="text-center py-3 text-xs text-slate-400">Нет доступных менеджеров</div>
                  ) : (
                    eligibleReps.map((rep) => {
                      const isExcluded = (settings.excludedUserIds || []).includes(Number(rep.id));
                      return (
                        <label
                          key={rep.id}
                          className="flex items-center justify-between py-2 px-2 hover:bg-slate-50 rounded-lg cursor-pointer"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-slate-800">{rep.name}</span>
                            <span className="text-[10px] text-slate-400">({rep.openLeadsCount || 0} лидов)</span>
                          </div>
                          <input
                            type="checkbox"
                            checked={isExcluded}
                            onChange={(e) => {
                              const uid = Number(rep.id);
                              const current = settings.excludedUserIds || [];
                              const updated = e.target.checked
                                ? [...current, uid]
                                : current.filter((id) => id !== uid);
                              setSettings({ ...settings, excludedUserIds: updated });
                            }}
                            className="h-4 w-4 rounded-sm border-slate-300 text-rose-600 focus:ring-rose-500"
                          />
                        </label>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsSettingsOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={handleSaveSettings}
                disabled={isSavingSettings}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white transition shadow-sm cursor-pointer"
              >
                {isSavingSettings ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                <span>Сохранить настройки</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
