import React, { useEffect, useRef, useState } from 'react';
import { api } from '../../api/client';
import { Building2, CheckCircle2, Loader2, ShieldAlert, X } from 'lucide-react';

export const ProjectAccessModal = ({ user, isOpen, onClose, onSaved }) => {
  const [projects, setProjects] = useState([]);
  const [allProjectsAccess, setAllProjectsAccess] = useState(false);
  const [selectedProjectIds, setSelectedProjectIds] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const requestSeqRef = useRef(0);
  const activeUserIdRef = useRef(null);
  const openSessionRef = useRef(0);

  const resetModalState = () => {
    setIsLoading(false);
    setIsSaving(false);
    setLoadError('');
    setSaveError('');
    setSaveSuccess('');
    setAllProjectsAccess(false);
    setSelectedProjectIds([]);
  };

  const loadAccessData = async (targetUserId, sessionToken = openSessionRef.current) => {
    if (!targetUserId) return;
    const seq = ++requestSeqRef.current;
    activeUserIdRef.current = String(targetUserId);

    setIsLoading(true);
    setLoadError('');
    setSaveError('');
    setSaveSuccess('');

    try {
      const [userRes, projectsRes] = await Promise.all([
        api.get(`/users/${targetUserId}`),
        api.get('/projects')
      ]);

      // Ignore late response if modal closed, reopened, or user switched
      if (
        openSessionRef.current !== sessionToken ||
        requestSeqRef.current !== seq ||
        activeUserIdRef.current !== String(targetUserId)
      ) {
        return;
      }

      const loadedUser = userRes?.data?.user || userRes?.user;
      const loadedProjects = projectsRes?.data?.projects || projectsRes?.projects || [];

      if (!loadedUser) {
        throw new Error('Не удалось получить данные пользователя');
      }

      setProjects(Array.isArray(loadedProjects) ? loadedProjects : []);
      setAllProjectsAccess(Boolean(loadedUser.all_projects_access));
      const ids = Array.isArray(loadedUser.allowed_project_ids)
        ? loadedUser.allowed_project_ids.map((id) => String(id))
        : [];
      setSelectedProjectIds(ids);
    } catch (err) {
      if (
        openSessionRef.current !== sessionToken ||
        requestSeqRef.current !== seq ||
        activeUserIdRef.current !== String(targetUserId)
      ) {
        return;
      }
      setLoadError(err?.response?.data?.message || err?.message || 'Ошибка загрузки проектных прав');
    } finally {
      if (
        openSessionRef.current === sessionToken &&
        requestSeqRef.current === seq &&
        activeUserIdRef.current === String(targetUserId)
      ) {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    const sessionToken = ++openSessionRef.current;
    requestSeqRef.current += 1;

    if (!isOpen || !user?.id) {
      activeUserIdRef.current = null;
      resetModalState();
      return;
    }

    resetModalState();
    loadAccessData(user.id, sessionToken);
  }, [isOpen, user?.id]);

  if (!isOpen || !user) return null;

  const toggleProjectId = (projectId) => {
    if (isSaving) return;
    const key = String(projectId);
    setSaveError('');
    setSaveSuccess('');
    setSelectedProjectIds((prev) =>
      prev.includes(key) ? prev.filter((id) => id !== key) : [...prev, key]
    );
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (isSaving || isLoading || loadError) return;

    const targetUserId = user.id;
    const sessionToken = openSessionRef.current;
    const seq = ++requestSeqRef.current;
    setIsSaving(true);
    setSaveError('');
    setSaveSuccess('');

    try {
      const payload = {
        all_projects_access: Boolean(allProjectsAccess),
        allowed_project_ids: selectedProjectIds.map((id) => Number(id)).filter((n) => Number.isInteger(n) && n > 0)
      };

      const res = await api.put(`/users/${targetUserId}/project-access`, payload);

      // Ignore late save response if modal closed, reopened, or user changed
      if (
        openSessionRef.current !== sessionToken ||
        requestSeqRef.current !== seq ||
        activeUserIdRef.current !== String(targetUserId)
      ) {
        return;
      }

      const updatedUser = res?.data?.user || res?.user;
      if (updatedUser) {
        setAllProjectsAccess(Boolean(updatedUser.all_projects_access));
        setSelectedProjectIds(
          Array.isArray(updatedUser.allowed_project_ids)
            ? updatedUser.allowed_project_ids.map((id) => String(id))
            : []
        );
        if (typeof onSaved === 'function') {
          onSaved(updatedUser);
        }
      }
      setSaveSuccess('Проектные права успешно сохранены');
    } catch (err) {
      if (
        openSessionRef.current !== sessionToken ||
        requestSeqRef.current !== seq ||
        activeUserIdRef.current !== String(targetUserId)
      ) {
        return;
      }
      setSaveError(err?.response?.data?.message || err?.message || 'Ошибка сохранения проектных прав');
    } finally {
      if (
        openSessionRef.current === sessionToken &&
        requestSeqRef.current === seq &&
        activeUserIdRef.current === String(targetUserId)
      ) {
        setIsSaving(false);
      }
    }
  };

  const hasNoAccess = !allProjectsAccess && selectedProjectIds.length === 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-label={`Доступ к проектам: ${user.name}`}
    >
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white">
              <Building2 className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900">Доступ к проектам</h3>
              <p className="text-[11px] text-slate-500">
                {user.name} ({user.email})
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Закрыть окно проектных прав"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-5 space-y-4">
          {isLoading ? (
            <div className="py-8 text-center text-xs text-slate-500 flex flex-col items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
              <span>Загрузка текущих проектных прав...</span>
            </div>
          ) : loadError ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800 space-y-2">
              <div className="flex items-center gap-2 font-bold">
                <ShieldAlert className="h-4 w-4 shrink-0" />
                <span>Не удалось загрузить проектные права</span>
              </div>
              <p>{loadError}</p>
              <button
                type="button"
                onClick={() => loadAccessData(user.id)}
                className="rounded-lg bg-rose-600 text-white px-3 py-1.5 text-[11px] font-bold hover:bg-rose-700"
              >
                Повторить загрузку
              </button>
            </div>
          ) : (
            <>
              <label className="flex items-start gap-2.5 rounded-xl border border-slate-200 bg-slate-50 p-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={allProjectsAccess}
                  disabled={isSaving}
                  onChange={(e) => {
                    if (isSaving) return;
                    setSaveError('');
                    setSaveSuccess('');
                    setAllProjectsAccess(e.target.checked);
                  }}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
                />
                <div className="text-xs">
                  <div className="font-bold text-slate-900">Все проекты</div>
                  <div className="text-[11px] text-slate-500">
                    Явный доступ ко всем текущим и будущим объектам без ограничения списком.
                  </div>
                </div>
              </label>

              {hasNoAccess && (
                <div
                  role="status"
                  className="rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-xs text-amber-900 font-semibold"
                >
                  Нет доступа к проектам — сотрудник не увидит лиды и диалоги ни одного проекта.
                </div>
              )}

              <div className="space-y-2">
                <div className="text-xs font-bold text-slate-700">
                  Конкретные проекты ({selectedProjectIds.length})
                </div>
                {projects.length === 0 ? (
                  <div className="text-xs text-slate-400 py-2">Проекты не найдены</div>
                ) : (
                  <div className="max-h-56 overflow-y-auto divide-y divide-slate-100 rounded-xl border border-slate-200">
                    {projects.map((p) => {
                      const checked = selectedProjectIds.includes(String(p.id));
                      return (
                        <label
                          key={p.id}
                          className="flex items-center gap-2.5 px-3 py-2 text-xs hover:bg-slate-50 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            disabled={isSaving}
                            onChange={() => toggleProjectId(p.id)}
                            className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
                          />
                          <span className="font-medium text-slate-800">{p.name}</span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              {saveError && (
                <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700 font-semibold">
                  {saveError}
                </div>
              )}

              {saveSuccess && (
                <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700 font-semibold flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>{saveSuccess}</span>
                </div>
              )}
            </>
          )}

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100"
            >
              Закрыть
            </button>
            <button
              type="submit"
              disabled={isSaving || isLoading || Boolean(loadError)}
              className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1.5"
            >
              {isSaving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              <span>Сохранить доступ</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
