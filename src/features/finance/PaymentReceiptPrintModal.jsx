import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Printer, ArrowLeft, Globe, Receipt, CheckCircle2 } from 'lucide-react';
import { formatContractNumber } from '../../utils/formatters';

export const PaymentReceiptPrintModal = ({ payment, deal, onClose, initialLang = 'TJ' }) => {
  const [lang, setLang] = useState(initialLang);

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
    let name = (rawName || 'Тозон')
      .replace(/^(ООО|ҶДММ|ЗАО|ҶСК|ЧДММ)\s*["«']?|["»']$/gi, '')
      .replace(/^["«']+|["»']+$/g, '')
      .trim();
    if (!name) name = 'Тозон';
    return isTJ ? `ҶДММ "${name}"` : `ООО "${name}"`;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}.${month}.${year}`;
  };

  const amountMinor = payment.amount_minor || (payment.amount ? payment.amount * 100 : 0);
  const amountFormatted = (amountMinor / 100).toLocaleString('ru-RU', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const currency = payment.currency || deal?.currency || 'USD';
  const currencyShort = currency === 'USD' ? 'USD' : 'USD';

  return createPortal(
    <div className="print-portal-root fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs p-2 sm:p-6 flex justify-center animate-in fade-in print:static print:p-0 print:m-0 print:bg-white print:overflow-visible print:block print:h-auto">
      <div className="print-document-root relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col my-auto border border-slate-200 print:border-none print:shadow-none print:rounded-none print:max-w-none print:w-full print:overflow-visible print:m-0 print:p-0 print:static print:block print:h-auto">
        {/* Controls bar */}
        <div className="print:hidden flex items-center justify-between bg-slate-900 text-white px-4 sm:px-6 py-3.5 border-b border-slate-800 flex-wrap gap-2">
          <div className="flex items-center gap-3">
            {onClose && (
              <button
                onClick={onClose}
                className="flex items-center gap-1.5 text-xs font-semibold text-slate-300 hover:text-white transition cursor-pointer"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>{isTJ ? 'Бозгашт' : 'Назад'}</span>
              </button>
            )}
            <span className="text-slate-600">|</span>
            <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
              <Receipt className="h-3.5 w-3.5" /> {isTJ ? 'Расиди пардохт' : 'Квитанция об оплате'}
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Language Toggle */}
            <div className="flex items-center bg-slate-800 p-1 rounded-xl border border-slate-700 gap-1">
              <button
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
              onClick={handlePrint}
              className="flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 px-4 py-2 text-xs font-bold text-white shadow-md transition cursor-pointer"
            >
              <Printer className="h-4 w-4" />
              <span>{isTJ ? 'Чоп кардан' : 'Печать'}</span>
            </button>
          </div>
        </div>

        {/* PRINTABLE RECEIPT */}
        <div id="print-section" className="p-8 sm:p-12 text-slate-900 font-sans select-text bg-white space-y-6">
          {/* Header */}
          <div className="border-b-2 border-slate-900 pb-4 flex justify-between items-start">
            <div>
              <h2 className="text-lg font-black tracking-tight uppercase text-slate-900">
                {cleanCompanyName(deal?.developer_name)}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {deal?.project_address || (isTJ ? 'ш. Хуҷанд' : 'г. Худжанд')}
              </p>
            </div>
            <div className="text-right">
              <span className="text-xs font-bold uppercase text-slate-500 block">
                {isTJ ? 'РАСИДИ ПАРДОХТ' : 'КВИТАНЦИЯ К ПКО'}
              </span>
              <strong className="text-base text-slate-900 font-black">
                № {payment.payment_number || payment.id || '001'}
              </strong>
              <p className="text-xs text-slate-500 mt-0.5">
                {isTJ ? 'Сана:' : 'Дата:'} {formatDate(payment.payment_date || payment.created_at)}
              </p>
            </div>
          </div>

          {/* Details Table */}
          <div className="space-y-2.5 text-xs sm:text-sm">
            <div className="flex justify-between border-b border-dotted border-slate-300 pb-1">
              <span className="text-slate-600">{isTJ ? 'Пардохткунанда (Харидор):' : 'Плательщик (Покупатель):'}</span>
              <strong className="text-slate-900">{payment.payer_name || deal?.lead_name || deal?.buyer_name || '—'}</strong>
            </div>

            <div className="flex justify-between border-b border-dotted border-slate-300 pb-1">
              <span className="text-slate-600">{isTJ ? 'Асос (Шартнома):' : 'Основание (Договор):'}</span>
              <strong className="text-slate-900">
                {deal?.contract_number ? `${isTJ ? 'Шартномаи №' : 'Договор №'} ${formatContractNumber(deal.contract_number)}` : 'Пардохт тибқи шартнома'}
              </strong>
            </div>

            <div className="flex justify-between border-b border-dotted border-slate-300 pb-1">
              <span className="text-slate-600">{isTJ ? 'Объект ва хона:' : 'Объект и квартира:'}</span>
              <span className="text-slate-900 font-medium">
                {deal?.project_name ? `${deal.project_name}, ${isTJ ? 'Хонаи №' : 'Кв. №'}${deal.unit_number || ''}` : '—'}
              </span>
            </div>

            <div className="flex justify-between border-b border-dotted border-slate-300 pb-1">
              <span className="text-slate-600">{isTJ ? 'Усули пардохт:' : 'Способ оплаты:'}</span>
              <span className="text-slate-900 font-semibold">
                {payment.payment_method === 'BANK_TRANSFER' ? (isTJ ? 'Интиқоли бонкӣ' : 'Безналичный перевод') : (isTJ ? 'Нақдӣ (Хазина)' : 'Наличные (Касса)')}
              </span>
            </div>

            {payment.reference && (
              <div className="flex justify-between border-b border-dotted border-slate-300 pb-1">
                <span className="text-slate-600">{isTJ ? 'Рақами чек / Референс:' : 'Номер чека / Референс:'}</span>
                <span className="text-slate-900 font-medium">{payment.reference}</span>
              </div>
            )}
          </div>

          {/* Amount Box */}
          <div className="rounded-2xl border-2 border-slate-900 bg-slate-50 p-4 sm:p-5 flex justify-between items-center">
            <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-700">
              {isTJ ? 'Маблағи қабулшуда:' : 'Принятая сумма:'}
            </span>
            <span className="text-xl sm:text-2xl font-black text-slate-900">
              {amountFormatted} {currencyShort}
            </span>
          </div>

          {/* Signatures */}
          <div className="border-t border-slate-300 pt-8 mt-8 grid grid-cols-2 gap-10 text-xs">
            <div>
              <p className="font-bold text-slate-900 mb-1">{isTJ ? 'Хазинадор / Менеҷер:' : 'Кассир / Менеджер:'}</p>
              <p className="text-slate-600">{payment.created_by_name || 'Admin'}</p>
              <div className="mt-8 border-b border-slate-400 w-44"></div>
              <p className="text-[10px] text-slate-400 mt-1">{isTJ ? '(имзо, мӯҳр)' : '(подпись, М.П.)'}</p>
            </div>

            <div>
              <p className="font-bold text-slate-900 mb-1">{isTJ ? 'Пардохткунанда:' : 'Плательщик:'}</p>
              <p className="text-slate-600">{payment.payer_name || deal?.lead_name || '—'}</p>
              <div className="mt-8 border-b border-slate-400 w-44"></div>
              <p className="text-[10px] text-slate-400 mt-1">{isTJ ? '(имзо)' : '(подпись)'}</p>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
