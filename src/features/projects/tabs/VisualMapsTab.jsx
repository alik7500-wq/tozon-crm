import React, { useState, useEffect, useRef } from 'react';
import { api } from '../../../api/client';
import { useAuth } from '../../auth/AuthContext';
import {
  Map,
  Plus,
  Trash2,
  Save,
  Layers,
  Upload,
  Image as ImageIcon,
  Building2,
  Eye,
  Edit3,
  X,
  Sparkles
} from 'lucide-react';
import ImageUpload from '../../../components/ImageUpload';

export const VisualMapsTab = ({ projectId, onSelectUnit }) => {
  const { user } = useAuth();
  const [maps, setMaps] = useState([]);
  const [activeMap, setActiveMap] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Edit / Draw Mode
  const [isEditMode, setIsEditMode] = useState(false);
  const [hotspots, setHotspots] = useState([]);
  const [selectedHotspotIdx, setSelectedHotspotIdx] = useState(null);
  const [isSavingHotspots, setIsSavingHotspots] = useState(false);

  // New Map Upload Modal
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [newMapTitle, setNewMapTitle] = useState('');
  const [newMapKind, setNewMapKind] = useState('GENPLAN');
  const [newMapImagePath, setNewMapImagePath] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const imageContainerRef = useRef(null);

  const fetchMaps = async () => {
    setIsLoading(true);
    try {
      const res = await api.get(`/visual-maps/projects/${projectId}/maps`);
      const mapList = res.data.maps || [];
      setMaps(mapList);
      if (mapList.length > 0 && !activeMap) {
        setActiveMap(mapList[0]);
        setHotspots(mapList[0].hotspots || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMaps();
  }, [projectId]);

  useEffect(() => {
    if (activeMap) {
      setHotspots(activeMap.hotspots || []);
      setSelectedHotspotIdx(null);
    }
  }, [activeMap]);

  const handleUploadMap = async (e) => {
    e.preventDefault();
    if (!newMapImagePath) return;
    setIsUploading(true);

    try {
      const payload = {
        title: newMapTitle || 'Генплан',
        kind: newMapKind,
        image_path: newMapImagePath,
        project_id: projectId
      };

      const res = await api.post(`/visual-maps`, payload);

      setIsUploadModalOpen(false);
      setNewMapImagePath('');
      setNewMapTitle('');
      fetchMaps();
      setActiveMap(res.data.map);
    } catch (err) {
      alert(err.message || 'Ошибка загрузки карты');
    } finally {
      setIsUploading(false);
    }
  };

  const handleAddHotspot = () => {
    const newH = {
      x_pct: 25,
      y_pct: 25,
      width_pct: 20,
      height_pct: 20,
      label: `Корпус ${hotspots.length + 1}`,
    };
    const updated = [...hotspots, newH];
    setHotspots(updated);
    setSelectedHotspotIdx(updated.length - 1);
  };

  const handleUpdateHotspot = (idx, field, value) => {
    const updated = [...hotspots];
    updated[idx] = { ...updated[idx], [field]: value };
    setHotspots(updated);
  };

  const handleDeleteHotspot = (idx) => {
    const updated = hotspots.filter((_, i) => i !== idx);
    setHotspots(updated);
    setSelectedHotspotIdx(null);
  };

  const handleSaveHotspots = async () => {
    if (!activeMap) return;
    setIsSavingHotspots(true);
    try {
      await api.post(`/visual-maps/maps/${activeMap.id}/hotspots`, { hotspots });
      alert('Области успешно сохранены!');
      fetchMaps();
    } catch (err) {
      alert(err.message || 'Ошибка сохранения областей');
    } finally {
      setIsSavingHotspots(false);
    }
  };

  const handleDeleteMap = async (id) => {
    if (!confirm('Удалить эту карту?')) return;
    try {
      await api.delete(`/visual-maps/maps/${id}`);
      setActiveMap(null);
      fetchMaps();
    } catch (err) {
      alert(err.message || 'Ошибка удаления');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Map Selector & Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-white p-4 border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-2 flex-wrap">
          {maps.map((m) => (
            <button
              key={m.id}
              onClick={() => setActiveMap(m)}
              className={`rounded-xl px-4 py-2 text-xs font-bold transition cursor-pointer ${
                activeMap?.id === m.id
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {m.title} ({m.kind === 'GENPLAN' ? 'Генплан' : 'Фасад'})
            </button>
          ))}

          {user?.role === 'ADMIN' && (
            <button
              onClick={() => setIsUploadModalOpen(true)}
              className="flex items-center gap-1.5 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition cursor-pointer"
            >
              <Upload className="h-3.5 w-3.5 text-blue-600" />
              <span>Загрузить план/фасад</span>
            </button>
          )}
        </div>

        {activeMap && user?.role === 'ADMIN' && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsEditMode(!isEditMode)}
              className={`flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold transition cursor-pointer ${
                isEditMode
                  ? 'bg-amber-100 text-amber-800 border border-amber-300'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <Edit3 className="h-3.5 w-3.5" />
              <span>{isEditMode ? 'Режим разметки (ВКЛ)' : 'Редактировать разметку'}</span>
            </button>

            {isEditMode && (
              <>
                <button
                  onClick={handleAddHotspot}
                  className="flex items-center gap-1 rounded-xl bg-blue-50 text-blue-700 border border-blue-200 px-3 py-1.5 text-xs font-bold hover:bg-blue-100 cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Добавить зону</span>
                </button>

                <button
                  onClick={handleSaveHotspots}
                  disabled={isSavingHotspots}
                  className="flex items-center gap-1 rounded-xl bg-emerald-600 text-white px-3.5 py-1.5 text-xs font-bold hover:bg-emerald-700 shadow-xs cursor-pointer"
                >
                  <Save className="h-3.5 w-3.5" />
                  <span>{isSavingHotspots ? 'Сохранение...' : 'Сохранить'}</span>
                </button>
              </>
            )}

            <button
              onClick={() => handleDeleteMap(activeMap.id)}
              className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition"
              title="Удалить карту"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {/* Main Map Viewer Canvas */}
      {!activeMap ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center shadow-xs">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 mb-3 border border-blue-100">
            <Map className="h-7 w-7" />
          </div>
          <h4 className="text-base font-bold text-slate-900">Генплан или фасад не загружен</h4>
          <p className="mt-1 text-xs text-slate-500 max-w-sm">
            Загрузите визуальный генеральный план объекта для разметки корпусов и наглядного выбора квартир.
          </p>
          {user?.role === 'ADMIN' && (
            <button
              onClick={() => setIsUploadModalOpen(true)}
              className="mt-4 flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-blue-700 transition cursor-pointer"
            >
              <Upload className="h-4 w-4" />
              <span>Загрузить первое изображение</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Visual Image with interactive hotspots */}
          <div className="lg:col-span-3 rounded-2xl bg-white border border-slate-200 p-4 shadow-xs">
            <div
              ref={imageContainerRef}
              className="relative w-full overflow-hidden rounded-xl bg-slate-900 border border-slate-200 select-none"
            >
              <img
                src={activeMap.image_path}
                alt={activeMap.title}
                className="w-full h-auto max-h-[600px] object-contain mx-auto block"
              />

              {/* Hotspots Overlay */}
              {hotspots.map((h, idx) => {
                const isSelected = isEditMode && selectedHotspotIdx === idx;
                return (
                  <div
                    key={idx}
                    onClick={() => {
                      if (isEditMode) setSelectedHotspotIdx(idx);
                      else alert(`Выбрана зона: ${h.label}`);
                    }}
                    style={{
                      left: `${h.x_pct}%`,
                      top: `${h.y_pct}%`,
                      width: `${h.width_pct}%`,
                      height: `${h.height_pct}%`,
                    }}
                    className={`absolute flex items-center justify-center transition-all cursor-pointer rounded-lg border-2 ${
                      isSelected
                        ? 'border-amber-400 bg-amber-400/30 shadow-lg ring-2 ring-amber-400/50 z-20'
                        : 'border-blue-500 bg-blue-500/20 hover:bg-blue-500/40 hover:border-blue-400 z-10'
                    }`}
                  >
                    <span className="rounded-md bg-slate-900/80 px-2 py-0.5 text-[11px] font-extrabold text-white shadow-sm backdrop-blur-xs">
                      {h.label || `Область ${idx + 1}`}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Sidebar Editor Panel */}
          {isEditMode && selectedHotspotIdx !== null && hotspots[selectedHotspotIdx] ? (
            <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h4 className="text-sm font-bold text-slate-900">
                  Настройка области #{selectedHotspotIdx + 1}
                </h4>
                <button
                  onClick={() => handleDeleteHotspot(selectedHotspotIdx)}
                  className="text-rose-500 hover:text-rose-700 text-xs font-semibold"
                >
                  Удалить
                </button>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Подпись (Название)
                </label>
                <input
                  type="text"
                  value={hotspots[selectedHotspotIdx].label}
                  onChange={(e) => handleUpdateHotspot(selectedHotspotIdx, 'label', e.target.value)}
                  placeholder="Корпус 1"
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Позиция X (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={hotspots[selectedHotspotIdx].x_pct}
                    onChange={(e) => handleUpdateHotspot(selectedHotspotIdx, 'x_pct', parseFloat(e.target.value) || 0)}
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 px-2.5 py-1.5 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Позиция Y (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={hotspots[selectedHotspotIdx].y_pct}
                    onChange={(e) => handleUpdateHotspot(selectedHotspotIdx, 'y_pct', parseFloat(e.target.value) || 0)}
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 px-2.5 py-1.5 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Ширина (%)</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={hotspots[selectedHotspotIdx].width_pct}
                    onChange={(e) => handleUpdateHotspot(selectedHotspotIdx, 'width_pct', parseFloat(e.target.value) || 10)}
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 px-2.5 py-1.5 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Высота (%)</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={hotspots[selectedHotspotIdx].height_pct}
                    onChange={(e) => handleUpdateHotspot(selectedHotspotIdx, 'height_pct', parseFloat(e.target.value) || 10)}
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 px-2.5 py-1.5 text-xs"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-xs">
              <h4 className="text-sm font-bold text-slate-900 mb-2">Интерактивный генплан</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Наведите курсор на размеченную область на генплане, чтобы подсветить соответствующий корпус здания.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Upload Modal */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in">
          <div className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="text-lg font-bold text-slate-900">Загрузка плана или фасада</h3>
              <button onClick={() => setIsUploadModalOpen(false)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleUploadMap} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Название плана *</label>
                <input
                  type="text"
                  required
                  value={newMapTitle}
                  onChange={(e) => setNewMapTitle(e.target.value)}
                  placeholder="Генплан территории"
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2 text-sm outline-none focus:border-blue-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Тип карты</label>
                <select
                  value={newMapKind}
                  onChange={(e) => setNewMapKind(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2 text-sm outline-none focus:border-blue-500 focus:bg-white"
                >
                  <option value="GENPLAN">Генплан комплекса</option>
                  <option value="FACADE">Фасад здания</option>
                  <option value="FLOORPLAN">Поэтажный план</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Изображение (план или фото) *</label>
                <div style={{ width: '100%', height: '200px' }}>
                  <ImageUpload 
                    value={newMapImagePath}
                    onChange={(url) => setNewMapImagePath(url)}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsUploadModalOpen(false)}
                  className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={isUploading || !newMapImagePath}
                  className="rounded-xl bg-blue-600 px-5 py-2 text-sm font-bold text-white shadow-md hover:bg-blue-700 transition"
                >
                  {isUploading ? 'Загрузка...' : 'Загрузить'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
