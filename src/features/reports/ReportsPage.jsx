import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { AnalyticsTabs } from '../../components/AnalyticsTabs';
import {
  BarChart3,
  TrendingUp,
  Building2,
  DollarSign,
  Users,
  CheckCircle2,
  Calendar,
  Percent,
  Coins,
  ShieldCheck,
  UserCheck,
  CheckSquare,
  Loader2,
  RefreshCw
} from 'lucide-react';

export const ReportsPage = () => {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchReports = async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/reports/summary');
      const payload = res.data || res;
      setData(payload);
    } catch (err) {
      console.error('Error fetching reports data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const financials = data?.financials || {
    totalRevenue: 0,
    totalCollected: 0,
    outstandingDebt: 0,
    conversionRate: 0,
    signedDealsCount: 0
  };

  const units = data?.units || { total: 0, available: 0, reserved: 0, sold: 0, blocked: 0 };
  const managersKPI = data?.managersKPI || [];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <BarChart3 className="h-7 w-7 text-blue-600" />
            <span>Аналитические отчеты и KPI</span>
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500">
            Сводка по продажам, конверсии воронки, выручке и персональным KPI менеджеров
          </p>
        </div>

        <button
          onClick={fetchReports}
          title="Обновить"
          className="self-start sm:self-auto p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-blue-600 hover:border-blue-200 transition cursor-pointer shadow-2xs"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <AnalyticsTabs />

      {isLoading ? (
        <div className="flex flex-col items-center justify-center p-16 bg-white rounded-3xl border border-slate-200">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-3" />
          <p className="text-sm font-semibold text-slate-600">Загрузка сводных отчетов...</p>
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-2xs">
              <span className="text-xs font-semibold text-slate-500 uppercase">Общая выручка (договоры)</span>
              <div className="text-2xl font-black text-slate-900 mt-1">
                ${financials.totalRevenue.toLocaleString('ru-RU')}
              </div>
              <p className="text-xs text-slate-400 mt-1">Подписано договоров: {financials.signedDealsCount}</p>
            </div>

            <div className="rounded-3xl border border-emerald-200 bg-emerald-50/50 p-5 shadow-2xs">
              <span className="text-xs font-bold text-emerald-700 uppercase">Собрано денежных средств</span>
              <div className="text-2xl font-black text-emerald-800 mt-1">
                ${financials.totalCollected.toLocaleString('ru-RU')}
              </div>
              <p className="text-xs text-emerald-600 mt-1">Фактические поступления в кассу/банк</p>
            </div>

            <div className="rounded-3xl border border-rose-200 bg-rose-50/50 p-5 shadow-2xs">
              <span className="text-xs font-bold text-rose-700 uppercase">Дебиторская задолженность</span>
              <div className="text-2xl font-black text-rose-800 mt-1">
                ${financials.outstandingDebt.toLocaleString('ru-RU')}
              </div>
              <p className="text-xs text-rose-600 mt-1">Остаток платежей по рассрочке</p>
            </div>

            <div className="rounded-3xl border border-purple-200 bg-purple-50/50 p-5 shadow-2xs">
              <span className="text-xs font-bold text-purple-700 uppercase">Конверсия отдела продаж</span>
              <div className="text-2xl font-black text-purple-800 mt-1">{financials.conversionRate}%</div>
              <p className="text-xs text-purple-600 mt-1">Лид → Завершенная сделка</p>
            </div>
          </div>

          {/* Breakdown Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="rounded-3xl bg-white border border-slate-200 p-6 shadow-2xs space-y-4">
              <h3 className="text-base font-bold text-slate-900">Структура номерного фонда</h3>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                    <span className="flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Свободные помещения
                    </span>
                    <span>{units.available} шт. ({units.total > 0 ? ((units.available / units.total) * 100).toFixed(1) : 0}%)</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                    <div
                      className="bg-emerald-500 h-2.5 rounded-full transition-all duration-500"
                      style={{ width: `${units.total > 0 ? (units.available / units.total) * 100 : 0}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                    <span className="flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-full bg-amber-500" /> Забронированные
                    </span>
                    <span>{units.reserved} шт. ({units.total > 0 ? ((units.reserved / units.total) * 100).toFixed(1) : 0}%)</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                    <div
                      className="bg-amber-500 h-2.5 rounded-full transition-all duration-500"
                      style={{ width: `${units.total > 0 ? (units.reserved / units.total) * 100 : 0}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                    <span className="flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-full bg-rose-500" /> Проданные
                    </span>
                    <span>{units.sold} шт. ({units.total > 0 ? ((units.sold / units.total) * 100).toFixed(1) : 0}%)</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                    <div
                      className="bg-rose-500 h-2.5 rounded-full transition-all duration-500"
                      style={{ width: `${units.total > 0 ? (units.sold / units.total) * 100 : 0}%` }}
                    />
                  </div>
                </div>

                {units.blocked > 0 && (
                  <div>
                    <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                      <span className="flex items-center gap-1.5">
                        <span className="h-2.5 w-2.5 rounded-full bg-slate-400" /> Заблокированные
                      </span>
                      <span>{units.blocked} шт. ({units.total > 0 ? ((units.blocked / units.total) * 100).toFixed(1) : 0}%)</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                      <div
                        className="bg-slate-400 h-2.5 rounded-full transition-all duration-500"
                        style={{ width: `${units.total > 0 ? (units.blocked / units.total) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-3xl bg-white border border-slate-200 p-6 shadow-2xs space-y-4">
              <h3 className="text-base font-bold text-slate-900">Сводка по отделу продаж</h3>
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-100 text-center">
                  <div className="text-2xl font-black text-blue-700">{managersKPI.length}</div>
                  <div className="text-xs font-bold text-slate-600 mt-0.5">Сотрудников в системе</div>
                </div>
                <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-100 text-center">
                  <div className="text-2xl font-black text-emerald-700">
                    {managersKPI.reduce((sum, m) => sum + (m.dealsCount || 0), 0)}
                  </div>
                  <div className="text-xs font-bold text-slate-600 mt-0.5">Всего закрытых сделок</div>
                </div>
              </div>
              <p className="text-[11px] text-slate-500">
                Показатели рассчитываются автоматически на основании назначенных лидов, подписанных договоров и выполненных задач.
              </p>
            </div>
          </div>

          {/* Section: Managers Performance / KPI */}
          <div className="rounded-3xl bg-white border border-slate-200 p-6 shadow-2xs space-y-4">
            <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-600" />
              <span>Эффективность сотрудников и персональные KPI</span>
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                  <tr>
                    <th className="p-3 pl-4">Сотрудник</th>
                    <th className="p-3">Роль</th>
                    <th className="p-3 text-center">Лиды</th>
                    <th className="p-3 text-center">Сделки</th>
                    <th className="p-3 text-right">Объем продаж</th>
                    <th className="p-3 text-center">Конверсия</th>
                    <th className="p-3 text-center pr-4">Открытые задачи</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {managersKPI.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-50 transition">
                      <td className="p-3 pl-4">
                        <div className="font-bold text-slate-900">{m.name}</div>
                        <div className="text-[10px] text-slate-400">{m.email}</div>
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                          m.role === 'ADMIN' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                        }`}>
                          {m.role === 'ADMIN' ? 'Администратор' : 'Менеджер'}
                        </span>
                      </td>
                      <td className="p-3 text-center font-bold text-slate-800">{m.totalLeads}</td>
                      <td className="p-3 text-center font-bold text-emerald-600">{m.dealsCount}</td>
                      <td className="p-3 text-right font-black text-slate-900">
                        {m.salesVolume > 0 ? `$${m.salesVolume.toLocaleString('ru-RU')}` : '$0'}
                      </td>
                      <td className="p-3 text-center font-bold text-indigo-700">{m.conversionRate}%</td>
                      <td className="p-3 text-center pr-4 font-bold text-amber-600">{m.openTasksCount}</td>
                    </tr>
                  ))}
                  {managersKPI.length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-6 text-center text-slate-400">Нет сотрудников для отображения</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
