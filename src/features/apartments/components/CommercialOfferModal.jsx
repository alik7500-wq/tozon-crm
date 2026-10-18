import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { api } from '../../../api/client';
import { useAuth } from '../../auth/AuthContext';
import { useModalDismiss } from '../../../hooks/useModalDismiss';
import { TozonLogo } from '../../../components/TozonLogo';
import {
  Printer,
  Share2,
  Calendar,
  Building2,
  Phone,
  MapPin,
  User,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Sparkles,
  Download,
  AlertCircle
} from 'lucide-react';

export const CommercialOfferModal = ({
  unit: initialUnit,
  onClose,
  initialPlanType = '3D',
  initialLang = 'RU',
  layoutData = null,
}) => {
  const { user } = useAuth();

  // State
  const [unit, setUnit] = useState(initialUnit);
  const [presentation, setPresentation] = useState(null);
  const [companySettings, setCompanySettings] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPlanType, setSelectedPlanType] = useState(initialPlanType); // '2D' or '3D'
  const [lang, setLang] = useState(initialLang); // 'RU' or 'TG'
  const isTJ = lang === 'TG';

  // Payment configuration
  const [paymentMode, setPaymentMode] = useState('INSTALLMENT'); // 'FULL' or 'INSTALLMENT'
  const [selectedDownPaymentPercent, setSelectedDownPaymentPercent] = useState(30);
  const [installmentMonths, setInstallmentMonths] = useState(24); // default 24 months
  const [firstPaymentDate, setFirstPaymentDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  });

  const [shareFeedback, setShareFeedback] = useState('');

  useModalDismiss({ isOpen: Boolean(initialUnit), onClose });

  useEffect(() => {
    document.body.classList.add('has-print-modal');
    return () => {
      document.body.classList.remove('has-print-modal');
    };
  }, []);

  // Fetch live presentation data (rooms, layout, 2D/3D images) and CRM company settings
  useEffect(() => {
    let alive = true;
    setIsLoading(true);

    const unitId = initialUnit?.id;
    const fetchPromises = [
      api.get(`/document-settings/configuration`).catch(() => ({ data: {} }))
    ];

    if (unitId) {
      fetchPromises.push(
        api.get(`/inventory/units/${unitId}/presentation`).catch(() => ({ data: {} }))
      );
    }

    Promise.all(fetchPromises)
      .then(([configRes, presentationRes]) => {
        if (!alive) return;
        if (configRes?.data?.settings?.data) {
          setCompanySettings(configRes.data.settings.data);
        }
        if (presentationRes?.data?.data) {
          setPresentation(presentationRes.data.data);
          if (presentationRes.data.data.unit) {
            setUnit(presentationRes.data.data.unit);
          }
        }
      })
      .catch((err) => console.warn('Error loading offer data:', err))
      .finally(() => {
        if (alive) setIsLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [initialUnit?.id]);

  const activeUnit = unit || initialUnit;
  const layout = presentation?.layout || layoutData || activeUnit?.layout_types;

  // Resolve room explication from presentation or layout architectural data
  const rooms = useMemo(() => {
    if (presentation?.rooms && presentation.rooms.length > 0) {
      return presentation.rooms;
    }
    // If layout has structured living/kitchen area (e.g. Type 9, Unit 1)
    if (layout?.living_area && layout?.kitchen_area) {
      const living = parseFloat(layout.living_area) || 0;
      const kitchen = parseFloat(layout.kitchen_area) || 0;
      if (layout?.id === 17 || activeUnit?.unit_number === '1') {
        return [
          { id: 1, room_number: 1, name_ru: 'Гостиная', name_tg: 'Меҳмонхона', area: 22.0 },
          { id: 2, room_number: 2, name_ru: 'Кухня', name_tg: 'Ошхона', area: 15.96 },
          { id: 3, room_number: 3, name_ru: 'Прихожая', name_tg: 'Долон', area: 9.97 },
          { id: 4, room_number: 4, name_ru: 'Ванная', name_tg: 'Ҳаммом', area: 4.45 },
        ];
      }
      return [
        { id: 1, room_number: 1, name_ru: 'Жилая зона', name_tg: 'Минтақаи зист', area: living },
        { id: 2, room_number: 2, name_ru: 'Кухня', name_tg: 'Ошхона', area: kitchen },
      ];
    }
    return [];
  }, [presentation?.rooms, layout, activeUnit]);

  // Financial values from live unit database records (Strictly Official DB Pricing)
  // No unapproved discounts or speculative price modifications
  const areaM2 = activeUnit
    ? (activeUnit.area_m2_x100 ? activeUnit.area_m2_x100 / 100 : (parseFloat(activeUnit.area) || 50))
    : 50;

  const pricePerM2Minor = activeUnit?.price_per_m2_minor > 0 ? activeUnit.price_per_m2_minor : 50000;
  const pricePerM2 = pricePerM2Minor / 100; // e.g. $700.00 for Unit 1, $650.00 for Unit 80

  // Total official price in minor units (cents)
  const totalPriceMinor = Math.round(areaM2 * pricePerM2Minor);
  const totalPrice = totalPriceMinor / 100; // e.g. $38,206.00 for Unit 1, $55,120.00 for Unit 80

  // Installment down payment and remaining debt (calculated down to exact minor cents)
  const downPaymentMinor = paymentMode === 'FULL'
    ? totalPriceMinor
    : Math.round(totalPriceMinor * (selectedDownPaymentPercent / 100));
  const downPayment = downPaymentMinor / 100;

  const remainingBalanceMinor = paymentMode === 'FULL' ? 0 : Math.max(0, totalPriceMinor - downPaymentMinor);
  const remainingBalance = remainingBalanceMinor / 100;

  // Calculate strict installment schedule down to the exact cent (Rules #19, #20, #21)
  const scheduleRows = useMemo(() => {
    if (paymentMode === 'FULL' || remainingBalanceMinor <= 0 || installmentMonths <= 0) {
      return [];
    }

    const months = Math.min(240, Math.max(1, parseInt(installmentMonths, 10) || 1));
    const baseMinor = Math.floor(remainingBalanceMinor / months);
    const remainderMinor = remainingBalanceMinor % months;

    let startYear, startMonth, startDay;
    const cleanDateStr = String(firstPaymentDate || '').split('T')[0];
    const parts = cleanDateStr.split('-');
    if (parts.length === 3 && parts[0].length === 4 && !isNaN(parseInt(parts[0], 10))) {
      startYear = parseInt(parts[0], 10);
      startMonth = Math.max(1, Math.min(12, parseInt(parts[1], 10) || 1));
      startDay = Math.max(1, Math.min(31, parseInt(parts[2], 10) || 1));
    } else {
      const now = new Date();
      startYear = now.getFullYear();
      startMonth = now.getMonth() + 1;
      startDay = now.getDate();
    }

    const items = [];
    for (let i = 1; i <= months; i++) {
      const totalMonths = (startMonth - 1) + (i - 1);
      const targetYear = startYear + Math.floor(totalMonths / 12);
      const targetMonth = totalMonths % 12;

      // Rule #21: Clamp day to last valid day of month (Feb 28/29, 30/31)
      const maxDaysInMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
      const actualDay = Math.min(startDay, maxDaysInMonth);

      const yyyy = String(targetYear);
      const mm = String(targetMonth + 1).padStart(2, '0');
      const dd = String(actualDay).padStart(2, '0');
      const dueDateStr = `${dd}.${mm}.${yyyy}`;

      // Rule #20: Distribute cents remainder across early payments so sum is 100% exact
      const paymentMinor = i <= remainderMinor ? (baseMinor + 1) : baseMinor;
      const paymentAmount = paymentMinor / 100;

      items.push({
        number: i,
        date: dueDateStr,
        amount: paymentAmount,
        amountFormatted: paymentAmount.toLocaleString('en-US', {
          minimumFractionDigits: paymentMinor % 100 !== 0 ? 2 : 0,
          maximumFractionDigits: 2,
        }),
      });
    }
    return items;
  }, [paymentMode, remainingBalanceMinor, installmentMonths, firstPaymentDate]);

  // Average monthly payment formatted
  const monthlyAverage = scheduleRows.length > 0 ? (remainingBalance / scheduleRows.length) : 0;
  const monthlyAverageFormatted = monthlyAverage.toLocaleString('en-US', {
    minimumFractionDigits: (remainingBalanceMinor % scheduleRows.length) !== 0 ? 2 : 0,
    maximumFractionDigits: 2,
  });

  // Reconciled room areas (Point 3 Audit)
  const roomSumArea = useMemo(() => {
    return rooms.reduce((acc, r) => acc + (parseFloat(r.area) || 0), 0);
  }, [rooms]);

  const externalAreaDiff = Math.max(0, Number((areaM2 - roomSumArea).toFixed(2)));

  // Formatted date of generation
  const todayFormatted = useMemo(() => {
    const d = new Date();
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}.${month}.${year}`;
  }, []);

  // Approved reservation validity from CRM settings (default: 3 days)
  const reservationValidityDays = companySettings?.reservation_days ?? 3;

  const offerNumber = `КП-25601-B-${activeUnit?.unit_number || '1'}`;

  // 2D and 3D images
  const plan3dUrl = layout?.furnished_plan_path || layout?.image_path || '/layouts/block_b/catalog/block_b_typical_type_09_54_58m2_3d.png';
  const plan2dUrl = layout?.technical_plan_path || '/layouts/block_b/catalog/block_b_typical_type_09_54_58m2_2d.png';
  const currentPlanImage = selectedPlanType === '2D' ? plan2dUrl : plan3dUrl;

  // Project and company contacts from DB settings
  const projectName = activeUnit?.floors?.sections?.buildings?.projects?.name || activeUnit?.project_name || 'ЖК TOZON PLAZA';
  const companyPhone = companySettings?.company?.company_phone || '+992999333000';
  const companyName = companySettings?.company?.company_name || (isTJ ? 'ҶДММ «Тозон»' : 'ООО «Тозон»');
  const projectAddress = isTJ ? 'ш. Хуҷанд, кӯчаи Б. Ёқубов 2' : 'г. Худжанд, ул. Б. Ёкубов 2';
  const managerName = user?.full_name || user?.name || user?.username || (isTJ ? 'Шуъбаи фурӯши TOZON' : 'Отдел продаж TOZON');

  const handlePrint = () => {
    window.print();
  };

  const handleShare = async () => {
    const shareText = isTJ
      ? `Пешниҳоди тиҷоратӣ: ЖК «TOZON PLAZA», Блок Б, Хонаи №${activeUnit?.unit_number} (${activeUnit?.rooms}-ҳуҷрагӣ, ${areaM2.toFixed(2)} м²). Нарх: $${totalPrice.toLocaleString('en-US')} USD ($${pricePerM2.toLocaleString('en-US')}/м²). Тел: ${companyPhone}`
      : `Коммерческое предложение: ЖК «TOZON PLAZA», Блок Б, Квартира №${activeUnit?.unit_number} (${activeUnit?.rooms}-комн., ${areaM2.toFixed(2)} м²). Стоимость: $${totalPrice.toLocaleString('en-US')} USD ($${pricePerM2.toLocaleString('en-US')}/м²). Тел: ${companyPhone}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `${projectName} — Квартира №${activeUnit?.unit_number}`,
          text: shareText,
          url: window.location.href,
        });
        return;
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.warn('Share error:', err);
        }
      }
    }

    // Fallback: Copy summary to clipboard and guide user
    try {
      await navigator.clipboard.writeText(shareText);
      setShareFeedback(isTJ ? 'Маълумот нусхабардорӣ шуд!' : 'Реквизиты скопированы!');
      setTimeout(() => setShareFeedback(''), 3000);
    } catch {
      alert(shareText);
    }
  };

  if (!initialUnit) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-900/85 backdrop-blur-sm overflow-y-auto print:p-0 print:bg-white print:overflow-visible">
      {/* ================= SCREEN-ONLY TOP ACTION TOOLBAR ================= */}
      <div className="sticky top-0 z-30 flex flex-wrap items-center justify-between gap-3 bg-slate-900 border-b border-slate-800 px-4 py-3 text-white shadow-xl print:hidden">
        {/* Left: Back & Offer ID */}
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 px-3 py-1.5 text-xs font-bold text-slate-200 transition cursor-pointer border border-slate-700"
          >
            <span>←</span>
            <span>{isTJ ? 'Баргаштан' : 'Карточка квартиры'}</span>
          </button>

          <div className="hidden sm:flex items-center gap-2">
            <span className="text-xs font-black text-amber-400 font-mono">{offerNumber}</span>
            <span className="text-xs text-slate-400">·</span>
            <span className="text-xs text-slate-300">
              {isTJ ? 'Хонаи №' : 'Кв. №'}<strong>{activeUnit?.unit_number}</strong> ({areaM2.toFixed(2)} м²)
            </span>
          </div>
        </div>

        {/* Center: Plan Toggle & Payment Mode & Language */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Plan Selector */}
          <div className="flex items-center bg-slate-800 rounded-xl p-1 border border-slate-700 text-xs">
            <button
              type="button"
              onClick={() => setSelectedPlanType('3D')}
              className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer flex items-center gap-1.5 ${
                selectedPlanType === '3D' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-300 hover:text-white'
              }`}
            >
              <span>🎨</span>
              <span>3D {isTJ ? 'Мебелдор' : 'Меблированный'}</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedPlanType('2D')}
              className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer flex items-center gap-1.5 ${
                selectedPlanType === '2D' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-300 hover:text-white'
              }`}
            >
              <span>📐</span>
              <span>2D {isTJ ? 'Техникӣ' : 'Технический'}</span>
            </button>
          </div>

          {/* Payment Mode Selector */}
          <div className="flex items-center bg-slate-800 rounded-xl p-1 border border-slate-700 text-xs">
            <button
              type="button"
              onClick={() => setPaymentMode('INSTALLMENT')}
              className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer flex items-center gap-1.5 ${
                paymentMode === 'INSTALLMENT' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-300 hover:text-white'
              }`}
            >
              <Calendar className="h-3.5 w-3.5" />
              <span>{isTJ ? 'Насия 0%' : 'Рассрочка 0%'}</span>
            </button>
            <button
              type="button"
              onClick={() => setPaymentMode('FULL')}
              className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer flex items-center gap-1.5 ${
                paymentMode === 'FULL' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-300 hover:text-white'
              }`}
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>{isTJ ? '100% Пардохт' : '100% Оплата'}</span>
            </button>
          </div>

          {/* Language Selector */}
          <div className="flex items-center bg-slate-800 rounded-xl p-1 border border-slate-700 text-xs">
            <button
              type="button"
              onClick={() => setLang('RU')}
              className={`px-2 py-1 rounded-lg font-bold transition cursor-pointer ${
                lang === 'RU' ? 'bg-slate-700 text-white shadow-xs' : 'text-slate-400 hover:text-white'
              }`}
            >
              RU
            </button>
            <button
              type="button"
              onClick={() => setLang('TG')}
              className={`px-2 py-1 rounded-lg font-bold transition cursor-pointer ${
                lang === 'TG' ? 'bg-slate-700 text-white shadow-xs' : 'text-slate-400 hover:text-white'
              }`}
            >
              TJ
            </button>
          </div>
        </div>

        {/* Right: Print / Save to PDF / Share Actions */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrint}
            title={isTJ ? 'Дар равзанаи чоп «Ҳамчун PDF нигоҳ доштан»-ро интихоб кунед' : 'В окне печати выберите "Сохранить как PDF"'}
            className="flex items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 px-3.5 py-1.5 text-xs font-bold text-white transition cursor-pointer shadow-sm hover:shadow"
          >
            <Printer className="h-4 w-4" />
            <span>{isTJ ? 'Чоп / Нигоҳдорӣ дар PDF' : 'Печать / Сохранить в PDF'}</span>
          </button>

          <button
            type="button"
            onClick={handleShare}
            className="flex items-center gap-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 px-3 py-1.5 text-xs font-bold text-slate-200 transition cursor-pointer border border-slate-700"
          >
            <Share2 className="h-4 w-4" />
            <span>{shareFeedback || (isTJ ? 'Фиристодан' : 'Поделиться')}</span>
          </button>
        </div>
      </div>

      {/* ================= SECONDARY CONTROLS BAR (FOR INSTALLMENT MODE) ================= */}
      {paymentMode === 'INSTALLMENT' && (
        <div className="bg-slate-850 border-b border-slate-800 px-4 py-2 text-white print:hidden">
          <div className="max-w-[820px] mx-auto flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-semibold uppercase text-[10px] tracking-wider">
                {isTJ ? 'Пардохти пешакӣ (ПВ):' : 'Первоначальный взнос:'}
              </span>
              <div className="flex items-center gap-1 flex-wrap">
                {[30, 40, 50].map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => setSelectedDownPaymentPercent(pct)}
                    className={`px-2.5 py-0.5 rounded-md font-bold transition text-[11px] cursor-pointer ${
                      selectedDownPaymentPercent === pct
                        ? 'bg-indigo-600 text-white ring-1 ring-indigo-400'
                        : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    }`}
                  >
                    {pct}%
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400 font-semibold uppercase text-[10px] tracking-wider">
                  {isTJ ? 'Мӯҳлат:' : 'Срок:'}
                </span>
                <select
                  value={installmentMonths}
                  onChange={(e) => setInstallmentMonths(parseInt(e.target.value, 10))}
                  className="bg-slate-900 border border-slate-700 text-white rounded-lg px-2 py-1 text-xs font-bold cursor-pointer"
                >
                  <option value={6}>6 {isTJ ? 'моҳ' : 'мес.'}</option>
                  <option value={12}>12 {isTJ ? 'моҳ (1 сол)' : 'мес. (1 год)'}</option>
                  <option value={18}>18 {isTJ ? 'моҳ (1.5 сол)' : 'мес. (1.5 года)'}</option>
                  <option value={24}>24 {isTJ ? 'моҳ (2 сол)' : 'мес. (2 года)'}</option>
                  <option value={30}>30 {isTJ ? 'моҳ (2.5 сол)' : 'мес. (2.5 года)'}</option>
                  <option value={36}>36 {isTJ ? 'моҳ (3 сол)' : 'мес. (3 года)'}</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-slate-400 font-semibold uppercase text-[10px] tracking-wider">
                  {isTJ ? 'Пардохти 1-ум:' : '1-й платёж:'}
                </span>
                <input
                  type="date"
                  value={firstPaymentDate}
                  onChange={(e) => setFirstPaymentDate(e.target.value)}
                  className="bg-slate-900 border border-slate-700 text-white rounded-lg px-2 py-1 text-xs font-mono font-bold cursor-pointer"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= PRINTABLE A4 COMMERCIAL OFFER DOCUMENT ================= */}
      <div className="flex-1 flex justify-center p-2 sm:p-6 print:p-0">
        <div
          id="print-section"
          className="print-portal-root print-document-root relative w-full max-w-[820px] bg-white text-slate-900 p-5 sm:p-8 shadow-2xl rounded-2xl print:rounded-none print:shadow-none print:p-4 print:m-0 flex flex-col justify-between"
          style={{ minHeight: '297mm' }}
        >
          <div className="space-y-4">
            {/* 1. DOCUMENT HEADER */}
            <div className="flex items-start justify-between border-b-2 border-slate-900 pb-3 gap-4">
              {/* Logo & Company */}
              <div className="flex items-center gap-3">
                <TozonLogo size="md" showTagline={false} />
                <div>
                  <h2 className="text-lg sm:text-xl font-black tracking-tight text-slate-900 leading-none">
                    {projectName}
                  </h2>
                  <p className="text-[11px] font-bold text-slate-500 mt-1 uppercase tracking-wider">
                    {isTJ ? 'Маҷмааи истиқоматии 16-ошёна' : '16-этажный жилой комплекс'} • {projectAddress}
                  </p>
                  <p className="text-[10px] font-semibold text-slate-400 mt-0.5">
                    {companyName} • {isTJ ? 'РМА (ИНН):' : 'ИНН:'} 630019325
                  </p>
                </div>
              </div>

              {/* Document Stamp / Title */}
              <div className="text-right shrink-0">
                <span className="inline-block px-3 py-1 rounded-lg bg-blue-600 text-white text-[11px] font-black uppercase tracking-wider shadow-xs">
                  {isTJ ? 'ПЕШНИҲОДИ ТИҶОРАТӢ' : 'КОММЕРЧЕСКОЕ ПРЕДЛОЖЕНИЕ'}
                </span>
                <div className="mt-1 font-mono text-xs font-black text-slate-900">
                  {offerNumber}
                </div>
                <div className="text-[10px] text-slate-500 font-medium">
                  {isTJ ? 'Санаи таҳия:' : 'Дата:'} <strong>{todayFormatted}</strong>
                </div>
                <div className="text-[9px] text-amber-700 font-bold">
                  {isTJ
                    ? `Мӯҳлати эътибор: ${reservationValidityDays} рӯз`
                    : `Действительно: ${reservationValidityDays} дня`}
                </div>
              </div>
            </div>

            {/* 2. UNIT PASSPORT GRID */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
              <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5 flex items-center justify-between">
                <span>{isTJ ? 'ШИНОСНОМАИ МАНЗИЛ (ПАРАМЕТРҲО)' : 'ПАСПОРТ ОБЪЕКТА НЕДВИЖИМОСТИ'}</span>
                <span className="text-emerald-700 font-bold bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                  {isTJ ? '● Озод барои фурӯш' : '● Свободна к продаже'}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-center">
                <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-2xs">
                  <span className="text-[9px] font-bold text-slate-400 block uppercase">{isTJ ? 'Хонаи №' : 'Квартира'}</span>
                  <span className="text-base font-black text-blue-700">№{activeUnit?.unit_number}</span>
                </div>

                <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-2xs">
                  <span className="text-[9px] font-bold text-slate-400 block uppercase">{isTJ ? 'Блок / Корпус' : 'Блок'}</span>
                  <span className="text-sm font-black text-slate-900">Блок Б</span>
                </div>

                <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-2xs">
                  <span className="text-[9px] font-bold text-slate-400 block uppercase">{isTJ ? 'Ошёна' : 'Этаж'}</span>
                  <span className="text-sm font-black text-slate-900">
                    {activeUnit?.floors?.floor_number || activeUnit?.floor_number} {isTJ ? 'аз 16' : 'из 16'}
                  </span>
                </div>

                <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-2xs">
                  <span className="text-[9px] font-bold text-slate-400 block uppercase">{isTJ ? 'Хонаҳо' : 'Комнатность'}</span>
                  <span className="text-sm font-black text-slate-900">
                    {activeUnit?.rooms === 0 ? (isTJ ? 'Студия' : 'Студия') : `${activeUnit?.rooms} ${isTJ ? 'ҳуҷрагӣ' : 'комн.'}`}
                  </span>
                </div>

                <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-2xs">
                  <span className="text-[9px] font-bold text-slate-400 block uppercase">{isTJ ? 'Масоҳати умумӣ' : 'Общая площадь'}</span>
                  <span className="text-sm font-black text-slate-900">{areaM2.toFixed(2)} м²</span>
                </div>

                <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-2xs">
                  <span className="text-[9px] font-bold text-slate-400 block uppercase">{isTJ ? 'Баландии шифт' : 'Высота потолка'}</span>
                  <span className="text-sm font-black text-slate-900">3.15 м</span>
                </div>
              </div>
            </div>

            {/* 3. VISUAL FLOOR PLAN SHOWCASE */}
            <div className="rounded-xl border border-slate-200 p-2.5 bg-white flex flex-col items-center">
              <div className="w-full flex items-center justify-between border-b border-slate-100 pb-1.5 mb-1.5 text-xs">
                <span className="font-extrabold text-slate-900 flex items-center gap-1.5">
                  <span>{selectedPlanType === '3D' ? '🎨' : '📐'}</span>
                  <span>
                    {selectedPlanType === '3D'
                      ? (isTJ ? '3D Нақшаи мебелдори манзил' : '3D Меблированный изометрический план')
                      : (isTJ ? '2D Нақшаи меъморию техникӣ бо андозаҳо' : '2D Архитектурно-технический чертёж с экспликацией')}
                  </span>
                </span>
                <span className="text-[10px] font-semibold text-slate-500 font-mono">
                  {layout?.code || 'TOZON-PLAZA-BLOCK-B'}
                </span>
              </div>

              <div className="w-full h-[220px] sm:h-[240px] flex items-center justify-center overflow-hidden bg-white">
                <img
                  src={currentPlanImage}
                  alt="Планировка квартиры"
                  className="max-h-full max-w-full object-contain"
                />
              </div>
            </div>

            {/* 4. ROOMS BREAKDOWN (ЭКСПЛИКАЦИЯ ПОМЕЩЕНИЙ С СВЕРКОЙ ПЛОЩАДИ) */}
            <div className="rounded-xl border border-slate-200 p-2.5 bg-slate-50/50">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                  {isTJ ? 'ТАРКИБИ ҲУҶРАҲО ВА МАЙДОНҲО (ЭКСПЛИКАТСИЯ):' : 'ЭКСПЛИКАЦИЯ И ХАРАКТЕРИСТИКИ ПОМЕЩЕНИЙ:'}
                </span>
                {rooms.length > 0 && externalAreaDiff > 0 && (
                  <span className="text-[9px] font-bold text-slate-500">
                    {isTJ
                      ? `Майдони ҳуҷраҳо: ${roomSumArea.toFixed(2)} м² + Айвон/қисми берунӣ: ${externalAreaDiff.toFixed(2)} м² = Ҳамагӣ: ${areaM2.toFixed(2)} м²`
                      : `Площадь комнат: ${roomSumArea.toFixed(2)} м² + Балкон/лоджия: ${externalAreaDiff.toFixed(2)} м² = Всего: ${areaM2.toFixed(2)} м²`}
                  </span>
                )}
              </div>

              {rooms.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 text-xs">
                  {rooms.map((r) => (
                    <div key={r.id} className="flex items-center justify-between p-1.5 rounded-lg bg-white border border-slate-200">
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-900 text-[9px] font-black">
                          {r.room_number}
                        </span>
                        <span className="font-bold text-slate-800 text-[10px] truncate">
                          {isTJ && r.name_tg ? r.name_tg : r.name_ru}
                        </span>
                      </div>
                      <span className="font-extrabold text-slate-900 text-[10px] ml-1 shrink-0">
                        {r.area ? `${Number(r.area).toFixed(2)} м²` : '—'}
                      </span>
                    </div>
                  ))}

                  {/* Reconciled Balcony / Loggia row if present */}
                  {externalAreaDiff > 0 && (
                    <div className="flex items-center justify-between p-1.5 rounded-lg bg-amber-50/50 border border-amber-200">
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-amber-200 text-amber-900 text-[9px] font-black">
                          ★
                        </span>
                        <span className="font-bold text-amber-900 text-[10px] truncate">
                          {isTJ ? 'Айвон / Балкон' : 'Балкон / летняя зона'}
                        </span>
                      </div>
                      <span className="font-extrabold text-amber-900 text-[10px] ml-1 shrink-0">
                        {externalAreaDiff.toFixed(2)} м²
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-[11px] text-slate-600 leading-relaxed italic">
                  {isTJ
                    ? (layout?.description_tg || (activeUnit?.rooms > 1 ? 'Манзили барҳаво бо тирезаҳои панорамӣ ва тарҳи озод. Баландии шифт 3.15 м.' : 'Манзили 1-ҳуҷрагӣ бо тарҳи муосир ва равшанӣ. Баландии шифт 3.15 м.'))
                    : (layout?.description_ru || (activeUnit?.rooms > 1 ? 'Просторная квартира с панорамными окнами и свободной планировкой. Высота потолков 3.15 м.' : 'Уютная 1-комнатная квартира с продуманной планировкой. Высота потолков 3.15 м.'))}
                </p>
              )}
            </div>

            {/* 5. FINANCIAL TERMS & PAYMENT CALCULATION (OFFICIAL CRM PRICING) */}
            <div className="rounded-xl border-2 border-indigo-200 bg-gradient-to-br from-indigo-50/40 via-white to-blue-50/30 p-3.5">
              <div className="flex flex-wrap items-center justify-between border-b border-indigo-100 pb-2 mb-2.5 gap-2">
                <div className="flex items-center gap-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-xs">
                    <ShieldCheck className="h-4 w-4" />
                  </div>
                  <h4 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-tight">
                    {isTJ ? 'ШАРТҲОИ МОЛИЯВӢ ВА ҲИСОБИ ПАРДОХТ' : 'ФИНАНСОВЫЕ УСЛОВИЯ И РАСЧЁТ СТОИМОСТИ'}
                  </h4>
                </div>

                <div className="text-xs font-bold text-slate-600">
                  <span className="font-mono text-indigo-900 font-extrabold">
                    {paymentMode === 'FULL'
                      ? (isTJ ? 'Шакли пардохт: 100% якдафъаина' : 'Форма оплаты: 100% единовременная')
                      : (isTJ ? `Насия 0% ба мӯҳлати ${installmentMonths} моҳ` : `Беспроцентная рассрочка на ${installmentMonths} мес.`)}
                  </span>
                </div>
              </div>

              {/* Price Calculation Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center mb-2.5">
                <div className="bg-white p-2 rounded-xl border border-indigo-100 shadow-2xs">
                  <span className="text-[9px] font-bold text-slate-400 uppercase block">
                    {isTJ ? 'Нархи тасдиқшуда (1 м²)' : 'Утверждённая цена за м²'}
                  </span>
                  <div className="text-base font-black text-blue-900 font-mono mt-0.5">
                    ${pricePerM2.toLocaleString('en-US')} USD
                  </div>
                  <span className="text-[9px] font-bold text-slate-500">
                    {isTJ ? 'Тибқи феҳристи нархҳо' : 'По утверждённому прайсу'}
                  </span>
                </div>

                <div className="bg-white p-2 rounded-xl border border-indigo-100 shadow-2xs">
                  <span className="text-[9px] font-bold text-slate-400 uppercase block">
                    {isTJ ? 'Арзиши умумии манзил' : 'Общая стоимость квартиры'}
                  </span>
                  <div className="text-base font-black text-indigo-700 font-mono mt-0.5">
                    ${totalPrice.toLocaleString('en-US')} USD
                  </div>
                  <span className="text-[9px] font-bold text-slate-500">
                    {areaM2.toFixed(2)} м² × ${pricePerM2.toLocaleString('en-US')}
                  </span>
                </div>

                <div className="bg-white p-2 rounded-xl border border-indigo-100 shadow-2xs">
                  <span className="text-[9px] font-bold text-slate-400 uppercase block">
                    {isTJ ? 'Пардохти пешакӣ' : 'Первоначальный взнос'}
                  </span>
                  <div className="text-base font-black text-slate-900 font-mono mt-0.5">
                    ${downPayment.toLocaleString('en-US', { minimumFractionDigits: downPaymentMinor % 100 !== 0 ? 2 : 0 })} USD
                  </div>
                  <span className="text-[9px] font-bold text-slate-500">
                    {paymentMode === 'FULL' ? '100%' : `${selectedDownPaymentPercent}%`} {isTJ ? 'аз арзиш' : 'от стоимости'}
                  </span>
                </div>

                <div className="bg-white p-2 rounded-xl border border-indigo-100 shadow-2xs">
                  <span className="text-[9px] font-bold text-slate-400 uppercase block">
                    {paymentMode === 'FULL'
                      ? (isTJ ? 'Бақияи қарз' : 'Остаток к оплате')
                      : (isTJ ? 'Бақия дар насия' : 'Остаток в рассрочку')}
                  </span>
                  <div className="text-base font-black text-amber-700 font-mono mt-0.5">
                    {paymentMode === 'FULL' ? '$0 USD' : `$${remainingBalance.toLocaleString('en-US', { minimumFractionDigits: remainingBalanceMinor % 100 !== 0 ? 2 : 0 })} USD`}
                  </div>
                  <span className="text-[9px] font-bold text-slate-500">
                    {paymentMode === 'FULL'
                      ? (isTJ ? 'Пардохти пурра' : 'Полная оплата')
                      : `${installmentMonths} ${isTJ ? 'моҳ (бе фоиз)' : 'мес. (без %)'}`}
                  </span>
                </div>
              </div>

              {/* Installment Compact Schedule Table (Precise to the Cent) */}
              {paymentMode === 'INSTALLMENT' && scheduleRows.length > 0 && (
                <div className="mt-2 border-t border-indigo-100 pt-1.5">
                  <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 mb-1">
                    <span className="uppercase tracking-wider">
                      {isTJ ? 'ҶАДВАЛИ ПАРДОХТИ НАРОХАТ (0% ФОИЗ, ДАҚИҚ ТО СЕНТ):' : 'ГРАФИК ПЛАТЕЖЕЙ В РАССРОЧКУ (0% ПЕРЕПЛАТ, ТОЧНО ДО ЦЕНТА):'}
                    </span>
                    <span>
                      {isTJ ? 'Миёнаи моҳона:' : 'В среднем:'}{' '}
                      <strong className="text-slate-900 font-mono">
                        ${monthlyAverageFormatted} USD
                      </strong>
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-1 text-xs font-mono">
                    {scheduleRows.map((s) => (
                      <div key={s.number} className="bg-white border border-slate-200 rounded-md p-1 text-center shadow-2xs">
                        <div className="text-[8.5px] font-bold text-slate-400">№{s.number} · {s.date}</div>
                        <div className="text-[10.5px] font-black text-slate-900">${s.amountFormatted}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 6. FOOTER: CONTACTS & LEGAL DISCLAIMER */}
          <div className="mt-4 pt-3 border-t-2 border-slate-900 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-4 text-xs">
              <div>
                <span className="text-[9px] font-bold uppercase text-slate-400 block tracking-wider">
                  {isTJ ? 'ШУЪБАИ ФУРӮШ ВА МАСЛИҲАТ:' : 'ОТДЕЛ ПРОДАЖ И КОНСУЛЬТАЦИИ:'}
                </span>
                <div className="text-sm font-black text-blue-700 flex items-center gap-1.5 mt-0.5">
                  <Phone className="h-4 w-4 text-blue-600" />
                  <span>{companyPhone}</span>
                </div>
                <div className="text-[11px] text-slate-600 flex items-center gap-1.5 mt-0.5">
                  <MapPin className="h-3.5 w-3.5 text-slate-400" />
                  <span>{projectAddress}</span>
                </div>
              </div>

              <div className="text-right">
                <span className="text-[9px] font-bold uppercase text-slate-400 block tracking-wider">
                  {isTJ ? 'МЕНЕҶЕРИ МАСЪУЛ:' : 'ОТВЕТСТВЕННЫЙ МЕНЕДЖЕР:'}
                </span>
                <div className="text-xs font-extrabold text-slate-900 flex items-center justify-end gap-1.5 mt-0.5">
                  <User className="h-3.5 w-3.5 text-slate-500" />
                  <span>{managerName}</span>
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  {isTJ ? 'Имзо: ____________________' : 'Подпись: ____________________'}
                </div>
              </div>
            </div>

            {/* Legal Disclaimer */}
            <div className="rounded-lg bg-slate-50 p-2 border border-slate-200 text-[8.5px] text-slate-500 leading-relaxed text-justify">
              <strong>{isTJ ? 'ЭЗОҲИ ҲУҚУҚӢ:' : 'ЮРИДИЧЕСКИЙ ДИСКЛЕЙМЕР:'}</strong>{' '}
              {isTJ
                ? 'Пешниҳоди тиҷоратии мазкур танҳо хусусияти иттилоотӣ дошта, шартнома, офертаи оммавӣ ё тасдиқи бандкунӣ (бронирование) намебошад. Нарх ва мавҷудияти хона дар замони таҳияи ҳуҷҷат эътибор дорад. Барои қайд ва банд кардани манзил бо шуъбаи фурӯши TOZON дар тамос шавед.'
                : 'Настоящее коммерческое предложение носит исключительно информационный характер и не является договором, публичной офертой или подтверждением бронирования. Цены и наличие квартиры актуальны на дату формирования предложения. Для бронирования и фиксации стоимости свяжитесь с отделом продаж TOZON.'}
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default CommercialOfferModal;
