import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { financeApi } from '../../api/finance.api';
import { formatContractNumber } from '../../utils/formatters';
import { FinanceTabs } from '../../components/FinanceTabs';
import { PaymentRecordModal } from '../deals/PaymentRecordModal';
import { DealDrawer } from '../deals/DealDrawer';
import {
  Calendar as CalendarIcon,
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
  TrendingUp,
  CreditCard,
  User,
  Filter,
  RefreshCw,
  Eye,
  Plus,
  AlertTriangle,
  ArrowRight
} from 'lucide-react';

export const PaymentCalendarPage = () => {
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1;

  const [year, setYear] = useState('ALL');
  const [month, setMonth] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [projectId, setProjectId] = useState('ALL');
  const [leadId, setLeadId] = useState('ALL');
  const [search, setSearch] = useState('');
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [next30Days, setNext30Days] = useState(false);

  const [projectsList, setProjectsList] = useState([]);
  const [selectedDealIdForDrawer, setSelectedDealIdForDrawer] = useState(null);
  const [selectedDealForPayment, setSelectedDealForPayment] = useState(null);

  useEffect(() => {
    financeApi.getProjectsForSelect().then(p => setProjectsList(p || [])).catch(() => {});
  }, []);

  const { data: response, isLoading, refetch } = useQuery({
    queryKey: ['finance-calendar', year, month, statusFilter, projectId, leadId, overdueOnly, next30Days, search],
    queryFn: () => financeApi.getPaymentCalendar({
      year,
      month,
      status: statusFilter,
      project_id: projectId,
      lead_id: leadId,
      overdue_only: overdueOnly,
      next_30_days: next30Days,
      search
    })
  });

  const calendarData = response || {
    items: [],
    overdueItems: [],
    summary: {
      overdueAmountUsd: 0,
      upcomingAmountUsd: 0,
      receivedAmountUsd: 0,
      totalPaymentsCount: 0,
      overdueRowsCount: 0,
      paidRowsCount: 0,
      partiallyPaidRowsCount: 0,
      upcomingRowsCount: 0
    }
  };

  const items = calendarData.items || [];
  const overdueItems = calendarData.overdueItems || [];
  const summary = calendarData.summary || {
    overdueAmountUsd: 0,
    upcomingAmountUsd: 0,
    receivedAmountUsd: 0,
    totalPaymentsCount: 0,
    overdueRowsCount: 0,
    paidRowsCount: 0,
    partiallyPaidRowsCount: 0,
    upcomingRowsCount: 0
  };

  const getStatusBadge = (st) => {
    switch (st) {
      case 'PAID':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
            <span>Оплачено</span>
          </span>
        );
      case 'PARTIALLY_PAID':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="h-3.5 w-3.5 text-amber-600" />
            <span>Частично</span>
          </span>
        );
      case 'OVERDUE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
            <AlertCircle className="h-3.5 w-3.5 text-rose-600" />
            <span>Просрочено</span>
          </span>
        );
      case 'UPCOMING':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
            <CalendarIcon className="h-3.5 w-3.5 text-blue-600" />
            <span>Ожидается</span>
          </span>
        );
    }
  };

  const formatMoney = (val) => {
    if (val === undefined || val === null) return '0';
    return val.toLocaleString('ru-RU', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  };

  const monthsList = [
    { value: 'ALL', label: 'Все месяцы' },
    { value: '1', label: 'Январь' },
    { value: '2', label: 'Февраль' },
    { value: '3', label: 'Март' },
    { value: '4', label: 'Апрель' },
    { value: '5', label: 'Май' },
    { value: '6', label: 'Июнь' },
    { value: '7', label: 'Июль' },
    { value: '8', label: 'Август' },
    { value: '9', label: 'Сентябрь' },
    { value: '10', label: 'Октябрь' },
    { value: '11', label: 'Ноябрь' },
    { value: '12', label: 'Декабрь' },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <CalendarIcon className="h-7 w-7 text-blue-600" />
            <span>Календарь и график поступлений</span>
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500">
            План и факт поступления взносов по графику рассрочки с каноническим FIFO-распределением
          </p>
        </div>

        <button
          onClick={() => refetch()}
          title="Обновить"
          className="self-start sm:self-auto p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-blue-600 transition shadow-2xs cursor-pointer flex items-center gap-1.5 text-xs font-bold"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Обновить</span>
        </button>
      </div>

      <FinanceTabs />

      {/* Top 4 Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Просрочено */}
        <div className="rounded-2xl p-4 bg-rose-50 border border-rose-200/80 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-700 uppercase tracking-wider">Просрочено</span>
            <div className="p-2 rounded-xl bg-rose-100/80 text-rose-700">
              <AlertCircle className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-black text-rose-900">
              {formatMoney(summary.overdueAmountUsd)} <span className="text-sm font-bold text-rose-700">USD</span>
            </div>
            <div className="text-[11px] font-semibold text-rose-600 mt-1">
              {summary.overdueRowsCount} просроченных взносов
            </div>
          </div>
        </div>

        {/* 2. К получению */}
        <div className="rounded-2xl p-4 bg-blue-50 border border-blue-200/80 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-700 uppercase tracking-wider">К получению</span>
            <div className="p-2 rounded-xl bg-blue-100/80 text-blue-700">
              <Clock className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-black text-blue-900">
              {formatMoney(summary.upcomingAmountUsd)} <span className="text-sm font-bold text-blue-700">USD</span>
            </div>
            <div className="text-[11px] font-semibold text-blue-600 mt-1">
              {summary.upcomingRowsCount} будущих взносов
            </div>
          </div>
        </div>

        {/* 3. Получено по графику */}
        <div className="rounded-2xl p-4 bg-emerald-50 border border-emerald-200/80 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Получено по графику</span>
            <div className="p-2 rounded-xl bg-emerald-100/80 text-emerald-700">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-black text-emerald-900">
              {formatMoney(summary.receivedAmountUsd)} <span className="text-sm font-bold text-emerald-700">USD</span>
            </div>
            <div className="text-[11px] font-semibold text-emerald-600 mt-1">
              Без первоначальных взносов
            </div>
          </div>
        </div>

        {/* 4. Количество платежей */}
        <div className="rounded-2xl p-4 bg-slate-50 border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Всего в выборке</span>
            <div className="p-2 rounded-xl bg-slate-200/80 text-slate-700">
              <CalendarIcon className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-black text-slate-900">
              {summary.totalPaymentsCount} <span className="text-xs font-bold text-slate-500">платежей</span>
            </div>
            <div className="text-[11px] font-semibold text-slate-500 mt-1">
              Строки выборки
            </div>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-2xs space-y-3">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Статус */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
              Статус
            </label>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                if (e.target.value !== 'OVERDUE') setOverdueOnly(false);
              }}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-800 outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="ALL">Все статусы</option>
              <option value="OVERDUE">Просрочено</option>
              <option value="UPCOMING">Ожидается</option>
              <option value="PARTIALLY_PAID">Частично оплачено</option>
              <option value="PAID">Оплачено</option>
            </select>
          </div>

          {/* Месяц */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
              Месяц
            </label>
            <select
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-800 outline-none focus:border-blue-500 cursor-pointer"
            >
              {monthsList.map(m => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>

          {/* Год */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
              Год
            </label>
            <select
              value={year}
              onChange={(e) => setYear(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-800 outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="ALL">Все годы</option>
              <option value="2026">2026</option>
              <option value="2027">2027</option>
              <option value="2028">2028</option>
            </select>
          </div>

          {/* Объект */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
              Объект
            </label>
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-800 outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="ALL">Все объекты</option>
              {projectsList.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          {/* Быстрый переключатель 30 дней */}
          <div className="col-span-2 sm:col-span-1 flex items-end">
            <button
              onClick={() => {
                setNext30Days(!next30Days);
                if (!next30Days) setOverdueOnly(false);
              }}
              className={`w-full py-1.5 px-3 rounded-xl text-xs font-bold border transition cursor-pointer flex items-center justify-center gap-1.5 ${
                next30Days
                  ? 'bg-blue-600 border-blue-600 text-white shadow-xs'
                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <Clock className="h-3.5 w-3.5" />
              <span>Ближайшие 30 дней</span>
            </button>
          </div>

          {/* Быстрый переключатель Просроченные */}
          <div className="col-span-2 sm:col-span-1 flex items-end">
            <button
              onClick={() => {
                setOverdueOnly(!overdueOnly);
                if (!overdueOnly) {
                  setStatusFilter('OVERDUE');
                  setNext30Days(false);
                } else {
                  setStatusFilter('ALL');
                }
              }}
              className={`w-full py-1.5 px-3 rounded-xl text-xs font-bold border transition cursor-pointer flex items-center justify-center gap-1.5 ${
                overdueOnly
                  ? 'bg-rose-600 border-rose-600 text-white shadow-xs'
                  : 'bg-rose-50 border-rose-200 text-rose-800 hover:bg-rose-100'
              }`}
            >
              <AlertCircle className="h-3.5 w-3.5" />
              <span>Только просроченные</span>
            </button>
          </div>
        </div>

        {/* Search bar & quick month resets */}
        <div className="flex items-center justify-between gap-4 pt-2 border-t border-slate-100 flex-wrap">
          <div className="relative min-w-[260px] flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Поиск по договору, клиенту, объекту..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-8 pr-3 py-1.5 text-xs text-slate-900 outline-none focus:border-blue-500 focus:bg-white transition"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setYear(String(currentYear));
                setMonth(String(currentMonth));
                setStatusFilter('ALL');
                setOverdueOnly(false);
                setNext30Days(false);
                setSearch('');
              }}
              className="px-3 py-1 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 transition cursor-pointer"
            >
              Текущий месяц
            </button>

            <button
              onClick={() => {
                setYear('ALL');
                setMonth('ALL');
                setStatusFilter('ALL');
                setOverdueOnly(false);
                setNext30Days(false);
                setSearch('');
              }}
              className="px-3 py-1 rounded-xl text-xs font-bold bg-slate-100 text-slate-600 hover:bg-slate-200 transition cursor-pointer"
            >
              Сбросить фильтры
            </button>
          </div>
        </div>
      </div>

      {/* Prominent Callout Section for Overdue Payments (if present and not already filtering by OVERDUE) */}
      {!overdueOnly && overdueItems.length > 0 && statusFilter === 'ALL' && (
        <div className="rounded-2xl border border-rose-300 bg-rose-50/60 p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-rose-900 font-extrabold text-sm">
              <AlertTriangle className="h-5 w-5 text-rose-600 animate-pulse" />
              <span>Просроченные платежи вне зависимости от выбранного периода ({overdueItems.length})</span>
            </div>

            <button
              onClick={() => setOverdueOnly(true)}
              className="text-xs font-bold text-rose-700 hover:text-rose-900 flex items-center gap-1 cursor-pointer"
            >
              <span>Показать только просроченные</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
            {overdueItems.slice(0, 3).map((item) => (
              <div
                key={item.id}
                onClick={() => setSelectedDealIdForDrawer(item.deal_id)}
                className="bg-white p-3 rounded-xl border border-rose-200 hover:border-rose-400 transition cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-blue-700 text-xs">{formatContractNumber(item.contract_number)}</span>
                    <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-100">
                      Просрочено
                    </span>
                  </div>
                  <div className="text-xs font-bold text-slate-900 mt-1">{item.lead_name}</div>
                  <div className="text-[11px] text-slate-500">{item.project_name} (кв. №{item.unit_number})</div>
                </div>

                <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400">Срок: {new Date(item.due_date).toLocaleDateString('ru-RU')}</span>
                  <span className="text-xs font-black text-rose-700">
                    {formatMoney(item.remaining_amount_minor / 100)} {item.currency}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Payment Matrix Table */}
      {isLoading ? (
        <div className="h-72 rounded-3xl bg-white border border-slate-200 flex items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
            <span className="text-xs text-slate-500 font-medium">Загрузка календаря...</span>
          </div>
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-white p-12 text-center shadow-xs">
          <CalendarIcon className="h-12 w-12 text-slate-300 mb-2" />
          <h3 className="text-base font-bold text-slate-900">Плановые платежи не найдены</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm">
            Измените параметры фильтрации или выберите другой период.
          </p>
        </div>
      ) : (
        <div className="rounded-3xl bg-white border border-slate-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50/90 border-b border-slate-200 text-slate-600 font-bold">
                <tr>
                  <th className="p-3.5 pl-5">Дата платежа</th>
                  <th className="p-3.5">Договор</th>
                  <th className="p-3.5">Покупатель</th>
                  <th className="p-3.5">Объект / Квартира</th>
                  <th className="p-3.5 text-right">Плановая сумма</th>
                  <th className="p-3.5 text-right">Оплачено на взнос</th>
                  <th className="p-3.5 text-right">Остаток</th>
                  <th className="p-3.5 text-center">Статус</th>
                  <th className="p-3.5 text-right pr-5">Действие</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {items.map((item) => {
                  const planned = (item.planned_amount_minor || item.amount_minor || 0) / 100;
                  const paid = (item.paid_amount_minor || 0) / 100;
                  const remaining = (item.remaining_amount_minor !== undefined ? item.remaining_amount_minor : Math.max(0, item.planned_amount_minor - item.paid_amount_minor)) / 100;

                  return (
                    <tr
                      key={item.id}
                      onClick={() => setSelectedDealIdForDrawer(item.deal_id)}
                      className="hover:bg-slate-50/80 transition cursor-pointer group"
                    >
                      {/* Дата платежа */}
                      <td className="p-3.5 pl-5 font-bold text-slate-900 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <CalendarIcon className="h-4 w-4 text-blue-600" />
                          <span>{new Date(item.due_date).toLocaleDateString('ru-RU')}</span>
                        </div>
                      </td>

                      {/* Договор */}
                      <td className="p-3.5 font-mono font-bold text-blue-700 whitespace-nowrap">
                        {formatContractNumber(item.contract_number)}
                      </td>

                      {/* Покупатель */}
                      <td className="p-3.5 text-slate-800 font-bold">
                        <div>{item.lead_name}</div>
                        {item.lead_phone && (
                          <div className="text-[10px] text-slate-400 font-normal">{item.lead_phone}</div>
                        )}
                      </td>

                      {/* Объект / Квартира */}
                      <td className="p-3.5 text-slate-600">
                        <span className="font-semibold text-slate-800">{item.project_name}</span>
                        <span className="text-slate-400"> (кв. №{item.unit_number})</span>
                      </td>

                      {/* Плановая сумма */}
                      <td className="p-3.5 text-right font-bold text-slate-900">
                        {formatMoney(planned)} {item.currency}
                      </td>

                      {/* Оплачено по взносу */}
                      <td className="p-3.5 text-right font-bold text-emerald-700">
                        {formatMoney(paid)} {item.currency}
                      </td>

                      {/* Остаток */}
                      <td className="p-3.5 text-right font-black text-rose-700">
                        {formatMoney(remaining)} {item.currency}
                      </td>

                      {/* Статус */}
                      <td className="p-3.5 text-center whitespace-nowrap">
                        {getStatusBadge(item.status)}
                      </td>

                      {/* Действие */}
                      <td className="p-3.5 text-right pr-5 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          {item.status !== 'PAID' && (
                            <button
                              onClick={() => setSelectedDealForPayment({ id: item.deal_id, currency: item.currency })}
                              className="px-2.5 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold shadow-2xs transition cursor-pointer flex items-center gap-1"
                              title="Принять платёж"
                            >
                              <Plus className="h-3 w-3" />
                              <span>Принять</span>
                            </button>
                          )}

                          <button
                            onClick={() => setSelectedDealIdForDrawer(item.deal_id)}
                            className="p-1.5 rounded-xl border border-slate-200 text-slate-600 hover:text-blue-600 hover:bg-slate-100 transition cursor-pointer"
                            title="Открыть сделку"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Deal Details Drawer */}
      <DealDrawer
        isOpen={Boolean(selectedDealIdForDrawer)}
        onClose={() => setSelectedDealIdForDrawer(null)}
        dealId={selectedDealIdForDrawer}
        onDealUpdated={refetch}
      />

      {/* Payment Record Modal */}
      {selectedDealForPayment && (
        <PaymentRecordModal
          deal={selectedDealForPayment}
          isOpen={Boolean(selectedDealForPayment)}
          onClose={() => setSelectedDealForPayment(null)}
          onPaymentSuccess={() => {
            setSelectedDealForPayment(null);
            refetch();
          }}
        />
      )}
    </div>
  );
};
