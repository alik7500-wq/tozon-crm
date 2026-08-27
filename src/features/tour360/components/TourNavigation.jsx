import React from 'react';
import { Compass, Image as ImageIcon, ChevronRight } from 'lucide-react';

export function TourNavigation({
  panoramas = [],
  currentPanoramaId,
  onSelectPanorama
}) {
  if (!panoramas || panoramas.length <= 1) return null;

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 max-w-[90%] overflow-x-auto no-scrollbar pointer-events-auto">
      <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-slate-950/85 backdrop-blur-md border border-slate-700/80 shadow-2xl">
        {panoramas.map((pan) => {
          const isActive = String(pan.id) === String(currentPanoramaId);
          return (
            <button
              key={pan.id}
              onClick={() => onSelectPanorama(pan.id)}
              className={`group flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                  : 'bg-slate-900/80 text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Compass className={`h-3.5 w-3.5 ${isActive ? 'text-white' : 'text-purple-400'}`} />
              <span>{pan.title || `Панорама #${pan.id}`}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
