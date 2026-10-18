import {formatMeasure, trimDecimalZeros} from '../../utils/numberDisplay';
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import { ApartmentDetailModal } from './ApartmentDetailModal';
import { ApartmentComparisonModal } from './components/ApartmentComparisonModal';
import { SaveLeadInterestModal } from './components/SaveLeadInterestModal';
import { ReserveApartmentModal } from './ReserveApartmentModal';
import { matchSearchQuery } from '../../utils/searchUtils';
import {
  Home,
  Building2,
  Search,
  Filter,
  Layers,
  ChevronRight,
  Sparkles,
  Tag,
  CheckCircle2,
  Clock,
  XCircle,
  Lock,
  Eye,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  RotateCcw,
  SlidersHorizontal,
  Coins,
  DollarSign,
  Scale,
  LayoutGrid,
  Table as TableIcon,
  Heart,
  X,
  AlertCircle
} from 'lucide-react';

export const ApartmentsPage = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [chessboard, setChessboard] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // View Mode: 'cards' (smart selection with thumbnails) or 'table' (registry table)
  const [viewMode, setViewMode] = useState('cards');

  // Filters — Smart Selection
  const [search, setSearch] = useState('');
  // By default show AVAILABLE units
  const [statusFilter, setStatusFilter] = useState('AVAILABLE');
  const [roomsFilter, setRoomsFilter] = useState('');
  const [buildingFilter, setBuildingFilter] = useState('');
  const [floorFilter, setFloorFilter] = useState('');
  const [minFloor, setMinFloor] = useState('');
  const [maxFloor, setMaxFloor] = useState('');
  const [minArea, setMinArea] = useState('');
  const [maxArea, setMaxArea] = useState('');
  const [minBudget, setMinBudget] = useState('');
  const [maxBudget, setMaxBudget] = useState('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Sorting
  const [sortBy, setSortBy] = useState('unit_number'); // unit_number | floor | rooms | area | price_per_m2 | total_price | status
  const [sortOrder, setSortOrder] = useState('asc'); // asc | desc

  // Modals & Selection States
  const [selectedUnitId, setSelectedUnitId] = useState(null);
  const [selectedForComparison, setSelectedForComparison] = useState([]);
  const [isCompareModalOpen, setIsCompareModalOpen] = useState(false);
  const [interestModalUnit, setInterestModalUnit] = useState(null);
  const [reserveModalUnit, setReserveModalUnit] = useState(null);
  const [toastMessage, setToastMessage] = useState('');

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 4000);
  };

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setIsLoading(true);
        const res = await api.get('/projects');
        const projs = res.data?.projects || res.projects || [];
        setProjects(projs);
        if (projs.length > 0) {
          setSelectedProjectId(String(projs[0].id));
        }
      } catch (err) {
        console.error('Error fetching projects:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchInitialData();
  }, []);

  const fetchChessboardData = async () => {
    if (!selectedProjectId) return;
    try {
      setIsLoading(true);
      const res = await api.get(`/inventory/projects/${selectedProjectId}/chessboard`);
      setChessboard(res.data?.chessboard || res.chessboard || []);
    } catch (err) {
      console.error('Error loading apartments:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchChessboardData();
  }, [selectedProjectId]);

  // Flatten all units from chessboard with computed prices
  const allUnits = useMemo(() => {
    return chessboard.flatMap((b) =>
      (b.sections || []).flatMap((s) =>
        (s.floors || []).flatMap((f) =>
          (f.units || []).map((u) => {
            const areaM2 = u.area_m2_x100 ? u.area_m2_x100 / 100 : 0;
            const pricePerM2 = u.price_per_m2_minor ? Math.round(u.price_per_m2_minor / 100) : 0;
            const totalPrice = u.manual_total_price_minor
              ? Math.round(u.manual_total_price_minor / 100)
              : Math.round(areaM2 * pricePerM2);

            return {
              ...u,
              building_id: b.id,
              building_name: b.name,
              section_name: s.name,
              floor_number: f.floor_number,
              areaM2,
              pricePerM2,
              totalPrice,
              plan_image_url: u.layout_types?.furnished_plan_path || u.layout_types?.image_path || u.layout_types?.technical_plan_path || null,
              layout_clean_name: u.layout_types?.name ? trimDecimalZeros(u.layout_types.name) : null,
            };
          })
        )
      )
    );
  }, [chessboard]);

  // Extract available building names
  const availableBuildings = useMemo(() => {
    return Array.from(new Set(allUnits.map((u) => u.building_name).filter(Boolean))).sort();
  }, [allUnits]);

  // Extract available floors (filtered by selected building if any)
  const availableFloors = useMemo(() => {
    const relevant = buildingFilter ? allUnits.filter((u) => u.building_name === buildingFilter) : allUnits;
    return Array.from(new Set(relevant.map((u) => u.floor_number).filter((n) => n != null))).sort((a, b) => a - b);
  }, [allUnits, buildingFilter]);

  // Filtered & Sorted Units
  const filteredUnits = useMemo(() => {
    let result = allUnits.filter((u) => {
      const matchesSearch = matchSearchQuery(u, ['building_name', 'section_name'], search, {
        unitFields: ['unit_number'],
      });
      const matchesStatus = !statusFilter || u.status === statusFilter;
      const matchesRooms = !roomsFilter || String(u.rooms) === roomsFilter;
      const matchesBuilding = !buildingFilter || u.building_name === buildingFilter;
      
      // Floor exact or range
      let matchesFloor = true;
      if (floorFilter) {
        matchesFloor = String(u.floor_number) === String(floorFilter);
      } else {
        if (minFloor && u.floor_number < parseInt(minFloor, 10)) matchesFloor = false;
        if (maxFloor && u.floor_number > parseInt(maxFloor, 10)) matchesFloor = false;
      }

      const matchesMinArea = !minArea || u.areaM2 >= parseFloat(minArea);
      const matchesMaxArea = !maxArea || u.areaM2 <= parseFloat(maxArea);
      const matchesMinBudget = !minBudget || u.totalPrice >= parseFloat(minBudget);
      const matchesMaxBudget = !maxBudget || u.totalPrice <= parseFloat(maxBudget);

      return (
        matchesSearch &&
        matchesStatus &&
        matchesRooms &&
        matchesBuilding &&
        matchesFloor &&
        matchesMinArea &&
        matchesMaxArea &&
        matchesMinBudget &&
        matchesMaxBudget
      );
    });

    // Sort
    result.sort((a, b) => {
      let cmp = 0;
      switch (sortBy) {
        case 'unit_number': {
          const numA = parseInt(a.unit_number, 10);
          const numB = parseInt(b.unit_number, 10);
          cmp = !isNaN(numA) && !isNaN(numB) ? numA - numB : String(a.unit_number).localeCompare(String(b.unit_number));
          break;
        }
        case 'floor':
          cmp = (a.floor_number || 0) - (b.floor_number || 0);
          break;
        case 'rooms':
          cmp = (a.rooms || 0) - (b.rooms || 0);
          break;
        case 'area':
          cmp = a.areaM2 - b.areaM2;
          break;
        case 'price_per_m2':
          cmp = a.pricePerM2 - b.pricePerM2;
          break;
        case 'total_price':
          cmp = a.totalPrice - b.totalPrice;
          break;
        case 'status':
          cmp = String(a.status).localeCompare(String(b.status));
          break;
        default:
          cmp = 0;
      }
      return sortOrder === 'asc' ? cmp : -cmp;
    });

    return result;
  }, [
    allUnits,
    search,
    statusFilter,
    roomsFilter,
    buildingFilter,
    floorFilter,
    minFloor,
    maxFloor,
    minArea,
    maxArea,
    minBudget,
    maxBudget,
    sortBy,
    sortOrder,
  ]);

  const hasActiveFilters = Boolean(
    search ||
    statusFilter !== 'AVAILABLE' ||
    roomsFilter ||
    buildingFilter ||
    floorFilter ||
    minFloor ||
    maxFloor ||
    minArea ||
    maxArea ||
    minBudget ||
    maxBudget
  );

  const resetFilters = () => {
    setSearch('');
    setStatusFilter('AVAILABLE');
    setRoomsFilter('');
    setBuildingFilter('');
    setFloorFilter('');
    setMinFloor('');
    setMaxFloor('');
    setMinArea('');
    setMaxArea('');
    setMinBudget('');
    setMaxBudget('');
  };

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const renderSortIndicator = (field) => {
    if (sortBy !== field) {
      return <ArrowUpDown className="h-3 w-3 opacity-40 group-hover:opacity-100" />;
    }
    return sortOrder === 'asc' ? (
      <ArrowUp className="h-3 w-3 text-blue-600" />
    ) : (
      <ArrowDown className="h-3 w-3 text-blue-600" />
    );
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'AVAILABLE':
        return { label: 'Свободна', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
      case 'RESERVED':
        return { label: 'Бронь', bg: 'bg-amber-50 text-amber-700 border-amber-200' };
      case 'SOLD':
        return { label: 'Продана', bg: 'bg-rose-50 text-rose-700 border-rose-200' };
      case 'BLOCKED':
        return { label: 'Блок', bg: 'bg-slate-100 text-slate-600 border-slate-200' };
      default:
        return { label: status, bg: 'bg-slate-50 text-slate-700 border-slate-200' };
    }
  };

  // Toggle selection for comparison (up to 4)
  const toggleComparison = (unit, e) => {
    if (e && e.stopPropagation) e.stopPropagation();

    if (selectedForComparison.includes(unit.id)) {
      setSelectedForComparison((prev) => prev.filter((id) => id !== unit.id));
    } else {
      if (selectedForComparison.length >= 4) {
        showToast('⚠️ Максимум 4 квартиры для одновременного сравнения');
        return;
      }
      setSelectedForComparison((prev) => [...prev, unit.id]);
    }
  };

  const comparedUnits = useMemo(() => {
    return allUnits.filter((u) => selectedForComparison.includes(u.id));
  }, [allUnits, selectedForComparison]);

  // Summary Metrics
  const stats = useMemo(() => {
    const total = filteredUnits.length;
    const available = filteredUnits.filter((u) => u.status === 'AVAILABLE');
    const reserved = filteredUnits.filter((u) => u.status === 'RESERVED');
    const sold = filteredUnits.filter((u) => u.status === 'SOLD');

    const availableArea = available.reduce((acc, u) => acc + u.areaM2, 0);
    const availableTotalVolume = available.reduce((acc, u) => acc + u.totalPrice, 0);

    return {
      total,
      availableCount: available.length,
      availableArea: formatMeasure(availableArea),
      availableTotalVolume,
      reservedCount: reserved.length,
      soldCount: sold.length,
    };
  }, [filteredUnits]);

  const selectedProject = projects.find((p) => String(p.id) === String(selectedProjectId));
  const currency = selectedProject?.currency || 'USD';

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-24">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 rounded-2xl bg-slate-900 text-white px-4 py-3 text-xs font-bold shadow-2xl flex items-center gap-2.5 animate-in slide-in-from-top-3 border border-slate-700">
          <Sparkles className="h-4 w-4 text-amber-400 shrink-0" />
          <span>{toastMessage}</span>
          <button
            type="button"
            onClick={() => setToastMessage('')}
            className="ml-2 text-slate-400 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Home className="h-7 w-7 text-blue-600" />
            <span>Умный подбор и каталог квартир</span>
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500">
            Подбор квартир по бюджету и параметрам, сравнение до 4 вариантов и фиксация интересов покупателей
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* View Mode Toggle: Cards vs Table */}
          <div className="flex items-center rounded-xl bg-slate-100 p-1 border border-slate-200">
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                viewMode === 'cards'
                  ? 'bg-white text-blue-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Режим карточек с планировками"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              <span>Карточки</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-white text-blue-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Табличный реестр"
            >
              <TableIcon className="h-3.5 w-3.5" />
              <span>Таблица</span>
            </button>
          </div>

          {selectedProjectId && (
            <button
              type="button"
              onClick={() => navigate(`/projects/${selectedProjectId}`)}
              className="flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-xs font-bold transition shadow-md cursor-pointer"
            >
              <Layers className="h-4 w-4" />
              <span>Шахматка →</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Filter Toolbar */}
      <div className="rounded-2xl bg-white p-4 border border-slate-200 shadow-2xs space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          {/* Project selector */}
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-slate-400" />
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-800 outline-none focus:border-blue-500 cursor-pointer"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.code})
                </option>
              ))}
            </select>
          </div>

          {/* Building / Block Filter */}
          <select
            value={buildingFilter}
            onChange={(e) => setBuildingFilter(e.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-800 outline-none focus:border-blue-500 cursor-pointer"
          >
            <option value="">Все корпуса (Блоки)</option>
            {availableBuildings.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>

          {/* Rooms Filter */}
          <select
            value={roomsFilter}
            onChange={(e) => setRoomsFilter(e.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-800 outline-none focus:border-blue-500 cursor-pointer"
          >
            <option value="">Все комнаты</option>
            <option value="1">1-комнатные</option>
            <option value="2">2-комнатные</option>
            <option value="3">3-комнатные</option>
            <option value="4">4-комнатные</option>
            <option value="0">Студии</option>
          </select>

          {/* Floor Quick Filter */}
          <select
            value={floorFilter}
            onChange={(e) => setFloorFilter(e.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-800 outline-none focus:border-blue-500 cursor-pointer"
          >
            <option value="">Все этажи</option>
            {availableFloors.map((fl) => (
              <option key={fl} value={fl}>
                {fl} этаж
              </option>
            ))}
          </select>

          {/* Status Filter (Default AVAILABLE) */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border border-emerald-200 bg-emerald-50/60 font-semibold px-3 py-1.5 text-xs text-emerald-900 outline-none focus:border-emerald-500 cursor-pointer"
          >
            <option value="AVAILABLE">Свободные (AVAILABLE)</option>
            <option value="">Все статусы</option>
            <option value="RESERVED">В брони (RESERVED)</option>
            <option value="SOLD">Проданные (SOLD)</option>
            <option value="BLOCKED">Заблокированные</option>
          </select>

          {/* Search Unit Number */}
          <div className="relative min-w-[170px] max-w-xs flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Поиск по номеру квартиры..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-8 pr-3 py-1.5 text-xs text-slate-900 outline-none focus:border-blue-500 focus:bg-white transition"
            />
          </div>

          {/* Toggle Advanced Filters (Floor Range, Area, Budget) */}
          <button
            type="button"
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
              showAdvancedFilters || minArea || maxArea || minBudget || maxBudget || minFloor || maxFloor
                ? 'bg-blue-50 text-blue-700 border-blue-200 shadow-2xs'
                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <SlidersHorizontal className="h-3.5 w-3.5 text-blue-600" />
            <span>Параметры подбора</span>
            {(minArea || maxArea || minBudget || maxBudget || minFloor || maxFloor) && (
              <span className="h-1.5 w-1.5 rounded-full bg-blue-600 animate-pulse" />
            )}
          </button>

          {/* Reset Filters */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition cursor-pointer"
              title="Сбросить все фильтры"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Сброс</span>
            </button>
          )}
        </div>

        {/* Collapsible Advanced Filters: Floor range, Area, and Budget USD */}
        {showAdvancedFilters && (
          <div className="pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-4 gap-3 animate-in fade-in">
            {/* Floor Range */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Диапазон этажей
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  placeholder="от 1"
                  value={minFloor}
                  onChange={(e) => setMinFloor(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-900 outline-none focus:border-blue-500 focus:bg-white"
                />
                <span className="text-slate-400 text-xs">—</span>
                <input
                  type="number"
                  placeholder="до 10"
                  value={maxFloor}
                  onChange={(e) => setMaxFloor(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-900 outline-none focus:border-blue-500 focus:bg-white"
                />
              </div>
            </div>

            {/* Min & Max Area */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Площадь (м²)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  placeholder="от 40"
                  value={minArea}
                  onChange={(e) => setMinArea(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-900 outline-none focus:border-blue-500 focus:bg-white"
                />
                <span className="text-slate-400 text-xs">—</span>
                <input
                  type="number"
                  placeholder="до 110"
                  value={maxArea}
                  onChange={(e) => setMaxArea(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-900 outline-none focus:border-blue-500 focus:bg-white"
                />
              </div>
            </div>

            {/* Min & Max Budget in USD */}
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Бюджет покупателя ({currency})
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  placeholder={`от 20 000 ${currency}`}
                  value={minBudget}
                  onChange={(e) => setMinBudget(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-900 outline-none focus:border-blue-500 focus:bg-white"
                />
                <span className="text-slate-400 text-xs">—</span>
                <input
                  type="number"
                  placeholder={`до 70 000 ${currency}`}
                  value={maxBudget}
                  onChange={(e) => setMaxBudget(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-900 outline-none focus:border-blue-500 focus:bg-white"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Summary KPI Bar for Sales Reps */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-2xl bg-white p-3.5 border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Найдено</span>
          <div className="text-lg font-black text-slate-900 mt-0.5">
            {stats.total} <span className="text-xs font-semibold text-slate-400">кв.</span>
          </div>
        </div>

        <div className="rounded-2xl bg-emerald-50/70 p-3.5 border border-emerald-200 shadow-2xs">
          <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block">Свободно</span>
          <div className="text-lg font-black text-emerald-900 mt-0.5 flex items-baseline gap-1.5">
            <span>{stats.availableCount} кв.</span>
            <span className="text-xs font-bold text-emerald-700">({stats.availableArea} м²)</span>
          </div>
          <div className="text-[11px] font-extrabold text-emerald-800 mt-0.5">
            Пул: {stats.availableTotalVolume.toLocaleString()} {currency}
          </div>
        </div>

        <div className="rounded-2xl bg-amber-50/70 p-3.5 border border-amber-200 shadow-2xs">
          <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider block">В брони</span>
          <div className="text-lg font-black text-amber-900 mt-0.5">
            {stats.reservedCount} <span className="text-xs font-semibold text-amber-700">кв.</span>
          </div>
        </div>

        <div className="rounded-2xl bg-rose-50/70 p-3.5 border border-rose-200 shadow-2xs">
          <span className="text-[11px] font-bold text-rose-800 uppercase tracking-wider block">Продано</span>
          <div className="text-lg font-black text-rose-900 mt-0.5">
            {stats.soldCount} <span className="text-xs font-semibold text-rose-700">кв.</span>
          </div>
        </div>
      </div>

      {/* Main Units Content: Cards or Table */}
      {isLoading ? (
        <div className="h-72 rounded-2xl bg-white border border-slate-200 p-8 flex items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
            <span className="text-xs text-slate-500">Загрузка каталога квартир...</span>
          </div>
        </div>
      ) : filteredUnits.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center shadow-xs">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 mb-3 border border-blue-100">
            <Home className="h-7 w-7" />
          </div>
          <h3 className="text-base font-bold text-slate-900">Квартиры не найдены</h3>
          <p className="mt-1 text-xs text-slate-500 max-w-sm">
            {projects.length === 0
              ? 'Сначала создайте жилой комплекс в разделе Объекты.'
              : 'В выбранном комплексе нет квартир, соответствующих заданным критериям фильтрации.'}
          </p>
          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="mt-4 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition cursor-pointer"
            >
              Сбросить фильтры
            </button>
          )}
        </div>
      ) : viewMode === 'cards' ? (
        /* SMART SELECTION: CARDS WITH 2D/3D THUMBNAILS */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredUnits.map((u) => {
            const badge = getStatusBadge(u.status);
            const isCompared = selectedForComparison.includes(u.id);
            const planImg = u.plan_image_url;

            return (
              <div
                key={u.id}
                className={`group flex flex-col rounded-3xl bg-white border transition-all duration-200 shadow-2xs hover:shadow-lg overflow-hidden ${
                  isCompared ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                {/* Thumbnail Header Area */}
                <div className="relative h-44 w-full bg-slate-50 border-b border-slate-100 flex items-center justify-center p-3 overflow-hidden">
                  {/* Compare Checkbox */}
                  <div className="absolute top-3 left-3 z-10">
                    <label
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center gap-1.5 rounded-xl bg-white/90 backdrop-blur-xs px-2.5 py-1 text-[11px] font-bold text-slate-700 border border-slate-200/80 shadow-2xs cursor-pointer hover:bg-blue-50 hover:text-blue-700 transition select-none"
                    >
                      <input
                        type="checkbox"
                        checked={isCompared}
                        onChange={(e) => toggleComparison(u, e)}
                        className="h-3.5 w-3.5 rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer"
                      />
                      <span>Сравнить</span>
                    </label>
                  </div>

                  {/* Status Badge */}
                  <div className="absolute top-3 right-3 z-10">
                    <span className={`px-2.5 py-0.5 rounded-full font-bold border text-[10px] shadow-2xs ${badge.bg}`}>
                      {badge.label}
                    </span>
                  </div>

                  {/* Plan Thumbnail Image */}
                  {planImg ? (
                    <img
                      src={planImg}
                      alt={`Планировка кв. ${u.unit_number}`}
                      className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-105 cursor-pointer"
                      onClick={() => setSelectedUnitId(u.id)}
                      loading="lazy"
                    />
                  ) : (
                    <div
                      onClick={() => setSelectedUnitId(u.id)}
                      className="flex flex-col items-center justify-center text-slate-400 space-y-1 cursor-pointer"
                    >
                      <Home className="h-10 w-10 stroke-1 text-slate-300" />
                      <span className="text-[11px] font-medium text-slate-400">Типовая планировка</span>
                    </div>
                  )}
                </div>

                {/* Content Area */}
                <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                  <div>
                    {/* Unit Number & Building */}
                    <div className="flex items-baseline justify-between">
                      <h4 className="text-base font-black text-slate-900 group-hover:text-blue-600 transition">
                        Кв. №{u.unit_number}
                      </h4>
                      <span className="text-xs font-semibold text-slate-500">
                        {u.building_name}
                      </span>
                    </div>

                    {/* Specs Pills */}
                    <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-slate-600">
                      <span className="rounded-lg bg-slate-100 px-2 py-0.5 font-bold text-slate-700">
                        {u.floor_number} этаж
                      </span>
                      <span className="rounded-lg bg-slate-100 px-2 py-0.5 font-bold text-slate-700">
                        {u.rooms === 0 ? 'Студия' : `${u.rooms}-комн.`}
                      </span>
                      <span className="rounded-lg bg-slate-100 px-2 py-0.5 font-black text-slate-900">
                        {u.areaM2.toFixed(2)} м²
                      </span>
                    </div>

                    {/* Pricing */}
                    <div className="mt-3 pt-3 border-t border-slate-100 flex items-baseline justify-between">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          Стоимость
                        </span>
                        <span className="text-base font-black text-blue-900">
                          {u.totalPrice > 0 ? `${u.totalPrice.toLocaleString()} ${currency}` : '—'}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] font-medium text-slate-400 block">
                          за м²
                        </span>
                        <span className="text-xs font-bold text-slate-600">
                          {u.pricePerM2 > 0 ? `${u.pricePerM2.toLocaleString()} ${currency}` : '—'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="pt-2 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setInterestModalUnit(u)}
                      className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 py-2 text-xs font-bold transition shadow-2xs cursor-pointer"
                      title="Сохранить интерес клиента к этой квартире"
                    >
                      <Heart className="h-3.5 w-3.5 text-purple-600 fill-purple-100" />
                      <span>Интерес лида</span>
                    </button>

                    {u.status === 'AVAILABLE' ? (
                      <button
                        type="button"
                        onClick={() => setReserveModalUnit(u)}
                        className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white py-2 text-xs font-bold transition shadow-xs cursor-pointer"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>Бронь</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setSelectedUnitId(u.id)}
                        className="flex-1 flex items-center justify-center gap-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 py-2 text-xs font-bold transition cursor-pointer"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        <span>Карточка</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* TABLE VIEW */
        <div className="rounded-2xl bg-white border border-slate-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold select-none">
                <tr>
                  <th className="p-3.5 pl-4 w-10 text-center">
                    <Scale className="h-3.5 w-3.5 text-slate-400 mx-auto" />
                  </th>
                  <th
                    onClick={() => handleSort('unit_number')}
                    className="p-3.5 cursor-pointer hover:bg-slate-100 transition group"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>№ Квартиры</span>
                      {renderSortIndicator('unit_number')}
                    </div>
                  </th>
                  <th className="p-3.5">Корпус / Секция</th>
                  <th
                    onClick={() => handleSort('floor')}
                    className="p-3.5 cursor-pointer hover:bg-slate-100 transition group"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Этаж</span>
                      {renderSortIndicator('floor')}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('rooms')}
                    className="p-3.5 cursor-pointer hover:bg-slate-100 transition group"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Комнат</span>
                      {renderSortIndicator('rooms')}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('area')}
                    className="p-3.5 cursor-pointer hover:bg-slate-100 transition group"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Площадь</span>
                      {renderSortIndicator('area')}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('price_per_m2')}
                    className="p-3.5 cursor-pointer hover:bg-slate-100 transition group"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Цена за м²</span>
                      {renderSortIndicator('price_per_m2')}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('total_price')}
                    className="p-3.5 cursor-pointer hover:bg-slate-100 transition group"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Общая стоимость</span>
                      {renderSortIndicator('total_price')}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('status')}
                    className="p-3.5 cursor-pointer hover:bg-slate-100 transition group"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Статус</span>
                      {renderSortIndicator('status')}
                    </div>
                  </th>
                  <th className="p-3.5 text-right pr-5">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUnits.map((u) => {
                  const badge = getStatusBadge(u.status);
                  const isCompared = selectedForComparison.includes(u.id);

                  return (
                    <tr
                      key={u.id}
                      className={`hover:bg-blue-50/50 transition cursor-pointer group ${
                        isCompared ? 'bg-blue-50/30' : ''
                      }`}
                    >
                      <td className="p-3.5 pl-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isCompared}
                          onChange={(e) => toggleComparison(u, e)}
                          className="h-3.5 w-3.5 rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer"
                        />
                      </td>
                      <td
                        className="p-3.5 font-bold text-slate-900 group-hover:text-blue-600"
                        onClick={() => setSelectedUnitId(u.id)}
                      >
                        <div className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-blue-600"></span>
                          <span>Кв. №{u.unit_number}</span>
                        </div>
                      </td>
                      <td className="p-3.5 text-slate-600" onClick={() => setSelectedUnitId(u.id)}>
                        <span className="font-semibold text-slate-800">{u.building_name}</span>
                        {u.section_name && <span className="text-slate-400"> • {u.section_name}</span>}
                      </td>
                      <td className="p-3.5 font-medium text-slate-700" onClick={() => setSelectedUnitId(u.id)}>
                        {u.floor_number} этаж
                      </td>
                      <td className="p-3.5 font-semibold text-slate-800" onClick={() => setSelectedUnitId(u.id)}>
                        {u.rooms === 0 ? 'Студия' : `${u.rooms}-комн.`}
                      </td>
                      <td className="p-3.5 font-bold text-slate-900" onClick={() => setSelectedUnitId(u.id)}>
                        {formatMeasure(u.areaM2)} м²
                      </td>
                      <td className="p-3.5 font-extrabold text-blue-700" onClick={() => setSelectedUnitId(u.id)}>
                        {u.pricePerM2 > 0 ? `${u.pricePerM2.toLocaleString()} ${currency}` : '—'}
                      </td>
                      <td className="p-3.5 font-black text-slate-900" onClick={() => setSelectedUnitId(u.id)}>
                        {u.totalPrice > 0 ? `${u.totalPrice.toLocaleString()} ${currency}` : '—'}
                      </td>
                      <td className="p-3.5" onClick={() => setSelectedUnitId(u.id)}>
                        <span className={`px-2.5 py-0.5 rounded-full font-bold border text-[10px] ${badge.bg}`}>
                          {badge.label}
                        </span>
                      </td>
                      <td className="p-3.5 text-right pr-5">
                        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => setInterestModalUnit(u)}
                            className="p-1.5 rounded-lg text-purple-600 hover:bg-purple-50 transition cursor-pointer"
                            title="Зафиксировать интерес лида"
                          >
                            <Heart className="h-4 w-4" />
                          </button>

                          {u.status === 'AVAILABLE' && (
                            <button
                              type="button"
                              onClick={() => setReserveModalUnit(u)}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] transition shadow-2xs cursor-pointer"
                            >
                              Бронь
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => setSelectedUnitId(u.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition cursor-pointer"
                            title="Открыть карточку"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Floating Bottom Comparison Dock (When 1+ Units Selected) */}
      {selectedForComparison.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-11/12 max-w-2xl animate-in slide-in-from-bottom-4">
          <div className="rounded-3xl bg-slate-900/95 backdrop-blur-md text-white p-4 shadow-2xl border border-slate-700/80 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-md">
                <Scale className="h-5 w-5" />
              </div>
              <div>
                <span className="text-xs font-black block">
                  Сравнение квартир ({selectedForComparison.length} из 4)
                </span>
                {/* Selected chips */}
                <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                  {comparedUnits.map((cu) => (
                    <span
                      key={cu.id}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-800 text-[11px] font-bold text-slate-200 border border-slate-700"
                    >
                      <span>Кв. {cu.unit_number}</span>
                      <button
                        type="button"
                        onClick={() => setSelectedForComparison((prev) => prev.filter((id) => id !== cu.id))}
                        className="text-slate-400 hover:text-white"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSelectedForComparison([])}
                className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition cursor-pointer"
              >
                Очистить
              </button>

              <button
                type="button"
                disabled={selectedForComparison.length < 2}
                onClick={() => setIsCompareModalOpen(true)}
                className="flex items-center gap-2 rounded-2xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-extrabold px-5 py-2.5 text-xs shadow-lg transition cursor-pointer"
              >
                <Scale className="h-4 w-4" />
                <span>
                  {selectedForComparison.length < 2
                    ? 'Выберите от 2 квартир'
                    : `Сравнить (${selectedForComparison.length}) →`}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Apartment Detail Modal */}
      {selectedUnitId && (
        <ApartmentDetailModal
          unitId={selectedUnitId}
          isOpen={Boolean(selectedUnitId)}
          onClose={() => setSelectedUnitId(null)}
          onUnitUpdated={fetchChessboardData}
          currency={currency}
        />
      )}

      {/* Apartment Comparison Modal */}
      {isCompareModalOpen && (
        <ApartmentComparisonModal
          isOpen={isCompareModalOpen}
          onClose={() => setIsCompareModalOpen(false)}
          units={comparedUnits}
          currency={currency}
          onOpenUnitDetail={(unitId) => {
            setIsCompareModalOpen(false);
            setSelectedUnitId(unitId);
          }}
          onSaveLeadInterest={(unit) => {
            setInterestModalUnit(unit);
          }}
          onReserveUnit={(unit) => {
            setIsCompareModalOpen(false);
            setReserveModalUnit(unit);
          }}
        />
      )}

      {/* Save Lead Interest Modal */}
      {interestModalUnit && (
        <SaveLeadInterestModal
          isOpen={Boolean(interestModalUnit)}
          onClose={() => setInterestModalUnit(null)}
          unit={interestModalUnit}
          currency={currency}
          onSaved={({ unitId, leadName, priority }) => {
            showToast(`✓ Интерес к кв. №${interestModalUnit.unit_number} успешно сохранен для ${leadName || 'клиента'}!`);
          }}
        />
      )}

      {/* Reserve Apartment Modal */}
      {reserveModalUnit && (
        <ReserveApartmentModal
          isOpen={Boolean(reserveModalUnit)}
          onClose={() => setReserveModalUnit(null)}
          unit={reserveModalUnit}
          currency={currency}
          onReserved={() => {
            fetchChessboardData();
            setReserveModalUnit(null);
            showToast(`✓ Квартира №${reserveModalUnit.unit_number} успешно забронирована`);
          }}
        />
      )}
    </div>
  );
};
