import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { api } from '../../api/client';
import { AnalyticsTabs } from '../../components/AnalyticsTabs';
import { DealDrawer } from '../deals/DealDrawer';
import { ContractPrintView } from '../deals/ContractPrintView';
import { useAuth } from '../auth/AuthContext';
import { hasReadPermission } from '../../utils/permissions';
import { formatContractNumber } from '../../utils/formatters';
import {
  Home,
  Calendar,
  Building2,
  Layers,
  RefreshCw,
  Download,
  Printer,
  ChevronRight,
  ChevronDown,
  FileCheck,
  CheckCircle2,
  Maximize2,
  Calculator,
  DollarSign,
  Wallet,
  AlertTriangle,
  Info,
  Eye,
  X,
  AlertCircle
} from 'lucide-react';

const COMPLEX_OPTIONS = [
  { value: 'ALL', label: 'Все жилые комплексы' },
  { value: 'TOZON PLAZA', label: 'TOZON PLAZA' },
  { value: 'TOZON PLAZA-2', label: 'TOZON PLAZA-2' }
];

const BLOCKS_BY_COMPLEX = {
  ALL: ['А', 'Б', 'В', 'Г'],
  'TOZON PLAZA': ['А', 'Б'],
  'TOZON PLAZA-2': ['В', 'Г']
};

export function getDefaultReportDates(now = new Date()) {
  let todayIso;
  try {
    todayIso = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Dushanbe',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(now);
  } catch {
    todayIso = now.toISOString().slice(0, 10);
  }
  const startOfMonthIso = `${todayIso.slice(0, 8)}01`;
  return {
    startDate: startOfMonthIso,
    endDate: todayIso
  };
}

export function formatArea(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return '0,00';
  return num.toLocaleString('ru-RU', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

export function formatMoneyUsd(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return '0,00';
  return num.toLocaleString('ru-RU', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

export function formatPercent(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return '0,00%';
  return `${num.toLocaleString('ru-RU', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}%`;
}

export function formatDateRu(isoDate) {
  if (!isoDate || !/^\d{4}-\d{2}-\d{2}$/.test(String(isoDate))) {
    return String(isoDate || '—');
  }
  const [y, m, d] = String(isoDate).split('-');
  return `${d}.${m}.${y}`;
}

export const ApartmentSalesReportPage = () => {
  const { user } = useAuth();
  const canOpenContractCard = useMemo(
    () =>
      hasReadPermission(user, 'deals.view') ||
      hasReadPermission(user, 'contracts.view') ||
      hasReadPermission(user, 'finance.view'),
    [user]
  );

  const defaultDates = useMemo(() => getDefaultReportDates(), []);
  const [startDate, setStartDate] = useState(defaultDates.startDate);
  const [endDate, setEndDate] = useState(defaultDates.endDate);
  const [complex, setComplex] = useState('ALL');
  const [block, setBlock] = useState('ALL');

  const [report, setReport] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState('');

  // Drilldown state: null (closed), 'ALL' (all blocks in period), or block.key (e.g. 'TOZON PLAZA::А')
  const [selectedBlockKey, setSelectedBlockKey] = useState(null);

  // Deal Drawer & Contract Print modals
  const [selectedDealIdForDrawer, setSelectedDealIdForDrawer] = useState(null);
  const [contractToPrint, setContractToPrint] = useState(null);

  const availableBlocks = useMemo(
    () => BLOCKS_BY_COMPLEX[complex] || BLOCKS_BY_COMPLEX.ALL,
    [complex]
  );

  const handleComplexChange = (nextComplex) => {
    setComplex(nextComplex);
    const allowed = BLOCKS_BY_COMPLEX[nextComplex] || BLOCKS_BY_COMPLEX.ALL;
    if (block !== 'ALL' && !allowed.includes(block)) {
      setBlock('ALL');
    }
  };

  const fetchReport = useCallback(
    async (overrideParams = {}) => {
      const targetStart = overrideParams.startDate ?? startDate;
      const targetEnd = overrideParams.endDate ?? endDate;
      const targetComplex = overrideParams.complex ?? complex;
      const targetBlock = overrideParams.block ?? block;

      if (!targetStart || !targetEnd) {
        setError('Укажите дату начала и дату окончания периода');
        return;
      }
      if (targetStart > targetEnd) {
        setError('Дата начала периода не может быть позже даты окончания периода');
        return;
      }

      try {
        setIsLoading(true);
        setError('');
        const res = await api.get('/reports/apartment-sales', {
          params: {
            startDate: targetStart,
            endDate: targetEnd,
            complex: targetComplex,
            block: targetBlock
          }
        });
        const payload = res.data || res;
        setReport(payload);

        setSelectedBlockKey((prevKey) => {
          if (!prevKey || prevKey === 'ALL') return prevKey;
          const stillExists = (payload?.blocks || []).some((b) => b.key === prevKey);
          return stillExists ? prevKey : null;
        });
      } catch (err) {
        console.error('Error loading apartment sales report:', err);
        setError(err.message || 'Не удалось загрузить отчёт о продажах квартир');
      } finally {
        setIsLoading(false);
      }
    },
    [startDate, endDate, complex, block]
  );

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const handleExportExcel = async () => {
    if (startDate > endDate) {
      setError('Дата начала периода не может быть позже даты окончания периода');
      return;
    }
    try {
      setIsExporting(true);
      setError('');
      const response = await api.get('/reports/apartment-sales/export.xlsx', {
        params: {
          startDate,
          endDate,
          complex,
          block
        },
        responseType: 'blob'
      });

      const blobData = response.data !== undefined ? response.data : response;
      const blob = new Blob([blobData], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `otchet-prodazhi-kvartir-${startDate}-${endDate}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error exporting apartment sales report:', err);
      setError(err.message || 'Ошибка при экспорте отчёта в Excel');
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const summary = report?.summary || {
    totalAvailableStartCount: 0,
    totalSoldCount: 0,
    totalAvailableEndCount: 0,
    totalAreaM2: 0,
    averageAreaM2: 0,
    totalSalesAmountUsd: 0,
    totalPaidCashUsd: 0,
    totalPaidBarterUsd: 0,
    totalSettledUsd: 0,
    totalRemainingDebtUsd: 0,
    totalOverpaidUsd: 0,
    totalPaidPercent: 0,
    totalDebtPercent: 0
  };
  const blocks = report?.blocks || [];
  const totals = report?.totals || {
    availableStartCount: 0,
    soldCount: 0,
    availableEndCount: 0,
    soldAreaM2: 0,
    salesAmountUsd: 0,
    paidCashUsd: 0,
    paidBarterUsd: 0,
    totalSettledUsd: 0,
    remainingDebtUsd: 0,
    overpaidUsd: 0,
    paidPercent: 0,
    debtPercent: 0
  };

  const selectedDrilldown = useMemo(() => {
    if (!selectedBlockKey || !report) return null;
    if (selectedBlockKey === 'ALL') {
      return {
        title: 'Все выбранные блоки (ИТОГО)',
        subtitle: `Полный список проданных квартир за период ${formatDateRu(startDate)} — ${formatDateRu(endDate)}`,
        soldCount: totals.soldCount ?? 0,
        soldAreaM2: totals.soldAreaM2 ?? 0,
        salesAmountUsd: totals.salesAmountUsd ?? 0,
        paidCashUsd: totals.paidCashUsd ?? 0,
        paidBarterUsd: totals.paidBarterUsd ?? 0,
        totalSettledUsd: totals.totalSettledUsd ?? 0,
        remainingDebtUsd: totals.remainingDebtUsd ?? 0,
        paidPercent: totals.paidPercent ?? 0,
        debtPercent: totals.debtPercent ?? 0,
        apartments: report.apartments || []
      };
    }
    const found = blocks.find((b) => b.key === selectedBlockKey);
    if (!found) return null;
    return {
      title: `${found.projectName} — Блок ${found.blockCode}`,
      subtitle: `Детализация проданных квартир за период ${formatDateRu(startDate)} — ${formatDateRu(endDate)}`,
      soldCount: found.soldCount ?? 0,
      soldAreaM2: found.soldAreaM2 ?? 0,
      salesAmountUsd: found.salesAmountUsd ?? 0,
      paidCashUsd: found.paidCashUsd ?? 0,
      paidBarterUsd: found.paidBarterUsd ?? 0,
      totalSettledUsd: found.totalSettledUsd ?? 0,
      remainingDebtUsd: found.remainingDebtUsd ?? 0,
      paidPercent: found.paidPercent ?? 0,
      debtPercent: found.debtPercent ?? 0,
      apartments: found.apartments || []
    };
  }, [selectedBlockKey, report, blocks, totals, startDate, endDate]);

  const complexFilterLabel = complex === 'ALL' ? 'Все комплексы' : complex;
  const blockFilterLabel = block === 'ALL' ? 'Все блоки' : `Блок ${block}`;

  return (
    <div className="max-w-7xl mx-auto pb-12">
      {/* A4 Landscape Print Styles */}
      <style>{`
        @media print {
          @page {
            size: A4 landscape;
            margin: 10mm;
          }
          body {
            background: #ffffff !important;
            color: #0f172a !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .no-print {
            display: none !important;
          }
          .print-only {
            display: block !important;
          }
          .print-card {
            box-shadow: none !important;
            border: 1px solid #cbd5e1 !important;
            break-inside: avoid;
          }
          .print-table {
            width: 100% !important;
            border-collapse: collapse !important;
          }
          .print-table th,
          .print-table td {
            border: 1px solid #cbd5e1 !important;
            padding: 4px 6px !important;
            font-size: 8.5pt !important;
            position: static !important;
          }
        }
      `}</style>

      {/* Main Report Area (hidden if ContractPrintView modal is active) */}
      <div className={contractToPrint ? 'print:hidden space-y-6' : 'space-y-6'}>
        <div className="no-print">
          <AnalyticsTabs />
        </div>

        {/* Screen Header */}
        <div className="no-print flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
              <Home className="h-7 w-7 text-blue-600" />
              <span>Отчёт о продажах квартир</span>
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-slate-500">
              Динамика свободного фонда, объём продаж, фактические оплаты и задолженность покупателей по ЖК и блокам (часовой пояс Asia/Dushanbe)
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => fetchReport()}
              disabled={isLoading}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-blue-700 disabled:opacity-60 transition cursor-pointer"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Сформировать отчёт</span>
            </button>

            <button
              type="button"
              onClick={handleExportExcel}
              disabled={isExporting || isLoading}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 disabled:opacity-60 transition cursor-pointer"
            >
              <Download className="h-4 w-4" />
              <span>{isExporting ? 'Формирование...' : 'Экспорт в Excel'}</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              disabled={isLoading}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 disabled:opacity-60 transition cursor-pointer"
            >
              <Printer className="h-4 w-4 text-slate-600" />
              <span>Печать</span>
            </button>
          </div>
        </div>

        {/* Print-only A4 Header */}
        <div className="hidden print-only border-b-2 border-slate-800 pb-3 mb-3">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-lg font-extrabold text-slate-900 uppercase tracking-wide">
                Отчёт о продажах квартир
              </h1>
              <p className="text-xs text-slate-600 mt-0.5">
                Период отчёта: <strong>{formatDateRu(startDate)} — {formatDateRu(endDate)}</strong> | Оплаты зачтены на дату: <strong>{formatDateRu(endDate)}</strong>
              </p>
              <p className="text-xs text-slate-600">
                Фильтры: ЖК — <strong>{complexFilterLabel}</strong>, Блок — <strong>{blockFilterLabel}</strong>
              </p>
            </div>
            <div className="text-right text-xs text-slate-600">
              <div className="font-bold text-slate-800">TOZON CRM</div>
              <div>
                Дата формирования: <strong>{report?.generatedAtLabel || formatDateRu(endDate)}</strong>
              </div>
              <div>Часовой пояс: Asia/Dushanbe</div>
            </div>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="no-print rounded-2xl bg-white p-4 sm:p-5 border border-slate-200 shadow-2xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Start Date */}
            <div>
              <label
                htmlFor="apartment-sales-start-date"
                className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5"
              >
                Дата начала периода
              </label>
              <div className="relative">
                <Calendar className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  id="apartment-sales-start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 py-2 text-xs font-semibold text-slate-900 outline-none focus:border-blue-500 focus:bg-white transition"
                />
              </div>
            </div>

            {/* End Date */}
            <div>
              <label
                htmlFor="apartment-sales-end-date"
                className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5"
              >
                Дата окончания периода
              </label>
              <div className="relative">
                <Calendar className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  id="apartment-sales-end-date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 py-2 text-xs font-semibold text-slate-900 outline-none focus:border-blue-500 focus:bg-white transition"
                />
              </div>
            </div>

            {/* Residential Complex Filter */}
            <div>
              <label
                htmlFor="apartment-sales-complex-filter"
                className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5"
              >
                Жилой комплекс
              </label>
              <div className="relative">
                <Building2 className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <select
                  id="apartment-sales-complex-filter"
                  value={complex}
                  onChange={(e) => handleComplexChange(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 py-2 text-xs font-semibold text-slate-900 outline-none focus:border-blue-500 focus:bg-white transition cursor-pointer"
                >
                  {COMPLEX_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Block Filter */}
            <div>
              <label
                htmlFor="apartment-sales-block-filter"
                className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5"
              >
                Блок
              </label>
              <div className="relative">
                <Layers className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <select
                  id="apartment-sales-block-filter"
                  value={block}
                  onChange={(e) => setBlock(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 py-2 text-xs font-semibold text-slate-900 outline-none focus:border-blue-500 focus:bg-white transition cursor-pointer"
                >
                  <option value="ALL">Все блоки</option>
                  {availableBlocks.map((bCode) => (
                    <option key={bCode} value={bCode}>
                      Блок {bCode}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div
            role="alert"
            className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-700 flex items-center gap-2.5"
          >
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {/* Summary KPI Cards (2 rows of 3 cards) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="print-card rounded-2xl bg-white p-5 border border-slate-200 shadow-2xs flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-500">
                Всего продано квартир, шт.
              </span>
              <div
                data-testid="kpi-total-sold-count"
                className="mt-2 text-3xl font-extrabold text-slate-900 tracking-tight"
              >
                {(summary.totalSoldCount ?? 0).toLocaleString('ru-RU')}
              </div>
              <span className="mt-1 inline-block text-[11px] text-slate-500">
                Свободно: <strong>{summary.totalAvailableStartCount ?? 0}</strong> на начало →{' '}
                <strong>{summary.totalAvailableEndCount ?? 0}</strong> на конец
              </span>
            </div>
            <div className="no-print h-12 w-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0">
              <Home className="h-6 w-6" />
            </div>
          </div>

          <div className="print-card rounded-2xl bg-white p-5 border border-slate-200 shadow-2xs flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-500">
                Общая площадь проданных квартир, м²
              </span>
              <div
                data-testid="kpi-total-area-m2"
                className="mt-2 text-3xl font-extrabold text-emerald-700 tracking-tight"
              >
                {formatArea(summary.totalAreaM2)}
              </div>
              <span className="mt-1 inline-block text-[11px] text-slate-400">
                Суммарная площадь реализованных квартир
              </span>
            </div>
            <div className="no-print h-12 w-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
              <Maximize2 className="h-6 w-6" />
            </div>
          </div>

          <div className="print-card rounded-2xl bg-white p-5 border border-slate-200 shadow-2xs flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-500">
                Средняя площадь одной проданной квартиры, м²
              </span>
              <div
                data-testid="kpi-average-area-m2"
                className="mt-2 text-3xl font-extrabold text-indigo-700 tracking-tight"
              >
                {formatArea(summary.averageAreaM2)}
              </div>
              <span className="mt-1 inline-block text-[11px] text-slate-400">
                Отношение проданной площади к числу квартир
              </span>
            </div>
            <div className="no-print h-12 w-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
              <Calculator className="h-6 w-6" />
            </div>
          </div>

          <div className="print-card rounded-2xl bg-white p-5 border border-slate-200 shadow-2xs flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-500">
                Сумма продаж за период, USD
              </span>
              <div
                data-testid="kpi-total-sales-usd"
                className="mt-2 text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight"
              >
                ${formatMoneyUsd(summary.totalSalesAmountUsd)}
              </div>
              <span className="mt-1 inline-block text-[11px] text-slate-400">
                Итоговая договорная стоимость с учётом скидок
              </span>
            </div>
            <div className="no-print h-12 w-12 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 shrink-0">
              <DollarSign className="h-6 w-6" />
            </div>
          </div>

          <div className="print-card rounded-2xl bg-white p-5 border border-slate-200 shadow-2xs flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500">
                  Получено (на конец периода), USD
                </span>
                <span className="rounded-md bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 text-[10px] font-extrabold text-emerald-700">
                  {formatPercent(summary.totalPaidPercent)}
                </span>
              </div>
              <div
                data-testid="kpi-total-settled-usd"
                className="mt-2 text-2xl sm:text-3xl font-extrabold text-emerald-700 tracking-tight"
              >
                ${formatMoneyUsd(summary.totalSettledUsd)}
              </div>
              <span className="mt-1 inline-block text-[11px] text-slate-500">
                Деньгами: <strong>${formatMoneyUsd(summary.totalPaidCashUsd)}</strong> | Бартер:{' '}
                <strong>${formatMoneyUsd(summary.totalPaidBarterUsd)}</strong>
              </span>
            </div>
            <div className="no-print h-12 w-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
              <Wallet className="h-6 w-6" />
            </div>
          </div>

          <div className="print-card rounded-2xl bg-white p-5 border border-slate-200 shadow-2xs flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500">
                  Остаток долга (на конец периода), USD
                </span>
                <span className="rounded-md bg-amber-50 border border-amber-200 px-1.5 py-0.5 text-[10px] font-extrabold text-amber-800">
                  {formatPercent(summary.totalDebtPercent)}
                </span>
              </div>
              <div
                data-testid="kpi-total-debt-usd"
                className="mt-2 text-2xl sm:text-3xl font-extrabold text-amber-700 tracking-tight"
              >
                ${formatMoneyUsd(summary.totalRemainingDebtUsd)}
              </div>
              <span className="mt-1 inline-block text-[11px] text-slate-400">
                Непогашенный остаток по договорам периода на {formatDateRu(endDate)}
              </span>
            </div>
            <div className="no-print h-12 w-12 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 shrink-0">
              <AlertTriangle className="h-6 w-6" />
            </div>
          </div>
        </div>

        {/* Main Table by Blocks */}
        <div className="print-card rounded-2xl bg-white border border-slate-200 shadow-2xs overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h2 className="text-base font-extrabold text-slate-900">
                Продажи квартир по жилым комплексам и блокам
              </h2>
              <p className="no-print text-xs text-slate-500 mt-0.5">
                Нажмите на строку блока, чтобы открыть подробный список проданных квартир с расшифровкой оплат (деньгами и бартером)
              </p>
            </div>
            <div className="text-xs font-semibold text-slate-500">
              Период: <strong className="text-slate-800">{formatDateRu(startDate)} — {formatDateRu(endDate)}</strong>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="print-table w-full min-w-[1100px] text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="sticky left-0 z-20 bg-slate-50 py-3.5 px-4 min-w-[170px] border-r border-slate-200/70">
                    Жилой комплекс
                  </th>
                  <th className="sticky left-[170px] z-20 bg-slate-50 py-3.5 px-3 text-center min-w-[72px] border-r border-slate-200">
                    Блок
                  </th>
                  <th
                    title="Количество квартир, доступных для продажи на начало выбранного периода (без проданных, активных броней и заблокированных квартир)"
                    className="py-3.5 px-3.5 text-right cursor-help"
                  >
                    Свободно на начало периода, шт.
                  </th>
                  <th
                    title="Количество квартир с действующими договорами (SIGNED), заключёнными в выбранном периоде"
                    className="py-3.5 px-3.5 text-right cursor-help"
                  >
                    Продано за период, шт.
                  </th>
                  <th
                    title="Количество квартир, доступных для продажи на конец выбранного периода"
                    className="py-3.5 px-3.5 text-right cursor-help"
                  >
                    Осталось свободных на конец периода, шт.
                  </th>
                  <th
                    title="Общая площадь квартир, проданных за выбранный период"
                    className="py-3.5 px-3.5 text-right cursor-help"
                  >
                    Проданная площадь, м²
                  </th>
                  <th
                    title="Общая договорная стоимость квартир, проданных за выбранный период (с учётом согласованной скидки)"
                    className="py-3.5 px-3.5 text-right cursor-help"
                  >
                    Сумма продаж, USD
                  </th>
                  <th
                    title="Сумма фактически зачтённых оплат (денежные поступления + подтверждённый бартер) по договорам периода на дату окончания периода"
                    className="py-3.5 px-3.5 text-right cursor-help"
                  >
                    Получено, USD
                  </th>
                  <th
                    title="Отношение полученных оплат к сумме продаж (Получено / Сумма продаж × 100)"
                    className="py-3.5 px-3 text-right cursor-help"
                  >
                    Оплачено, %
                  </th>
                  <th
                    title="Непогашенный остаток задолженности по договорам периода по состоянию на конец выбранного периода"
                    className="py-3.5 px-3.5 text-right cursor-help"
                  >
                    Остаток долга, USD
                  </th>
                  <th
                    title="Отношение остатка долга к сумме продаж (Остаток долга / Сумма продаж × 100)"
                    className="py-3.5 px-3.5 text-right cursor-help"
                  >
                    Долг, %
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-xs sm:text-sm">
                {blocks.map((row) => {
                  const isSelected = selectedBlockKey === row.key;
                  const stickyBg = isSelected
                    ? 'bg-blue-50 group-hover:bg-blue-50'
                    : 'bg-white group-hover:bg-slate-50';
                  return (
                    <tr
                      key={row.key}
                      data-testid={`block-row-${row.blockCode}`}
                      onClick={() =>
                        setSelectedBlockKey((prev) => (prev === row.key ? null : row.key))
                      }
                      className={`group transition cursor-pointer ${
                        isSelected
                          ? 'bg-blue-50/80 hover:bg-blue-50'
                          : 'hover:bg-slate-50'
                      }`}
                    >
                      <td
                        className={`sticky left-0 z-10 py-3.5 px-4 font-bold text-slate-900 border-r border-slate-200/70 transition ${stickyBg}`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="no-print text-slate-400">
                            {isSelected ? (
                              <ChevronDown className="h-4 w-4 text-blue-600" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </span>
                          <span>{row.projectName}</span>
                        </div>
                      </td>
                      <td
                        className={`sticky left-[170px] z-10 py-3.5 px-3 text-center border-r border-slate-200 transition ${stickyBg}`}
                      >
                        <span className="inline-flex items-center justify-center min-w-[2rem] rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-extrabold text-slate-800">
                          {row.blockCode}
                        </span>
                      </td>
                      <td
                        title={`Всего квартир в блоке: ${row.totalApartments ?? 0} шт. (продаваемый фонд: ${row.sellableApartments ?? 0}, заблокировано: ${row.blockedCount ?? 0}, в брони на начало: ${row.reservedStartCount ?? 0})`}
                        className="py-3.5 px-3.5 text-right font-semibold text-slate-700 whitespace-nowrap"
                      >
                        {(row.availableStartCount ?? 0).toLocaleString('ru-RU')}
                      </td>
                      <td className="py-3.5 px-3.5 text-right font-extrabold text-slate-900 whitespace-nowrap">
                        {(row.soldCount ?? 0).toLocaleString('ru-RU')}
                      </td>
                      <td
                        title={`На конец периода — свободно: ${row.availableEndCount ?? 0} шт., в активной брони: ${row.reservedEndCount ?? 0} шт., заблокировано: ${row.blockedCount ?? 0} шт.`}
                        className="py-3.5 px-3.5 text-right font-semibold text-slate-700 whitespace-nowrap"
                      >
                        {(row.availableEndCount ?? 0).toLocaleString('ru-RU')}
                        {(row.reservedEndCount ?? 0) > 0 && (
                          <div className="no-print text-[10px] font-medium text-slate-400">
                            в брони: {row.reservedEndCount}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-3.5 text-right font-bold text-slate-900 whitespace-nowrap">
                        {formatArea(row.soldAreaM2)}
                      </td>
                      <td className="py-3.5 px-3.5 text-right font-bold text-slate-900 whitespace-nowrap">
                        {formatMoneyUsd(row.salesAmountUsd)}
                      </td>
                      <td
                        title={`Денежными средствами: $${formatMoneyUsd(row.paidCashUsd)} | Бартером: $${formatMoneyUsd(row.paidBarterUsd)}`}
                        className="py-3.5 px-3.5 text-right font-bold text-emerald-700 whitespace-nowrap"
                      >
                        <div>{formatMoneyUsd(row.totalSettledUsd)}</div>
                        {Number(row.paidBarterUsd) > 0 && (
                          <div className="no-print text-[10px] font-medium text-slate-500">
                            бартер: {formatMoneyUsd(row.paidBarterUsd)}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-3 text-right font-semibold text-emerald-700 whitespace-nowrap">
                        {formatPercent(row.paidPercent)}
                      </td>
                      <td className="py-3.5 px-3.5 text-right font-bold text-amber-800 whitespace-nowrap">
                        {formatMoneyUsd(row.remainingDebtUsd)}
                      </td>
                      <td className="py-3.5 px-3.5 text-right font-semibold text-amber-800 whitespace-nowrap">
                        {formatPercent(row.debtPercent)}
                      </td>
                    </tr>
                  );
                })}

                {blocks.length === 0 && !isLoading && (
                  <tr>
                    <td colSpan={11} className="py-8 text-center text-xs text-slate-500">
                      Нет блоков, соответствующих выбранным фильтрам
                    </td>
                  </tr>
                )}
              </tbody>
              <tfoot>
                <tr
                  data-testid="block-row-total"
                  onClick={() =>
                    setSelectedBlockKey((prev) => (prev === 'ALL' ? null : 'ALL'))
                  }
                  className="bg-slate-100 border-t-2 border-slate-300 font-extrabold text-slate-900 cursor-pointer hover:bg-slate-200/80 transition text-xs sm:text-sm"
                >
                  <td className="sticky left-0 z-10 bg-slate-100 py-3.5 px-4 border-r border-slate-300/70">
                    <div className="flex items-center gap-2">
                      <span>ИТОГО</span>
                      <span className="no-print text-[11px] font-semibold text-blue-600">
                        (все квартиры)
                      </span>
                    </div>
                  </td>
                  <td className="sticky left-[170px] z-10 bg-slate-100 py-3.5 px-3 text-center text-xs text-slate-500 border-r border-slate-300">
                    —
                  </td>
                  <td
                    data-testid="table-total-available-start"
                    className="py-3.5 px-3.5 text-right whitespace-nowrap"
                  >
                    {(totals.availableStartCount ?? 0).toLocaleString('ru-RU')}
                  </td>
                  <td
                    data-testid="table-total-sold-count"
                    className="py-3.5 px-3.5 text-right whitespace-nowrap"
                  >
                    {(totals.soldCount ?? 0).toLocaleString('ru-RU')}
                  </td>
                  <td
                    data-testid="table-total-available-end"
                    className="py-3.5 px-3.5 text-right whitespace-nowrap"
                  >
                    {(totals.availableEndCount ?? 0).toLocaleString('ru-RU')}
                  </td>
                  <td
                    data-testid="table-total-sold-area"
                    className="py-3.5 px-3.5 text-right whitespace-nowrap"
                  >
                    {formatArea(totals.soldAreaM2)}
                  </td>
                  <td
                    data-testid="table-total-sales-usd"
                    className="py-3.5 px-3.5 text-right whitespace-nowrap"
                  >
                    {formatMoneyUsd(totals.salesAmountUsd)}
                  </td>
                  <td
                    data-testid="table-total-settled-usd"
                    className="py-3.5 px-3.5 text-right text-emerald-800 whitespace-nowrap"
                  >
                    {formatMoneyUsd(totals.totalSettledUsd)}
                  </td>
                  <td
                    data-testid="table-total-paid-percent"
                    className="py-3.5 px-3 text-right text-emerald-800 whitespace-nowrap"
                  >
                    {formatPercent(totals.paidPercent)}
                  </td>
                  <td
                    data-testid="table-total-debt-usd"
                    className="py-3.5 px-3.5 text-right text-amber-900 whitespace-nowrap"
                  >
                    {formatMoneyUsd(totals.remainingDebtUsd)}
                  </td>
                  <td
                    data-testid="table-total-debt-percent"
                    className="py-3.5 px-3.5 text-right text-amber-900 whitespace-nowrap"
                  >
                    {formatPercent(totals.debtPercent)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Methodology & Historical Inventory Note */}
          <div className="no-print px-5 py-3 bg-slate-50 border-t border-slate-200 text-[11px] text-slate-500 flex items-start gap-2">
            <Info className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
            <div>
              <strong>Методика расчёта:</strong> Сумма продаж, оплаты (деньгами и бартером) и остаток долга рассчитываются по договорам квартир, проданных в выбранном периоде (<strong>{formatDateRu(startDate)} — {formatDateRu(endDate)}</strong>), по состоянию на конец периода (<strong>{formatDateRu(endDate)}</strong>). Платежи с датой позже {formatDateRu(endDate)} в срез периода не включаются. Свободный остаток квартир учитывает продаваемый фонд блока (без заблокированных застройщиком квартир <code>BLOCKED</code>), действующие договоры (<code>SIGNED</code>), активные брони (<code>RESERVED</code>) и исторические расторжения (<code>CANCELLED</code>).
            </div>
          </div>
        </div>

        {/* Drilldown Section (Section 6) */}
        {selectedDrilldown && (
          <div
            data-testid="drilldown-section"
            className="print-card rounded-2xl bg-white border border-blue-200 shadow-xs overflow-hidden"
          >
            <div className="px-5 py-4 bg-blue-50/60 border-b border-blue-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <FileCheck className="h-5 w-5 text-blue-600" />
                  <h3 className="text-base font-extrabold text-slate-900">
                    Детализация: {selectedDrilldown.title}
                  </h3>
                </div>
                <p className="text-xs text-slate-600 mt-0.5">
                  {selectedDrilldown.subtitle} — квартир:{' '}
                  <strong>{selectedDrilldown.soldCount} шт.</strong>, площадь:{' '}
                  <strong>{formatArea(selectedDrilldown.soldAreaM2)} м²</strong>, сумма продаж:{' '}
                  <strong>${formatMoneyUsd(selectedDrilldown.salesAmountUsd)}</strong>, погашено:{' '}
                  <strong>${formatMoneyUsd(selectedDrilldown.totalSettledUsd)}</strong> ({formatPercent(selectedDrilldown.paidPercent)}), долг:{' '}
                  <strong>${formatMoneyUsd(selectedDrilldown.remainingDebtUsd)}</strong> ({formatPercent(selectedDrilldown.debtPercent)})
                </p>
              </div>

              <div className="no-print flex items-center gap-2">
                {selectedBlockKey !== 'ALL' && (
                  <button
                    type="button"
                    onClick={() => setSelectedBlockKey('ALL')}
                    className="rounded-xl border border-blue-200 bg-white px-3 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-50 transition cursor-pointer"
                  >
                    Все блоки ({totals.soldCount})
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setSelectedBlockKey(null)}
                  className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                  <span>Закрыть</span>
                </button>
              </div>
            </div>

            {selectedDrilldown.apartments.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                За выбранный период в этом блоке нет заключённых договоров купли-продажи квартир.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="print-table w-full min-w-[1150px] text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      <th className="py-3 px-3.5">Дата и номер договора</th>
                      <th className="py-3 px-3 text-center">Блок / Кв.</th>
                      <th className="py-3 px-3 text-right">Площадь, м²</th>
                      <th className="py-3 px-3.5 text-right">Договорная стоимость, USD</th>
                      <th className="py-3 px-3.5 text-right">Получено деньгами, USD</th>
                      <th className="py-3 px-3.5 text-right">Зачтено бартером, USD</th>
                      <th className="py-3 px-3.5 text-right">Всего погашено, USD</th>
                      <th className="py-3 px-3.5 text-right">Остаток задолженности, USD</th>
                      <th className="py-3 px-3 text-right">Оплачено, %</th>
                      <th className="py-3 px-3 text-right">Долг, %</th>
                      {canOpenContractCard && (
                        <th className="no-print py-3 px-3.5 text-right">Договор</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-xs sm:text-sm">
                    {selectedDrilldown.apartments.map((apt) => (
                      <tr
                        key={`${apt.dealId}-${apt.unitId}`}
                        data-testid={`drilldown-row-${apt.unitNumber}`}
                        className="hover:bg-slate-50 transition"
                      >
                        <td className="py-3 px-3.5 whitespace-nowrap">
                          <div className="font-bold text-slate-900">
                            {formatContractNumber(apt.contractNumber) || apt.contractNumber}
                          </div>
                          <div className="text-[11px] font-semibold text-slate-500">
                            от {formatDateRu(apt.contractDate)} ({apt.projectName})
                          </div>
                        </td>
                        <td className="py-3 px-3 text-center whitespace-nowrap">
                          <span className="font-extrabold text-slate-900">
                            № {apt.unitNumber}
                          </span>
                          <div className="text-[11px] text-slate-500">
                            Блок {apt.blockCode}
                            {apt.floorNumber ? `, эт. ${apt.floorNumber}` : ''}
                          </div>
                        </td>
                        <td className="py-3 px-3 text-right font-bold text-slate-900 whitespace-nowrap">
                          {formatArea(apt.areaM2)}
                        </td>
                        <td className="py-3 px-3.5 text-right font-bold text-slate-900 whitespace-nowrap">
                          {formatMoneyUsd(apt.contractPriceUsd)}
                        </td>
                        <td className="py-3 px-3.5 text-right font-semibold text-emerald-700 whitespace-nowrap">
                          {formatMoneyUsd(apt.paidCashUsd)}
                        </td>
                        <td className="py-3 px-3.5 text-right font-semibold text-indigo-700 whitespace-nowrap">
                          {formatMoneyUsd(apt.paidBarterUsd)}
                        </td>
                        <td className="py-3 px-3.5 text-right font-bold text-emerald-800 whitespace-nowrap">
                          {formatMoneyUsd(apt.totalSettledUsd)}
                        </td>
                        <td className="py-3 px-3.5 text-right font-bold text-amber-800 whitespace-nowrap">
                          {formatMoneyUsd(apt.remainingDebtUsd)}
                        </td>
                        <td className="py-3 px-3 text-right font-semibold text-emerald-700 whitespace-nowrap">
                          {formatPercent(apt.paidPercent)}
                        </td>
                        <td className="py-3 px-3 text-right font-semibold text-amber-800 whitespace-nowrap">
                          {formatPercent(apt.debtPercent)}
                        </td>
                        {canOpenContractCard && (
                          <td className="no-print py-3 px-3.5 text-right whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => setSelectedDealIdForDrawer(apt.dealId)}
                              className="inline-flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-100 transition cursor-pointer"
                            >
                              <Eye className="h-3.5 w-3.5 text-blue-600" />
                              <span>Карточка</span>
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr
                      data-testid="drilldown-row-total"
                      className="bg-slate-100 border-t-2 border-slate-300 font-extrabold text-slate-900 text-xs sm:text-sm"
                    >
                      <td colSpan={2} className="py-3 px-3.5">
                        ИТОГО по списку ({selectedDrilldown.soldCount} шт.)
                      </td>
                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        {formatArea(selectedDrilldown.soldAreaM2)}
                      </td>
                      <td className="py-3 px-3.5 text-right whitespace-nowrap">
                        {formatMoneyUsd(selectedDrilldown.salesAmountUsd)}
                      </td>
                      <td className="py-3 px-3.5 text-right text-emerald-700 whitespace-nowrap">
                        {formatMoneyUsd(selectedDrilldown.paidCashUsd)}
                      </td>
                      <td className="py-3 px-3.5 text-right text-indigo-700 whitespace-nowrap">
                        {formatMoneyUsd(selectedDrilldown.paidBarterUsd)}
                      </td>
                      <td className="py-3 px-3.5 text-right text-emerald-800 whitespace-nowrap">
                        {formatMoneyUsd(selectedDrilldown.totalSettledUsd)}
                      </td>
                      <td className="py-3 px-3.5 text-right text-amber-900 whitespace-nowrap">
                        {formatMoneyUsd(selectedDrilldown.remainingDebtUsd)}
                      </td>
                      <td className="py-3 px-3 text-right text-emerald-800 whitespace-nowrap">
                        {formatPercent(selectedDrilldown.paidPercent)}
                      </td>
                      <td className="py-3 px-3 text-right text-amber-900 whitespace-nowrap">
                        {formatPercent(selectedDrilldown.debtPercent)}
                      </td>
                      {canOpenContractCard && <td className="no-print py-3 px-3.5" />}
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Contract Printable View Modal */}
      {contractToPrint && (
        <ContractPrintView
          deal={contractToPrint}
          onClose={() => setContractToPrint(null)}
        />
      )}

      {/* Deal / Contract Details Drawer */}
      <DealDrawer
        isOpen={Boolean(selectedDealIdForDrawer)}
        onClose={() => setSelectedDealIdForDrawer(null)}
        dealId={selectedDealIdForDrawer}
        onDealUpdated={() => fetchReport()}
        onOpenContractPrint={(deal) => setContractToPrint(deal)}
      />
    </div>
  );
};
