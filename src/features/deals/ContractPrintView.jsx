import React from 'react';
import { Printer, Download, ArrowLeft, Building2, CheckCircle2, ShieldCheck } from 'lucide-react';

export const ContractPrintView = ({ deal, onClose }) => {
  if (!deal) return null;

  const handlePrint = () => {
    window.print();
  };

  const formattedDate = new Date(deal.deal_date || deal.created_at).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const basePrice = (deal.base_price_minor / 100).toLocaleString();
  const finalPrice = (deal.final_price_minor / 100).toLocaleString();
  const downPayment = (deal.down_payment_minor / 100).toLocaleString();
  const areaM2 = (deal.area_m2_x100 / 100).toFixed(2);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs p-4 sm:p-6 flex justify-center animate-in fade-in">
      <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col my-auto border border-slate-200">
        {/* Print controls header (hidden during print) */}
        <div className="print:hidden flex items-center justify-between bg-slate-900 text-white px-6 py-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-300 hover:text-white transition cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Назад к шахматке</span>
            </button>
            <span className="text-slate-600">|</span>
            <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5" /> Сделка успешно оформлена
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 px-4 py-2 text-xs font-bold text-white shadow-md hover:from-blue-700 hover:to-cyan-700 transition cursor-pointer"
            >
              <Printer className="h-4 w-4" />
              <span>Печать / Сохранить в PDF</span>
            </button>
          </div>
        </div>

        {/* Printable Contract Document */}
        <div className="p-8 sm:p-12 text-slate-900 text-sm leading-relaxed space-y-6 font-serif select-text">
          {/* Document Header */}
          <div className="border-b-2 border-slate-900 pb-4 text-center">
            <div className="flex justify-between items-start mb-2">
              <div className="text-left font-sans text-xs text-slate-500">
                <strong>{deal.developer_name}</strong><br />
                {deal.project_address}
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
              <span>г. Душанбе</span>
              <span>«{formattedDate}»</span>
            </div>
          </div>

          {/* Parties */}
          <div className="space-y-3">
            <p>
              <strong>Застройщик:</strong> {deal.developer_name}, именуемый в дальнейшем «Продавец», с одной стороны, и
            </p>
            <p>
              <strong>Покупатель:</strong> <u>{deal.lead_name}</u>, 
              паспорт: серия {deal.passport_series || '___'} № {deal.passport_number || '_______'}, 
              выдан: {deal.passport_issued_by || '_____________________'}, 
              дата выдачи: {deal.passport_issue_date || '_________'}, 
              проживающий(ая) по адресу: {deal.registration_address || '_______________________________'}, 
              телефон: {deal.lead_phone}, именуемый(ая) в дальнейшем «Покупатель», с другой стороны, заключили настоящий Договор о нижеследующем:
            </p>
          </div>

          {/* Section 1: Subject */}
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

          {/* Section 2: Price & Payments */}
          <div className="space-y-2">
            <h3 className="font-bold text-slate-900">2. ЦЕНА ДОГОВОРА И ПОРЯДОК РАСЧЕТОВ</h3>
            <p>
              2.1. Итоговая стоимость квартиры составляет <strong>{finalPrice} {deal.currency}</strong> 
              {deal.discount_minor > 0 && ` (с учетом скидки ${(deal.discount_minor / 100).toLocaleString()} ${deal.currency})`}.
            </p>
            <p>
              2.2. Форма оплаты: <strong>
                {deal.payment_type === 'INSTALLMENT' && 'Рассрочка платежа'}
                {deal.payment_type === 'FULL' && '100% единовременная оплата'}
                {deal.payment_type === 'BARTER' && '100% Бартерное соглашение (взаимозачет)'}
                {deal.payment_type === 'PARTIAL_BARTER' && 'Частичный бартер с доплатой'}
              </strong>.
            </p>
            {deal.payment_type === 'INSTALLMENT' && (
              <p>
                2.3. Первоначальный взнос составляет <strong>{downPayment} {deal.currency}</strong>. Оставшаяся сумма выплачивается в соответствии с согласованным Графиком платежей (Приложение №1 к настоящему Договору).
              </p>
            )}
            {(deal.payment_type === 'BARTER' || deal.payment_type === 'PARTIAL_BARTER') && deal.barter_description && (
              <p>
                2.3. Предмет бартера: <strong>{deal.barter_description}</strong>
                {deal.barter_amount_minor > 0 && ` (оценочная стоимость: ${(deal.barter_amount_minor / 100).toLocaleString()} ${deal.currency})`}.
                {deal.payment_type === 'PARTIAL_BARTER' && ` Оставшаяся сумма доплаты выплачивается Покупателем в установленном порядке.`}
              </p>
            )}
          </div>

          {/* Appendix: Payment Schedule */}
          {deal.schedules && deal.schedules.length > 0 && (
            <div className="space-y-2 pt-2">
              <h3 className="font-bold text-slate-900">ПРИЛОЖЕНИЕ №1: ГРАФИК ПЛАТЕЖЕЙ</h3>
              <table className="w-full font-sans text-xs border border-slate-300 border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-300">
                    <th className="border-r border-slate-300 p-2 text-center w-16">№</th>
                    <th className="border-r border-slate-300 p-2 text-left">Дата планового платежа</th>
                    <th className="border-r border-slate-300 p-2 text-right">Сумма к оплате ({deal.currency})</th>
                    <th className="p-2 text-center w-28">Статус</th>
                  </tr>
                </thead>
                <tbody>
                  {deal.schedules.map((s) => (
                    <tr key={s.id} className="border-b border-slate-200">
                      <td className="border-r border-slate-300 p-2 text-center font-bold">{s.payment_number}</td>
                      <td className="border-r border-slate-300 p-2">{new Date(s.due_date).toLocaleDateString('ru-RU')}</td>
                      <td className="border-r border-slate-300 p-2 text-right font-bold">{(s.amount_minor / 100).toLocaleString()}</td>
                      <td className="p-2 text-center text-slate-500">{s.status === 'PAID' ? 'Оплачено' : 'К оплате'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Signatures */}
          <div className="border-t border-slate-400 pt-8 mt-12 grid grid-cols-2 gap-12 font-sans text-xs">
            <div>
              <p className="font-bold mb-4">ПРОДАВЕЦ:</p>
              <p>{deal.developer_name}</p>
              <p>Менеджер: {deal.manager_name}</p>
              <div className="mt-8 border-b border-slate-400 w-48"></div>
              <p className="text-[10px] text-slate-400 mt-1">(подпись, М.П.)</p>
            </div>

            <div>
              <p className="font-bold mb-4">ПОКУПАТЕЛЬ:</p>
              <p>{deal.lead_name}</p>
              <p>Тел: {deal.lead_phone}</p>
              <div className="mt-8 border-b border-slate-400 w-48"></div>
              <p className="text-[10px] text-slate-400 mt-1">(подпись Покупателя)</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
