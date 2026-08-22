import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { dictionariesApi } from '../../api/dictionaries.api';
import { useModalDismiss } from '../../hooks/useModalDismiss';
import { 
  BookOpen, Plus, Edit, Trash2, CheckCircle2, 
  TrendingDown, TrendingUp, Megaphone, XCircle, CreditCard,
  Search, Palette, ArrowUpDown, X, Sparkles
} from 'lucide-react';

const DICTIONARY_TYPES = [
  {
    id: 'EXPENSE_CATEGORY',
    title: 'Статьи расходов (РКО)',
    description: 'Категории и назначение списаний денежных средств, материалов и оплат подрядчикам',
    icon: TrendingDown,
    color: 'rose',
    badge: 'Расход'
  },
  {
    id: 'INCOME_CATEGORY',
    title: 'Статьи доходов (ПКО)',
    description: 'Категории поступлений денежных средств от клиентов, рассрочки, аренды и прочих источников',
    icon: TrendingUp,
    color: 'emerald',
    badge: 'Доход'
  },
  {
    id: 'LEAD_SOURCE',
    title: 'Источники лидов',
    description: 'Каналы привлечения клиентов (Instagram, Telegram, рекомендации, наружная реклама)',
    icon: Megaphone,
    color: 'blue',
    badge: 'CRM'
  },
  {
    id: 'LOSS_REASON',
    title: 'Причины отказа / потери',
    description: 'Классификатор причин срыва сделок и отказов клиентов для сквозной аналитики',
    icon: XCircle,
    color: 'amber',
    badge: 'Аналитика'
  },
  {
    id: 'PAYMENT_METHOD',
    title: 'Способы оплаты',
    description: 'Формы взаиморасчетов с покупателями и контрагентами (Касса, Безнал, Карта, QR)',
    icon: CreditCard,
    color: 'indigo',
    badge: 'Касса'
  }
];

const PRESET_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#10b981', '#06b6d4', 
  '#3b82f6', '#6366f1', '#8b5cf6', '#ec4899', '#64748b'
];

export const DictionariesTab = () => {
  const queryClient = useQueryClient();
  const [selectedType, setSelectedType] = useState('EXPENSE_CATEGORY');
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    color: '#3b82f6',
    sort_order: 1
  });

  const isDirty = Boolean(formData.name.trim() || formData.code.trim());
  const { requestClose } = useModalDismiss({
    isOpen: isModalOpen,
    onClose: () => setIsModalOpen(false),
    isDirty: !editingItem && isDirty,
    confirmMessage: 'Введенная позиция справочника не сохранена. Закрыть окно?'
  });

  const currentTypeConfig = DICTIONARY_TYPES.find(t => t.id === selectedType) || DICTIONARY_TYPES[0];

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['dictionaries', selectedType],
    queryFn: () => dictionariesApi.getItems(selectedType)
  });

  const createMutation = useMutation({
    mutationFn: dictionariesApi.createItem,
    onSuccess: () => {
      queryClient.invalidateQueries(['dictionaries']);
      setIsModalOpen(false);
      resetForm();
    },
    onError: (err) => alert(err.response?.data?.message || err.message || 'Ошибка создания')
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => dictionariesApi.updateItem(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['dictionaries']);
      setIsModalOpen(false);
      resetForm();
    },
    onError: (err) => alert(err.response?.data?.message || err.message || 'Ошибка обновления')
  });

  const deleteMutation = useMutation({
    mutationFn: dictionariesApi.deleteItem,
    onSuccess: () => {
      queryClient.invalidateQueries(['dictionaries']);
    },
    onError: (err) => alert(err.response?.data?.message || err.message || 'Ошибка удаления')
  });

  const resetForm = () => {
    setEditingItem(null);
    setFormData({
      name: '',
      code: '',
      color: PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)],
      sort_order: items.length + 1
    });
  };

  const handleOpenAdd = () => {
    resetForm();
    setFormData(prev => ({ ...prev, sort_order: items.length + 1 }));
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item) => {
    setEditingItem(item);
    setFormData({
      name: item.name || '',
      code: item.code || '',
      color: item.color || '#3b82f6',
      sort_order: item.sort_order || 1
    });
    setIsModalOpen(true);
  };

  const handleDelete = (item) => {
    if (window.confirm(`Вы уверены, что хотите удалить элемент "${item.name}" из справочника?`)) {
      deleteMutation.mutate(item.id);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    if (editingItem) {
      updateMutation.mutate({
        id: editingItem.id,
        data: {
          name: formData.name.trim(),
          code: formData.code.trim() || null,
          color: formData.color,
          sort_order: Number(formData.sort_order) || 0
        }
      });
    } else {
      createMutation.mutate({
        type: selectedType,
        name: formData.name.trim(),
        code: formData.code.trim() || null,
        color: formData.color,
        sort_order: Number(formData.sort_order) || (items.length + 1)
      });
    }
  };

  const filteredItems = items.filter(item => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (item.name && item.name.toLowerCase().includes(q)) ||
      (item.code && item.code.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      {/* Top Banner / Type Selector */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {DICTIONARY_TYPES.map((type) => {
          const Icon = type.icon;
          const isSelected = selectedType === type.id;
          return (
            <button
              key={type.id}
              onClick={() => {
                setSelectedType(type.id);
                setSearch('');
              }}
              className={`p-4 rounded-2xl border text-left transition flex flex-col justify-between gap-3 cursor-pointer relative overflow-hidden ${
                isSelected
                  ? 'border-blue-500 bg-blue-50/80 shadow-xs ring-2 ring-blue-500/20'
                  : 'border-slate-200 bg-white hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className={`p-2 rounded-xl ${isSelected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md ${
                  isSelected ? 'bg-blue-200/80 text-blue-900' : 'bg-slate-100 text-slate-500'
                }`}>
                  {type.badge}
                </span>
              </div>
              <div>
                <h4 className={`text-xs font-black line-clamp-1 ${isSelected ? 'text-blue-950' : 'text-slate-800'}`}>
                  {type.title}
                </h4>
                <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                  {type.description}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Main List Container */}
      <div className="rounded-3xl bg-white border border-slate-200 shadow-2xs overflow-hidden">
        {/* Header Toolbar */}
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-blue-50 text-blue-600 border border-blue-100">
              <currentTypeConfig.icon className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <span>{currentTypeConfig.title}</span>
                <span className="text-xs font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
                  {filteredItems.length} позиций
                </span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {currentTypeConfig.description}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative min-w-[220px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Поиск по справочнику..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-8 pr-3 py-1.5 text-xs text-slate-900 outline-none focus:border-blue-500 focus:bg-white transition"
              />
            </div>

            <button
              onClick={handleOpenAdd}
              className="flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 px-4 py-2 text-xs font-bold text-white shadow-xs transition cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Добавить позицию</span>
            </button>
          </div>
        </div>

        {/* Table / List */}
        {isLoading ? (
          <div className="p-12 text-center text-slate-400 text-xs flex flex-col items-center gap-2">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
            <span>Загрузка справочника...</span>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-30 text-slate-400" />
            <p className="font-bold text-slate-600">Элементы не найдены</p>
            <p className="text-slate-400 mt-1">Добавьте новую запись в справочник с помощью кнопки выше</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100 text-[11px] font-black uppercase text-slate-500 tracking-wider">
                  <th className="py-3 px-4 w-12 text-center">№</th>
                  <th className="py-3 px-4">Цвет / Метка</th>
                  <th className="py-3 px-4">Наименование статьи / позиции</th>
                  <th className="py-3 px-4">Системный код</th>
                  <th className="py-3 px-4 text-center">Порядок</th>
                  <th className="py-3 px-4 text-right">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredItems.map((item, index) => (
                  <tr key={item.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 px-4 text-center font-bold text-slate-400">
                      {index + 1}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span 
                          className="h-3.5 w-3.5 rounded-full border border-black/10 shadow-2xs" 
                          style={{ backgroundColor: item.color || '#3b82f6' }}
                        />
                        <span className="text-[11px] font-mono text-slate-400">
                          {item.color || '#3b82f6'}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm">
                          {item.name}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      {item.code ? (
                        <span className="inline-block px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-mono text-[11px] font-bold">
                          {item.code}
                        </span>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center font-bold text-slate-600">
                      {item.sort_order ?? 0}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenEdit(item)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition cursor-pointer"
                          title="Редактировать"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(item)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                          title="Удалить"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Add / Edit */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden">
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-white/10 text-white border border-white/10">
                  <currentTypeConfig.icon className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black">
                    {editingItem ? 'Редактировать позицию' : 'Новая позиция справочника'}
                  </h3>
                  <p className="text-[11px] text-slate-300">
                    {currentTypeConfig.title}
                  </p>
                </div>
              </div>
              <button
                onClick={requestClose}
                className="p-1.5 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Наименование статьи / пункта *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Например: Строительные материалы"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-900 outline-none focus:border-blue-500 focus:bg-white transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Системный идентификатор (код, опционально)
                </label>
                <input
                  type="text"
                  placeholder="Например: CASH, INSTAGRAM"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-mono text-slate-900 outline-none focus:border-blue-500 focus:bg-white transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                  <span>Цветовая метка (бейдж)</span>
                  <span className="font-mono text-[11px] text-slate-400">{formData.color}</span>
                </label>
                <div className="flex items-center gap-2 flex-wrap">
                  {PRESET_COLORS.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setFormData({ ...formData, color: c })}
                      className={`h-7 w-7 rounded-full border-2 transition cursor-pointer ${
                        formData.color === c ? 'border-slate-900 scale-110 shadow-xs' : 'border-white hover:scale-105'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                  <input
                    type="color"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="h-7 w-7 rounded-full border border-slate-200 cursor-pointer overflow-hidden p-0"
                    title="Выбрать свой цвет"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Порядок сортировки в выпадающих списках
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.sort_order}
                  onChange={(e) => setFormData({ ...formData, sort_order: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-900 outline-none focus:border-blue-500 focus:bg-white transition"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={requestClose}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition shadow-xs cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span>{editingItem ? 'Сохранить изменения' : 'Создать запись'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
