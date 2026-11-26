import React, { useEffect, useState } from 'react';
import { api } from '../../api/client';

const initialForm = {
  kind: 'PRIMARY', agreement_number: '', signed_on: '', notary_office: '', basis: '', notes: ''
};
const errors = {
  AGREEMENT_CONFLICT: 'Соглашение с такими реквизитами или основное соглашение уже зарегистрировано.',
  RESETTLEMENT_NOT_DRAFT: 'Дело больше не находится в статусе черновика.',
  PRIMARY_AGREEMENT_REQUIRED: 'Сначала зарегистрируйте основное соглашение.',
  INVALID_AGREEMENT_INPUT: 'Проверьте реквизиты и дату подписания.'
};

export function ResettlementAgreements({ caseId, canEdit }) {
  const [rows, setRows] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const url = '/resettlements/' + caseId + '/agreements';
  const hasPrimary = rows?.some(row => row.kind === 'PRIMARY');

  useEffect(() => {
    const controller = new AbortController();
    api.get(url, { signal: controller.signal }).then(response => {
      if (!controller.signal.aborted) setRows(response.data);
    }).catch(() => {
      if (!controller.signal.aborted) setError('Не удалось загрузить соглашения.');
    });
    return () => controller.abort();
  }, [url]);

  const save = async event => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const response = await api.post(url, { ...form, kind: hasPrimary ? 'ADDENDUM' : 'PRIMARY' });
      const saved = response.data;
      setRows(previous => [...previous.filter(row =>
        row.agreement_number !== saved.agreement_number || row.signed_on !== saved.signed_on
      ), saved]);
      setForm(initialForm);
    } catch (error) {
      setError(errors[error.message] ?? 'Не удалось зарегистрировать соглашение.');
    } finally {
      setSaving(false);
    }
  };

  return <section className="space-y-3 rounded-lg border p-4">
    <h3 className="font-medium">Нотариальные соглашения</h3>
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    {rows && !rows.length && <p className="text-sm text-slate-500">Соглашений пока нет.</p>}
    {rows?.map(row => <article key={row.agreement_number + row.signed_on} className="rounded-lg bg-slate-50 p-3 text-sm">
      <h4 className="font-medium">{row.kind === 'PRIMARY' ? 'Основное соглашение' : 'Дополнительное соглашение'} №{row.agreement_number}</h4>
      <p>Дата подписания {row.signed_on}</p>
      <p>Нотариальная контора {row.notary_office}</p>
      <p>Основание {row.basis}</p>
      {row.notes && <p>{row.notes}</p>}
      <p className="text-slate-500">Внесено {new Date(row.recorded_at).toLocaleString('ru-RU')}</p>
    </article>)}
    {canEdit && rows && <form onSubmit={save} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        {[
          ['agreement_number', 'Номер соглашения', 'text', 120],
          ['signed_on', 'Дата подписания соглашения', 'date'],
          ['notary_office', 'Нотариальная контора', 'text', 240],
          ['basis', 'Основание переселения', 'text', 2000],
          ['notes', 'Примечания', 'text', 2000]
        ].map(([name, label, type, maxLength]) => <label key={name} className="text-sm">{label}
          <input className="mt-1 block w-full rounded-lg border p-2" type={type} maxLength={maxLength}
            required={name !== 'notes'} disabled={saving} value={form[name]}
            onChange={event => setForm(previous => ({ ...previous, [name]: event.target.value }))} />
        </label>)}
      </div>
      <button className="rounded border px-3 py-2 text-sm" type="submit" disabled={saving}>
        {hasPrimary ? 'Зарегистрировать дополнительное соглашение' : 'Зарегистрировать основное соглашение'}
      </button>
    </form>}
  </section>;
}
