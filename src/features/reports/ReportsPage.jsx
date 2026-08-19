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
  Coins
} from 'lucide-react';

export const ReportsPage = () => {
  const [stats, setStats] = useState(null);
  const [dealStats, setDealStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setIsLoading(true);
        const [dashRes, dealsRes] = await Promise.all([
          api.get('/dashboard/stats'),
          api.get('/deals/stats'),
        ]);
        setStats(dashRes.data || dashRes);
        setDealStats(dealsRes.data?.stats || dealsRes.stats || null);
      } catch (err) {
        console.error('Error fetching reports data:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchAnalytics();
  }, []);

  const units = stats?.units || { available_units: 0, reserved_units: 0, sold_units: 0, total_units: 0 };
  const leads = stats?.leads || { new_leads: 0, total_leads: 0 };

  const totalVolume = dealStats?.total_signed_revenue_minor || 0;
  const collected = dealStats?.total_collected_minor || 0;
  const debt = dealStats?.outstanding_debt_minor || 0;

  const conversionRate = leads.total_leads > 0
    ? ((units.sold_units / leads.total_leads) * 100).toFixed(1)
    : '0';

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
          <BarChart3 className="h-7 w-7 text-blue-600" />
          <span>Аналитические отчеты и KPI</span>
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-slate-500">
          Сводка по продажам, конверсии воронки, выручке и финансовым показателям застройщика
        </p>
      </div>

      <AnalyticsTabs />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
          <span className="text-xs font-semibold text-slate-500 uppercase">Общая выручка (договоры)</span>
          <div className="text-2xl font-black text-slate-900 mt-1">
            {(totalVolume / 100).toLocaleString()} <span className="text-xs font-normal">TJS</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">Подписано договоров: {dealStats?.signed_count || 0}</p>
        </div>

        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-5 shadow-2xs">
          <span className="text-xs font-bold text-emerald-700 uppercase">Собрано денежных средств</span>
          <div className="text-2xl font-black text-emerald-800 mt-1">
            {(collected / 100).toLocaleString()} <span className="text-xs font-normal">TJS</span>
          </div>
          <p className="text-xs text-emerald-600 mt-1">Фактические поступления в кассу/банк</p>
        </div>

        <div className="rounded-2xl border border-rose-200 bg-rose-50/50 p-5 shadow-2xs">
          <span className="text-xs font-bold text-rose-700 uppercase">Дебиторская задолженность</span>
          <div className="text-2xl font-black text-rose-800 mt-1">
            {(debt / 100).toLocaleString()} <span className="text-xs font-normal">TJS</span>
          </div>
          <p className="text-xs text-rose-600 mt-1">Остаток платежей по рассрочке</p>
        </div>

        <div className="rounded-2xl border border-purple-200 bg-purple-50/50 p-5 shadow-2xs">
          <span className="text-xs font-bold text-purple-700 uppercase">Конверсия отдела продаж</span>
          <div className="text-2xl font-black text-purple-800 mt-1">{conversionRate}%</div>
          <p className="text-xs text-purple-600 mt-1">Лид → Завершенная сделка</p>
        </div>
      </div>

      {/* Breakdown Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-2xl bg-white border border-slate-200 p-6 shadow-2xs space-y-4">
          <h3 className="text-base font-bold text-slate-900">Структура номерного фонда</h3>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                <span>Свободные помещения</span>
                <span>{units.available_units} шт.</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2">
                <div
                  className="bg-emerald-500 h-2 rounded-full"
                  style={{ width: `${units.total_units > 0 ? (units.available_units / units.total_units) * 100 : 0}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                <span>Забронированные</span>
                <span>{units.reserved_units} шт.</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2">
                <div
                  className="bg-amber-500 h-2 rounded-full"
                  style={{ width: `${units.total_units > 0 ? (units.reserved_units / units.total_units) * 100 : 0}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                <span>Проданные</span>
                <span>{units.sold_units} шт.</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full"
                  style={{ width: `${units.total_units > 0 ? (units.sold_units / units.total_units) * 100 : 0}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-white border border-slate-200 p-6 shadow-2xs space-y-4">
          <h3 className="text-base font-bold text-slate-900">Эффективность менеджеров</h3>
          <div className="flex flex-col items-center justify-center p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
            <Users className="h-10 w-10 text-slate-300 mb-2" />
            <p className="text-xs font-semibold text-slate-700">Отдел продаж работает в штатном режиме</p>
            <p className="text-[11px] text-slate-400 mt-1">
              Персональные KPI менеджеров рассчитываются на основе количества обработанных заявок и объема сделок.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
