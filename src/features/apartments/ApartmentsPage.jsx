import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
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
  ArrowUpDown
} from 'lucide-react';

export const ApartmentsPage = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [chessboard, setChessboard] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [roomsFilter, setRoomsFilter] = useState('');

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

  useEffect(() => {
    if (!selectedProjectId) return;
    const fetchChessboardData = async () => {
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
    fetchChessboardData();
  }, [selectedProjectId]);

  // Flatten all units from chessboard
  const allUnits = chessboard.flatMap((b) =>
    (b.sections || []).flatMap((s) =>
      (s.floors || []).flatMap((f) =>
        (f.units || []).map((u) => ({
          ...u,
          building_name: b.name,
          section_name: s.name,
          floor_number: f.floor_number,
        }))
      )
    )
  );

  const filteredUnits = allUnits.filter((u) => {
    const matchesSearch = !search || String(u.unit_number).includes(search);
    const matchesStatus = !statusFilter || u.status === statusFilter;
    const matchesRooms = !roomsFilter || String(u.rooms) === roomsFilter;
    return matchesSearch && matchesStatus && matchesRooms;
  });

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
            Каталог всех помещений, статусы бронирования, метражи и поэтажные шахматки
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

      {/* Controls: Project Selector & Filters */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-white p-4 border border-slate-200 shadow-2xs">
        <div className="flex flex-wrap items-center gap-3 flex-1">
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

          {/* Search Unit Number */}
          <div className="relative min-w-[180px] max-w-xs flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Поиск по номеру квартиры..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3.5 py-1.5 text-xs text-slate-900 outline-none focus:border-blue-500 focus:bg-white transition"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-800 outline-none focus:border-blue-500 cursor-pointer"
          >
            <option value="">Все статусы</option>
            <option value="AVAILABLE">Свободные</option>
            <option value="RESERVED">В брони</option>
            <option value="SOLD">Проданные</option>
            <option value="BLOCKED">Заблокированные</option>
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
        </div>

        <div className="text-xs text-slate-500">
          Найдено: <strong className="text-slate-900">{filteredUnits.length}</strong> кв.
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
              : 'В выбранном комплексе нет квартир, соответствующих фильтрам.'}
          </p>
        </div>
      ) : (
        <div className="rounded-2xl bg-white border border-slate-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                <tr>
                  <th className="p-3.5 pl-5">№ Квартиры</th>
                  <th className="p-3.5">Корпус / Секция</th>
                  <th className="p-3.5">Этаж</th>
                  <th className="p-3.5">Комнат</th>
                  <th className="p-3.5">Площадь</th>
                  <th className="p-3.5">Статус</th>
                  <th className="p-3.5 text-right pr-5">Действие</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUnits.map((u) => {
                  const badge = getStatusBadge(u.status);
                  return (
                    <tr key={u.id} className="hover:bg-slate-50 transition">
                      <td className="p-3.5 pl-5 font-bold text-slate-900 flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-blue-600"></span>
                        <span>Кв. №{u.unit_number}</span>
                      </td>
                      <td className="p-3.5 text-slate-600">
                        {u.building_name} • {u.section_name}
                      </td>
                      <td className="p-3.5 font-medium text-slate-700">{u.floor_number} этаж</td>
                      <td className="p-3.5 font-semibold text-slate-800">
                        {u.rooms === 0 ? 'Студия' : `${u.rooms}-комн.`}
                      </td>
                      <td className="p-3.5 font-bold text-slate-900">
                        {(u.area_m2_x100 / 100).toFixed(1)} м²
                      </td>
                      <td className="p-3.5">
                        <span className={`px-2.5 py-0.5 rounded-full font-bold border text-[10px] ${badge.bg}`}>
                          {badge.label}
                        </span>
                      </td>
                      <td className="p-3.5 text-right pr-5">
                        <button
                          onClick={() => navigate(`/projects/${selectedProjectId}`)}
                          className="text-xs font-bold text-blue-600 hover:text-blue-800 transition"
                        >
                          В шахматку →
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
