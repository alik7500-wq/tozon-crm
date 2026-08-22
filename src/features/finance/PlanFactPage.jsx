import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { financeApi } from '../../api/finance.api';
import { FinanceTabs } from '../../components/FinanceTabs';
import { PaymentRecordModal } from '../deals/PaymentRecordModal';
import { DealDrawer } from '../deals/DealDrawer';
import {
  Calendar, Search, Filter, RefreshCw, DollarSign, CreditCard,
  Building2, Users, ChevronLeft, ChevronRight, Eye, Plus, ArrowUpDown
} from 'lucide-react';

export const PlanFactPage = () => {
  const [year, setYear] = useState(new Date().getFullYear());
  const [currency, setCurrency] = useState('ALL');
  const [projectId, setProjectId] = useState('ALL');
  const [paymentType, setPaymentType] = useState('ALL');
  const [leadId, setLeadId] = useState('ALL');
  const [columnMode, setColumnMode] = useState('BOTH'); // BOTH, FACT_ONLY, PLAN_ONLY
  const [search, setSearch] = useState('');
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  const [projectsList, setProjectsList] = useState([]);
  const [dealsList, setDealsList] = useState([]);
  const [selectedDealForPayment, setSelectedDealForPayment] = useState(null);
  const [selectedDealIdForDrawer, setSelectedDealIdForDrawer] = useState(null);

  useEffect(() => {
    financeApi.getProjectsForSelect().then(p => setProjectsList(p || [])).catch(() => {});
    financeApi.getDealsForSelect().then(d => setDealsList(d || [])).catch(() => {});
  }, []);

  const { data: response, isLoading, refetch } = useQuery({
    queryKey: ['finance-plan-fact', year, currency, projectId, paymentType, leadId, search],
    queryFn: () => financeApi.getPlanFactReport({
      year,
      currency,
      project_id: projectId,
      payment_type: paymentType,
      lead_id: leadId,
      search
    })
  });

  const reportData = response || {
    monthsHeader: [],
    rows: [],
    summary: { grandTotalContract: 0, grandTotalPaid: 0, grandTotalDebt: 0, monthTotals: [] }
  };

  const rows = reportData.rows || [];
  const summary = reportData.summary || { grandTotalContract: 0, grandTotalPaid: 0, grandTotalDebt: 0, monthTotals: [] };
  const monthsHeader = reportData.monthsHeader || [];

  // Pagination
  const totalPages = Math.ceil(rows.length / pageSize) || 1;
  const paginatedRows = rows.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const formatMoney = (val) => {
    if (val === undefined || val === null || val === 0) return '';
    return val.toLocaleString('ru-RU', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  };

  return (
    <div className="space-y-6 max-w-[100vw] overflow-hidden pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Calendar className="h-7 w-7 text-amber-500" />
            <span>Факт / План-Факт график по клиентам</span>
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500">
            Сводная матрица плановых графиков рассрочки и фактических оплат по каждому покупателю
          </p>
        </div>

        <button
          onClick={() => refetch()}
          title="Обновить"
          className="self-start sm:self-auto p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-blue-600 transition shadow-2xs cursor-pointer"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Finance Navigation Tabs */}
      <FinanceTabs />

      {/* Top Filter Bar as in the screenshot */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-2xs space-y-3">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Клиент */}
          <div>
            <label className="block text-[11px] font-bold text-amber-600 uppercase mb-1">
              Клиент
            </label>
            <select
              value={leadId}
              onChange={(e) => { setLeadId(e.target.value); setCurrentPage(1); }}
              className="w-full rounded-xl border border-amber-300 bg-amber-50/20 px-3 py-1.5 text-xs font-semibold text-slate-800 outline-none focus:border-amber-500 cursor-pointer"
            >
              <option value="ALL">Все клиенты</option>
              {dealsList.map(d => (
                <option key={d.id} value={d.lead_id || d.id}>
                  {d.lead_name} ({d.contract_number ? `№${d.contract_number}` : `СД-${d.id}`})
                </option>
              ))}
            </select>
          </div>

          {/* Тип платежа */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
              Тип платежа
            </label>
            <select
              value={paymentType}
              onChange={(e) => { setPaymentType(e.target.value); setCurrentPage(1); }}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-800 outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="ALL">Все типы</option>
              <option value="INSTALLMENT">Рассрочка</option>
              <option value="FULL">100% Оплата</option>
              <option value="BARTER">Бартер</option>
              <option value="PARTIAL_BARTER">Частичный бартер</option>
            </select>
          </div>

          {/* Объект */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
              Объект
            </label>
            <select
              value={projectId}
              onChange={(e) => { setProjectId(e.target.value); setCurrentPage(1); }}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-800 outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="ALL">Все объекты</option>
              {projectsList.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          {/* Валюта */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
              Валюта
            </label>
            <select
              value={currency}
              onChange={(e) => { setCurrency(e.target.value); setCurrentPage(1); }}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-800 outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="ALL">Все валюты</option>
              <option value="USD">Доллар ($)</option>
              <option value="TJS">Сомони (TJS)</option>
              <option value="RUB">Рубль (₽)</option>
            </select>
          </div>

          {/* Колонки таблицы */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
              Отображение
            </label>
            <select
              value={columnMode}
              onChange={(e) => setColumnMode(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-800 outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="BOTH">Факт и План</option>
              <option value="FACT_ONLY">Только Факт</option>
              <option value="PLAN_ONLY">Только План</option>
            </select>
          </div>

          {/* На странице */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
              На странице
            </label>
            <select
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-800 outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>

        {/* Search and Year selector */}
        <div className="flex items-center justify-between gap-4 pt-2 border-t border-slate-100 flex-wrap">
          <div className="relative min-w-[260px] flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Поиск по ФИО, договору, объекту..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-8 pr-3 py-1.5 text-xs text-slate-900 outline-none focus:border-amber-500 focus:bg-white transition"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500">Год:</span>
            {[2024, 2025, 2026, 2027].map(y => (
              <button
                key={y}
                onClick={() => { setYear(y); setCurrentPage(1); }}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition cursor-pointer ${
                  year === y
                    ? 'bg-amber-500 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {y}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Plan-Fact Matrix Table */}
      <div className="rounded-3xl bg-white shadow-2xs border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto max-w-full">
          <table className="w-full text-xs text-left border-collapse min-w-[1200px]">
            {/* Top Table Header */}
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-[11px] font-bold">
                <th className="p-3 pl-4 sticky left-0 bg-slate-50 z-20 shadow-[1px_0_0_0_#e2e8f0]">ID</th>
                <th className="p-3 sticky left-12 bg-slate-50 z-20 shadow-[1px_0_0_0_#e2e8f0] min-w-[180px]">Клиент</th>
                <th className="p-3 min-w-[130px]">Объект</th>
                <th className="p-3 text-right min-w-[100px]">Договор</th>
                <th className="p-3 text-right min-w-[100px]">Принято</th>
                <th className="p-3 text-right min-w-[100px]">Остаток</th>

                {/* Month Headers */}
                {monthsHeader.map((m) => (
                  <th
                    key={m.key}
                    colSpan={columnMode === 'BOTH' ? 2 : 1}
                    className="p-3 text-center border-l border-slate-200 min-w-[140px] bg-slate-50/80 font-bold"
                  >
                    {m.name}
                  </th>
                ))}
              </tr>

              {/* Sub-header row for Plan / Fact if columnMode is BOTH */}
              {columnMode === 'BOTH' && (
                <tr className="bg-slate-100/70 border-b border-slate-200 text-[10px] text-slate-500 uppercase font-extrabold tracking-wider">
                  <th className="p-1.5 pl-4 sticky left-0 bg-slate-100/70 z-20 shadow-[1px_0_0_0_#e2e8f0]"></th>
                  <th className="p-1.5 sticky left-12 bg-slate-100/70 z-20 shadow-[1px_0_0_0_#e2e8f0]"></th>
                  <th className="p-1.5"></th>
                  <th className="p-1.5"></th>
                  <th className="p-1.5"></th>
                  <th className="p-1.5"></th>

                  {monthsHeader.map((m) => (
                    <React.Fragment key={m.key}>
                      <th className="p-1.5 text-right border-l border-slate-200 text-slate-400 font-semibold w-16">
                        План
                      </th>
                      <th className="p-1.5 text-right text-emerald-700 font-bold w-16">
                        Факт
                      </th>
                    </React.Fragment>
                  ))}
                </tr>
              )}
            </thead>

            {/* Table Body */}
            <tbody className="divide-y divide-slate-100 font-medium">
              {paginatedRows.map((row) => (
                <tr
                  key={row.id}
                  onClick={() => setSelectedDealIdForDrawer(row.id)}
                  className="hover:bg-amber-50/40 transition cursor-pointer group"
                >
                  {/* ID */}
                  <td className="p-3 pl-4 font-mono font-bold text-slate-700 sticky left-0 bg-white group-hover:bg-amber-50/40 z-10 shadow-[1px_0_0_0_#e2e8f0]">
                    {row.contractNumber}
                  </td>

                  {/* Клиент */}
                  <td className="p-3 sticky left-12 bg-white group-hover:bg-amber-50/40 z-10 shadow-[1px_0_0_0_#e2e8f0]">
                    <div className="font-bold text-slate-900 group-hover:text-amber-800 transition">
                      {row.clientName}
                    </div>
                    {row.clientPhone && (
                      <div className="text-[10px] text-slate-400 font-normal">{row.clientPhone}</div>
                    )}
                  </td>

                  {/* Объект */}
                  <td className="p-3 text-slate-600 font-semibold uppercase text-[11px]">
                    {row.projectName} <span className="text-slate-400 font-normal">({row.unitNumber})</span>
                  </td>

                  {/* Договор */}
                  <td className="p-3 text-right font-bold text-slate-900">
                    {formatMoney(row.contractAmount)}
                  </td>

                  {/* Принято */}
                  <td className="p-3 text-right font-bold text-emerald-700">
                    {formatMoney(row.totalPaid)}
                  </td>

                  {/* Остаток */}
                  <td className="p-3 text-right font-bold text-rose-600">
                    {formatMoney(row.remainingDebt)}
                  </td>

                  {/* Month columns */}
                  {row.months.map((m, idx) => (
                    <React.Fragment key={idx}>
                      {columnMode === 'BOTH' && (
                        <>
                          <td className="p-2.5 text-right border-l border-slate-100 text-slate-500 font-normal">
                            {formatMoney(m.planned)}
                          </td>
                          <td className={`p-2.5 text-right font-bold ${
                            m.actual > 0 ? 'text-emerald-700 bg-emerald-50/30' : 'text-slate-300'
                          }`}>
                            {formatMoney(m.actual)}
                          </td>
                        </>
                      )}

                      {columnMode === 'FACT_ONLY' && (
                        <td className={`p-2.5 text-right border-l border-slate-100 font-bold ${
                          m.actual > 0 ? 'text-emerald-700 bg-emerald-50/30' : 'text-slate-300'
                        }`}>
                          {formatMoney(m.actual)}
                        </td>
                      )}

                      {columnMode === 'PLAN_ONLY' && (
                        <td className="p-2.5 text-right border-l border-slate-100 text-slate-600 font-medium">
                          {formatMoney(m.planned)}
                        </td>
                      )}
                    </React.Fragment>
                  ))}
                </tr>
              ))}

              {paginatedRows.length === 0 && (
                <tr>
                  <td
                    colSpan={6 + monthsHeader.length * (columnMode === 'BOTH' ? 2 : 1)}
                    className="p-12 text-center text-slate-400"
                  >
                    Нет договоров по выбранным критериям
                  </td>
                </tr>
              )}
            </tbody>

            {/* Total Footer Row */}
            <tfoot className="bg-slate-100/90 border-t-2 border-slate-300 text-xs font-black text-slate-900 sticky bottom-0 z-20">
              <tr>
                <td colSpan={3} className="p-3.5 pl-4 sticky left-0 bg-slate-100 z-30 shadow-[1px_0_0_0_#cbd5e1] font-extrabold uppercase">
                  Общая сумма
                </td>
                <td className="p-3.5 text-right font-black text-slate-900">
                  {formatMoney(summary.grandTotalContract)}
                </td>
                <td className="p-3.5 text-right font-black text-emerald-800">
                  {formatMoney(summary.grandTotalPaid)}
                </td>
                <td className="p-3.5 text-right font-black text-rose-700">
                  {formatMoney(summary.grandTotalDebt)}
                </td>

                {/* Monthly Totals */}
                {(summary.monthTotals || []).map((mt, idx) => (
                  <React.Fragment key={idx}>
                    {columnMode === 'BOTH' && (
                      <>
                        <td className="p-3 text-right border-l border-slate-200 text-slate-700 font-bold">
                          {formatMoney(mt.planned)}
                        </td>
                        <td className="p-3 text-right text-emerald-800 font-black">
                          {formatMoney(mt.actual)}
                        </td>
                      </>
                    )}
                    {columnMode === 'FACT_ONLY' && (
                      <td className="p-3 text-right border-l border-slate-200 text-emerald-800 font-black">
                        {formatMoney(mt.actual)}
                      </td>
                    )}
                    {columnMode === 'PLAN_ONLY' && (
                      <td className="p-3 text-right border-l border-slate-200 text-slate-800 font-bold">
                        {formatMoney(mt.planned)}
                      </td>
                    )}
                  </React.Fragment>
                ))}
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Pagination Controls */}
        <div className="p-4 border-t border-slate-200 flex items-center justify-between bg-slate-50/50">
          <div className="text-xs text-slate-500 font-medium">
            Показано {rows.length === 0 ? 0 : (currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, rows.length)} из {rows.length} договоров
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((pg) => (
              <button
                key={pg}
                onClick={() => setCurrentPage(pg)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  currentPage === pg
                    ? 'bg-amber-500 text-white shadow-xs'
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                {pg}
              </button>
            ))}

            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Deal Full Details Drawer */}
      <DealDrawer
        isOpen={Boolean(selectedDealIdForDrawer)}
        onClose={() => setSelectedDealIdForDrawer(null)}
        dealId={selectedDealIdForDrawer}
        onDealUpdated={refetch}
      />
    </div>
  );
};
