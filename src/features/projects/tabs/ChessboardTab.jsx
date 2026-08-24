import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../../api/client';
import { useAuth } from '../../auth/AuthContext';
import { ApartmentDetailModal } from '../../apartments/ApartmentDetailModal';
import {
  Layers,
  Filter,
  CheckCircle2,
  Lock,
  Unlock,
  Building2,
  X,
  FileCheck,
  ChevronRight,
  Maximize2,
  DollarSign,
  AlertCircle,
  Clock,
  Sparkles,
  Printer,
  Image as ImageIcon
} from 'lucide-react';

export const ChessboardTab = ({ projectId, currency = 'USD', onOpenGenerator }) => {
  const { user } = useAuth();
  const [chessboardData, setChessboardData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [roomsFilter, setRoomsFilter] = useState('');

  // Selected Unit for Modal
  const [selectedUnitId, setSelectedUnitId] = useState(null);

  const fetchChessboard = async () => {
    setIsLoading(true);
    setError('');
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      if (roomsFilter !== '') params.rooms = roomsFilter;

      const res = await api.get(`/inventory/projects/${projectId}/chessboard`, { params });
      setChessboardData(res.data.chessboard || []);
    } catch (err) {
      setError(err.message || 'Ошибка загрузки шахматки');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchChessboard();
  }, [projectId, statusFilter, roomsFilter]);

  const handleUnitClick = (unit) => {
    setSelectedUnitId(unit.id);
  };

  const handleToggleBlock = async () => {
    if (!selectedUnit) return;
    setIsUpdatingStatus(true);
    try {
      const newStatus = selectedUnit.status === 'BLOCKED' ? 'AVAILABLE' : 'BLOCKED';
      const res = await api.patch(`/inventory/units/${selectedUnit.id}/status`, {
        status: newStatus,
        block_reason: newStatus === 'BLOCKED' ? 'Заблокировано администратором' : null,
      });
      setSelectedUnit(res.data.unit);
      fetchChessboard();
    } catch (err) {
      alert(err.message || 'Ошибка изменения статуса');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleDealCreated = (deal) => {
    setCreatedDeal(deal);
    setSelectedUnit(null);
    fetchChessboard();
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'AVAILABLE':
        return { label: 'Свободна', bg: 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:border-emerald-400 hover:bg-emerald-100/80', dot: 'bg-emerald-500' };
      case 'RESERVED':
        return { label: 'Бронь', bg: 'bg-amber-50 text-amber-700 border-amber-300 hover:border-amber-400 hover:bg-amber-100/80', dot: 'bg-amber-500' };
      case 'SOLD':
        return { label: 'Продана', bg: 'bg-rose-50 text-rose-700 border-rose-300 hover:border-rose-400 hover:bg-rose-100/80', dot: 'bg-rose-500' };
      case 'BLOCKED':
        return { label: 'Блок', bg: 'bg-slate-100 text-slate-500 border-slate-300 hover:border-slate-400 hover:bg-slate-200/80', dot: 'bg-slate-400' };
      default:
        return { label: status, bg: 'bg-slate-50 text-slate-700 border-slate-200', dot: 'bg-slate-400' };
    }
  };

  // Check if any units exist across buildings
  const totalUnitsCount = chessboardData.reduce((acc, b) => {
    return acc + b.sections.reduce((sAcc, s) => {
      return sAcc + s.floors.reduce((fAcc, f) => fAcc + (f.units?.length || 0), 0);
    }, 0);
  }, 0);

  return (
    <div className="space-y-5">
      {/* Top Bar: Filters & Color Legend */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-white p-4 border border-slate-200 shadow-2xs">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600">
            <Filter className="h-3.5 w-3.5 text-blue-600" />
            <span>Фильтры:</span>
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-800 outline-none focus:border-blue-500 cursor-pointer"
          >
            <option value="">Все статусы</option>
            <option value="AVAILABLE">Свободные (зеленый)</option>
            <option value="RESERVED">В брони (желтый)</option>
            <option value="SOLD">Проданные (красный)</option>
            <option value="BLOCKED">Заблокированные (серый)</option>
          </select>

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
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-slate-600">
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-md bg-emerald-500 shadow-xs"></span>
            <span>Свободна</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-md bg-amber-500 shadow-xs"></span>
            <span>Бронь</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-md bg-rose-500 shadow-xs"></span>
            <span>Продана</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-md bg-slate-400 shadow-xs"></span>
            <span>Заблокирована</span>
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          <AlertCircle className="h-5 w-5 text-rose-500 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Content Area */}
      {isLoading ? (
        <div className="h-72 rounded-2xl bg-white border border-slate-200 p-8 flex items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
            <span className="text-xs text-slate-500">Загрузка шахматки...</span>
          </div>
        </div>
      ) : totalUnitsCount === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center shadow-xs">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 mb-3 border border-blue-100">
            <Layers className="h-7 w-7" />
          </div>
          <h3 className="text-base font-bold text-slate-900">В этом ЖК пока нет квартир</h3>
          <p className="mt-1 text-xs text-slate-500 max-w-sm">
            Воспользуйтесь конфигуратором этажей для пакетной генерации 1к, 2к и 3к квартир за 5 секунд.
          </p>
          {user?.role === 'ADMIN' && (
            <Link
              to="/settings"
              className="mt-4 flex items-center gap-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 text-xs font-bold transition cursor-pointer"
            >
              <Sparkles className="h-4 w-4 text-blue-600" />
              <span>Перейти в «Настройки» для генерации этажей →</span>
            </Link>
          )}
        </div>
      ) : (
        /* Chessboard Grid */
        <div className="space-y-8">
          {chessboardData.map((building) => (
            <div key={building.id} className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
                    <Building2 className="h-4 w-4" />
                  </div>
                  <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                    <span>{building.name}</span>
                    {building.code && (
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                        {building.code}
                      </span>
                    )}
                  </h3>
                </div>
              </div>

              {building.sections.map((section) => (
                <div key={section.id} className="rounded-2xl bg-white border border-slate-200 p-5 shadow-xs overflow-x-auto">
                  <div className="mb-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    {section.name}
                  </div>

                  <div className="min-w-max space-y-2">
                    {section.floors
                      ?.slice()
                      .sort((a, b) => Number(a.floor_number) - Number(b.floor_number))
                      .map((floor) => (
                      <div key={floor.id} className="flex items-center gap-3">
                        {/* Floor Number Header Box */}
                        <div className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-xl bg-slate-100 border border-slate-200 text-slate-700 font-bold">
                          <span className="text-base leading-none">{floor.floor_number}</span>
                          <span className="text-[10px] text-slate-400 font-medium">этаж</span>
                        </div>

                        {/* Units Grid on Floor */}
                        <div className="flex items-center gap-2.5 flex-wrap">
                          {floor.units
                            ?.slice()
                            .sort((a, b) => {
                              const numA = parseInt(String(a.unit_number).replace(/\D/g, '')) || 0;
                              const numB = parseInt(String(b.unit_number).replace(/\D/g, '')) || 0;
                              return numA - numB;
                            })
                            .map((unit) => {
                            const badge = getStatusBadge(unit.status);
                            const areaM2 = (unit.area_m2_x100 / 100).toFixed(1);

                            return (
                              <button
                                key={unit.id}
                                onClick={() => handleUnitClick(unit)}
                                className={`flex h-16 w-28 flex-col justify-between rounded-xl border p-2 text-left transition-all duration-150 shadow-2xs cursor-pointer ${badge.bg}`}
                              >
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-extrabold text-slate-900">
                                    №{unit.unit_number}
                                  </span>
                                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-white/80 border border-slate-200/60 shadow-2xs">
                                    {unit.rooms === 0 ? 'Студия' : `${unit.rooms}к`}
                                  </span>
                                </div>

                                <div className="flex items-baseline justify-between text-[11px]">
                                  <span className="font-semibold text-slate-700">{areaM2} м²</span>
                                  <span className="text-[10px] font-medium text-slate-500">{badge.label}</span>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Apartment Detail Modal */}
      {selectedUnitId && (
        <ApartmentDetailModal
          unitId={selectedUnitId}
          isOpen={Boolean(selectedUnitId)}
          onClose={() => setSelectedUnitId(null)}
          onUnitUpdated={fetchChessboard}
          currency={currency}
        />
      )}
    </div>
  );
};
