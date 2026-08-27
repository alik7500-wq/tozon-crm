import React from 'react';
import {
  FileCheck,
  Building2,
  User,
  Phone,
  Calendar,
  CreditCard,
  Printer,
  Eye,
  Pencil,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  ShieldCheck,
  ChevronRight
} from 'lucide-react';
import { formatContractNumber } from '../../utils/formatters';
import { useAuth } from '../auth/AuthContext';

export const DealsTableView = ({
  deals = [],
  isLoading,
  onSelectDeal,
  onEditDeal,
  onOpenContractPrint,
  onOpenPayment,
  onSignDeal,
  onCancelDeal,
}) => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-16 rounded-2xl border border-slate-200 bg-white">
        <div className="text-center space-y-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-xs text-slate-500 font-medium">Загрузка реестра сделок...</p>
        </div>
      </div>
    );
  }

  if (!deals || deals.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-16 rounded-2xl border border-dashed border-slate-200 bg-white text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 mb-3 border border-blue-100">
          <FileCheck className="h-6 w-6" />
        </div>
        <h3 className="text-sm font-bold text-slate-900">Сделки не найдены</h3>
        <p className="text-xs text-slate-500 max-w-sm mt-1">
          По заданным фильтрам сделок нет. Попробуйте изменить параметры поиска или оформите новую сделку.
        </p>
      </div>
    );
  }

  const getStatusBadge = (deal) => {
    switch (deal.status) {
      case 'SIGNED':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="h-3 w-3" /> Подписан
          </span>
        );
      case 'RESERVED':
        return (
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold border ${
              deal.is_reservation_expired
                ? 'bg-rose-50 text-rose-700 border-rose-200'
                : 'bg-amber-50 text-amber-700 border-amber-200'
            }`}
          >
            <Clock className="h-3 w-3" /> {deal.is_reservation_expired ? 'Бронь истекла' : 'Бронь'}
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-bold text-rose-700 border border-rose-200">
            <XCircle className="h-3 w-3" /> Отменен
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
            {deal.status}
          </span>
        );
    }
  };

  const getPaymentTypeLabel = (type) => {
    switch (type) {
      case 'INSTALLMENT':
        return 'Рассрочка';
      case 'FULL':
        return '100% Оплата';
      case 'BARTER':
        return '100% Бартер';
      case 'PARTIAL_BARTER':
        return 'Бартер + Доплата';
      default:
        return type;
    }
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
              <th className="py-3 px-4">Договор / Дата</th>
              <th className="py-3 px-4">Покупатель</th>
              <th className="py-3 px-4">Объект и квартира</th>
              <th className="py-3 px-4">Стоимость / Тип</th>
              <th className="py-3 px-4">Оплаты / Остаток</th>
              <th className="py-3 px-4 text-center">Статус</th>
              <th className="py-3 px-4">Менеджер</th>
              <th className="py-3 px-4 text-right">Действия</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {deals.map((deal) => {
              const currency = deal.currency || deal.project_currency || 'USD';
              const finalPrice = (deal.final_price_minor || 0) / 100;
              const totalPaid = (deal.total_paid_minor || 0) / 100;
              const remaining = (deal.remaining_debt_minor || 0) / 100;
              const paidPercent = finalPrice > 0 ? Math.min(100, Math.round((totalPaid / finalPrice) * 100)) : 0;
              const areaM2 = (deal.area_m2_x100 / 100).toFixed(1);

              return (
                <tr
                  key={deal.id}
                  onClick={() => onSelectDeal(deal)}
                  className="hover:bg-blue-50/40 transition cursor-pointer group"
                >
                  {/* Contract & Date */}
                  <td className="py-3.5 px-4">
                    <div className="font-bold text-slate-900 group-hover:text-blue-600 transition text-xs font-mono">
                      {formatContractNumber(deal.contract_number)}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {deal.deal_date || deal.created_at?.split('T')[0]}
                    </div>
                  </td>

                  {/* Buyer */}
                  <td className="py-3.5 px-4">
                    <div className="font-bold text-slate-900 flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span>{deal.lead_name}</span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1">
                      <Phone className="h-3 w-3 text-emerald-600" />
                      <span>{deal.lead_phone}</span>
                    </div>
                  </td>

                  {/* Unit & Project */}
                  <td className="py-3.5 px-4">
                    <div className="font-bold text-slate-900">
                      {deal.project_name}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Кв. <strong className="text-blue-700">№{deal.unit_number}</strong> • {deal.unit_rooms} комн., {areaM2} м² ({deal.floor_number} эт.)
                    </div>
                  </td>

                  {/* Financials & Type */}
                  <td className="py-3.5 px-4">
                    <div className="font-extrabold text-slate-900 text-xs">
                      {finalPrice.toLocaleString()} {currency}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      <span className="font-semibold text-slate-700">{getPaymentTypeLabel(deal.payment_type)}</span>
                      {deal.discount_minor > 0 && (
                        <span className="text-emerald-600 font-medium ml-1">
                          (скидка -{(deal.discount_minor / 100).toLocaleString()})
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Payment Progress */}
                  <td className="py-3.5 px-4 min-w-[140px]">
                    <div className="flex items-center justify-between text-[11px] font-semibold">
                      <span className="text-emerald-700">{totalPaid.toLocaleString()} {currency}</span>
                      <span className="text-slate-400">{paidPercent}%</span>
                    </div>
                    <div className="mt-1 h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full"
                        style={{ width: `${paidPercent}%` }}
                      />
                    </div>
                    {remaining > 0 ? (
                      <div className="text-[10px] text-rose-600 font-semibold mt-1">
                        Остаток: {remaining.toLocaleString()} {currency}
                      </div>
                    ) : (
                      <div className="text-[10px] text-emerald-600 font-semibold mt-1">
                        Полностью оплачено
                      </div>
                    )}
                  </td>

                  {/* Status */}
                  <td className="py-3.5 px-4 text-center">
                    {getStatusBadge(deal)}
                  </td>

                  {/* Manager */}
                  <td className="py-3.5 px-4 text-slate-600 font-medium">
                    {deal.manager_name || '—'}
                  </td>

                  {/* Actions */}
                  <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => onSelectDeal(deal)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-800 transition cursor-pointer"
                        title="Открыть карточку сделки"
                      >
                        <Eye className="h-4 w-4" />
                      </button>

                      {isAdmin && onEditDeal && (
                        <button
                          onClick={() => onEditDeal(deal)}
                          className="rounded-lg p-1.5 text-amber-600 hover:bg-amber-50 hover:text-amber-700 transition cursor-pointer"
                          title="Редактировать сделку (Администратор)"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                      )}

                      {onOpenContractPrint && (
                        <button
                          onClick={() => onOpenContractPrint(deal)}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-blue-50 hover:text-blue-600 transition cursor-pointer"
                          title="Печать договора"
                        >
                          <Printer className="h-4 w-4" />
                        </button>
                      )}

                      {deal.status !== 'CANCELLED' && remaining > 0 && onOpenPayment && (
                        <button
                          onClick={() => onOpenPayment(deal)}
                          className="rounded-lg p-1.5 text-emerald-600 hover:bg-emerald-50 transition cursor-pointer"
                          title="Принять оплату"
                        >
                          <CreditCard className="h-4 w-4" />
                        </button>
                      )}

                      {deal.status === 'RESERVED' && onSignDeal && (
                        <button
                          onClick={() => onSignDeal(deal)}
                          className="rounded-lg bg-emerald-50 px-2 py-1 text-[11px] font-bold text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition cursor-pointer"
                          title="Подписать договор"
                        >
                          Подписать
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
