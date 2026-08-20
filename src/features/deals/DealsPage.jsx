import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { DealsTableView } from './DealsTableView';
import { DealsKanbanView } from './DealsKanbanView';
import { DealDrawer } from './DealDrawer';
import { DealWizardModal } from './DealWizardModal';
import { ContractPrintView } from './ContractPrintView';
import { PaymentRecordModal } from './PaymentRecordModal';
import { formatContractNumber } from '../../utils/formatters';
import {
  FileCheck,
  Plus,
  Search,
  Filter,
  Kanban,
  Table as TableIcon,
  Building2,
  TrendingUp,
  Clock,
  CheckCircle2,
  XCircle,
  CreditCard,
  RefreshCw,
  Wallet,
  ShieldCheck,
  Coins
} from 'lucide-react';

export const DealsPage = () => {
  const [deals, setDeals] = useState([]);
  const [stats, setStats] = useState(null);
  const [projects, setProjects] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState('table'); // 'table' or 'kanban'

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [projectFilter, setProjectFilter] = useState('ALL');
  const [paymentTypeFilter, setPaymentTypeFilter] = useState('ALL');

  // Modals & Drawers state
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [selectedDealId, setSelectedDealId] = useState(null);
  const [dealToPrint, setDealToPrint] = useState(null);
  const [dealForPayment, setDealForPayment] = useState(null);

  const fetchDeals = async () => {
    setIsLoading(true);
    try {
      const params = {};
      if (search) params.search = search;
      if (statusFilter !== 'ALL') params.status = statusFilter;
      if (projectFilter !== 'ALL') params.projectId = projectFilter;
      if (paymentTypeFilter !== 'ALL') params.paymentType = paymentTypeFilter;

      const res = await api.get('/deals', { params });
      setDeals(res.data?.deals || res.deals || []);
    } catch (err) {
      console.error('Error fetching deals:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await api.get('/deals/stats');
      setStats(res.data?.stats || res.stats || null);
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  const fetchProjects = async () => {
    try {
      const res = await api.get('/projects');
      setProjects(res.data?.projects || res.projects || []);
    } catch (err) {
      console.error('Error fetching projects:', err);
    }
  };

  useEffect(() => {
    fetchProjects();
    fetchStats();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchDeals();
    }, 200);
    return () => clearTimeout(timer);
  }, [search, statusFilter, projectFilter, paymentTypeFilter]);

  const handleSelectDeal = (deal) => {
    setSelectedDealId(deal.id);
  };

  const handleDealSavedOrUpdated = () => {
    fetchDeals();
    fetchStats();
  };

  const handleSignDeal = async (deal) => {
    if (!window.confirm(`Подписать договор № ${formatContractNumber(deal.contract_number)}?`)) return;
    try {
      await api.post(`/deals/${deal.id}/sign`);
      fetchDeals();
      fetchStats();
    } catch (err) {
      alert(err.message || 'Ошибка подписания сделки');
    }
  };

  const handleCancelDeal = async (deal) => {
    const reason = window.prompt('Укажите причину отмены сделки:');
    if (reason === null) return;
    try {
      await api.post(`/deals/${deal.id}/cancel`, { reason });
      fetchDeals();
      fetchStats();
    } catch (err) {
      alert(err.message || 'Ошибка отмены сделки');
    }
  };

  const handleOpenPayment = (deal) => {
    setDealForPayment(deal);
  };

  const handleOpenPrint = (deal) => {
    setDealToPrint(deal);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Header Banner */}
      <div className="print:hidden flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <FileCheck className="h-7 w-7 text-blue-600" />
            <span>Сделки и договоры</span>
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500">
            Оформление продаж, рассрочки, график платежей, договоры купли-продажи и учет поступлений
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => {
              fetchDeals();
              fetchStats();
            }}
            className="flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-xs transition cursor-pointer"
            title="Обновить список"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Обновить</span>
          </button>

          <button
            onClick={() => setIsWizardOpen(true)}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-md hover:from-blue-700 hover:to-indigo-700 transition cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Оформить сделку</span>
          </button>
        </div>
      </div>

      {/* High-level Operational Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* Total Signed Sales */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs flex items-center gap-3.5">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-500 block">
              Продано договоров
            </span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-xl font-extrabold text-slate-900">
                {stats ? stats.signed_count : 0}
              </span>
              <span className="text-[11px] font-bold text-emerald-700">
                ({stats ? ((stats.total_signed_revenue_minor || 0) / 100).toLocaleString() : 0} USD)
              </span>
            </div>
          </div>
        </div>

        {/* Active Reservations */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs flex items-center gap-3.5">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-600 border border-amber-100">
            <Clock className="h-6 w-6" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-500 block">
              Активные брони
            </span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-xl font-extrabold text-slate-900">
                {stats ? stats.reserved_count : 0}
              </span>
              <span className="text-[11px] font-bold text-amber-700">
                ({stats ? ((stats.total_reserved_volume_minor || 0) / 100).toLocaleString() : 0} USD)
              </span>
            </div>
          </div>
        </div>

        {/* Installment Plans */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs flex items-center gap-3.5">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
            <CreditCard className="h-6 w-6" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-500 block">
              Действующие рассрочки
            </span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-xl font-extrabold text-slate-900">
                {stats ? stats.installment_plans_count : 0}
              </span>
              <span className="text-[11px] font-medium text-slate-400">планов</span>
            </div>
          </div>
        </div>

        {/* Collected Money */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs flex items-center gap-3.5">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-50 text-teal-600 border border-teal-100">
            <Wallet className="h-6 w-6" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-500 block">
              Собрано оплат
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-base font-extrabold text-teal-900">
                {stats ? ((stats.total_collected_minor || 0) / 100).toLocaleString() : 0}
              </span>
              <span className="text-[10px] text-slate-500">USD</span>
            </div>
          </div>
        </div>

        {/* Outstanding Debt */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs flex items-center gap-3.5">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-rose-50 text-rose-600 border border-rose-100">
            <TrendingUp className="h-6 w-6" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-500 block">
              Остаток к получению
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-base font-extrabold text-rose-700">
                {stats ? ((stats.outstanding_debt_minor || 0) / 100).toLocaleString() : 0}
              </span>
              <span className="text-[10px] text-slate-500">USD</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Controls Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-xs">
        {/* Search input */}
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по номеру договора, ФИО покупателя, телефону или кв. №..."
            className="w-full rounded-xl border border-slate-300 bg-slate-50/70 pl-9.5 pr-3.5 py-2 text-xs outline-none focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-500 transition"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Project filter */}
          <select
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 outline-none focus:border-blue-500"
          >
            <option value="ALL">Все объекты</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 outline-none focus:border-blue-500"
          >
            <option value="ALL">Все статусы сделок</option>
            <option value="SIGNED">🟢 Подписан (Продано)</option>
            <option value="RESERVED">🟡 Бронь</option>
            <option value="CANCELLED">🔴 Отменен</option>
          </select>

          {/* Payment Type filter */}
          <select
            value={paymentTypeFilter}
            onChange={(e) => setPaymentTypeFilter(e.target.value)}
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 outline-none focus:border-blue-500"
          >
            <option value="ALL">Все формы оплаты</option>
            <option value="INSTALLMENT">Рассрочка</option>
            <option value="FULL">100% Оплата</option>
            <option value="BARTER">100% Бартер</option>
            <option value="PARTIAL_BARTER">Бартер + Доплата</option>
          </select>

          {/* View mode toggle (Table / Kanban) */}
          <div className="flex items-center rounded-xl border border-slate-200 bg-slate-100/80 p-0.5">
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <TableIcon className="h-3.5 w-3.5" />
              <span>Таблица</span>
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                viewMode === 'kanban'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Kanban className="h-3.5 w-3.5" />
              <span>Канбан</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main View Area */}
      {viewMode === 'table' ? (
        <DealsTableView
          deals={deals}
          isLoading={isLoading}
          onSelectDeal={handleSelectDeal}
          onOpenContractPrint={handleOpenPrint}
          onOpenPayment={handleOpenPayment}
          onSignDeal={handleSignDeal}
          onCancelDeal={handleCancelDeal}
        />
      ) : (
        <DealsKanbanView
          deals={deals}
          isLoading={isLoading}
          onSelectDeal={handleSelectDeal}
          onOpenContractPrint={handleOpenPrint}
          onOpenPayment={handleOpenPayment}
          onSignDeal={handleSignDeal}
        />
      )}

      {/* Standalone Deal Creation Wizard Modal */}
      {isWizardOpen && (
        <DealWizardModal
          isOpen={isWizardOpen}
          onClose={() => setIsWizardOpen(false)}
          onDealCreated={(createdDeal) => {
            handleDealSavedOrUpdated();
            if (createdDeal?.id) {
              setSelectedDealId(createdDeal.id);
            }
          }}
        />
      )}

      {/* Deal Detail Drawer */}
      {selectedDealId && (
        <DealDrawer
          isOpen={!!selectedDealId}
          onClose={() => setSelectedDealId(null)}
          dealId={selectedDealId}
          onDealUpdated={handleDealSavedOrUpdated}
          onOpenContractPrint={handleOpenPrint}
        />
      )}

      {/* Contract & Schedule Printable View Modal */}
      {dealToPrint && (
        <ContractPrintView
          deal={dealToPrint}
          onClose={() => setDealToPrint(null)}
        />
      )}

      {/* Payment Record Modal from Table / Quick action */}
      {dealForPayment && (
        <PaymentRecordModal
          isOpen={!!dealForPayment}
          onClose={() => setDealForPayment(null)}
          deal={dealForPayment}
          onPaymentSuccess={() => {
            handleDealSavedOrUpdated();
            setDealForPayment(null);
          }}
        />
      )}
    </div>
  );
};
