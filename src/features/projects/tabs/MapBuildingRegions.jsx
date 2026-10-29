import React from 'react';

const reviewedMap = 'https://res.cloudinary.com/r3pnvm9s/image/upload/v1787392389/tozon-crm/euh4vu4ocbgschzszw3p.png';
// Reviewed roof outlines on the original 792 × 709 genplan.
const outlines = {
  'Блок А': [[544, 332], [580, 300], [640, 368], [604, 400]],
  'Блок Б': [[604, 400], [684, 333], [730, 383], [642, 453]],
  'Блок В': [[75, 99], [116, 68], [178, 131], [130, 170]],
  'Блок Г': [[150, 98], [215, 48], [251, 83], [182, 136]]
};

export function getBuildingOutline(imagePath, label) {
  if (imagePath !== reviewedMap || !outlines[label]) return null;
  return outlines[label].map(([x, y]) => `${x / 792 * 100},${y / 709 * 100}`).join(' ');
}

export function MapBuildingRegions({ imagePath, hotspots, activeIndex, selectedIndex, onHover, onSelect }) {
  return <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full pointer-events-none" aria-label="Корпуса на генплане">
    {hotspots.map((hotspot, index) => {
      const points = getBuildingOutline(imagePath, hotspot.label);
      if (!points) return null;
      const active = activeIndex === index;
      return <polygon key={hotspot.id ?? index} points={points} role="button" tabIndex={0}
        aria-label={`Выделить ${hotspot.label}`} aria-pressed={selectedIndex === index}
        onMouseEnter={() => onHover(index)} onMouseLeave={() => onHover(null)}
        onFocus={() => onHover(index)} onBlur={() => onHover(null)}
        onClick={() => onSelect(index)} onKeyDown={event => {
          if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onSelect(index); }
          if (event.key === 'Escape') { onHover(null); onSelect(null); }
        }}
        fill={active ? 'rgba(59,130,246,0.45)' : 'transparent'}
        stroke={active ? '#fbbf24' : 'transparent'} strokeWidth="3" vectorEffect="non-scaling-stroke"
        className="pointer-events-auto cursor-pointer transition-colors duration-150 focus:outline-none" />;
    })}
  </svg>;
}
