import React from 'react';
import { Html, useProgress } from '@react-three/drei';

export function TourLoader({ message = 'Загрузка 360° панорамы...' }) {
  const { progress } = useProgress();

  return (
    <Html center>
      <div className="flex flex-col items-center justify-center p-6 bg-slate-950/90 backdrop-blur-md rounded-2xl border border-slate-700/60 shadow-2xl text-white min-w-[240px]">
        <div className="relative mb-3 flex items-center justify-center">
          <div className="w-12 h-12 rounded-full border-4 border-indigo-500/20 border-t-indigo-500 animate-spin" />
          <span className="absolute text-xs font-extrabold text-indigo-400">
            {Math.round(progress || 0)}%
          </span>
        </div>
        <p className="text-xs font-semibold text-slate-300 tracking-wide">{message}</p>
        <div className="w-full bg-slate-800 rounded-full h-1.5 mt-3 overflow-hidden">
          <div
            className="bg-gradient-to-r from-indigo-500 to-purple-500 h-full transition-all duration-200"
            style={{ width: `${progress || 0}%` }}
          />
        </div>
      </div>
    </Html>
  );
}
