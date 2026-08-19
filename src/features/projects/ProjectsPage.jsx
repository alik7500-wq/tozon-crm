import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import { useAuth } from '../auth/AuthContext';
import { CreateProjectModal } from './CreateProjectModal';
import {
  Building2,
  Plus,
  MapPin,
  Briefcase,
  Coins,
  ChevronRight,
  Search,
  Layers,
  Sparkles,
  AlertCircle
} from 'lucide-react';

export const ProjectsPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [error, setError] = useState('');

  const fetchProjects = async () => {
    setIsLoading(true);
    setError('');
    try {
      const res = await api.get('/projects');
      setProjects(res.data.projects || []);
    } catch (err) {
      setError(err.message || 'Ошибка загрузки проектов');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleProjectCreated = (newProj) => {
    setProjects((prev) => [newProj, ...prev]);
    navigate(`/projects/${newProj.id}`);
  };

  const filteredProjects = projects.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.code.toLowerCase().includes(search.toLowerCase()) ||
    p.address.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Building2 className="h-6 w-6 text-blue-600" />
            <span>Строительные объекты (ЖК)</span>
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500">
            Реестр жилых комплексов, корпусов, генпланов и шахматки квартир Tozon CRM
          </p>
        </div>

        <div className="text-xs text-slate-500">
          Активных проектов: <strong className="text-slate-900">{projects.length}</strong>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex items-center justify-between gap-4 rounded-2xl bg-white p-3 border border-slate-200 shadow-2xs">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по названию, коду или адресу..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-10 py-2 text-xs text-slate-900 placeholder-slate-400 outline-none focus:border-blue-500 focus:bg-white"
          />
        </div>

        <div className="text-xs text-slate-500">
          Всего объектов: <span className="font-bold text-slate-800">{filteredProjects.length}</span>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          <AlertCircle className="h-5 w-5 text-rose-500 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Projects Grid / Empty State */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-56 rounded-2xl bg-white border border-slate-200 animate-pulse" />
          ))}
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center shadow-xs">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 mb-4 border border-blue-100">
            <Building2 className="h-8 w-8" />
          </div>
          <h3 className="text-base font-bold text-slate-900">Объекты не найдены</h3>
          <p className="mt-1.5 max-w-sm text-xs text-slate-500">
            {search
              ? 'По вашему запросу ничего не найдено. Попробуйте изменить параметры поиска.'
              : 'В системе пока нет созданных жилых комплексов. Создайте свой первый ЖК для начала работы.'}
          </p>
          {user?.role === 'ADMIN' && !search && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="mt-5 flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 px-4 py-2 text-xs font-bold text-white shadow-md hover:from-blue-700 hover:to-cyan-700 transition cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Создать первый ЖК</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((project) => (
            <div
              key={project.id}
              onClick={() => navigate(`/projects/${project.id}`)}
              className="rounded-2xl bg-white border border-slate-200 p-5 flex flex-col justify-between hover:shadow-lg hover:border-blue-300 transition-all duration-200 group cursor-pointer"
            >
              <div>
                {/* Card Top: Code Pill & Currency */}
                <div className="flex items-center justify-between mb-4">
                  <span className="rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700 border border-blue-200 uppercase tracking-wider">
                    {project.code}
                  </span>
                  <span className="flex items-center gap-1 text-xs font-semibold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-md">
                    <Coins className="h-3 w-3 text-amber-500" /> {project.currency}
                  </span>
                </div>

                <h3 className="text-lg font-bold text-slate-900 group-hover:text-blue-600 transition leading-snug">
                  {project.name}
                </h3>

                <div className="mt-3 space-y-1.5 text-xs text-slate-600">
                  <div className="flex items-center gap-2">
                    <Briefcase className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{project.developer_name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{project.address}</span>
                  </div>
                </div>

                {project.description && (
                  <p className="mt-3 text-xs text-slate-500 line-clamp-2 border-t border-slate-100 pt-2.5">
                    {project.description}
                  </p>
                )}
              </div>

              {/* Card Footer: Quick Actions */}
              <div className="mt-5 border-t border-slate-100 pt-4 flex items-center justify-between">
                <span className="text-[11px] text-slate-400">
                  Добавлен: {new Date(project.created_at).toLocaleDateString()}
                </span>

                <span
                  className="flex items-center gap-1 text-xs font-bold text-blue-600 group-hover:translate-x-0.5 transition"
                >
                  <span>Шахматка и план</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      <CreateProjectModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreated={handleProjectCreated}
      />
    </div>
  );
};
