import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import {
  X,
  User,
  Phone,
  Building2,
  FileText,
  DollarSign,
  MapPin,
  Calendar,
  AlertCircle,
  Sparkles,
  Layers
} from 'lucide-react';

export const CreateLeadModal = ({ isOpen, onClose, onCreated, leadToEdit = null, projects = [] }) => {
  const [activeTab, setActiveTab] = useState('main'); // 'main', 'preferences', 'passport'

  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    secondary_phone: '',
    source: 'DIRECT',
    status: 'NEW',
    interested_project_id: '',
    desired_rooms: '',
    budget_max: '',
    passport_series: '',
    passport_number: '',
    passport_issued_by: '',
    passport_issue_date: '',
    birth_date: '',
    registration_address: '',
    notes: '',
  });

  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (leadToEdit) {
      setFormData({
        full_name: leadToEdit.full_name || '',
        phone: leadToEdit.phone || '',
        secondary_phone: leadToEdit.secondary_phone || '',
        source: leadToEdit.source || 'DIRECT',
        status: leadToEdit.status || 'NEW',
        interested_project_id: leadToEdit.interested_project_id || '',
        desired_rooms: leadToEdit.desired_rooms !== null ? String(leadToEdit.desired_rooms) : '',
        budget_max: leadToEdit.budget_max_minor ? String(leadToEdit.budget_max_minor / 100) : '',
        passport_series: leadToEdit.passport_series || '',
        passport_number: leadToEdit.passport_number || '',
        passport_issued_by: leadToEdit.passport_issued_by || '',
        passport_issue_date: leadToEdit.passport_issue_date || '',
        birth_date: leadToEdit.birth_date || '',
        registration_address: leadToEdit.registration_address || '',
        notes: leadToEdit.notes || '',
      });
    } else {
      setFormData({
        full_name: '',
        phone: '',
        secondary_phone: '',
        source: 'DIRECT',
        status: 'NEW',
        interested_project_id: '',
        desired_rooms: '',
        budget_max: '',
        passport_series: '',
        passport_number: '',
        passport_issued_by: '',
        passport_issue_date: '',
        birth_date: '',
        registration_address: '',
        notes: '',
      });
    }
    setActiveTab('main');
    setError('');
  }, [isOpen, leadToEdit]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.full_name || !formData.phone) {
      setError('ФИО и основной телефон обязательны');
      setActiveTab('main');
      return;
    }

    setError('');
    setIsSubmitting(true);

    try {
      const payload = {
        ...formData,
        interested_project_id: formData.interested_project_id ? parseInt(formData.interested_project_id, 10) : null,
        desired_rooms: formData.desired_rooms !== '' ? parseInt(formData.desired_rooms, 10) : null,
        budget_max_minor: formData.budget_max ? Math.round(parseFloat(formData.budget_max) * 100) : null,
      };

      let resultLead;
      if (leadToEdit) {
        const res = await api.put(`/leads/${leadToEdit.id}`, payload);
        resultLead = res.data.lead;
      } else {
        const res = await api.post('/leads', payload);
        resultLead = res.data.lead;
      }

      onCreated(resultLead);
      onClose();
    } catch (err) {
      setError(err.message || 'Ошибка сохранения лида');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in">
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-600 border border-purple-100">
              <User className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">
                {leadToEdit ? 'Редактирование клиента' : 'Новый клиент (Лид)'}
              </h3>
              <p className="text-xs text-slate-500">
                {leadToEdit ? 'Обновление контактных и паспортных данных' : 'Добавление покупателя в базу CRM'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 cursor-pointer">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="mt-4 flex border-b border-slate-200 gap-2">
          {[
            { id: 'main', label: '1. Контакты и статус' },
            { id: 'preferences', label: '2. Потребности и бюджет' },
            { id: 'passport', label: '3. Паспортные данные' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`pb-2.5 px-3 text-xs font-bold transition border-b-2 cursor-pointer ${
                activeTab === tab.id
                  ? 'border-purple-600 text-purple-600'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {error && (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* TAB 1: MAIN & CONTACTS */}
          {activeTab === 'main' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">ФИО клиента *</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    name="full_name"
                    value={formData.full_name}
                    onChange={handleChange}
                    placeholder="Рахимов Алишер Зарифович"
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 pl-9 pr-3.5 py-2 text-sm outline-none focus:border-purple-500 focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Основной телефон *</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      required
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      placeholder="+992 900 12 34 56"
                      className="w-full rounded-xl border border-slate-300 bg-slate-50 pl-9 pr-3.5 py-2 text-sm outline-none focus:border-purple-500 focus:bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Дополнительный телефон</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      name="secondary_phone"
                      value={formData.secondary_phone}
                      onChange={handleChange}
                      placeholder="+992 918 00 00 00"
                      className="w-full rounded-xl border border-slate-300 bg-slate-50 pl-9 pr-3.5 py-2 text-sm outline-none focus:border-purple-500 focus:bg-white"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Источник обращения</label>
                  <select
                    name="source"
                    value={formData.source}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2 text-sm outline-none focus:border-purple-500 focus:bg-white"
                  >
                    <option value="DIRECT">Прямой визит в офис</option>
                    <option value="PHONE">Телефонный звонок</option>
                    <option value="WEBSITE">Заявка с сайта</option>
                    <option value="INSTAGRAM">Instagram / Соцсети</option>
                    <option value="RECOMMENDATION">Рекомендация</option>
                    <option value="OUTDOOR">Наружная реклама</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Стадия воронки</label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2 text-sm font-semibold outline-none focus:border-purple-500 focus:bg-white"
                  >
                    <option value="NEW">Новый (NEW)</option>
                    <option value="IN_PROGRESS">В работе (IN_PROGRESS)</option>
                    <option value="NEGOTIATION">Переговоры (NEGOTIATION)</option>
                    <option value="WON">Сделка (WON)</option>
                    <option value="LOST">Отказ (LOST)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Заметка / Примечание</label>
                <textarea
                  name="notes"
                  rows={2}
                  value={formData.notes}
                  onChange={handleChange}
                  placeholder="Интересуется видовыми квартирами..."
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2 text-sm outline-none focus:border-purple-500 focus:bg-white resize-none"
                />
              </div>
            </div>
          )}

          {/* TAB 2: PREFERENCES & BUDGET */}
          {activeTab === 'preferences' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Желаемый жилой комплекс</label>
                <select
                  name="interested_project_id"
                  value={formData.interested_project_id}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2 text-sm outline-none focus:border-purple-500 focus:bg-white"
                >
                  <option value="">Не определился</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.address})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Желаемая комнатность</label>
                  <select
                    name="desired_rooms"
                    value={formData.desired_rooms}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2 text-sm outline-none focus:border-purple-500 focus:bg-white"
                  >
                    <option value="">Любая</option>
                    <option value="1">1-комнатная</option>
                    <option value="2">2-комнатная</option>
                    <option value="3">3-комнатная</option>
                    <option value="4">4-комнатная</option>
                    <option value="0">Студия</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Максимальный бюджет (TJS)</label>
                  <input
                    type="number"
                    name="budget_max"
                    value={formData.budget_max}
                    onChange={handleChange}
                    placeholder="Например, 500000"
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2 text-sm outline-none focus:border-purple-500 focus:bg-white"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: PASSPORT DATA */}
          {activeTab === 'passport' && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Серия паспорта</label>
                  <input
                    type="text"
                    name="passport_series"
                    value={formData.passport_series}
                    onChange={handleChange}
                    placeholder="A / РТ"
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-purple-500 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Номер паспорта</label>
                  <input
                    type="text"
                    name="passport_number"
                    value={formData.passport_number}
                    onChange={handleChange}
                    placeholder="1234567"
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-purple-500 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Дата рождения</label>
                  <input
                    type="date"
                    name="birth_date"
                    value={formData.birth_date}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-purple-500 focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Кем выдан</label>
                  <input
                    type="text"
                    name="passport_issued_by"
                    value={formData.passport_issued_by}
                    onChange={handleChange}
                    placeholder="ОМВД-1 района Сино"
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-purple-500 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Дата выдачи паспорта</label>
                  <input
                    type="date"
                    name="passport_issue_date"
                    value={formData.passport_issue_date}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-purple-500 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Адрес регистрации (прописка)</label>
                <input
                  type="text"
                  name="registration_address"
                  value={formData.registration_address}
                  onChange={handleChange}
                  placeholder="г. Душанбе, ул. Айни, дом 24, кв. 15"
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2 text-sm outline-none focus:border-purple-500 focus:bg-white"
                />
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="mt-6 flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-xl bg-blue-600 hover:bg-blue-700 px-5 py-2 text-sm font-bold text-white shadow-md transition disabled:opacity-60 cursor-pointer"
            >
              {isSubmitting ? 'Сохранение...' : leadToEdit ? 'Сохранить изменения' : 'Создать лида'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
