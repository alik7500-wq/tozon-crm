import React from 'react';
import {
  FileCheck,
  Building2,
  User,
  Phone,
  Calendar,
  CreditCard,
  Printer,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  ShieldCheck,
  ChevronRight
} from 'lucide-react';

export const DealsKanbanView = ({
  deals = [],
  isLoading,
  onSelectDeal,
  onOpenContractPrint,
  onOpenPayment,
  onSignDeal,
}) => {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-16 rounded-2xl border border-slate-200 bg-white">
        <div className="text-center space-y-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-xs text-slate-500 font-medium">Загрузка канбан-доски сделок...</p>
        </div>
      </div>
    );
  }

  const columns = [
    {
      id: 'RESERVED',
      title: 'Активные бронирования',
      badgeClass: 'bg-amber-100 text-amber-800 border-amber-200',
      dotClass: 'bg-amber-500',
      icon: Clock,
      deals: deals.filter((d) => d.status === 'RESERVED'),
    },
    {
      id: 'SIGNED',
      title: 'Подписанные договоры',
      badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      dotClass: 'bg-emerald-500',
      icon: CheckCircle2,
      deals: deals.filter((d) => d.status === 'SIGNED'),
    },
    {
      id: 'CANCELLED',
      title: 'Отмененные сделки',
      badgeClass: 'bg-rose-100 text-rose-800 border-rose-200',
      dotClass: 'bg-rose-500',
      icon: XCircle,
      deals: deals.filter((d) => d.status === 'CANCELLED'),
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
      {columns.map((col) => {
        const Icon = col.icon;
        const totalVolume = col.deals.reduce((sum, d) => sum + (d.final_price_minor || 0), 0) / 100;

        return (
          <div
            key={col.id}
            className="flex flex-col rounded-2xl border border-slate-200/90 bg-slate-50/60 p-4 min-h-[500px]"
          >
            {/* Column Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-3">
              <div className="flex items-center gap-2">
                <span className={`h-2.5 w-2.5 rounded-full ${col.dotClass}`}></span>
                <h3 className="text-xs font-bold text-slate-900">{col.title}</h3>
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold border ${col.badgeClass}`}>
                  {col.deals.length}
                </span>
              </div>
              <span className="text-[11px] font-bold text-slate-500">
                {totalVolume.toLocaleString()} TJS
              </span>
            </div>

            {/* Cards List */}
            <div className="space-y-3 flex-1 overflow-y-auto max-h-[calc(100vh-280px)] pr-0.5">
              {col.deals.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl bg-white/50">
                  В этой колонке нет сделок
                </div>
              ) : (
                col.deals.map((deal) => {
                  const currency = deal.currency || deal.project_currency || 'TJS';
                  const finalPrice = (deal.final_price_minor || 0) / 100;
                  const totalPaid = (deal.total_paid_minor || 0) / 100;
                  const remaining = (deal.remaining_debt_minor || 0) / 100;
                  const paidPercent = finalPrice > 0 ? Math.min(100, Math.round((totalPaid / finalPrice) * 100)) : 0;
                  const areaM2 = (deal.area_m2_x100 / 100).toFixed(1);

                  return (
                    <div
                      key={deal.id}
                      onClick={() => onSelectDeal(deal)}
                      className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs hover:shadow-md hover:border-blue-300 transition cursor-pointer space-y-3 group"
                    >
                      {/* Card Header */}
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-xs text-slate-900 group-hover:text-blue-600 transition">
                          {deal.contract_number}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">
                          {deal.deal_date || deal.created_at?.split('T')[0]}
                        </span>
                      </div>

                      {/* Buyer */}
                      <div className="space-y-0.5">
                        <div className="text-xs font-bold text-slate-900 flex items-center gap-1">
                          <User className="h-3 w-3 text-slate-400 shrink-0" />
                          <span className="truncate">{deal.lead_name}</span>
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1">
                          <Phone className="h-3 w-3 text-emerald-600 shrink-0" />
                          <span>{deal.lead_phone}</span>
                        </div>
                      </div>

                      {/* Unit summary */}
                      <div className="bg-slate-50 p-2 rounded-lg border border-slate-100 text-[11px] space-y-0.5">
                        <div className="font-semibold text-slate-800 truncate">
                          {deal.project_name}
                        </div>
                        <div className="text-slate-500">
                          Кв. <strong className="text-blue-700">№{deal.unit_number}</strong> • {deal.unit_rooms} комн., {areaM2} м² ({deal.floor_number} эт.)
                        </div>
                      </div>

                      {/* Financial info */}
                      <div className="flex items-baseline justify-between pt-1 border-t border-slate-100">
                        <div>
                          <span className="text-[10px] text-slate-400 block font-medium">
                            {deal.payment_type === 'INSTALLMENT' && 'Рассрочка'}
                            {deal.payment_type === 'FULL' && '100% оплата'}
                            {deal.payment_type === 'BARTER' && 'Бартер'}
                            {deal.payment_type === 'PARTIAL_BARTER' && 'Бартер + доплата'}
                          </span>
                          <strong className="text-xs font-extrabold text-slate-900">
                            {finalPrice.toLocaleString()} {currency}
                          </strong>
                        </div>

                        {deal.status === 'SIGNED' && (
                          <div className="text-right">
                            <span className="text-[10px] text-emerald-700 font-bold block">
                              Оплачено: {totalPaid.toLocaleString()}
                            </span>
                            {remaining > 0 && (
                              <span className="text-[10px] text-rose-600 font-semibold block">
                                Долг: {remaining.toLocaleString()}
                              </span>
                            )}
                          </div>
                        )}

                        {deal.status === 'RESERVED' && (
                          <div className="text-right">
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                              deal.is_reservation_expired ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                            }`}>
                              до {deal.reservation_expires_at || '—'}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Payment progress bar if signed */}
                      {deal.status === 'SIGNED' && (
                        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full"
                            style={{ width: `${paidPercent}%` }}
                          />
                        </div>
                      )}

                      {/* Quick Actions Footer */}
                      <div
                        className="flex items-center justify-between pt-2 border-t border-slate-100"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <span className="text-[10px] text-slate-400 font-medium">
                          {deal.manager_name || 'Менеджер'}
                        </span>

                        <div className="flex items-center gap-1">
                          {onOpenContractPrint && (
                            <button
                              onClick={() => onOpenContractPrint(deal)}
                              className="rounded p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition cursor-pointer"
                              title="Печать договора"
                            >
                              <Printer className="h-3.5 w-3.5" />
                            </button>
                          )}

                          {deal.status !== 'CANCELLED' && remaining > 0 && onOpenPayment && (
                            <button
                              onClick={() => onOpenPayment(deal)}
                              className="rounded p-1 text-emerald-600 hover:bg-emerald-50 transition cursor-pointer"
                              title="Принять оплату"
                            >
                              <CreditCard className="h-3.5 w-3.5" />
                            </button>
                          )}

                          {deal.status === 'RESERVED' && onSignDeal && (
                            <button
                              onClick={() => onSignDeal(deal)}
                              className="rounded bg-emerald-600 px-2 py-0.5 text-[10px] font-bold text-white hover:bg-emerald-700 transition cursor-pointer"
                            >
                              Подписать
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
