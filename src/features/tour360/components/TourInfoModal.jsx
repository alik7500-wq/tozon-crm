import React from 'react';
import { X, Info, Sparkles } from 'lucide-react';

export function TourInfoModal({
  hotspot,
  onClose
}) {
  if (!hotspot) return null;

  const { title, metadata } = hotspot;
  const description = typeof metadata === 'string' ? metadata : metadata?.description;

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-sm rounded-2xl bg-slate-950/95 backdrop-blur-md border border-slate-700/80 p-5 shadow-2xl text-white">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400">
              <Info className="h-4 w-4" />
            </span>
            <h4 className="text-sm font-extrabold tracking-tight text-white">
              {title || 'Информация'}
            </h4>
          </div>

          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
          {description ? (
            <p>{description}</p>
          ) : (
            <p className="text-slate-400 italic">Описание отсутствует.</p>
          )}

          {metadata?.features && Array.isArray(metadata.features) && (
            <div className="pt-2 border-t border-slate-800/80 space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Особенности:</span>
              <ul className="list-disc list-inside space-y-0.5 text-slate-300">
                {metadata.features.map((f, idx) => (
                  <li key={idx}>{String(f)}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
