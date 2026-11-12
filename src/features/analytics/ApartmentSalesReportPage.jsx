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

        // Keep drilldown selection valid if already open
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

  // Automatically recalculate when filters change
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
    totalSoldCount: 0,
    totalAreaM2: 0,
    averageAreaM2: 0
  };
  const blocks = report?.blocks || [];
  const totals = report?.totals || {
    soldCount: 0,
    soldAreaM2: 0
  };

  const selectedDrilldown = useMemo(() => {
    if (!selectedBlockKey || !report) return null;
    if (selectedBlockKey === 'ALL') {
      return {
        title: 'Все выбранные блоки (ИТОГО)',
        subtitle: `Полный список проданных квартир за период ${formatDateRu(startDate)} — ${formatDateRu(endDate)}`,
        soldCount: totals.soldCount,
        soldAreaM2: totals.soldAreaM2,
        apartments: report.apartments || []
      };
    }
    const found = blocks.find((b) => b.key === selectedBlockKey);
    if (!found) return null;
    return {
      title: `${found.projectName} — Блок ${found.blockCode}`,
      subtitle: `Детализация проданных квартир за период ${formatDateRu(startDate)} — ${formatDateRu(endDate)}`,
      soldCount: found.soldCount,
      soldAreaM2: found.soldAreaM2,
      apartments: found.apartments || []
    };
  }, [selectedBlockKey, report, blocks, totals, startDate, endDate]);

  const complexFilterLabel =
    complex === 'ALL' ? 'Все комплексы' : complex;
  const blockFilterLabel =
    block === 'ALL' ? 'Все блоки' : `Блок ${block}`;

  return (
    <div className="max-w-7xl mx-auto pb-12">
      {/* A4 Print Styles */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 12mm;
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
          .print-table th,
          .print-table td {
            border: 1px solid #cbd5e1 !important;
            padding: 6px 8px !important;
            font-size: 10pt !important;
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
              Количество и площадь проданных квартир по жилым комплексам и блокам по дате заключения действующих договоров (часовой пояс Asia/Dushanbe)
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
        <div className="hidden print-only border-b-2 border-slate-800 pb-4 mb-4">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-xl font-extrabold text-slate-900 uppercase tracking-wide">
                Отчёт о продажах квартир
              </h1>
              <p className="text-xs text-slate-600 mt-1">
                Период отчёта: <strong>{formatDateRu(startDate)} — {formatDateRu(endDate)}</strong>
              </p>
              <p className="text-xs text-slate-600">
                Фильтры: ЖК — <strong>{complexFilterLabel}</strong>, Блок — <strong>{blockFilterLabel}</strong>
              </p>
            </div>
            <div className="text-right text-xs text-slate-600">
              <div>TOZON CRM</div>
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

        {/* Summary KPI Cards (Section 2.2) */}
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
                {summary.totalSoldCount.toLocaleString('ru-RU')}
              </div>
              <span className="mt-1 inline-block text-[11px] text-slate-400">
                Действующие договоры за выбранный период
              </span>
            </div>
            <div className="no-print h-12 w-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
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
            <div className="no-print h-12 w-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
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
            <div className="no-print h-12 w-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <Calculator className="h-6 w-6" />
            </div>
          </div>
        </div>

        {/* Main Table by Blocks (Section 2.3) */}
        <div className="print-card rounded-2xl bg-white border border-slate-200 shadow-2xs overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h2 className="text-base font-extrabold text-slate-900">
                Продажи квартир по жилым комплексам и блокам
              </h2>
              <p className="no-print text-xs text-slate-500 mt-0.5">
                Нажмите на строку блока, чтобы открыть подробный список проданных квартир (детализацию)
              </p>
            </div>
            <div className="text-xs font-semibold text-slate-500">
              Период: <strong className="text-slate-800">{formatDateRu(startDate)} — {formatDateRu(endDate)}</strong>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="print-table w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-3.5 px-5">Жилой комплекс</th>
                  <th className="py-3.5 px-5 text-center">Блок</th>
                  <th className="py-3.5 px-5 text-right">Продано квартир, шт.</th>
                  <th className="py-3.5 px-5 text-right">Проданная площадь, м²</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                {blocks.map((row) => {
                  const isSelected = selectedBlockKey === row.key;
                  return (
                    <tr
                      key={row.key}
                      data-testid={`block-row-${row.blockCode}`}
                      onClick={() =>
                        setSelectedBlockKey((prev) => (prev === row.key ? null : row.key))
                      }
                      className={`transition cursor-pointer ${
                        isSelected
                          ? 'bg-blue-50/80 hover:bg-blue-50'
                          : 'hover:bg-slate-50'
                      }`}
                    >
                      <td className="py-3.5 px-5 font-bold text-slate-900">
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
                      <td className="py-3.5 px-5 text-center">
                        <span className="inline-flex items-center justify-center min-w-[2rem] rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-extrabold text-slate-800">
                          {row.blockCode}
                        </span>
                      </td>
                      <td className="py-3.5 px-5 text-right font-bold text-slate-900">
                        {row.soldCount.toLocaleString('ru-RU')}
                      </td>
                      <td className="py-3.5 px-5 text-right font-bold text-slate-900">
                        {formatArea(row.soldAreaM2)}
                      </td>
                    </tr>
                  );
                })}

                {blocks.length === 0 && !isLoading && (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-xs text-slate-500">
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
                  className="bg-slate-100/90 border-t-2 border-slate-300 font-extrabold text-slate-900 cursor-pointer hover:bg-slate-200/70 transition"
                >
                  <td className="py-3.5 px-5 text-sm">
                    <div className="flex items-center gap-2">
                      <span>ИТОГО</span>
                      <span className="no-print text-[11px] font-semibold text-blue-600">
                        (показать все квартиры)
                      </span>
                    </div>
                  </td>
                  <td className="py-3.5 px-5 text-center text-xs text-slate-500">—</td>
                  <td
                    data-testid="table-total-sold-count"
                    className="py-3.5 px-5 text-right text-sm"
                  >
                    {totals.soldCount.toLocaleString('ru-RU')}
                  </td>
                  <td
                    data-testid="table-total-sold-area"
                    className="py-3.5 px-5 text-right text-sm"
                  >
                    {formatArea(totals.soldAreaM2)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Drilldown Section (Section 2.5) */}
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
                  <strong>{formatArea(selectedDrilldown.soldAreaM2)} м²</strong>
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
                <table className="print-table w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      <th className="py-3 px-4">Дата договора</th>
                      <th className="py-3 px-4">Номер договора</th>
                      <th className="py-3 px-4">Жилой комплекс</th>
                      <th className="py-3 px-4 text-center">Блок</th>
                      <th className="py-3 px-4 text-center">Номер квартиры</th>
                      <th className="py-3 px-4 text-center">Этаж</th>
                      <th className="py-3 px-4 text-right">Площадь квартиры, м²</th>
                      <th className="py-3 px-4">Статус договора</th>
                      {canOpenContractCard && (
                        <th className="no-print py-3 px-4 text-right">Договор</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-xs sm:text-sm">
                    {selectedDrilldown.apartments.map((apt) => (
                      <tr
                        key={`${apt.dealId}-${apt.unitId}`}
                        className="hover:bg-slate-50 transition"
                      >
                        <td className="py-3 px-4 font-semibold text-slate-800 whitespace-nowrap">
                          {formatDateRu(apt.contractDate)}
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-900 whitespace-nowrap">
                          {formatContractNumber(apt.contractNumber) || apt.contractNumber}
                        </td>
                        <td className="py-3 px-4 text-slate-700 font-medium">
                          {apt.projectName}
                        </td>
                        <td className="py-3 px-4 text-center font-bold text-slate-800">
                          {apt.blockCode}
                        </td>
                        <td className="py-3 px-4 text-center font-extrabold text-slate-900">
                          № {apt.unitNumber}
                        </td>
                        <td className="py-3 px-4 text-center text-slate-700">
                          {apt.floorNumber ?? '—'}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-slate-900">
                          {formatArea(apt.areaM2)}
                        </td>
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700">
                            <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                            <span>{apt.statusLabel || 'Действующий'}</span>
                          </span>
                        </td>
                        {canOpenContractCard && (
                          <td className="no-print py-3 px-4 text-right">
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
                    <tr className="bg-slate-50 border-t border-slate-200 font-extrabold text-slate-900 text-xs sm:text-sm">
                      <td colSpan={6} className="py-3 px-4">
                        ИТОГО по списку ({selectedDrilldown.soldCount} шт.)
                      </td>
                      <td className="py-3 px-4 text-right">
                        {formatArea(selectedDrilldown.soldAreaM2)}
                      </td>
                      <td colSpan={canOpenContractCard ? 2 : 1} className="py-3 px-4" />
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

