import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { useAuth } from '../auth/AuthContext';
import { DealWizardModal } from '../deals/DealWizardModal';
import { ContractPrintView } from '../deals/ContractPrintView';
import { PaymentRecordModal } from '../deals/PaymentRecordModal';
import {
  X,
  Building2,
  Home,
  User,
  Phone,
  FileText,
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
  TrendingUp,
  Wallet,
  Printer,
  Plus,
  Lock,
  Unlock,
  Coins,
  CreditCard,
  Image as ImageIcon,
  Layers,
  MapPin,
  ShieldCheck
} from 'lucide-react';

export const ApartmentDetailModal = ({
  unitId,
  isOpen,
  onClose,
  onUnitUpdated,
  currency = 'TJS'
}) => {
  const { user } = useAuth();
  const [unit, setUnit] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('details'); // 'details', 'deal', 'schedule', 'payments'
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Modals
  const [isDealWizardOpen, setIsDealWizardOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  const fetchUnit = async () => {
    if (!unitId) return;
    setIsLoading(true);
    try {
      const res = await api.get(`/inventory/units/${unitId}`);
      const data = res.data?.unit || res.unit || res.data || res;
      setUnit(data);
    } catch (err) {
      console.error('Error fetching unit:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && unitId) {
      fetchUnit();
    }
  }, [isOpen, unitId]);

  if (!isOpen) return null;

  const handleToggleBlock = async () => {
    if (!unit) return;
    setIsUpdatingStatus(true);
    try {
      const newStatus = unit.status === 'BLOCKED' ? 'AVAILABLE' : 'BLOCKED';
      const res = await api.patch(`/inventory/units/${unit.id}/status`, {
        status: newStatus,
        block_reason: newStatus === 'BLOCKED' ? 'Заблокировано администратором' : null,
      });
      setUnit(res.data?.unit || res.unit);
      if (onUnitUpdated) onUnitUpdated();
    } catch (err) {
      alert(err.message || 'Ошибка изменения статуса');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'AVAILABLE':
        return { label: 'Свободна для продажи', bg: 'bg-emerald-50 text-emerald-700 border-emerald-300', dot: 'bg-emerald-500' };
      case 'RESERVED':
        return { label: 'В брони', bg: 'bg-amber-50 text-amber-700 border-amber-300', dot: 'bg-amber-500' };
      case 'SOLD':
        return { label: 'Продана по договору', bg: 'bg-rose-50 text-rose-700 border-rose-300', dot: 'bg-rose-500' };
      case 'BLOCKED':
        return { label: 'Заблокирована', bg: 'bg-slate-100 text-slate-600 border-slate-300', dot: 'bg-slate-400' };
      default:
        return { label: status, bg: 'bg-slate-50 text-slate-700 border-slate-200', dot: 'bg-slate-400' };
    }
  };

  const activeDeal = unit?.active_deal;
  const schedules = activeDeal?.deal_payment_schedules || activeDeal?.schedules || [];
  const payments = activeDeal?.payments || [];

  const buildingName = unit?.floors?.sections?.buildings?.name || unit?.building_name || 'Корпус 1';
  const sectionName = unit?.floors?.sections?.name || unit?.section_name || 'Секция 1';
  const floorNumber = unit?.floors?.floor_number || unit?.floor_number || 1;
  const projectName = unit?.floors?.sections?.buildings?.projects?.name || unit?.project_name || 'Жилой Комплекс';
  const projectCurrency = unit?.floors?.sections?.buildings?.projects?.currency || currency;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in overflow-y-auto">
      <div className="relative w-full max-w-3xl max-h-[92vh] overflow-y-auto rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl space-y-6">
        {/* Modal Header */}
        <div className="flex items-start justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20">
              <Home className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-slate-900">
                  Квартира №{unit?.unit_number}
                </h2>
                {unit && (
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${getStatusBadge(unit.status).bg}`}>
                    {getStatusBadge(unit.status).label}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {projectName} • {buildingName} • {sectionName} • {floorNumber} этаж
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {isLoading ? (
          <div className="h-64 flex flex-col items-center justify-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
            <span className="text-xs text-slate-500">Загрузка информации о квартире...</span>
          </div>
        ) : !unit ? (
          <div className="p-8 text-center text-slate-500 text-sm">
            Информация о квартире не найдена.
          </div>
        ) : (
          <div className="space-y-6">
            {/* Quick Specs Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-2xl bg-slate-50 p-3.5 border border-slate-200/80">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">Комнатность</span>
                <div className="text-base font-black text-slate-900 mt-0.5">
                  {unit.rooms === 0 ? 'Студия' : `${unit.rooms}-комнатная`}
                </div>
              </div>

              <div className="rounded-2xl bg-slate-50 p-3.5 border border-slate-200/80">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">Общая площадь</span>
                <div className="text-base font-black text-slate-900 mt-0.5">
                  {(unit.area_m2_x100 / 100).toFixed(2)} м²
                </div>
              </div>

              <div className="rounded-2xl bg-slate-50 p-3.5 border border-slate-200/80">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">
                  {activeDeal ? 'Сумма по договору' : 'Базовая стоимость'}
                </span>
                <div className="text-base font-black text-blue-700 mt-0.5">
                  {activeDeal
                    ? `${(activeDeal.final_price_minor / 100).toLocaleString()} ${projectCurrency}`
                    : unit.price_per_m2_minor > 0
                    ? `${((unit.area_m2_x100 / 100) * (unit.price_per_m2_minor / 100)).toLocaleString()} ${projectCurrency}`
                    : 'По запросу'}
                </div>
              </div>

              <div className="rounded-2xl bg-slate-50 p-3.5 border border-slate-200/80">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">
                  {activeDeal ? 'Оплачено / Остаток' : 'Цена за м²'}
                </span>
                <div className="text-sm font-black text-emerald-700 mt-1">
                  {activeDeal ? (
                    <span className="flex flex-col">
                      <span>{(activeDeal.total_paid_minor / 100).toLocaleString()} {projectCurrency}</span>
                      <span className="text-[10px] text-rose-600 font-semibold">
                        Ост: {(activeDeal.remaining_debt_minor / 100).toLocaleString()} {projectCurrency}
                      </span>
                    </span>
                  ) : (
                    <span>
                      {unit.price_per_m2_minor > 0
                        ? `${(unit.price_per_m2_minor / 100).toLocaleString()} ${projectCurrency}/м²`
                        : 'Не задана'}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Layout blueprint image if available */}
            {unit.layout_types?.image_path && (
              <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-3 flex flex-col items-center">
                <span className="text-[11px] font-bold text-slate-500 mb-2">
                  Чертеж планировки ({unit.layout_types.name || unit.layout_types.code})
                </span>
                <img
                  src={unit.layout_types.image_path}
                  alt="Планировка"
                  className="max-h-48 object-contain rounded-xl"
                />
              </div>
            )}

            {/* Active Deal & Buyer Information Section */}
            {activeDeal ? (
              <div className="space-y-4">
                <div className="rounded-2xl border border-blue-200 bg-blue-50/40 p-5 space-y-4 shadow-2xs">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-blue-100 pb-3">
                    <div className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-blue-600" />
                      <span className="text-sm font-black text-blue-950">
                        Договор №{activeDeal.contract_number}
                      </span>
                      <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-white border border-blue-200 text-blue-700">
                        {activeDeal.payment_type === 'INSTALLMENT'
                          ? 'Рассрочка'
                          : activeDeal.payment_type === 'BARTER'
                          ? 'Бартер'
                          : '100% Оплата'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setIsPrintModalOpen(true)}
                        className="inline-flex items-center gap-1 rounded-xl bg-white border border-blue-200 px-3 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-50 transition shadow-2xs cursor-pointer"
                      >
                        <Printer className="h-3.5 w-3.5" />
                        <span>Печать договора</span>
                      </button>

                      <button
                        onClick={() => setIsPaymentModalOpen(true)}
                        className="inline-flex items-center gap-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 text-xs font-bold transition shadow-xs cursor-pointer"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span>Внести оплату</span>
                      </button>
                    </div>
                  </div>

                  {/* Buyer Data */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="text-slate-400 block font-semibold">Покупатель (ФИО):</span>
                      <span className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5 mt-0.5">
                        <User className="h-4 w-4 text-slate-400" />
                        {activeDeal.lead_name || 'Не указан'}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 block font-semibold">Номер телефона:</span>
                      <span className="font-bold text-blue-700 text-sm flex items-center gap-1.5 mt-0.5">
                        <Phone className="h-4 w-4 text-blue-500" />
                        {activeDeal.lead_phone ? (
                          <a href={`tel:${activeDeal.lead_phone}`} className="hover:underline">
                            {activeDeal.lead_phone}
                          </a>
                        ) : (
                          'Не указан'
                        )}
                      </span>
                    </div>

                    {activeDeal.passport_series && activeDeal.passport_number && (
                      <div>
                        <span className="text-slate-400 block font-semibold">Паспортные данные:</span>
                        <span className="font-bold text-slate-800 mt-0.5 block">
                          {activeDeal.passport_series} {activeDeal.passport_number}
                          {activeDeal.passport_issued_by && ` (Выдан: ${activeDeal.passport_issued_by})`}
                        </span>
                      </div>
                    )}

                    {activeDeal.registration_address && (
                      <div>
                        <span className="text-slate-400 block font-semibold">Адрес прописки:</span>
                        <span className="font-bold text-slate-800 mt-0.5 block">
                          {activeDeal.registration_address}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Installment Schedule & Payments Breakdown Tabs */}
                <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4 shadow-2xs">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-5 w-5 text-emerald-600" />
                      <h4 className="text-sm font-black text-slate-900">
                        График рассрочки и детализация платежей
                      </h4>
                    </div>
                    <span className="text-xs font-bold text-slate-500">
                      Всего платежей: {schedules.length}
                    </span>
                  </div>

                  {schedules.length > 0 ? (
                    <div className="overflow-x-auto max-h-60">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold sticky top-0">
                          <tr>
                            <th className="p-2.5 pl-3">№</th>
                            <th className="p-2.5">Срок оплаты</th>
                            <th className="p-2.5">План</th>
                            <th className="p-2.5">Оплачено</th>
                            <th className="p-2.5">Остаток</th>
                            <th className="p-2.5 text-right pr-3">Статус</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {schedules.map((s, idx) => {
                            const isPaid = (s.remaining_amount_minor || 0) === 0 && (s.paid_amount_minor || 0) > 0;
                            const isPartial = (s.paid_amount_minor || 0) > 0 && (s.remaining_amount_minor || 0) > 0;
                            const isOverdue = s.status === 'OVERDUE';

                            return (
                              <tr key={s.id || idx} className="hover:bg-slate-50">
                                <td className="p-2.5 pl-3 font-bold text-slate-700">{s.payment_number || idx + 1}</td>
                                <td className="p-2.5 font-medium text-slate-800">
                                  {new Date(s.due_date).toLocaleDateString('ru-RU')}
                                </td>
                                <td className="p-2.5 font-bold text-slate-900">
                                  {(s.amount_minor / 100).toLocaleString()} {projectCurrency}
                                </td>
                                <td className="p-2.5 font-bold text-emerald-700">
                                  {((s.paid_amount_minor || 0) / 100).toLocaleString()} {projectCurrency}
                                </td>
                                <td className="p-2.5 font-bold text-rose-600">
                                  {((s.remaining_amount_minor || 0) / 100).toLocaleString()} {projectCurrency}
                                </td>
                                <td className="p-2.5 text-right pr-3">
                                  <span
                                    className={`px-2 py-0.5 rounded-md font-bold text-[10px] border ${
                                      isPaid
                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                        : isPartial
                                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                                        : isOverdue
                                        ? 'bg-rose-50 text-rose-700 border-rose-200'
                                        : 'bg-slate-50 text-slate-600 border-slate-200'
                                    }`}
                                  >
                                    {isPaid ? 'Оплачен' : isPartial ? 'Частично' : isOverdue ? 'Просрочен' : 'К оплате'}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                      График рассрочки не сформирован (100% оплата или бартер)
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* If unit is AVAILABLE */
              <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-6 text-center space-y-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 mx-auto border border-emerald-100">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-slate-900">Квартира свободна для брони и покупки</h4>
                  <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                    Вы можете оформить сделку, зафиксировать условия рассрочки и автоматически сгенерировать договор купли-продажи.
                  </p>
                </div>

                <div className="flex items-center justify-center gap-3 pt-2">
                  <button
                    onClick={() => setIsDealWizardOpen(true)}
                    className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-2.5 text-xs font-bold text-white shadow-md hover:from-blue-700 hover:to-indigo-700 transition cursor-pointer"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Оформить сделку / Рассрочку</span>
                  </button>

                  {user?.role === 'ADMIN' && (
                    <button
                      onClick={handleToggleBlock}
                      disabled={isUpdatingStatus}
                      className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                    >
                      {unit.status === 'BLOCKED' ? (
                        <>
                          <Unlock className="h-4 w-4 text-emerald-600" />
                          <span>Разблокировать</span>
                        </>
                      ) : (
                        <>
                          <Lock className="h-4 w-4 text-slate-500" />
                          <span>Заблокировать</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Child Modals */}
        {isDealWizardOpen && (
          <DealWizardModal
            isOpen={isDealWizardOpen}
            onClose={() => setIsDealWizardOpen(false)}
            unit={unit}
            currency={projectCurrency}
            onDealCreated={() => {
              fetchUnit();
              if (onUnitUpdated) onUnitUpdated();
              setIsDealWizardOpen(false);
            }}
          />
        )}

        {isPaymentModalOpen && activeDeal && (
          <PaymentRecordModal
            isOpen={isPaymentModalOpen}
            onClose={() => setIsPaymentModalOpen(false)}
            deal={activeDeal}
            onPaymentSuccess={() => {
              fetchUnit();
              if (onUnitUpdated) onUnitUpdated();
              setIsPaymentModalOpen(false);
            }}
          />
        )}

        {isPrintModalOpen && activeDeal && (
          <ContractPrintView
            deal={activeDeal}
            onClose={() => setIsPrintModalOpen(false)}
          />
        )}
      </div>
    </div>
  );
};
