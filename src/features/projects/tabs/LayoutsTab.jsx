import React, { useState, useEffect } from 'react';
import { api } from '../../../api/client';
import { useAuth } from '../../auth/AuthContext';
import { Plus, X, Maximize2, Coins, Trash2, Image as ImageIcon, Sparkles, AlertCircle } from 'lucide-react';

export const LayoutsTab = ({ projectId, currency = 'TJS', onLayoutCreated }) => {
  const { user } = useAuth();
  const [layouts, setLayouts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [error, setError] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    rooms: 1,
    area_m2: 45,
    default_price_per_m2: 8500,
    description: '',
  });
  const [selectedFile, setSelectedFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchLayouts = async () => {
    setIsLoading(true);
    try {
      const res = await api.get(`/inventory/projects/${projectId}/layouts`);
      setLayouts(res.data.layouts || []);
    } catch (err) {
      setError(err.message || 'Ошибка загрузки планировок');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLayouts();
  }, [projectId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'code' ? value.toUpperCase().replace(/\s+/g, '') : value,
    }));
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      let image_path = null;
      if (selectedFile) {
        const fileForm = new FormData();
        fileForm.append('image', selectedFile);
        const uploadRes = await api.post('/visual-maps/upload', fileForm, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        image_path = uploadRes.data.image_path;
      }

      await api.post(`/inventory/projects/${projectId}/layouts`, {
        name: formData.name,
        code: formData.code,
        rooms: parseInt(formData.rooms, 10),
        area_m2_x100: Math.round(parseFloat(formData.area_m2) * 100),
        default_price_per_m2_minor: Math.round(parseFloat(formData.default_price_per_m2) * 100),
        description: formData.description,
        image_path,
      });

      setIsModalOpen(false);
      setFormData({
        name: '',
        code: '',
        rooms: 1,
        area_m2: 45,
        default_price_per_m2: 8500,
        description: '',
      });
      setSelectedFile(null);
      fetchLayouts();
      if (onLayoutCreated) onLayoutCreated();
    } catch (err) {
      setError(err.message || 'Ошибка создания планировки');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Вы уверены, что хотите удалить эту типовую планировку?')) return;
    try {
      await api.delete(`/inventory/layouts/${id}`);
      fetchLayouts();
    } catch (err) {
      alert(err.message || 'Ошибка удаления');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-slate-900">Типовые планировки</h3>
          <p className="text-xs text-slate-500">Шаблоны квартир с площадью, комнатностью и чертежами</p>
        </div>

        {user?.role === 'ADMIN' && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 px-4 py-2 text-xs font-bold text-white shadow-md hover:from-blue-700 hover:to-cyan-700 transition cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Добавить планировку</span>
          </button>
        )}
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-56 rounded-2xl bg-white border border-slate-200 animate-pulse" />
          ))}
        </div>
      ) : layouts.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center shadow-xs">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 mb-3 border border-blue-100">
            <Maximize2 className="h-7 w-7" />
          </div>
          <h4 className="text-base font-bold text-slate-900">Планировки пока не добавлены</h4>
          <p className="mt-1 text-xs text-slate-500 max-w-sm">
            Добавьте типовые планировки для быстрой пакетной генерации квартир и отображения в шахматке.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
          {layouts.map((l) => (
            <div key={l.id} className="rounded-2xl bg-white border border-slate-200 p-5 shadow-xs hover:shadow-md transition">
              {l.image_path ? (
                <div className="mb-4 h-40 w-full overflow-hidden rounded-xl bg-slate-100 border border-slate-200">
                  <img src={l.image_path} alt={l.name} className="h-full w-full object-contain p-2" />
                </div>
              ) : (
                <div className="mb-4 flex h-36 w-full items-center justify-center rounded-xl bg-slate-50 border border-dashed border-slate-200 text-slate-400">
                  <ImageIcon className="h-8 w-8" />
                </div>
              )}

              <div className="flex items-center justify-between">
                <span className="rounded-lg bg-blue-50 px-2 py-0.5 text-xs font-bold text-blue-700 border border-blue-200">
                  {l.code}
                </span>
                <span className="text-xs font-bold text-slate-800">
                  {l.rooms === 0 ? 'Студия' : `${l.rooms}-комнатная`}
                </span>
              </div>

              <h4 className="mt-2 text-base font-bold text-slate-900">{l.name}</h4>

              <div className="mt-3 flex items-center justify-between text-xs text-slate-600 border-t border-slate-100 pt-3">
                <span>Площадь: <strong>{(l.area_m2_x100 / 100).toFixed(1)} м²</strong></span>
                <span>Базовая: <strong>{(l.default_price_per_m2_minor / 100).toLocaleString()} {currency}/м²</strong></span>
              </div>

              {user?.role === 'ADMIN' && (
                <div className="mt-3 flex justify-end border-t border-slate-100 pt-2.5">
                  <button
                    onClick={() => handleDelete(l.id)}
                    className="flex items-center gap-1 text-[11px] font-semibold text-rose-500 hover:text-rose-700 transition cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Удалить</span>
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in">
          <div className="relative w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="text-lg font-bold text-slate-900">Новая типовая планировка</h3>
              <button onClick={() => setIsModalOpen(false)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>

            {error && (
              <div className="mt-4 rounded-xl bg-rose-50 p-3 text-xs text-rose-700 border border-rose-200">
                {error}
              </div>
            )}

            <form onSubmit={handleCreate} className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Название *</label>
                  <input
                    type="text"
                    required
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Тип 2A (Евро-двушка)"
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2 text-sm outline-none focus:border-blue-500 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Код типа *</label>
                  <input
                    type="text"
                    required
                    name="code"
                    value={formData.code}
                    onChange={handleChange}
                    placeholder="2A"
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2 text-sm uppercase outline-none focus:border-blue-500 focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Комнат</label>
                  <select
                    name="rooms"
                    value={formData.rooms}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:bg-white"
                  >
                    <option value="1">1 комн.</option>
                    <option value="2">2 комн.</option>
                    <option value="3">3 комн.</option>
                    <option value="4">4 комн.</option>
                    <option value="0">Студия</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Площадь (м²)</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    name="area_m2"
                    value={formData.area_m2}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Цена/м² ({currency})</label>
                  <input
                    type="number"
                    required
                    name="default_price_per_m2"
                    value={formData.default_price_per_m2}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Чертеж / Изображение планировки</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setSelectedFile(e.target.files[0])}
                  className="w-full text-xs text-slate-500 file:mr-3 file:rounded-xl file:border-0 file:bg-blue-50 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-blue-700 hover:file:bg-blue-100"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-xl bg-blue-600 px-5 py-2 text-sm font-bold text-white shadow-md hover:bg-blue-700 transition"
                >
                  {isSubmitting ? 'Сохранение...' : 'Создать'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
