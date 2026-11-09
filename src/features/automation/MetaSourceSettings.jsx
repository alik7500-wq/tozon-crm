import React, { useEffect, useRef, useState } from 'react';
import { Camera, MessageSquare, Settings, X } from 'lucide-react';
import { api } from '../../api/client';
import { useAuth } from '../auth/AuthContext';

const sections = {
  INSTAGRAM: [['INSTAGRAM_MESSAGES', 'Сообщения и истории'], ['INSTAGRAM_COMMENTS', 'Комментарии']],
  FACEBOOK: [['FACEBOOK_MESSAGES', 'Сообщения'], ['FACEBOOK_COMMENTS', 'Комментарии'], ['FACEBOOK_FORM', 'Формы Facebook']]
};

function SourceRow({ source, projects, disabled, onSaved }) {
  const [projectId, setProjectId] = useState(source.project_id ? String(source.project_id) : '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const current = source.project_id ? String(source.project_id) : '';
  async function save() {
    setSaving(true); setError(''); setSaved(false);
    try {
      await api.patch(`/integrations/meta/sources/${encodeURIComponent(source.id)}`, { projectId: projectId || null });
      onSaved(source.id, projectId || null);
      setSaved(true);
    } catch { setError('Не удалось сохранить привязку. Обновите список и повторите.'); }
    finally { setSaving(false); }
  }
  return <div className="space-y-2 border-b border-slate-100 py-3">
    <div className="grid items-center gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
      <div className="min-w-0"><div className="break-words font-medium">{source.name}</div>
        {source.username && <div className="text-xs text-slate-500">@{source.username}</div>}
        {!source.available && <div className="text-xs text-amber-700">Доступ больше не предоставлен</div>}
      </div>
      <select aria-label={`Объект для ${source.name}`} value={projectId} disabled={disabled || saving || !source.available}
        onChange={event => { setProjectId(event.target.value); setSaved(false); }} className="min-w-0 rounded-lg border border-slate-300 bg-white p-2 text-sm disabled:opacity-50">
        <option value="">Не распределён</option>
        {current && !projects.some(project => String(project.id) === current) && <option value={current} disabled>Прежний объект недоступен</option>}
        {projects.map(project => <option key={project.id} value={String(project.id)}>{project.name}</option>)}
      </select>
      <button type="button" onClick={save} disabled={disabled || saving || !source.available || current === projectId}
        className="rounded-lg bg-blue-600 px-3 py-2 text-sm text-white disabled:opacity-40">{saving ? 'Сохранение…' : 'Сохранить'}</button>
    </div>
    {saved && <p role="status" className="text-xs text-emerald-700">Привязка сохранена</p>}
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
  </div>;
}

export function MetaSourceDialog({ provider, onClose }) {
  const dialog = useRef(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);
  const [version, setVersion] = useState(0);
  const title = provider === 'INSTAGRAM' ? 'Instagram' : 'Facebook';
  useEffect(() => { dialog.current?.showModal(); }, []);
  useEffect(() => {
    let active = true;
    api.get('/integrations/meta/sources').then(result => {
      if (active) setData(result.data);
    }).catch(() => { if (active) setError('Не удалось загрузить настройки Meta.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [version]);
  function reload() {
    setLoading(true); setError(''); setData(null); setVersion(value => value + 1);
  }
  async function connect() {
    setBusy(true); setError('');
    try {
      const result = await api.post('/integrations/meta/connect');
      const url = new URL(result.data.authorizationUrl);
      if (url.origin !== 'https://www.facebook.com' || url.pathname !== '/dialog/oauth') throw new Error('Invalid OAuth URL');
      window.location.assign(url.toString());
    } catch { setError('Не удалось начать подключение Meta. Настройки подключения пока недоступны.'); setBusy(false); }
  }
  async function disconnect() {
    setBusy(true); setError('');
    try {
      await api.delete('/integrations/meta/connection');
      setConfirmDisconnect(false); reload();
    } catch { setError('Не удалось отключить учётную запись.'); }
    finally { setBusy(false); }
  }
  function onSaved(id, projectId) {
    setData(previous => ({ ...previous, sources: previous.sources.map(source => source.id === id ? { ...source, project_id: projectId } : source) }));
  }
  const connection = data?.connection;
  return <dialog ref={dialog} onCancel={onClose} aria-labelledby="meta-settings-title"
    className="m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-3xl rounded-2xl border-0 bg-white p-0 text-slate-900 shadow-2xl backdrop:bg-slate-900/50">
    <header className="sticky top-0 z-10 flex items-center justify-between border-b bg-white p-5">
      <h2 id="meta-settings-title" className="text-xl font-bold">{title}: настройки источников</h2>
      <button type="button" aria-label="Закрыть настройки" onClick={onClose} className="rounded-lg p-2 hover:bg-slate-100"><X className="h-5 w-5" /></button>
    </header>
    <div className="space-y-5 p-5">
      {loading && <p role="status">Загрузка настроек…</p>}
      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {!loading && !data && <button type="button" onClick={reload} className="rounded-lg border px-3 py-2">Повторить загрузку</button>}
      {data?.enabled === false && <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">Подключение новых источников пока недоступно. Текущие интеграции продолжают работать отдельно.</p>}
      {data?.enabled && <>
        <div className="rounded-xl border border-slate-200 p-4">
          <p className="font-semibold">{connection?.display_name || 'Учётная запись Meta не подключена'}</p>
          <p className="mt-1 text-sm text-slate-600">{connection?.connected ? 'Авторизация подтверждена. Выберите ЖК для каждого источника.' : connection?.needsReconnect ? 'Срок доступа истёк. Переподключите учётную запись.' : 'Подключите учётную запись и выберите доступные источники.'}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" disabled={busy} onClick={connect} className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white disabled:opacity-50">{busy ? 'Подождите…' : connection?.connected ? 'Переподключить / добавить источники' : 'Подключить'}</button>
            {connection?.status === 'connected' && <button type="button" disabled={busy} onClick={() => setConfirmDisconnect(true)} className="rounded-lg border px-4 py-2 text-sm text-red-700">Отключить</button>}
          </div>
          {confirmDisconnect && <div className="mt-3 rounded-lg bg-amber-50 p-3 text-sm">
            <p>Отключить общую учётную запись Meta и снять все её привязки Instagram и Facebook к объектам?</p>
            <div className="mt-2 flex gap-3"><button type="button" disabled={busy} onClick={disconnect} className="font-semibold text-red-700">Подтвердить отключение</button><button type="button" onClick={() => setConfirmDisconnect(false)}>Отмена</button></div>
          </div>}
        </div>
        <p className="text-sm text-slate-600">Один источник можно связать с одним ЖК. «Не распределён» снимает привязку. Приём обращений проверяется отдельно после подключения.</p>
        {sections[provider].map(([channel, label]) => {
          const sources = (data.sources || []).filter(source => source.channel === channel);
          return <section key={channel} aria-label={label} className="space-y-1">
            <h3 className="font-bold">{label}</h3>
            {!sources.length && <p className="py-2 text-sm text-slate-500">Доступных источников нет. Предоставьте доступ при подключении Meta.</p>}
            {sources.map(source => <SourceRow key={source.id} source={source} projects={data.projects || []} disabled={busy || !connection?.connected} onSaved={onSaved} />)}
          </section>;
        })}
      </>}
    </div>
  </dialog>;
}

export function MetaSourceSettings() {
  const { user } = useAuth();
  const [provider, setProvider] = useState(null);
  const permissions = user?.permissions || [];
  const allowed = ['ADMIN', 'DIRECTOR'].includes(user?.role) &&
    (!permissions.includes('access.v2') || permissions.includes('automation.view') && permissions.includes('automation.manage'));
  if (!allowed) return null;
  return <>
    <section aria-label="Источники Instagram и Facebook" className="grid gap-4 sm:grid-cols-2">
      {[['INSTAGRAM', 'Instagram', Camera, 'from-pink-600 to-purple-700'], ['FACEBOOK', 'Facebook', MessageSquare, 'from-blue-600 to-blue-800']].map(([key, label, Icon, gradient]) =>
        <div key={key} className={`rounded-2xl bg-linear-to-br ${gradient} p-5 text-white`}>
          <h2 className="flex items-center gap-2 text-lg font-bold"><Icon className="h-6 w-6" />{label}</h2>
          <p className="mb-4 mt-2 text-sm text-white/90">Аккаунты, {key === 'INSTAGRAM' ? 'сообщения и комментарии' : 'сообщения, комментарии и формы'}. Распределение по объектам строительства.</p>
          <button type="button" onClick={() => setProvider(key)} className="inline-flex items-center gap-2 rounded-lg border border-white/50 px-4 py-2 text-sm hover:bg-white/10"><Settings className="h-4 w-4" />Настроить {label}</button>
        </div>)}
    </section>
    {provider && <MetaSourceDialog provider={provider} onClose={() => setProvider(null)} />}
  </>;
}
