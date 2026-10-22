import React from 'react';

export const vehicleFields = [
  ['brand_model', 'Марка и модель', 160],
  ['production_year', 'Год выпуска', 4],
  ['color', 'Цвет', 80],
  ['registration_number', 'Госномер', 40],
  ['vin', 'VIN', 32],
  ['registration_certificate', 'Свидетельство о регистрации', 160],
  ['mileage_km', 'Пробег, км', 12],
  ['handover_date', 'Дата передачи автомобиля', 10, 'date'],
  ['condition', 'Техническое состояние и недостатки', 1000],
  ['accessories', 'Переданные ключи, документы и принадлежности', 1000],
  ['encumbrances', 'Залог, арест или споры — при наличии', 1000],
];

export const VehicleDetailsFields = ({ value, onChange }) => (
  <fieldset className="border-t border-amber-200 pt-3">
    <legend className="text-xs font-bold text-amber-900 px-1">Данные автомобиля для акта приёма-передачи</legend>
    <p className="text-[11px] text-slate-600 mb-3">Заполните при передаче автомобиля. Сведения сохранятся в договоре и автоматически появятся в акте. Если бартер не связан с автомобилем, оставьте поля пустыми.</p>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {vehicleFields.map(([key, label, limit, type = 'text']) => (
        <div key={key} className={limit === 1000 ? 'sm:col-span-2' : ''}>
          <label htmlFor={`vehicle-${key}`} className="block text-[11px] font-semibold text-amber-900 mb-1">{label}</label>
          <input id={`vehicle-${key}`} type={type} maxLength={limit}
            inputMode={['production_year', 'mileage_km'].includes(key) ? 'numeric' : undefined}
            value={value[key] || ''} onChange={e => onChange({ ...value, [key]: e.target.value })}
            className="w-full rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs outline-none focus:border-amber-500" />
        </div>
      ))}
    </div>
  </fieldset>
);
