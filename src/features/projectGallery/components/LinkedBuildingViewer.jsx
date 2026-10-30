import React, { useEffect, useState } from 'react';
import { api } from '../../../api/client';
import { GalleryLightbox } from './GalleryLightbox';
import { vgMedia } from './vgBuildingModel';

export function LinkedBuildingViewer({ buildingId, onClose }) {
  const [buildings, setBuildings] = useState(null);
  useEffect(() => {
    let cancelled = false;
    api.get('/inventory/projects/4/chessboard').then(response => {
      if (!cancelled) setBuildings(response.data?.chessboard || null);
    }).catch(() => { if (!cancelled) setBuildings(null); });
    return () => { cancelled = true; };
  }, []);
  return <GalleryLightbox images={[vgMedia]} isOpen projectId={4} buildings={buildings} initialBuildingId={buildingId} onClose={onClose} onNavigate={() => {}} />;
}
