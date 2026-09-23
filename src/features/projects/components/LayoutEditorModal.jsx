import React, { useState, useEffect, useRef } from 'react';
import { api } from '../../../api/client';
import { useI18n } from '../../../context/i18nContext';
import ImageUpload from '../../../components/ImageUpload';
import {
  X,
  Plus,
  Trash2,
  Save,
  Layers,
  Image as ImageIcon,
  Sparkles,
  Edit3,
  Maximize2,
  CheckCircle2,
  AlertCircle,
  Eye,
  Sliders,
  Compass,
  Wind,
  Flame,
  Check,
  Undo2,
  RefreshCw,
  Move
} from 'lucide-react';

const ICON_OPTIONS = [
  'Sparkles',
  'ShieldCheck',
  'Maximize2',
  'Sun',
  'Flame',
  'Wind',
  'Eye',
  'Compass',
  'CheckCircle2',
  'Layers',
  'Home'
];

export const LayoutEditorModal = ({ layoutId, isOpen, onClose, onUpdated }) => {
  const { t, getText } = useI18n();
  const [activeTab, setActiveTab] = useState('basic'); // basic | images | rooms | characteristics | features | preview
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Main layout state
  const [layout, setLayout] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [features, setFeatures] = useState([]);

  // Form states
  const [basicForm, setBasicForm] = useState({
    name: '',
    name_tg: '',
    code: '',
    rooms: 1,
    area_m2: 45,
    default_price_per_m2: 8500,
    description_ru: '',
    description_tg: '',
    furnished_plan_path: '',
    technical_plan_path: '',
    living_area: '',
    kitchen_area: '',
    ceiling_height: '2.8',
    bathrooms_count: 1,
    windows_count: 2,
    doors_count: 3,
    balconies_count: 1,
    heating_type_ru: 'Центральное отопление',
    heating_type_tg: 'Гармидиҳии марказӣ',
    ventilation_type_ru: 'Приточно-вытяжная',
    ventilation_type_tg: 'Вентилятсияи ҳавоӣ',
    orientation_ru: 'Восток / Панорама города',
    orientation_tg: 'Шарқ / Намои шаҳр',
    is_published: true
  });

  // Room Editing State
  const [editingRoom, setEditingRoom] = useState(null); // null = new or room object
  const [roomForm, setRoomForm] = useState({
    room_number: 1,
    room_type: 'LIVING',
    name_ru: '',
    name_tg: '',
    area: '',
    description_ru: '',
    description_tg: '',
    floor_finish_ru: 'Ламинат 33 класс',
    floor_finish_tg: 'Ламинати 33 синиф',
    wall_finish_ru: 'Обои под покраску',
    wall_finish_tg: 'Деворкоғазҳои ранга',
    ceiling_finish_ru: 'Натяжной потолок',
    ceiling_finish_tg: 'Шифти кашидашуда',
    lighting_ru: 'Точечные светильники',
    lighting_tg: 'Чароғҳои нуқтавӣ',
    ventilation_ru: 'Естественная',
    ventilation_tg: 'Табиӣ',
    position_x_percent: 50,
    position_y_percent: 50,
    polygon_points: []
  });

  // Polygon Drawing Mode
  const [isDrawingPolygon, setIsDrawingPolygon] = useState(false);
  const imageCanvasRef = useRef(null);

  // Feature Editing State
  const [featureForm, setFeatureForm] = useState({
    icon_key: 'Sparkles',
    text_ru: '',
    text_tg: '',
    sort_order: 0
  });

  const fetchLayoutData = async () => {
    if (!layoutId) return;
    setIsLoading(true);
    try {
      const res = await api.get(`/inventory/layouts/${layoutId}/presentation`);
      const data = res.data?.data || res.data;
      const l = data.layout;
      setLayout(l);
      setRooms(data.rooms || []);
      setFeatures(data.features || []);

      setBasicForm({
        name: l.name || '',
        name_tg: l.name_tg || '',
        code: l.code || '',
        rooms: l.rooms || 1,
        area_m2: l.area_m2_x100 ? (l.area_m2_x100 / 100).toFixed(1) : '45',
        default_price_per_m2: l.default_price_per_m2_minor ? Math.round(l.default_price_per_m2_minor / 100) : 8500,
        description_ru: l.description_ru || l.description || '',
        description_tg: l.description_tg || '',
        furnished_plan_path: l.furnished_plan_path || l.image_path || '',
        technical_plan_path: l.technical_plan_path || '',
        living_area: l.living_area || '',
        kitchen_area: l.kitchen_area || '',
        ceiling_height: l.ceiling_height || '2.8',
        bathrooms_count: l.bathrooms_count ?? 1,
        windows_count: l.windows_count ?? 2,
        doors_count: l.doors_count ?? 3,
        balconies_count: l.balconies_count ?? 1,
        heating_type_ru: l.heating_type_ru || 'Центральное',
        heating_type_tg: l.heating_type_tg || 'Марказӣ',
        ventilation_type_ru: l.ventilation_type_ru || 'Приточно-вытяжная',
        ventilation_type_tg: l.ventilation_type_tg || 'Вентилятсияи ҳавоӣ',
        orientation_ru: l.orientation_ru || 'Юго-Восток',
        orientation_tg: l.orientation_tg || 'Ҷанубу Шарқ',
        is_published: l.is_published !== false
      });
    } catch (err) {
      setError(err.message || t('errorLoadingPresentation'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && layoutId) {
      fetchLayoutData();
    }
  }, [isOpen, layoutId]);

  if (!isOpen) return null;

  // Save layout main/extended info
  const handleSaveBasic = async (e) => {
    e?.preventDefault();
    setIsSaving(true);
    setError('');
    setSuccessMsg('');

    try {
      const payload = {
        name: basicForm.name,
        name_tg: basicForm.name_tg,
        code: basicForm.code,
        rooms: parseInt(basicForm.rooms, 10),
        area_m2_x100: Math.round(parseFloat(basicForm.area_m2) * 100),
        default_price_per_m2_minor: Math.round(parseFloat(basicForm.default_price_per_m2) * 100),
        description: basicForm.description_ru,
        description_ru: basicForm.description_ru,
        description_tg: basicForm.description_tg,
        furnished_plan_path: basicForm.furnished_plan_path,
        technical_plan_path: basicForm.technical_plan_path,
        living_area: basicForm.living_area ? parseFloat(basicForm.living_area) : null,
        kitchen_area: basicForm.kitchen_area ? parseFloat(basicForm.kitchen_area) : null,
        ceiling_height: basicForm.ceiling_height ? parseFloat(basicForm.ceiling_height) : null,
        bathrooms_count: parseInt(basicForm.bathrooms_count, 10) || 0,
        windows_count: parseInt(basicForm.windows_count, 10) || 0,
        doors_count: parseInt(basicForm.doors_count, 10) || 0,
        balconies_count: parseInt(basicForm.balconies_count, 10) || 0,
        heating_type_ru: basicForm.heating_type_ru,
        heating_type_tg: basicForm.heating_type_tg,
        ventilation_type_ru: basicForm.ventilation_type_ru,
        ventilation_type_tg: basicForm.ventilation_type_tg,
        orientation_ru: basicForm.orientation_ru,
        orientation_tg: basicForm.orientation_tg,
        is_published: basicForm.is_published
      };

      await api.patch(`/inventory/layouts/${layoutId}/extended`, payload);
      setSuccessMsg(t('savedSuccessfully'));
      fetchLayoutData();
      if (onUpdated) onUpdated();
    } catch (err) {
      setError(err.message || 'Ошибка сохранения данных');
    } finally {
      setIsSaving(false);
    }
  };

  // Click handler on furnished plan image canvas
  const handleCanvasClick = (e) => {
    if (!imageCanvasRef.current) return;
    const rect = imageCanvasRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const xPct = Math.round(Math.max(0, Math.min(100, (clickX / rect.width) * 100)) * 100) / 100;
    const yPct = Math.round(Math.max(0, Math.min(100, (clickY / rect.height) * 100)) * 100) / 100;

    if (isDrawingPolygon) {
      setRoomForm((prev) => ({
        ...prev,
        polygon_points: [...(prev.polygon_points || []), { x_pct: xPct, y_pct: yPct }]
      }));
    } else {
      setRoomForm((prev) => ({
        ...prev,
        position_x_percent: xPct,
        position_y_percent: yPct
      }));
    }
  };

  // Save Room (Create or Update)
  const handleSaveRoom = async (e) => {
    e?.preventDefault();
    setIsSaving(true);
    setError('');

    try {
      if (editingRoom?.id) {
        await api.patch(`/inventory/layouts/${layoutId}/rooms/${editingRoom.id}`, roomForm);
      } else {
        await api.post(`/inventory/layouts/${layoutId}/rooms`, roomForm);
      }

      setEditingRoom(null);
      setRoomForm({
        room_number: rooms.length + 2,
        room_type: 'ROOM',
        name_ru: '',
        name_tg: '',
        area: '',
        description_ru: '',
        description_tg: '',
        floor_finish_ru: '',
        floor_finish_tg: '',
        wall_finish_ru: '',
        wall_finish_tg: '',
        ceiling_finish_ru: '',
        ceiling_finish_tg: '',
        lighting_ru: '',
        lighting_tg: '',
        ventilation_ru: '',
        ventilation_tg: '',
        position_x_percent: 50,
        position_y_percent: 50,
        polygon_points: []
      });
      fetchLayoutData();
    } catch (err) {
      setError(err.message || 'Ошибка сохранения комнаты');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditRoomSelect = (r) => {
    setEditingRoom(r);
    setRoomForm({
      room_number: r.room_number,
      room_type: r.room_type || 'ROOM',
      name_ru: r.name_ru || '',
      name_tg: r.name_tg || '',
      area: r.area || '',
      description_ru: r.description_ru || '',
      description_tg: r.description_tg || '',
      floor_finish_ru: r.floor_finish_ru || '',
      floor_finish_tg: r.floor_finish_tg || '',
      wall_finish_ru: r.wall_finish_ru || '',
      wall_finish_tg: r.wall_finish_tg || '',
      ceiling_finish_ru: r.ceiling_finish_ru || '',
      ceiling_finish_tg: r.ceiling_finish_tg || '',
      lighting_ru: r.lighting_ru || '',
      lighting_tg: r.lighting_tg || '',
      ventilation_ru: r.ventilation_ru || '',
      ventilation_tg: r.ventilation_tg || '',
      position_x_percent: r.position_x_percent,
      position_y_percent: r.position_y_percent,
      polygon_points: r.polygon_points || []
    });
  };

  const handleDeleteRoom = async (roomId) => {
    if (!confirm(t('confirmDeleteRoom'))) return;
    try {
      await api.delete(`/inventory/layouts/${layoutId}/rooms/${roomId}`);
      fetchLayoutData();
    } catch (err) {
      alert(err.message || 'Ошибка удаления комнаты');
    }
  };

  // Add Feature
  const handleSaveFeature = async (e) => {
    e?.preventDefault();
    if (!featureForm.text_ru) return;
    setIsSaving(true);
    try {
      await api.post(`/inventory/layouts/${layoutId}/features`, featureForm);
      setFeatureForm({ icon_key: 'Sparkles', text_ru: '', text_tg: '', sort_order: features.length + 1 });
      fetchLayoutData();
    } catch (err) {
      setError(err.message || 'Ошибка сохранения преимущества');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteFeature = async (featureId) => {
    if (!confirm(t('confirmDeleteFeature'))) return;
    try {
      await api.delete(`/inventory/layouts/${layoutId}/features/${featureId}`);
      fetchLayoutData();
    } catch (err) {
      alert(err.message || 'Ошибка удаления элемента');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="relative flex flex-col w-full max-w-6xl max-h-[92vh] rounded-3xl border border-slate-200 bg-white shadow-2xl overflow-hidden">
        
        {/* Top Bar */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md">
              <Sliders className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">{t('editorTitle')}</h3>
              <p className="text-xs text-slate-500">
                {layout?.name} ({layout?.code}) — {layout?.rooms === 0 ? 'Студия' : `${layout?.rooms}-комнатная`}
              </p>
            </div>
          </div>

          <button onClick={onClose} className="rounded-xl p-2 text-slate-400 hover:bg-slate-200 transition cursor-pointer">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-b border-slate-200 bg-white px-6 py-2 overflow-x-auto">
          {[
            { id: 'basic', label: t('tabBasicInfo'), icon: Edit3 },
            { id: 'images', label: t('tabImages'), icon: ImageIcon },
            { id: 'rooms', label: t('tabRoomsEditor'), icon: Layers, count: rooms.length },
            { id: 'characteristics', label: t('tabCharacteristics'), icon: Sliders },
            { id: 'features', label: t('tabFeatures'), icon: Sparkles, count: features.length },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span className={`rounded-full px-1.5 py-0.2 text-[10px] ${isActive ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'}`}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Messages */}
        {error && (
          <div className="mx-6 mt-4 flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-xs text-rose-700 border border-rose-200">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {successMsg && (
          <div className="mx-6 mt-4 flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-xs text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Tab Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex h-64 items-center justify-center text-slate-400">
              <RefreshCw className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            <>
              {/* TAB 1: BASIC INFO */}
              {activeTab === 'basic' && (
                <form onSubmit={handleSaveBasic} className="space-y-5 max-w-3xl">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">{t('nameRuLabel')}</label>
                      <input
                        type="text"
                        required
                        value={basicForm.name}
                        onChange={(e) => setBasicForm({ ...basicForm, name: e.target.value })}
                        className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2 text-sm outline-none focus:border-blue-500 focus:bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">{t('nameTgLabel')}</label>
                      <input
                        type="text"
                        value={basicForm.name_tg}
                        onChange={(e) => setBasicForm({ ...basicForm, name_tg: e.target.value })}
                        placeholder="Намуди 2A (Евро-духонагӣ)"
                        className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2 text-sm outline-none focus:border-blue-500 focus:bg-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">{t('codeLabel')}</label>
                      <input
                        type="text"
                        required
                        value={basicForm.code}
                        onChange={(e) => setBasicForm({ ...basicForm, code: e.target.value })}
                        className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2 text-sm uppercase outline-none focus:border-blue-500 focus:bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">{t('roomsCount')}</label>
                      <input
                        type="number"
                        min="0"
                        value={basicForm.rooms}
                        onChange={(e) => setBasicForm({ ...basicForm, rooms: e.target.value })}
                        className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2 text-sm outline-none focus:border-blue-500 focus:bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">{t('totalArea')} (м²)</label>
                      <input
                        type="number"
                        step="0.1"
                        required
                        value={basicForm.area_m2}
                        onChange={(e) => setBasicForm({ ...basicForm, area_m2: e.target.value })}
                        className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2 text-sm outline-none focus:border-blue-500 focus:bg-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Описание RU</label>
                    <textarea
                      rows={3}
                      value={basicForm.description_ru}
                      onChange={(e) => setBasicForm({ ...basicForm, description_ru: e.target.value })}
                      placeholder="Просторная квартира с большой кухней-гостиной и панорамными окнами..."
                      className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2 text-sm outline-none focus:border-blue-500 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Описание TG</label>
                    <textarea
                      rows={3}
                      value={basicForm.description_tg}
                      onChange={(e) => setBasicForm({ ...basicForm, description_tg: e.target.value })}
                      placeholder="Манзили барҳаво бо ошхонаи калон ва тирезаҳои панорамӣ..."
                      className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2 text-sm outline-none focus:border-blue-500 focus:bg-white"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSaving}
                    className="flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 text-xs font-bold text-white shadow-md hover:bg-blue-700 transition cursor-pointer"
                  >
                    <Save className="h-4 w-4" />
                    <span>{isSaving ? 'Сохранение...' : t('btnSave')}</span>
                  </button>
                </form>
              )}

              {/* TAB 2: IMAGES */}
              {activeTab === 'images' && (
                <div className="space-y-6 max-w-4xl">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 space-y-3">
                      <h4 className="text-sm font-bold text-slate-900">{t('furnishedPlanLabel')}</h4>
                      <p className="text-xs text-slate-500">{t('uploadImageHint')}</p>
                      <div className="w-full h-64">
                        <ImageUpload
                          value={basicForm.furnished_plan_path}
                          onChange={(url) => setBasicForm({ ...basicForm, furnished_plan_path: url })}
                        />
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 space-y-3">
                      <h4 className="text-sm font-bold text-slate-900">{t('technicalPlanLabel')}</h4>
                      <p className="text-xs text-slate-500">{t('uploadImageHint')}</p>
                      <div className="w-full h-64">
                        <ImageUpload
                          value={basicForm.technical_plan_path}
                          onChange={(url) => setBasicForm({ ...basicForm, technical_plan_path: url })}
                        />
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={handleSaveBasic}
                    disabled={isSaving}
                    className="flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 text-xs font-bold text-white shadow-md hover:bg-blue-700 transition cursor-pointer"
                  >
                    <Save className="h-4 w-4" />
                    <span>{isSaving ? 'Сохранение...' : t('btnSave')}</span>
                  </button>
                </div>
              )}

              {/* TAB 3: ROOMS EDITOR */}
              {activeTab === 'rooms' && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Left Canvas Preview */}
                  <div className="lg:col-span-7 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold text-slate-900">{t('tabRoomsEditor')}</h4>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setIsDrawingPolygon(!isDrawingPolygon)}
                          className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                            isDrawingPolygon
                              ? 'bg-amber-500 text-white shadow-xs'
                              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                          }`}
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                          <span>{isDrawingPolygon ? 'Режим контура (ВКЛ)' : t('drawPolygonBtn')}</span>
                        </button>

                        {isDrawingPolygon && (
                          <button
                            type="button"
                            onClick={() => setRoomForm({ ...roomForm, polygon_points: [] })}
                            className="flex items-center gap-1 rounded-xl bg-rose-50 text-rose-600 border border-rose-200 px-2.5 py-1.5 text-xs font-bold hover:bg-rose-100 cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            <span>{t('clearPolygonBtn')}</span>
                          </button>
                        )}
                      </div>
                    </div>

                    <p className="text-xs text-slate-500">{t('clickOnPlanToPlaceMarker')}</p>

                    {/* Furnished Plan Interactive Canvas */}
                    <div
                      ref={imageCanvasRef}
                      onClick={handleCanvasClick}
                      className="relative w-full h-[420px] rounded-2xl bg-slate-900 overflow-hidden border border-slate-300 select-none cursor-crosshair"
                    >
                      {basicForm.furnished_plan_path ? (
                        <img
                          src={basicForm.furnished_plan_path}
                          alt="Furnished Plan"
                          className="w-full h-full object-contain pointer-events-none"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-slate-400">
                          <p className="text-xs">Загрузите меблированный план во вкладке "Изображения планов"</p>
                        </div>
                      )}

                      {/* Render existing room markers */}
                      {rooms.map((r) => (
                        <div
                          key={r.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditRoomSelect(r);
                          }}
                          style={{
                            left: `${r.position_x_percent}%`,
                            top: `${r.position_y_percent}%`,
                          }}
                          className={`absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center transition-transform hover:scale-110 cursor-pointer z-10 ${
                            editingRoom?.id === r.id ? 'ring-4 ring-amber-400 shadow-xl scale-110' : ''
                          }`}
                        >
                          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-white font-extrabold text-xs shadow-md border-2 border-white">
                            {r.room_number}
                          </div>
                          <span className="mt-0.5 rounded-md bg-slate-900/85 px-1.5 py-0.2 text-[10px] font-bold text-white shadow-xs backdrop-blur-xs">
                            {r.area} м²
                          </span>
                        </div>
                      ))}

                      {/* Current active editing marker preview */}
                      {roomForm.position_x_percent !== undefined && (
                        <div
                          style={{
                            left: `${roomForm.position_x_percent}%`,
                            top: `${roomForm.position_y_percent}%`,
                          }}
                          className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center z-20 pointer-events-none animate-pulse"
                        >
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-500 text-white font-extrabold text-sm shadow-xl border-2 border-white ring-4 ring-amber-400/50">
                            {roomForm.room_number}
                          </div>
                          <span className="mt-0.5 rounded-md bg-amber-600 px-1.5 py-0.2 text-[10px] font-extrabold text-white shadow-xs">
                            Новая позиция
                          </span>
                        </div>
                      )}

                      {/* Polygon overlay for active room form */}
                      {roomForm.polygon_points && roomForm.polygon_points.length > 0 && (
                        <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
                          <polygon
                            points={roomForm.polygon_points.map((p) => `${p.x_pct}%,${p.y_pct}%`).join(' ')}
                            fill="rgba(245, 158, 11, 0.35)"
                            stroke="#f59e0b"
                            strokeWidth="2"
                            strokeDasharray="4 4"
                          />
                        </svg>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                      <span>{t('markerPosition')} <strong>X: {roomForm.position_x_percent}% | Y: {roomForm.position_y_percent}%</strong></span>
                      <span>{t('polygonPointsCount')} <strong>{roomForm.polygon_points?.length || 0}</strong></span>
                    </div>
                  </div>

                  {/* Right Room Form & List */}
                  <div className="lg:col-span-5 space-y-4">
                    <form onSubmit={handleSaveRoom} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                        <h5 className="text-xs font-bold text-slate-900">
                          {editingRoom ? `${t('editRoomTitle')} #${editingRoom.room_number}` : t('addRoomBtn')}
                        </h5>
                        {editingRoom && (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingRoom(null);
                              setRoomForm({ ...roomForm, room_number: rooms.length + 1 });
                            }}
                            className="text-[11px] font-bold text-blue-600 hover:underline"
                          >
                            + Создать новую
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">№ Комнаты *</label>
                          <input
                            type="number"
                            required
                            value={roomForm.room_number}
                            onChange={(e) => setRoomForm({ ...roomForm, room_number: parseInt(e.target.value, 10) || 1 })}
                            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs outline-none focus:border-blue-500"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">Площадь (м²) *</label>
                          <input
                            type="number"
                            step="0.01"
                            required
                            value={roomForm.area}
                            onChange={(e) => setRoomForm({ ...roomForm, area: e.target.value })}
                            placeholder="20.75"
                            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs outline-none focus:border-blue-500"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">Название RU *</label>
                          <input
                            type="text"
                            required
                            value={roomForm.name_ru}
                            onChange={(e) => setRoomForm({ ...roomForm, name_ru: e.target.value })}
                            placeholder="Гостиная-кухня"
                            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs outline-none focus:border-blue-500"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">Название TG</label>
                          <input
                            type="text"
                            value={roomForm.name_tg}
                            onChange={(e) => setRoomForm({ ...roomForm, name_tg: e.target.value })}
                            placeholder="Меҳмонхона"
                            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs outline-none focus:border-blue-500"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">Описание RU</label>
                          <input
                            type="text"
                            value={roomForm.description_ru}
                            onChange={(e) => setRoomForm({ ...roomForm, description_ru: e.target.value })}
                            placeholder="Светлая комната с выходом на лоджию"
                            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs outline-none focus:border-blue-500"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">Описание TG</label>
                          <input
                            type="text"
                            value={roomForm.description_tg}
                            onChange={(e) => setRoomForm({ ...roomForm, description_tg: e.target.value })}
                            placeholder="Хонаи равшан бо баромад ба балкон"
                            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs outline-none focus:border-blue-500"
                          />
                        </div>
                      </div>

                      {/* Finishes */}
                      <div className="border-t border-slate-200 pt-2 space-y-2">
                        <span className="text-[11px] font-bold text-slate-800">Характеристики отделки (RU):</span>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <input
                            type="text"
                            value={roomForm.floor_finish_ru}
                            onChange={(e) => setRoomForm({ ...roomForm, floor_finish_ru: e.target.value })}
                            placeholder="Пол (Ламинат 33)"
                            className="rounded-lg border border-slate-300 px-2 py-1 text-xs"
                          />
                          <input
                            type="text"
                            value={roomForm.wall_finish_ru}
                            onChange={(e) => setRoomForm({ ...roomForm, wall_finish_ru: e.target.value })}
                            placeholder="Стены (Обои)"
                            className="rounded-lg border border-slate-300 px-2 py-1 text-xs"
                          />
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={isSaving}
                        className="w-full rounded-xl bg-blue-600 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition cursor-pointer"
                      >
                        {isSaving ? 'Сохранение...' : editingRoom ? 'Обновить комнату' : 'Добавить комнату'}
                      </button>
                    </form>

                    {/* Room List */}
                    <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                      {rooms.map((r) => (
                        <div
                          key={r.id}
                          className={`flex items-center justify-between rounded-xl border p-2.5 transition cursor-pointer ${
                            editingRoom?.id === r.id ? 'border-amber-400 bg-amber-50 shadow-xs' : 'border-slate-200 bg-white hover:bg-slate-50'
                          }`}
                          onClick={() => handleEditRoomSelect(r)}
                        >
                          <div className="flex items-center gap-2">
                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-blue-800 text-xs font-bold">
                              {r.room_number}
                            </span>
                            <div>
                              <p className="text-xs font-bold text-slate-900">{getText(r.name_tg, r.name_ru)}</p>
                              <p className="text-[10px] text-slate-500">{r.area} м²</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteRoom(r.id);
                              }}
                              className="p-1 text-rose-500 hover:bg-rose-50 rounded-lg transition"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: CHARACTERISTICS */}
              {activeTab === 'characteristics' && (
                <form onSubmit={handleSaveBasic} className="space-y-5 max-w-3xl">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">{t('livingArea')} (м²)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={basicForm.living_area}
                        onChange={(e) => setBasicForm({ ...basicForm, living_area: e.target.value })}
                        className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2 text-sm outline-none focus:border-blue-500 focus:bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">{t('kitchenArea')} (м²)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={basicForm.kitchen_area}
                        onChange={(e) => setBasicForm({ ...basicForm, kitchen_area: e.target.value })}
                        className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2 text-sm outline-none focus:border-blue-500 focus:bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">{t('ceilingHeight')} (м)</label>
                      <input
                        type="number"
                        step="0.05"
                        value={basicForm.ceiling_height}
                        onChange={(e) => setBasicForm({ ...basicForm, ceiling_height: e.target.value })}
                        className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2 text-sm outline-none focus:border-blue-500 focus:bg-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">{t('bathroomsCount')}</label>
                      <input
                        type="number"
                        min="0"
                        value={basicForm.bathrooms_count}
                        onChange={(e) => setBasicForm({ ...basicForm, bathrooms_count: e.target.value })}
                        className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2 text-sm outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">{t('windowsCount')}</label>
                      <input
                        type="number"
                        min="0"
                        value={basicForm.windows_count}
                        onChange={(e) => setBasicForm({ ...basicForm, windows_count: e.target.value })}
                        className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2 text-sm outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">{t('doorsCount')}</label>
                      <input
                        type="number"
                        min="0"
                        value={basicForm.doors_count}
                        onChange={(e) => setBasicForm({ ...basicForm, doors_count: e.target.value })}
                        className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2 text-sm outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">{t('balconiesCount')}</label>
                      <input
                        type="number"
                        min="0"
                        value={basicForm.balconies_count}
                        onChange={(e) => setBasicForm({ ...basicForm, balconies_count: e.target.value })}
                        className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2 text-sm outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">{t('heatingType')} RU</label>
                      <input
                        type="text"
                        value={basicForm.heating_type_ru}
                        onChange={(e) => setBasicForm({ ...basicForm, heating_type_ru: e.target.value })}
                        className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2 text-sm outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">{t('heatingType')} TG</label>
                      <input
                        type="text"
                        value={basicForm.heating_type_tg}
                        onChange={(e) => setBasicForm({ ...basicForm, heating_type_tg: e.target.value })}
                        className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2 text-sm outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">{t('orientation')} RU</label>
                      <input
                        type="text"
                        value={basicForm.orientation_ru}
                        onChange={(e) => setBasicForm({ ...basicForm, orientation_ru: e.target.value })}
                        className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2 text-sm outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">{t('orientation')} TG</label>
                      <input
                        type="text"
                        value={basicForm.orientation_tg}
                        onChange={(e) => setBasicForm({ ...basicForm, orientation_tg: e.target.value })}
                        className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2 text-sm outline-none"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSaving}
                    className="flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 text-xs font-bold text-white shadow-md hover:bg-blue-700 transition cursor-pointer"
                  >
                    <Save className="h-4 w-4" />
                    <span>{isSaving ? 'Сохранение...' : t('btnSave')}</span>
                  </button>
                </form>
              )}

              {/* TAB 5: FEATURES */}
              {activeTab === 'features' && (
                <div className="space-y-6 max-w-3xl">
                  <form onSubmit={handleSaveFeature} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-4">
                    <h5 className="text-xs font-bold text-slate-900">{t('addFeatureBtn')}</h5>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">{t('iconSelectLabel')}</label>
                        <select
                          value={featureForm.icon_key}
                          onChange={(e) => setFeatureForm({ ...featureForm, icon_key: e.target.value })}
                          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs outline-none"
                        >
                          {ICON_OPTIONS.map((icon) => (
                            <option key={icon} value={icon}>
                              {icon}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">{t('featureTextRu')}</label>
                        <input
                          type="text"
                          required
                          value={featureForm.text_ru}
                          onChange={(e) => setFeatureForm({ ...featureForm, text_ru: e.target.value })}
                          placeholder="Панорамные окна во двор"
                          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">{t('featureTextTg')}</label>
                        <input
                          type="text"
                          value={featureForm.text_tg}
                          onChange={(e) => setFeatureForm({ ...featureForm, text_tg: e.target.value })}
                          placeholder="Тирезаҳои панорамӣ ба ҳавли"
                          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs outline-none"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isSaving}
                      className="rounded-xl bg-blue-600 px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition cursor-pointer"
                    >
                      {t('addFeatureBtn')}
                    </button>
                  </form>

                  {/* Feature List */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {features.map((f) => (
                      <div key={f.id} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3 shadow-2xs">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
                            <Sparkles className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-900">{f.text_ru}</p>
                            {f.text_tg && <p className="text-[11px] text-slate-500">{f.text_tg}</p>}
                          </div>
                        </div>

                        <button
                          onClick={() => handleDeleteFeature(f.id)}
                          className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
