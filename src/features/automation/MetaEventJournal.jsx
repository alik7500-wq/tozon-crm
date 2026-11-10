import React, { useEffect, useState } from 'react';
import { api } from '../../api/client';
const labels = { UNASSIGNED: 'Не распределено', QUEUED: 'Ожидает обработки', PROCESSING: 'Обрабатывается', RETRY: 'Повторная попытка',
  DONE: 'Получено', NEEDS_REVIEW: 'Нужна проверка', FAILED: 'Ошибка обработки', PAUSED: 'Приём остановлен' };
const errors = { PHONE_MISSING_OR_INVALID: 'В форме нет корректного телефона. Лид не создан.', FORM_ID_MISMATCH: 'Meta вернула данные другой формы. Лид не создан.',
  CONTACT_REVIEW: 'Найден архивный или неоднозначный контакт в этом ЖК. Требуется проверка.',
  META_FORM_RETRIEVAL_FAILED: 'Не удалось получить данные формы из Meta.', RETRY_LIMIT: 'Повторные попытки исчерпаны.',
  SOURCE_DISCONNECTED: 'Учётная запись отключена.', SOURCE_UNAVAILABLE: 'Источник или объект недоступен.' };

export function MetaEventJournal({ provider, sources, projects, formLeadsEnabled }) {
  const [state, setState] = useState({ loading: true, events: [], error: '' });
  const [version, setVersion] = useState(0);
  const [filter, setFilter] = useState('ALL');
  const [busy, setBusy] = useState(null);
  useEffect(() => {
    let active = true;
    api.get('/integrations/meta/events').then(result => {
      if (active) setState({ loading: false, events: result.data.events || [], error: '' });
    }).catch(() => { if (active) setState({ loading: false, events: [], error: 'Не удалось загрузить обращения. Повторите загрузку.' }); });
    return () => { active = false; };
  }, [version]);
  function refresh() { setState(previous => ({ ...previous, loading: true, error: '' })); setVersion(value => value + 1); }
  async function assign(eventId, expectedProjectId) {
    setBusy(eventId);
    try { await api.post(`/integrations/meta/events/${encodeURIComponent(eventId)}/assign`, { expectedProjectId: String(expectedProjectId) }); refresh(); }
    catch { setState(previous => ({ ...previous, error: 'Не удалось распределить обращение. Проверьте выбранный ЖК у источника.' })); }
    finally { setBusy(null); }
  }
  const events = state.events.filter(event => event.channel.startsWith(provider + '_') &&
    (filter === 'ALL' || filter === 'UNASSIGNED' && event.status === 'UNASSIGNED' || String(event.project_id) === filter));
  return <section aria-label="Журнал обращений" className="space-y-3">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h3 className="font-bold">Последние обращения</h3>
      <button type="button" disabled={state.loading} onClick={refresh} className="rounded-lg border px-3 py-2 text-sm disabled:opacity-50">Обновить обращения</button>
    </div>
    <select aria-label="Фильтр обращений по ЖК" value={filter} onChange={event => setFilter(event.target.value)} className="w-full rounded-lg border border-slate-300 bg-white p-2 text-sm">
      <option value="ALL">Все доступные ЖК</option><option value="UNASSIGNED">Нераспределённые</option>
      {projects.map(project => <option key={project.id} value={String(project.id)}>{project.name}</option>)}
    </select>
    <p className="text-xs text-slate-500">Показаны последние 100 событий Вашего подключения. Сообщения и комментарии сохраняются без создания клиента с вымышленным телефоном.</p>
    {!formLeadsEnabled && provider === 'FACEBOOK' && <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">Автоматическое создание лидов из форм ещё не включено. Полученные заявки сохраняются в очереди.</p>}
    {state.loading && <p role="status" className="text-sm">Загрузка обращений…</p>}
    {state.error && <p role="alert" className="text-sm text-red-700">{state.error}</p>}
    {!state.loading && !state.error && events.length === 0 && <p className="text-sm text-slate-500">Обращений по выбранному фильтру пока нет.</p>}
    {!state.loading && events.map(event => {
      const source = sources.find(item => item.id === event.source_id);
      const target = projects.find(project => String(project.id) === String(source?.project_id));
      return <article key={event.id} className="space-y-2 rounded-xl border border-slate-200 p-3">
        <div className="flex flex-wrap justify-between gap-2 text-sm"><span className="font-semibold">{event.meta_project_sources?.name || 'Источник Meta'}</span>
          <span className={event.status === 'DONE' ? 'text-emerald-700' : 'text-amber-800'}>{event.lead_id ? 'Передано в лиды' : labels[event.status] || 'Неизвестный статус'}</span></div>
        <p className="text-xs text-slate-500">{event.projects?.name || 'ЖК не выбран'} · {new Date(event.received_at).toLocaleString('ru-RU')}</p>
        {event.payload.from_name && <p className="text-sm font-medium">{event.payload.from_name}</p>}
        <p className="whitespace-pre-wrap break-words text-sm">{event.payload.text || (event.channel === 'FACEBOOK_FORM' ? 'Заявка из Facebook-формы' : event.payload.has_attachments ? 'Сообщение с вложением' : 'Обращение без текста')}</p>
        {event.error_code && <p className="text-sm text-amber-800">{errors[event.error_code] || 'Требуется проверка обращения.'}</p>}
        {event.lead_id && <a href={`/leads?leadId=${encodeURIComponent(event.lead_id)}`} className="inline-block text-sm font-semibold text-blue-700">Открыть лид</a>}
        {['UNASSIGNED','PAUSED','FAILED','NEEDS_REVIEW'].includes(event.status) && target && source?.available &&
          (!event.project_id || String(event.project_id) === String(target.id)) && <button type="button" disabled={busy === event.id} onClick={() => assign(event.id, target.id)}
          className="rounded-lg bg-blue-600 px-3 py-2 text-sm text-white disabled:opacity-50">{busy === event.id ? 'Обработка…' : event.status === 'UNASSIGNED' ? `Принять в ${target.name}` : `Повторить обработку в ${target.name}`}</button>}
      </article>;
    })}
  </section>;
}
