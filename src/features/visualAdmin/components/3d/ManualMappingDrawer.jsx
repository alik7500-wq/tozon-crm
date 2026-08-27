import React, { useState, useEffect } from 'react';
import { X, Check, Home, Building2, Layers, Search, AlertCircle } from 'lucide-react';

export function ManualMappingDrawer({
  isOpen,
  meshKey,
  existingEntity,
  projectUnits = [],
  buildings = [],
  onClose,
  onSave
}) {
  const [entityType, setEntityType] = useState(existingEntity?.entity_type || 'UNIT');
  const [selectedUnitId, setSelectedUnitId] = useState(existingEntity?.entity_id ? String(existingEntity.entity_id) : '');
  const [searchUnit, setSearchUnit] = useState('');
  const [selectedBuildingId, setSelectedBuildingId] = useState('');

  useEffect(() => {
    if (existingEntity) {
      setEntityType(existingEntity.entity_type);
      if (existingEntity.entity_type === 'UNIT') {
        setSelectedUnitId(String(existingEntity.entity_id));
      }
    } else {
      setEntityType('UNIT');
      setSelectedUnitId('');
    }
  }, [existingEntity, meshKey]);

  if (!isOpen || !meshKey) return null;

  // Filter units
  const filteredUnits = projectUnits.filter(u => {
    if (searchUnit.trim()) {
      const q = searchUnit.trim().toLowerCase().replace(/^№/, '');
      const num = String(u.unit_number || u.number || '').toLowerCase();
      if (!num.includes(q)) return false;
    }
    if (selectedBuildingId) {
      const bId = u.building_id || u.floors?.sections?.building_id || u.floors?.sections?.buildings?.id;
      if (String(bId) !== String(selectedBuildingId)) return false;
    }
    return true;
  });

  const handleSave = () => {
    if (entityType === 'UNIT' && !selectedUnitId) {
      alert('Пожалуйста, выберите квартиру');
      return;
    }

    const payload = {
      mesh_key: meshKey,
      entity_type: entityType,
      entity_id: entityType === 'UNIT' ? parseInt(selectedUnitId, 10) : parseInt(selectedBuildingId, 10),
      interaction_type: 'SELECT',
      metadata: {}
    };

    onSave(payload);
    onClose();
  };

  return (
    <div className="absolute right-0 top-0 bottom-0 w-84 bg-white border-l border-slate-200 shadow-2xl p-5 flex flex-col z-30 animate-in slide-in-from-right-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
        <div>
          <h4 className="text-sm font-extrabold text-slate-900 leading-tight">
            Привязка меша
          </h4>
          <code className="text-[11px] text-blue-600 font-mono font-bold break-all">
            {meshKey}
          </code>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Form Body */}
      <div className="flex-1 overflow-y-auto space-y-4">
        {/* Entity Type */}
        <div>
          <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
            Тип объекта CRM
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setEntityType('UNIT')}
              className={`flex items-center justify-center gap-1.5 p-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                entityType === 'UNIT'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Home className="h-3.5 w-3.5" />
              <span>Квартира</span>
            </button>

            <button
              type="button"
              onClick={() => setEntityType('BUILDING')}
              className={`flex items-center justify-center gap-1.5 p-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                entityType === 'BUILDING'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Building2 className="h-3.5 w-3.5" />
              <span>Корпус</span>
            </button>
          </div>
        </div>

        {/* Unit Selector */}
        {entityType === 'UNIT' && (
          <div className="space-y-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                Поиск квартиры
              </label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="№ квартиры..."
                  value={searchUnit}
                  onChange={(e) => setSearchUnit(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-8 pr-3 py-1.5 text-xs text-slate-800 outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* Units List (Scrollable) */}
            <div>
              <span className="text-[10px] text-slate-400 font-semibold block mb-1">
                Доступно квартир: {filteredUnits.length}
              </span>
              <div className="max-h-60 overflow-y-auto space-y-1.5 border border-slate-100 rounded-xl p-1 bg-slate-50/50">
                {filteredUnits.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-400">
                    Квартиры не найдены
                  </div>
                ) : (
                  filteredUnits.map((u) => {
                    const isSelected = String(u.id) === String(selectedUnitId);
                    return (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => setSelectedUnitId(String(u.id))}
                        className={`w-full flex items-center justify-between p-2 rounded-lg text-left text-xs transition cursor-pointer ${
                          isSelected
                            ? 'bg-blue-600 text-white font-extrabold shadow-sm'
                            : 'hover:bg-slate-100 text-slate-700 font-medium'
                        }`}
                      >
                        <div>
                          <span>Квартира №{u.unit_number || u.number}</span>
                          <span className={`text-[10px] ml-1.5 ${isSelected ? 'text-blue-100' : 'text-slate-400'}`}>
                            {u.rooms ? `${u.rooms}-комн.` : 'Студия'} • {u.area_m2_x100 ? u.area_m2_x100 / 100 : u.area_m2} м²
                          </span>
                        </div>
                        {isSelected && <Check className="h-3.5 w-3.5 shrink-0" />}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}

        {/* Building Selector */}
        {entityType === 'BUILDING' && (
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
              Выберите корпус
            </label>
            <select
              value={selectedBuildingId}
              onChange={(e) => setSelectedBuildingId(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-blue-500"
            >
              <option value="">Выберите корпус...</option>
              {buildings.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="pt-3 border-t border-slate-100 flex items-center gap-2">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
        >
          Отмена
        </button>

        <button
          type="button"
          onClick={handleSave}
          className="flex-1 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-extrabold shadow-lg shadow-blue-600/30 transition cursor-pointer"
        >
          Сохранить
        </button>
      </div>
    </div>
  );
}
