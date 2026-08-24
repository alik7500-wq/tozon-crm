import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Printer, ArrowLeft, Receipt } from 'lucide-react';
import { formatContractNumber } from '../../utils/formatters';
import { numberToWordsTJ, numberToWordsRU } from '../../utils/numberToWords';
import { useModalDismiss } from '../../hooks/useModalDismiss';

const MONTHS_TJ = [
  'Январ', 'Феврал', 'Март', 'Апрел', 'Май', 'Июн',
  'Июл', 'Август', 'Сентябр', 'Октябр', 'Ноябр', 'Декабр'
];

const MONTHS_RU = [
  'Января', 'Февраля', 'Марта', 'Апреля', 'Мая', 'Июня',
  'Июля', 'Августа', 'Сентября', 'Октября', 'Ноября', 'Декабря'
];

export const PaymentReceiptPrintModal = ({ payment, deal, onClose, initialLang = 'TJ' }) => {
  const [lang, setLang] = useState(initialLang);

  const { requestClose } = useModalDismiss({
    isOpen: Boolean(payment),
    onClose
  });

  useEffect(() => {
    document.body.classList.add('has-print-modal');
    return () => {
      document.body.classList.remove('has-print-modal');
    };
  }, []);

  if (!payment) return null;

  const handlePrint = () => {
    window.print();
  };

  const isTJ = lang === 'TJ';

  const cleanCompanyName = (rawName) => {
    let name = (rawName || 'ТОЗОН')
      .replace(/^(ООО|ҶДММ|ЗАО|ҶСК|ЧДММ)\s*["«']?|["»']$/gi, '')
      .replace(/^["«']+|["»']+$/g, '')
      .trim();
    if (!name) name = 'ТОЗОН';
    return isTJ ? `ҶДММ "${name}"` : `ООО "${name}"`;
  };

  // Date breakdown (strictly from payment date without timezone skew)
  const rawDateStr = payment.payment_date || payment.date || (deal?.deal_date) || '';
  const dateParts = rawDateStr ? String(rawDateStr).split('T')[0].split('-') : [];
  
  let dayStr = '01';
  let monthIdx = 0;
  let yearStr = String(new Date().getFullYear());

  if (dateParts.length === 3) {
    yearStr = dateParts[0];
    monthIdx = Math.max(0, Math.min(11, parseInt(dateParts[1], 10) - 1));
    dayStr = String(dateParts[2]).padStart(2, '0');
  } else {
    const d = new Date();
    dayStr = String(d.getDate()).padStart(2, '0');
    monthIdx = d.getMonth();
    yearStr = String(d.getFullYear());
  }

  const monthStr = isTJ ? MONTHS_TJ[monthIdx] : MONTHS_RU[monthIdx];
  const fullDateFormatted = `${dayStr}.${String(monthIdx + 1).padStart(2, '0')}.${yearStr}`;

  // Amount & Currency (ALWAYS in TJS / Сомони for official RT cash orders)
  let rawAmount = 0;
  if (payment.cash_amount !== undefined && payment.cash_currency === 'TJS') {
    rawAmount = Number(payment.cash_amount);
  } else if (payment.amount !== undefined) {
    rawAmount = Number(payment.amount);
  } else if (payment.amount_minor !== undefined) {
    rawAmount = Number(payment.amount_minor) / 100;
  }

  const paymentCur = (payment.cash_currency || payment.currency || deal?.currency || 'TJS').toUpperCase();
  const rate = Number(payment.exchange_rate) || 9.27;

  let amountTJS = rawAmount;
  if (paymentCur === 'USD') {
    amountTJS = rawAmount * rate;
  }

  const amountNumber = Number(amountTJS.toFixed(2));
  const amountFormatted = amountNumber.toLocaleString('ru-RU', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const currency = 'TJS'; // Always TJS (Сомони)
  const wordsFormatted = isTJ 
    ? numberToWordsTJ(amountNumber, 'TJS')
    : numberToWordsRU(amountNumber, 'TJS');

  // Client / Payer Name
  const payerName = (
    payment.payer_name ||
    payment.clientName ||
    deal?.lead_name ||
    deal?.buyer_name ||
    '—'
  ).trim();

  // Document Number (Clean numeric or formatted PKO number)
  const docNumber = (() => {
    const raw = payment.reference || payment.payment_number || payment.id || '1';
    const cleanDigits = String(raw).replace(/\s*\(.*?\)\s*/g, '').replace(/^[^\d]+/g, '').trim();
    return cleanDigits || String(payment.id) || '1';
  })();

  // Ground / Basis
  const dealContractNum = deal?.contract_number ? formatContractNumber(deal.contract_number) : null;
  const dealDate = deal?.contract_date || deal?.deal_date || fullDateFormatted;
  const dealDateFormatted = (() => {
    if (!dealDate) return fullDateFormatted;
    const d = new Date(dealDate);
    if (isNaN(d.getTime())) return dealDate;
    return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
  })();

  const basisText = isTJ
    ? (dealContractNum 
        ? `Пардохти маблағи ҳиссагузорӣ дар асоси шартномаи № ${dealContractNum} аз ${dealDateFormatted} сол` 
        : (payment.comment || payment.contract || 'Пардохти маблағ ба хазина тибқи асос'))
    : (dealContractNum 
        ? `Оплата паевого взноса по договору № ${dealContractNum} от ${dealDateFormatted} г.` 
        : (payment.comment || payment.contract || 'Прием денежных средств в кассу предприятия'));

  const companyTitle = cleanCompanyName(deal?.developer_name);

  return createPortal(
    <div className="print-portal-root fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs p-2 sm:p-6 flex justify-center animate-in fade-in print:static print:p-0 print:m-0 print:bg-white print:overflow-visible print:block print:h-auto">
      <div className="print-document-root relative w-full max-w-5xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col my-auto border border-slate-200 print:border-none print:shadow-none print:rounded-none print:max-w-none print:w-full print:overflow-visible print:m-0 print:p-0 print:static print:block print:h-auto">
        {/* Controls bar (Hidden during print) */}
        <div className="print:hidden flex items-center justify-between bg-slate-900 text-white px-4 sm:px-6 py-3 border-b border-slate-800 flex-wrap gap-2">
          <div className="flex items-center gap-3">
            {onClose && (
              <button
                type="button"
                onClick={requestClose}
                className="flex items-center gap-1.5 text-xs font-semibold text-slate-300 hover:text-white transition cursor-pointer"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>{isTJ ? 'Бозгашт' : 'Назад'}</span>
              </button>
            )}
            <span className="text-slate-600">|</span>
            <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
              <Receipt className="h-3.5 w-3.5" /> {isTJ ? 'Ордери даромади хазинавӣ (Шакли КО-1)' : 'Приходный кассовый ордер (Форма КО-1)'}
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Language Toggle */}
            <div className="flex items-center bg-slate-800 p-1 rounded-xl border border-slate-700 gap-1">
              <button
                type="button"
                onClick={() => setLang('TJ')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  lang === 'TJ'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <span>🇹🇯 Тоҷикӣ</span>
              </button>
              <button
                type="button"
                onClick={() => setLang('RU')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  lang === 'RU'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <span>🇷🇺 Русский</span>
              </button>
            </div>

            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 px-5 py-1.5 text-xs font-bold text-white shadow-md transition cursor-pointer"
            >
              <Printer className="h-4 w-4" />
              <span>{isTJ ? 'Чоп кардан' : 'Печать'}</span>
            </button>
          </div>
        </div>

        {/* OFFICIAL DUAL-PANEL PKO DOCUMENT (Шакли КО-1) */}
        <div id="print-section" className="p-4 sm:p-8 text-black font-serif select-text bg-white">
          <div className="flex flex-row border border-black w-full">
            
            {/* LEFT PART: ОРДЕРИ ДАРОМАДИ ХАЗИНАВӢ (63% width) */}
            <div className="w-[63%] p-4 sm:p-5 border-r border-dashed border-black flex flex-col justify-between space-y-3">
              {/* Organization and Form Standard */}
              <div className="flex items-start justify-between">
                <div className="border-b-2 border-black pb-0.5 font-bold text-sm tracking-wide">
                  {companyTitle}
                </div>
                <div className="text-[11px] font-sans text-right">
                  {isTJ ? 'Шакли КО-1' : 'Форма КО-1'}
                </div>
              </div>

              {/* Title */}
              <div className="text-center">
                <h2 className="text-sm sm:text-base font-bold uppercase tracking-wide">
                  {isTJ ? 'ОРДЕРИ ДАРОМАДИ ХАЗИНАВИ №' : 'ПРИХОДНЫЙ КАССОВЫЙ ОРДЕР №'}{' '}
                  <span className="underline">{docNumber}</span>
                </h2>
              </div>

              {/* Date Table */}
              <div className="flex justify-center">
                <table className="border-collapse border border-black text-center text-xs font-sans">
                  <thead>
                    <tr className="bg-slate-50 font-bold border-b border-black">
                      <th className="border border-black px-4 py-0.5">{isTJ ? 'Рӯз' : 'День'}</th>
                      <th className="border border-black px-6 py-0.5">{isTJ ? 'Моҳ' : 'Месяц'}</th>
                      <th className="border border-black px-5 py-0.5">{isTJ ? 'Сол' : 'Год'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border border-black px-4 py-0.5 font-bold">{dayStr}</td>
                      <td className="border border-black px-6 py-0.5 font-bold">{monthStr}</td>
                      <td className="border border-black px-5 py-0.5 font-bold">{yearStr}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Account Coding Table */}
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-black text-center text-[10px] font-sans">
                  <thead>
                    <tr className="bg-slate-50 font-semibold border-b border-black leading-tight">
                      <th className="border border-black p-1 w-10">{isTJ ? '№ таб' : '№ таб'}</th>
                      <th className="border border-black p-1">{isTJ ? 'Ҳисоби муросилотӣ, ҳисоботи иловагӣ' : 'Корреспондирующий счет, субсчет'}</th>
                      <th className="border border-black p-1">{isTJ ? 'Рамзи ҳисоби таҳлилӣ' : 'Код аналитического учета'}</th>
                      <th className="border border-black p-1 font-bold">{isTJ ? 'Маблағ' : 'Сумма'}</th>
                      <th className="border border-black p-1">{isTJ ? 'Рамзи таъминоти мақсаднок' : 'Код целевого назначения'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="h-7">
                      <td className="border border-black p-1"></td>
                      <td className="border border-black p-1"></td>
                      <td className="border border-black p-1"></td>
                      <td className="border border-black p-1 font-bold font-sans text-xs">
                        {amountFormatted}
                      </td>
                      <td className="border border-black p-1"></td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Payer Line */}
              <div className="text-xs">
                <div className="flex items-baseline gap-2">
                  <span className="shrink-0 text-slate-800">
                    {isTJ ? 'Қабул карда шуд аз' : 'Принято от'}
                  </span>
                  <span className="grow border-b border-black font-bold pb-0.5">
                    {payerName}
                  </span>
                </div>
              </div>

              {/* Basis Line */}
              <div className="text-xs">
                <div className="flex items-baseline gap-2">
                  <span className="shrink-0 text-slate-800">
                    {isTJ ? 'Асос:' : 'Основание:'}
                  </span>
                  <span className="grow border-b border-black font-medium pb-0.5 leading-relaxed">
                    {basisText}
                  </span>
                </div>
              </div>

              {/* Amount in words */}
              <div className="border-b border-black pb-0.5 text-xs font-medium leading-relaxed">
                {wordsFormatted}
              </div>

              {/* Double line divider */}
              <div className="border-t-2 border-b border-black py-0.5"></div>

              {/* Application / Appendix */}
              <div className="flex items-baseline gap-2 text-xs">
                <span className="shrink-0 font-medium">{isTJ ? 'Замима:' : 'Приложение:'}</span>
                <span className="grow border-b border-black"></span>
              </div>

              {/* Signatures */}
              <div className="space-y-3 pt-1 text-xs">
                <div className="flex items-baseline gap-3">
                  <span className="w-24 shrink-0 font-bold">{isTJ ? 'Сармуҳосиб' : 'Главный бухгалтер'}</span>
                  <span className="grow border-b border-black"></span>
                </div>

                <div className="flex items-baseline gap-3">
                  <span className="w-24 shrink-0 font-bold">{isTJ ? 'Хазинадор' : 'Кассир'}</span>
                  <span className="grow border-b border-black"></span>
                </div>

                {/* Payer Signature with Explicit Full Name */}
                <div className="pt-1">
                  <div className="flex items-baseline gap-2">
                    <span className="shrink-0 font-bold text-slate-900">
                      {isTJ ? 'Пардохткунанда' : 'Плательщик'}
                    </span>
                    <span className="font-bold underline pr-2">
                      {payerName}
                    </span>
                  </div>
                  <div className="flex items-baseline gap-2 pt-1">
                    <span className="shrink-0 text-[11px] text-slate-800">
                      {isTJ ? 'супорид:' : 'сдал:'}
                    </span>
                    <span className="grow border-b border-black min-w-[120px]"></span>
                    <span className="text-[10px] text-slate-400 pl-1">
                      {isTJ ? '(имзо)' : '(подпись)'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT PART: РАСИД / КВИТАНЦИЯ (37% width) */}
            <div className="w-[37%] py-4 pr-4 pl-6 sm:py-5 sm:pr-5 sm:pl-6 relative bg-white flex flex-col justify-between space-y-3">
              {/* Vertical cutting line indicator centered on the dashed border */}
              <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 hidden md:flex flex-col items-center bg-white px-0.5 py-1 text-[7px] font-sans tracking-[0.25em] text-slate-400 font-bold uppercase select-none [writing-mode:vertical-rl] rotate-180">
                {isTJ ? 'ХАТИ БУРРИШ' : 'ЛИНИЯ ОТРЕЗА'}
              </div>

              {/* Org header */}
              <div className="text-center font-bold text-xs tracking-wide border-b border-black pb-1">
                {companyTitle}
              </div>

              {/* Title */}
              <div className="text-center">
                <h3 className="text-base font-bold tracking-[0.25em] uppercase">
                  {isTJ ? 'Р А С И Д' : 'К В И Т А Н Ц И Я'}
                </h3>
                <p className="text-[10px] text-slate-800 mt-0.5">
                  {isTJ ? 'ба ордери даромади хазинавӣ №' : 'к приходному кассовому ордеру №'} <strong className="underline font-sans">{docNumber}</strong>
                </p>
              </div>

              {/* Payer Line (NO amount under FIO!) */}
              <div className="space-y-0.5 text-xs">
                <span className="text-slate-800 block text-[10px] font-medium">
                  {isTJ ? 'Қабул карда шуд аз' : 'Принято от'}
                </span>
                <div className="border-b border-black font-bold pb-0.5 text-xs">
                  {payerName}
                </div>
              </div>

              {/* Basis Line */}
              <div className="space-y-0.5 text-xs">
                <span className="text-slate-800 block text-[10px] font-medium">
                  {isTJ ? 'Асос:' : 'Основание:'}
                </span>
                <div className="border-b border-black font-medium pb-0.5 leading-tight text-[11px]">
                  {basisText}
                </div>
              </div>

              {/* Amount in words */}
              <div className="border-b border-black pb-0.5 text-[11px] leading-tight font-medium">
                {wordsFormatted}
              </div>

              {/* Total amount summary */}
              <div className="flex items-center justify-between text-xs font-bold pt-0.5">
                <span>{isTJ ? 'Маблағ' : 'Сумма'}</span>
                <span className="font-sans text-sm font-black underline">
                  {amountFormatted} {isTJ ? 'сомонӣ' : 'сомони'}
                </span>
              </div>

              {/* Date Table */}
              <div className="flex justify-center">
                <table className="border-collapse border border-black text-center text-[10px] font-sans w-full max-w-[190px]">
                  <thead>
                    <tr className="bg-slate-50 font-bold border-b border-black text-[9px]">
                      <th className="border border-black px-2 py-0.5">{isTJ ? 'Рӯз' : 'День'}</th>
                      <th className="border border-black px-2 py-0.5">{isTJ ? 'Моҳ' : 'Месяц'}</th>
                      <th className="border border-black px-2 py-0.5">{isTJ ? 'Сол' : 'Год'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border border-black px-2 py-0.5 font-bold">{dayStr}</td>
                      <td className="border border-black px-2 py-0.5 font-bold">{monthStr}</td>
                      <td className="border border-black px-2 py-0.5 font-bold">{yearStr}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Signatures & Seal */}
              <div className="space-y-2.5 pt-1 text-xs">
                <div className="flex items-baseline gap-2">
                  <span className="w-20 shrink-0 font-bold text-[10px]">{isTJ ? 'Сармуҳосиб' : 'Главный бухгалтер'}</span>
                  <span className="grow border-b border-black"></span>
                </div>

                <div className="flex items-baseline gap-2">
                  <span className="w-20 shrink-0 font-bold text-[10px]">{isTJ ? 'Хазинадор' : 'Кассир'}</span>
                  <span className="grow border-b border-black"></span>
                </div>

                <div className="pt-1 text-center text-[9px] text-slate-400 font-sans tracking-widest uppercase">
                  {isTJ ? 'М.П. / МӮҲР' : 'М.П. / ПЕЧАТЬ'}
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
