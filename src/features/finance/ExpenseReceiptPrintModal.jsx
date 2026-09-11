import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Printer, ArrowLeft, Receipt } from 'lucide-react';
import { numberToWordsTJ, numberToWordsRU } from '../../utils/numberToWords';
import { useModalDismiss } from '../../hooks/useModalDismiss';
import { getRkoBasisText } from '../../utils/receiptBasis';

export const ExpenseReceiptPrintModal = ({ expense, onClose, initialLang = 'TJ' }) => {
  const [lang, setLang] = useState(initialLang);
  const [appendix, setAppendix] = useState(expense?.attachment || expense?.appendix || '');

  const { requestClose } = useModalDismiss({
    isOpen: Boolean(expense),
    onClose
  });

  useEffect(() => {
    document.body.classList.add('has-print-modal');
    return () => {
      document.body.classList.remove('has-print-modal');
    };
  }, []);

  if (!expense) return null;

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

  // Date breakdown
  const expenseDateObj = expense.expense_date 
    ? new Date(expense.expense_date) 
    : (expense.date ? new Date(expense.date) : new Date());
  const validDate = !isNaN(expenseDateObj.getTime()) ? expenseDateObj : new Date();

  const dayStr = String(validDate.getDate()).padStart(2, '0');
  const monthNumStr = String(validDate.getMonth() + 1).padStart(2, '0');
  const yearStr = String(validDate.getFullYear());

  // Amount & Currency (ALWAYS in TJS / Сомони for official RT cash orders)
  let rawAmount = 0;
  if (expense.cash_amount !== undefined && expense.cash_currency === 'TJS') {
    rawAmount = Number(expense.cash_amount);
  } else if (expense.amount !== undefined) {
    rawAmount = Number(expense.amount);
  } else if (expense.amount_minor !== undefined) {
    rawAmount = Number(expense.amount_minor) / 100;
  }

  const descFull = String(expense.description || expense.comment || '');

  // Check if explicit TJS amount was recorded in the operation description
  const tjsMatch = descFull.match(/(?:•|\b)\s*(?:Внесено в кассу:\s*)?([\d\s\u00A0]+(?:[.,]\d+)?)\s*(?:TJS|смн|сомонӣ|сомони)\b/i);
  let explicitTjs = null;
  if (tjsMatch && tjsMatch[1]) {
    const cleanNumStr = tjsMatch[1].replace(/[\s\u00A0]/g, '').replace(',', '.');
    const parsed = parseFloat(cleanNumStr);
    if (!isNaN(parsed) && parsed > 0) {
      explicitTjs = parsed;
    }
  }

  // 1. Structured rate saved in DB (historical snapshot from auto-conversion)
  let structuredRate = null;
  const rawStructured = expense.exchange_rate ?? expense.rate;
  if (rawStructured !== undefined && rawStructured !== null && rawStructured !== '') {
    const num = Number(rawStructured);
    if (!isNaN(num) && num > 0) {
      structuredRate = num;
    }
  }

  // 2. Safely extracted rate from historic operation comment e.g. (Курс: 9.4)
  let historicRate = null;
  const rateMatch = descFull.match(/(?:Курс|курсу|Қурб)[:\s]+([\d]+(?:[.,]\d+)?)/i);
  if (rateMatch && rateMatch[1]) {
    const parsedRate = parseFloat(rateMatch[1].replace(',', '.'));
    if (!isNaN(parsedRate) && parsedRate > 0) {
      historicRate = parsedRate;
    }
  }

  // Mandatory source priority:
  // 1. Structured operation rate (saved in DB)
  // 2. Historic comment rate
  // 3. Null (strictly NO fallback, NO 9.27, NO default rate)
  const effectiveRate = structuredRate || historicRate || null;

  const expenseCur = (expense.cash_currency || expense.currency || 'TJS').toUpperCase();

  let amountTJS = rawAmount;
  if (expenseCur === 'TJS') {
    amountTJS = rawAmount;
  } else if (explicitTjs !== null) {
    amountTJS = explicitTjs;
  } else if (expenseCur === 'USD') {
    amountTJS = effectiveRate ? rawAmount * effectiveRate : rawAmount;
  }

  const amountNumber = Number(amountTJS.toFixed(2));
  const amountFormatted = amountNumber.toLocaleString('ru-RU', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  // USD Equivalent: prefer saved amount_usd, then calculate from rate
  let amountUSD = null;
  
  // Priority 1: saved amount_usd from DB (historical snapshot)
  if (expense.amount_usd !== undefined && expense.amount_usd !== null) {
    const savedUsd = Number(expense.amount_usd);
    if (!isNaN(savedUsd) && savedUsd > 0) {
      amountUSD = savedUsd;
    }
  }
  
  // Priority 2: calculate from effectiveRate
  if (amountUSD === null && effectiveRate && effectiveRate > 0) {
    if (expenseCur === 'USD' && rawAmount > 0 && rawAmount !== explicitTjs) {
      amountUSD = rawAmount;
    } else if (amountTJS > 0) {
      amountUSD = amountTJS / effectiveRate;
    }
  }

  const hasValidExchangeData = Boolean(
    effectiveRate &&
    effectiveRate > 0 &&
    !isNaN(effectiveRate) &&
    isFinite(effectiveRate) &&
    amountUSD &&
    amountUSD > 0 &&
    !isNaN(amountUSD) &&
    isFinite(amountUSD)
  );

  const rateFormatted = hasValidExchangeData
    ? effectiveRate.toLocaleString('ru-RU', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 4,
      }).replace('.', ',')
    : null;

  const amountUsdFormatted = hasValidExchangeData
    ? `${Number(amountUSD.toFixed(2)).toLocaleString('ru-RU', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })} USD`
    : null;

  const currency = 'TJS'; // Always TJS (Сомони)
  const wordsFormatted = isTJ 
    ? numberToWordsTJ(amountNumber, 'TJS')
    : numberToWordsRU(amountNumber, 'TJS');

  // Document Number
  const docNumber = expense.reference 
    ? String(expense.reference).replace(/^[^\d]+/g, '') || expense.id || '1'
    : expense.id || '1';

  // Recipient
  const recipientName = (expense.recipient || '—').trim();

  // Ground / Basis - strictly primary data via centralized helper
  const basisText = getRkoBasisText({ expense, lang });

  // Appendix / Attached document (only if explicitly specified)
  const appendixText = expense.attachment ? String(expense.attachment).trim() : '';

  const companyTitle = cleanCompanyName(expense.developer_name);

  return createPortal(
    <div className="print-portal-root fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs p-2 sm:p-6 flex justify-center animate-in fade-in print:static print:p-0 print:m-0 print:bg-white print:overflow-visible print:block print:h-auto">
      <div className="print-document-root relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col my-auto border border-slate-200 print:border-none print:shadow-none print:rounded-none print:max-w-none print:w-full print:overflow-visible print:m-0 print:p-0 print:static print:block print:h-auto">
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
            <span className="text-xs font-bold text-rose-400 flex items-center gap-1">
              <Receipt className="h-3.5 w-3.5" /> {isTJ ? 'Ордери содироти хазинавӣ (РКО)' : 'Расходный кассовый ордер (РКО)'}
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
                    ? 'bg-rose-600 text-white shadow-xs'
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
                    ? 'bg-rose-600 text-white shadow-xs'
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

        {/* OFFICIAL RKO DOCUMENT (ОРДЕРИ СОДИРОТИ ХАЗИНАВИ) */}
        <div id="print-section" className="p-6 sm:p-10 text-black font-serif select-text bg-white">
          <div className="relative border border-black p-6 sm:p-8 space-y-4 max-w-3xl mx-auto overflow-hidden">
            {expense?.status === 'VOIDED' && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-10">
                <div className="text-red-500/20 text-5xl sm:text-7xl font-black uppercase tracking-widest -rotate-45 border-4 sm:border-8 border-red-500/20 p-6 rounded-3xl text-center">
                  АННУЛИРОВАН
                  <div className="text-xs font-bold tracking-normal mt-1">{expense.void_reason || expense.voidReason || 'REENTERED_VIA_ATOMIC_CASH_TRANSFER'}</div>
                </div>
              </div>
            )}
            
            {/* Top Company Header */}
            <div className="border-b-2 border-black pb-0.5 inline-block font-bold text-sm sm:text-base tracking-wide">
              {companyTitle}
            </div>

            {/* Main Title */}
            <div className="text-center pt-1">
              <h2 className="text-sm sm:text-base font-bold uppercase tracking-wide">
                {isTJ ? 'ОРДЕРИ СОДИРОТИ ХАЗИНАВИ №' : 'РАСХОДНЫЙ КАССОВЫЙ ОРДЕР №'}{' '}
                <span className="underline font-sans">{docNumber}</span>
              </h2>
            </div>

            {/* Date Table */}
            <div className="flex justify-center">
              <table className="border-collapse border border-black text-center text-xs font-sans">
                <thead>
                  <tr className="bg-slate-50 font-bold border-b border-black">
                    <th className="border border-black px-6 py-0.5">{isTJ ? 'Рӯз' : 'День'}</th>
                    <th className="border border-black px-8 py-0.5">{isTJ ? 'Моҳ' : 'Месяц'}</th>
                    <th className="border border-black px-6 py-0.5">{isTJ ? 'Сол' : 'Год'}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-black px-6 py-0.5 font-bold">{dayStr}</td>
                    <td className="border border-black px-8 py-0.5 font-bold">{monthNumStr}</td>
                    <td className="border border-black px-6 py-0.5 font-bold">{yearStr}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Account Coding Table */}
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-black text-center text-[10px] sm:text-[11px] font-sans">
                <thead>
                  <tr className="bg-slate-50 font-semibold border-b border-black leading-tight">
                    <th className="border border-black p-1">{isTJ ? 'Ҳисоби муросилотӣ, ҳисоботи иловагӣ' : 'Корреспондирующий счет, субсчет'}</th>
                    <th className="border border-black p-1">{isTJ ? 'Рамзи ҳисоби таҳлилӣ' : 'Код аналитического учета'}</th>
                    <th className="border border-black p-1 font-bold">{isTJ ? 'Маблағ' : 'Сумма'}</th>
                    <th className="border border-black p-1">{isTJ ? 'Рамзи таъминоти мақсаднок' : 'Код целевого назначения'}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="h-8">
                    <td className="border border-black p-1"></td>
                    <td className="border border-black p-1"></td>
                    <td className="border border-black p-1 font-bold font-sans text-xs sm:text-sm align-middle">
                      {amountFormatted}
                    </td>
                    <td className="border border-black p-1 font-sans text-[10px] sm:text-[11px] leading-tight text-center font-medium align-middle">
                      {hasValidExchangeData ? (
                        <>
                          <div>{isTJ ? 'Қурб' : 'Курс'}: {rateFormatted}</div>
                          <div className="font-bold text-slate-900">{amountUsdFormatted}</div>
                        </>
                      ) : null}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Recipient Line */}
            <div className="text-xs sm:text-sm pt-1">
              <div className="flex items-baseline gap-2">
                <span className="shrink-0 font-bold text-slate-900">
                  {isTJ ? 'Дода шуд ба:' : 'Выдать:'}
                </span>
                <span className="grow border-b border-black font-medium pb-0.5">
                  {recipientName}
                </span>
              </div>
            </div>

            {/* Basis Line */}
            <div className="text-xs sm:text-sm">
              <div className="flex items-start gap-2 leading-relaxed">
                <span className="shrink-0 font-bold text-slate-900 pt-0.5">
                  {isTJ ? 'Асос:' : 'Основание:'}
                </span>
                <div className="grow font-medium pb-0.5 leading-relaxed min-w-0 break-words underline underline-offset-4 decoration-black/60 decoration-1">
                  {basisText}
                </div>
              </div>
            </div>

            {/* Amount in words */}
            <div className="border-b border-black pb-0.5 text-xs sm:text-sm font-medium leading-relaxed">
              {wordsFormatted}
            </div>

            {/* Appendix */}
            <div className="text-xs sm:text-sm">
              <div className="flex items-baseline gap-2">
                <span className="shrink-0 font-bold text-slate-900">
                  {isTJ ? 'Замима:' : 'Приложение:'}
                </span>
                <input
                  type="text"
                  value={appendix}
                  onChange={e => setAppendix(e.target.value)}
                  placeholder={isTJ ? 'Шартнома / Чек / Ҳуҷҷат...' : 'Договор / Чек / Документ...'}
                  className="grow border-b border-black font-medium pb-0.5 bg-transparent outline-none placeholder:text-slate-300 placeholder:italic print:placeholder:text-transparent"
                />
              </div>
            </div>

            {/* Management Signatures */}
            <div className="grid grid-cols-2 gap-8 pt-2 text-xs sm:text-sm">
              <div className="flex items-baseline gap-2">
                <span className="shrink-0 font-bold">{isTJ ? 'Роҳбар' : 'Руководитель'}</span>
                <span className="grow border-b border-black"></span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="shrink-0 font-bold">{isTJ ? 'Сармуҳосиб' : 'Главный бухгалтер'}</span>
                <span className="grow border-b border-black"></span>
              </div>
            </div>

            {/* Received Amount Line */}
            <div className="pt-2 text-xs sm:text-sm">
              <div className="flex items-baseline gap-2">
                <span className="shrink-0 font-bold">{isTJ ? 'Қабул кард' : 'Получил'}</span>
                <span className="grow border-b border-black"></span>
                <span className="shrink-0 font-sans">{isTJ ? 'сомонӣ' : (currency === 'USD' ? 'долларов' : 'сомони')}</span>
                <span className="w-16 border-b border-black"></span>
                <span className="shrink-0 font-sans">{isTJ ? 'дирам' : (currency === 'USD' ? 'центов' : 'дирамов')}</span>
              </div>
            </div>

            {/* Date and Signature of Recipient */}
            <div className="grid grid-cols-2 gap-8 pt-1 text-xs sm:text-sm">
              <div className="flex items-baseline gap-1">
                <span className="font-sans">"____" ______________ {yearStr} {isTJ ? 'с.' : 'г.'}</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="shrink-0 font-bold">{isTJ ? 'Имзо' : 'Подпись'}</span>
                <span className="grow border-b border-black"></span>
              </div>
            </div>

            {/* Document / Passport Details */}
            <div className="text-xs sm:text-sm pt-1">
              <div className="flex items-baseline gap-2">
                <span className="shrink-0 font-bold text-slate-900">
                  {isTJ ? 'Ҳуҷҷат:' : 'По документу:'}
                </span>
                <span className="grow border-b border-black font-medium pb-0.5"></span>
              </div>
            </div>

            {/* Cashier Signature Centered */}
            <div className="pt-3 flex justify-center text-xs sm:text-sm">
              <div className="flex items-baseline gap-3 w-full max-w-sm">
                <span className="shrink-0 font-bold">{isTJ ? 'Хазинадор' : 'Кассир'}</span>
                <span className="grow border-b border-black"></span>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
