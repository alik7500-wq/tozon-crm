import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { useModalDismiss } from '../../hooks/useModalDismiss';
import {
  X,
  Pencil,
  User,
  Phone,
  Calendar,
  Building2,
  MapPin,
  Save,
  AlertCircle,
  FileText,
  ShieldCheck,
  CreditCard
} from 'lucide-react';

export const EditClientModal = ({
  isOpen,
  onClose,
  client,
  onClientUpdated
}) => {
  const [users, setUsers] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Form State
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [secondaryPhone, setSecondaryPhone] = useState('');
  const [passportSeries, setPassportSeries] = useState('');
  const [passportNumber, setPassportNumber] = useState('');
  const [passportIssuedBy, setPassportIssuedBy] = useState('');
  const [passportIssueDate, setPassportIssueDate] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [registrationAddress, setRegistrationAddress] = useState('');
  const [responsibleUserId, setResponsibleUserId] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (client) {
      setFullName(client.name || client.full_name || '');
      setPhone(client.phone || '');
      setSecondaryPhone(client.secondary_phone || '');
      setPassportSeries(client.passport_series || '');
      setPassportNumber(client.passport_number || '');
      setPassportIssuedBy(client.passport_issued_by || '');
      setPassportIssueDate(client.passport_issue_date ? client.passport_issue_date.split('T')[0] : '');
      setBirthDate(client.birth_date ? client.birth_date.split('T')[0] : '');
      setRegistrationAddress(client.address || client.registration_address || '');
      setResponsibleUserId(client.responsible_user_id ? String(client.responsible_user_id) : '');
      setNotes(client.notes || '');
      setError('');
    }
  }, [client, isOpen]);

  // Load users for manager assignment
  useEffect(() => {
    if (isOpen) {
      api.get('/users')
        .then(res => setUsers(res.data?.users || res.users || []))
        .catch(err => console.error('Error fetching users:', err));
    }
  }, [isOpen]);

  const isDirty = Boolean(
    client && (
      fullName !== (client.name || client.full_name || '') ||
      phone !== (client.phone || '') ||
      secondaryPhone !== (client.secondary_phone || '') ||
      passportSeries !== (client.passport_series || '') ||
      passportNumber !== (client.passport_number || '') ||
      passportIssuedBy !== (client.passport_issued_by || '') ||
      passportIssueDate !== (client.passport_issue_date ? client.passport_issue_date.split('T')[0] : '') ||
      birthDate !== (client.birth_date ? client.birth_date.split('T')[0] : '') ||
      registrationAddress !== (client.address || client.registration_address || '') ||
      responsibleUserId !== (client.responsible_user_id ? String(client.responsible_user_id) : '') ||
      notes !== (client.notes || '')
    )
  );

  const { requestClose } = useModalDismiss({
    isOpen: Boolean(isOpen && client),
    onClose,
    isDirty,
    confirmMessage: 'В форме редактирования клиента есть несохраненные данные. Закрыть окно?'
  });

  if (!isOpen || !client) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!fullName.trim() || !phone.trim()) {
      setError('ФИО и телефон обязательны для заполнения');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const payload = {
        full_name: fullName.trim(),
        phone: phone.trim(),
        secondary_phone: secondaryPhone.trim() || null,
        passport_series: passportSeries.trim() || null,
        passport_number: passportNumber.trim() || null,
        passport_issued_by: passportIssuedBy.trim() || null,
        passport_issue_date: passportIssueDate || null,
        birth_date: birthDate || null,
        registration_address: registrationAddress.trim() || null,
        responsible_user_id: responsibleUserId ? parseInt(responsibleUserId, 10) : null,
        notes: notes.trim() || null
      };

      const targetId = client.lead_id || client.id;
      if (targetId) {
        await api.patch(`/leads/${targetId}`, payload);
      }

      if (onClientUpdated) {
        onClientUpdated();
      }
      onClose();
    } catch (err) {
      console.error('Failed to save client data:', err);
      setError(err.message || 'Ошибка сохранения данных клиента');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 shadow-2xs">
              <Pencil className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Редактирование данных клиента</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {client.name || client.full_name} • {client.phone || 'Без телефона'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={requestClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 flex-1 text-xs">
          {error && (
            <div className="flex items-center gap-2.5 rounded-2xl bg-rose-50 border border-rose-200 p-3.5 text-rose-700 font-medium">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Section 1: Personal Info */}
          <div className="bg-slate-50/70 rounded-2xl p-4 border border-slate-200 space-y-3">
            <div className="flex items-center gap-2 font-bold text-slate-900 text-xs">
              <User className="h-4 w-4 text-blue-600" />
              <span>Личные и контактные данные</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  ФИО Клиента <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Хомидов Рахмон Ахмедович"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Основной телефон <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="999333000"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Второй / Дополнительный телефон
                </label>
                <input
                  type="text"
                  value={secondaryPhone}
                  onChange={(e) => setSecondaryPhone(e.target.value)}
                  placeholder="+992927334344"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Дата рождения
                </label>
                <input
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Ответственный менеджер
                </label>
                <select
                  value={responsibleUserId}
                  onChange={(e) => setResponsibleUserId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition cursor-pointer"
                >
                  <option value="">Не назначен</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.role})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Section 2: Passport & Legal Info */}
          <div className="bg-amber-50/40 rounded-2xl p-4 border border-amber-200/60 space-y-3">
            <div className="flex items-center gap-2 font-bold text-slate-900 text-xs">
              <FileText className="h-4 w-4 text-amber-600" />
              <span>Паспортные данные и прописка</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Серия паспорта
                </label>
                <input
                  type="text"
                  value={passportSeries}
                  onChange={(e) => setPassportSeries(e.target.value)}
                  placeholder="А"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Номер паспорта
                </label>
                <input
                  type="text"
                  value={passportNumber}
                  onChange={(e) => setPassportNumber(e.target.value)}
                  placeholder="05223318"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-mono font-bold text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Кем выдан паспорт
                </label>
                <input
                  type="text"
                  value={passportIssuedBy}
                  onChange={(e) => setPassportIssuedBy(e.target.value)}
                  placeholder="ШВКД-1 в г. Худжанд"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Дата выдачи
                </label>
                <input
                  type="date"
                  value={passportIssueDate}
                  onChange={(e) => setPassportIssueDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
                />
              </div>

              <div className="md:col-span-3">
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Адрес регистрации / проживания
                </label>
                <input
                  type="text"
                  value={registrationAddress}
                  onChange={(e) => setRegistrationAddress(e.target.value)}
                  placeholder="г. Худжанд, ул. И. Сомони, д. 45, кв. 12"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Notes */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              Заметки и комментарии
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Дополнительная информация о клиенте..."
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
            />
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={requestClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 transition cursor-pointer text-xs"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold transition shadow-xs cursor-pointer text-xs disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {isSubmitting ? 'Сохранение...' : 'Сохранить изменения'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
