import * as THREE from 'three';

export const STATUS_THEME = {
  AVAILABLE: {
    label: 'Свободна',
    colorHex: '#10b981', // Emerald 500
    hoverEmissive: '#34d399', // Emerald 400
    badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    dotClass: 'bg-emerald-400',
    threeColor: new THREE.Color('#10b981'),
  },
  RESERVED: {
    label: 'В брони',
    colorHex: '#f59e0b', // Amber 500
    hoverEmissive: '#fbbf24', // Amber 400
    badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    dotClass: 'bg-amber-400',
    threeColor: new THREE.Color('#f59e0b'),
  },
  SOLD: {
    label: 'Продана',
    colorHex: '#f43f5e', // Rose 500
    hoverEmissive: '#fb7185', // Rose 400
    badgeClass: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
    dotClass: 'bg-rose-400',
    threeColor: new THREE.Color('#f43f5e'),
  },
  BLOCKED: {
    label: 'Заблокирована',
    colorHex: '#64748b', // Slate 500
    hoverEmissive: '#94a3b8', // Slate 400
    badgeClass: 'bg-slate-500/20 text-slate-300 border-slate-500/40',
    dotClass: 'bg-slate-400',
    threeColor: new THREE.Color('#64748b'),
  },
  UNAVAILABLE: {
    label: 'Недоступна',
    colorHex: '#475569', // Slate 600
    hoverEmissive: '#64748b',
    badgeClass: 'bg-slate-600/20 text-slate-400 border-slate-600/40',
    dotClass: 'bg-slate-500',
    threeColor: new THREE.Color('#475569'),
  }
};

export const DEFAULT_STATUS_THEME = STATUS_THEME.AVAILABLE;

export function getStatusTheme(status) {
  if (!status) return DEFAULT_STATUS_THEME;
  return STATUS_THEME[status.toUpperCase()] || DEFAULT_STATUS_THEME;
}

// Colors for 3D selection / dimming
export const SELECTION_COLOR = new THREE.Color('#3b82f6'); // Vibrant Blue
export const DIMMED_COLOR = new THREE.Color('#1e293b'); // Dark Slate for filtered out meshes
