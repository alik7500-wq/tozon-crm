import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useModalDismiss } from '../../hooks/useModalDismiss';
import {
  Printer,
  ArrowLeft,
  Calendar,
  DollarSign,
  Languages,
  CheckCircle2,
  Building,
  User,
  Phone,
  FileText,
  CreditCard,
  Percent,
  Layers,
  MapPin,
  Clock,
  Sparkles,
  Globe,
  FileSpreadsheet
} from 'lucide-react';
import { formatContractNumber } from '../../utils/formatters';

export const PaymentSchedulePrintView = ({ deal, onClose, initialLang = 'TJ' }) => {
  const [lang, setLang] = useState(initialLang); // 'TJ' or 'RU'

  const { requestClose } = useModalDismiss({
    isOpen: Boolean(deal),
    onClose
  });

  useEffect(() => {
    document.body.classList.add('has-print-modal');
    return () => {
      document.body.classList.remove('has-print-modal');
    };
  }, []);

  if (!deal) return null;

  const handlePrint = () => {
    window.print();
  };

  const isTJ = lang === 'TJ';

  // Format date helper
  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}.${month}.${year}`;
  };

  // Formatter for currency numbers
  const formatMoney = (valMinor) => {
    if (valMinor === undefined || valMinor === null) return '0,00';
    const num = typeof valMinor === 'number' ? valMinor / 100 : parseFloat(valMinor);
    return num.toLocaleString('ru-RU', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  // Clean company name formatter to avoid ООО "ООО "Тозон""
  const cleanCompanyName = (rawName) => {
    let name = (rawName || 'Тозон')
      .replace(/^(ООО|ҶДММ|ЗАО|ҶСК|ЧДММ)\s*["«']?|["»']$/gi, '')
      .replace(/^["«']+|["»']+$/g, '')
      .trim();
    if (!name) name = 'Тозон';
    return isTJ ? `ҶДММ "${name}"` : `ООО "${name}"`;
  };

  const dealDate = formatDate(deal.deal_date || deal.created_at);
  const advanceDate = dealDate;

  // Schedules
  const schedules = deal.schedules || [];
  const lastSchedule = schedules.length > 0 ? schedules[schedules.length - 1] : null;
  const lastPaymentDate = lastSchedule ? formatDate(lastSchedule.due_date) : '—';

  const currency = deal.currency || 'USD';
  const currencyLabel = isTJ
    ? currency === 'USD' ? 'доллари ИМА (USD)' : 'сомонӣ (TJS)'
    : currency === 'USD' ? 'долларах США (USD)' : 'сомони (TJS)';
  const currencyShort = currency === 'USD' ? 'USD' : 'TJS';

  const areaM2 = deal.area_m2_x100
    ? (deal.area_m2_x100 / 100).toLocaleString('ru-RU', { minimumFractionDigits: 1, maximumFractionDigits: 2 })
    : deal.unit_area
    ? Number(deal.unit_area).toLocaleString('ru-RU', { minimumFractionDigits: 1, maximumFractionDigits: 2 })
    : '0';

  const pricePerM2 = formatMoney(
    deal.price_per_m2_minor || (deal.area_m2_x100 ? deal.final_price_minor / (deal.area_m2_x100 / 100) : 0)
  );
  const finalPrice = formatMoney(deal.final_price_minor || 0);
  const downPayment = formatMoney(deal.down_payment_minor || 0);

  // Total paid calculation
  const totalPaidMinor =
    (deal.payments || []).reduce((sum, p) => sum + (p.amount_minor || 0), 0) ||
    (deal.schedules || []).reduce((sum, s) => sum + (s.paid_amount_minor || 0), 0) ||
    (deal.down_payment_minor || 0);

  const remainingDebtMinor = Math.max(0, (deal.final_price_minor || 0) - totalPaidMinor);

  // Table rows: row 1 is Down Payment / Advance, rows 2..N are monthly schedules
  const tableRows = [];

  // Row 1: Advance
  tableRows.push({
    num: 1,
    planDate: advanceDate,
    planAmount: deal.down_payment_minor || 0,
    actualDate: deal.down_payment_minor > 0 ? advanceDate : '',
    actualAmount: deal.down_payment_minor > 0 ? deal.down_payment_minor : null,
    note: isTJ ? 'Маблағи пешпардохти аввал' : 'Сумма первоначального взноса',
  });

  // Remaining schedules (rows 2..N+1)
  schedules.forEach((s, idx) => {
    const isPaid = s.status === 'PAID';
    const isPartial = s.status === 'PARTIAL';
    tableRows.push({
      num: idx + 2,
      planDate: formatDate(s.due_date),
      planAmount: s.amount_minor,
      actualDate: isPaid || isPartial ? formatDate(s.updated_at || s.due_date) : '',
      actualAmount: s.paid_amount_minor > 0 ? s.paid_amount_minor : null,
      note: s.note || '',
    });
  });

  return createPortal(
    <div className="print-portal-root fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs p-2 sm:p-6 flex justify-center animate-in fade-in print:static print:p-0 print:m-0 print:bg-white print:overflow-visible print:block print:h-auto">
      <div className="print-document-root relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col my-auto border border-slate-200 print:border-none print:shadow-none print:rounded-none print:max-w-none print:w-full print:overflow-visible print:m-0 print:p-0 print:static print:block print:h-auto">
        {/* Controls bar (hidden during print) */}
        <div className="print:hidden flex items-center justify-between bg-slate-900 text-white px-4 sm:px-6 py-3.5 border-b border-slate-800 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            {onClose && (
              <button
                onClick={requestClose}
                className="flex items-center gap-1.5 text-xs font-semibold text-slate-300 hover:text-white transition cursor-pointer"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>{isTJ ? 'Бозгашт' : 'Назад'}</span>
              </button>
            )}
            <span className="text-slate-600">|</span>
            <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
              <FileSpreadsheet className="h-3.5 w-3.5" /> {isTJ ? 'Ҷадвали пардохт (Тоҷикӣ)' : 'График платежей (Русский)'}
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Language Selector */}
            <div className="flex items-center bg-slate-800 p-1 rounded-xl border border-slate-700 gap-1">
              <span className="text-[11px] font-semibold text-slate-400 pl-1.5 pr-1 flex items-center gap-1">
                <Globe className="h-3 w-3 text-blue-400" />
                <span className="hidden sm:inline">Забон / Язык:</span>
              </span>

              <button
                onClick={() => setLang('TJ')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                  lang === 'TJ'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700'
                }`}
              >
                <span>🇹🇯 Тоҷикӣ</span>
              </button>

              <button
                onClick={() => setLang('RU')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                  lang === 'RU'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700'
                }`}
              >
                <span>🇷🇺 Русский</span>
              </button>
            </div>

            <button
              onClick={handlePrint}
              className="flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 px-4 py-2 text-xs font-bold text-white shadow-md transition cursor-pointer"
            >
              <Printer className="h-4 w-4" />
              <span>{isTJ ? 'Чоп кардан / PDF' : 'Печать / PDF'}</span>
            </button>
          </div>
        </div>

        {/* PRINTABLE DOCUMENT */}
        <div id="print-section" className="p-6 sm:p-10 text-slate-900 text-xs sm:text-sm font-sans select-text bg-white">
          {/* Header Title */}
          <div className="text-center pb-3 border-b-2 border-slate-900 mb-4">
            <h1 className="text-base sm:text-lg font-black tracking-tight uppercase text-slate-900">
              {isTJ
                ? 'Ҷадвали пардохт ба Шартномаи иштироки ҳиссагӣ дар сохтмон'
                : 'График платежей к Договору долевого участия в строительстве'}
            </h1>
          </div>

          {/* Key-Value Details */}
          <div className="space-y-1.5 font-medium text-xs sm:text-sm pb-4">
            <div className="flex justify-between items-baseline border-b border-dotted border-slate-300 pb-0.5">
              <span className="font-bold text-slate-900">{isTJ ? 'Рақами Шартнома' : 'Номер Договора'}</span>
              <span className="font-black text-slate-900 text-sm sm:text-base">{formatContractNumber(deal.contract_number)}</span>
            </div>

            <div className="flex justify-between items-baseline border-b border-dotted border-slate-300 pb-0.5">
              <span className="font-bold text-slate-900">{isTJ ? 'Ному насаби Ҳиссагузор' : 'ФИО Дольщика'}</span>
              <span className="font-bold text-slate-900 underline text-right">{deal.lead_name || deal.buyer_name || '—'}</span>
            </div>

            <div className="flex justify-between items-baseline border-b border-dotted border-slate-300 pb-0.5">
              <span>{isTJ ? 'Санаи бастани Шартнома' : 'Дата заключения Договора'}</span>
              <span className="font-semibold text-slate-800">{dealDate}</span>
            </div>

            <div className="flex justify-between items-baseline border-b border-dotted border-slate-300 pb-0.5">
              <span>{isTJ ? 'Санаи пешпардохти аввал (аванс)' : 'Дата первого взноса (аванс)'}</span>
              <span className="font-semibold text-slate-800">{advanceDate}</span>
            </div>

            <div className="flex justify-between items-baseline border-b border-dotted border-slate-300 pb-0.5">
              <span>{isTJ ? 'Санаи пардохти охирон' : 'Дата последнего платежа'}</span>
              <span className="font-semibold text-slate-800">{lastPaymentDate}</span>
            </div>

            <div className="flex justify-between items-baseline border-b border-dotted border-slate-300 pb-0.5">
              <span>{isTJ ? 'Суроғаи Ҳиссагузор' : 'Адрес Дольщика'}</span>
              <span className="text-right text-slate-800">{deal.registration_address || (isTJ ? 'Вил. Суғд, ш. Хуҷанд' : 'Согдийская обл., г. Худжанд')}</span>
            </div>

            <div className="flex justify-between items-baseline border-b border-dotted border-slate-300 pb-0.5">
              <span>{isTJ ? 'Рақами телефони Ҳиссагузор' : 'Номер телефона Дольщика'}</span>
              <span className="font-semibold text-slate-800">{deal.lead_phone || '—'}</span>
            </div>

            <div className="flex justify-between items-baseline border-b border-dotted border-slate-300 pb-0.5">
              <span>{isTJ ? 'РМА (ИНН)-и Ҳиссагузор' : 'ИНН (РМА) Дольщика'}</span>
              <span className="font-semibold font-mono text-slate-800">{deal.inn || '—'}</span>
            </div>

            <div className="flex justify-between items-baseline border-b border-dotted border-slate-300 pb-0.5">
              <span>{isTJ ? 'Эзоҳ' : 'Примечание'}</span>
              <span className="text-right text-slate-700">
                {deal.project_name
                  ? `${deal.project_name}, ${isTJ ? 'кв. №' : 'кв. №'}${deal.unit_number || ''}`
                  : '—'}
              </span>
            </div>

            <div className="flex justify-between items-baseline border-b border-dotted border-slate-300 pb-0.5 pt-1">
              <span>{isTJ ? 'Масоҳати умумии хона метри мураббаъ' : 'Общая площадь квартиры (кв.м)'}</span>
              <span className="font-bold underline text-slate-900">{areaM2}</span>
            </div>

            <div className="flex justify-between items-baseline border-b border-dotted border-slate-300 pb-0.5">
              <span>{isTJ ? `Нархи 1 метри мураббаъ бо ${currencyLabel}` : `Цена 1 кв.м в ${currencyLabel}`}</span>
              <span className="font-bold underline text-slate-900">{pricePerM2}</span>
            </div>

            <div className="flex justify-between items-baseline border-b border-dotted border-slate-300 pb-0.5">
              <span className="font-bold text-slate-900">{isTJ ? `Маблағи умумии хона бо ${currencyLabel}` : `Общая стоимость квартиры в ${currencyLabel}`}</span>
              <span className="font-black underline text-slate-900 text-sm sm:text-base">{finalPrice}</span>
            </div>

            <div className="flex justify-between items-baseline border-b border-dotted border-slate-300 pb-0.5">
              <span className="font-bold text-slate-900">{isTJ ? `Маблағи пешпардохти аввал (аванс) бо ${currencyLabel}` : `Сумма первого взноса (аванс) в ${currencyLabel}`}</span>
              <span className="font-black underline text-slate-900 text-sm sm:text-base">{downPayment}</span>
            </div>
          </div>

          {/* Table */}
          <div className="mt-4">
            <h3 className="font-black text-xs sm:text-sm text-slate-900 mb-1.5 uppercase">
              {isTJ ? 'Ҷадвали пардохти қарз' : 'График погашения задолженности'}
            </h3>

            <table className="w-full text-[11px] sm:text-xs border-2 border-slate-900 border-collapse text-center">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-900 font-bold text-slate-900">
                  <th rowSpan="2" className="border-r border-slate-900 p-1.5 w-10 sm:w-12">
                    {isTJ ? <>№<br />б/т</> : <>№<br />п/п</>}
                  </th>
                  <th colSpan="2" className="border-r border-slate-900 p-1.5 bg-slate-200/70">
                    {isTJ ? 'Мувофиқи ҷадвал' : 'По графику (план)'}
                  </th>
                  <th colSpan="2" className="border-r border-slate-900 p-1.5 bg-slate-200/70">
                    {isTJ ? 'Дар асл' : 'По факту (оплачено)'}
                  </th>
                  <th rowSpan="2" className="p-1.5 min-w-[140px]">
                    {isTJ ? 'Эзоҳ' : 'Примечание'}
                  </th>
                </tr>
                <tr className="bg-slate-50 border-b-2 border-slate-900 font-bold text-slate-800 text-[10px] sm:text-xs">
                  <th className="border-r border-slate-900 p-1 w-20 sm:w-24">{isTJ ? 'Сана' : 'Дата'}</th>
                  <th className="border-r border-slate-900 p-1 w-24 sm:w-28">{isTJ ? 'Маблағ' : 'Сумма'}, {currencyShort}</th>
                  <th className="border-r border-slate-900 p-1 w-20 sm:w-24">{isTJ ? 'Сана' : 'Дата'}</th>
                  <th className="border-r border-slate-900 p-1 w-24 sm:w-28">{isTJ ? 'Маблағ' : 'Сумма'}, {currencyShort}</th>
                </tr>
              </thead>
              <tbody>
                {tableRows.map((row, i) => (
                  <tr key={i} className="border-b border-slate-400 hover:bg-slate-50/50">
                    <td className="border-r border-slate-900 p-1 font-semibold text-slate-900">
                      {row.num}
                    </td>
                    <td className="border-r border-slate-900 p-1 font-medium text-slate-800">
                      {row.planDate}
                    </td>
                    <td className="border-r border-slate-900 p-1 text-right pr-2 font-bold text-slate-900">
                      {formatMoney(row.planAmount)}
                    </td>
                    <td className="border-r border-slate-900 p-1 text-slate-700">
                      {row.actualDate || ''}
                    </td>
                    <td className="border-r border-slate-900 p-1 text-right pr-2 font-bold text-slate-900">
                      {row.actualAmount !== null ? formatMoney(row.actualAmount) : ''}
                    </td>
                    <td className="p-1 text-left pl-2 text-slate-700 truncate max-w-[180px]">
                      {row.note}
                    </td>
                  </tr>
                ))}

                {/* ITOGO ROW */}
                <tr className="border-t-2 border-b border-slate-900 bg-slate-100 font-black text-xs sm:text-sm">
                  <td colSpan="2" className="border-r border-slate-900 p-1.5 text-left pl-3 uppercase">
                    {isTJ ? 'ҶАМЪ (ИТОГО)' : 'ИТОГО'}
                  </td>
                  <td className="border-r border-slate-900 p-1.5 text-right pr-2">
                    {finalPrice}
                  </td>
                  <td className="border-r border-slate-900 p-1.5"></td>
                  <td className="border-r border-slate-900 p-1.5 text-right pr-2">
                    {formatMoney(totalPaidMinor)}
                  </td>
                  <td className="p-1.5"></td>
                </tr>

                {/* BAKIYAI KARZ ROW */}
                <tr className="font-black text-xs sm:text-sm bg-slate-50">
                  <td colSpan="4" className="border-r border-slate-900 p-1.5 text-right pr-4 uppercase text-slate-900">
                    {isTJ ? 'БАҚИЯИ ҚАРЗ:' : 'ОСТАТОК ДОЛГА:'}
                  </td>
                  <td className="border-r border-slate-900 p-1.5 text-right pr-2 underline text-rose-700 font-black">
                    {formatMoney(remainingDebtMinor)}
                  </td>
                  <td className="p-1.5"></td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Signatures */}
          <div className="print-avoid-break border-t border-slate-300 pt-8 mt-12 grid grid-cols-2 gap-12 font-sans text-xs sm:text-sm">
            <div>
              <p className="font-bold text-slate-900 mb-3 uppercase tracking-wider">
                {isTJ ? 'ФУРӮШАНДА:' : 'ПРОДАВЕЦ:'}
              </p>
              <p className="font-semibold text-slate-900">{cleanCompanyName(deal.developer_name)}</p>
              <p className="text-slate-600">{isTJ ? 'Менеҷер:' : 'Менеджер:'} {deal.manager_name || 'Admin'}</p>
              <div className="mt-10 border-b border-slate-400 w-48 sm:w-56"></div>
              <p className="text-[10px] text-slate-400 mt-1">{isTJ ? '(имзо, М.М.)' : '(подпись, М.П.)'}</p>
            </div>

            <div>
              <p className="font-bold text-slate-900 mb-3 uppercase tracking-wider">
                {isTJ ? 'ХАРИДОР:' : 'ПОКУПАТЕЛЬ:'}
              </p>
              <p className="font-semibold text-slate-900">{deal.lead_name || deal.buyer_name || '—'}</p>
              {deal.inn && (
                <p className="text-slate-600 font-mono text-[11px]">{isTJ ? 'РМА:' : 'ИНН:'} {deal.inn}</p>
              )}
              <p className="text-slate-600">{isTJ ? 'Тел:' : 'Тел:'} {deal.lead_phone || '—'}</p>
              <div className="mt-10 border-b border-slate-400 w-48 sm:w-56"></div>
              <p className="text-[10px] text-slate-400 mt-1">{isTJ ? '(имзои Харидор)' : '(подпись Покупателя)'}</p>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
