import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import { useAuth } from '../auth/AuthContext';
import { CreateProjectModal } from '../projects/CreateProjectModal';
import { BatchGeneratorModal } from '../projects/tabs/BatchGeneratorModal';
import { DictionariesTab } from './DictionariesTab';
import {
  Settings,
  Building2,
  Plus,
  Sparkles,
  Database,
  Users,
  FileText,
  Layers,
  ChevronRight,
  Shield,
  CheckCircle2,
  ExternalLink,
  MapPin,
  Briefcase,
  Trash2,
  BookOpen
} from 'lucide-react';

export const SettingsPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('projects'); // 'projects', 'users', 'backups'
  
  const [projects, setProjects] = useState([]);
  const [layouts, setLayouts] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);
  const [isGeneratorOpen, setIsGeneratorOpen] = useState(false);
  const [generatorProjectId, setGeneratorProjectId] = useState(null);

  const fetchProjects = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/projects');
      const list = res.data?.projects || res.projects || [];
      setProjects(list);
      if (list.length > 0 && !selectedProjectId) {
        setSelectedProjectId(list[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchLayouts = async (projId) => {
    if (!projId) return;
    try {
      const res = await api.get(`/inventory/projects/${projId}/layouts`);
      setLayouts(res.data?.layouts || res.layouts || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteProject = async (id, name) => {
    if (!window.confirm(`Вы уверены, что хотите безвозвратно удалить ЖК "${name}"?\nЭто действие может удалить связанные корпуса, этажи и квартиры.\n(Если есть привязанные сделки, удаление будет отменено)`)) {
      return;
    }
    
    try {
      await api.delete(`/projects/${id}`);
      fetchProjects();
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Ошибка при удалении ЖК');
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    if (selectedProjectId) {
      fetchLayouts(selectedProjectId);
    }
  }, [selectedProjectId]);

  const handleProjectCreated = (newProj) => {
    setProjects((prev) => [newProj, ...prev]);
    setSelectedProjectId(newProj.id);
  };

  const handleOpenGenerator = (projId) => {
    setGeneratorProjectId(projId);
    fetchLayouts(projId);
    setIsGeneratorOpen(true);
  };

  const selectedProjObj = projects.find((p) => String(p.id) === String(selectedProjectId || generatorProjectId));

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <Settings className="h-6 w-6 text-slate-700" />
            <span>Настройки системы</span>
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500">
            Управление строительными комплексами, пакетная генерация квартир и параметры CRM
          </p>
        </div>

        {user?.role === 'ADMIN' && activeTab === 'projects' && (
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setIsCreateProjectOpen(true)}
              className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-blue-500/20 hover:bg-blue-700 transition cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Добавить ЖК</span>
            </button>

            <button
              onClick={() => handleOpenGenerator(selectedProjectId || (projects[0] && projects[0].id))}
              disabled={projects.length === 0}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-blue-500/20 hover:from-blue-700 hover:to-cyan-700 transition disabled:opacity-50 cursor-pointer"
            >
              <Sparkles className="h-4 w-4" />
              <span>✨ Генерация квартир</span>
            </button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('projects')}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-bold transition cursor-pointer ${
            activeTab === 'projects'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Building2 className="h-4 w-4" />
          <span>Жилые комплексы и структура</span>
        </button>

        <button
          onClick={() => setActiveTab('users')}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-bold transition cursor-pointer ${
            activeTab === 'users'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Users className="h-4 w-4" />
          <span>Пользователи и права</span>
        </button>

        <button
          onClick={() => setActiveTab('dictionaries')}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-bold transition cursor-pointer ${
            activeTab === 'dictionaries'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <BookOpen className="h-4 w-4" />
          <span>Справочники системы</span>
        </button>

        <button
          onClick={() => setActiveTab('backups')}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-bold transition cursor-pointer ${
            activeTab === 'backups'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Database className="h-4 w-4" />
          <span>Резервные копии</span>
        </button>
      </div>

      {/* TAB: DICTIONARIES */}
      {activeTab === 'dictionaries' && <DictionariesTab />}

      {/* TAB 1: PROJECTS & STRUCTURE */}
      {activeTab === 'projects' && (
        <div className="space-y-6">
          {/* Quick Action Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Card 1: Add Project */}
            <div className="rounded-2xl border border-blue-200/80 bg-blue-50/50 p-5 shadow-2xs flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-xs font-bold uppercase text-blue-700 tracking-wider">Создание объекта</span>
                <h3 className="text-base font-extrabold text-slate-900">Добавить новый ЖК</h3>
                <p className="text-xs text-slate-500 max-w-sm">
                  Зарегистрируйте строительный комплекс, адрес, застройщика и базовую валюту (USD, TJS, RUB).
                </p>
              </div>
              <button
                onClick={() => setIsCreateProjectOpen(true)}
                className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition cursor-pointer shrink-0"
              >
                <Plus className="h-4 w-4" />
                <span>+ Добавить ЖК</span>
              </button>
            </div>

            {/* Card 2: Generate Structure */}
            <div className="rounded-2xl border border-cyan-200/80 bg-cyan-50/50 p-5 shadow-2xs flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-xs font-bold uppercase text-cyan-700 tracking-wider">Структура и этажи</span>
                <h3 className="text-base font-extrabold text-slate-900">Конфигуратор и генератор</h3>
                <p className="text-xs text-slate-500 max-w-sm">
                  Автоматическая генерация 1к, 2к, 3к квартир по этажам для выбранного блока (Блок А, Блок Б и т.д.).
                </p>
              </div>
              <button
                onClick={() => handleOpenGenerator(selectedProjectId || (projects[0] && projects[0].id))}
                disabled={projects.length === 0}
                className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:from-blue-700 hover:to-cyan-700 transition cursor-pointer shrink-0 disabled:opacity-50"
              >
                <Sparkles className="h-4 w-4" />
                <span>Генерация квартир</span>
              </button>
            </div>
          </div>

          {/* Projects Registry Table */}
          <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-2xs">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Реестр жилых комплексов в базе</h3>
                <p className="text-xs text-slate-500">Управляйте структурой и переходите в карточки объектов</p>
              </div>
              <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg">
                Всего ЖК: {projects.length}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                  <tr>
                    <th className="p-3.5 pl-5">Название ЖК</th>
                    <th className="p-3.5">Код</th>
                    <th className="p-3.5">Застройщик</th>
                    <th className="p-3.5">Адрес</th>
                    <th className="p-3.5">Валюта</th>
                    <th className="p-3.5 text-right pr-5">Действия</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {projects.map((proj) => (
                    <tr key={proj.id} className="hover:bg-slate-50 transition">
                      <td className="p-3.5 pl-5 font-bold text-slate-900">
                        {proj.name}
                      </td>
                      <td className="p-3.5">
                        <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-bold border border-blue-100 text-[11px]">
                          {proj.code}
                        </span>
                      </td>
                      <td className="p-3.5 text-slate-600">{proj.developer_name}</td>
                      <td className="p-3.5 text-slate-600">{proj.address}</td>
                      <td className="p-3.5 font-bold text-slate-800">{proj.currency || 'USD'}</td>
                      <td className="p-3.5 text-right pr-5 space-x-2">
                        <button
                          onClick={() => handleOpenGenerator(proj.id)}
                          className="px-3 py-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 text-[11px] font-bold hover:bg-blue-100 transition cursor-pointer"
                        >
                          ✨ Сгенерировать этажи
                        </button>
                        <button
                          onClick={() => navigate(`/projects/${proj.id}`)}
                          className="px-3 py-1 rounded-lg bg-slate-100 text-slate-700 text-[11px] font-bold hover:bg-slate-200 transition cursor-pointer"
                        >
                          Открыть объект →
                        </button>
                        <button
                          onClick={() => handleDeleteProject(proj.id, proj.name)}
                          className="px-2 py-1 rounded-lg bg-rose-50 text-rose-600 text-[11px] font-bold hover:bg-rose-100 transition cursor-pointer"
                          title="Удалить ЖК"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {projects.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-400">
                        Нет добавленных жилых комплексов. Нажмите «+ Добавить ЖК».
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: USERS */}
      {activeTab === 'users' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Пользователи Tozon CRM</h3>
              <p className="text-xs text-slate-500">Учетные записи администраторов и менеджеров отдела продаж</p>
            </div>
            <span className="text-xs font-bold px-3 py-1 rounded-lg bg-slate-100 text-slate-700">
              Текущий вход: {user?.email} ({user?.role})
            </span>
          </div>

          <div className="rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                <tr>
                  <th className="p-3 pl-4">Имя</th>
                  <th className="p-3">Email</th>
                  <th className="p-3">Роль</th>
                  <th className="p-3">Статус</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr className="hover:bg-slate-50">
                  <td className="p-3 pl-4 font-bold text-slate-900">{user?.name || 'Super Admin'}</td>
                  <td className="p-3 text-slate-600">{user?.email || 'admin@tozon.crm'}</td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                      {user?.role || 'ADMIN'}
                    </span>
                  </td>
                  <td className="p-3">
                    <span className="flex items-center gap-1 text-emerald-600 font-bold">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Активен
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: BACKUPS */}
      {activeTab === 'backups' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs space-y-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">Локальное резервное копирование SQLite</h3>
            <p className="text-xs text-slate-500">Сохранение полного снимка базы данных сделок, клиентов и планировок</p>
          </div>

          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-xs font-bold text-emerald-900">Файл базы данных: data/app.db</span>
              <p className="text-[11px] text-emerald-700">Режим WAL включен • Транзакции защищены</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold px-3 py-1.5 rounded-xl bg-white text-emerald-800 border border-emerald-200">
                ✓ База данных в норме
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Create Project */}
      <CreateProjectModal
        isOpen={isCreateProjectOpen}
        onClose={() => setIsCreateProjectOpen(false)}
        onCreated={handleProjectCreated}
      />

      {/* Modal: Batch Generator */}
      {generatorProjectId && (
        <BatchGeneratorModal
          isOpen={isGeneratorOpen}
          onClose={() => setIsGeneratorOpen(false)}
          projectId={generatorProjectId}
          currency={selectedProjObj?.currency || 'USD'}
          layouts={layouts}
          onGenerated={() => {
            fetchProjects();
          }}
        />
      )}
    </div>
  );
};
