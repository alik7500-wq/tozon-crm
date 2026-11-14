import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  ExternalLink,
  Filter,
  Loader2,
  RefreshCw,
  Search,
  ShieldAlert,
  Users,
  Wallet,
  XCircle,
} from 'lucide-react';
import { FinanceTabs } from '../../components/FinanceTabs';
import { financeApi } from '../../api/finance.api';

function formatUsd(value) {
  const num = Number(value || 0);
  if (!Number.isFinite(num)) return '0.00';
  return num.toLocaleString('ru-RU', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatPct(value) {
  const num = Number(value || 0);
  if (!Number.isFinite(num)) return '0,00%';
  return `${num.toLocaleString('ru-RU', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}%`;
}

function makeIdempotencyKey(prefix, dealId) {
  const rand = Math.random().toString(36).slice(2, 10);
  return `${prefix}-${dealId}-${Date.now()}-${rand}`;
}

const STATUS_BADGE_MAP = {
  NOT_CALCULATED: 'bg-slate-100 text-slate-700 border-slate-200',
  CALCULATED: 'bg-sky-50 text-sky-700 border-sky-200',
  PENDING_APPROVAL: 'bg-amber-50 text-amber-700 border-amber-200',
  APPROVED: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  PARTIALLY_PAID: 'bg-violet-50 text-violet-700 border-violet-200',
  PAID: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  CANCELLED: 'bg-rose-50 text-rose-700 border-rose-200',
};

export const MarketingCommissionsPage = () => {
  const [filters, setFilters] = useState({
    complex: 'ALL',
    block: 'ALL',
    partnerId: 'ALL',
    startDate: '',
    endDate: '',
    rate: 'ALL',
    status: 'ALL',
    search: '',
  });
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState(false);
  const [showPartnersSummary, setShowPartnersSummary] = useState(true);

  // Action modal state
  const [modalState, setModalState] = useState(null); // { type: 'APPROVE' | 'PAYOUT' | 'CANCEL', row, idempotencyKey }
  const [payoutAmount, setPayoutAmount] = useState('');
  const [notesInput, setNotesInput] = useState('');
  const [rkoCandidates, setRkoCandidates] = useState([]);
  const [selectedRkoId, setSelectedRkoId] = useState('');
  const [rkoLoading, setRkoLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState('');
  const [toast, setToast] = useState('');

  const loadData = useCallback(async (activeFilters = filters) => {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (activeFilters.complex !== 'ALL') params.complex = activeFilters.complex;
      if (activeFilters.block !== 'ALL') params.block = activeFilters.block;
      if (activeFilters.partnerId !== 'ALL') params.partnerId = activeFilters.partnerId;
      if (activeFilters.startDate) params.startDate = activeFilters.startDate;
      if (activeFilters.endDate) params.endDate = activeFilters.endDate;
      if (activeFilters.rate !== 'ALL') params.rate = activeFilters.rate;
      if (activeFilters.status !== 'ALL') params.status = activeFilters.status;
      if (activeFilters.search.trim()) params.search = activeFilters.search.trim();

      const res = await financeApi.getMarketingCommissions(params);
      setData(res);
    } catch (err) {
      setError(err?.response?.data?.error?.message || err?.response?.data?.message || err?.message || 'Ошибка загрузки реестра комиссий');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadData(filters);
  }, [filters, loadData]);

  const permissions = data?.permissions || {
    canView: true,
    canApprove: false,
    canPayout: false,
    canCancel: false,
    canExport: false,
  };

  const rows = useMemo(() => data?.rows || [], [data]);
  const totals = data?.totals || {
    dealsCount: 0,
    contractPriceUsd: 0,
    totalSettledUsd: 0,
    avgPaymentPercent: 0,
    calculatedCommissionUsd: 0,
    approvedCommissionUsd: 0,
    paidCommissionUsd: 0,
    remainingCommissionUsd: 0,
    additionalAccrualUsd: 0,
    overpaidCommissionUsd: 0,
    unlinkedPayoutsCount: 0,
    rateBreakdown: { '0': 0, '2': 0, '3': 0, '4': 0 },
  };
  const summary = data?.summary || totals;
  const partnerSummary = data?.partnerSummary || [];
  const filterOptions = data?.filterOptions || { complexes: [], blocks: [], partners: [] };

  const openActionModal = async (type, row) => {
    setActionError('');
    setNotesInput('');
    setSelectedRkoId('');
    setPayoutAmount(type === 'PAYOUT' ? String(row.remainingCommissionUsd || '') : '');
    setModalState({
      type,
      row,
      idempotencyKey: makeIdempotencyKey(type.toLowerCase(), row.dealId),
    });

    if (type === 'PAYOUT') {
      setRkoLoading(true);
      try {
        const res = await financeApi.getMarketingCommissionRkoCandidates({});
        setRkoCandidates(res?.items || []);
      } catch {
        setRkoCandidates([]);
      } finally {
        setRkoLoading(false);
      }
    }
  };

  const closeModal = () => {
    if (submitting) return;
    setModalState(null);
    setActionError('');
  };

  const handleSubmitModal = async (e) => {
    e.preventDefault();
    if (!modalState) return;
    const { type, row, idempotencyKey } = modalState;
    setSubmitting(true);
    setActionError('');

    try {
      if (type === 'APPROVE') {
        await financeApi.approveMarketingCommission(row.dealId, {
          notes: notesInput.trim() || 'Утверждено в реестре комиссий маркетологов',
          idempotencyKey,
        });
        setToast(`Комиссия по договору ${row.contractNumber} утверждена`);
      } else if (type === 'PAYOUT') {
        const amountNum = Number(String(payoutAmount).replace(',', '.'));
        if (!Number.isFinite(amountNum) || amountNum <= 0) {
          setActionError('Укажите положительную сумму выплаты');
          setSubmitting(false);
          return;
        }
        const selectedRko = rkoCandidates.find((r) => String(r.id) === String(selectedRkoId));
        await financeApi.payoutMarketingCommission(row.dealId, {
          payoutAmountUsd: amountNum,
          notes: notesInput.trim() || `Выплата по договору ${row.contractNumber}`,
          rkoExpenseId: selectedRko ? selectedRko.id : undefined,
          rkoReference: selectedRko ? selectedRko.reference : undefined,
          idempotencyKey,
        });
        setToast(`Выплата ${formatUsd(amountNum)} USD по договору ${row.contractNumber} зарегистрирована`);
      } else if (type === 'CANCEL') {
        if (notesInput.trim().length < 3) {
          setActionError('Укажите причину отмены (минимум 3 символа)');
          setSubmitting(false);
          return;
        }
        await financeApi.cancelMarketingCommission(row.dealId, {
          reason: notesInput.trim(),
          idempotencyKey,
        });
        setToast(`Комиссия по договору ${row.contractNumber} отменена`);
      }

      setModalState(null);
      await loadData(filters);
    } catch (err) {
      setActionError(
        err?.response?.data?.error?.message ||
        err?.response?.data?.message ||
        err?.message ||
        'Не удалось выполнить операцию'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const params = {};
      if (filters.complex !== 'ALL') params.complex = filters.complex;
      if (filters.block !== 'ALL') params.block = filters.block;
      if (filters.partnerId !== 'ALL') params.partnerId = filters.partnerId;
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;
      if (filters.rate !== 'ALL') params.rate = filters.rate;
      if (filters.status !== 'ALL') params.status = filters.status;
      if (filters.search.trim()) params.search = filters.search.trim();

      const blob = await financeApi.exportMarketingCommissionsExcel(params);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Комиссии_маркетологов_${new Date().toISOString().slice(0, 10)}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err?.response?.data?.error?.message || err?.message || 'Ошибка экспорта Excel');
    } finally {
      setExporting(false);
    }
  };

  const resetFilters = () => {
    setFilters({
      complex: 'ALL',
      block: 'ALL',
      partnerId: 'ALL',
      startDate: '',
      endDate: '',
      rate: 'ALL',
      status: 'ALL',
      search: '',
    });
  };

  return (
    <div className="space-y-6">
      <FinanceTabs />

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Комиссии маркетологов</h1>
          <p className="text-sm text-slate-500">
            Индивидуальный расчёт по каждому договору MARKETER (0% / 2% / 3% / 4%), утверждение, выплаты и контроль переплат
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => loadData(filters)}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Обновить
          </button>

          {permissions.canExport && (
            <button
              type="button"
              onClick={handleExport}
              disabled={exporting || loading}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 disabled:opacity-50"
            >
              {exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
              Экспорт в Excel
            </button>
          )}
        </div>
      </div>

      {permissions.payoutBlockedReason && (
        <div className="flex items-start gap-2.5 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs font-medium text-slate-700">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
          <div>
            Комиссии рассчитываются автоматически. Выплаты маркетологам осуществляются по решению руководства вне автоматического режима CRM.
          </div>
        </div>
      )}

      {toast && (
        <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-800">
          <span>{toast}</span>
          <button type="button" onClick={() => setToast('')} className="text-xs font-bold underline">Скрыть</button>
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
          {error}
        </div>
      )}

      {/* 8-card Summary Panel */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="text-xs font-semibold text-slate-500">Продажи через маркетологов</div>
          <div className="mt-1 text-xl font-extrabold text-slate-900">${formatUsd(summary.contractPriceUsd)}</div>
          <div className="mt-1 text-xs text-slate-500">
            Договоров: {summary.dealsCount} (0%: {summary.rateBreakdown?.['0'] || 0}, 2%: {summary.rateBreakdown?.['2'] || 0}, 3%: {summary.rateBreakdown?.['3'] || 0}, 4%: {summary.rateBreakdown?.['4'] || 0})
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="text-xs font-semibold text-slate-500">Фактически получено от покупателей</div>
          <div className="mt-1 text-xl font-extrabold text-slate-900">${formatUsd(summary.totalSettledUsd)}</div>
          <div className="mt-1 text-xs text-slate-500">Средняя оплата: {formatPct(summary.avgPaymentPercent)}</div>
        </div>

        <div className="rounded-2xl border border-sky-200 bg-sky-50/40 p-4 shadow-xs">
          <div className="text-xs font-semibold text-sky-700">Общая расчётная комиссия</div>
          <div className="mt-1 text-xl font-extrabold text-sky-900">${formatUsd(summary.calculatedCommissionUsd)}</div>
          <div className="mt-1 text-xs text-sky-700">По индивидуальным ставкам договоров</div>
        </div>

        <div className="rounded-2xl border border-indigo-200 bg-indigo-50/40 p-4 shadow-xs">
          <div className="text-xs font-semibold text-indigo-700">Утверждено</div>
          <div className="mt-1 text-xl font-extrabold text-indigo-900">${formatUsd(summary.approvedCommissionUsd)}</div>
          <div className="mt-1 text-xs text-indigo-700">Доступный лимит для выплат</div>
        </div>

        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-4 shadow-xs">
          <div className="text-xs font-semibold text-emerald-700">Выплачено</div>
          <div className="mt-1 text-xl font-extrabold text-emerald-900">${formatUsd(summary.paidCommissionUsd)}</div>
          <div className="mt-1 text-xs text-emerald-700">
            {summary.unlinkedPayoutsCount > 0 ? `Без привязки к РКО: ${summary.unlinkedPayoutsCount}` : 'Сверено с реестром'}
          </div>
        </div>

        <div className="rounded-2xl border border-violet-200 bg-violet-50/40 p-4 shadow-xs">
          <div className="text-xs font-semibold text-violet-700">Остаток утверждённой к выплате</div>
          <div className="mt-1 text-xl font-extrabold text-violet-900">${formatUsd(summary.remainingCommissionUsd)}</div>
          <div className="mt-1 text-xs text-violet-700">Утверждено минус выплачено</div>
        </div>

        <div className="rounded-2xl border border-amber-200 bg-amber-50/40 p-4 shadow-xs">
          <div className="text-xs font-semibold text-amber-700">К дополнительному утверждению</div>
          <div className="mt-1 text-xl font-extrabold text-amber-900">${formatUsd(summary.additionalAccrualUsd)}</div>
          <div className="mt-1 text-xs text-amber-700">Разница при росте ставки / новые начисления</div>
        </div>

        <div className={`rounded-2xl border p-4 shadow-xs ${summary.overpaidCommissionUsd > 0 ? 'border-rose-300 bg-rose-50' : 'border-slate-200 bg-white'}`}>
          <div className={`text-xs font-semibold ${summary.overpaidCommissionUsd > 0 ? 'text-rose-700' : 'text-slate-500'}`}>
            Переплаты к урегулированию
          </div>
          <div className={`mt-1 text-xl font-extrabold ${summary.overpaidCommissionUsd > 0 ? 'text-rose-900' : 'text-slate-900'}`}>
            ${formatUsd(summary.overpaidCommissionUsd)}
          </div>
          <div className={`mt-1 text-xs ${summary.overpaidCommissionUsd > 0 ? 'text-rose-700' : 'text-slate-500'}`}>
            {summary.overpaidCommissionUsd > 0 ? 'Новые выплаты заблокированы' : 'Переплат нет'}
          </div>
        </div>
      </div>

      {/* Partner Summary Section */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-xs">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-blue-600" />
            <h2 className="text-sm font-extrabold text-slate-900">Сводка по маркетинговым партнёрам</h2>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-600">{partnerSummary.length}</span>
          </div>
          <button
            type="button"
            onClick={() => setShowPartnersSummary((v) => !v)}
            className="text-xs font-bold text-blue-600 hover:underline"
          >
            {showPartnersSummary ? 'Свернуть' : 'Развернуть'}
          </button>
        </div>

        {showPartnersSummary && (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-xs">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-4 py-2.5 text-left font-bold">Маркетинговый партнёр</th>
                  <th className="px-3 py-2.5 text-right font-bold">Договоров</th>
                  <th className="px-3 py-2.5 text-center font-bold">Ставки (0/2/3/4%)</th>
                  <th className="px-3 py-2.5 text-right font-bold">Сумма продаж, USD</th>
                  <th className="px-3 py-2.5 text-right font-bold">Получено, USD</th>
                  <th className="px-3 py-2.5 text-right font-bold">Расчётная, USD</th>
                  <th className="px-3 py-2.5 text-right font-bold">Утверждено, USD</th>
                  <th className="px-3 py-2.5 text-right font-bold">Выплачено, USD</th>
                  <th className="px-3 py-2.5 text-right font-bold">Остаток к выплате, USD</th>
                  <th className="px-3 py-2.5 text-right font-bold">К доутверждению, USD</th>
                  <th className="px-3 py-2.5 text-right font-bold">Переплата, USD</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {partnerSummary.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="px-4 py-4 text-center text-slate-400">Нет данных по партнёрам</td>
                  </tr>
                ) : (
                  partnerSummary.map((p) => (
                    <tr key={String(p.partnerId || p.partnerName)} className="hover:bg-slate-50/70">
                      <td className="px-4 py-2.5 font-bold text-slate-900">{p.partnerName}</td>
                      <td className="px-3 py-2.5 text-right font-semibold">{p.dealsCount}</td>
                      <td className="px-3 py-2.5 text-center text-slate-600">
                        {p.rateBreakdown['0']} / {p.rateBreakdown['2']} / {p.rateBreakdown['3']} / {p.rateBreakdown['4']}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums">${formatUsd(p.contractPriceUsd)}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums">${formatUsd(p.totalSettledUsd)}</td>
                      <td className="px-3 py-2.5 text-right font-bold text-sky-700 tabular-nums">${formatUsd(p.calculatedCommissionUsd)}</td>
                      <td className="px-3 py-2.5 text-right font-semibold text-indigo-700 tabular-nums">${formatUsd(p.approvedCommissionUsd)}</td>
                      <td className="px-3 py-2.5 text-right font-semibold text-emerald-700 tabular-nums">${formatUsd(p.paidCommissionUsd)}</td>
                      <td className="px-3 py-2.5 text-right font-bold text-violet-700 tabular-nums">${formatUsd(p.remainingCommissionUsd)}</td>
                      <td className="px-3 py-2.5 text-right font-semibold text-amber-700 tabular-nums">${formatUsd(p.additionalAccrualUsd)}</td>
                      <td className="px-3 py-2.5 text-right font-semibold text-rose-700 tabular-nums">${formatUsd(p.overpaidCommissionUsd)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-slate-500">
            <Filter className="h-3.5 w-3.5" />
            Фильтры реестра
          </div>
          <button type="button" onClick={resetFilters} className="text-xs font-bold text-blue-600 hover:underline">
            Сбросить фильтры
          </button>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
          <div className="xl:col-span-2">
            <label className="mb-1 block text-[11px] font-bold text-slate-500">Поиск</label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                value={filters.search}
                onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
                placeholder="Договор, покупатель, кв., партнёр..."
                className="w-full rounded-xl border border-slate-200 py-1.5 pl-8 pr-3 text-xs focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-[11px] font-bold text-slate-500">ЖК</label>
            <select
              value={filters.complex}
              onChange={(e) => setFilters((f) => ({ ...f, complex: e.target.value }))}
              className="w-full rounded-xl border border-slate-200 px-2.5 py-1.5 text-xs focus:border-blue-500 focus:outline-none"
            >
              <option value="ALL">Все ЖК</option>
              {filterOptions.complexes.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-[11px] font-bold text-slate-500">Блок</label>
            <select
              value={filters.block}
              onChange={(e) => setFilters((f) => ({ ...f, block: e.target.value }))}
              className="w-full rounded-xl border border-slate-200 px-2.5 py-1.5 text-xs focus:border-blue-500 focus:outline-none"
            >
              <option value="ALL">Все блоки</option>
              {filterOptions.blocks.map((b) => (
                <option key={b} value={b}>Блок {b}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-[11px] font-bold text-slate-500">Партнёр</label>
            <select
              value={filters.partnerId}
              onChange={(e) => setFilters((f) => ({ ...f, partnerId: e.target.value }))}
              className="w-full rounded-xl border border-slate-200 px-2.5 py-1.5 text-xs focus:border-blue-500 focus:outline-none"
            >
              <option value="ALL">Все партнёры</option>
              {filterOptions.partners.map((p) => (
                <option key={p.id} value={String(p.id)}>{p.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-[11px] font-bold text-slate-500">Ставка</label>
            <select
              value={filters.rate}
              onChange={(e) => setFilters((f) => ({ ...f, rate: e.target.value }))}
              className="w-full rounded-xl border border-slate-200 px-2.5 py-1.5 text-xs focus:border-blue-500 focus:outline-none"
            >
              <option value="ALL">Все ставки</option>
              <option value="0">0% (&lt; 5%)</option>
              <option value="2">2% (5–10%)</option>
              <option value="3">3% (10–15%)</option>
              <option value="4">4% (&gt; 15%)</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-[11px] font-bold text-slate-500">Статус</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
              className="w-full rounded-xl border border-slate-200 px-2.5 py-1.5 text-xs focus:border-blue-500 focus:outline-none"
            >
              <option value="ALL">Все статусы</option>
              <option value="NOT_CALCULATED">Не рассчитана</option>
              <option value="CALCULATED">Рассчитана</option>
              <option value="PENDING_APPROVAL">На утверждении</option>
              <option value="APPROVED">Утверждена</option>
              <option value="PARTIALLY_PAID">Частично выплачена</option>
              <option value="PAID">Выплачена</option>
              <option value="NEEDS_ADDITIONAL_APPROVAL">К доутверждению</option>
              <option value="OVERPAID">С переплатой</option>
              <option value="CANCELLED">Отменена</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-[11px] font-bold text-slate-500">Период (с / по)</label>
            <div className="flex gap-1">
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters((f) => ({ ...f, startDate: e.target.value }))}
                className="w-1/2 rounded-xl border border-slate-200 px-1.5 py-1.5 text-[11px] focus:border-blue-500 focus:outline-none"
              />
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters((f) => ({ ...f, endDate: e.target.value }))}
                className="w-1/2 rounded-xl border border-slate-200 px-1.5 py-1.5 text-[11px] focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main 16-column Table + Actions */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-xs">
            <thead className="bg-slate-900 text-white">
              <tr>
                <th className="px-3 py-3 text-left font-bold whitespace-nowrap">1. № договора</th>
                <th className="px-3 py-3 text-left font-bold whitespace-nowrap">2. Дата</th>
                <th className="px-3 py-3 text-left font-bold whitespace-nowrap">3. ЖК и блок</th>
                <th className="px-3 py-3 text-center font-bold whitespace-nowrap">4. Кв.</th>
                <th className="px-3 py-3 text-left font-bold whitespace-nowrap">5. Покупатель</th>
                <th className="px-3 py-3 text-left font-bold whitespace-nowrap">6. Партнёр</th>
                <th className="px-3 py-3 text-right font-bold whitespace-nowrap">7. Сумма дог., USD</th>
                <th className="px-3 py-3 text-right font-bold whitespace-nowrap">8. Получено, USD</th>
                <th className="px-3 py-3 text-right font-bold whitespace-nowrap">9. Оплата, %</th>
                <th className="px-3 py-3 text-center font-bold whitespace-nowrap">10. Ставка</th>
                <th className="px-3 py-3 text-right font-bold whitespace-nowrap">11. Расчётная, USD</th>
                <th className="px-3 py-3 text-right font-bold whitespace-nowrap">12. Утверждено, USD</th>
                <th className="px-3 py-3 text-right font-bold whitespace-nowrap">13. Выплачено, USD</th>
                <th className="px-3 py-3 text-right font-bold whitespace-nowrap">14. Остаток к выплате</th>
                <th className="px-3 py-3 text-right font-bold whitespace-nowrap">15. К доутверждению</th>
                <th className="px-3 py-3 text-left font-bold whitespace-nowrap">16. Статус</th>
                {(permissions.canApprove || permissions.canPayout || permissions.canPrepareRko || permissions.canCancel) && (
                  <th className="px-3 py-3 text-right font-bold whitespace-nowrap">Действия</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={17} className="px-4 py-10 text-center text-slate-500">
                    <Loader2 className="mx-auto mb-2 h-6 w-6 animate-spin text-blue-600" />
                    Загрузка реестра комиссий...
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={17} className="px-4 py-10 text-center text-slate-400">
                    Договоры MARKETER по выбранным фильтрам не найдены
                  </td>
                </tr>
              ) : (
                rows.map((r) => {
                  const badgeCls = STATUS_BADGE_MAP[r.commissionStatus] || STATUS_BADGE_MAP.NOT_CALCULATED;
                  const canShowApprove = permissions.canApprove
                    && r.commissionStatus !== 'CANCELLED'
                    && r.calculatedCommissionMinor > 0
                    && (['CALCULATED', 'PENDING_APPROVAL'].includes(r.commissionStatus) || r.additionalAccrualMinor > 0);
                  const canShowPayout = permissions.canPayout
                    && ['APPROVED', 'PARTIALLY_PAID'].includes(r.commissionStatus)
                    && r.remainingCommissionMinor > 0
                    && r.overpaidCommissionMinor <= 0;
                  const canShowPrepareRko = !permissions.canPayout
                    && permissions.canPrepareRko
                    && ['APPROVED', 'PARTIALLY_PAID'].includes(r.commissionStatus)
                    && r.remainingCommissionMinor > 0
                    && r.overpaidCommissionMinor <= 0;
                  const canShowCancel = permissions.canCancel
                    && r.commissionStatus !== 'CANCELLED'
                    && r.commissionStatus !== 'NOT_CALCULATED';

                  return (
                    <tr key={r.dealId} className="hover:bg-slate-50/80">
                      <td className="px-3 py-2.5 font-bold text-slate-900 whitespace-nowrap">{r.contractNumber}</td>
                      <td className="px-3 py-2.5 text-slate-600 whitespace-nowrap">{r.contractDate || '—'}</td>
                      <td className="px-3 py-2.5 text-slate-700 whitespace-nowrap">{r.complexAndBlock}</td>
                      <td className="px-3 py-2.5 text-center font-semibold text-slate-800">{r.unitNumber}</td>
                      <td className="px-3 py-2.5 text-slate-800 max-w-[180px] truncate" title={r.buyerName}>{r.buyerName}</td>
                      <td className="px-3 py-2.5 font-semibold text-slate-800 whitespace-nowrap">{r.marketingPartnerName}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums whitespace-nowrap">${formatUsd(r.contractPriceUsd)}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums whitespace-nowrap">${formatUsd(r.totalSettledUsd)}</td>
                      <td className="px-3 py-2.5 text-right font-semibold tabular-nums whitespace-nowrap">{formatPct(r.paymentPercent)}</td>
                      <td className="px-3 py-2.5 text-center whitespace-nowrap">
                        <span className="inline-flex rounded-lg bg-slate-100 px-2 py-0.5 font-bold text-slate-800">
                          {r.commissionRatePercent}%
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-right font-bold text-sky-700 tabular-nums whitespace-nowrap">${formatUsd(r.calculatedCommissionUsd)}</td>
                      <td className="px-3 py-2.5 text-right font-semibold text-indigo-700 tabular-nums whitespace-nowrap">${formatUsd(r.approvedCommissionUsd)}</td>
                      <td className="px-3 py-2.5 text-right font-semibold text-emerald-700 tabular-nums whitespace-nowrap">
                        <div>${formatUsd(r.paidCommissionUsd)}</div>
                        {r.rkoLinks?.length > 0 && (
                          <div className="text-[10px] font-normal text-slate-500">
                            {r.rkoLinks.map((l) => l.rkoReference).join(', ')}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-right font-bold text-violet-700 tabular-nums whitespace-nowrap">${formatUsd(r.remainingCommissionUsd)}</td>
                      <td className="px-3 py-2.5 text-right font-semibold text-amber-700 tabular-nums whitespace-nowrap">
                        {r.additionalAccrualUsd > 0 ? `$${formatUsd(r.additionalAccrualUsd)}` : '—'}
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-bold ${badgeCls}`}>
                          {r.commissionStatusLabel}
                        </span>
                        {r.overpaidCommissionUsd > 0 && (
                          <div className="mt-1 inline-flex items-center gap-1 rounded-md bg-rose-100 px-1.5 py-0.5 text-[10px] font-bold text-rose-800">
                            <ShieldAlert className="h-3 w-3" />
                            Переплата ${formatUsd(r.overpaidCommissionUsd)}
                          </div>
                        )}
                      </td>
                      {(permissions.canApprove || permissions.canPayout || permissions.canPrepareRko || permissions.canCancel) && (
                        <td className="px-3 py-2.5 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1">
                            {canShowApprove && (
                              <button
                                type="button"
                                onClick={() => openActionModal('APPROVE', r)}
                                className="rounded-lg bg-indigo-600 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-indigo-700"
                              >
                                {r.approvedCommissionMinor > 0 ? 'Доутвердить' : 'Утвердить'}
                              </button>
                            )}
                            {canShowPayout && (
                              <button
                                type="button"
                                onClick={() => openActionModal('PAYOUT', r)}
                                className="rounded-lg bg-emerald-600 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-emerald-700"
                              >
                                Выплатить
                              </button>
                            )}
                            {canShowPrepareRko && (
                              <Link
                                to={`/finance/expenses?category=${encodeURIComponent('Маркетинг и реклама')}&recipient=${encodeURIComponent(r.marketingPartnerName)}&amount=${encodeURIComponent(r.remainingCommissionUsd)}&description=${encodeURIComponent(`Комиссия маркетологу (${r.marketingPartnerName}) по договору ${r.contractNumber}`)}`}
                                className="inline-flex items-center gap-1 rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-800 hover:bg-amber-100"
                              >
                                Подготовить РКО
                              </Link>
                            )}
                            {canShowCancel && (
                              <button
                                type="button"
                                onClick={() => openActionModal('CANCEL', r)}
                                title="Отменить комиссию"
                                className="rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-[11px] font-bold text-rose-700 hover:bg-rose-100"
                              >
                                Отмена
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
            {rows.length > 0 && (
              <tfoot className="bg-slate-100 font-extrabold text-slate-900">
                <tr>
                  <td className="px-3 py-3" colSpan={6}>ИТОГО ({totals.dealsCount} дог.)</td>
                  <td className="px-3 py-3 text-right tabular-nums whitespace-nowrap">${formatUsd(totals.contractPriceUsd)}</td>
                  <td className="px-3 py-3 text-right tabular-nums whitespace-nowrap">${formatUsd(totals.totalSettledUsd)}</td>
                  <td className="px-3 py-3 text-right tabular-nums whitespace-nowrap">{formatPct(totals.avgPaymentPercent)}</td>
                  <td className="px-3 py-3 text-center">—</td>
                  <td className="px-3 py-3 text-right text-sky-800 tabular-nums whitespace-nowrap">${formatUsd(totals.calculatedCommissionUsd)}</td>
                  <td className="px-3 py-3 text-right text-indigo-800 tabular-nums whitespace-nowrap">${formatUsd(totals.approvedCommissionUsd)}</td>
                  <td className="px-3 py-3 text-right text-emerald-800 tabular-nums whitespace-nowrap">${formatUsd(totals.paidCommissionUsd)}</td>
                  <td className="px-3 py-3 text-right text-violet-800 tabular-nums whitespace-nowrap">${formatUsd(totals.remainingCommissionUsd)}</td>
                  <td className="px-3 py-3 text-right text-amber-800 tabular-nums whitespace-nowrap">${formatUsd(totals.additionalAccrualUsd)}</td>
                  <td className="px-3 py-3" colSpan={(permissions.canApprove || permissions.canPayout || permissions.canPrepareRko || permissions.canCancel) ? 2 : 1}>
                    {totals.overpaidCommissionUsd > 0 ? `Переплаты: $${formatUsd(totals.overpaidCommissionUsd)}` : ''}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Action Modal */}
      {modalState && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h3 className="text-lg font-extrabold text-slate-900">
                  {modalState.type === 'APPROVE' && (modalState.row.approvedCommissionMinor > 0 ? 'Доутверждение разницы комиссии' : 'Утверждение комиссии')}
                  {modalState.type === 'PAYOUT' && 'Регистрация выплаты комиссии'}
                  {modalState.type === 'CANCEL' && 'Отмена комиссии'}
                </h3>
                <p className="text-xs text-slate-500">
                  Договор {modalState.row.contractNumber} · {modalState.row.marketingPartnerName}
                </p>
              </div>
              <button type="button" onClick={closeModal} className="text-slate-400 hover:text-slate-600">
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitModal} className="space-y-4">
              {modalState.type === 'APPROVE' && (
                <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-3 text-xs text-indigo-950 space-y-1">
                  <div className="flex justify-between">
                    <span>Расчётная комиссия ({modalState.row.commissionRatePercent}%):</span>
                    <strong>${formatUsd(modalState.row.calculatedCommissionUsd)}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Ранее утверждено:</span>
                    <strong>${formatUsd(modalState.row.approvedCommissionUsd)}</strong>
                  </div>
                  <div className="flex justify-between border-t border-indigo-200 pt-1 text-sm font-extrabold">
                    <span>К утверждению (разница):</span>
                    <span>${formatUsd(modalState.row.additionalAccrualUsd)}</span>
                  </div>
                </div>
              )}

              {modalState.type === 'PAYOUT' && (
                <>
                  <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-3 text-xs text-emerald-950 space-y-1">
                    <div className="flex justify-between">
                      <span>Утверждено всего:</span>
                      <strong>${formatUsd(modalState.row.approvedCommissionUsd)}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Уже выплачено:</span>
                      <strong>${formatUsd(modalState.row.paidCommissionUsd)}</strong>
                    </div>
                    <div className="flex justify-between border-t border-emerald-200 pt-1 text-sm font-extrabold">
                      <span>Доступно к выплате:</span>
                      <span>${formatUsd(modalState.row.remainingCommissionUsd)}</span>
                    </div>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-bold text-slate-700">Сумма выплаты, USD *</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      max={modalState.row.remainingCommissionUsd}
                      required
                      value={payoutAmount}
                      onChange={(e) => setPayoutAmount(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  {/* Safe RKO Linkage without automatic cash deduction */}
                  <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3 space-y-2">
                    <div className="flex items-start gap-2 text-xs text-amber-900">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                      <div>
                        <strong>Связь с РКО и кассовым учётом:</strong> автоматическое списание из кассы отключено. Привяжите проведённый РКО или оформите его в разделе расходов с предзаполненными реквизитами.
                      </div>
                    </div>

                    <div>
                      <label className="mb-1 block text-[11px] font-bold text-slate-700">
                        Привязать существующий РКО (необязательно)
                      </label>
                      {rkoLoading ? (
                        <div className="text-xs text-slate-500">Загрузка списка РКО...</div>
                      ) : (
                        <select
                          value={selectedRkoId}
                          onChange={(e) => setSelectedRkoId(e.target.value)}
                          className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs"
                        >
                          <option value="">— Без привязки к РКО (указать позже) —</option>
                          {rkoCandidates.map((rko) => (
                            <option key={rko.id} value={String(rko.id)}>
                              {rko.reference} · {rko.expenseDate} · {rko.recipient} · {formatUsd(rko.amountUsd)} {rko.currency}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>

                    <Link
                      to={`/finance/expenses?category=${encodeURIComponent('Маркетинг и реклама')}&recipient=${encodeURIComponent(modalState.row.marketingPartnerName)}&amount=${encodeURIComponent(payoutAmount || modalState.row.remainingCommissionUsd)}&description=${encodeURIComponent(`Комиссия маркетологу (${modalState.row.marketingPartnerName}) по договору ${modalState.row.contractNumber}`)}`}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-700 hover:underline"
                    >
                      <Wallet className="h-3.5 w-3.5" />
                      Оформить РКО в кассе (предзаполнено)
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                  </div>
                </>
              )}

              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">
                  Причина / комментарий {modalState.type === 'CANCEL' ? '*' : ''}
                </label>
                <textarea
                  rows={2}
                  required={modalState.type === 'CANCEL'}
                  value={notesInput}
                  onChange={(e) => setNotesInput(e.target.value)}
                  placeholder="Укажите основание для журнала аудита..."
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-blue-500 focus:outline-none"
                />
              </div>

              {actionError && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">
                  {actionError}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={submitting}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold text-white disabled:opacity-50 ${
                    modalState.type === 'CANCEL'
                      ? 'bg-rose-600 hover:bg-rose-700'
                      : modalState.type === 'PAYOUT'
                        ? 'bg-emerald-600 hover:bg-emerald-700'
                        : 'bg-indigo-600 hover:bg-indigo-700'
                  }`}
                >
                  {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                  Подтвердить
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

