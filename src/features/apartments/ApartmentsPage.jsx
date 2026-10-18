import {formatMeasure, trimDecimalZeros} from '../../utils/numberDisplay';
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import { ApartmentDetailModal } from './ApartmentDetailModal';
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
  DollarSign
} from 'lucide-react';

export const ApartmentsPage = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [chessboard, setChessboard] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [roomsFilter, setRoomsFilter] = useState('');
  const [buildingFilter, setBuildingFilter] = useState('');
  const [floorFilter, setFloorFilter] = useState('');
  const [minArea, setMinArea] = useState('');
  const [maxArea, setMaxArea] = useState('');
  const [maxBudget, setMaxBudget] = useState('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Sorting
  const [sortBy, setSortBy] = useState('unit_number'); // unit_number | floor | rooms | area | price_per_m2 | total_price | status
  const [sortOrder, setSortOrder] = useState('asc'); // asc | desc

  const [selectedUnitId, setSelectedUnitId] = useState(null);

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
      const matchesFloor = !floorFilter || String(u.floor_number) === String(floorFilter);
      const matchesMinArea = !minArea || u.areaM2 >= parseFloat(minArea);
      const matchesMaxArea = !maxArea || u.areaM2 <= parseFloat(maxArea);
      const matchesMaxBudget = !maxBudget || u.totalPrice <= parseFloat(maxBudget);

      return (
        matchesSearch &&
        matchesStatus &&
        matchesRooms &&
        matchesBuilding &&
        matchesFloor &&
        matchesMinArea &&
        matchesMaxArea &&
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
    minArea,
    maxArea,
    maxBudget,
    sortBy,
    sortOrder,
  ]);

  const hasActiveFilters = Boolean(
    search || statusFilter || roomsFilter || buildingFilter || floorFilter || minArea || maxArea || maxBudget
  );

  const resetFilters = () => {
    setSearch('');
    setStatusFilter('');
    setRoomsFilter('');
    setBuildingFilter('');
    setFloorFilter('');
    setMinArea('');
    setMaxArea('');
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
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Home className="h-7 w-7 text-blue-600" />
            <span>Реестр квартир</span>
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500">
            Каталог помещений, поиск по фильтрам, площади, бюджету, статусам и переход к оформлению сделок
          </p>
        </div>

        {selectedProjectId && (
          <button
            onClick={() => navigate(`/projects/${selectedProjectId}`)}
            className="flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-xs font-bold transition shadow-md cursor-pointer"
          >
            <Layers className="h-4 w-4" />
            <span>Открыть шахматку объекта →</span>
          </button>
        )}
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
          {availableBuildings.length > 1 && (
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
          )}

          {/* Floor Filter */}
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

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-800 outline-none focus:border-blue-500 cursor-pointer"
          >
            <option value="">Все статусы</option>
            <option value="AVAILABLE">Свободные (зелёный)</option>
            <option value="RESERVED">В брони (жёлтый)</option>
            <option value="SOLD">Проданные (красный)</option>
            <option value="BLOCKED">Заблокированные</option>
          </select>

          {/* Search Unit Number */}
          <div className="relative min-w-[170px] max-w-xs flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Поиск квартиры..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-8 pr-3 py-1.5 text-xs text-slate-900 outline-none focus:border-blue-500 focus:bg-white transition"
            />
          </div>

          {/* Toggle Advanced Filters (Area & Budget) */}
          <button
            type="button"
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
              showAdvancedFilters || minArea || maxArea || maxBudget
                ? 'bg-blue-50 text-blue-700 border-blue-200 shadow-2xs'
                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <SlidersHorizontal className="h-3.5 w-3.5 text-blue-600" />
            <span>Параметры подбора</span>
            {(minArea || maxArea || maxBudget) && (
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

        {/* Collapsible Advanced Filters: Area & Budget */}
        {showAdvancedFilters && (
          <div className="pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-3 animate-in fade-in">
            {/* Min Area */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Мин. площадь (м²)</label>
              <input
                type="number"
                placeholder="от 40 м²"
                value={minArea}
                onChange={(e) => setMinArea(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-900 outline-none focus:border-blue-500 focus:bg-white"
              />
            </div>

            {/* Max Area */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Макс. площадь (м²)</label>
              <input
                type="number"
                placeholder="до 100 м²"
                value={maxArea}
                onChange={(e) => setMaxArea(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-900 outline-none focus:border-blue-500 focus:bg-white"
              />
            </div>

            {/* Max Budget */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Макс. бюджет ({currency})
              </label>
              <input
                type="number"
                placeholder={`до 50 000 ${currency}`}
                value={maxBudget}
                onChange={(e) => setMaxBudget(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-900 outline-none focus:border-blue-500 focus:bg-white"
              />
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

      {/* Units Table View */}
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
              className="mt-4 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition"
            >
              Сбросить фильтры
            </button>
          )}
        </div>
      ) : (
        <div className="rounded-2xl bg-white border border-slate-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold select-none">
                <tr>
                  <th
                    onClick={() => handleSort('unit_number')}
                    className="p-3.5 pl-5 cursor-pointer hover:bg-slate-100 transition group"
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
                  <th className="p-3.5 text-right pr-5">Детали и история</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUnits.map((u) => {
                  const badge = getStatusBadge(u.status);
                  return (
                    <tr
                      key={u.id}
                      onClick={() => setSelectedUnitId(u.id)}
                      className="hover:bg-blue-50/50 transition cursor-pointer group"
                    >
                      <td className="p-3.5 pl-5 font-bold text-slate-900 flex items-center gap-2 group-hover:text-blue-600">
                        <span className="h-2 w-2 rounded-full bg-blue-600"></span>
                        <span>Кв. №{u.unit_number}</span>
                      </td>
                      <td className="p-3.5 text-slate-600">
                        <span className="font-semibold text-slate-800">{u.building_name}</span>
                        {u.section_name && <span className="text-slate-400"> • {u.section_name}</span>}
                      </td>
                      <td className="p-3.5 font-medium text-slate-700">{u.floor_number} этаж</td>
                      <td className="p-3.5 font-semibold text-slate-800">
                        {u.rooms === 0 ? 'Студия' : `${u.rooms}-комн.`}
                      </td>
                      <td className="p-3.5 font-bold text-slate-900">
                        {formatMeasure(u.areaM2)} м²
                      </td>
                      <td className="p-3.5 font-extrabold text-blue-700">
                        {u.pricePerM2 > 0 ? `${u.pricePerM2.toLocaleString()} ${currency}` : '—'}
                      </td>
                      <td className="p-3.5 font-black text-slate-900">
                        {u.totalPrice > 0 ? `${u.totalPrice.toLocaleString()} ${currency}` : '—'}
                      </td>
                      <td className="p-3.5">
                        <span className={`px-2.5 py-0.5 rounded-full font-bold border text-[10px] ${badge.bg}`}>
                          {badge.label}
                        </span>
                      </td>
                      <td className="p-3.5 text-right pr-5">
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 group-hover:translate-x-1 transition">
                          <Eye className="h-3.5 w-3.5" />
                          <span>Открыть карточку →</span>
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
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
    </div>
  );
};
