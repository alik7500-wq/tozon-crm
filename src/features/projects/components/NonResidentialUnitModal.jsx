import React, { useState } from 'react';
import { X } from 'lucide-react';
import { api } from '../../../api/client';
import { useAuth } from '../../auth/AuthContext';
import { useModalDismiss } from '../../../hooks/useModalDismiss';
import { formatMeasure } from '../../../utils/numberDisplay';
import { getUnitKindLabel } from '../../../utils/unitKind';

export const NonResidentialUnitModal = ({ unit, floorNumber, buildingName, currency, onClose, onUpdated }) => {
  const { user } = useAuth();
  const [price, setPrice] = useState(unit.price_per_m2_minor ? String(unit.price_per_m2_minor / 100) : '');
  const [savedPrice, setSavedPrice] = useState(unit.price_per_m2_minor);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const canEditPrice = ['ADMIN', 'DIRECTOR'].includes(user?.role);
  const { requestClose } = useModalDismiss({ isOpen: true, onClose });
  const area = unit.area_m2_x100 / 100;
  const status = { AVAILABLE: 'Свободно', RESERVED: 'В брони', SOLD: 'Продано', BLOCKED: 'Заблокировано' }[unit.status] || unit.status;
  const savePrice = async (event) => {
    event.preventDefault();
    const value = Number(String(price).replace(',', '.'));
    const minor = Math.round(value * 100);
    if (!Number.isSafeInteger(minor) || minor <= 0 || minor > 2147483647) {
      setError('Укажите положительную цену за м²');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await api.patch(`/inventory/units/${unit.id}/price`, { price_per_m2_minor: minor, scope: 'UNIT' });
      setSavedPrice(minor);
      onUpdated?.();
    } catch (err) {
      setError(err.message || 'Не удалось сохранить цену');
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
      <section role="dialog" aria-modal="true" aria-labelledby="nonres-title" className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="nonres-title" className="text-lg font-bold">{getUnitKindLabel(unit)} №{unit.unit_number}</h2>
            <p className="mt-1 text-sm text-slate-500">{buildingName} · Этаж {floorNumber}</p>
          </div>
          <button type="button" onClick={requestClose} aria-label="Закрыть" className="p-2"><X size={20} /></button>
        </div>
        <dl className="mt-6 grid grid-cols-2 gap-4 rounded-xl bg-slate-50 p-4">
          <div><dt className="text-xs text-slate-500">Площадь</dt><dd className="font-bold">{formatMeasure(area)} м²</dd></div>
          <div><dt className="text-xs text-slate-500">Статус</dt><dd className="font-bold">{status}</dd></div>
          <div><dt className="text-xs text-slate-500">Цена за м²</dt><dd className="font-bold">{savedPrice > 0 ? `${formatMeasure(savedPrice / 100)} ${currency}` : 'Не задана'}</dd></div>
          <div><dt className="text-xs text-slate-500">Стоимость</dt><dd className="font-bold">{savedPrice > 0 ? `${formatMeasure(Math.round(area * savedPrice) / 100)} ${currency}` : 'Не задана'}</dd></div>
        </dl>
        {canEditPrice && (
          <form onSubmit={savePrice} className="mt-6 space-y-3">
            <label className="block text-sm font-medium">Цена за м², {currency}
              <input value={price} onChange={(event) => setPrice(event.target.value)} inputMode="decimal" className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2" />
            </label>
            <button disabled={busy} className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{busy ? 'Сохранение…' : 'Сохранить цену'}</button>
          </form>
        )}
        {error && <p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}
      </section>
    </div>
  );
};
