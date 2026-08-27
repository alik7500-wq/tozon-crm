import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { tour360Api } from '../services/tour360Api';

export function useTour360(projectId, initialTourId = null, initialPanoramaId = null) {
  const [tours, setTours] = useState([]);
  const [activeTourId, setActiveTourId] = useState(initialTourId);
  const [tour, setTour] = useState(null);
  const [panoramas, setPanoramas] = useState([]);
  const [currentPanoramaId, setCurrentPanoramaId] = useState(initialPanoramaId);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const preloadedImagesRef = useRef(new Set());

  // Load list of project tours
  const loadTours = useCallback(async () => {
    if (!projectId) return;
    setIsLoading(true);
    setError(null);
    try {
      const toursList = await tour360Api.getTours(projectId);
      setTours(toursList);

      if (toursList.length === 0) {
        setTour(null);
        setPanoramas([]);
        setCurrentPanoramaId(null);
        setIsLoading(false);
        return;
      }

      // Pick target tour
      let targetTour = null;
      if (initialTourId) {
        targetTour = toursList.find(t => String(t.id) === String(initialTourId));
      }
      if (!targetTour) {
        targetTour = toursList.find(t => t.is_active) || toursList[0];
      }

      setActiveTourId(targetTour.id);

      // Load tour tree
      const fullTour = await tour360Api.getTourById(targetTour.id);
      setTour(fullTour);

      const pans = fullTour.panoramas || [];
      setPanoramas(pans);

      if (pans.length > 0) {
        let activePan = null;
        if (initialPanoramaId) {
          activePan = pans.find(p => String(p.id) === String(initialPanoramaId));
        }
        if (!activePan) {
          activePan = pans.find(p => p.is_entry) || pans[0];
        }
        setCurrentPanoramaId(activePan.id);
      }
    } catch (err) {
      console.error('Failed to load 360 tour:', err);
      setError(err.message || 'Не удалось загрузить 360°-тур');
    } finally {
      setIsLoading(false);
    }
  }, [projectId, initialTourId, initialPanoramaId]);

  useEffect(() => {
    loadTours();
  }, [loadTours]);

  // Current active panorama object
  const currentPanorama = useMemo(() => {
    return panoramas.find(p => String(p.id) === String(currentPanoramaId)) || null;
  }, [panoramas, currentPanoramaId]);

  // Hotspots for current panorama
  const hotspots = useMemo(() => {
    return currentPanorama?.hotspots || [];
  }, [currentPanorama]);

  // Navigate to another panorama with smooth transition and preloading
  const navigateToPanorama = useCallback(async (targetPanoramaId) => {
    if (!targetPanoramaId || String(targetPanoramaId) === String(currentPanoramaId)) return;

    const targetPan = panoramas.find(p => String(p.id) === String(targetPanoramaId));
    if (!targetPan) {
      console.warn(`Target panorama ${targetPanoramaId} not found in current tour`);
      return;
    }

    setIsTransitioning(true);

    // Preload image if not cached
    if (targetPan.panorama_url && !preloadedImagesRef.current.has(targetPan.panorama_url)) {
      const img = new Image();
      img.src = targetPan.panorama_url;
      preloadedImagesRef.current.add(targetPan.panorama_url);
    }

    setTimeout(() => {
      setCurrentPanoramaId(targetPan.id);
      setTimeout(() => {
        setIsTransitioning(false);
      }, 150);
    }, 250);
  }, [panoramas, currentPanoramaId]);

  // Select another tour
  const selectTour = useCallback(async (tourId) => {
    setIsLoading(true);
    try {
      setActiveTourId(tourId);
      const fullTour = await tour360Api.getTourById(tourId);
      setTour(fullTour);

      const pans = fullTour.panoramas || [];
      setPanoramas(pans);

      if (pans.length > 0) {
        const entryPan = pans.find(p => p.is_entry) || pans[0];
        setCurrentPanoramaId(entryPan.id);
      }
    } catch (err) {
      console.error(`Failed to switch tour ${tourId}:`, err);
      setError(err.message || 'Ошибка переключения тура');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Preload immediate neighbor panoramas linked by NAVIGATION hotspots
  useEffect(() => {
    if (!hotspots || hotspots.length === 0) return;

    hotspots.forEach(h => {
      if (h.hotspot_type === 'NAVIGATION' && h.target_panorama_id) {
        const targetPan = panoramas.find(p => String(p.id) === String(h.target_panorama_id));
        if (targetPan?.panorama_url && !preloadedImagesRef.current.has(targetPan.panorama_url)) {
          const img = new Image();
          img.src = targetPan.panorama_url;
          preloadedImagesRef.current.add(targetPan.panorama_url);
        }
      }
    });
  }, [hotspots, panoramas]);

  return {
    tours,
    tour,
    activeTourId,
    panoramas,
    currentPanorama,
    currentPanoramaId,
    hotspots,
    isTransitioning,
    isLoading,
    error,
    navigateToPanorama,
    selectTour,
    reload: loadTours
  };
}
