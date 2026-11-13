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
  Maximize2,
  Calculator,
  DollarSign,
  Wallet,
  AlertTriangle,
  Info,
  Eye,
  X,
  AlertCircle,
  ShieldCheck,
  Users,
  Plus,
  Pencil,
  Filter
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

const SALES_SOURCE_OPTIONS = [
  { value: 'ALL', label: 'Все продажи' },
  { value: 'DIRECT', label: 'Прямые продажи TOZON' },
  { value: 'MARKETER', label: 'Продажи через маркетологов' },
  { value: 'UNSPECIFIED', label: 'Источник не определён' }
];

const TABLE_VIEW_TABS = [
  { id: 'ALL', label: 'Все показатели (Сводная)' },
  { id: 'INVENTORY', label: 'Продажи и остатки' },
  { id: 'FINANCE', label: 'Оплаты и задолженность' },
  { id: 'COMMISSIONS', label: 'Источники и комиссии' }
];

const SOURCE_BADGE_STYLES = {
  DIRECT: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  MARKETER: 'bg-indigo-50 text-indigo-800 border-indigo-200',
  UNSPECIFIED: 'bg-amber-50 text-amber-800 border-amber-200'
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

const SOURCE_SUBROW_STYLES = {
  DIRECT: { dot: 'bg-emerald-500', text: 'text-emerald-800', badge: 'bg-emerald-50 border-emerald-200' },
  MARKETER: { dot: 'bg-indigo-500', text: 'text-indigo-800', badge: 'bg-indigo-50 border-indigo-200' },
  UNSPECIFIED: { dot: 'bg-amber-500', text: 'text-amber-800', badge: 'bg-amber-50 border-amber-200' },
};

function getVisibleSourceBreakdown(sourceBreakdown) {
  if (!Array.isArray(sourceBreakdown)) return [];
  return sourceBreakdown.filter(
    (item) => item.salesSource !== 'UNSPECIFIED' || (item.soldCount ?? 0) > 0
  );
}

function renderSourceSubRows({ sourceBreakdown, activeTableTab, keyPrefix, testIdPrefix, isTotal = false }) {
  const items = getVisibleSourceBreakdown(sourceBreakdown);
  if (items.length === 0) return null;

  const rowBg = isTotal ? 'bg-slate-100/80 font-semibold' : 'bg-slate-50/70';
  const stickyBg = isTotal ? 'bg-slate-100' : 'bg-slate-50';

  return items.map((sub) => {
    const style = SOURCE_SUBROW_STYLES[sub.salesSource] || SOURCE_SUBROW_STYLES.UNSPECIFIED;
    return (
      <tr
        key={`${keyPrefix}-${sub.salesSource}`}
        data-testid={`${testIdPrefix}-${sub.salesSource}`}
        className={`${rowBg} text-[11px] sm:text-xs text-slate-600 border-t border-slate-200/70`}
      >
        <td className={`sticky left-0 z-10 ${stickyBg} py-2 pl-6 pr-3 border-r border-slate-200/60`}>
          <div className="flex items-center gap-1.5">
            <span className={`inline-block w-1.5 h-1.5 rounded-full shrink-0 ${style.dot}`} />
            <span className={`truncate ${style.text}`}>
              {isTotal ? `ИТОГО — ${sub.salesSourceLabel}` : sub.salesSourceLabel}
            </span>
          </div>
        </td>
        <td className={`sticky left-[170px] z-10 ${stickyBg} py-2 px-3 border-r border-slate-200/60 text-center text-slate-400`}>
          —
        </td>

        {(activeTableTab === 'ALL' || activeTableTab === 'INVENTORY') && (
          <td className="py-2 px-3.5 text-right text-slate-400">—</td>
        )}

        <td className="py-2 px-3.5 text-right font-semibold text-slate-800 whitespace-nowrap">
          {(sub.soldCount ?? 0).toLocaleString('ru-RU')}
        </td>

        {(activeTableTab === 'INVENTORY' || activeTableTab === 'COMMISSIONS') && (
          <>
            <td className="py-2 px-3 text-right text-slate-400">—</td>
            <td className="py-2 px-3 text-right text-slate-400">—</td>
            <td className="py-2 px-3 text-right text-slate-400">—</td>
          </>
        )}

        {(activeTableTab === 'ALL' || activeTableTab === 'INVENTORY') && (
          <>
            <td className="py-2 px-3.5 text-right text-slate-400">—</td>
            <td className="py-2 px-3.5 text-right text-slate-400">—</td>
          </>
        )}

        <td className="py-2 px-3.5 text-right font-semibold text-slate-800 whitespace-nowrap">
          {formatMoneyUsd(sub.salesAmountUsd)}
        </td>
        <td className="py-2 px-3.5 text-right font-semibold text-sky-700 whitespace-nowrap">
          {formatMoneyUsd(sub.paidDownPaymentUsd)}
        </td>
        <td className="py-2 px-3 text-right font-semibold text-sky-700 whitespace-nowrap">
          {formatPercent(sub.paidDownPaymentPercent)}
        </td>

        {activeTableTab === 'COMMISSIONS' && (
          <>
            <td className="py-2 px-3.5 text-right text-slate-400">—</td>
            <td className="py-2 px-3.5 text-right text-slate-400">—</td>
            <td className="py-2 px-3.5 text-right text-slate-400">—</td>
            <td className="py-2 px-3.5 text-right text-slate-400">—</td>
            <td className="py-2 px-3.5 text-right text-slate-400">—</td>
            <td className="py-2 px-3.5 text-right text-slate-400">—</td>
          </>
        )}

        {activeTableTab === 'FINANCE' && (
          <>
            <td className="py-2 px-3.5 text-right text-slate-400">—</td>
            <td className="py-2 px-3.5 text-right text-slate-400">—</td>
          </>
        )}

        {(activeTableTab === 'ALL' || activeTableTab === 'FINANCE') && (
          <>
            <td className="py-2 px-3.5 text-right text-slate-400">—</td>
            <td className="py-2 px-3 text-right text-slate-400">—</td>
            <td className="py-2 px-3.5 text-right text-slate-400">—</td>
            <td className="py-2 px-3.5 text-right text-slate-400">—</td>
          </>
        )}
      </tr>
    );
  });
}

export const ApartmentSalesReportPage = () => {
  const { user } = useAuth();
  const isAdmin = String(user?.role || '').toUpperCase() === 'ADMIN';

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
  const [salesSource, setSalesSource] = useState('ALL');
  const [partnerId, setPartnerId] = useState('ALL');
  const [activeTableTab, setActiveTableTab] = useState('ALL');

  const [report, setReport] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState('');

  // Drilldown state: null (closed), 'ALL' (all blocks in period), or block.key (e.g. 'TOZON PLAZA::А')
  const [selectedBlockKey, setSelectedBlockKey] = useState(null);

  // Deal Drawer & Contract Print modals
  const [selectedDealIdForDrawer, setSelectedDealIdForDrawer] = useState(null);
  const [contractToPrint, setContractToPrint] = useState(null);

  // Marketing Partners Management Modal (for ADMIN)
  const [isPartnersModalOpen, setIsPartnersModalOpen] = useState(false);
  const [editingPartner, setEditingPartner] = useState(null);
  const [partnerForm, setPartnerForm] = useState({
    name: '',
    contactPerson: '',
    phone: '',
    commissionType: 'NONE',
    commissionRatePercent: '',
    commissionTerms: '',
    cooperationStartDate: '',
    notes: '',
    isActive: true
  });
  const [savingPartner, setSavingPartner] = useState(false);
  const [partnerModalError, setPartnerModalError] = useState('');

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
      const targetSalesSource = overrideParams.salesSource ?? salesSource;
      const targetPartnerId = overrideParams.partnerId ?? partnerId;

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
            block: targetBlock,
            salesSource: targetSalesSource,
            partnerId: targetPartnerId
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
    [startDate, endDate, complex, block, salesSource, partnerId]
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
          block,
          salesSource,
          partnerId
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

  const handleSavePartner = async (e) => {
    e.preventDefault();
    setPartnerModalError('');
    if (!partnerForm.name.trim()) {
      setPartnerModalError('Укажите наименование маркетингового партнёра');
      return;
    }
    setSavingPartner(true);
    try {
      const payload = {
        name: partnerForm.name.trim(),
        contactPerson: partnerForm.contactPerson.trim(),
        phone: partnerForm.phone.trim(),
        commissionType: partnerForm.commissionType,
        commissionRatePercent: partnerForm.commissionType === 'PERCENT' ? Number(partnerForm.commissionRatePercent || 0) : 0,
        commissionTerms: partnerForm.commissionTerms.trim(),
        cooperationStartDate: partnerForm.cooperationStartDate || null,
        notes: partnerForm.notes.trim(),
        isActive: partnerForm.isActive
      };

      if (editingPartner) {
        await api.patch(`/reports/marketing-partners/${editingPartner.id}`, payload);
      } else {
        await api.post('/reports/marketing-partners', payload);
      }
      setEditingPartner(null);
      setPartnerForm({
        name: '',
        contactPerson: '',
        phone: '',
        commissionType: 'NONE',
        commissionRatePercent: '',
        commissionTerms: '',
        cooperationStartDate: '',
        notes: '',
        isActive: true
      });
      await fetchReport();
    } catch (err) {
      setPartnerModalError(err?.response?.data?.message || err?.message || 'Ошибка сохранения партнёра');
    } finally {
      setSavingPartner(false);
    }
  };

  const summary = report?.summary || {
    totalAvailableStartCount: 0,
    totalSoldCount: 0,
    directSoldCount: 0,
    marketerSoldCount: 0,
    unspecifiedSoldCount: 0,
    totalAvailableEndCount: 0,
    totalAreaM2: 0,
    averageAreaM2: 0,
    totalSalesAmountUsd: 0,
    directSalesAmountUsd: 0,
    marketerSalesAmountUsd: 0,
    unspecifiedSalesAmountUsd: 0,
    totalPaidCashUsd: 0,
    totalPaidBarterUsd: 0,
    totalSettledUsd: 0,
    totalRemainingDebtUsd: 0,
    totalOverpaidUsd: 0,
    totalPaidPercent: 0,
    totalDebtPercent: 0,
    calculatedCommissionUsd: 0,
    approvedCommissionUsd: 0,
    paidCommissionUsd: 0,
    remainingCommissionUsd: 0
  };
  const blocks = report?.blocks || [];
  const totals = report?.totals || {
    availableStartCount: 0,
    soldCount: 0,
    directSoldCount: 0,
    marketerSoldCount: 0,
    unspecifiedSoldCount: 0,
    availableEndCount: 0,
    soldAreaM2: 0,
    salesAmountUsd: 0,
    directSalesAmountUsd: 0,
    marketerSalesAmountUsd: 0,
    unspecifiedSalesAmountUsd: 0,
    paidCashUsd: 0,
    paidBarterUsd: 0,
    totalSettledUsd: 0,
    remainingDebtUsd: 0,
    overpaidUsd: 0,
    paidPercent: 0,
    debtPercent: 0,
    calculatedCommissionUsd: 0,
    approvedCommissionUsd: 0,
    paidCommissionUsd: 0,
    remainingCommissionUsd: 0
  };
  const marketingPartners = report?.marketingPartners || [];

  const selectedDrilldown = useMemo(() => {
    if (!selectedBlockKey || !report) return null;
    if (selectedBlockKey === 'ALL') {
      return {
        title: 'Все выбранные блоки (ИТОГО)',
        subtitle: `Полный список проданных квартир за период ${formatDateRu(startDate)} — ${formatDateRu(endDate)}`,
        soldCount: totals.soldCount ?? 0,
        directSoldCount: totals.directSoldCount ?? 0,
        marketerSoldCount: totals.marketerSoldCount ?? 0,
        unspecifiedSoldCount: totals.unspecifiedSoldCount ?? 0,
        soldAreaM2: totals.soldAreaM2 ?? 0,
        salesAmountUsd: totals.salesAmountUsd ?? 0,
        paidCashUsd: totals.paidCashUsd ?? 0,
        paidBarterUsd: totals.paidBarterUsd ?? 0,
        totalSettledUsd: totals.totalSettledUsd ?? 0,
        remainingDebtUsd: totals.remainingDebtUsd ?? 0,
        paidPercent: totals.paidPercent ?? 0,
        debtPercent: totals.debtPercent ?? 0,
        calculatedCommissionUsd: totals.calculatedCommissionUsd ?? 0,
        approvedCommissionUsd: totals.approvedCommissionUsd ?? 0,
        paidCommissionUsd: totals.paidCommissionUsd ?? 0,
        remainingCommissionUsd: totals.remainingCommissionUsd ?? 0,
        apartments: report.apartments || []
      };
    }
    const found = blocks.find((b) => b.key === selectedBlockKey);
    if (!found) return null;
    return {
      title: `${found.projectName} — Блок ${found.blockCode}`,
      subtitle: `Детализация проданных квартир за период ${formatDateRu(startDate)} — ${formatDateRu(endDate)}`,
      soldCount: found.soldCount ?? 0,
      directSoldCount: found.directSoldCount ?? 0,
      marketerSoldCount: found.marketerSoldCount ?? 0,
      unspecifiedSoldCount: found.unspecifiedSoldCount ?? 0,
      soldAreaM2: found.soldAreaM2 ?? 0,
      salesAmountUsd: found.salesAmountUsd ?? 0,
      paidCashUsd: found.paidCashUsd ?? 0,
      paidBarterUsd: found.paidBarterUsd ?? 0,
      totalSettledUsd: found.totalSettledUsd ?? 0,
      remainingDebtUsd: found.remainingDebtUsd ?? 0,
      paidPercent: found.paidPercent ?? 0,
      debtPercent: found.debtPercent ?? 0,
      calculatedCommissionUsd: found.calculatedCommissionUsd ?? 0,
      approvedCommissionUsd: found.approvedCommissionUsd ?? 0,
      paidCommissionUsd: found.paidCommissionUsd ?? 0,
      remainingCommissionUsd: found.remainingCommissionUsd ?? 0,
      apartments: found.apartments || []
    };
  }, [selectedBlockKey, report, blocks, totals, startDate, endDate]);

  const complexFilterLabel = complex === 'ALL' ? 'Все комплексы' : complex;
  const blockFilterLabel = block === 'ALL' ? 'Все блоки' : `Блок ${block}`;
  const sourceFilterLabel =
    SALES_SOURCE_OPTIONS.find((o) => o.value === salesSource)?.label || 'Все продажи';

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

      {/* Main Report Area */}
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
              Динамика свободного фонда, объём продаж, фактические оплаты, источники продаж и контроль комиссий маркетологов (Asia/Dushanbe)
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {isAdmin && (
              <button
                type="button"
                onClick={() => setIsPartnersModalOpen(true)}
                data-testid="btn-manage-marketing-partners"
                className="inline-flex items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-3.5 py-2.5 text-xs font-bold text-indigo-700 shadow-2xs hover:bg-indigo-100 transition cursor-pointer"
              >
                <Users className="h-4 w-4 text-indigo-600" />
                <span>Партнёры ({marketingPartners.length})</span>
              </button>
            )}

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
                Отчёт о продажах квартир и комиссиях маркетологов
              </h1>
              <p className="text-xs text-slate-600 mt-0.5">
                Период отчёта: <strong>{formatDateRu(startDate)} — {formatDateRu(endDate)}</strong> | Оплаты зачтены на дату: <strong>{formatDateRu(endDate)}</strong>
              </p>
              <p className="text-xs text-slate-600">
                Фильтры: ЖК — <strong>{complexFilterLabel}</strong>, Блок — <strong>{blockFilterLabel}</strong>, Источник — <strong>{sourceFilterLabel}</strong>
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

        {/* Filter Bar (6 filters) */}
        <div className="no-print rounded-2xl bg-white p-4 sm:p-5 border border-slate-200 shadow-2xs space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3.5">
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

            {/* Sales Source Filter (Stage 9.1) */}
            <div>
              <label
                htmlFor="apartment-sales-source-filter"
                className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5"
              >
                Источник продажи
              </label>
              <div className="relative">
                <ShieldCheck className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <select
                  id="apartment-sales-source-filter"
                  value={salesSource}
                  onChange={(e) => {
                    const next = e.target.value;
                    setSalesSource(next);
                    if (next !== 'ALL' && next !== 'MARKETER') {
                      setPartnerId('ALL');
                    }
                  }}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 py-2 text-xs font-semibold text-slate-900 outline-none focus:border-blue-500 focus:bg-white transition cursor-pointer"
                >
                  {SALES_SOURCE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Marketing Partner Filter (Stage 9.1) */}
            <div>
              <label
                htmlFor="apartment-sales-partner-filter"
                className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5"
              >
                Маркетинговый партнёр
              </label>
              <div className="relative">
                <Users className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <select
                  id="apartment-sales-partner-filter"
                  value={partnerId}
                  onChange={(e) => {
                    const nextPartner = e.target.value;
                    setPartnerId(nextPartner);
                    if (nextPartner !== 'ALL' && salesSource !== 'MARKETER') {
                      setSalesSource('MARKETER');
                    }
                  }}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 py-2 text-xs font-semibold text-slate-900 outline-none focus:border-blue-500 focus:bg-white transition cursor-pointer"
                >
                  <option value="ALL">Все партнёры</option>
                  {marketingPartners.map((p) => (
                    <option key={p.id} value={String(p.id)}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Period Explanation Banner (Stage 5.3) */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs text-slate-600">
            <div className="flex items-center gap-2">
              <Filter className="h-3.5 w-3.5 text-blue-600 shrink-0" />
              <span>
                Показаны продажи по договорам с датой заключения (<code>deal_date</code>) за период{' '}
                <strong>{formatDateRu(startDate)} — {formatDateRu(endDate)}</strong>.
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setStartDate('2025-01-01');
                }}
                className="text-xs font-bold text-blue-600 hover:text-blue-800 underline cursor-pointer"
              >
                Показать за всё время (все договоры)
              </button>
              <span className="text-slate-300">|</span>
              <button
                type="button"
                onClick={() => {
                  setStartDate(defaultDates.startDate);
                  setEndDate(defaultDates.endDate);
                }}
                className="text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                Текущий месяц
              </button>
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

        {/* Row 1 & 2: Primary Summary KPI Cards (6 cards) */}
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

        {/* Row 3: V3 Sales Channels & Marketer Commissions KPI Cards (4 cards) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="print-card rounded-2xl bg-emerald-50/50 p-4 border border-emerald-200/80 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-900">Прямые продажи TOZON</span>
              <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-extrabold text-emerald-800">
                Комиссия: 0 USD
              </span>
            </div>
            <div data-testid="kpi-direct-sold-count" className="mt-2 text-xl font-extrabold text-emerald-950">
              {summary.directSoldCount ?? 0} шт. • ${formatMoneyUsd(summary.directSalesAmountUsd)}
            </div>
            <p className="mt-1 text-[11px] text-emerald-700">
              Продажи собственных менеджеров TOZON без участия внешних маркетологов
            </p>
          </div>

          <div className="print-card rounded-2xl bg-indigo-50/50 p-4 border border-indigo-200/80 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-indigo-900">Через маркетологов</span>
              <span className="rounded-md bg-indigo-100 px-2 py-0.5 text-[10px] font-extrabold text-indigo-800">
                Внешний канал
              </span>
            </div>
            <div data-testid="kpi-marketer-sold-count" className="mt-2 text-xl font-extrabold text-indigo-950">
              {summary.marketerSoldCount ?? 0} шт. • ${formatMoneyUsd(summary.marketerSalesAmountUsd)}
            </div>
            <p className="mt-1 text-[11px] text-indigo-700">
              Подтверждённые сделки с привлечением маркетинговых партнёров
            </p>
          </div>

          <div className="print-card rounded-2xl bg-amber-50/50 p-4 border border-amber-200/80 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-900">Источник не определён</span>
              <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-extrabold text-amber-800">
                На проверке
              </span>
            </div>
            <div data-testid="kpi-unspecified-sold-count" className="mt-2 text-xl font-extrabold text-amber-950">
              {summary.unspecifiedSoldCount ?? 0} шт. • ${formatMoneyUsd(summary.unspecifiedSalesAmountUsd)}
            </div>
            <p className="mt-1 text-[11px] text-amber-800">
              Комиссия маркетологам не начисляется до проверки и подтверждения
            </p>
          </div>

          <div className="print-card rounded-2xl bg-slate-900 text-white p-4 border border-slate-800 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300">Комиссии маркетологам</span>
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
            </div>
            <div data-testid="kpi-commissions-summary" className="mt-1.5 text-lg font-extrabold text-white">
              К выплате: ${formatMoneyUsd(summary.remainingCommissionUsd)}
            </div>
            <div className="mt-1 text-[11px] text-slate-300 space-x-2">
              <span>Начислено: <strong>${formatMoneyUsd(summary.calculatedCommissionUsd)}</strong></span>
              <span>•</span>
              <span>Утв.: <strong>${formatMoneyUsd(summary.approvedCommissionUsd)}</strong></span>
              <span>•</span>
              <span>Выпл.: <strong>${formatMoneyUsd(summary.paidCommissionUsd)}</strong></span>
            </div>
          </div>
        </div>

        {/* Main Table by Blocks with View Mode Tabs (Stage 9.3) */}
        <div className="print-card rounded-2xl bg-white border border-slate-200 shadow-2xs overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
            <div>
              <h2 className="text-base font-extrabold text-slate-900">
                Продажи квартир по жилым комплексам и блокам
              </h2>
              <p className="no-print text-xs text-slate-500 mt-0.5">
                Нажмите на строку блока, чтобы открыть подробный список проданных квартир с источниками продаж, менеджерами и комиссиями
              </p>
            </div>

            {/* Table View Mode Switcher */}
            <div className="no-print flex flex-wrap items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
              {TABLE_VIEW_TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  data-testid={`report-tab-${tab.id}`}
                  onClick={() => setActiveTableTab(tab.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    activeTableTab === tab.id
                      ? 'bg-white text-blue-700 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Mobile compact source breakdown cards */}
          <div className="sm:hidden no-print divide-y divide-slate-200 border-b border-slate-200">
            {[...blocks.map((b) => ({
              key: b.key,
              title: `${b.projectName} · Блок ${b.blockCode}`,
              soldCount: b.soldCount,
              salesAmountUsd: b.salesAmountUsd,
              paidDownPaymentUsd: b.paidDownPaymentUsd,
              paidDownPaymentPercent: b.paidDownPaymentPercent,
              sourceBreakdown: b.sourceBreakdown,
              isTotal: false,
            })), {
              key: 'mobile-total',
              title: 'ИТОГО',
              soldCount: totals.soldCount,
              salesAmountUsd: totals.salesAmountUsd,
              paidDownPaymentUsd: totals.paidDownPaymentUsd,
              paidDownPaymentPercent: totals.paidDownPaymentPercent,
              sourceBreakdown: totals.sourceBreakdown,
              isTotal: true,
            }].map((item) => {
              const subs = getVisibleSourceBreakdown(item.sourceBreakdown);
              return (
                <div
                  key={item.key}
                  className={`p-3.5 space-y-2 ${item.isTotal ? 'bg-slate-100' : 'bg-white'}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-xs text-slate-900">{item.title}</span>
                    <span className="text-xs font-extrabold text-slate-900">
                      {item.soldCount ?? 0} шт. · {formatMoneyUsd(item.salesAmountUsd)}
                    </span>
                  </div>
                  <div className="text-[11px] text-sky-700 font-semibold">
                    Покрытие ПВ (расчётно): {formatMoneyUsd(item.paidDownPaymentUsd)} ({formatPercent(item.paidDownPaymentPercent)})
                  </div>
                  {subs.length > 0 && (
                    <div className="space-y-1 pt-1">
                      {subs.map((sub) => {
                        const style = SOURCE_SUBROW_STYLES[sub.salesSource] || SOURCE_SUBROW_STYLES.UNSPECIFIED;
                        return (
                          <div
                            key={`${item.key}-${sub.salesSource}`}
                            className={`rounded-lg border px-2.5 py-1.5 text-[11px] ${style.badge}`}
                          >
                            <div className="flex items-center justify-between font-semibold">
                              <span className={style.text}>{sub.salesSourceLabel}</span>
                              <span className="text-slate-900">{sub.soldCount ?? 0} шт. · {formatMoneyUsd(sub.salesAmountUsd)}</span>
                            </div>
                            <div className="text-[10px] text-slate-600 mt-0.5">
                              Покрытие ПВ (расчётно): <span className="font-semibold text-sky-800">{formatMoneyUsd(sub.paidDownPaymentUsd)}</span> ({formatPercent(sub.paidDownPaymentPercent)})
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
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

                  {(activeTableTab === 'ALL' || activeTableTab === 'INVENTORY') && (
                    <th className="py-3.5 px-3.5 text-right">
                      Свободно на начало периода, шт.
                    </th>
                  )}

                  <th className="py-3.5 px-3.5 text-right">
                    Продано за период, шт.
                  </th>

                  {(activeTableTab === 'INVENTORY' || activeTableTab === 'COMMISSIONS') && (
                    <>
                      <th className="py-3.5 px-3 text-right text-emerald-700">
                        Продано напрямую, шт.
                      </th>
                      <th className="py-3.5 px-3 text-right text-indigo-700">
                        Через маркетологов, шт.
                      </th>
                      <th className="py-3.5 px-3 text-right text-amber-700">
                        Источник не опр., шт.
                      </th>
                    </>
                  )}

                  {(activeTableTab === 'ALL' || activeTableTab === 'INVENTORY') && (
                    <>
                      <th className="py-3.5 px-3.5 text-right">
                        Осталось свободных на конец периода, шт.
                      </th>
                      <th className="py-3.5 px-3.5 text-right">
                        Проданная площадь, м²
                      </th>
                    </>
                  )}

                  <th className="py-3.5 px-3.5 text-right">
                    Сумма продаж, USD
                  </th>
                  <th className="py-3.5 px-3.5 text-right text-sky-700">
                    Покрытие ПВ (расчётно), USD
                  </th>
                  <th className="py-3.5 px-3 text-right text-sky-700">
                    Покрытие ПВ, %
                  </th>

                  {activeTableTab === 'COMMISSIONS' && (
                    <>
                      <th className="py-3.5 px-3.5 text-right text-emerald-700">
                        Сумма прямых продаж, USD
                      </th>
                      <th className="py-3.5 px-3.5 text-right text-indigo-700">
                        Сумма продаж через маркетологов, USD
                      </th>
                      <th className="py-3.5 px-3.5 text-right">
                        Начисленная комиссия, USD
                      </th>
                      <th className="py-3.5 px-3.5 text-right text-emerald-700">
                        Утверждённая комиссия, USD
                      </th>
                      <th className="py-3.5 px-3.5 text-right text-indigo-700">
                        Выплаченная комиссия, USD
                      </th>
                      <th className="py-3.5 px-3.5 text-right text-amber-800">
                        Остаток комиссии к выплате, USD
                      </th>
                    </>
                  )}

                  {activeTableTab === 'FINANCE' && (
                    <>
                      <th className="py-3.5 px-3.5 text-right text-emerald-700">
                        Получено деньгами, USD
                      </th>
                      <th className="py-3.5 px-3.5 text-right text-indigo-700">
                        Зачтено бартером, USD
                      </th>
                    </>
                  )}

                  {(activeTableTab === 'ALL' || activeTableTab === 'FINANCE') && (
                    <>
                      <th className="py-3.5 px-3.5 text-right">
                        Получено, USD
                      </th>
                      <th className="py-3.5 px-3 text-right">
                        Оплачено, %
                      </th>
                      <th className="py-3.5 px-3.5 text-right">
                        Остаток долга, USD
                      </th>
                      <th className="py-3.5 px-3.5 text-right">
                        Долг, %
                      </th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-xs sm:text-sm">
                {blocks.map((row) => {
                  const isSelected = selectedBlockKey === row.key;
                  const stickyBg = isSelected
                    ? 'bg-blue-50 group-hover:bg-blue-50'
                    : 'bg-white group-hover:bg-slate-50';
                  return (
                    <React.Fragment key={row.key}>
                    <tr
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

                      {(activeTableTab === 'ALL' || activeTableTab === 'INVENTORY') && (
                        <td className="py-3.5 px-3.5 text-right font-semibold text-slate-700 whitespace-nowrap">
                          {(row.availableStartCount ?? 0).toLocaleString('ru-RU')}
                        </td>
                      )}

                      <td className="py-3.5 px-3.5 text-right font-extrabold text-slate-900 whitespace-nowrap">
                        <div>{(row.soldCount ?? 0).toLocaleString('ru-RU')}</div>
                        {activeTableTab === 'ALL' && (row.soldCount ?? 0) > 0 && (
                          <div className="no-print text-[10px] font-medium text-slate-400">
                            прям: {row.directSoldCount ?? 0} | марк: {row.marketerSoldCount ?? 0} | не опр: {row.unspecifiedSoldCount ?? 0}
                          </div>
                        )}
                      </td>

                      {(activeTableTab === 'INVENTORY' || activeTableTab === 'COMMISSIONS') && (
                        <>
                          <td className="py-3.5 px-3 text-right font-semibold text-emerald-700 whitespace-nowrap">
                            {(row.directSoldCount ?? 0).toLocaleString('ru-RU')}
                          </td>
                          <td className="py-3.5 px-3 text-right font-semibold text-indigo-700 whitespace-nowrap">
                            {(row.marketerSoldCount ?? 0).toLocaleString('ru-RU')}
                          </td>
                          <td className="py-3.5 px-3 text-right font-semibold text-amber-700 whitespace-nowrap">
                            {(row.unspecifiedSoldCount ?? 0).toLocaleString('ru-RU')}
                          </td>
                        </>
                      )}

                      {(activeTableTab === 'ALL' || activeTableTab === 'INVENTORY') && (
                        <>
                          <td className="py-3.5 px-3.5 text-right font-semibold text-slate-700 whitespace-nowrap">
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
                        </>
                      )}

                      <td className="py-3.5 px-3.5 text-right font-bold text-slate-900 whitespace-nowrap">
                        {formatMoneyUsd(row.salesAmountUsd)}
                      </td>
                      <td className="py-3.5 px-3.5 text-right font-semibold text-sky-700 whitespace-nowrap">
                        {formatMoneyUsd(row.paidDownPaymentUsd)}
                      </td>
                      <td className="py-3.5 px-3 text-right font-semibold text-sky-700 whitespace-nowrap">
                        {formatPercent(row.paidDownPaymentPercent)}
                      </td>

                      {activeTableTab === 'COMMISSIONS' && (
                        <>
                          <td className="py-3.5 px-3.5 text-right font-semibold text-emerald-700 whitespace-nowrap">
                            {formatMoneyUsd(row.directSalesAmountUsd)}
                          </td>
                          <td className="py-3.5 px-3.5 text-right font-semibold text-indigo-700 whitespace-nowrap">
                            {formatMoneyUsd(row.marketerSalesAmountUsd)}
                          </td>
                          <td className="py-3.5 px-3.5 text-right font-semibold text-slate-800 whitespace-nowrap">
                            {formatMoneyUsd(row.calculatedCommissionUsd)}
                          </td>
                          <td className="py-3.5 px-3.5 text-right font-bold text-emerald-700 whitespace-nowrap">
                            {formatMoneyUsd(row.approvedCommissionUsd)}
                          </td>
                          <td className="py-3.5 px-3.5 text-right font-bold text-indigo-700 whitespace-nowrap">
                            {formatMoneyUsd(row.paidCommissionUsd)}
                          </td>
                          <td className="py-3.5 px-3.5 text-right font-bold text-amber-800 whitespace-nowrap">
                            {formatMoneyUsd(row.remainingCommissionUsd)}
                          </td>
                        </>
                      )}

                      {activeTableTab === 'FINANCE' && (
                        <>
                          <td className="py-3.5 px-3.5 text-right font-semibold text-emerald-700 whitespace-nowrap">
                            {formatMoneyUsd(row.paidCashUsd)}
                          </td>
                          <td className="py-3.5 px-3.5 text-right font-semibold text-indigo-700 whitespace-nowrap">
                            {formatMoneyUsd(row.paidBarterUsd)}
                          </td>
                        </>
                      )}

                      {(activeTableTab === 'ALL' || activeTableTab === 'FINANCE') && (
                        <>
                          <td className="py-3.5 px-3.5 text-right font-bold text-emerald-700 whitespace-nowrap">
                            <div>{formatMoneyUsd(row.totalSettledUsd)}</div>
                            {Number(row.paidBarterUsd) > 0 && activeTableTab === 'ALL' && (
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
                        </>
                      )}
                    </tr>
                    {renderSourceSubRows({
                      sourceBreakdown: row.sourceBreakdown,
                      activeTableTab,
                      keyPrefix: row.key,
                      testIdPrefix: `block-subrow-${row.blockCode}`,
                    })}
                    </React.Fragment>
                  );
                })}

                {blocks.length === 0 && !isLoading && (
                  <tr>
                    <td colSpan={12} className="py-8 text-center text-xs text-slate-500">
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

                  {(activeTableTab === 'ALL' || activeTableTab === 'INVENTORY') && (
                    <td
                      data-testid="table-total-available-start"
                      className="py-3.5 px-3.5 text-right whitespace-nowrap"
                    >
                      {(totals.availableStartCount ?? 0).toLocaleString('ru-RU')}
                    </td>
                  )}

                  <td
                    data-testid="table-total-sold-count"
                    className="py-3.5 px-3.5 text-right whitespace-nowrap"
                  >
                    {(totals.soldCount ?? 0).toLocaleString('ru-RU')}
                  </td>

                  {(activeTableTab === 'INVENTORY' || activeTableTab === 'COMMISSIONS') && (
                    <>
                      <td className="py-3.5 px-3 text-right text-emerald-800 whitespace-nowrap">
                        {(totals.directSoldCount ?? 0).toLocaleString('ru-RU')}
                      </td>
                      <td className="py-3.5 px-3 text-right text-indigo-800 whitespace-nowrap">
                        {(totals.marketerSoldCount ?? 0).toLocaleString('ru-RU')}
                      </td>
                      <td className="py-3.5 px-3 text-right text-amber-800 whitespace-nowrap">
                        {(totals.unspecifiedSoldCount ?? 0).toLocaleString('ru-RU')}
                      </td>
                    </>
                  )}

                  {(activeTableTab === 'ALL' || activeTableTab === 'INVENTORY') && (
                    <>
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
                    </>
                  )}

                  <td
                    data-testid="table-total-sales-usd"
                    className="py-3.5 px-3.5 text-right whitespace-nowrap"
                  >
                    {formatMoneyUsd(totals.salesAmountUsd)}
                  </td>
                  <td
                    data-testid="table-total-paid-down-payment-usd"
                    className="py-3.5 px-3.5 text-right text-sky-800 whitespace-nowrap"
                  >
                    {formatMoneyUsd(totals.paidDownPaymentUsd)}
                  </td>
                  <td
                    data-testid="table-total-paid-down-payment-percent"
                    className="py-3.5 px-3 text-right text-sky-800 whitespace-nowrap"
                  >
                    {formatPercent(totals.paidDownPaymentPercent)}
                  </td>

                  {activeTableTab === 'COMMISSIONS' && (
                    <>
                      <td className="py-3.5 px-3.5 text-right text-emerald-800 whitespace-nowrap">
                        {formatMoneyUsd(totals.directSalesAmountUsd)}
                      </td>
                      <td className="py-3.5 px-3.5 text-right text-indigo-800 whitespace-nowrap">
                        {formatMoneyUsd(totals.marketerSalesAmountUsd)}
                      </td>
                      <td className="py-3.5 px-3.5 text-right whitespace-nowrap">
                        {formatMoneyUsd(totals.calculatedCommissionUsd)}
                      </td>
                      <td className="py-3.5 px-3.5 text-right text-emerald-800 whitespace-nowrap">
                        {formatMoneyUsd(totals.approvedCommissionUsd)}
                      </td>
                      <td className="py-3.5 px-3.5 text-right text-indigo-800 whitespace-nowrap">
                        {formatMoneyUsd(totals.paidCommissionUsd)}
                      </td>
                      <td className="py-3.5 px-3.5 text-right text-amber-900 whitespace-nowrap">
                        {formatMoneyUsd(totals.remainingCommissionUsd)}
                      </td>
                    </>
                  )}

                  {activeTableTab === 'FINANCE' && (
                    <>
                      <td className="py-3.5 px-3.5 text-right text-emerald-800 whitespace-nowrap">
                        {formatMoneyUsd(totals.paidCashUsd)}
                      </td>
                      <td className="py-3.5 px-3.5 text-right text-indigo-800 whitespace-nowrap">
                        {formatMoneyUsd(totals.paidBarterUsd)}
                      </td>
                    </>
                  )}

                  {(activeTableTab === 'ALL' || activeTableTab === 'FINANCE') && (
                    <>
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
                    </>
                  )}
                </tr>
                {renderSourceSubRows({
                  sourceBreakdown: totals.sourceBreakdown,
                  activeTableTab,
                  keyPrefix: 'total',
                  testIdPrefix: 'total-subrow',
                  isTotal: true,
                })}
              </tfoot>
            </table>
          </div>

          {/* Methodology & Historical Inventory Note (Stage 7) */}
          <div className="no-print px-5 py-3 bg-slate-50 border-t border-slate-200 text-[11px] text-slate-500 flex items-start gap-2">
            <Info className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div>
                <strong>Методика расчёта и защита комиссий:</strong> Сумма продаж, оплаты (деньгами и бартером) и остаток долга рассчитываются по договорам квартир, проданных в выбранном периоде (<strong>{formatDateRu(startDate)} — {formatDateRu(endDate)}</strong>), по состоянию на конец периода (<strong>{formatDateRu(endDate)}</strong>). Прямые продажи компании TOZON и договоры со статусом «Источник не определён» всегда имеют комиссию маркетологам = <strong>0,00 USD</strong>. Показатель «Покрытие ПВ (расчётно), USD» рассчитывается по каждой сделке как <code>min(подтверждённые денежные платежи и зачтённый бартер, договорной ПВ)</code>, а «Покрытие ПВ, %» — как отношение суммы расчётного покрытия ПВ к сумме продаж группы; показатель является расчётным и не подтверждает целевое назначение каждого отдельного платежа.
              </div>
              {report?.inventoryHistoryMeta?.note && (
                <div className="text-slate-400">
                  {report.inventoryHistoryMeta.note}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Expanded Drilldown Section (Stage 5.2) */}
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
                  <strong>{selectedDrilldown.soldCount} шт.</strong> (прямых: {selectedDrilldown.directSoldCount}, маркетологи: {selectedDrilldown.marketerSoldCount}, не опр.: {selectedDrilldown.unspecifiedSoldCount}), площадь:{' '}
                  <strong>{formatArea(selectedDrilldown.soldAreaM2)} м²</strong>, сумма продаж:{' '}
                  <strong>${formatMoneyUsd(selectedDrilldown.salesAmountUsd)}</strong>, погашено:{' '}
                  <strong>${formatMoneyUsd(selectedDrilldown.totalSettledUsd)}</strong> ({formatPercent(selectedDrilldown.paidPercent)}), долг:{' '}
                  <strong>${formatMoneyUsd(selectedDrilldown.remainingDebtUsd)}</strong>, утв. комиссия:{' '}
                  <strong>${formatMoneyUsd(selectedDrilldown.approvedCommissionUsd)}</strong>
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
                <table className="print-table w-full min-w-[1400px] text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      <th className="py-3 px-3.5">Дата и номер договора</th>
                      <th className="py-3 px-3 text-center">Блок / Кв.</th>
                      <th className="py-3 px-3 text-right">Площадь, м²</th>
                      <th className="py-3 px-3.5 text-right">Договорная стоимость, USD</th>
                      <th className="py-3 px-3 text-right">Получено деньгами, USD</th>
                      <th className="py-3 px-3 text-right">Зачтено бартером, USD</th>
                      <th className="py-3 px-3 text-right">Всего погашено, USD</th>
                      <th className="py-3 px-3 text-right">Остаток долга, USD</th>
                      <th className="py-3 px-3">Источник продажи / Партнёр</th>
                      <th className="py-3 px-3">Менеджер TOZON</th>
                      <th className="py-3 px-3 text-right">Комиссия маркетолога (Ставка / Начисл. / Утв. / Выпл. / Остаток)</th>
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
                        <td className="py-3 px-3 text-right font-semibold text-emerald-700 whitespace-nowrap">
                          {formatMoneyUsd(apt.paidCashUsd)}
                        </td>
                        <td className="py-3 px-3 text-right font-semibold text-indigo-700 whitespace-nowrap">
                          {formatMoneyUsd(apt.paidBarterUsd)}
                        </td>
                        <td className="py-3 px-3 text-right font-bold text-emerald-800 whitespace-nowrap">
                          <div>{formatMoneyUsd(apt.totalSettledUsd)}</div>
                          <div className="text-[10px] font-medium text-emerald-600">
                            {formatPercent(apt.paidPercent)}
                          </div>
                        </td>
                        <td className="py-3 px-3 text-right font-bold text-amber-800 whitespace-nowrap">
                          <div>{formatMoneyUsd(apt.remainingDebtUsd)}</div>
                          <div className="text-[10px] font-medium text-amber-700">
                            {formatPercent(apt.debtPercent)}
                          </div>
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-bold ${
                              SOURCE_BADGE_STYLES[apt.salesSource] || SOURCE_BADGE_STYLES.UNSPECIFIED
                            }`}
                          >
                            {apt.salesSourceLabel || 'Источник не определён'}
                          </span>
                          {apt.salesSource === 'MARKETER' && (
                            <div className="text-[11px] font-semibold text-indigo-700 mt-0.5">
                              Партнёр: {apt.marketingPartnerName || '—'}
                              {apt.marketerName ? ` (${apt.marketerName})` : ''}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap text-xs font-semibold text-slate-700">
                          {apt.managerName || '—'}
                        </td>
                        <td className="py-3 px-3 text-right whitespace-nowrap text-xs">
                          {apt.salesSource === 'MARKETER' ? (
                            <div>
                              <div className="font-bold text-slate-900">
                                {apt.commissionRatePercent || 0}% • Начисл: ${formatMoneyUsd(apt.calculatedCommissionUsd)} | Утв: ${formatMoneyUsd(apt.approvedCommissionUsd)}
                              </div>
                              <div className="text-[11px] text-slate-500">
                                Выпл: ${formatMoneyUsd(apt.paidCommissionUsd)} | Остаток: <strong>${formatMoneyUsd(apt.remainingCommissionUsd)}</strong> ({apt.commissionStatusLabel})
                              </div>
                            </div>
                          ) : (
                            <span className="text-[11px] font-semibold text-slate-400">
                              0,00 USD ({apt.salesSource === 'DIRECT' ? 'Прямая TOZON' : 'Не начисляется'})
                            </span>
                          )}
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
                      <td className="py-3 px-3 text-right text-emerald-700 whitespace-nowrap">
                        {formatMoneyUsd(selectedDrilldown.paidCashUsd)}
                      </td>
                      <td className="py-3 px-3 text-right text-indigo-700 whitespace-nowrap">
                        {formatMoneyUsd(selectedDrilldown.paidBarterUsd)}
                      </td>
                      <td className="py-3 px-3 text-right text-emerald-800 whitespace-nowrap">
                        {formatMoneyUsd(selectedDrilldown.totalSettledUsd)}
                      </td>
                      <td className="py-3 px-3 text-right text-amber-900 whitespace-nowrap">
                        {formatMoneyUsd(selectedDrilldown.remainingDebtUsd)}
                      </td>
                      <td colSpan={2} className="py-3 px-3 text-xs text-slate-600">
                        Прямых: {selectedDrilldown.directSoldCount} | Маркетол.: {selectedDrilldown.marketerSoldCount} | Не опр.: {selectedDrilldown.unspecifiedSoldCount}
                      </td>
                      <td className="py-3 px-3 text-right text-xs whitespace-nowrap">
                        Начисл: ${formatMoneyUsd(selectedDrilldown.calculatedCommissionUsd)} | Утв: ${formatMoneyUsd(selectedDrilldown.approvedCommissionUsd)} | К выпл: ${formatMoneyUsd(selectedDrilldown.remainingCommissionUsd)}
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

      {/* Marketing Partners Management Modal (ADMIN) */}
      {isPartnersModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-indigo-600" />
                <h3 className="text-base font-extrabold text-slate-900">
                  Справочник маркетинговых партнёров (внешних маркетологов)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsPartnersModalOpen(false);
                  setEditingPartner(null);
                  setPartnerModalError('');
                }}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Add / Edit Partner Form */}
            <form onSubmit={handleSavePartner} className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-700">
                {editingPartner ? `Редактирование партнёра: ${editingPartner.name}` : 'Добавить маркетингового партнёра'}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Наименование партнёра <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={partnerForm.name}
                    onChange={(e) => setPartnerForm((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="Название агентства / партнёра"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Контактное лицо
                  </label>
                  <input
                    type="text"
                    value={partnerForm.contactPerson}
                    onChange={(e) => setPartnerForm((prev) => ({ ...prev, contactPerson: e.target.value }))}
                    placeholder="ФИО руководителя / агента"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Телефон
                  </label>
                  <input
                    type="text"
                    value={partnerForm.phone}
                    onChange={(e) => setPartnerForm((prev) => ({ ...prev, phone: e.target.value }))}
                    placeholder="+992..."
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Тип комиссии
                  </label>
                  <select
                    value={partnerForm.commissionType}
                    onChange={(e) => setPartnerForm((prev) => ({ ...prev, commissionType: e.target.value }))}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs"
                  >
                    <option value="PERCENT">Процент от суммы договора (%)</option>
                    <option value="NONE">Индивидуально по сделке (0% по умолчанию)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Ставка комиссии (%)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    disabled={partnerForm.commissionType !== 'PERCENT'}
                    value={partnerForm.commissionRatePercent}
                    onChange={(e) => setPartnerForm((prev) => ({ ...prev, commissionRatePercent: e.target.value }))}
                    placeholder="Например: 3.0"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs disabled:opacity-50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Дата начала сотрудничества
                  </label>
                  <input
                    type="date"
                    value={partnerForm.cooperationStartDate}
                    onChange={(e) => setPartnerForm((prev) => ({ ...prev, cooperationStartDate: e.target.value }))}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Условия начисления комиссии
                  </label>
                  <input
                    type="text"
                    value={partnerForm.commissionTerms}
                    onChange={(e) => setPartnerForm((prev) => ({ ...prev, commissionTerms: e.target.value }))}
                    placeholder="Например: После подписания договора и получения первого взноса"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Примечание
                  </label>
                  <input
                    type="text"
                    value={partnerForm.notes}
                    onChange={(e) => setPartnerForm((prev) => ({ ...prev, notes: e.target.value }))}
                    placeholder="Дополнительная информация"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs"
                  />
                </div>
              </div>

              {partnerModalError && (
                <div className="text-xs font-semibold text-rose-600">{partnerModalError}</div>
              )}

              <div className="flex items-center justify-end gap-2">
                {editingPartner && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingPartner(null);
                      setPartnerForm({
                        name: '',
                        contactPerson: '',
                        phone: '',
                        commissionType: 'NONE',
                        commissionRatePercent: '',
                        commissionTerms: '',
                        cooperationStartDate: '',
                        notes: '',
                        isActive: true
                      });
                    }}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700"
                  >
                    Отмена
                  </button>
                )}
                <button
                  type="submit"
                  disabled={savingPartner}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>{savingPartner ? 'Сохранение...' : editingPartner ? 'Сохранить изменения' : 'Добавить партнёра'}</span>
                </button>
              </div>
            </form>

            {/* Partners List */}
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                  <tr>
                    <th className="py-2.5 px-3">Наименование</th>
                    <th className="py-2.5 px-3">Контакт / Телефон</th>
                    <th className="py-2.5 px-3 text-right">Ставка комиссии</th>
                    <th className="py-2.5 px-3">Условия</th>
                    <th className="py-2.5 px-3 text-right">Действие</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {marketingPartners.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-slate-400">
                        Маркетинговые партнёры ещё не добавлены
                      </td>
                    </tr>
                  ) : (
                    marketingPartners.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-bold text-slate-900">{p.name}</td>
                        <td className="py-2.5 px-3 text-slate-600">
                          {[p.contactPerson, p.phone].filter(Boolean).join(' • ') || '—'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-semibold text-indigo-700">
                          {p.commissionRatePercent > 0 ? `${p.commissionRatePercent}%` : 'Не задана (0%)'}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600">{p.commissionTerms || '—'}</td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingPartner(p);
                              setPartnerForm({
                                name: p.name || '',
                                contactPerson: p.contactPerson || '',
                                phone: p.phone || '',
                                commissionType: p.commissionType || 'PERCENT',
                                commissionRatePercent: String(p.commissionRatePercent || ''),
                                commissionTerms: p.commissionTerms || '',
                                cooperationStartDate: p.cooperationStartDate || '',
                                notes: p.notes || '',
                                isActive: p.isActive !== false
                              });
                            }}
                            className="inline-flex items-center gap-1 text-indigo-600 hover:underline font-semibold"
                          >
                            <Pencil className="h-3 w-3" />
                            <span>Изменить</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

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
