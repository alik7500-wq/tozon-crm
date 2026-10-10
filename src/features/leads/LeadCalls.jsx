import React, { useEffect, useRef, useState } from 'react';
import { api } from '../../api/client';

export function LeadCalls({ lead }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);
  const [dialing, setDialing] = useState(false);
  const generation = useRef(0);
  const dialLock = useRef(false);

  async function load() {
    const version = ++generation.current;
    setLoading(true); setError(''); setData(null);
    try {
      const result = await api.get(`/calls/leads/${lead.id}`);
      if (version === generation.current) setData(result.data);
    } catch (e) { if (version === generation.current) setError(e.message); }
    finally { if (version === generation.current) setLoading(false); }
  }
  useEffect(() => {
    setNotice(''); load();
    return () => { generation.current++; };
  }, [lead.id]);

  async function dial(secondary = false) {
    if (dialLock.current) return;
    const number = secondary ? lead.secondary_phone : lead.phone;
    if (!window.confirm(`Позвонить клиенту ${lead.full_name} на ${number} через ваш рабочий телефон?`)) return;
    dialLock.current = true; setDialing(true); setNotice('');
    try {
      const result = await api.post(`/calls/leads/${lead.id}/dial`, { secondary });
      setNotice(result.data.message);
    } catch (e) { setNotice(e.message); }
    finally { dialLock.current = false; setDialing(false); }
  }

  return <section className="space-y-4 text-sm">
    <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 space-y-3">
      <h4 className="font-bold">Звонки клиенту</h4>
      <p>Набор через ваш подключённый Android-телефон. История за последние 30 дней.</p>
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={dialing || !lead.phone} onClick={() => dial()} className="rounded-lg bg-blue-600 px-3 py-2 text-white disabled:opacity-50">{dialing ? 'Передача команды…' : `Позвонить ${lead.phone || ''}`}</button>
        {lead.secondary_phone && <button type="button" disabled={dialing} onClick={() => dial(true)} className="rounded-lg border px-3 py-2">Доп. номер</button>}
        <button type="button" disabled={loading} onClick={load} className="rounded-lg border px-3 py-2">Обновить историю</button>
      </div>
      {notice && <p role="status">{notice}</p>}
    </div>
    {loading && <p role="status">Загрузка истории…</p>}
    {error && <p role="alert" className="rounded-lg bg-amber-50 p-3 text-amber-900">{error}</p>}
    {data?.truncated && <p className="text-amber-700">Показана часть истории: достигнут лимит загрузки. Некоторые звонки могут отсутствовать.</p>}
    {data && !data.calls.length && <p>Звонков на номера этого клиента за выбранный период не найдено.</p>}
    {data?.calls.map(call => <article key={call.id} className="rounded-xl border p-3 space-y-2">
      <div className="flex flex-wrap justify-between gap-2"><strong>{call.direction === 'INCOMING' ? 'Входящий' : 'Исходящий'} · {call.answered ? 'Отвечен' : call.direction === 'INCOMING' ? 'Пропущен' : 'Без ответа'}</strong>
        <time>{new Date(call.start_time * 1000).toLocaleString('ru-RU', { timeZone: 'Asia/Dushanbe' })}</time></div>
      <p>{call.phone} · {call.duration} сек. · {call.employee}</p>
      {call.recording ? <audio controls preload="none" src={call.recording} className="w-full" /> : <p className="text-slate-500">Аудиозапись недоступна</p>}
    </article>)}
  </section>;
}
