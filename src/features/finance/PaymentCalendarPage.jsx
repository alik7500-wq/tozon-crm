import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { FinanceTabs } from '../../components/FinanceTabs';
import {
  Calendar as CalendarIcon,
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
  TrendingUp,
  CreditCard,
  User
} from 'lucide-react';

export const PaymentCalendarPage = () => {
  const [payments, setPayments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  useEffect(() => {
    const fetchUpcomingPayments = async () => {
      try {
        setIsLoading(true);
        const res = await api.get('/dashboard/stats');
        const upcoming = res.data?.upcomingPayments || res.upcomingPayments || [];
        setPayments(upcoming);
      } catch (err) {
        console.error('Error fetching calendar payments:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchUpcomingPayments();
  }, []);

  const filteredPayments = payments.filter((p) => {
    const matchesSearch =
      !search ||
      (p.contract_number && p.contract_number.toLowerCase().includes(search.toLowerCase())) ||
      (p.lead_name && p.lead_name.toLowerCase().includes(search.toLowerCase()));
    return matchesSearch;
  });

  const totalPlanSum = filteredPayments.reduce((acc, p) => acc + (p.amount_minor || 0), 0);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <CalendarIcon className="h-7 w-7 text-blue-600" />
            <span>Календарь и график поступлений</span>
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500">
            План и факт поступления взносов по графику рассрочки по дням и месяцам
          </p>
        </div>

        <div className="rounded-xl bg-blue-50 border border-blue-200 px-4 py-2 text-xs text-blue-900 font-bold">
          Запланировано к получению: {(totalPlanSum / 100).toLocaleString()} USD/TJS
        </div>
      </div>

      <FinanceTabs />

      {/* Filter Bar */}
      <div className="flex items-center justify-between gap-4 rounded-2xl bg-white p-4 border border-slate-200 shadow-2xs">
        <div className="relative min-w-[240px] max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Поиск по договору или клиенту..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3.5 py-1.5 text-xs text-slate-900 outline-none focus:border-blue-500 focus:bg-white transition"
          />
        </div>

        <div className="text-xs text-slate-500 font-semibold">
          Платежей в выборке: <strong className="text-slate-900">{filteredPayments.length}</strong>
        </div>
      </div>

      {/* Calendar List */}
      {isLoading ? (
        <div className="h-72 rounded-2xl bg-white border border-slate-200 flex items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
            <span className="text-xs text-slate-500">Загрузка календаря...</span>
          </div>
        </div>
      ) : filteredPayments.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center shadow-xs">
          <CalendarIcon className="h-12 w-12 text-slate-300 mb-2" />
          <h3 className="text-base font-bold text-slate-900">Ближайших плановых платежей нет</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm">
            График платежей формируется автоматически при оформлении договора с рассрочкой.
          </p>
        </div>
      ) : (
        <div className="rounded-2xl bg-white border border-slate-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                <tr>
                  <th className="p-3.5 pl-5">Дата платежа</th>
                  <th className="p-3.5">Договор</th>
                  <th className="p-3.5">Покупатель</th>
                  <th className="p-3.5">Объект / Квартира</th>
                  <th className="p-3.5 text-right pr-5">Сумма платежа</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPayments.map((p, idx) => (
                  <tr key={p.id || idx} className="hover:bg-slate-50 transition">
                    <td className="p-3.5 pl-5 font-bold text-slate-900 flex items-center gap-2">
                      <CalendarIcon className="h-4 w-4 text-blue-600" />
                      <span>{new Date(p.due_date).toLocaleDateString('ru-RU')}</span>
                    </td>
                    <td className="p-3.5 font-bold text-blue-700">{p.contract_number}</td>
                    <td className="p-3.5 font-semibold text-slate-800">{p.lead_name}</td>
                    <td className="p-3.5 text-slate-600">
                      {p.project_name} (кв. №{p.unit_number})
                    </td>
                    <td className="p-3.5 text-right pr-5 font-black text-slate-900">
                      {(p.amount_minor / 100).toLocaleString()} {p.currency || 'USD'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
