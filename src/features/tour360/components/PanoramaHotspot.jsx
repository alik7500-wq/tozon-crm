import React, { useMemo } from 'react';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { ChevronRight, Info, Home, Navigation, ArrowUpRight, Sparkles } from 'lucide-react';

export function PanoramaHotspot({
  hotspot,
  onClick
}) {
  const {
    id,
    title,
    hotspot_type,
    yaw = 0,
    pitch = 0,
    target_panorama_id,
    entity_id,
    metadata
  } = hotspot;

  // Compute 3D position inside the sphere
  const position = useMemo(() => {
    const radius = 42; // Sphere inner radius
    const phi = THREE.MathUtils.degToRad(90 - pitch);
    const theta = THREE.MathUtils.degToRad(yaw);

    const x = radius * Math.sin(phi) * Math.cos(theta);
    const y = radius * Math.cos(phi);
    const z = radius * Math.sin(phi) * Math.sin(theta);

    return [x, y, z];
  }, [yaw, pitch]);

  const handleClick = (e) => {
    e.stopPropagation();
    onClick(hotspot);
  };

  // Render hotspot based on type
  const renderContent = () => {
    switch (hotspot_type) {
      case 'NAVIGATION':
        return (
          <button
            onClick={handleClick}
            className="group flex flex-col items-center gap-1.5 focus:outline-none cursor-pointer select-none"
          >
            <div className="relative flex items-center justify-center">
              {/* Outer pulsing ring */}
              <span className="absolute h-10 w-10 rounded-full bg-blue-500/30 animate-ping" />
              {/* Core button */}
              <div className="relative flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-white shadow-xl shadow-blue-600/50 border-2 border-white/80 transition transform group-hover:scale-115 group-hover:bg-blue-500">
                <Navigation className="h-4 w-4 transform -rotate-45" />
              </div>
            </div>
            {title && (
              <span className="px-2.5 py-1 rounded-lg bg-slate-950/85 backdrop-blur-md border border-slate-700/80 text-[11px] font-bold text-white shadow-xl whitespace-nowrap transition transform group-hover:translate-y-0.5 group-hover:border-blue-500/80">
                {title}
              </span>
            )}
          </button>
        );

      case 'UNIT':
        return (
          <button
            onClick={handleClick}
            className="group flex flex-col items-center gap-1.5 focus:outline-none cursor-pointer select-none"
          >
            <div className="relative flex items-center justify-center">
              <span className="absolute h-10 w-10 rounded-full bg-emerald-500/30 animate-ping" />
              <div className="relative flex h-9 w-9 items-center justify-center rounded-full bg-emerald-600 text-white shadow-xl shadow-emerald-600/50 border-2 border-white/80 transition transform group-hover:scale-115 group-hover:bg-emerald-500">
                <Home className="h-4 w-4" />
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-lg bg-slate-950/85 backdrop-blur-md border border-emerald-500/60 text-[11px] font-extrabold text-emerald-300 shadow-xl whitespace-nowrap">
              {title || 'Квартира'}
            </span>
          </button>
        );

      case 'INFO':
      default:
        return (
          <button
            onClick={handleClick}
            className="group flex flex-col items-center gap-1.5 focus:outline-none cursor-pointer select-none"
          >
            <div className="relative flex items-center justify-center">
              <span className="absolute h-9 w-9 rounded-full bg-amber-500/30 animate-ping" />
              <div className="relative flex h-8 w-8 items-center justify-center rounded-full bg-amber-500 text-slate-950 shadow-xl shadow-amber-500/50 border-2 border-white/80 transition transform group-hover:scale-115 group-hover:bg-amber-400">
                <Info className="h-4 w-4 font-bold" />
              </div>
            </div>
            {title && (
              <span className="px-2.5 py-1 rounded-lg bg-slate-950/85 backdrop-blur-md border border-slate-700/80 text-[11px] font-bold text-slate-200 shadow-xl whitespace-nowrap group-hover:text-amber-300">
                {title}
              </span>
            )}
          </button>
        );
    }
  };

  return (
    <Html
      position={position}
      center
      distanceFactor={18}
      zIndexRange={[100, 0]}
    >
      {renderContent()}
    </Html>
  );
}
