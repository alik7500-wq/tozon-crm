import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { visual3dApi } from '../services/visual3dApi';
import { supabase } from '../../../api/supabaseClient';

export function useScene3D(projectId) {
  const [scenes, setScenes] = useState([]);
  const [activeSceneId, setActiveSceneId] = useState(null);
  const [activeScene, setActiveScene] = useState(null);
  const [entities, setEntities] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters and Search
  const [statusFilter, setStatusFilter] = useState('');
  const [roomsFilter, setRoomsFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch scenes list and select target scene
  const loadScenes = useCallback(async (preferredSceneId = null) => {
    if (!projectId) return;
    setIsLoading(true);
    setError(null);
    try {
      const scenesList = await visual3dApi.getScenes(projectId);
      setScenes(scenesList);

      if (scenesList.length === 0) {
        setActiveScene(null);
        setActiveSceneId(null);
        setEntities([]);
        setIsLoading(false);
        return;
      }

      let target = scenesList.find(s => s.id === preferredSceneId);
      if (!target) target = scenesList.find(s => Boolean(s.is_active));
      if (!target) target = scenesList[0];

      setActiveSceneId(target.id);
      setActiveScene(target);

      // Batch load mapped entities with live CRM unit metadata in ONE request
      const entitiesList = await visual3dApi.getSceneEntities(target.id);
      setEntities(entitiesList);
    } catch (err) {
      console.error('Failed to load 3D scenes:', err);
      setError(err.message || 'Не удалось загрузить 3D-сцены');
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  // Switch scene manually
  const selectScene = useCallback(async (sceneId) => {
    const target = scenes.find(s => s.id === sceneId);
    if (!target) return;

    setActiveSceneId(sceneId);
    setActiveScene(target);
    setIsLoading(true);
    try {
      const entitiesList = await visual3dApi.getSceneEntities(sceneId);
      setEntities(entitiesList);
    } catch (err) {
      console.error(`Failed to load entities for scene ${sceneId}:`, err);
    } finally {
      setIsLoading(false);
    }
  }, [scenes]);

  // Initial load
  useEffect(() => {
    loadScenes();
  }, [loadScenes]);

  // Reload current scene's entities (e.g. after deal / reservation creation)
  const refreshEntities = useCallback(async () => {
    if (!activeSceneId) return;
    try {
      const entitiesList = await visual3dApi.getSceneEntities(activeSceneId);
      setEntities(entitiesList);
    } catch (err) {
      console.warn('Failed to refresh scene entities:', err);
    }
  }, [activeSceneId]);

  // -------------------------------------------------------------
  // SUPABASE REALTIME INTEGRATION (Scoped to current project units)
  // -------------------------------------------------------------
  useEffect(() => {
    if (!projectId || !activeSceneId) return;

    const channelName = `realtime-3d-units-${projectId}-${activeSceneId}`;
    
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'units',
        },
        (payload) => {
          const updatedUnit = payload.new;
          if (!updatedUnit) return;

          // Check if this updated unit belongs to our mapped entities
          setEntities((prevEntities) => {
            let changed = false;
            const nextEntities = prevEntities.map((ent) => {
              if (ent.entity_type === 'UNIT' && ent.entity_id === updatedUnit.id) {
                changed = true;
                return {
                  ...ent,
                  unit: {
                    ...(ent.unit || {}),
                    status: updatedUnit.status,
                    total_price_minor: updatedUnit.manual_total_price_minor || updatedUnit.price_per_m2_minor * (updatedUnit.area_m2_x100 / 100),
                    price_per_m2_minor: updatedUnit.price_per_m2_minor,
                    block_reason: updatedUnit.block_reason
                  }
                };
              }
              return ent;
            });

            return changed ? nextEntities : prevEntities;
          });
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          // Connected cleanly
        }
      });

    // Cleanup subscription cleanly on unmount or scene change
    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId, activeSceneId]);

  // -------------------------------------------------------------
  // Fast Entity Lookups & Mappings
  // -------------------------------------------------------------
  const entitiesMap = useMemo(() => {
    const map = new Map();
    (entities || []).forEach(e => {
      if (e.mesh_key) {
        map.set(e.mesh_key, e);
      }
    });
    return map;
  }, [entities]);

  const unitIdToMeshKeyMap = useMemo(() => {
    const map = new Map();
    (entities || []).forEach(e => {
      if (e.entity_type === 'UNIT' && e.entity_id) {
        map.set(String(e.entity_id), e.mesh_key);
      }
    });
    return map;
  }, [entities]);

  const unitNumberToMeshKeyMap = useMemo(() => {
    const map = new Map();
    (entities || []).forEach(e => {
      if (e.unit?.number || e.unit?.unit_number) {
        const num = String(e.unit.number || e.unit.unit_number).trim();
        map.set(num, e.mesh_key);
      }
    });
    return map;
  }, [entities]);

  // -------------------------------------------------------------
  // Filter Match Checker
  // -------------------------------------------------------------
  const isMeshFilteredOut = useCallback((meshKey) => {
    const entity = entitiesMap.get(meshKey);
    if (!entity || entity.entity_type !== 'UNIT' || !entity.unit) {
      return false;
    }

    const unit = entity.unit;

    // Status filter
    if (statusFilter && unit.status !== statusFilter) {
      return true;
    }

    // Rooms filter
    if (roomsFilter !== '') {
      const roomVal = parseInt(roomsFilter, 10);
      if (roomVal === 4) {
        if ((unit.rooms || 0) < 4) return true;
      } else {
        if ((unit.rooms || 0) !== roomVal) return true;
      }
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase().replace(/^№/, '');
      const unitNum = String(unit.number || unit.unit_number || '').toLowerCase();
      if (!unitNum.includes(q)) {
        return true;
      }
    }

    return false;
  }, [entitiesMap, statusFilter, roomsFilter, searchQuery]);

  return {
    scenes,
    activeScene,
    activeSceneId,
    entities,
    entitiesMap,
    unitIdToMeshKeyMap,
    unitNumberToMeshKeyMap,
    isLoading,
    error,
    statusFilter,
    setStatusFilter,
    roomsFilter,
    setRoomsFilter,
    searchQuery,
    setSearchQuery,
    isMeshFilteredOut,
    selectScene,
    refreshEntities,
    reload: loadScenes
  };
}
