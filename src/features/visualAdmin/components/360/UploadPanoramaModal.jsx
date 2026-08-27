import React, { useState } from 'react';
import { X, Upload, Image as ImageIcon, AlertCircle, AlertTriangle, Loader2 } from 'lucide-react';
import { visualAdminApi } from '../../services/visualAdminApi';

export function UploadPanoramaModal({
  projectId,
  tourId,
  isOpen,
  onClose,
  onPanoramaUploaded
}) {
  const [name, setName] = useState('');
  const [file, setFile] = useState(null);
  const [aspectRatioWarning, setAspectRatioWarning] = useState('');
  const [imagePreview, setImagePreview] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    if (!selected.type.startsWith('image/')) {
      setError('Поддерживаются только графические файлы (JPEG, WebP, PNG)');
      return;
    }

    setError('');
    setFile(selected);
    if (!name) {
      setName(selected.name.replace(/\.[^/.]+$/, ''));
    }

    // Inspect image dimensions and check 2:1 aspect ratio
    const objectUrl = URL.createObjectURL(selected);
    setImagePreview(objectUrl);

    const img = new Image();
    img.onload = () => {
      const ratio = img.width / img.height;
      if (ratio < 1.85 || ratio > 2.15) {
        setAspectRatioWarning(
          `Соотношение сторон (${img.width}x${img.height}, ratio: ${ratio.toFixed(2)}) отличается от стандартного 2:1. Рекомендуется использовать 4096×2048 или 8192×4096.`
        );
      } else {
        setAspectRatioWarning('');
      }
    };
    img.src = objectUrl;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file || !name.trim()) {
      setError('Заполните название и выберите файл');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setError('');

    try {
      // 1. Get presigned upload URL from backend
      const uploadData = await visualAdminApi.getPanoramaUploadUrl(projectId, file.name, file.size);

      // 2. Upload file directly with progress
      await visualAdminApi.uploadFileToSignedUrl(uploadData.signedUploadUrl, file, (progress) => {
        setUploadProgress(progress);
      });

      // 3. Register panorama in DB
      const panoData = {
        name: name.trim(),
        storage_path: uploadData.storagePath,
        file_size_bytes: file.size,
        initial_yaw: 0,
        initial_pitch: 0,
        initial_fov: 75
      };

      const created = await visualAdminApi.createPanorama(tourId, panoData);
      onPanoramaUploaded(created);
      onClose();
    } catch (err) {
      console.error('Failed to upload panorama:', err);
      setError(err.message || 'Ошибка загрузки панорамы');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
      <div className="relative w-full max-w-lg rounded-3xl bg-white border border-slate-200 shadow-2xl p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-purple-50 text-purple-600 font-bold">
              <ImageIcon className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
                Добавить панораму 360°
              </h3>
              <p className="text-xs text-slate-500">
                Загрузка эквидистантного снимка помещения
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={isUploading}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {aspectRatioWarning && (
          <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-medium">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
            <span>{aspectRatioWarning}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Название комнаты / локации *
            </label>
            <input
              type="text"
              required
              disabled={isUploading}
              placeholder="например: Гостиная и кухня-студия"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-medium text-slate-800 outline-none focus:border-purple-500 focus:bg-white"
            />
          </div>

          {/* Panorama Image Upload Box */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Файл панорамы 360° (Equirectangular 2:1) *
            </label>
            <div className="relative rounded-2xl border-2 border-dashed border-slate-200 hover:border-purple-400 bg-slate-50/50 p-5 flex flex-col items-center justify-center text-center transition cursor-pointer group overflow-hidden">
              <input
                type="file"
                accept="image/jpeg,image/webp,image/png"
                disabled={isUploading}
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />

              {imagePreview ? (
                <div className="space-y-2 w-full">
                  <img
                    src={imagePreview}
                    alt="Panorama preview"
                    className="max-h-32 w-full object-cover rounded-xl border border-slate-200 shadow-xs"
                  />
                  <span className="text-xs font-bold text-purple-700 block truncate">
                    {file?.name} ({(file?.size / (1024 * 1024)).toFixed(2)} МБ)
                  </span>
                </div>
              ) : (
                <div>
                  <div className="h-10 w-10 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mx-auto mb-2 group-hover:scale-110 transition">
                    <Upload className="h-5 w-5" />
                  </div>
                  <span className="text-xs font-bold text-slate-700 block">
                    Перетащите изображение панорамы сюда
                  </span>
                  <span className="text-[10px] text-slate-400">
                    Формат 2:1 (JPEG или WebP, до 50 МБ)
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Progress Bar */}
          {isUploading && (
            <div className="space-y-1.5 p-3 rounded-xl bg-purple-50 border border-purple-100">
              <div className="flex items-center justify-between text-xs font-bold text-purple-900">
                <span>Загрузка панорамы на сервер...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full bg-purple-200 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-purple-600 h-full transition-all duration-150"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isUploading}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
            >
              Отмена
            </button>

            <button
              type="submit"
              disabled={isUploading || !file}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-xs font-extrabold shadow-lg shadow-purple-600/30 transition cursor-pointer"
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Загрузка...</span>
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  <span>Загрузить панораму</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
