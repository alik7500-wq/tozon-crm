import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { useModalDismiss } from '../../hooks/useModalDismiss';
import { PassportOCRModal } from '../documents/PassportOCRModal';
import {
  X,
  User,
  Users,
  CreditCard,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Plus,
  Search,
  ArrowRight,
  ArrowLeft,
  DollarSign,
  FileCheck,
  ShieldCheck,
  Repeat,
  Coins,
  Car,
  Building2,
  Home,
  Clock,
  Tag,
  Scan,
  Sparkles
} from 'lucide-react';

export const DealWizardModal = ({
  isOpen,
  onClose,
  unit: initialUnit = null,
  currency: initialCurrency = 'USD',
  initialDownPaymentPercent = 30,
  initialPricePerM2 = null,
  onDealCreated,
}) => {
  // If unit is passed from outside, start from step 1 (Client). If not, start from step 0 (Unit Selection)
  const [selectedUnit, setSelectedUnit] = useState(initialUnit);
  const [step, setStep] = useState(initialUnit ? 1 : 0); // 0: Unit, 1: Client, 2: Terms, 3: Schedule, 4: Confirm

  // Available units & projects for Step 0
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState('ALL');
  const [availableUnits, setAvailableUnits] = useState([]);
  const [unitSearch, setUnitSearch] = useState('');
  const [unitRoomsFilter, setUnitRoomsFilter] = useState('ALL');
  const [loadingUnits, setLoadingUnits] = useState(false);

  // Leads
  const [leads, setLeads] = useState([]);
  const [searchLead, setSearchLead] = useState('');
  const [selectedLead, setSelectedLead] = useState(null);
  const [isCreatingNewLead, setIsCreatingNewLead] = useState(false);
  const [isPassportOcrOpen, setIsPassportOcrOpen] = useState(false);
  const [ocrVerifiedInfo, setOcrVerifiedInfo] = useState(null);

  // New Lead Form state
  const [newLeadData, setNewLeadData] = useState({
    full_name: '',
    phone: '',
    passport_series: 'A',
    passport_number: '',
    passport_issued_by: 'МВД РТ',
    passport_issue_date: '2022-05-15',
    birth_date: '1990-01-01',
    registration_address: 'г. Душанбе, ул. Рудаки 100',
    inn: '',
  });

  const handlePassportVerified = async (verified) => {
    setOcrVerifiedInfo(verified);
    const updated = {
      full_name: verified.full_name || 'Покупатель',
      phone: verified.phone || newLeadData.phone || '+992 900 00 00 00',
      passport_series: verified.passport_series || 'A',
      passport_number: verified.passport_number || '',
      passport_issued_by: verified.passport_issued_by || verified.issuing_authority || 'МВД РТ',
      passport_issue_date: verified.passport_issue_date || verified.issue_date || '2020-02-14',
      birth_date: verified.birth_date || '1990-01-01',
      registration_address: verified.registration_address || verified.address || 'г. Худжанд',
      inn: verified.inn || ''
    };
    setNewLeadData(updated);
    setIsCreatingNewLead(true);

    try {
      const res = await api.post('/leads', updated);
      const created = res.data?.lead || res.lead || res;
      if (created?.id) {
        setSelectedLead(created);
        setIsCreatingNewLead(false);
        fetchLeads();
      }
    } catch (err) {
      console.warn('Auto-create lead note:', err.message);
    }
  };

  // Deal Financials
  const [dealStatus, setDealStatus] = useState('SIGNED'); // 'SIGNED' or 'RESERVED'
  const [reservationDays, setReservationDays] = useState(3);
  const [recordInitialPayment, setRecordInitialPayment] = useState(true);

  const [pricePerM2, setPricePerM2] = useState(500);
  const [discountType, setDiscountType] = useState('AMOUNT'); // 'AMOUNT' or 'PERCENT'
  const [discountValue, setDiscountValue] = useState(0);
  const [paymentType, setPaymentType] = useState('INSTALLMENT'); // 'INSTALLMENT', 'FULL', 'BARTER', 'PARTIAL_BARTER'

  // Barter fields
  const [barterDescription, setBarterDescription] = useState('');
  const [barterAmount, setBarterAmount] = useState(0);

  // Installment Calculator
  const [downPaymentPercent, setDownPaymentPercent] = useState(30);
  const [downPaymentAmount, setDownPaymentAmount] = useState(0);
  const [installmentMonths, setInstallmentMonths] = useState(12);
  const [dealDate, setDealDate] = useState(new Date().toISOString().split('T')[0]);
  const [firstPaymentDate, setFirstPaymentDate] = useState(
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [schedule, setSchedule] = useState([]);

  // Initial Payment PKO controls
  const [initialPaymentReference, setInitialPaymentReference] = useState('');
  const [initialPaymentDate, setInitialPaymentDate] = useState('');
  const [initialPaymentMethod, setInitialPaymentMethod] = useState('CASH');

  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Calculations
  const areaM2 = selectedUnit 
    ? (selectedUnit.area_m2_x100 ? (selectedUnit.area_m2_x100 / 100) : (parseFloat(selectedUnit.area) || 50)) 
    : 50;

  const basePricePerM2 = selectedUnit
    ? (selectedUnit.price_per_m2_minor > 0 ? selectedUnit.price_per_m2_minor / 100 : (parseFloat(selectedUnit.price_per_m2) || 500))
    : 500;

  const calculatedBasePrice = Math.round(areaM2 * (parseFloat(pricePerM2) || basePricePerM2));

  const actualDiscountMinor = discountType === 'PERCENT'
    ? Math.round(calculatedBasePrice * ((parseFloat(discountValue) || 0) / 100))
    : Math.round(parseFloat(discountValue) || 0);

  const finalPrice = Math.max(0, calculatedBasePrice - actualDiscountMinor);
  const effectivePricePerM2 = areaM2 > 0 ? (finalPrice / areaM2).toFixed(2) : 0;

  const remainingBalance = paymentType === 'BARTER'
    ? 0
    : paymentType === 'PARTIAL_BARTER'
    ? Math.max(0, finalPrice - (parseFloat(barterAmount) || 0) - (parseFloat(downPaymentAmount) || 0))
    : Math.max(0, finalPrice - (parseFloat(downPaymentAmount) || 0));

  const getUnitProjectName = (u) => {
    if (!u) return 'ЖК TOZON PLAZA';
    return u.project_name || u.floors?.sections?.buildings?.projects?.name || 'ЖК TOZON PLAZA';
  };

  // Update rates when unit is selected
  useEffect(() => {
    if (selectedUnit) {
      const p = initialPricePerM2
        ? parseFloat(initialPricePerM2)
        : selectedUnit.price_per_m2_minor > 0 
        ? (selectedUnit.price_per_m2_minor / 100) 
        : (parseFloat(selectedUnit.price_per_m2) || 500);
      
      setPricePerM2(p);
      const pct = initialDownPaymentPercent || 30;
      setDownPaymentPercent(pct);
      const total = Math.round(areaM2 * p);
      setDownPaymentAmount(Math.round(total * (pct / 100)));
    }
  }, [selectedUnit, initialPricePerM2, initialDownPaymentPercent]);

  useEffect(() => {
    if (isOpen) {
      setSelectedUnit(initialUnit);
      setStep(initialUnit ? 1 : 0);
      setError('');
      setInitialPaymentReference('');
      setInitialPaymentDate(dealDate);
      setInitialPaymentMethod('CASH');
      fetchProjects();
      fetchLeads();
      fetchAvailableUnits();
    }
  }, [isOpen, initialUnit]);

  const fetchProjects = async () => {
    try {
      const res = await api.get('/projects');
      setProjects(res.data?.projects || res.projects || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAvailableUnits = async (projId = selectedProjectId) => {
    setLoadingUnits(true);
    try {
      const params = {};
      if (projId && projId !== 'ALL') params.projectId = projId;
      const res = await api.get('/deals/available-units', { params });
      setAvailableUnits(res.data?.units || res.units || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingUnits(false);
    }
  };

  const fetchLeads = async () => {
    try {
      const res = await api.get('/leads');
      setLeads(res.data?.leads || res.leads || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleProjectFilterChange = (projId) => {
    setSelectedProjectId(projId);
    fetchAvailableUnits(projId);
  };

  // Down payment syncing
  const handleDownPaymentPercentChange = (val) => {
    const pct = parseFloat(val) || 0;
    setDownPaymentPercent(pct);
    setDownPaymentAmount(Math.round(finalPrice * (pct / 100)));
  };

  const handleDownPaymentAmountChange = (val) => {
    const amt = parseFloat(val) || 0;
    setDownPaymentAmount(amt);
    if (finalPrice > 0) {
      setDownPaymentPercent(Math.round((amt / finalPrice) * 100));
    }
  };

  // Schedule auto-calculation
  const effectiveCashDebt = paymentType === 'PARTIAL_BARTER'
    ? Math.max(0, finalPrice - (parseFloat(barterAmount) || 0))
    : finalPrice;

  useEffect(() => {
    if ((paymentType === 'INSTALLMENT' || paymentType === 'PARTIAL_BARTER') && installmentMonths > 0 && remainingBalance > 0) {
      const months = Math.min(240, Math.max(1, parseInt(installmentMonths, 10) || 0));
      const base = Math.floor(remainingBalance / months);
      const remainder = remainingBalance % months;

      // Safely parse firstPaymentDate with fallback to today + 30 days if invalid/partial
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
        // Calculate target month and year with proper calendar day clamping (Rule #21)
        const totalMonths = (startMonth - 1) + (i - 1);
        const targetYear = startYear + Math.floor(totalMonths / 12);
        const targetMonth = (totalMonths % 12); // 0-indexed for Date
        
        // Find maximum valid days in this specific target month (handles 28/29 Feb, 30/31 days)
        const maxDaysInMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
        const actualDay = Math.min(startDay, maxDaysInMonth);

        const yyyy = String(targetYear);
        const mm = String(targetMonth + 1).padStart(2, '0');
        const dd = String(actualDay).padStart(2, '0');
        const dueDateStr = `${yyyy}-${mm}-${dd}`;

        const amount = i <= remainder ? (base + 1) : base;

        items.push({
          payment_number: i,
          due_date: dueDateStr,
          amount_minor: amount * 100,
          status: 'UPCOMING',
        });
      }
      setSchedule(items);
    } else {
      setSchedule([]);
    }
  }, [finalPrice, downPaymentAmount, installmentMonths, paymentType, firstPaymentDate, remainingBalance, barterAmount]);

  const isDirty = Boolean(selectedLead || (step > (initialUnit ? 1 : 0)) || Boolean(newLeadData?.full_name?.trim()));

  const { requestClose } = useModalDismiss({
    isOpen,
    onClose,
    isDirty,
    confirmMessage: 'Оформление сделки не завершено. Вы уверены, что хотите закрыть окно?'
  });

  if (!isOpen) return null;

  const handleCreateNewLead = async (e) => {
    e.preventDefault();
    if (!newLeadData.full_name || !newLeadData.phone) {
      setError('ФИО и телефон обязательны');
      return;
    }
    setError('');
    try {
      const res = await api.post('/leads', newLeadData);
      const created = res.data?.lead || res.lead || res;
      setSelectedLead(created);
      setIsCreatingNewLead(false);
      fetchLeads();
    } catch (err) {
      setError(err.message || 'Ошибка создания клиента');
    }
  };

  const handleNext = () => {
    if (step === 0 && !selectedUnit) {
      setError('Пожалуйста, выберите квартиру');
      return;
    }
    if (step === 1 && !selectedLead) {
      setError('Пожалуйста, выберите или создайте покупателя');
      return;
    }
    if (step === 2) {
      if ((paymentType === 'BARTER' || paymentType === 'PARTIAL_BARTER') && !barterDescription.trim()) {
        setError('Пожалуйста, укажите описание предмета бартера (например, авто, недвижимость)');
        return;
      }
    }
    setError('');
    setStep((prev) => prev + 1);
  };

  const handleBack = () => {
    setError('');
    if (initialUnit && step === 1) {
      return;
    }
    setStep((prev) => Math.max(0, prev - 1));
  };

  const handleFinalSubmit = async () => {
    setIsSubmitting(true);
    setError('');

    try {
      const downPaymentValue = (paymentType === 'INSTALLMENT' || paymentType === 'PARTIAL_BARTER')
        ? downPaymentAmount
        : finalPrice;

      let reservationExpiresAt = null;
      if (dealStatus === 'RESERVED') {
        const d = new Date();
        d.setDate(d.getDate() + (parseInt(reservationDays, 10) || 3));
        reservationExpiresAt = d.toISOString().split('T')[0];
      }

      const res = await api.post('/deals', {
        lead_id: selectedLead.id,
        unit_id: selectedUnit.id,
        deal_date: dealDate,
        status: dealStatus,
        payment_type: paymentType,
        base_price_minor: calculatedBasePrice * 100,
        discount_minor: actualDiscountMinor * 100,
        final_price_minor: finalPrice * 100,
        down_payment_minor: downPaymentValue * 100,
        installment_months: (paymentType === 'INSTALLMENT' || paymentType === 'PARTIAL_BARTER') ? parseInt(installmentMonths, 10) : 0,
        barter_description: (paymentType === 'BARTER' || paymentType === 'PARTIAL_BARTER') ? barterDescription : null,
        barter_amount_minor: (paymentType === 'BARTER' || paymentType === 'PARTIAL_BARTER') ? (parseFloat(barterAmount) || 0) * 100 : 0,
        reservation_expires_at: reservationExpiresAt,
        record_initial_payment: recordInitialPayment,
        initial_payment_reference: initialPaymentReference,
        initial_payment_date: initialPaymentDate || dealDate,
        initial_payment_method: initialPaymentMethod,
        schedules: (paymentType === 'INSTALLMENT' || paymentType === 'PARTIAL_BARTER') ? schedule : [],
      });

      const dealData = res.data?.deal || res.deal || res;
      if (onDealCreated) {
        onDealCreated(dealData);
      }
      onClose();
    } catch (err) {
      setError(err.message || 'Ошибка оформления сделки');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredUnits = (availableUnits || []).filter((u) => {
    if (unitRoomsFilter !== 'ALL' && String(u.rooms) !== String(unitRoomsFilter)) return false;
    if (unitSearch) {
      const q = unitSearch.toLowerCase();
      const uNum = String(u.unit_number || '').toLowerCase();
      const pName = String(u.project_name || u.floors?.sections?.buildings?.projects?.name || '').toLowerCase();
      const bName = String(u.building_name || u.floors?.sections?.buildings?.name || '').toLowerCase();
      return uNum.includes(q) || pName.includes(q) || bName.includes(q);
    }
    return true;
  });

  const filteredLeads = (leads || []).filter((l) => {
    const q = (searchLead || '').toLowerCase();
    const name = String(l.full_name || '').toLowerCase();
    const phone = String(l.phone || '').toLowerCase();
    return name.includes(q) || phone.includes(q);
  });

  const currency = selectedUnit?.project_currency || selectedUnit?.floors?.sections?.buildings?.projects?.currency || initialCurrency || 'USD';

  const stepLabels = initialUnit
    ? ['1. Покупатель', '2. Условия & Цена', '3. Рассрочка/График', '4. Подтверждение']
    : ['1. Выбор квартиры', '2. Покупатель', '3. Условия & Цена', '4. Рассрочка/График', '5. Подтверждение'];

  const currentStepIndex = initialUnit ? step - 1 : step;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in">
      <div className="relative w-full max-w-3xl max-h-[92vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              {selectedUnit && (
                <span className="rounded-md bg-blue-50 px-2 py-0.5 text-xs font-bold text-blue-700 border border-blue-200">
                  Кв. №{selectedUnit.unit_number} ({getUnitProjectName(selectedUnit)})
                </span>
              )}
              <h3 className="text-lg font-bold text-slate-900">Оформление сделки</h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Пошаговый мастер создания договора, расчета рассрочки и графика платежей
            </p>
          </div>

          <button onClick={requestClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 transition cursor-pointer">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Step Progress Bar */}
        <div className={`mt-4 grid gap-2 ${initialUnit ? 'grid-cols-4' : 'grid-cols-5'}`}>
          {stepLabels.map((label, idx) => (
            <div
              key={idx}
              className={`rounded-lg p-2 text-center text-xs font-bold transition ${
                currentStepIndex === idx
                  ? 'bg-blue-600 text-white shadow-xs'
                  : currentStepIndex > idx
                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                  : 'bg-slate-100 text-slate-400'
              }`}
            >
              {label}
            </div>
          ))}
        </div>

        {error && (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex-1 my-4">
          {/* STEP 0: UNIT SELECTION (When no unit is preselected) */}
          {step === 0 && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-blue-600" />
                  <span className="text-xs font-bold text-slate-900">Выберите свободную квартиру:</span>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={selectedProjectId}
                    onChange={(e) => handleProjectFilterChange(e.target.value)}
                    className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium outline-none focus:border-blue-500"
                  >
                    <option value="ALL">Все жилые комплексы</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>

                  <select
                    value={unitRoomsFilter}
                    onChange={(e) => setUnitRoomsFilter(e.target.value)}
                    className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium outline-none focus:border-blue-500"
                  >
                    <option value="ALL">Все комнаты</option>
                    <option value="1">1 комнатные</option>
                    <option value="2">2 комнатные</option>
                    <option value="3">3 комнатные</option>
                    <option value="4">4+ комнатные</option>
                  </select>
                </div>
              </div>

              {/* Search bar */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={unitSearch}
                  onChange={(e) => setUnitSearch(e.target.value)}
                  placeholder="Поиск по номеру квартиры, корпусу или ЖК..."
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 pl-9 pr-3 py-2 text-xs outline-none focus:border-blue-500 focus:bg-white"
                />
              </div>

              {/* Units List */}
              <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
                {loadingUnits ? (
                  <div className="p-8 text-center text-xs text-slate-400">Загрузка доступных квартир...</div>
                ) : filteredUnits.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-slate-200">
                    Свободные квартиры не найдены. Выберите другой проект или фильтр.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {filteredUnits.map((u) => {
                      const isSelected = selectedUnit?.id === u.id;
                      const uArea = (u.area_m2_x100 / 100).toFixed(1);

                      return (
                        <div
                          key={u.id}
                          onClick={() => setSelectedUnit(u)}
                          className={`p-3 rounded-xl border cursor-pointer transition flex items-center justify-between ${
                            isSelected
                              ? 'border-blue-500 bg-blue-50/70 shadow-xs ring-1 ring-blue-500'
                              : 'border-slate-200 bg-white hover:border-blue-300'
                          }`}
                        >
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-extrabold text-sm text-slate-900">
                                Кв. №{u.unit_number}
                              </span>
                              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-600">
                                {u.rooms} комн.
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-500 mt-0.5">
                              {u.project_name} • {u.floor_number} этаж ({uArea} м²)
                            </div>
                          </div>
                          {isSelected && <CheckCircle2 className="h-5 w-5 text-blue-600 shrink-0" />}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 1: CLIENT SELECTION / CREATION */}
          {step === 1 && (
            <div className="space-y-4">
              {/* Header Action Bar with OCR Fast Action */}
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <span className="text-xs font-bold text-slate-700">Покупатель недвижимости:</span>
                <button
                  type="button"
                  onClick={() => setIsPassportOcrOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-tozon-red hover:bg-tozon-red-hover text-white text-xs font-black transition shadow-xs shadow-tozon-red/20 cursor-pointer"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>⚡ Распознать паспорт (OCR)</span>
                </button>
              </div>

              {ocrVerifiedInfo && (
                <div className="flex items-center justify-between p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 animate-in fade-in">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <div>
                      <strong className="font-bold">Паспорт верифицирован через OCR:</strong>{' '}
                      <span>{ocrVerifiedInfo.full_name} ({ocrVerifiedInfo.passport_series} {ocrVerifiedInfo.passport_number})</span>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-200/80 text-emerald-800">
                    ICAO 9303 Verified
                  </span>
                </div>
              )}

              {!isCreatingNewLead ? (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700">Выберите клиента из базы:</span>
                    <button
                      type="button"
                      onClick={() => setIsCreatingNewLead(true)}
                      className="flex items-center gap-1 text-xs font-bold text-tozon-blue hover:text-tozon-blue-700 cursor-pointer"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>+ Создать вручную</span>
                    </button>
                  </div>

                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      value={searchLead}
                      onChange={(e) => setSearchLead(e.target.value)}
                      placeholder="Поиск по ФИО или телефону..."
                      className="w-full rounded-xl border border-slate-300 bg-slate-50 pl-9 pr-3 py-2 text-xs outline-none focus:border-tozon-blue focus:bg-white"
                    />
                  </div>

                  <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                    {filteredLeads.length === 0 ? (
                      <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 rounded-xl">
                        Клиенты не найдены. Нажмите «+ Создать вручную» или «⚡ Распознать паспорт (OCR)».
                      </div>
                    ) : (
                      filteredLeads.map((lead) => {
                        const isSelected = selectedLead?.id === lead.id;
                        return (
                          <div
                            key={lead.id}
                            onClick={() => setSelectedLead(lead)}
                            className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition ${
                              isSelected
                                ? 'border-tozon-blue bg-tozon-blue-50/70 shadow-xs ring-1 ring-tozon-blue'
                                : 'border-slate-200 bg-white hover:border-slate-300'
                            }`}
                          >
                            <div>
                              <div className="text-xs font-bold text-slate-900">{lead.full_name}</div>
                              <div className="text-[11px] text-slate-500">
                                {lead.phone} {lead.passport_number ? `• Паспорт: ${lead.passport_series || ''} ${lead.passport_number}` : ''}
                              </div>
                            </div>
                            {isSelected && <CheckCircle2 className="h-4 w-4 text-tozon-blue" />}
                          </div>
                        );
                      })
                    )}
                  </div>
                </>
              ) : (
                /* New Lead Form */
                <div className="space-y-3 p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                    <span className="text-xs font-bold text-slate-900">Новый покупатель (с паспортом для договора)</span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setIsPassportOcrOpen(true)}
                        className="text-xs font-bold text-tozon-red hover:underline flex items-center gap-1"
                      >
                        <Sparkles className="h-3 w-3" />
                        <span>OCR сканирование</span>
                      </button>
                      <span className="text-slate-300">•</span>
                      <button
                        type="button"
                        onClick={() => setIsCreatingNewLead(false)}
                        className="text-xs text-slate-500 hover:text-slate-800"
                      >
                        Отмена
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">ФИО клиента *</label>
                      <input
                        type="text"
                        required
                        placeholder="Алиев Рустам Бахромович"
                        value={newLeadData.full_name}
                        onChange={(e) => setNewLeadData({ ...newLeadData, full_name: e.target.value })}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">Телефон *</label>
                      <input
                        type="text"
                        required
                        placeholder="+992 900 00 00 00"
                        value={newLeadData.phone}
                        onChange={(e) => setNewLeadData({ ...newLeadData, phone: e.target.value })}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">Серия паспорта</label>
                      <input
                        type="text"
                        placeholder="A"
                        value={newLeadData.passport_series}
                        onChange={(e) => setNewLeadData({ ...newLeadData, passport_series: e.target.value })}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs outline-none focus:border-blue-500"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">Номер паспорта</label>
                      <input
                        type="text"
                        placeholder="1234567"
                        value={newLeadData.passport_number}
                        onChange={(e) => setNewLeadData({ ...newLeadData, passport_number: e.target.value })}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">Кем выдан паспорт</label>
                      <input
                        type="text"
                        placeholder="МВД Республики Таджикистан"
                        value={newLeadData.passport_issued_by}
                        onChange={(e) => setNewLeadData({ ...newLeadData, passport_issued_by: e.target.value })}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">Дата выдачи паспорта</label>
                      <input
                        type="date"
                        value={newLeadData.passport_issue_date}
                        onChange={(e) => setNewLeadData({ ...newLeadData, passport_issue_date: e.target.value })}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Адрес регистрации (прописка)</label>
                    <input
                      type="text"
                      placeholder="г. Душанбе, ул. Рудаки 100, кв. 4"
                      value={newLeadData.registration_address}
                      onChange={(e) => setNewLeadData({ ...newLeadData, registration_address: e.target.value })}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="button"
                      onClick={handleCreateNewLead}
                      className="rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-blue-700 cursor-pointer"
                    >
                      Сохранить и выбрать
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: FINANCIAL TERMS & PRICING */}
          {step === 2 && (
            <div className="space-y-4">
              {/* Unit snapshot */}
              <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 flex items-center justify-between text-xs">
                <div>
                  <span className="text-slate-500 block">Объект и квартира:</span>
                  <strong className="text-slate-900">
                    {selectedUnit?.project_name}, Кв. №{selectedUnit?.unit_number} ({selectedUnit?.rooms} комн., {areaM2} м²)
                  </strong>
                </div>
                <div className="text-right">
                  <span className="text-slate-500 block">Покупатель:</span>
                  <strong className="text-slate-900">{selectedLead?.full_name}</strong>
                </div>
              </div>

              {/* Deal / Contract Date */}
              <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-3">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-800">
                    Дата оформления сделки / договора *
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const today = new Date().toISOString().split('T')[0];
                      setDealDate(today);
                    }}
                    className="text-[11px] text-blue-600 font-bold hover:underline cursor-pointer"
                  >
                    Сегодня
                  </button>
                </div>
                <input
                  type="date"
                  required
                  value={dealDate}
                  onChange={(e) => {
                    const newD = e.target.value;
                    setDealDate(newD);
                    if (!initialPaymentDate || initialPaymentDate === dealDate) {
                      setInitialPaymentDate(newD);
                    }
                    if (newD) {
                      const parts = newD.split('-');
                      if (parts.length === 3) {
                        const y = parseInt(parts[0], 10);
                        const m = parseInt(parts[1], 10);
                        const d = parseInt(parts[2], 10);
                        const nextMonth = new Date(y, m, d);
                        const nextY = nextMonth.getFullYear();
                        const nextM = String(nextMonth.getMonth() + 1).padStart(2, '0');
                        const nextD = String(nextMonth.getDate()).padStart(2, '0');
                        setFirstPaymentDate(`${nextY}-${nextM}-${nextD}`);
                      }
                    }
                  }}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold outline-none focus:border-blue-500"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  💡 При вводе предыдущих сделок выберите фактическую дату заключения договора.
                </p>
              </div>

              {/* STEP 2: PRICING, LADDER DISCOUNT & BARGAINED FINAL PRICE */}
              <div className="rounded-2xl border-2 border-indigo-200 bg-indigo-50/50 p-4 space-y-3.5">
                <div className="flex items-center justify-between border-b border-indigo-200/80 pb-2.5">
                  <div>
                    <h4 className="text-xs font-black text-slate-900 uppercase tracking-wide flex items-center gap-1.5">
                      <Tag className="h-4 w-4 text-indigo-600" />
                      <span>Параметры стоимости и согласованная цена сделки</span>
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Стартовая цена: <strong className="text-slate-800 font-bold">{basePricePerM2} {currency}/м²</strong> ({Math.round(areaM2 * basePricePerM2).toLocaleString()} {currency})
                    </p>
                  </div>
                  <span className="px-2.5 py-1 rounded-xl bg-white border border-indigo-200 text-indigo-700 font-extrabold text-xs shadow-2xs">
                    {areaM2} м²
                  </span>
                </div>

                {/* Ladder Discount Quick Selector */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-bold text-slate-700">
                      Лестничный ориентир скидки по % первого взноса:
                    </span>
                    <span className="text-[10px] text-indigo-600 font-bold">
                      0% (Без ПВ) • 5% = -$5/м² • 10%–100% = от -$10 до -$100/м²
                    </span>
                  </div>

                  <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-12 gap-1">
                    {[0, 5, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map((pct) => {
                      const isSelected = downPaymentPercent === pct;
                      let discount = 0;
                      if (pct === 0) discount = 0;
                      else if (pct === 5) discount = 5;
                      else discount = pct;

                      const tierPrice = Math.max(0, basePricePerM2 - discount);
                      return (
                        <button
                          key={pct}
                          type="button"
                          onClick={() => {
                            setDownPaymentPercent(pct);
                            setPricePerM2(tierPrice);
                            setDiscountType('AMOUNT');
                            setDiscountValue(0);
                            const total = Math.round(areaM2 * tierPrice);
                            setDownPaymentAmount(Math.round(total * (pct / 100)));
                          }}
                          className={`py-1.5 px-1 rounded-lg text-center font-bold text-xs transition cursor-pointer border ${
                            isSelected
                              ? 'bg-indigo-600 text-white border-indigo-700 shadow-xs'
                              : 'bg-white text-slate-700 border-slate-200 hover:bg-indigo-50'
                          }`}
                        >
                          <div>{pct}%</div>
                          <div className={`text-[9px] ${isSelected ? 'text-indigo-200' : 'text-slate-400'}`}>
                            {tierPrice}$
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Bargained Final Price Inputs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      Окончательная цена сделки (после торга) ({currency}) *
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={finalPrice}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        const baseTot = Math.round(areaM2 * (parseFloat(pricePerM2) || basePricePerM2));
                        const disc = Math.max(0, baseTot - val);
                        setDiscountType('AMOUNT');
                        setDiscountValue(disc);
                        setDownPaymentAmount(Math.round(val * (downPaymentPercent / 100)));
                      }}
                      className="w-full rounded-xl border-2 border-indigo-300 bg-white px-3 py-2 text-sm font-black text-indigo-900 outline-none focus:border-indigo-600 shadow-xs"
                    />
                    <span className="text-[11px] text-slate-500 font-semibold mt-1 block">
                      Фактически: <strong className="text-slate-800">{effectivePricePerM2} {currency}/м²</strong>
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      Или цена за 1 м² ({currency}) *
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={pricePerM2}
                      onChange={(e) => {
                        const newP = parseFloat(e.target.value) || 0;
                        setPricePerM2(newP);
                        setDiscountType('AMOUNT');
                        setDiscountValue(0);
                        const newTot = Math.round(areaM2 * newP);
                        setDownPaymentAmount(Math.round(newTot * (downPaymentPercent / 100)));
                      }}
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-900 outline-none focus:border-indigo-600"
                    />
                    {actualDiscountMinor > 0 ? (
                      <span className="text-[11px] text-emerald-600 font-bold mt-1 block">
                        Скидка от торга: -{actualDiscountMinor.toLocaleString()} {currency}
                      </span>
                    ) : (
                      <span className="text-[11px] text-slate-400 mt-1 block">
                        Без дополнительной скидки
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Payment Type selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">Форма оплаты *</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'INSTALLMENT', label: 'Рассрочка', desc: 'Первоначальный взнос + график' },
                    { id: 'FULL', label: '100% Оплата', desc: 'Полная оплата' },
                    { id: 'BARTER', label: '100% Бартер', desc: 'Взаимозачет (авто/земля)' },
                    { id: 'PARTIAL_BARTER', label: 'Бартер + Доплата', desc: 'Бартер + рассрочка' },
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => {
                        setPaymentType(t.id);
                        if (t.id === 'FULL') {
                          setDownPaymentPercent(100);
                          setDownPaymentAmount(finalPrice);
                        }
                      }}
                      className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                        paymentType === t.id
                          ? 'border-blue-600 bg-blue-50/70 shadow-xs ring-1 ring-blue-600'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="font-bold text-xs text-slate-900">{t.label}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">{t.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Barter details if chosen */}
              {(paymentType === 'BARTER' || paymentType === 'PARTIAL_BARTER') && (
                <div className="p-4 rounded-xl bg-amber-50/80 border border-amber-200 space-y-3">
                  <div className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                    <Car className="h-4 w-4 text-amber-600" />
                    Параметры бартерного соглашения
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-amber-900 mb-1">
                      Описание предмета бартера *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Например: Автомобиль Toyota Camry 2021, белый цвет, госномер 0001АА01"
                      value={barterDescription}
                      onChange={(e) => setBarterDescription(e.target.value)}
                      className="w-full rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs outline-none focus:border-amber-500"
                    />
                  </div>
                  {paymentType === 'PARTIAL_BARTER' && (
                    <div>
                      <label className="block text-[11px] font-semibold text-amber-900 mb-1">
                        Оценочная стоимость бартера ({currency})
                      </label>
                      <input
                        type="number"
                        value={barterAmount}
                        onChange={(e) => setBarterAmount(e.target.value)}
                        className="w-full rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs outline-none focus:border-amber-500"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Final Summary Banner */}
              <div className="p-3.5 rounded-xl bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-slate-300 block">Итоговая стоимость сделки:</span>
                  <span className="text-lg font-extrabold">{finalPrice.toLocaleString()} {currency}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block">{areaM2} м² × {pricePerM2} {currency}</span>
                  {actualDiscountMinor > 0 && (
                    <span className="text-[11px] text-emerald-400 font-semibold">Скидка -{actualDiscountMinor.toLocaleString()}</span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: SCHEDULE / INSTALLMENT DETAILS */}
          {step === 3 && (
            <div className="space-y-4">
              {(paymentType === 'INSTALLMENT' || paymentType === 'PARTIAL_BARTER') ? (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Первоначальный взнос ({downPaymentPercent}%)
                      </label>
                      <div className="flex gap-1.5">
                        <input
                          type="number"
                          value={downPaymentAmount}
                          onChange={(e) => handleDownPaymentAmountChange(e.target.value)}
                          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold outline-none focus:border-blue-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Срок рассрочки (мес.)
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="120"
                        value={installmentMonths}
                        onChange={(e) => setInstallmentMonths(e.target.value)}
                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold outline-none focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Дата первого платежа
                      </label>
                      <input
                        type="date"
                        value={firstPaymentDate}
                        onChange={(e) => setFirstPaymentDate(e.target.value)}
                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  {/* Summary row */}
                  <div className="flex items-center justify-between p-3 rounded-xl bg-blue-50/60 border border-blue-200 text-xs">
                    <div>
                      <span className="text-slate-500 block">Остаток в рассрочку:</span>
                      <strong className="text-blue-900 text-sm">{remainingBalance.toLocaleString()} {currency}</strong>
                    </div>
                    <div className="text-right">
                      <span className="text-slate-500 block">Ежемесячный платеж:</span>
                      <strong className="text-blue-900 text-sm">
                        {installmentMonths > 0 ? (
                          remainingBalance % installmentMonths === 0
                            ? `${(remainingBalance / installmentMonths).toLocaleString()} ${currency}/мес.`
                            : `~${(remainingBalance / installmentMonths).toFixed(2)} ${currency}/мес.`
                        ) : `0 ${currency}/мес.`}
                      </strong>
                    </div>
                  </div>

                  {/* Generated Schedule Table */}
                  <div className="space-y-1.5">
                    <span className="text-xs font-bold text-slate-700 block">
                      Автоматический график ({schedule.length} платежей):
                    </span>
                    <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-200">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead className="bg-slate-50 sticky top-0 border-b border-slate-200 text-[11px] text-slate-600 font-bold">
                          <tr>
                            <th className="py-2 px-3">№</th>
                            <th className="py-2 px-3">Дата платежа</th>
                            <th className="py-2 px-3 text-right">Сумма ({currency})</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {schedule.map((s, idx) => (
                            <tr key={idx} className="hover:bg-slate-50">
                              <td className="py-1.5 px-3 font-semibold text-slate-700">№{s.payment_number}</td>
                              <td className="py-1.5 px-3 text-slate-900">{s.due_date}</td>
                              <td className="py-1.5 px-3 text-right font-bold text-slate-900">
                                {(s.amount_minor / 100).toLocaleString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              ) : (
                <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <CheckCircle2 className="h-8 w-8 text-emerald-600 mx-auto" />
                  <h4 className="text-sm font-bold text-slate-900">
                    {paymentType === 'FULL' ? '100% Единовременная оплата' : '100% Бартерное соглашение'}
                  </h4>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    График ежемесячных платежей не требуется. Полная сумма договора составляет {finalPrice.toLocaleString()} {currency}.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* STEP 4 / 5: CONFIRMATION & DEAL TYPE */}
          {((initialUnit && step === 4) || (!initialUnit && step === 4)) && (
            <div className="space-y-4">
              {/* Type of deal creation: SIGNED vs RESERVED */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                <label className="block text-xs font-bold text-slate-800">
                  Тип оформления сделки:
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setDealStatus('SIGNED')}
                    className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                      dealStatus === 'SIGNED'
                        ? 'border-emerald-600 bg-emerald-50/70 shadow-xs ring-1 ring-emerald-600'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-xs text-emerald-900">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      <span>Подписанный договор</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Квартира переходит в статус «ПРОДАНО», генерируется официальный договор
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDealStatus('RESERVED')}
                    className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                      dealStatus === 'RESERVED'
                        ? 'border-amber-600 bg-amber-50/70 shadow-xs ring-1 ring-amber-600'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-xs text-amber-900">
                      <Clock className="h-4 w-4 text-amber-600" />
                      <span>Временная бронь</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Квартира бронируется на ограниченный срок с защитой от продажи
                    </p>
                  </button>
                </div>

                {dealStatus === 'RESERVED' && (
                  <div className="pt-2">
                    <label className="block text-[11px] font-semibold text-amber-900 mb-1">
                      Срок действия бронирования (дней):
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="30"
                      value={reservationDays}
                      onChange={(e) => setReservationDays(e.target.value)}
                      className="w-32 rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs outline-none focus:border-amber-500 font-bold"
                    />
                  </div>
                )}

                {dealStatus === 'SIGNED' && downPaymentAmount > 0 && (
                  <div className="rounded-2xl border-2 border-emerald-300 bg-emerald-50/70 p-4 space-y-3 shadow-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="recordInit"
                          checked={recordInitialPayment}
                          onChange={(e) => setRecordInitialPayment(e.target.checked)}
                          className="h-4 w-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                        />
                        <label htmlFor="recordInit" className="text-xs text-slate-900 font-bold cursor-pointer">
                          Зафиксировать оплату первоначального взноса в кассу
                        </label>
                      </div>
                      <span className="font-extrabold text-xs text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md border border-emerald-300">
                        +{downPaymentAmount.toLocaleString()} {currency}
                      </span>
                    </div>

                    {recordInitialPayment && (
                      <div className="space-y-2.5 pt-2.5 border-t border-emerald-200/80 text-xs animate-in fade-in">
                        <p className="text-[11px] text-emerald-900 font-medium">
                          Укажите номер документа из книги регистрации ПКО и фактическую дату оплаты клиентом:
                        </p>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div>
                            <label className="block text-[11px] font-bold text-slate-800 mb-1">
                              Номер ПКО (по книге) *
                            </label>
                            <input
                              type="text"
                              value={initialPaymentReference}
                              onChange={(e) => setInitialPaymentReference(e.target.value)}
                              placeholder="Напр. 1, 28 или 105"
                              className="w-full rounded-xl border border-emerald-300 bg-white px-3 py-2 text-xs font-bold text-slate-900 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-500 shadow-xs"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-slate-800 mb-1">
                              Дата платежа по ПКО *
                            </label>
                            <input
                              type="date"
                              required
                              value={initialPaymentDate || dealDate}
                              onChange={(e) => setInitialPaymentDate(e.target.value)}
                              className="w-full rounded-xl border border-emerald-300 bg-white px-3 py-2 text-xs font-bold text-slate-900 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-500 shadow-xs"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-slate-800 mb-1">
                              Способ внесения
                            </label>
                            <select
                              value={initialPaymentMethod}
                              onChange={(e) => setInitialPaymentMethod(e.target.value)}
                              className="w-full rounded-xl border border-emerald-300 bg-white px-3 py-2 text-xs font-bold text-slate-900 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-500 shadow-xs cursor-pointer"
                            >
                              <option value="CASH">💵 Наличные в кассу</option>
                              <option value="BANK_TRANSFER">🏦 Банковский перевод</option>
                              <option value="CARD">💳 Банковская карта</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Complete Review Sheet */}
              <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-2 text-xs">
                <h4 className="font-bold text-slate-900 pb-1 border-b border-slate-100 flex items-center justify-between">
                  <span>Сводка параметров сделки:</span>
                  <span className="text-blue-600 font-extrabold text-sm">{finalPrice.toLocaleString()} {currency}</span>
                </h4>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <span className="text-slate-400 text-[11px] block">Покупатель:</span>
                    <strong className="text-slate-800">{selectedLead?.full_name} ({selectedLead?.phone})</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[11px] block">Квартира:</span>
                    <strong className="text-slate-800">{selectedUnit?.project_name}, Кв. №{selectedUnit?.unit_number} ({areaM2} м²)</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[11px] block">Форма оплаты:</span>
                    <strong className="text-slate-800">{paymentType}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[11px] block">Первоначальный взнос:</span>
                    <strong className="text-emerald-700">{downPaymentAmount.toLocaleString()} {currency}</strong>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={handleBack}
            disabled={initialUnit ? step <= 1 : step <= 0}
            className="flex items-center gap-1.5 rounded-xl border border-slate-300 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 transition cursor-pointer disabled:opacity-30 disabled:pointer-events-none"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Назад</span>
          </button>

          <div className="flex items-center gap-2">
            {step < 4 ? (
              <button
                type="button"
                onClick={handleNext}
                className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-5 py-2 text-xs font-bold text-white shadow-md hover:bg-blue-700 transition cursor-pointer"
              >
                <span>Далее</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleFinalSubmit}
                disabled={isSubmitting}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-2.5 text-xs font-bold text-white shadow-lg hover:from-emerald-700 hover:to-teal-700 transition cursor-pointer disabled:opacity-50"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>{isSubmitting ? 'Оформление...' : dealStatus === 'SIGNED' ? 'Подписать договор' : 'Забронировать квартиру'}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Passport OCR Modal */}
      <PassportOCRModal
        isOpen={isPassportOcrOpen}
        onClose={() => setIsPassportOcrOpen(false)}
        projectId={selectedUnit?.project_id || selectedProjectId}
        leadId={selectedLead?.id}
        onVerified={handlePassportVerified}
      />
    </div>
  );
};
