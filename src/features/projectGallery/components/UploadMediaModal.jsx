import React, { useState } from 'react';
import { projectGalleryApi } from '../services/projectGalleryApi';
import { X, UploadCloud, CheckCircle2, AlertCircle } from 'lucide-react';

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

export const UploadMediaModal = ({ projectId, isOpen, onClose, onSuccess }) => {
  const [file, setFile] = useState(null);
  const [category, setCategory] = useState('EXTERIOR');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isCover, setIsCover] = useState(false);
  const [sortOrder, setSortOrder] = useState(0);

  const [uploadProgress, setUploadProgress] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    // Check MIME & size (20MB)
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (!validTypes.includes(selected.type)) {
      setError('Поддерживаются только изображения формата JPG, PNG, WebP');
      return;
    }
    if (selected.size > 20 * 1024 * 1024) {
      setError('Максимальный размер файла — 20 МБ');
      return;
    }

    setError(null);
    setFile(selected);
    if (!title) {
      const cleanName = selected.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
      setTitle(cleanName.charAt(0).toUpperCase() + cleanName.slice(1));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setError('Выберите файл для загрузки');
      return;
    }
    if (!title.trim()) {
      setError('Укажите название изображения');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // 1. Get signed upload URL
      const { signedUploadUrl, uploadUrl, storagePath, storage_path } = await projectGalleryApi.getUploadUrl(projectId, file);
      const targetUploadUrl = signedUploadUrl || uploadUrl;
      const targetPath = storagePath || storage_path;

      // 2. Upload file
      await projectGalleryApi.uploadFileToStorage(targetUploadUrl, file, (percent) => {
        setUploadProgress(percent);
      });

      // 3. Create media record
      await projectGalleryApi.createMedia(projectId, {
        category,
        title: title.trim(),
        description: description.trim() || null,
        storage_path: targetPath,
        mime_type: file.type || 'image/jpeg',
        is_cover: isCover,
        sort_order: parseInt(sortOrder, 10) || 0
      });

      onSuccess();
      onClose();
    } catch (err) {
      console.error('Failed to upload media:', err);
      setError(err.response?.data?.message || err.message || 'Ошибка загрузки медиафайла');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <h3 className="text-base font-bold text-slate-900">Загрузить изображение в галерею</h3>
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
          {/* File input / dropzone */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Файл изображения (JPG, PNG, WebP до 20 МБ) *
            </label>
            <div className="relative border-2 border-dashed border-slate-200 hover:border-blue-400 rounded-xl p-5 text-center transition cursor-pointer bg-slate-50/50">
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/jpg"
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                disabled={isSubmitting}
              />
              <UploadCloud className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              {file ? (
                <div>
                  <p className="text-xs font-bold text-blue-600 truncate">{file.name}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {(file.size / (1024 * 1024)).toFixed(2)} МБ
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-xs font-bold text-slate-700">Нажмите для выбора или перетащите файл</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">JPG, PNG или WebP</p>
                </div>
              )}
            </div>
          </div>

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
              placeholder="Например: Главный фасад со стороны улицы"
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-hidden"
              required
              disabled={isSubmitting}
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Описание (необязательно)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Краткое описание ракурса, материалов или окружения"
              rows={2}
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-hidden"
              disabled={isSubmitting}
            />
          </div>

          {/* Sort order & Cover */}
          <div className="grid grid-cols-2 gap-4">
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
            <div className="flex items-center pt-6">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isCover}
                  onChange={(e) => setIsCover(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                  disabled={isSubmitting}
                />
                <span className="text-xs font-semibold text-slate-700">Сделать обложкой проекта</span>
              </label>
            </div>
          </div>

          {/* Progress bar */}
          {isSubmitting && uploadProgress > 0 && (
            <div className="space-y-1 pt-2">
              <div className="flex justify-between text-[11px] font-bold text-slate-600">
                <span>Загрузка файла...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

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
              disabled={isSubmitting || !file}
              className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl transition shadow-sm"
            >
              {isSubmitting ? 'Сохранение...' : 'Загрузить'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
