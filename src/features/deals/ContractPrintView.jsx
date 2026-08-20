import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Printer,
  ArrowLeft,
  FileSpreadsheet,
  FileText,
  Globe
} from 'lucide-react';

export const ContractPrintView = ({ deal, onClose, initialLang = 'TJ' }) => {
  const [activeTab, setActiveTab] = useState('CONTRACT'); // 'CONTRACT' or 'SCHEDULE'
  const [lang, setLang] = useState(initialLang); // 'TJ' (Тоҷикӣ) or 'RU' (Русский)

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

  // Format currency numbers
  const formatMoney = (valMinor) => {
    if (valMinor === undefined || valMinor === null) return '0,00';
    const num = typeof valMinor === 'number' ? valMinor / 100 : parseFloat(valMinor);
    return num.toLocaleString('ru-RU', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  // Clean company name formatter
  const cleanCompanyName = (rawName) => {
    let name = (rawName || 'Тозон')
      .replace(/^(ООО|ҶДММ|ЗАО|ҶСК|ЧДММ|ЖДММ)\s*["«']?|["»']$/gi, '')
      .replace(/^["«']+|["»']+$/g, '')
      .trim();
    if (!name) name = 'Тозон';
    return isTJ ? `ҶДММ «${name}»` : `ООО «${name}»`;
  };

  // Number to Words in Tajik
  const numberToTajikWords = (num) => {
    if (!num || isNaN(num)) return '';
    num = Math.floor(Math.abs(num));
    if (num === 0) return 'сифр';

    const units = ['', 'як', 'ду', 'се', 'чор', 'панҷ', 'шаш', 'ҳафт', 'ҳашт', 'нӯҳ'];
    const teens = ['даҳ', 'ёздаҳ', 'дувоздаҳ', 'сенздаҳ', 'чордаҳ', 'понздаҳ', 'шонздаҳ', 'ҳафдаҳ', 'ҳаждаҳ', 'нуздаҳ'];
    const tens = ['', 'даҳ', 'бист', 'си', 'чил', 'панҷоҳ', 'шаст', 'ҳафтод', 'ҳаштод', 'навад'];
    const hundreds = ['', 'яксад', 'дусад', 'сесад', 'чорсад', 'панҷсад', 'шашсад', 'ҳафтсад', 'ҳаштсад', 'нӯҳсад'];

    const parts = [];

    if (num >= 1000000) {
      const millions = Math.floor(num / 1000000);
      parts.push(`${numberToTajikWords(millions)} миллион`);
      num %= 1000000;
    }

    if (num >= 1000) {
      const thousands = Math.floor(num / 1000);
      if (thousands === 1) {
        parts.push('як ҳазор');
      } else {
        parts.push(`${numberToTajikWords(thousands)} ҳазор`);
      }
      num %= 1000;
    }

    if (num >= 100) {
      const h = Math.floor(num / 100);
      parts.push(hundreds[h]);
      num %= 100;
    }

    if (num >= 10 && num <= 19) {
      parts.push(teens[num - 10]);
      num = 0;
    } else if (num >= 20) {
      const t = Math.floor(num / 10);
      parts.push(tens[t]);
      num %= 10;
    }

    if (num > 0) {
      parts.push(units[num]);
    }

    return parts.filter(Boolean).join('у ').replace(/у\s+ҳазор/g, ' ҳазор').replace(/у\s+миллион/g, ' миллион');
  };

  // Number to Words in Russian
  const numberToRussianWords = (num) => {
    if (!num || isNaN(num)) return '';
    num = Math.floor(Math.abs(num));
    if (num === 0) return 'ноль';

    const units = ['', 'один', 'два', 'три', 'четыре', 'пять', 'шесть', 'семь', 'восемь', 'девять'];
    const teens = ['десять', 'одиннадцать', 'двенадцать', 'тринадцать', 'четырнадцать', 'пятнадцать', 'шестнадцать', 'семнадцать', 'восемнадцать', 'девятнадцать'];
    const tens = ['', 'десять', 'двадцать', 'тридцать', 'сорок', 'пятьдесят', 'шестьдесят', 'семьдесят', 'восемьдесят', 'девяносто'];
    const hundreds = ['', 'сто', 'двести', 'триста', 'четыреста', 'пятьсот', 'шестьсот', 'семьсот', 'восемьсот', 'девятьсот'];

    const parts = [];
    if (num >= 1000000) {
      const m = Math.floor(num / 1000000);
      parts.push(`${numberToRussianWords(m)} миллион(ов)`);
      num %= 1000000;
    }
    if (num >= 1000) {
      const th = Math.floor(num / 1000);
      if (th === 1) parts.push('одна тысяча');
      else if (th === 2) parts.push('две тысячи');
      else if (th >= 3 && th <= 4) parts.push(`${units[th]} тысячи`);
      else parts.push(`${numberToRussianWords(th)} тысяч`);
      num %= 1000;
    }
    if (num >= 100) {
      parts.push(hundreds[Math.floor(num / 100)]);
      num %= 100;
    }
    if (num >= 10 && num <= 19) {
      parts.push(teens[num - 10]);
      num = 0;
    } else if (num >= 20) {
      parts.push(tens[Math.floor(num / 10)]);
      num %= 10;
    }
    if (num > 0) {
      parts.push(units[num]);
    }
    return parts.filter(Boolean).join(' ');
  };

  const currency = deal.currency || 'USD';
  const currencyShort = currency === 'USD' ? 'доллари ИМА' : 'сомонӣ';

  const dateObj = new Date(deal.deal_date || deal.created_at || Date.now());
  const dealDay = !isNaN(dateObj.getTime()) ? String(dateObj.getDate()).padStart(2, '0') : '___';
  const dealYear = !isNaN(dateObj.getTime()) ? dateObj.getFullYear() : '2026';
  
  const tajikMonths = [
    'январи', 'феврали', 'марти', 'апрели', 'майи', 'июни',
    'июли', 'августи', 'сентябри', 'октябри', 'ноябри', 'декабри'
  ];
  const russianMonths = [
    'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
    'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'
  ];
  const dealMonthName = !isNaN(dateObj.getTime())
    ? (isTJ ? tajikMonths[dateObj.getMonth()] : russianMonths[dateObj.getMonth()])
    : '_________';

  const dealDate = formatDate(deal.deal_date || deal.created_at);
  const advanceDate = dealDate;

  const areaM2 = deal.area_m2_x100
    ? (deal.area_m2_x100 / 100).toLocaleString('ru-RU', { minimumFractionDigits: 1, maximumFractionDigits: 2 })
    : deal.unit_area
    ? Number(deal.unit_area).toLocaleString('ru-RU', { minimumFractionDigits: 1, maximumFractionDigits: 2 })
    : '0';

  const rawPricePerM2 = deal.price_per_m2_minor
    ? deal.price_per_m2_minor / 100
    : deal.area_m2_x100 && deal.area_m2_x100 > 0
    ? (deal.final_price_minor / (deal.area_m2_x100 / 100)) / 100
    : (deal.final_price_minor ? deal.final_price_minor / 100 : 0);

  const pricePerM2Number = Math.round(rawPricePerM2);
  const pricePerM2Words = isTJ ? numberToTajikWords(pricePerM2Number) : numberToRussianWords(pricePerM2Number);
  const pricePerM2Formatted = pricePerM2Number.toLocaleString('ru-RU');

  // USD calculations
  const usdPrice = currency === 'USD' ? pricePerM2Number : Math.round(pricePerM2Number / 9.29);
  const usdPriceWords = isTJ ? numberToTajikWords(usdPrice) : numberToRussianWords(usdPrice);
  const tjsPrice = currency === 'TJS' ? pricePerM2Number : Math.round(pricePerM2Number * 9.29);
  const tjsPriceWords = isTJ ? numberToTajikWords(tjsPrice) : numberToRussianWords(tjsPrice);

  const finalPrice = formatMoney(deal.final_price_minor || 0);
  const downPayment = formatMoney(deal.down_payment_minor || 0);

  const schedules = deal.schedules || [];
  const lastSchedule = schedules.length > 0 ? schedules[schedules.length - 1] : null;
  const lastPaymentDate = lastSchedule ? formatDate(lastSchedule.due_date) : '—';

  // Total paid calculation
  const totalPaidMinor =
    (deal.payments || []).reduce((sum, p) => sum + (p.amount_minor || 0), 0) ||
    (deal.schedules || []).reduce((sum, s) => sum + (s.paid_amount_minor || 0), 0) ||
    (deal.down_payment_minor || 0);

  const remainingDebtMinor = Math.max(0, (deal.final_price_minor || 0) - totalPaidMinor);

  // Table rows for Schedule tab
  const tableRows = [];
  tableRows.push({
    num: 1,
    planDate: advanceDate,
    planAmount: deal.down_payment_minor || 0,
    actualDate: deal.down_payment_minor > 0 ? advanceDate : '',
    actualAmount: deal.down_payment_minor > 0 ? deal.down_payment_minor : null,
    note: isTJ ? 'Маблағи пешпардохти аввал' : 'Сумма первоначального взноса',
  });

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
        
        {/* ================= HEADER CONTROLS (Hidden during print) ================= */}
        <div className="print:hidden flex items-center justify-between bg-slate-900 text-white px-4 sm:px-6 py-3.5 border-b border-slate-800 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-300 hover:text-white transition cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>{isTJ ? 'Бозгашт' : 'Назад'}</span>
            </button>

            <span className="text-slate-600">|</span>

            {/* Document Type Switcher */}
            <div className="flex bg-slate-800 p-1 rounded-xl border border-slate-700">
              <button
                onClick={() => setActiveTab('CONTRACT')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  activeTab === 'CONTRACT'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <FileText className="h-3.5 w-3.5" />
                <span>{isTJ ? 'Матни шартнома' : 'Текст договора'}</span>
              </button>

              <button
                onClick={() => setActiveTab('SCHEDULE')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  activeTab === 'SCHEDULE'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <FileSpreadsheet className="h-3.5 w-3.5" />
                <span>{isTJ ? 'Ҷадвали пардохт' : 'График платежей'}</span>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Language Selector (TJ / RU) */}
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

            {/* Print Button */}
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 px-4 py-2 text-xs font-bold text-white shadow-md transition cursor-pointer"
            >
              <Printer className="h-4 w-4" />
              <span>{isTJ ? 'Чоп кардан / PDF' : 'Печать / PDF'}</span>
            </button>
          </div>
        </div>

        {/* ================= TAB 1: МАТНИ ШАРТНОМА (CORRECTED LEGAL TAJIK CONTRACT) ================= */}
        {activeTab === 'CONTRACT' && (
          <div id="print-section" className="p-8 sm:p-14 text-slate-950 text-xs sm:text-[13px] leading-relaxed font-serif select-text bg-white space-y-5">
            
            {/* Title Header */}
            <div className="text-center pb-2">
              <h1 className="text-base sm:text-lg font-black tracking-tight uppercase text-slate-950 leading-snug">
                {isTJ ? (
                  <>
                    ШАРТНОМАИ ИШТИРОКИ ҲИССАГУЗОРӢ ДАР СОХТМОНИ БИНОИ ИСТИҚОМАТӢ № <u className="font-mono">{deal.contract_number || '____'}</u>
                  </>
                ) : (
                  <>
                    ДОГОВОР ДОЛЕВОГО УЧАСТИЯ В СТРОИТЕЛЬСТВЕ ЖИЛОГО ДОМА № <u className="font-mono">{deal.contract_number || '____'}</u>
                  </>
                )}
              </h1>
            </div>

            {/* Date & City Line */}
            <div className="flex justify-between items-baseline text-xs sm:text-[13px] font-bold pb-2">
              <span>
                {isTJ ? 'Аз' : 'От'} «<u className="font-mono">{dealDay}</u>» <u>{dealMonthName}</u> {isTJ ? `соли ${dealYear}` : `${dealYear} года`}
              </span>
              <span>{deal.project_city || (isTJ ? 'ш. Хуҷанд' : 'г. Худжанд')}</span>
            </div>

            {/* Preamble */}
            <div className="text-justify text-xs sm:text-[13px] leading-relaxed">
              {isTJ ? (
                <p>
                  <strong>{cleanCompanyName(deal.developer_name)}</strong>, дар симои директор <strong>{deal.developer_director || 'Иброгимов Илҳомҷон Муқимович'}</strong>, ки дар асоси Оиннома амал менамояд минбаъд «<strong>Ширкати сохтмонӣ</strong>» номида мешавад аз як тараф ва аз дигар тараф шаҳрванди Ҷумҳурии Тоҷикистон, <strong><u>{deal.lead_name || deal.buyer_name || 'Муҳаммадизода Мирзокарим Мирзоғафур'}</u></strong> дар оянда «<strong>Ҳиссагузор</strong>» дорандаи шиносномаи <strong><u>{deal.passport_series ? `${deal.passport_series} ` : ''}{deal.passport_number || 'А 03195738'}</u></strong>, ки аз тарафи <strong><u>{deal.passport_issued_by || 'ШВКД дар ноҳияи Кӯҳистони Мастчоҳ'}</u></strong>, санаи <strong><u>{formatDate(deal.passport_issue_date) || '14.02.2020'}</u></strong> сол дода шудааст, сокини <strong><u>{deal.registration_address || 'вилояти Суғд, Кӯҳистони Мастчоҳ, ҷамоати Иван Тоҷик, деҳаи Ревомутк'}</u></strong>, РМА <strong><u>{deal.inn || deal.passport_number || '665151074'}</u></strong>, дар якҷоягӣ «<strong>Тарафҳо</strong>» номида мешаванд, дар натиҷаи машварати гузаронида шуда, бо назардошти талаботи боби 60 Кодекси мадании Ҷумҳурии Тоҷикистон бо мақсади фаъолияти якҷоя, шартномаи зеринро бастанд:
                </p>
              ) : (
                <p>
                  <strong>{cleanCompanyName(deal.developer_name)}</strong>, в лице директора <strong>{deal.developer_director || 'Иброгимова Илхомджона Мукимовича'}</strong>, действующего на основании Устава, именуемое в дальнейшем «<strong>Строительная компания</strong>», с одной стороны, и гражданин Республики Таджикистан <strong><u>{deal.lead_name || deal.buyer_name || '____________________'}</u></strong>, в дальнейшем именуемый(ая) «<strong>Дольщик</strong>», паспорт: <strong><u>{deal.passport_series ? `серия ${deal.passport_series} ` : ''}№ {deal.passport_number || '________'}</u></strong>, выдан <strong><u>{deal.passport_issued_by || '____________________'}</u></strong>, дата выдачи <strong><u>{formatDate(deal.passport_issue_date) || '_________'}</u></strong> г., проживающий(ая) по адресу: <strong><u>{deal.registration_address || '____________________'}</u></strong>, ИНН: <strong><u>{deal.inn || deal.passport_number || '__________'}</u></strong>, совместно именуемые «<strong>Стороны</strong>», заключили настоящий Договор о нижеследующем:
                </p>
              )}
            </div>

            {/* Section 1 */}
            <div className="space-y-1.5 text-justify text-xs sm:text-[13px] leading-relaxed">
              <h4 className="font-bold uppercase tracking-wider text-slate-950">
                {isTJ ? '1. АСОСҲОИ ҲУҚУҚӢ БАРОИ БАСТАНИ ШАРТНОМА' : '1. ПРАВОВЫЕ ОСНОВАНИЯ ЗАКЛЮЧЕНИЯ ДОГОВОРА'}
              </h4>
              <p>
                {isTJ
                  ? '1.1. Дар вақти имзо намудани Шартнома «Ширкати сохтмонӣ» ба «Ҳиссагузор», ки яке аз шарикони сохтмони шарикӣ мебошанд кафолатҳои зеринро медиҳад:'
                  : '1.1. При подписании Договора «Строительная компания» предоставляет «Дольщику» следующие гарантии:'}
              </p>
              <p className="pl-4">
                {isTJ
                  ? '1.1.1. Барои бастан ва ба иҷро расонидани шартномаи мазкур ҳамаи ҳуҷҷатҳои заруриро литсензия, иҷозатнома ва ё дигар ҳуҷҷатҳо ва ё шартномаҳо, ки аз тарафи мақомотҳо ва шахсони дахлдор ба онҳо ваколат дода шудааст, «Ширкати сохтмонӣ» гирифта баста аст ва онҳо ба қувваи қонунӣ даромада амал менамоянд.'
                  : '1.1.1. Для заключения и исполнения настоящего Договора получены все необходимые разрешения, лицензии и согласования уполномоченных государственных органов.'}
              </p>
              <p className="pl-4">
                {isTJ
                  ? '1.1.2. «Ширкати сохтмонӣ» дар ҳақиқат бо ҳамаи ҳуқуқҳои қонунӣ ва ваколатҳо, иҷозатномаҳо ва ҳуҷҷатҳо хусусан:'
                  : '1.1.2. «Строительная компания» обладает всеми законными правами, в том числе:'}
              </p>
              <ul className="pl-8 list-disc space-y-0.5">
                <li>{isTJ ? 'иҷозатнома барои сохтмон;' : 'лицензия и разрешение на строительство;'}</li>
                <li>
                  {isTJ
                    ? 'ба «Ширкати сохтмонӣ» ҳуқуқи аз рӯи қонунгузории амалкунандаи Ҷумҳурии Тоҷикистон истифодаи қитъаи замин барои сохтмони хонаи бисёрошёна дода шудааст;'
                    : 'право пользования земельным участком для строительства многоэтажного жилого комплекса;'}
                </li>
                <li>
                  {isTJ
                    ? 'ва дигар ҳуҷҷатҳое, ки барои омӯзиш ба иштирокчии сохтмони ҳиссавӣ пешниҳод карда метавонад.'
                    : 'иные документы, доступные для ознакомления участнику долевого строительства.'}
                </li>
              </ul>
              <p className="pl-4">
                {isTJ
                  ? '1.1.3. Хонаи бисёрошёна ҳамчун иштирокчии сохтмони ҳиссавӣ баъди қабули санади комиссияи давлатӣ ба «Ҳиссагузор» супорида мешавад.'
                  : '1.1.3. Объект передается «Дольщику» после подписания акта государственной приемочной комиссии.'}
              </p>
            </div>

            {/* Section 2 */}
            <div className="space-y-1.5 text-justify text-xs sm:text-[13px] leading-relaxed">
              <h4 className="font-bold uppercase tracking-wider text-slate-950">
                {isTJ ? '2. МАТЛАБИ ШАРТНОМА' : '2. ПРЕДМЕТ ДОГОВОРА'}
              </h4>
              <p>
                {isTJ ? (
                  <>
                    2.1. «Тарафҳо» оиди тайёр намудан ва дар оянда ба имзо расонидани шартномаи сохтмони шарикии хонаи бисёрошёна, ки дар суроғаи <strong><u>{deal.project_address || deal.project_name || 'шаҳри Хуҷанд, кӯчаи Бахтиёр Ёқубов'}</u></strong> ҷойгир мебошад, аҳду паймон кардаанд. Дар асоси шартнома «Ширкати сохтмонӣ» сармаблағгузор баромад менамояд ва «Ҳиссагузор» ҳамчун маблағгузор баромад менамояд ва дар оянда «Ҳиссагузор» соҳибмулки хонаи <strong><u>{deal.unit_rooms || '—'}</u></strong> ҳуҷрагӣ, <strong><u>{deal.building_name ? `Блоки ${deal.building_name}` : deal.section_name ? `Сексияи ${deal.section_name}` : 'Блоки А'}</u></strong>, қабати <strong><u>{deal.floor_number || '—'}</u></strong>, рақами хонаи <strong><u>{deal.unit_number || '—'}</u></strong> бо масоҳати тахминии <strong><u>{areaM2}</u></strong> м.кв. ҷойгир мебошад эътироф мешавад.
                  </>
                ) : (
                  <>
                    2.1. Предметом настоящего Договора является долевое участие Сторон в строительстве многоэтажного жилого дома по адресу: <strong><u>{deal.project_address || deal.project_name || 'г. Худжанд'}</u></strong>. В результате исполнения Договора «Дольщик» приобретает в собственность <strong><u>{deal.unit_rooms || '—'}</u></strong>-комнатную квартиру, <strong><u>{deal.building_name ? `Блок ${deal.building_name}` : deal.section_name ? `Секция ${deal.section_name}` : 'Блок А'}</u></strong>, этаж <strong><u>{deal.floor_number || '—'}</u></strong>, номер квартиры <strong><u>{deal.unit_number || '—'}</u></strong>, ориентировочной площадью <strong><u>{areaM2}</u></strong> кв.м.
                  </>
                )}
              </p>
            </div>

            {/* Section 3 */}
            <div className="space-y-1.5 text-justify text-xs sm:text-[13px] leading-relaxed">
              <h4 className="font-bold uppercase tracking-wider text-slate-950">
                {isTJ ? '3. НАРХИ ШАРТНОМА' : '3. ЦЕНА ДОГОВОРА'}
              </h4>
              <p>
                {isTJ ? (
                  <>
                    3.1. Бо маслиҳати «Тарафҳо» нархи 1 м.кв. хонаи истиқоматиро ба <strong><u>{tjsPrice.toLocaleString('ru-RU')} ({tjsPriceWords}) сомонӣ</u></strong>, ки ин <strong><u>{usdPrice.toLocaleString('ru-RU')} ({usdPriceWords}) доллари ИМА</u></strong> аз рӯи қурби имрӯзаи бонк 9,29 сомонӣ нисбати 1 доллари ИМА, ба ҳолати рӯзи имзогузории шартномаи мазкур ташкил медиҳад нархгузорӣ намудаанд.
                  </>
                ) : (
                  <>
                    3.1. По соглашению Сторон цена 1 кв.м квартиры определена в размере <strong><u>{tjsPrice.toLocaleString('ru-RU')} ({tjsPriceWords}) сомони</u></strong>, что составляет <strong><u>{usdPrice.toLocaleString('ru-RU')} ({usdPriceWords}) долларов США</u></strong> по курсу банка на день заключения настоящего Договора. Общая стоимость составляет <strong><u>{finalPrice} {currencyShort}</u></strong>.
                  </>
                )}
              </p>
              <p>
                {isTJ
                  ? '3.2. Масоҳати охирини хонаи баландошёна дар шартномаи мазкур бо талаботи тавсифи ҳуҷраи истиқоматии супоридашаванда муайян карда мешавад.'
                  : '3.2. Окончательная площадь квартиры уточняется по результатам обмеров технической инвентаризации при сдаче объекта.'}
              </p>
            </div>

            {/* Section 4 */}
            <div className="space-y-1.5 text-justify text-xs sm:text-[13px] leading-relaxed">
              <h4 className="font-bold uppercase tracking-wider text-slate-950">
                {isTJ ? '4. ҲУҚУҚ ВА ӮҲДАДОРИИ ТАРАФҲО' : '4. ПРАВА И ОБЯЗАННОСТИ СТОРОН'}
              </h4>
              <p>{isTJ ? '4.1. «Ширкати сохтмонӣ» ба худ ӯҳдадориҳои зеринро қабул менамояд:' : '4.1. «Строительная компания» обязуется:'}</p>
              <p className="pl-4">
                {isTJ
                  ? '4.1.1. «Ширкати сохтмонӣ» ӯҳдадор аст объекти сохтмони ҳиссагии бинои истиқоматиро бо назардошти он сифате, ки дар шартҳои шартнома ва талаботи лоиҳавию харҷномавии ҳуҷҷатҳо пешбинӣ шудааст, ба ҳиссагузор пешниҳод намояд.'
                  : '4.1.1. Обеспечить строительство объекта в соответствии со строительными нормами и утвержденной проектно-сметной документацией.'}
              </p>
              <p className="pl-4">
                {isTJ ? (
                  <>
                    4.1.2. Аз ҳисоби маблағҳои худ, маблағҳои иштирокчиён (саҳмгузорон) ва дигар воситаҳои ҷалбнамуда, сохтмони воқеъ дар суроғаи <strong><u>{deal.project_address || deal.project_name || 'шаҳри Хуҷанд, кӯчаи Бахтиёр Ёқубов'}</u></strong>, айнан аз рӯи ҳуҷҷатҳои сметавӣ таъмин намояд ва аз рӯи ҷадвали муайян карда шуда ба анҷом расонад.
                  </>
                ) : (
                  <>
                    4.1.2. За счет собственных и привлеченных средств завершить строительство жилого дома по адресу: <strong><u>{deal.project_address || deal.project_name || 'г. Худжанд'}</u></strong> в соответствии со сметой и графиком.
                  </>
                )}
              </p>
              <p className="pl-4">
                {isTJ
                  ? '4.1.3. Супоридани хонаи истиқоматии баландошёнаро баъди ба танзим даровардани ҳуҷҷатҳои дахлдор таъмин намояд.'
                  : '4.1.3. Передать квартиру Дольщику после надлежащего оформления всей необходимой разрешительной документации.'}
              </p>
              <p className="pl-4">
                {isTJ
                  ? '4.1.4. Ҳуқуқи моликияти иштирокчиёни сохтмони ҳиссавӣ ба объекти сохтмони ҳиссавӣ ва ҳуқуқи моликияти хонаи истиқоматии баландошёна дар мақомоти бақайдгирӣ ба қайд мемонад.'
                  : '4.1.4. Обеспечить регистрацию права собственности Дольщика в органах государственной регистрации.'}
              </p>
              <p className="pl-4">
                {isTJ ? '4.1.5. «Ширкати сохтмонӣ» хароҷоти шиносномаи техникиро ба ӯҳда мегирад.' : '4.1.5. Расходы по изготовлению технического паспорта несет Строительная компания.'}
              </p>

              <p className="pt-1">{isTJ ? '4.2. «Ҳиссагузор» ба худ ӯҳдадориҳои зеринро қабул менамояд:' : '4.2. «Дольщик» обязуется:'}</p>
              <p className="pl-4">
                {isTJ
                  ? '4.2.1. Пардохт кардани арзиши хонаи баландошёнаро ба «Ширкати сохтмонӣ» бо тариқи пули нақд якбора, ё ин ки бо созиши тарафҳо - пардохт кардани ҳиссаи худро қисм ба қисм дар асоси ҷадвали пардохт (Замима №1), ки ҷудонашавандаи шартномаи мазкур мебошад ба хазинаи «Ширкати сохтмонӣ» дар давоми сохтмони хонаи баландошёна баробари арзиши ҳиссаи худ пардохт менамояд.'
                  : '4.2.1. Своевременно оплачивать стоимость квартиры единовременно наличными либо в рассрочку согласно согласованному Графику платежей (Приложение №1).'}
              </p>
              <p className="pl-4">
                {isTJ ? '4.2.2. Пардохт кардан, ҳангоми пайдо шудан то бастани байни тарафҳо шартномаи мазкур:' : '4.2.2. Оплатить:'}
              </p>
              <ul className="pl-8 list-disc space-y-0.5">
                <li>{isTJ ? 'бақияи маблағ аз маблағи дар банди 3.1. қайдшуда, ё;' : 'оставшуюся сумму от согласованной стоимости;'}</li>
                <li>{isTJ ? 'фарқият ҳангоми тағйир шудани арзиши хонаи баландошёна ба тарафи кам ё зиёд;' : 'разницу при изменении фактической площади по техпаспорту;'}</li>
                <li>{isTJ ? 'ба расмият дарории ҳуҷҷатҳоро аз ҳисоби худ маблағгузорӣ менамояд.' : 'расходы по нотариальному оформлению.'}</li>
              </ul>
              <p className="pl-4">
                {isTJ ? 'Арзиши охирини хона дар шартномаи мазкур нишон дода мешавад.' : 'Окончательная стоимость указывается в настоящем Договоре.'}
              </p>
              <p>
                {isTJ
                  ? '4.3. «Тарафҳо» ҳуқуқ доранд ба шартҳои Шартнома тағйирот ва иловаҳо дароранд, ё бо тартиби судӣ бекор намоянд.'
                  : '4.3. Стороны вправе вносить изменения и дополнения в Договор, либо расторгнуть его в судебном порядке.'}
              </p>
              <p>
                {isTJ
                  ? '4.4. «Ҳиссагузор» ҳар вақт бо розигии «Ширкати сохтмонӣ» метавонад ҳуқуқи худро гузашт намояд ва ӯҳдадориҳое, ки дар Шартнома дарҷ гардидааст, ба шахси дигар диҳад. «Ширкати сохтмонӣ» вазифадор аст, ки дар мӯҳлати 25 рӯз баъд аз гирифтани огоҳинома аз «Ҳиссагузор», розигӣ ё норозигии худро ба «Ҳиссагузор» хабардор намояд. Тартиб додани шартномаи иловагӣ музднок буда «Ҳиссагузор» 1% аз маблағи умумии хона пардохт менамояд.'
                  : '4.4. Переуступка прав требования третьим лицам осуществляется с согласия Строительной компании с уплатой 1% от стоимости объекта за оформление допсоглашения.'}
              </p>
            </div>

            {/* Section 5 */}
            <div className="space-y-1.5 text-justify text-xs sm:text-[13px] leading-relaxed">
              <h4 className="font-bold uppercase tracking-wider text-slate-950">
                {isTJ ? '5. МӮҲЛАТИ БА ИҶРО РАСОНИДАНИ МАҚСАДИ ТАРАФҲО' : '5. СРОКИ И ОТВЕТСТВЕННОСТЬ СТОРОН'}
              </h4>
              <p>
                {isTJ
                  ? '5.1. Дар ҳолате, ки агар яке аз тарафҳо аз иҷрои шартҳои мазкур саркашӣ намояд, тарафи дуюм ҳуқуқ дорад, ки бо тартиби муайян ба суд бо талаботи маҷбур намудани тарафи дигар оиди иҷрои ӯҳдадориҳо муроҷиат намояд.'
                  : '5.1. В случае уклонения одной из Сторон от исполнения обязательств, спор подлежит разрешению в судебном порядке.'}
              </p>
              <p>
                {isTJ
                  ? '5.2. Дар ҳолати бо гуноҳи яке аз тарафҳо вайрон карда шудани ӯҳдадориҳои шартномавӣ яке аз Тарафҳо аз Тарафи айбдор ҷарима дар ҳаҷми 0,5% аз маблағи хонаи истиқоматии баландошёна барои ҳар як рӯзи ба таъхир гузошта шуда, рӯёнида мешавад. Айби «Ҳиссагузор» ин даст кашидан ё ки худро дар канор кашидан аз иҷро кардани ӯҳдадориҳо, инчунин рад намудани талаботҳои мувофиқа карда шуда ва шакли ҳисоббаробаркунии шартномаи мазкур мебошад. Айби «Ширкати сохтмонӣ» ин даст кашидан ё ки худро канор кашидан аз иҷро кардани ӯҳдадориҳои шартнома.'
                  : '5.2. За нарушение обязательств виновная Сторона уплачивает неустойку в размере 0,5% за каждый день просрочки.'}
              </p>
            </div>

            {/* Section 6 */}
            <div className="space-y-1.5 text-justify text-xs sm:text-[13px] leading-relaxed">
              <h4 className="font-bold uppercase tracking-wider text-slate-950">
                {isTJ ? '6. ШАРТҲОИ МАХСУС' : '6. ОСОБЫЕ УСЛОВИЯ'}
              </h4>
              <p>
                {isTJ
                  ? '6.1. «Тарафҳо» ҳуқуқи яктарафа аз иҷрои ӯҳдадориҳои Шартномаи мазкур даст кашиданро надоранд, ба ғайр аз ҳолатҳое, ки мустақиман дар қонун ва Шартномаи мазкур дарҷ гардидааст (аз ҷумла банди 6.4-и Шартнома).'
                  : '6.1. Односторонний отказ от исполнения Договора не допускается, за исключением установленных законодательством случаев.'}
              </p>
              <p>
                {isTJ
                  ? '6.2. «Ҳиссагузор» ӯҳдадор аст, ки дар бораи ба вуҷуд омадани душвории молӣ ва дигар ҳолатҳои иҷро карда натавонистани ӯҳдадории маблағгузории ҳиссаи худ барои сохтмон ва бастани шартномаи мазкур, бояд бетаъхир «Ширкати сохтмонӣ»-ро огоҳ намояд.'
                  : '6.2. Дольщик обязан незамедлительно уведомлять Строительную компанию о возникновении финансовых затруднений.'}
              </p>
              <p>
                {isTJ
                  ? '6.3. Бо созиши «Тарафҳо» маблағи пулие, ки «Ҳиссагузор» пардохт намудааст барои ҳисоб намудани ӯҳдадориҳои иштирокчии нав ба ҳисоб гирифта мешавад.'
                  : '6.3. Внесенные средства могут быть зачтены новому участнику при оформлении переуступки.'}
              </p>
              <p>
                {isTJ
                  ? '6.4. Дар ҳолате, ки «Ширкати сохтмонӣ» розигии худро оид ба гузашт намудани ҳуқуқ ва гузаронидани ӯҳдадориҳо ба шахсе, ки «Ҳиссагузор» пешниҳод намудааст надиҳад, «Ширкати сохтмонӣ» вазифадор мешавад, ки ба «Ҳиссагузор» маблағҳои аз ӯ гирифташударо дар муддати 3 моҳ аз рӯзи гирифтани огоҳиномаи хаттии «Ҳиссагузор» оиди гузашт намудани ҳуқуқ ва пешниҳод намудани ҳуҷҷатҳои тасдиқкунандаи қобили адои қарзи иштирокчии нав бо тарҳи ҷаримаи аҳдшикании дар ҳаҷми 20% аз маблағи пардохтшуда баргардонад.'
                  : '6.4. При несогласовании переуступки возврат средств производится в течение 3 месяцев за вычетом 20% неустойки.'}
              </p>
              <p>
                {isTJ
                  ? 'Агар «Ҳиссагузор» ҳуҷҷатҳои тасдиқкунандаи қобили адои қарзи иштирокчии навро пешниҳод карда натавонад, «Ширкати сохтмонӣ» ҳуқуқ дорад маблағи «Ҳиссагузор»-ро дар мӯҳлати оқилона баъд аз ёфтани иштирокчии нав аз тарафи «Ширкати сохтмонӣ», бо тарҳи ҷаримавии аҳдшикании пешбинишуда баргардонида диҳад.'
                  : 'При непредоставлении подтверждающих документов возврат осуществляется после привлечения нового дольщика за вычетом неустойки.'}
              </p>
            </div>

            {/* Section 7 */}
            <div className="space-y-1.5 text-justify text-xs sm:text-[13px] leading-relaxed">
              <h4 className="font-bold uppercase tracking-wider text-slate-950">
                {isTJ ? '7. ҲОЛАТҲОИ РАФЪНОПАЗИР (ФОРС МАЖОР)' : '7. ОБСТОЯТЕЛЬСТВА НЕПРЕОДОЛИМОЙ СИЛЫ (ФОРС-МАЖОР)'}
              </h4>
              <p>
                {isTJ
                  ? '7.1. Тарафҳо барои иҷро накардан ё иҷрои номатлуби ӯҳдадориҳо аз рӯи шартномаи мазкур аз ҷавобгарӣ озод карда мешаванд, агар имконпазирии иҷро ба қувваи рафънопазир алоқаманд буда, дар натиҷаи ҳолатҳои фавқулода ва ғайричашмдошт ба миён омада бошад.'
                  : '7.1. Стороны освобождаются от ответственности за неисполнение обязательств при наступлении обстоятельств непреодолимой силы.'}
              </p>
              <p>
                {isTJ
                  ? '7.2. Тарафҳо зери мафҳуми ҳолатҳои рафънопазир чунин ҳолатҳоро мувофиқа намудаанд:'
                  : '7.2. К обстоятельствам непреодолимой силы относятся:'}
              </p>
              <ul className="pl-6 list-disc space-y-0.5">
                <li>
                  {isTJ
                    ? 'Обхезӣ, заминҷунбӣ, офатҳои табиӣ, қабули қарорҳо аз тарафи мақомоти иҷроияи маҳаллии ҳокимияти давлатӣ, ки иҷрои шартномаи мазкурро ғайриимкон месозад.'
                    : 'Наводнения, землетрясения, стихийные бедствия, акты государственных органов, препятствующие исполнению Договора.'}
                </li>
              </ul>
            </div>

            {/* Section 8: Final clauses */}
            <div className="space-y-1.5 text-justify text-xs sm:text-[13px] leading-relaxed">
              <h4 className="font-bold uppercase tracking-wider text-slate-950">
                {isTJ ? '8. ҚИСМИ ХОТИМАЁБӢ' : '8. ЗАКЛЮЧИТЕЛЬНЫЕ ПОЛОЖЕНИЯ'}
              </h4>
              <p>
                {isTJ
                  ? '8.1. Шартномаи мазкур аз лаҳзаи ба имзо расидани он аз ҷониби «Тарафҳо» қувваи ҳуқуқӣ пайдо намуда, то иҷрои пурраи ҳамаи шартҳои он амал менамояд.'
                  : '8.1. Настоящий Договор вступает в силу с момента его подписания Сторонами и действует до полного исполнения обязательств.'}
              </p>
              <p>
                {isTJ
                  ? '8.2. Дар дигар ҳолатҳо, шартномаро дар асоси қонунҳои амалкунандаи Ҷумҳурии Тоҷикистон бекор кардан мумкин аст.'
                  : '8.2. Расторжение Договора производится в соответствии с законодательством Республики Таджикистан.'}
              </p>
              <p>
                {isTJ
                  ? '8.3. Шартномаи мазкур ду нусха тартиб дода шудааст. Ва ҳар ду нусха қувваи ҳуқуқии якхеларо доро буда, дар тарафҳо якнусхагӣ нигоҳ дошта мешавад.'
                  : '8.3. Договор составлен в двух экземплярах, имеющих одинаковую юридическую силу, по одному для каждой из Сторон.'}
              </p>
              <p>
                {isTJ
                  ? '8.4. Оиди дигар масъалаҳо, ки дар шартномаи мазкур пешбинӣ нашудаанд, тибқи меъёрҳои амалкунандаи қонунгузории Ҷумҳурии Тоҷикистон ҳаллу фасл карда мешавад.'
                  : '8.4. Все вопросы, не урегулированные настоящим Договором, разрешаются в соответствии с законодательством Республики Таджикистан.'}
              </p>
            </div>

            {/* SECTION 8 (PART 2): TABLE OF REQUISITES */}
            <div className="print-avoid-break mt-8 pt-4">
              <h4 className="font-black text-slate-950 mb-2 uppercase text-center text-xs sm:text-[13px]">
                {isTJ ? '8. СУРОҒА ВА МАЪЛУМОТҲОИ ТАРАФҲО' : '8. АДРЕСА И РЕКВИЗИТЫ СТОРОН'}
              </h4>
              
              <table className="w-full border-2 border-slate-950 text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b-2 border-slate-950 bg-slate-100 font-black text-center text-slate-950">
                    <th className="p-2 border-r border-slate-950 w-1/2">{isTJ ? '«Ширкати сохтмонӣ»' : '«Строительная компания»'}</th>
                    <th className="p-2 w-1/2">{isTJ ? '«Ҳиссагузор»' : '«Дольщик»'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-950 font-serif">
                  <tr>
                    <td className="p-3 border-r border-slate-950 align-top space-y-2 text-slate-950">
                      <p className="font-extrabold text-sm">{cleanCompanyName(deal.developer_name)}</p>
                      <p className="text-[11px] leading-relaxed">
                        <strong>{isTJ ? 'Суроға:' : 'Адрес:'}</strong> {deal.developer_address || 'В.Суғд, н. Б.Ғафуров, ҷамоати Ҳ.Усмонов, кӯчаи Ф. Ахмедов №130/15'}
                      </p>
                      <p className="text-[11px]"><strong>{isTJ ? 'РМА:' : 'ИНН:'}</strong> 630019325</p>
                      <p className="text-[11px]"><strong>{isTJ ? 'РЯМ:' : 'ЕГР:'}</strong> 6310011648</p>
                      <p className="text-[11px] pt-1"><strong>с/ҳ:</strong> ____________________________________</p>
                      <div className="pt-8">
                        <p className="text-xs font-bold">
                          {isTJ ? 'Директор:' : 'Директор:'} __________________ {deal.developer_director || 'Иброгимов И. М.'}
                        </p>
                        <p className="text-[10px] text-slate-500 mt-0.5">{isTJ ? '(имзо, мӯҳр)' : '(подпись, М.П.)'}</p>
                      </div>
                    </td>

                    <td className="p-3 align-top space-y-2 text-slate-950">
                      <p className="font-extrabold text-sm">{deal.lead_name || deal.buyer_name || 'Муҳаммадизода Мирзокарим Мирзоғафур'}</p>
                      <p className="text-[11px] leading-relaxed">
                        <strong>{isTJ ? 'Суроға:' : 'Адрес:'}</strong> {deal.registration_address || 'В.Суғд, Кӯҳистони Мастчоҳ, ҷамоати Иван Тоҷик, деҳаи Ревомутк'}
                      </p>
                      <p className="text-[11px] leading-relaxed">
                        <strong>{isTJ ? 'Шиноснома:' : 'Паспорт:'}</strong> {deal.passport_series ? `${deal.passport_series} ` : ''}{deal.passport_number || 'А 03195738'} {isTJ ? 'аз' : 'от'} {formatDate(deal.passport_issue_date) || '14.02.2020'} {deal.passport_issued_by || 'ШВКД дар ноҳияи Кӯҳистони Мастчоҳ'}
                      </p>
                      <p className="text-[11px]"><strong>{isTJ ? 'РМА:' : 'ИНН:'}</strong> {deal.inn || deal.passport_number || '665151074'}</p>
                      <p className="text-[11px]"><strong>{isTJ ? 'Тел:' : 'Тел:'}</strong> {deal.lead_phone || '—'}</p>
                      <div className="pt-8">
                        <p className="text-xs font-bold">
                          {isTJ ? 'Имзо:' : 'Подпись:'} __________________ ({deal.lead_name || deal.buyer_name || (isTJ ? 'Ҳиссагузор' : 'Дольщик')})
                        </p>
                        <p className="text-[10px] text-slate-500 mt-0.5">{isTJ ? '(имзои Ҳиссагузор)' : '(подпись Дольщика)'}</p>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

          </div>
        )}

        {/* ================= TAB 2: ҶАДВАЛИ ПАРДОХТ / ГРАФИК ПЛАТЕЖЕЙ ================= */}
        {activeTab === 'SCHEDULE' && (
          <div id="print-section" className="p-6 sm:p-10 text-slate-900 text-xs sm:text-sm font-sans select-text bg-white">
            {/* Title Header */}
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
                <span className="font-black text-slate-900 text-sm sm:text-base">{deal.contract_number || '026'}</span>
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
                <span>{isTJ ? 'Нархи 1 метри мураббаъ бо сомонӣ' : 'Цена 1 кв.м в сомони'}</span>
                <span className="font-bold underline text-slate-900">{tjsPrice.toLocaleString('ru-RU')} TJS</span>
              </div>

              <div className="flex justify-between items-baseline border-b border-dotted border-slate-300 pb-0.5">
                <span className="font-bold text-slate-900">{isTJ ? 'Маблағи умумии хона бо асъор' : 'Общая стоимость квартиры'}</span>
                <span className="font-black underline text-slate-900 text-sm sm:text-base">{finalPrice} {deal.currency || 'USD'}</span>
              </div>

              <div className="flex justify-between items-baseline border-b border-dotted border-slate-300 pb-0.5">
                <span className="font-bold text-slate-900">{isTJ ? 'Маблағи пешпардохти аввал (аванс)' : 'Сумма первого взноса (аванс)'}</span>
                <span className="font-black underline text-slate-900 text-sm sm:text-base">{downPayment} {deal.currency || 'USD'}</span>
              </div>
            </div>

            {/* Schedule Table */}
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
                    <th className="border-r border-slate-900 p-1 w-24 sm:w-28">{isTJ ? 'Маблағ' : 'Сумма'}, {deal.currency || 'USD'}</th>
                    <th className="border-r border-slate-900 p-1 w-20 sm:w-24">{isTJ ? 'Сана' : 'Дата'}</th>
                    <th className="border-r border-slate-900 p-1 w-24 sm:w-28">{isTJ ? 'Маблағ' : 'Сумма'}, {deal.currency || 'USD'}</th>
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

            {/* Bottom Signatures Block */}
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
                <p className="text-slate-600">{isTJ ? 'Тел:' : 'Тел:'} {deal.lead_phone || '—'}</p>
                <div className="mt-10 border-b border-slate-400 w-48 sm:w-56"></div>
                <p className="text-[10px] text-slate-400 mt-1">{isTJ ? '(имзои Харидор)' : '(подпись Покупателя)'}</p>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>,
    document.body
  );
};
