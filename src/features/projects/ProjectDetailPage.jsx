import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../../api/client';
import { useAuth } from '../auth/AuthContext';
import { ChessboardTab } from './tabs/ChessboardTab';
import { LayoutsTab } from './tabs/LayoutsTab';
import { VisualMapsTab } from './tabs/VisualMapsTab';
import { BatchGeneratorModal } from './tabs/BatchGeneratorModal';
import { ErrorBoundary } from '../../components/ErrorBoundary';
const Scene3DViewer = React.lazy(() => import('../visual3d').then(m => ({ default: m.Scene3DViewer })));
const Tour360Viewer = React.lazy(() => import('../tour360').then(m => ({ default: m.Tour360Viewer })));
const VisualAdminTab = React.lazy(() => import('../visualAdmin').then(m => ({ default: m.VisualAdminTab })));
const ProjectGalleryTab = React.lazy(() => import('../projectGallery').then(m => ({ default: m.ProjectGalleryTab })));
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
  Plus,
  Box,
  Compass,
  Sliders
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
      // 1. Fetch Project details
      const projRes = await api.get(`/projects/${id}`);
      const projectData = projRes.data?.project || projRes.project || projRes;
      setProject(projectData);

      // 2. Fetch stats safely
      try {
        const statsRes = await api.get(`/inventory/projects/${id}/stats`);
        setStats(statsRes.data?.stats || statsRes.stats || null);
      } catch (err) {
        console.warn('Failed to load project stats:', err);
      }

      // 3. Fetch layouts safely
      try {
        const layoutsRes = await api.get(`/inventory/projects/${id}/layouts`);
        setLayouts(layoutsRes.data?.layouts || layoutsRes.data?.layoutTypes || layoutsRes.layouts || []);
      } catch (err) {
        console.warn('Failed to load project layouts:', err);
      }
    } catch (err) {
      console.error('Failed to load project:', err);
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
    { id: 'gallery', label: 'Визуализация', icon: Sparkles },
    { id: '3d', label: '3D Модель', icon: Box },
    { id: '360', label: '360° Тур', icon: Compass },
    { id: 'maps', label: 'Генплан и Фасады', icon: Map },
    { id: 'layouts', label: 'Типовые планировки', icon: Maximize2 },
    { id: 'overview', label: 'Сводка и метрики', icon: Building2 },
    ...((user?.role === 'ADMIN' || user?.role === 'DIRECTOR') ? [
      { id: 'visual_admin', label: 'Управление 3D/360', icon: Sliders }
    ] : [])
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

        {activeTab === 'gallery' && (
          <ErrorBoundary
            fallback={
              <div className="rounded-2xl bg-white border border-slate-200 p-8 text-center">
                <h3 className="text-base font-bold text-slate-900">Галерея временно недоступна</h3>
                <p className="text-xs text-slate-500 mt-1">Произошла ошибка при загрузке визуальных материалов.</p>
                <button onClick={() => setActiveTab('chessboard')} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold">
                  Вернуться к шахматке
                </button>
              </div>
            }
          >
            <React.Suspense
              fallback={
                <div className="flex h-72 items-center justify-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="h-9 w-9 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
                    <span className="text-xs text-slate-500 font-medium">Загрузка визуализации...</span>
                  </div>
                </div>
              }
            >
              <ProjectGalleryTab
                projectId={id}
                onOpenAdminManager={() => setActiveTab('visual_admin')}
              />
            </React.Suspense>
          </ErrorBoundary>
        )}

        {activeTab === '3d' && (
          <ErrorBoundary
            fallback={
              <div className="rounded-2xl bg-slate-950 border border-slate-800 p-8 text-center text-white">
                <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto mb-3 text-amber-400">
                  <Box className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold">3D-модель временно недоступна</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                  Не удалось инициализировать 3D холст или загрузить модель. Попробуйте обновить страницу.
                </p>
                <div className="flex items-center justify-center gap-3 mt-4">
                  <button onClick={() => window.location.reload()} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold cursor-pointer">
                    Повторить
                  </button>
                  <button onClick={() => setActiveTab('chessboard')} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium cursor-pointer">
                    К шахматке
                  </button>
                </div>
              </div>
            }
          >
            <React.Suspense
              fallback={
                <div className="flex h-72 items-center justify-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="h-9 w-9 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
                    <span className="text-xs text-slate-500 font-medium">Загрузка 3D модуля...</span>
                  </div>
                </div>
              }
            >
              <Scene3DViewer
                projectId={id}
                currency={project.currency}
                onBackToChessboard={() => setActiveTab('chessboard')}
              />
            </React.Suspense>
          </ErrorBoundary>
        )}

        {activeTab === '360' && (
          <ErrorBoundary
            fallback={
              <div className="rounded-2xl bg-slate-950 border border-slate-800 p-8 text-center text-white">
                <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto mb-3 text-purple-400">
                  <Compass className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold">360° тур временно недоступен</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                  Не удалось загрузить панорамные сферы. Попробуйте обновить страницу.
                </p>
                <div className="flex items-center justify-center gap-3 mt-4">
                  <button onClick={() => window.location.reload()} className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold cursor-pointer">
                    Повторить
                  </button>
                  <button onClick={() => setActiveTab('chessboard')} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium cursor-pointer">
                    К шахматке
                  </button>
                </div>
              </div>
            }
          >
            <React.Suspense
              fallback={
                <div className="flex h-72 items-center justify-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="h-9 w-9 animate-spin rounded-full border-4 border-purple-600 border-t-transparent" />
                    <span className="text-xs text-slate-500 font-medium">Загрузка 360° тура...</span>
                  </div>
                </div>
              }
            >
              <Tour360Viewer
                projectId={id}
                currency={project.currency}
                onBack={() => setActiveTab('chessboard')}
              />
            </React.Suspense>
          </ErrorBoundary>
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

        {activeTab === 'visual_admin' && (
          <React.Suspense
            fallback={
              <div className="flex h-72 items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                  <div className="h-9 w-9 animate-spin rounded-full border-4 border-slate-600 border-t-transparent" />
                  <span className="text-xs text-slate-500 font-medium">Загрузка панели управления 3D/360...</span>
                </div>
              </div>
            }
          >
            <VisualAdminTab
              projectId={id}
              currency={project.currency}
            />
          </React.Suspense>
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
