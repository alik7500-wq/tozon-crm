import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { useAuth } from '../auth/AuthContext';
import { DealWizardModal } from '../deals/DealWizardModal';
import { ContractPrintView } from '../deals/ContractPrintView';
import { PaymentRecordModal } from '../deals/PaymentRecordModal';
import { ReserveApartmentModal } from './ReserveApartmentModal';
import { ExtendReservationModal } from './ExtendReservationModal';
import { useModalDismiss } from '../../hooks/useModalDismiss';
import { formatContractNumber } from '../../utils/formatters';
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
  ShieldCheck,
  CalendarPlus,
  XCircle,
  FileCheck2,
  Edit3,
  Sliders,
  Sparkles,
  Percent,
  Calculator,
  ChevronDown,
  ChevronUp,
  Tag
} from 'lucide-react';

export const ApartmentDetailModal = ({
  unitId,
  isOpen,
  onClose,
  onUnitUpdated,
  currency = 'USD'
}) => {
  const { user } = useAuth();
  const [unit, setUnit] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Price Configuration Modal state with Visual Chessboard Selection
  const [isPriceModalOpen, setIsPriceModalOpen] = useState(false);
  const [editPricePerM2, setEditPricePerM2] = useState(500);
  const [isSavingPrice, setIsSavingPrice] = useState(false);
  const [projectChessboard, setProjectChessboard] = useState([]);
  const [loadingChessboard, setLoadingChessboard] = useState(false);
  const [selectedUnitIds, setSelectedUnitIds] = useState([]);

  // Ladder Pricing state
  const [selectedLadderPercent, setSelectedLadderPercent] = useState(30);
  const [showFullLadderTable, setShowFullLadderTable] = useState(false);

  // Modals
  const [isDealWizardOpen, setIsDealWizardOpen] = useState(false);
  const [isReserveModalOpen, setIsReserveModalOpen] = useState(false);
  const [isExtendModalOpen, setIsExtendModalOpen] = useState(false);
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

  const { requestClose } = useModalDismiss({
    isOpen: Boolean(isOpen && unitId),
    onClose
  });

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

  const isReserved = unit?.status === 'RESERVED' || activeDeal?.status === 'RESERVED';
  const isSold = unit?.status === 'SOLD' || activeDeal?.status === 'SIGNED';

  const buildingName = unit?.floors?.sections?.buildings?.name || unit?.building_name || 'Блок А';
  const sectionName = unit?.floors?.sections?.name || unit?.section_name || 'Подъезд 1';
  const floorNumber = unit?.floors?.floor_number || unit?.floor_number || 1;
  const projectName = unit?.floors?.sections?.buildings?.projects?.name || unit?.project_name || 'ЖК TOZON PLAZA';
  const projectCurrency = unit?.floors?.sections?.buildings?.projects?.currency || currency || 'USD';

  const areaM2 = unit ? (unit.area_m2_x100 ? unit.area_m2_x100 / 100 : (parseFloat(unit.area) || 50)) : 50;
  const basePricePerM2 = unit?.price_per_m2_minor > 0 ? (unit.price_per_m2_minor / 100) : 500;
  const baseTotalPrice = Math.round(areaM2 * basePricePerM2);

  // Ladder steps: 0% (Без ПВ), 5% (5% ПВ), 10%, 20%, 30%, 40%, 50%, 60%, 70%, 80%, 90%, 100%
  // Rule:
  // 0% -> скидка $0/м²
  // 5% -> скидка $5/м²
  // 10% -> скидка $10/м², 20% -> $20/м² ... 100% -> $100/м²
  const ladderTiers = [0, 5, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map((pct) => {
    let discountPerM2 = 0;
    if (pct === 0) discountPerM2 = 0;
    else if (pct === 5) discountPerM2 = 5;
    else discountPerM2 = pct;

    const tieredPricePerM2 = Math.max(0, basePricePerM2 - discountPerM2);
    const totalTierPrice = Math.round(areaM2 * tieredPricePerM2);
    const downPayment = Math.round(totalTierPrice * (pct / 100));
    const remaining = Math.max(0, totalTierPrice - downPayment);
    const discountTotal = Math.round(areaM2 * discountPerM2);
    const savingPercent = baseTotalPrice > 0 ? ((discountTotal / baseTotalPrice) * 100).toFixed(1) : '0';
    const monthly12 = pct === 100 ? 0 : Math.round(remaining / 12);
    const monthly24 = pct === 100 ? 0 : Math.round(remaining / 24);
    return {
      percent: pct,
      discountPerM2,
      discountTotal,
      savingPercent,
      tieredPricePerM2,
      totalTierPrice,
      downPayment,
      remaining,
      monthly12,
      monthly24
    };
  });

  const activeTier = ladderTiers.find((t) => t.percent === selectedLadderPercent) || ladderTiers[4]; // Default 30%

  // Collect all units from projectChessboard
  const allUnitsInProject = React.useMemo(() => {
    const list = [];
    (projectChessboard || []).forEach((b) => {
      (b.sections || []).forEach((s) => {
        (s.floors || []).forEach((f) => {
          (f.units || []).forEach((u) => {
            list.push({
              ...u,
              floor_id: f.id,
              floor_number: f.floor_number,
              section_id: s.id,
              section_name: s.name,
              building_id: b.id,
              building_name: b.name
            });
          });
        });
      });
    });
    return list;
  }, [projectChessboard]);

  const selectedUnitsList = React.useMemo(() => {
    return allUnitsInProject.filter((u) => selectedUnitIds.includes(u.id));
  }, [allUnitsInProject, selectedUnitIds]);

  const totalSelectedArea = React.useMemo(() => {
    return selectedUnitsList.reduce((acc, u) => acc + (u.area_m2_x100 ? u.area_m2_x100 / 100 : 0), 0);
  }, [selectedUnitsList]);

  const totalSelectedAmount = React.useMemo(() => {
    return Math.round(totalSelectedArea * (parseFloat(editPricePerM2) || 0));
  }, [totalSelectedArea, editPricePerM2]);

  const handleToggleUnit = (uId) => {
    setSelectedUnitIds((prev) =>
      prev.includes(uId) ? prev.filter((id) => id !== uId) : [...prev, uId]
    );
  };

  const handleToggleFloor = (floorUnits) => {
    const floorUnitIds = floorUnits.map((u) => u.id);
    const allSelected = floorUnitIds.every((id) => selectedUnitIds.includes(id));
    if (allSelected) {
      setSelectedUnitIds((prev) => prev.filter((id) => !floorUnitIds.includes(id)));
    } else {
      setSelectedUnitIds((prev) => Array.from(new Set([...prev, ...floorUnitIds])));
    }
  };

  const handleSelectOnlyThisUnit = () => {
    if (unit) setSelectedUnitIds([unit.id]);
  };

  const handleSelectAllSameRooms = () => {
    const matching = allUnitsInProject.filter((u) => u.rooms === unit?.rooms).map((u) => u.id);
    setSelectedUnitIds(matching.length > 0 ? matching : unit ? [unit.id] : []);
  };

  const handleSelectAllSameFloor = () => {
    const matching = allUnitsInProject.filter((u) => u.floor_id === unit?.floor_id).map((u) => u.id);
    setSelectedUnitIds(matching.length > 0 ? matching : unit ? [unit.id] : []);
  };

  const handleSelectAllProject = () => {
    setSelectedUnitIds(allUnitsInProject.map((u) => u.id));
  };

  const handleClearSelection = () => {
    setSelectedUnitIds([]);
  };

  const handleOpenPriceModal = async () => {
    setEditPricePerM2(basePricePerM2);
    setSelectedUnitIds(unit ? [unit.id] : []);
    setIsPriceModalOpen(true);

    const projectId =
      unit?.floors?.sections?.buildings?.projects?.id ||
      unit?.project_id ||
      (unit?.floors?.sections?.buildings?.project_id) ||
      3;

    if (projectId) {
      setLoadingChessboard(true);
      try {
        const res = await api.get(`/inventory/projects/${projectId}/chessboard`);
        setProjectChessboard(res.data?.chessboard || []);
      } catch (e) {
        console.error('Error fetching project chessboard:', e);
      } finally {
        setLoadingChessboard(false);
      }
    }
  };

  const handleSaveBasePrice = async (e) => {
    e.preventDefault();
    const p = parseFloat(editPricePerM2);
    if (!p || p <= 0) {
      alert('Пожалуйста, укажите корректную стартовую цену за м²');
      return;
    }
    if (selectedUnitIds.length === 0) {
      alert('Пожалуйста, выберите хотя бы одну квартиру на шахматке');
      return;
    }
    setIsSavingPrice(true);
    try {
      await api.patch('/inventory/units/batch-price', {
        unit_ids: selectedUnitIds,
        price_per_m2_minor: Math.round(p * 100)
      });
      setIsPriceModalOpen(false);
      fetchUnit();
      if (onUnitUpdated) onUnitUpdated();
    } catch (err) {
      alert(err.message || 'Ошибка сохранения цены');
    } finally {
      setIsSavingPrice(false);
    }
  };

  const handleSignReservation = async () => {
    if (!activeDeal) return;
    if (!window.confirm(`Подтвердить подписание договора купли-продажи по квартире №${unit.unit_number}? Статус квартиры изменится на «Продана».`)) return;
    setIsUpdatingStatus(true);
    try {
      await api.post(`/deals/${activeDeal.id}/sign`);
      fetchUnit();
      if (onUnitUpdated) onUnitUpdated();
    } catch (err) {
      alert(err.message || 'Ошибка подписания сделки');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleCancelReservation = async () => {
    if (!activeDeal) return;
    const reason = window.prompt('Укажите причину снятия брони:', 'Отказ клиента / истек срок брони');
    if (reason === null) return;
    setIsUpdatingStatus(true);
    try {
      await api.post(`/deals/${activeDeal.id}/cancel`, { reason });
      fetchUnit();
      if (onUnitUpdated) onUnitUpdated();
    } catch (err) {
      alert(err.message || 'Ошибка снятия брони');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const getDaysLeft = (expDate) => {
    if (!expDate) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const exp = new Date(expDate);
    exp.setHours(0, 0, 0, 0);
    return Math.ceil((exp - today) / (1000 * 60 * 60 * 24));
  };

  const daysLeft = activeDeal?.reservation_expires_at ? getDaysLeft(activeDeal.reservation_expires_at) : null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in overflow-y-auto">
        <div className="relative w-full max-w-3xl max-h-[92vh] overflow-y-auto rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl space-y-6">
        {/* Modal Header */}
        <div className="flex items-start justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className={`flex h-12 w-12 items-center justify-center rounded-2xl text-white shadow-md ${
              isReserved
                ? 'bg-gradient-to-tr from-amber-500 to-orange-600 shadow-amber-500/20'
                : isSold
                ? 'bg-gradient-to-tr from-rose-600 to-red-600 shadow-rose-500/20'
                : 'bg-gradient-to-tr from-blue-600 to-indigo-600 shadow-blue-500/20'
            }`}>
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
            onClick={requestClose}
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

              {isSold && activeDeal ? (
                <>
                  <div className="rounded-2xl bg-slate-50 p-3.5 border border-slate-200/80">
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">
                      Сумма по договору
                    </span>
                    <div className="text-base font-black text-blue-700 mt-0.5">
                      {(activeDeal.final_price_minor / 100).toLocaleString()} {projectCurrency}
                    </div>
                  </div>

                  <div className="rounded-2xl bg-slate-50 p-3.5 border border-slate-200/80">
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">
                      Оплачено / Остаток
                    </span>
                    <div className="text-sm font-black text-emerald-700 mt-1">
                      <span className="flex flex-col">
                        <span>{(activeDeal.total_paid_minor / 100).toLocaleString()} {projectCurrency}</span>
                        <span className="text-[10px] text-rose-600 font-semibold">
                          Ост: {(activeDeal.remaining_debt_minor / 100).toLocaleString()} {projectCurrency}
                        </span>
                      </span>
                    </div>
                  </div>
                </>
              ) : isReserved && activeDeal ? (
                <>
                  <div className="rounded-2xl bg-amber-50/60 p-3.5 border border-amber-200/80">
                    <span className="text-[10px] font-bold uppercase text-amber-700 block">
                      Зафиксированная цена
                    </span>
                    <div className="text-base font-black text-amber-950 mt-0.5">
                      {(activeDeal.final_price_minor / 100).toLocaleString()} {projectCurrency}
                    </div>
                  </div>

                  <div className="rounded-2xl bg-amber-50/60 p-3.5 border border-amber-200/80">
                    <span className="text-[10px] font-bold uppercase text-amber-700 block">
                      Срок брони
                    </span>
                    <div className="text-xs font-black text-amber-900 mt-1">
                      {activeDeal.reservation_expires_at ? new Date(activeDeal.reservation_expires_at).toLocaleDateString('ru-RU') : '—'}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="rounded-2xl bg-blue-50/70 p-3.5 border border-blue-200/80 relative group">
                    <span className="text-[10px] font-bold uppercase text-blue-600 block">
                      Стартовая цена м²
                    </span>
                    <div className="text-base font-black text-blue-900 mt-0.5 flex items-center justify-between">
                      <span>{basePricePerM2.toLocaleString()} {projectCurrency}</span>
                      {/* Discrete subtle pencil icon (незаметный карандашик для менеджера) */}
                      <button
                        type="button"
                        onClick={handleOpenPriceModal}
                        title="Настроить стартовую цену"
                        className="p-1 rounded-md text-slate-300 hover:text-blue-600 hover:bg-white transition cursor-pointer"
                      >
                        <Edit3 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>

                  <div className="rounded-2xl bg-slate-50 p-3.5 border border-slate-200/80">
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">Базовая стоимость</span>
                    <div className="text-base font-black text-slate-900 mt-0.5">
                      {baseTotalPrice.toLocaleString()} {projectCurrency}
                    </div>
                  </div>
                </>
              )}
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

            {/* SECTION 1: IF UNIT IS RESERVED (🟠 БРОНЬ) */}
            {isReserved && activeDeal && (
              <div className="rounded-2xl border border-amber-300 bg-gradient-to-b from-amber-50/80 to-amber-50/30 p-5 space-y-4 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-amber-200 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500 text-white shadow-xs">
                      <Clock className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-black text-amber-950 font-mono">
                          Бронь №{formatContractNumber(activeDeal.contract_number)}
                        </span>
                        <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-amber-500 text-white">
                          В брони
                        </span>
                      </div>
                      <span className="text-xs text-amber-800 font-medium">
                        Квартира зарезервирована и защищена от продажи
                      </span>
                    </div>
                  </div>

                  {/* Countdown Badge */}
                  {daysLeft !== null && (
                    <div>
                      {daysLeft < 0 ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-rose-100 border border-rose-300 text-rose-800 text-xs font-black">
                          <AlertCircle className="h-3.5 w-3.5 text-rose-600" />
                          <span>Просрочена на {Math.abs(daysLeft)} дн.</span>
                        </span>
                      ) : daysLeft === 0 ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-200 border border-amber-400 text-amber-900 text-xs font-black animate-pulse">
                          <Clock className="h-3.5 w-3.5 text-amber-700" />
                          <span>Истекает сегодня!</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-100 border border-amber-300 text-amber-800 text-xs font-bold">
                          <Clock className="h-3.5 w-3.5 text-amber-600" />
                          <span>Осталось {daysLeft} дн. (до {new Date(activeDeal.reservation_expires_at).toLocaleDateString('ru-RU')})</span>
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Reservation Client Info */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-amber-700/80 block font-semibold">Покупатель (ФИО):</span>
                    <span className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5 mt-0.5">
                      <User className="h-4 w-4 text-amber-600" />
                      {activeDeal.lead_name || 'Не указан'}
                    </span>
                  </div>

                  <div>
                    <span className="text-amber-700/80 block font-semibold">Номер телефона:</span>
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

                  <div>
                    <span className="text-amber-700/80 block font-semibold">Зафиксированная стоимость:</span>
                    <span className="font-bold text-slate-900 mt-0.5 block">
                      {(activeDeal.final_price_minor / 100).toLocaleString()} {projectCurrency}
                    </span>
                  </div>

                  <div>
                    <span className="text-amber-700/80 block font-semibold">Внесенный залог / задаток:</span>
                    <span className="font-bold text-slate-900 mt-0.5 block">
                      {activeDeal.down_payment_minor > 0
                        ? `${(activeDeal.down_payment_minor / 100).toLocaleString()} ${projectCurrency}`
                        : 'Без залога'}
                    </span>
                  </div>
                </div>

                {/* Actions for Reserved Unit */}
                <div className="flex flex-wrap items-center justify-end gap-2.5 pt-3 border-t border-amber-200">
                  <button
                    onClick={handleCancelReservation}
                    disabled={isUpdatingStatus}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-white hover:bg-rose-50 text-rose-700 px-3.5 py-2 text-xs font-bold transition shadow-2xs cursor-pointer disabled:opacity-60"
                  >
                    <XCircle className="h-3.5 w-3.5 text-rose-500" />
                    <span>Снять бронь</span>
                  </button>

                  <button
                    onClick={() => setIsExtendModalOpen(true)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-amber-300 bg-white hover:bg-amber-100/50 text-amber-800 px-3.5 py-2 text-xs font-bold transition shadow-2xs cursor-pointer"
                  >
                    <CalendarPlus className="h-3.5 w-3.5 text-amber-600" />
                    <span>Продлить срок</span>
                  </button>

                  <button
                    onClick={handleSignReservation}
                    disabled={isUpdatingStatus}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white px-4 py-2 text-xs font-bold transition shadow-md shadow-emerald-600/20 cursor-pointer disabled:opacity-60"
                  >
                    <FileCheck2 className="h-3.5 w-3.5" />
                    <span>Оформить продажу (подписать договор)</span>
                  </button>
                </div>
              </div>
            )}

            {/* SECTION 2: IF UNIT IS SOLD (🔴 ПРОДАНА) */}
            {isSold && activeDeal && (
              <div className="space-y-4">
                <div className="rounded-2xl border border-blue-200 bg-blue-50/40 p-5 space-y-4 shadow-2xs">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-blue-100 pb-3">
                    <div className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-blue-600" />
                      <span className="text-sm font-black text-blue-950 font-mono">
                        Договор №{formatContractNumber(activeDeal.contract_number)}
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

                {/* Installment Schedule & Payments Breakdown */}
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
            )}

            {/* SECTION 3: IF UNIT IS AVAILABLE (🟢 СВОБОДНА) */}
            {!isReserved && !isSold && (
              <div className="space-y-4">
                {/* LADDER PRICING SCALE (ЛЕСТНИЧНАЯ ШКАЛА ЦЕН) */}
                <div className="rounded-3xl border-2 border-indigo-100 bg-gradient-to-b from-indigo-50/60 via-white to-slate-50/80 p-5 space-y-4 shadow-sm">
                  {/* Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-indigo-100/80 pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="h-9 w-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                        <TrendingUp className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-slate-900">
                          Лестничные условия цен и выгода от размера первоначального взноса
                        </h4>
                        <p className="text-[11px] text-indigo-700 font-medium">
                          0% — базовая цена • 5% — скидка -$5/м² • 10%–100% — скидка от -$10 до -$100/м²
                        </p>
                      </div>
                    </div>

                    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 self-start sm:self-auto shadow-2xs">
                      <Tag className="h-3.5 w-3.5 text-slate-400" />
                      <span>Стартовая цена: {basePricePerM2} {projectCurrency}/м²</span>
                      {/* Discrete subtle pencil */}
                      <button
                        type="button"
                        onClick={handleOpenPriceModal}
                        title="Настроить стартовую цену"
                        className="ml-0.5 p-0.5 rounded text-slate-300 hover:text-indigo-600 transition cursor-pointer"
                      >
                        <Edit3 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>

                  {/* Quick Percentage Selector Pills (12 options) */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                        Выберите % первоначального взноса:
                      </span>
                      <span className="text-[11px] font-bold text-indigo-600">
                        {activeTier.percent === 0
                          ? '0% (Без первоначального взноса)'
                          : activeTier.percent === 100
                          ? '⭐ 100% Оплата (Максимальная выгода)'
                          : `Выбран взнос: ${activeTier.percent}% (Скидка -${activeTier.discountPerM2}$/м²)`}
                      </span>
                    </div>

                    <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-12 gap-1.5">
                      {ladderTiers.map((tier) => {
                        const isSelected = tier.percent === selectedLadderPercent;
                        const isZero = tier.percent === 0;
                        const isFull = tier.percent === 100;
                        return (
                          <button
                            key={tier.percent}
                            type="button"
                            onClick={() => setSelectedLadderPercent(tier.percent)}
                            className={`py-2 px-1 rounded-xl text-center font-black transition cursor-pointer border flex flex-col items-center justify-center ${
                              isSelected
                                ? 'bg-indigo-600 text-white border-indigo-700 shadow-md scale-105 z-10 ring-2 ring-indigo-300'
                                : isFull
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                                : isZero
                                ? 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
                                : 'bg-white text-slate-700 border-slate-200 hover:bg-indigo-50/50 hover:border-indigo-200'
                            }`}
                          >
                            <span className="text-xs">{tier.percent}%</span>
                            <span className={`text-[9px] font-bold mt-0.5 ${
                              isSelected
                                ? 'text-indigo-200'
                                : isFull
                                ? 'text-emerald-600'
                                : isZero
                                ? 'text-slate-500'
                                : 'text-slate-400'
                            }`}>
                              {isZero ? '0$' : `-${tier.discountPerM2}$`}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Active Selected Tier Highlight Cards */}
                  <div className="rounded-2xl border-2 border-indigo-200/80 bg-white p-4 shadow-sm grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {/* CARD 1: ВЫГОДА ПОКУПАТЕЛЯ / ЭКОНОМИЯ (БОЛЬШИМИ ЦИФРАМИ) */}
                    <div className={`rounded-2xl p-3 border shadow-2xs flex flex-col justify-between ${
                      activeTier.percent > 0
                        ? 'bg-gradient-to-br from-emerald-50 via-emerald-100/60 to-emerald-50 border-emerald-300 ring-2 ring-emerald-400/30'
                        : 'bg-slate-50 border-slate-200'
                    }`}>
                      <span className="text-[10px] font-black uppercase tracking-wider block text-emerald-800">
                        {activeTier.percent > 0 ? '🔥 Выгода покупателя' : 'Выгода покупателя'}
                      </span>
                      <div className={`text-base sm:text-lg font-black tracking-tight mt-1 ${
                        activeTier.percent > 0 ? 'text-emerald-700' : 'text-slate-700'
                      }`}>
                        {activeTier.percent > 0
                          ? `+${activeTier.discountTotal.toLocaleString()} ${projectCurrency}`
                          : `0 ${projectCurrency}`}
                      </div>
                      <div className={`text-[10px] font-bold mt-1 ${
                        activeTier.percent > 0 ? 'text-emerald-700' : 'text-slate-400'
                      }`}>
                        {activeTier.percent > 0
                          ? `Скидка -${activeTier.discountPerM2} $/м² (–${activeTier.savingPercent}%)`
                          : 'Базовая цена (0% скидки)'}
                      </div>
                    </div>

                    {/* CARD 2: ЦЕНА ЗА 1 М² */}
                    <div className="rounded-2xl bg-slate-50 p-3 border border-slate-200/80 shadow-2xs flex flex-col justify-between">
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">Цена за 1 м²</span>
                      <div className="text-base sm:text-lg font-black text-indigo-950 mt-1">
                        {activeTier.tieredPricePerM2.toLocaleString()} {projectCurrency}/м²
                      </div>
                      <div className="text-[10px] text-slate-400 font-semibold mt-1">
                        (Базовая: {basePricePerM2} {projectCurrency})
                      </div>
                    </div>

                    {/* CARD 3: ПЕРВЫЙ ВЗНОС */}
                    <div className="rounded-2xl bg-emerald-50/70 p-3 border border-emerald-200 shadow-2xs flex flex-col justify-between">
                      <span className="text-[10px] font-black text-emerald-800 uppercase tracking-wider block">
                        Первый взнос ({activeTier.percent}%)
                      </span>
                      <div className="text-base sm:text-lg font-black text-emerald-800 mt-1">
                        {activeTier.downPayment.toLocaleString()} {projectCurrency}
                      </div>
                      <div className="text-[10px] text-emerald-700 font-semibold mt-1">
                        {activeTier.percent === 100
                          ? 'Полная оплата договора'
                          : activeTier.percent === 0
                          ? '100% суммы в рассрочку'
                          : `Остаток: ${activeTier.remaining.toLocaleString()} ${projectCurrency}`}
                      </div>
                    </div>

                    {/* CARD 4: ИТОГОВАЯ СТОИМОСТЬ */}
                    <div className="rounded-2xl bg-blue-50/80 p-3 border border-blue-200 shadow-2xs flex flex-col justify-between">
                      <span className="text-[10px] font-black text-blue-900 uppercase tracking-wider block">Итоговая стоимость</span>
                      <div className="text-base sm:text-lg font-black text-blue-950 mt-1">
                        {activeTier.totalTierPrice.toLocaleString()} {projectCurrency}
                      </div>
                      <div className="text-[10px] text-blue-700 font-semibold mt-1">
                        {areaM2} м² × {activeTier.tieredPricePerM2} {projectCurrency}
                      </div>
                    </div>
                  </div>

                  {/* Toggle Detailed Comparison Table with Customer Savings */}
                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={() => setShowFullLadderTable(!showFullLadderTable)}
                      className="text-xs font-bold text-indigo-700 hover:text-indigo-900 flex items-center gap-1 cursor-pointer"
                    >
                      {showFullLadderTable ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      <span>
                        {showFullLadderTable
                          ? 'Скрыть подробную таблицу всех вариантов'
                          : 'Показать сравнительную таблицу всех 12 вариантов с расчетом выгоды покупателя'}
                      </span>
                    </button>

                    {showFullLadderTable && (
                      <div className="mt-2.5 overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-xs">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
                            <tr>
                              <th className="py-2.5 px-3">Взнос</th>
                              <th className="py-2.5 px-2">Скидка / м²</th>
                              <th className="py-2.5 px-2">Цена за м²</th>
                              <th className="py-2.5 px-2.5">1-й взнос</th>
                              <th className="py-2.5 px-2.5">Итоговая цена</th>
                              <th className="py-2.5 px-2.5 text-emerald-800 bg-emerald-50/60 font-black">
                                Выгода покупателя (Экономия)
                              </th>
                              <th className="py-2.5 px-2 text-slate-500">Рассрочка на 12 мес</th>
                              <th className="py-2.5 px-2.5 text-right">Действие</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 font-medium">
                            {ladderTiers.map((tier) => {
                              const isCurrent = tier.percent === selectedLadderPercent;
                              const isZero = tier.percent === 0;
                              const isFull = tier.percent === 100;
                              return (
                                <tr
                                  key={tier.percent}
                                  onClick={() => setSelectedLadderPercent(tier.percent)}
                                  className={`cursor-pointer transition ${
                                    isCurrent ? 'bg-indigo-50/80 font-bold text-indigo-950' : 'hover:bg-slate-50'
                                  }`}
                                >
                                  <td className="py-2.5 px-3">
                                    <span className={`px-2 py-0.5 rounded-md text-[11px] font-black ${
                                      isFull
                                        ? 'bg-emerald-100 text-emerald-800'
                                        : isZero
                                        ? 'bg-slate-100 text-slate-700'
                                        : 'bg-indigo-50 text-indigo-800'
                                    }`}>
                                      {tier.percent}% {isZero ? '(Без взноса)' : isFull ? '(Полная)' : ''}
                                    </span>
                                  </td>
                                  <td className="py-2.5 px-2 text-emerald-600 font-bold">
                                    {isZero ? '0' : `-${tier.discountPerM2}`} {projectCurrency}
                                  </td>
                                  <td className="py-2.5 px-2 font-bold text-slate-900">
                                    {tier.tieredPricePerM2} {projectCurrency}
                                  </td>
                                  <td className="py-2.5 px-2.5 font-bold text-emerald-700">
                                    {tier.downPayment.toLocaleString()} {projectCurrency}
                                  </td>
                                  <td className="py-2.5 px-2.5 font-black text-slate-900">
                                    {tier.totalTierPrice.toLocaleString()} {projectCurrency}
                                  </td>
                                  {/* CUSTOMER SAVINGS / BENEFIT COLUMN */}
                                  <td className="py-2.5 px-2.5 bg-emerald-50/40">
                                    {isZero ? (
                                      <span className="text-slate-400 font-semibold text-[11px]">
                                        Стартовая цена (0%)
                                      </span>
                                    ) : (
                                      <div className="flex items-center gap-1.5">
                                        <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-black text-xs">
                                          +{tier.discountTotal.toLocaleString()} {projectCurrency}
                                        </span>
                                        <span className="text-[10px] text-emerald-700 font-bold">
                                          (–{tier.savingPercent}%)
                                        </span>
                                      </div>
                                    )}
                                  </td>
                                  <td className="py-2.5 px-2 text-slate-600 text-[11px]">
                                    {isFull ? '—' : `${tier.monthly12.toLocaleString()} ${projectCurrency}/мес`}
                                  </td>
                                  <td className="py-2.5 px-2.5 text-right">
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedLadderPercent(tier.percent);
                                        setIsDealWizardOpen(true);
                                      }}
                                      className="px-2.5 py-1 rounded-lg bg-indigo-600 text-white text-[10px] font-bold hover:bg-indigo-700 transition cursor-pointer shadow-2xs"
                                    >
                                      Оформить
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* Main Action Buttons */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-indigo-100">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setIsReserveModalOpen(true)}
                        className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-amber-500/20 hover:from-amber-600 hover:to-orange-700 transition cursor-pointer"
                      >
                        <Clock className="h-4 w-4" />
                        <span>Забронировать квартиру</span>
                      </button>

                      {user?.role === 'ADMIN' && (
                        <button
                          type="button"
                          onClick={handleToggleBlock}
                          disabled={isUpdatingStatus}
                          className="flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
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

                    <button
                      type="button"
                      onClick={() => setIsDealWizardOpen(true)}
                      className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-700 px-6 py-2.5 text-xs font-black text-white shadow-lg shadow-indigo-600/30 hover:from-blue-700 hover:to-indigo-800 transition cursor-pointer"
                    >
                      <Plus className="h-4 w-4" />
                      <span>
                        Оформить сделку ({activeTier.percent}% взнос • {activeTier.tieredPricePerM2} $/м²
                        {activeTier.percent > 0 ? ` • Экономия: +${activeTier.discountTotal.toLocaleString()} $` : ''})
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
        </div>
      </div>

      {/* Child Modals with Top-Level Layering */}
      {isReserveModalOpen && (
        <ReserveApartmentModal
          isOpen={isReserveModalOpen}
          onClose={() => setIsReserveModalOpen(false)}
          unit={unit}
          currency={projectCurrency}
          onReserved={() => {
            fetchUnit();
            if (onUnitUpdated) onUnitUpdated();
            setIsReserveModalOpen(false);
          }}
        />
      )}

      {isExtendModalOpen && activeDeal && (
        <ExtendReservationModal
          isOpen={isExtendModalOpen}
          onClose={() => setIsExtendModalOpen(false)}
          deal={activeDeal}
          onExtended={() => {
            fetchUnit();
            if (onUnitUpdated) onUnitUpdated();
            setIsExtendModalOpen(false);
          }}
        />
      )}

      {isDealWizardOpen && (
        <DealWizardModal
          isOpen={isDealWizardOpen}
          onClose={() => setIsDealWizardOpen(false)}
          unit={unit}
          currency={projectCurrency}
          initialDownPaymentPercent={activeTier?.percent || 30}
          initialPricePerM2={activeTier?.tieredPricePerM2 || basePricePerM2}
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

      {/* Modal: Set Base Price with Interactive Chessboard Grid */}
      {isPriceModalOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-5 bg-slate-900/75 backdrop-blur-xs animate-in fade-in overflow-hidden">
          <div className="relative w-full max-w-5xl max-h-[92vh] flex flex-col rounded-3xl border border-slate-200 bg-white shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 p-4 sm:p-5 bg-slate-50/70">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
                  <Tag className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-slate-900">
                    Установка стартовой цены и выбор квартир на шахматке
                  </h3>
                  <p className="text-xs text-slate-500">
                    {projectName} • Выберите нужные квартиры или этажи в сетке для применения цены
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPriceModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:bg-slate-200 hover:text-slate-700 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveBasePrice} className="flex-1 flex flex-col overflow-hidden">
              {/* Top Controls & Stats */}
              <div className="p-4 sm:p-5 bg-blue-50/40 border-b border-slate-200 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      Стартовая цена за 1 м² ({projectCurrency}) *
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        required
                        min="1"
                        step="1"
                        value={editPricePerM2}
                        onChange={(e) => setEditPricePerM2(e.target.value)}
                        className="w-full rounded-xl border-2 border-blue-300 bg-white px-3 py-2 text-base font-black text-blue-950 outline-none focus:border-blue-600 shadow-2xs"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 font-extrabold text-blue-600 text-xs">
                        {projectCurrency}/м²
                      </span>
                    </div>
                  </div>

                  <div className="sm:col-span-2 grid grid-cols-3 gap-2">
                    <div className="rounded-xl bg-white p-2.5 border border-blue-200 shadow-2xs">
                      <span className="text-[10px] font-bold uppercase text-slate-400 block">Выбрано квартир</span>
                      <div className="text-sm font-black text-blue-900 mt-0.5">
                        {selectedUnitIds.length} <span className="text-xs font-semibold text-slate-500">из {allUnitsInProject.length}</span>
                      </div>
                    </div>
                    <div className="rounded-xl bg-white p-2.5 border border-blue-200 shadow-2xs">
                      <span className="text-[10px] font-bold uppercase text-slate-400 block">Общая площадь</span>
                      <div className="text-sm font-black text-blue-900 mt-0.5">
                        {totalSelectedArea.toFixed(1)} м²
                      </div>
                    </div>
                    <div className="rounded-xl bg-white p-2.5 border border-blue-200 shadow-2xs">
                      <span className="text-[10px] font-bold uppercase text-slate-400 block">Общая стоимость</span>
                      <div className="text-sm font-black text-emerald-700 mt-0.5 truncate">
                        {totalSelectedAmount.toLocaleString()} {projectCurrency}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quick Selection Presets */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[11px] font-bold text-slate-600 mr-1">Быстрый выбор:</span>
                  <button
                    type="button"
                    onClick={handleSelectOnlyThisUnit}
                    className="px-2.5 py-1 rounded-lg bg-white border border-slate-300 text-[11px] font-bold text-slate-700 hover:bg-slate-100 cursor-pointer shadow-2xs"
                  >
                    Только №{unit?.unit_number}
                  </button>
                  <button
                    type="button"
                    onClick={handleSelectAllSameRooms}
                    className="px-2.5 py-1 rounded-lg bg-white border border-slate-300 text-[11px] font-bold text-slate-700 hover:bg-slate-100 cursor-pointer shadow-2xs"
                  >
                    Все {unit?.rooms}-комнатные ({allUnitsInProject.filter((u) => u.rooms === unit?.rooms).length})
                  </button>
                  <button
                    type="button"
                    onClick={handleSelectAllSameFloor}
                    className="px-2.5 py-1 rounded-lg bg-white border border-slate-300 text-[11px] font-bold text-slate-700 hover:bg-slate-100 cursor-pointer shadow-2xs"
                  >
                    Весь {floorNumber} этаж ({allUnitsInProject.filter((u) => u.floor_id === unit?.floor_id).length})
                  </button>
                  <button
                    type="button"
                    onClick={handleSelectAllProject}
                    className="px-2.5 py-1 rounded-lg bg-blue-100 border border-blue-300 text-[11px] font-bold text-blue-800 hover:bg-blue-200 cursor-pointer shadow-2xs"
                  >
                    Выбрать ВСЕ ({allUnitsInProject.length})
                  </button>
                  {selectedUnitIds.length > 0 && (
                    <button
                      type="button"
                      onClick={handleClearSelection}
                      className="px-2.5 py-1 rounded-lg bg-rose-50 border border-rose-200 text-[11px] font-bold text-rose-700 hover:bg-rose-100 cursor-pointer"
                    >
                      Снять все
                    </button>
                  )}
                </div>
              </div>

              {/* Scrollable Visual Chessboard Area */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-6 bg-slate-100/60">
                {loadingChessboard ? (
                  <div className="h-48 flex flex-col items-center justify-center gap-2">
                    <div className="h-7 w-7 animate-spin rounded-full border-3 border-blue-600 border-t-transparent" />
                    <span className="text-xs text-slate-500 font-medium">Загрузка шахматки объекта...</span>
                  </div>
                ) : projectChessboard.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400 bg-white rounded-2xl border">
                    Данные шахматки объекта не найдены
                  </div>
                ) : (
                  projectChessboard.map((building) => (
                    <div key={building.id} className="space-y-4">
                      <div className="flex items-center gap-2 font-black text-sm text-slate-900 bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
                        <Building2 className="h-4 w-4 text-blue-600" />
                        <span>{building.name || `Корпус ${building.id}`}</span>
                      </div>

                      {(building.sections || []).map((section) => {
                        // Sort floors in descending order (top floor first)
                        const sortedFloors = [...(section.floors || [])].sort(
                          (a, b) => (b.floor_number || 0) - (a.floor_number || 0)
                        );

                        return (
                          <div key={section.id} className="rounded-2xl bg-white border border-slate-200 p-4 shadow-2xs space-y-3">
                            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                              <span className="text-xs font-black text-slate-700">
                                {section.name || `Подъезд ${section.id}`}
                              </span>
                              <span className="text-[11px] text-slate-400 font-semibold">
                                Этажей: {sortedFloors.length}
                              </span>
                            </div>

                            <div className="space-y-2">
                              {sortedFloors.map((floor) => {
                                const floorUnits = floor.units || [];
                                const isFloorAllSelected =
                                  floorUnits.length > 0 &&
                                  floorUnits.every((u) => selectedUnitIds.includes(u.id));

                                return (
                                  <div
                                    key={floor.id}
                                    className="flex items-start sm:items-center gap-2.5 p-2 rounded-xl bg-slate-50 border border-slate-100"
                                  >
                                    {/* Floor Label & Selector Button */}
                                    <button
                                      type="button"
                                      onClick={() => handleToggleFloor(floorUnits)}
                                      title="Выбрать/снять весь этаж"
                                      className={`w-24 shrink-0 py-1.5 px-2 rounded-lg text-left text-xs font-bold transition cursor-pointer border ${
                                        isFloorAllSelected
                                          ? 'bg-blue-600 text-white border-blue-700 shadow-xs'
                                          : 'bg-white text-slate-700 border-slate-200 hover:bg-blue-50'
                                      }`}
                                    >
                                      <div className="text-[11px] font-black">{floor.floor_number} этаж</div>
                                      <div className={`text-[9px] font-semibold ${isFloorAllSelected ? 'text-blue-100' : 'text-slate-400'}`}>
                                        {isFloorAllSelected ? '✓ Выбран' : 'Выбрать этаж'}
                                      </div>
                                    </button>

                                    {/* Floor Units Grid */}
                                    <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-1.5">
                                      {floorUnits.map((u) => {
                                        const isUnitSelected = selectedUnitIds.includes(u.id);
                                        const curPrice = u.price_per_m2_minor > 0 ? u.price_per_m2_minor / 100 : 0;

                                        return (
                                          <button
                                            key={u.id}
                                            type="button"
                                            onClick={() => handleToggleUnit(u.id)}
                                            className={`p-2 rounded-xl text-left transition cursor-pointer border flex flex-col justify-between ${
                                              isUnitSelected
                                                ? 'bg-blue-600 text-white border-blue-700 shadow-md ring-2 ring-blue-300 font-bold scale-[1.02]'
                                                : 'bg-white text-slate-800 border-slate-200 hover:border-blue-300 hover:bg-blue-50/50'
                                            }`}
                                          >
                                            <div className="flex items-center justify-between">
                                              <span className="text-xs font-black truncate">
                                                №{u.unit_number}
                                              </span>
                                              {isUnitSelected ? (
                                                <CheckCircle2 className="h-3.5 w-3.5 text-white shrink-0" />
                                              ) : (
                                                <span className="h-3 w-3 rounded-full border border-slate-300 shrink-0" />
                                              )}
                                            </div>

                                            <div className={`text-[10px] mt-1 ${isUnitSelected ? 'text-blue-100' : 'text-slate-500'}`}>
                                              {u.rooms === 0 ? 'Студия' : `${u.rooms}к`} • {(u.area_m2_x100 / 100).toFixed(1)} м²
                                            </div>

                                            <div className={`text-[9px] font-bold mt-1 ${isUnitSelected ? 'text-blue-200' : 'text-slate-400'}`}>
                                              {curPrice > 0 ? `${curPrice} $/м²` : 'Не задана'}
                                            </div>
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ))
                )}
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-between gap-3 p-4 sm:p-5 border-t border-slate-200 bg-white">
                <div className="text-xs font-bold text-slate-600">
                  Выбрано для применения: <strong className="text-blue-700 font-black">{selectedUnitIds.length}</strong> квартир
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsPriceModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-slate-300 font-bold text-xs text-slate-600 hover:bg-slate-50 cursor-pointer"
                  >
                    Отмена
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingPrice || selectedUnitIds.length === 0}
                    className="px-6 py-2.5 rounded-xl bg-blue-600 font-black text-xs text-white shadow-md hover:bg-blue-700 transition cursor-pointer disabled:opacity-50"
                  >
                    {isSavingPrice
                      ? 'Сохранение цен...'
                      : `Применить цену ${editPricePerM2} ${projectCurrency}/м² (${selectedUnitIds.length} кв.)`}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
