import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ArrowLeft,
  Wand2,
  Check,
  X,
  Search,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Home,
  Building2,
  Save,
  Loader2,
  Box,
  Layers,
  Sparkles
} from 'lucide-react';
import { visualAdminApi } from '../../services/visualAdminApi';
import { SceneCanvas } from '../../../visual3d/components/SceneCanvas';
import { ManualMappingDrawer } from './ManualMappingDrawer';
import { api } from '../../../../api/client';

export function MeshMappingManager({
  scene,
  projectId,
  buildings = [],
  onBack
}) {
  const [entities, setEntities] = useState([]);
  const [projectUnits, setProjectUnits] = useState([]);
  const [scannedMeshes, setScannedMeshes] = useState([]);
  const [selectedMeshKey, setSelectedMeshKey] = useState(null);
  const [hoveredMeshKey, setHoveredMeshKey] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [searchMesh, setSearchMesh] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // ALL, MAPPED, UNMAPPED
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Auto-mapping state
  const [autoProposals, setAutoProposals] = useState([]);
  const [isAutoMappingOpen, setIsAutoMappingOpen] = useState(false);

  // 1. Fetch initial entities and project units
  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const [ents, unitsRes] = await Promise.all([
          visualAdminApi.getSceneEntities(scene.id),
          api.get(`/inventory/projects/${projectId}/chessboard`)
        ]);

        setEntities(ents);

        // Flatten units from chessboard
        const uList = [];
        const chessboard = unitsRes.data?.chessboard || [];
        chessboard.forEach(b => {
          (b.sections || []).forEach(s => {
            (s.floors || []).forEach(f => {
              (f.units || []).forEach(u => {
                uList.push({
                  ...u,
                  building_name: b.name,
                  floor_number: f.floor_number
                });
              });
            });
          });
        });
        setProjectUnits(uList);
      } catch (err) {
        console.error('Failed to load mesh mapping data:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [scene.id, projectId]);

  // Fast map: mesh_key -> entity
  const entitiesMap = useMemo(() => {
    const map = new Map();
    (entities || []).forEach(e => {
      if (e.mesh_key) {
        map.set(e.mesh_key, e);
      }
    });
    return map;
  }, [entities]);

  // 2. Scan mesh names when GLB is loaded (fallback test list if not yet loaded in canvas)
  const handleScanMeshNames = useCallback((names) => {
    if (Array.isArray(names) && names.length > 0) {
      setScannedMeshes(names);
    }
  }, []);

  // Merge scanned meshes with existing mapped entities
  const allMeshKeys = useMemo(() => {
    const set = new Set();
    scannedMeshes.forEach(m => set.add(m));
    entities.forEach(e => {
      if (e.mesh_key) set.add(e.mesh_key);
    });
    // Fallback: If no meshes scanned yet, seed from existing entities
    if (set.size === 0) {
      entities.forEach(e => set.add(e.mesh_key));
    }
    return Array.from(set);
  }, [scannedMeshes, entities]);

  // 3. Auto-Mapping Engine: Pattern matching
  const runAutoMapping = useCallback(() => {
    const proposals = [];
    const unitNumberMap = new Map();
    projectUnits.forEach(u => {
      const numStr = String(u.unit_number || u.number || '').trim();
      unitNumberMap.set(numStr, u);
    });

    allMeshKeys.forEach(meshKey => {
      // If already mapped, skip
      if (entitiesMap.has(meshKey)) return;

      let matchedUnit = null;
      let confidence = 'NONE'; // HIGH, MEDIUM, NONE

      // Pattern 1: APT_A_1_02_001 -> matches unit #1
      // Pattern 2: Unit_91 -> matches unit #91
      // Pattern 3: APT_91 -> matches unit #91
      const aptMatch = meshKey.match(/(?:APT|Unit|Кв|Flat)[_\s-]*.*?(\d{1,4})$/i) || meshKey.match(/(\d{1,4})$/);
      if (aptMatch && aptMatch[1]) {
        const rawNum = parseInt(aptMatch[1], 10);
        const unit = unitNumberMap.get(String(rawNum));
        if (unit) {
          matchedUnit = unit;
          confidence = 'HIGH';
        }
      }

      if (matchedUnit) {
        proposals.push({
          mesh_key: meshKey,
          entity_type: 'UNIT',
          entity_id: matchedUnit.id,
          unit: matchedUnit,
          confidence,
          selected: true
        });
      }
    });

    setAutoProposals(proposals);
    setIsAutoMappingOpen(true);
  }, [allMeshKeys, entitiesMap, projectUnits]);

  // 4. Apply Auto-Mapping Proposals
  const applyAutoProposals = async () => {
    const toApply = autoProposals.filter(p => p.selected);
    if (toApply.length === 0) return;

    setIsSaving(true);
    try {
      const newEntities = toApply.map(p => ({
        mesh_key: p.mesh_key,
        entity_type: p.entity_type,
        entity_id: p.entity_id,
        interaction_type: 'SELECT',
        metadata: {}
      }));

      const saved = await visualAdminApi.saveBatchEntities(scene.id, newEntities);
      setEntities(saved);
      setIsAutoMappingOpen(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      alert(err.message || 'Ошибка сохранения авто-привязок');
    } finally {
      setIsSaving(false);
    }
  };

  // 5. Manual Mapping Save
  const handleSaveManual = async (payload) => {
    setIsSaving(true);
    try {
      const saved = await visualAdminApi.saveBatchEntities(scene.id, [payload]);
      setEntities(saved);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      alert(err.message || 'Ошибка сохранения привязки меша');
    } finally {
      setIsSaving(false);
    }
  };

  // 6. Delete Entity Mapping
  const handleDeleteMapping = async (meshKey) => {
    const ent = entitiesMap.get(meshKey);
    if (!ent) return;
    try {
      await visualAdminApi.deleteEntity(ent.id);
      setEntities(prev => prev.filter(e => e.id !== ent.id));
    } catch (err) {
      alert(err.message || 'Ошибка удаления привязки');
    }
  };

  // Filtered mesh list
  const filteredMeshes = allMeshKeys.filter(meshKey => {
    const isMapped = entitiesMap.has(meshKey);
    if (statusFilter === 'MAPPED' && !isMapped) return false;
    if (statusFilter === 'UNMAPPED' && isMapped) return false;

    if (searchMesh.trim()) {
      const q = searchMesh.trim().toLowerCase();
      const ent = entitiesMap.get(meshKey);
      const unitNum = String(ent?.unit?.number || ent?.unit?.unit_number || '');
      if (!meshKey.toLowerCase().includes(q) && !unitNum.includes(q)) {
        return false;
      }
    }
    return true;
  });

  const mappedCount = entities.length;
  const totalCount = allMeshKeys.length;

  return (
    <div className="space-y-4">
      {/* Top Breadcrumb & Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition shadow-2xs cursor-pointer"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
                Привязка мешей: {scene.name}
              </h3>
              <span className="px-2 py-0.5 rounded-md text-xs font-black bg-blue-50 text-blue-700 border border-blue-200">
                {mappedCount} / {totalCount} привязано
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Связывание 3D-объектов геометрии с квартирами и корпусами CRM
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={runAutoMapping}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/30 transition cursor-pointer"
          >
            <Wand2 className="h-4 w-4" />
            <span>Авто-привязка</span>
          </button>

          {saveSuccess && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-300 text-xs font-bold animate-in fade-in">
              <CheckCircle2 className="h-4 w-4" />
              <span>Сохранено!</span>
            </div>
          )}
        </div>
      </div>

      {/* Auto-Mapping Proposals Banner */}
      {isAutoMappingOpen && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-50 via-indigo-50 to-blue-50 border border-indigo-200 shadow-sm space-y-3 animate-in slide-in-from-top-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-indigo-600" />
              <h4 className="text-sm font-extrabold text-slate-900">
                Предложения авто-привязки ({autoProposals.length} найдено)
              </h4>
            </div>
            <button
              onClick={() => setIsAutoMappingOpen(false)}
              className="text-slate-400 hover:text-slate-600 p-1"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="max-h-48 overflow-y-auto space-y-1.5">
            {autoProposals.map((prop, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-2 rounded-xl bg-white border border-indigo-100 text-xs"
              >
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={prop.selected}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setAutoProposals(prev => prev.map((p, i) => i === idx ? { ...p, selected: checked } : p));
                    }}
                    className="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                  <code className="text-indigo-900 font-mono font-bold">{prop.mesh_key}</code>
                  <span className="text-slate-400">→</span>
                  <span className="font-extrabold text-emerald-700">
                    Квартира №{prop.unit.unit_number || prop.unit.number}
                  </span>
                  <span className="text-slate-400 text-[11px]">
                    ({prop.unit.rooms}-комн., {prop.unit.area_m2_x100 ? prop.unit.area_m2_x100 / 100 : prop.unit.area_m2} м²)
                  </span>
                </div>

                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  ✓ Уверенное совпадение
                </span>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-indigo-100">
            <button
              onClick={() => setIsAutoMappingOpen(false)}
              className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-white transition cursor-pointer"
            >
              Отклонить
            </button>
            <button
              onClick={applyAutoProposals}
              disabled={isSaving || autoProposals.filter(p => p.selected).length === 0}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md transition cursor-pointer"
            >
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              <span>Применить выбранные ({autoProposals.filter(p => p.selected).length})</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Split Layout: Mesh Table on Left (40%), 3D Viewport on Right (60%) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column: Mesh Table */}
        <div className="lg:col-span-5 rounded-2xl bg-white border border-slate-200 p-4 shadow-2xs space-y-3 flex flex-col h-[640px]">
          {/* Filter Bar */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Поиск меша или квартиры..."
                value={searchMesh}
                onChange={(e) => setSearchMesh(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-8 pr-3 py-1.5 text-xs text-slate-800 outline-none focus:border-blue-500"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-bold text-slate-700 outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="ALL">Все ({allMeshKeys.length})</option>
              <option value="MAPPED">Связанные ({mappedCount})</option>
              <option value="UNMAPPED">Не связанные ({totalCount - mappedCount})</option>
            </select>
          </div>

          {/* Table */}
          <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
            {filteredMeshes.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                Меши не найдены
              </div>
            ) : (
              filteredMeshes.map((meshKey) => {
                const entity = entitiesMap.get(meshKey);
                const isMapped = !!entity;
                const isSelected = meshKey === selectedMeshKey;

                return (
                  <div
                    key={meshKey}
                    onClick={() => {
                      setSelectedMeshKey(meshKey);
                      setIsDrawerOpen(true);
                    }}
                    className={`flex items-center justify-between p-2.5 rounded-xl border transition cursor-pointer ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50/70 shadow-xs'
                        : 'border-slate-100 hover:border-slate-300 bg-slate-50/50'
                    }`}
                  >
                    <div className="flex items-center gap-2 overflow-hidden">
                      <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                        isMapped ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'
                      }`}>
                        {entity?.entity_type === 'BUILDING' ? (
                          <Building2 className="h-3.5 w-3.5" />
                        ) : (
                          <Home className="h-3.5 w-3.5" />
                        )}
                      </div>
                      <div className="overflow-hidden">
                        <code className="text-xs font-mono font-bold text-slate-900 block truncate">
                          {meshKey}
                        </code>
                        <span className="text-[10px] text-slate-500 block truncate">
                          {isMapped
                            ? (entity.unit ? `Кв. №${entity.unit.number} • ${entity.unit.rooms}-комн.` : 'Привязан')
                            : 'Не привязан'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {isMapped ? (
                        <>
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-300">
                            Связан
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteMapping(meshKey);
                            }}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded transition"
                            title="Отвязать"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </>
                      ) : (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-500">
                          Пусто
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: 3D Viewport with Selection Overlay */}
        <div className="lg:col-span-7 relative h-[640px] rounded-2xl bg-slate-950 border border-slate-800 shadow-2xl overflow-hidden">
          {scene.model_url && (
            <SceneCanvas
              modelUrl={scene.model_url}
              cameraConfig={scene.camera_config}
              environmentConfig={scene.environment_config}
              entitiesMap={entitiesMap}
              onHoverMesh={(mesh) => setHoveredMeshKey(mesh)}
              onSelectMesh={(mesh) => {
                setSelectedMeshKey(mesh);
                setIsDrawerOpen(true);
              }}
              hoveredMeshKey={hoveredMeshKey}
              selectedMeshKey={selectedMeshKey}
            />
          )}

          {/* Selected Mesh Hint Banner */}
          <div className="absolute top-4 left-4 z-20 pointer-events-none bg-slate-900/90 backdrop-blur-md border border-slate-700/80 px-3.5 py-2 rounded-xl text-white text-xs font-bold shadow-lg">
            <span>Кликните по мешу здания для привязки к CRM</span>
          </div>

          {/* Slide-out Mapping Drawer */}
          <ManualMappingDrawer
            isOpen={isDrawerOpen}
            meshKey={selectedMeshKey}
            existingEntity={entitiesMap.get(selectedMeshKey)}
            projectUnits={projectUnits}
            buildings={buildings}
            onClose={() => setIsDrawerOpen(false)}
            onSave={handleSaveManual}
          />
        </div>
      </div>
    </div>
  );
}
