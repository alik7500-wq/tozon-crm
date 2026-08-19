import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../../api/client';
import { useAuth } from '../auth/AuthContext';
import { ChessboardTab } from './tabs/ChessboardTab';
import { LayoutsTab } from './tabs/LayoutsTab';
import { VisualMapsTab } from './tabs/VisualMapsTab';
import { BatchGeneratorModal } from './tabs/BatchGeneratorModal';
import {
  Building2,
  ChevronLeft,
  Coins,
  MapPin,
  Briefcase,
  Layers,
  Sparkles,
  Maximize2,
  Map,
  FileCheck,
  Clock,
  CheckCircle2,
  Lock,
  Plus
} from 'lucide-react';

export const ProjectDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [project, setProject] = useState(null);
  const [stats, setStats] = useState(null);
  const [layouts, setLayouts] = useState([]);
  const [activeTab, setActiveTab] = useState('chessboard'); // 'overview', 'chessboard', 'layouts', 'maps'
  const [isLoading, setIsLoading] = useState(true);
  const [isGeneratorOpen, setIsGeneratorOpen] = useState(false);

  const fetchProjectData = async () => {
    setIsLoading(true);
    try {
      const [projRes, statsRes, layoutsRes] = await Promise.all([
        api.get(`/projects/${id}`),
        api.get(`/inventory/projects/${id}/stats`),
        api.get(`/inventory/projects/${id}/layouts`),
      ]);

      setProject(projRes.data.project);
      setStats(statsRes.data.stats);
      setLayouts(layoutsRes.data.layouts || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProjectData();
  }, [id]);

  if (isLoading) {
    return (
      <div className="flex h-72 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-9 w-9 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          <span className="text-xs text-slate-500 font-medium">Загрузка объекта...</span>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="rounded-2xl bg-white border border-slate-200 p-8 text-center">
        <h3 className="text-base font-bold text-slate-900">Объект не найден</h3>
        <button onClick={() => navigate('/projects')} className="mt-4 text-xs font-bold text-blue-600">
          Вернуться к списку
        </button>
      </div>
    );
  }

  const tabs = [
    { id: 'chessboard', label: 'Шахматка квартир', icon: Layers },
    { id: 'maps', label: 'Генплан и Фасады', icon: Map },
    { id: 'layouts', label: 'Типовые планировки', icon: Maximize2 },
    { id: 'overview', label: 'Сводка и метрики', icon: Building2 },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Breadcrumb & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            to="/projects"
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition shadow-2xs"
          >
            <ChevronLeft className="h-5 w-5" />
          </Link>

          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-blue-50 px-2 py-0.5 text-xs font-bold text-blue-700 border border-blue-200 uppercase">
                {project.code}
              </span>
              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                {project.name}
              </h1>
            </div>
            <div className="mt-1 flex items-center gap-4 text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <Briefcase className="h-3.5 w-3.5 text-slate-400" />
                {project.developer_name}
              </span>
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5 text-slate-400" />
                {project.address}
              </span>
            </div>
          </div>
        </div>

      </div>

      {/* Mini Stats Bar */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <div className="rounded-xl bg-white border border-slate-200 p-3 shadow-2xs">
            <span className="text-[10px] font-semibold text-slate-400 uppercase">Всего квартир</span>
            <div className="text-lg font-bold text-slate-900 mt-0.5">{stats.total_units}</div>
          </div>

          <div className="rounded-xl bg-emerald-50/70 border border-emerald-200 p-3">
            <span className="text-[10px] font-semibold text-emerald-700 uppercase">Свободно</span>
            <div className="text-lg font-extrabold text-emerald-800 mt-0.5">{stats.available_units}</div>
          </div>

          <div className="rounded-xl bg-amber-50/70 border border-amber-200 p-3">
            <span className="text-[10px] font-semibold text-amber-700 uppercase">В брони</span>
            <div className="text-lg font-extrabold text-amber-800 mt-0.5">{stats.reserved_units}</div>
          </div>

          <div className="rounded-xl bg-rose-50/70 border border-rose-200 p-3">
            <span className="text-[10px] font-semibold text-rose-700 uppercase">Продано</span>
            <div className="text-lg font-extrabold text-rose-800 mt-0.5">{stats.sold_units}</div>
          </div>

          <div className="rounded-xl bg-slate-100 border border-slate-200 p-3">
            <span className="text-[10px] font-semibold text-slate-500 uppercase">Заблокировано</span>
            <div className="text-lg font-bold text-slate-700 mt-0.5">{stats.blocked_units}</div>
          </div>
        </div>
      )}

      {/* Tabs Navigation */}
      <div className="flex border-b border-slate-200 gap-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-bold transition cursor-pointer ${
                isActive
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="pt-2">
        {activeTab === 'chessboard' && (
          <ChessboardTab
            projectId={id}
            currency={project.currency}
            onOpenGenerator={() => setIsGeneratorOpen(true)}
          />
        )}

        {activeTab === 'maps' && (
          <VisualMapsTab projectId={id} />
        )}

        {activeTab === 'layouts' && (
          <LayoutsTab
            projectId={id}
            currency={project.currency}
            onLayoutCreated={fetchProjectData}
          />
        )}

        {activeTab === 'overview' && (
          <div className="rounded-2xl bg-white border border-slate-200 p-6 space-y-6 shadow-xs">
            <h3 className="text-lg font-bold text-slate-900">Описание объекта</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              {project.description || 'Описание для данного жилого комплекса пока не заполнено.'}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-slate-100 pt-5 text-xs text-slate-600">
              <div>
                <span className="font-semibold text-slate-400 block">Валюта расчетов:</span>
                <span className="text-sm font-bold text-slate-800">{project.currency}</span>
              </div>
              <div>
                <span className="font-semibold text-slate-400 block">Общая площадь квартир:</span>
                <span className="text-sm font-bold text-slate-800">
                  {stats ? (stats.total_area_x100 / 100).toLocaleString() : 0} м²
                </span>
              </div>
              <div>
                <span className="font-semibold text-slate-400 block">Дата добавления в CRM:</span>
                <span className="text-sm font-bold text-slate-800">
                  {new Date(project.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Batch Generator Modal */}
      <BatchGeneratorModal
        isOpen={isGeneratorOpen}
        onClose={() => setIsGeneratorOpen(false)}
        projectId={id}
        currency={project.currency}
        layouts={layouts}
        onGenerated={fetchProjectData}
      />
    </div>
  );
};
