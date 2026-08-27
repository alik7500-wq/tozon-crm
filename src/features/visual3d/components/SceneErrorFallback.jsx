import React from 'react';
import { Box, RefreshCw, AlertTriangle, ArrowLeft } from 'lucide-react';

export function SceneErrorFallback({
  title = '3D-модель временно недоступна',
  message = 'Для данного жилого комплекса пока не загружена активная 3D-модель фасада или генплана.',
  onRetry,
  onBack
}) {
  return (
    <div className="relative w-full h-[620px] rounded-2xl bg-slate-950 border border-slate-800 flex flex-col items-center justify-center p-8 text-center overflow-hidden">
      {/* Subtle Background Glow */}
      <div className="absolute w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 max-w-md flex flex-col items-center">
        <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-amber-400 mb-4 shadow-xl">
          <Box className="w-8 h-8 opacity-80" />
        </div>

        <h3 className="text-lg font-extrabold text-white tracking-tight mb-2">
          {title}
        </h3>
        <p className="text-xs text-slate-400 leading-relaxed mb-6">
          {message}
        </p>

        <div className="flex items-center gap-3">
          {onRetry && (
            <button
              onClick={onRetry}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition cursor-pointer shadow-lg shadow-blue-600/30"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Повторить</span>
            </button>
          )}
          {onBack && (
            <button
              onClick={onBack}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>К шахматке</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
