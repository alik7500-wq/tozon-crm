import React, { useState } from 'react';
import { projectGalleryApi } from '../services/projectGalleryApi';
import { X, AlertCircle } from 'lucide-react';

const CATEGORIES = [
  { key: 'EXTERIOR', label: 'Фасады' },
  { key: 'COURTYARD', label: 'Двор и благоустройство' },
  { key: 'MASTERPLAN', label: 'Генплан / Вид сверху' },
  { key: 'ENTRANCE', label: 'Входная группа' },
  { key: 'INTERIOR', label: 'Интерьеры' },
  { key: 'FLOOR_PLAN', label: 'Планировки' },
  { key: 'COMMERCIAL', label: 'Коммерция' },
  { key: 'CONSTRUCTION', label: 'Ход строительства' },
  { key: 'OTHER', label: 'Другое' }
];

export const EditMediaModal = ({ media, isOpen, onClose, onSuccess }) => {
  if (!isOpen || !media) return null;

  const [category, setCategory] = useState(media.category || 'EXTERIOR');
  const [title, setTitle] = useState(media.title || '');
  const [description, setDescription] = useState(media.description || '');
  const [sortOrder, setSortOrder] = useState(media.sort_order || 0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Укажите название');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await projectGalleryApi.updateMedia(media.id, {
        category,
        title: title.trim(),
        description: description.trim() || null,
        sort_order: parseInt(sortOrder, 10) || 0
      });

      onSuccess();
      onClose();
    } catch (err) {
      console.error('Failed to update media:', err);
      setError(err.response?.data?.message || err.message || 'Ошибка обновления данных');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <h3 className="text-base font-bold text-slate-900">Редактировать материал</h3>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {/* Category */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Категория *</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-hidden"
              disabled={isSubmitting}
            >
              {CATEGORIES.map((c) => (
                <option key={c.key} value={c.key}>{c.label}</option>
              ))}
            </select>
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Название *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-hidden"
              required
              disabled={isSubmitting}
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Описание</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-hidden"
              disabled={isSubmitting}
            />
          </div>

          {/* Sort order */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Порядок сортировки</label>
            <input
              type="number"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-hidden"
              disabled={isSubmitting}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
              disabled={isSubmitting}
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl transition shadow-sm"
            >
              {isSubmitting ? 'Сохранение...' : 'Сохранить изменения'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
