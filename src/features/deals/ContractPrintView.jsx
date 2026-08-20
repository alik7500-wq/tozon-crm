import React, { useState } from 'react';
import { Printer, ArrowLeft, CheckCircle2, FileSpreadsheet, FileText } from 'lucide-react';

export const ContractPrintView = ({ deal, onClose }) => {
  const [activeTab, setActiveTab] = useState('SCHEDULE'); // 'SCHEDULE' or 'CONTRACT'

  if (!deal) return null;

  const handlePrint = () => {
    window.print();
  };

  const formattedDate = new Date(deal.deal_date || deal.created_at).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const dealDate = deal.deal_date
    ? new Date(deal.deal_date).toLocaleDateString('ru-RU')
    : new Date().toLocaleDateString('ru-RU');

  const advanceDate = dealDate;

  // Format money helper
  const formatMoney = (valMinor) => {
    if (valMinor === undefined || valMinor === null) return '0,00';
    const num = typeof valMinor === 'number' ? valMinor / 100 : parseFloat(valMinor);
    return num.toLocaleString('ru-RU', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const currency = deal.currency || 'USD';
  const currencyLabel = currency === 'USD' ? 'доллари ИМА (USD)' : 'Сомони (TJS)';
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

  const schedules = deal.schedules || [];
  const lastSchedule = schedules.length > 0 ? schedules[schedules.length - 1] : null;
  const lastPaymentDate = lastSchedule
    ? new Date(lastSchedule.due_date).toLocaleDateString('ru-RU')
    : '—';

  // Total paid calculation
  const totalPaidMinor =
    (deal.payments || []).reduce((sum, p) => sum + (p.amount_minor || 0), 0) ||
    (deal.schedules || []).reduce((sum, s) => sum + (s.paid_amount_minor || 0), 0) ||
    (deal.down_payment_minor || 0);

  const remainingDebtMinor = Math.max(0, (deal.final_price_minor || 0) - totalPaidMinor);

  // Table rows for Image 1 schedule
  const tableRows = [];

  // Row 1: Advance / Down payment
  tableRows.push({
    num: 1,
    planDate: advanceDate,
    planAmount: deal.down_payment_minor || 0,
    actualDate: deal.down_payment_minor > 0 ? advanceDate : '',
    actualAmount: deal.down_payment_minor > 0 ? deal.down_payment_minor : null,
    note: 'Маблағи пешпардохти аввал',
  });

  // Rows 2..N: Schedules
  schedules.forEach((s, idx) => {
    const isPaid = s.status === 'PAID';
    const isPartial = s.status === 'PARTIAL';
    tableRows.push({
      num: idx + 2,
      planDate: new Date(s.due_date).toLocaleDateString('ru-RU'),
      planAmount: s.amount_minor,
      actualDate: isPaid || isPartial ? new Date(s.updated_at || s.due_date).toLocaleDateString('ru-RU') : '',
      actualAmount: s.paid_amount_minor > 0 ? s.paid_amount_minor : null,
      note: s.note || '',
    });
  });

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs p-2 sm:p-6 flex justify-center animate-in fade-in">
      <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col my-auto border border-slate-200">
        {/* Print controls header (hidden during print) */}
        <div className="print:hidden flex items-center justify-between bg-slate-900 text-white px-4 sm:px-6 py-3.5 border-b border-slate-800 flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-300 hover:text-white transition cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Назад</span>
            </button>
            <span className="text-slate-600">|</span>
            <div className="flex bg-slate-800 p-1 rounded-xl border border-slate-700">
              <button
                onClick={() => setActiveTab('SCHEDULE')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  activeTab === 'SCHEDULE'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <FileSpreadsheet className="h-3.5 w-3.5" />
                <span>Ҷадвали пардохт (График)</span>
              </button>
              <button
                onClick={() => setActiveTab('CONTRACT')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  activeTab === 'CONTRACT'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <FileText className="h-3.5 w-3.5" />
                <span>Матни шартнома (Договор)</span>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 px-4 py-2 text-xs font-bold text-white shadow-md transition cursor-pointer"
            >
              <Printer className="h-4 w-4" />
              <span>Печать / Экспорт в PDF</span>
            </button>
          </div>
        </div>

        {/* ================= TAB 1: ҶАДВАЛИ ПАРДОХТ (IMAGE 1 & 2) ================= */}
        {activeTab === 'SCHEDULE' && (
          <div className="p-6 sm:p-10 text-slate-900 text-xs sm:text-sm font-sans select-text bg-white">
            {/* Title Header */}
            <div className="text-center pb-3 border-b-2 border-slate-900 mb-4">
              <h1 className="text-base sm:text-lg font-black tracking-tight uppercase text-slate-900">
                Ҷадвали пардохт ба Шартномаи иштироки ҳиссагӣ дар сохтмон
              </h1>
            </div>

            {/* Key-Value Details */}
            <div className="space-y-1.5 font-medium text-xs sm:text-sm pb-4">
              <div className="flex justify-between items-baseline border-b border-dotted border-slate-300 pb-0.5">
                <span className="font-bold text-slate-900">Рақами Шартнома</span>
                <span className="font-black text-slate-900 text-sm sm:text-base">{deal.contract_number || '026'}</span>
              </div>

              <div className="flex justify-between items-baseline border-b border-dotted border-slate-300 pb-0.5">
                <span className="font-bold text-slate-900">Ному насаби Ҳиссагузор</span>
                <span className="font-bold text-slate-900 underline text-right">{deal.lead_name || deal.buyer_name || '—'}</span>
              </div>

              <div className="flex justify-between items-baseline border-b border-dotted border-slate-300 pb-0.5">
                <span>Санаи бастани Шартнома</span>
                <span className="font-semibold text-slate-800">{dealDate}</span>
              </div>

              <div className="flex justify-between items-baseline border-b border-dotted border-slate-300 pb-0.5">
                <span>Санаи пешпардохти аввал (аванс)</span>
                <span className="font-semibold text-slate-800">{advanceDate}</span>
              </div>

              <div className="flex justify-between items-baseline border-b border-dotted border-slate-300 pb-0.5">
                <span>Санаи пардохти охирон</span>
                <span className="font-semibold text-slate-800">{lastPaymentDate}</span>
              </div>

              <div className="flex justify-between items-baseline border-b border-dotted border-slate-300 pb-0.5">
                <span>Суроғаи Ҳиссагузор</span>
                <span className="text-right text-slate-800">{deal.registration_address || 'Вил. Суғд, н. Б. Ғафуров'}</span>
              </div>

              <div className="flex justify-between items-baseline border-b border-dotted border-slate-300 pb-0.5">
                <span>Рақами телефони Ҳиссагузор</span>
                <span className="font-semibold text-slate-800">{deal.lead_phone || '—'}</span>
              </div>

              <div className="flex justify-between items-baseline border-b border-dotted border-slate-300 pb-0.5">
                <span>Эзоҳ</span>
                <span className="text-right text-slate-700">{deal.project_name ? `${deal.project_name}, кв. №${deal.unit_number || ''}` : '—'}</span>
              </div>

              <div className="flex justify-between items-baseline border-b border-dotted border-slate-300 pb-0.5 pt-1">
                <span>Масоҳати умумии хона метри мураббаъ</span>
                <span className="font-bold underline text-slate-900">{areaM2}</span>
              </div>

              <div className="flex justify-between items-baseline border-b border-dotted border-slate-300 pb-0.5">
                <span>Нархи 1 метри мураббаъ бо {currencyLabel}</span>
                <span className="font-bold underline text-slate-900">{pricePerM2}</span>
              </div>

              <div className="flex justify-between items-baseline border-b border-dotted border-slate-300 pb-0.5">
                <span className="font-bold text-slate-900">Маблағи умумии хона бо {currencyLabel}</span>
                <span className="font-black underline text-slate-900 text-sm sm:text-base">{finalPrice}</span>
              </div>

              <div className="flex justify-between items-baseline border-b border-dotted border-slate-300 pb-0.5">
                <span className="font-bold text-slate-900">Маблағи пешпардохти аввал (аванс) бо {currencyLabel}</span>
                <span className="font-black underline text-slate-900 text-sm sm:text-base">{downPayment}</span>
              </div>
            </div>

            {/* Schedule Table */}
            <div className="mt-4">
              <h3 className="font-black text-xs sm:text-sm text-slate-900 mb-1.5 uppercase">
                Ҷадвали пардохти қарз
              </h3>

              <table className="w-full text-[11px] sm:text-xs border-2 border-slate-900 border-collapse text-center">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-900 font-bold text-slate-900">
                    <th rowSpan="2" className="border-r border-slate-900 p-1.5 w-10 sm:w-12">
                      №<br />б/т
                    </th>
                    <th colSpan="2" className="border-r border-slate-900 p-1.5 bg-slate-200/70">
                      Мувофиқи ҷадвал
                    </th>
                    <th colSpan="2" className="border-r border-slate-900 p-1.5 bg-slate-200/70">
                      Дар асл
                    </th>
                    <th rowSpan="2" className="p-1.5 min-w-[140px]">
                      Эзоҳ
                    </th>
                  </tr>
                  <tr className="bg-slate-50 border-b-2 border-slate-900 font-bold text-slate-800 text-[10px] sm:text-xs">
                    <th className="border-r border-slate-900 p-1 w-20 sm:w-24">Сана</th>
                    <th className="border-r border-slate-900 p-1 w-24 sm:w-28">Маблағ, {currencyShort}</th>
                    <th className="border-r border-slate-900 p-1 w-20 sm:w-24">Сана</th>
                    <th className="border-r border-slate-900 p-1 w-24 sm:w-28">Маблағ, {currencyShort}</th>
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
                      ИТОГО
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
                      Бақияи қарз:
                    </td>
                    <td className="border-r border-slate-900 p-1.5 text-right pr-2 underline text-rose-700 font-black">
                      {formatMoney(remainingDebtMinor)}
                    </td>
                    <td className="p-1.5"></td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Bottom Signatures (Exact Image 2) */}
            <div className="border-t border-slate-300 pt-8 mt-12 grid grid-cols-2 gap-12 font-sans text-xs sm:text-sm">
              <div>
                <p className="font-bold text-slate-900 mb-3 uppercase tracking-wider">ПРОДАВЕЦ:</p>
                <p className="font-semibold text-slate-900">ООО "{deal.developer_name || 'Тозон'}"</p>
                <p className="text-slate-600">Менеджер: {deal.manager_name || 'Admin'}</p>
                <div className="mt-10 border-b border-slate-400 w-48 sm:w-56"></div>
                <p className="text-[10px] text-slate-400 mt-1">(подпись, М.П.)</p>
              </div>

              <div>
                <p className="font-bold text-slate-900 mb-3 uppercase tracking-wider">ПОКУПАТЕЛЬ:</p>
                <p className="font-semibold text-slate-900">{deal.lead_name || deal.buyer_name || '—'}</p>
                <p className="text-slate-600">Тел: {deal.lead_phone || '—'}</p>
                <div className="mt-10 border-b border-slate-400 w-48 sm:w-56"></div>
                <p className="text-[10px] text-slate-400 mt-1">(подпись Покупателя)</p>
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 2: ТЕКСТ ДОГОВОРА ================= */}
        {activeTab === 'CONTRACT' && (
          <div className="p-8 sm:p-12 text-slate-900 text-sm leading-relaxed space-y-6 font-serif select-text">
            <div className="border-b-2 border-slate-900 pb-4 text-center">
              <div className="flex justify-between items-start mb-2">
                <div className="text-left font-sans text-xs text-slate-500">
                  <strong>{deal.developer_name || 'ООО «Тозон»'}</strong><br />
                  {deal.project_address || 'г. Худжанд'}
                </div>
                <div className="text-right font-sans text-xs text-slate-500">
                  Договор №: <strong className="text-slate-900 text-sm">{deal.contract_number}</strong><br />
                  Статус: <strong className="text-emerald-700">ПОДПИСАН</strong>
                </div>
              </div>
              <h1 className="text-xl font-bold uppercase tracking-wider text-slate-900 mt-2">
                ДОГОВОР КУПЛИ-ПРОДАЖИ КВАРТИРЫ № {deal.contract_number}
              </h1>
              <div className="flex justify-between text-xs font-sans text-slate-600 mt-2">
                <span>г. Душанбе / Худжанд</span>
                <span>«{formattedDate}»</span>
              </div>
            </div>

            <div className="space-y-3">
              <p>
                <strong>Застройщик:</strong> {deal.developer_name || 'ООО «Тозон»'}, именуемый в дальнейшем «Продавец», с одной стороны, и
              </p>
              <p>
                <strong>Покупатель:</strong> <u>{deal.lead_name || deal.buyer_name}</u>, 
                паспорт: серия {deal.passport_series || '___'} № {deal.passport_number || '_______'}, 
                выдан: {deal.passport_issued_by || '_____________________'}, 
                дата выдачи: {deal.passport_issue_date || '_________'}, 
                проживающий(ая) по адресу: {deal.registration_address || '_______________________________'}, 
                телефон: {deal.lead_phone}, именуемый(ая) в дальнейшем «Покупатель», с другой стороны, заключили настоящий Договор о нижеследующем:
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="font-bold text-slate-900">1. ПРЕДМЕТ ДОГОВОРА</h3>
              <p>
                1.1. Продавец обязуется передать в собственность Покупателя, а Покупатель обязуется принять и оплатить объект недвижимости со следующими характеристиками:
              </p>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 font-sans text-xs grid grid-cols-2 sm:grid-cols-4 gap-3 my-2">
                <div>
                  <span className="text-slate-500 block">Жилой комплекс:</span>
                  <strong className="text-slate-900">{deal.project_name}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block">Корпус / Секция:</span>
                  <strong className="text-slate-900">{deal.building_name} / {deal.section_name}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block">Этаж / Квартира:</span>
                  <strong className="text-slate-900">{deal.floor_number} этаж / Кв. №{deal.unit_number}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block">Комнат / Площадь:</span>
                  <strong className="text-slate-900">{deal.unit_rooms} комн. / {areaM2} м²</strong>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="font-bold text-slate-900">2. ЦЕНА ДОГОВОРА И ПОРЯДОК РАСЧЕТОВ</h3>
              <p>
                2.1. Итоговая стоимость квартиры составляет <strong>{finalPrice} {currencyShort}</strong> 
                {deal.discount_minor > 0 && ` (с учетом скидки ${(deal.discount_minor / 100).toLocaleString()} ${currencyShort})`}.
              </p>
              <p>
                2.2. Форма оплаты: <strong>
                  {deal.payment_type === 'INSTALLMENT' && 'Рассрочка платежа'}
                  {deal.payment_type === 'FULL' && '100% единовременная оплата'}
                  {deal.payment_type === 'BARTER' && '100% Бартерное соглашение'}
                  {deal.payment_type === 'PARTIAL_BARTER' && 'Частичный бартер с доплатой'}
                </strong>.
              </p>
              {deal.payment_type === 'INSTALLMENT' && (
                <p>
                  2.3. Первоначальный взнос составляет <strong>{downPayment} {currencyShort}</strong>. Оставшаяся сумма выплачивается в соответствии с согласованным Графиком платежей (Приложение №1).
                </p>
              )}
            </div>

            {/* Bottom Signatures (Exact Image 2) */}
            <div className="border-t border-slate-300 pt-8 mt-12 grid grid-cols-2 gap-12 font-sans text-xs sm:text-sm">
              <div>
                <p className="font-bold text-slate-900 mb-3 uppercase tracking-wider">ПРОДАВЕЦ:</p>
                <p className="font-semibold text-slate-900">ООО "{deal.developer_name || 'Тозон'}"</p>
                <p className="text-slate-600">Менеджер: {deal.manager_name || 'Admin'}</p>
                <div className="mt-10 border-b border-slate-400 w-48 sm:w-56"></div>
                <p className="text-[10px] text-slate-400 mt-1">(подпись, М.П.)</p>
              </div>

              <div>
                <p className="font-bold text-slate-900 mb-3 uppercase tracking-wider">ПОКУПАТЕЛЬ:</p>
                <p className="font-semibold text-slate-900">{deal.lead_name || deal.buyer_name || '—'}</p>
                <p className="text-slate-600">Тел: {deal.lead_phone || '—'}</p>
                <div className="mt-10 border-b border-slate-400 w-48 sm:w-56"></div>
                <p className="text-[10px] text-slate-400 mt-1">(подпись Покупателя)</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
