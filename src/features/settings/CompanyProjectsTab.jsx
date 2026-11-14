import React, { useEffect, useState } from 'react';
import ProjectSetup from './ProjectSetup';
import ProjectReadiness from './ProjectReadiness';
import ProjectReminderSettings from './ProjectReminderSettings';
import { api } from '../../api/client';

const ROLE_LABELS = { PARTNER: 'Партнёр проекта', DIRECTOR: 'Директор объекта', ACCOUNTANT: 'Бухгалтер', MANAGER: 'Менеджер', CASHIER: 'Кассир', WAREHOUSE: 'Завсклад' };
const blank = () => ({ name: '', code: '', location: '', director_name: '', director_authority: '', partners: [], members: [], complex_ids: [] });
const editable = project => ({ ...blank(), ...Object.fromEntries(['id', 'name', 'code', 'location', 'director_name', 'director_authority', 'revision', 'partners', 'members', 'complex_ids'].filter(k => project[k] !== undefined).map(k => [k, project[k]])) });
const fieldClass = 'mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm';

export function CompanyProjectsTab() {
  const [registry, setRegistry] = useState(null);
  const [draft, setDraft] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [adminBusy,setAdminBusy]=useState(false),[adminEpoch,setAdminEpoch]=useState(0);
  async function configured(id){const r=await load();setDraft(d=>d?.id===id?editable(r.projects.find(p=>p.id===id)):d);setAdminEpoch(n=>n+1);}
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [dirty, setDirty] = useState(false);
  async function load() {
    const result = await api.get('/company-projects');
    setRegistry(result.data);
    return result.data;
  }
  useEffect(() => {
    let active = true;
    api.get('/company-projects').then(r => { if (active) setRegistry(r.data); }).catch(e => { if (active) setError(e.message); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  function select(project) {
    if (dirty && !window.confirm('Несохранённые изменения будут потеряны. Перейти к другому проекту?')) return;
    setDraft(project ? editable(project) : blank()); setDirty(false); setError(''); setMessage('');
  }
  function change(update) { setDraft(current => ({ ...current, ...update })); setDirty(true); setMessage(''); }
  async function save(event) {
    event.preventDefault(); setError(''); setMessage('');
    const shares = draft.partners.reduce((sum, p) => sum + Math.round(Number(p.share_percent) * 100), 0);
    if (draft.partners.length && shares !== 10000) { setError('Сумма долей партнёров должна составлять 100%'); return; }
    if (draft.partners.some(p => !p.name.trim() || Number(p.share_percent) <= 0)) { setError('Укажите ФИО и положительную долю каждого партнёра'); return; }
    if (draft.members.some(m => !m.user_id)) { setError('Выберите сотрудника в каждом назначении'); return; }
    setSaving(true);
    const { id, ...body } = draft;
    body.partners = body.partners.map(p => ({ ...p, share_percent: Number(p.share_percent) }));
    body.members = body.members.map(m => ({ ...m, user_id: Number(m.user_id) }));
    try {
      const result = id ? await api.put(`/company-projects/${id}`, body) : await api.post('/company-projects', body);
      setDraft(editable(result.data.project)); setDirty(false);
      setMessage('Проект сохранён. Назначения сотрудников подготовлены; действующие права CRM не изменены.');
      try { await load(); } catch { setError('Проект сохранён, но список не обновился. Обновите раздел перед следующим изменением.'); }
    } catch (e) { setError(e.message); } finally { setSaving(false); }
  }
  function field(label, key, extra = {}) {
    return <label className="block text-sm font-semibold text-slate-700">{label}<input className={fieldClass} value={draft[key]} onChange={e => change({ [key]: e.target.value })} {...extra}/></label>;
  }
  if (loading) return <p role="status">Загрузка проектов компании…</p>;
  if (!registry) return <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-5">{error || 'Раздел ещё не включён'}</div>;
  return <section className="space-y-5">
    <div><h2 className="text-xl font-extrabold text-slate-900">Проекты компании</h2><p className="mt-1 text-sm text-slate-600">{registry.company.name} · Отдельный проект для каждого состава партнёров и самостоятельного учёта.</p></div>
    <div role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><strong>Подготовка разделения данных.</strong> Здесь сохраняется структура проектов. Назначения сотрудников пока не предоставляют и не ограничивают доступ к рабочим данным. Подключение новых объектов к общей CRM — после проверки изоляции.</div>
    <div className="grid gap-5 lg:grid-cols-[270px_minmax(0,1fr)]">
      <nav aria-label="Проекты компании" className="space-y-2">{registry.projects.map(p => <button type="button" disabled={saving||adminBusy} key={p.id} onClick={() => select(p)} className={`w-full rounded-xl border p-4 text-left ${draft?.id === p.id ? 'border-blue-600 bg-blue-50' : 'bg-white hover:border-blue-300'}`}><span className="block font-bold">{p.name}</span><span className="block text-xs text-slate-500 mt-1">{p.location || 'Адрес не указан'} · {p.complex_ids.length} ЖК</span><span className="mt-2 block text-xs text-amber-700">Подготовка</span></button>)}<button type="button" disabled={saving||adminBusy} className="w-full rounded-xl bg-blue-600 p-3 font-bold text-white" onClick={() => select(null)}>+ Добавить проект</button></nav>
      {!draft ? <div className="rounded-2xl border border-dashed p-8 text-slate-500">Выберите проект слева, чтобы настроить директора, партнёров, ЖК и сотрудников.</div> : <form onSubmit={save} className="rounded-2xl border bg-white p-5 space-y-6">
        <fieldset disabled={saving||adminBusy} className="space-y-6 disabled:opacity-60">
          <div className="grid sm:grid-cols-2 gap-4">{field('Название проекта', 'name', { required: true, maxLength: 200 })}{field('Код проекта', 'code', { required: true, maxLength: 40, pattern: '[A-Z][A-Z0-9_-]*', title: 'Латинские заглавные буквы, цифры, дефис' })}{field('Город / район / адрес', 'location', { maxLength: 300 })}{field('ФИО директора объекта', 'director_name', { maxLength: 200 })}</div>
          {field('Основание полномочий директора', 'director_authority', { maxLength: 1000, placeholder: 'Документ, номер и дата' })}
          <p className="text-xs text-slate-500">Договоры оформляются от ООО «ТОЗОН». Подстановка директора проекта в договоры будет подключена при запуске разделения; существующие документы не изменяются.</p>
          <div className="space-y-3"><h3 className="font-bold">Партнёры и доли участия</h3><p className="text-xs text-slate-500">Укажите реальные ФИО. Сумма долей — 100%. Доля участия не создаёт платёж или начисление прибыли.</p>
            {draft.partners.map((p, i) => <div key={i} className="grid grid-cols-[minmax(0,1fr)_100px_auto] gap-2 items-end"><label className="text-sm">ФИО партнёра<input aria-label={`Партнёр ${i + 1}`} required maxLength={200} className={fieldClass} value={p.name} onChange={e => change({ partners: draft.partners.map((x, j) => i === j ? { ...x, name: e.target.value } : x) })}/></label><label className="text-sm">Доля, %<input aria-label={`Доля партнёра ${i + 1}`} required type="number" min="0.01" max="100" step="0.01" className={fieldClass} value={p.share_percent} onChange={e => change({ partners: draft.partners.map((x, j) => i === j ? { ...x, share_percent: e.target.value } : x) })}/></label><button type="button" className="p-2 text-rose-600" aria-label={`Убрать партнёра ${i + 1}`} onClick={() => change({ partners: draft.partners.filter((_, j) => i !== j) })}>Убрать</button></div>)}
            <button type="button" className="text-sm font-bold text-blue-600" onClick={() => change({ partners: [...draft.partners, { name: '', share_percent: '' }] })}>+ Добавить партнёра</button>
            <p className="text-sm">Всего: {draft.partners.reduce((sum, p) => sum + Math.round(Number(p.share_percent) * 100), 0) / 100}%</p>
          </div>
          <div className="space-y-2"><h3 className="font-bold">Жилые комплексы проекта</h3><p className="text-xs text-slate-500">Один ЖК может принадлежать только одному проекту. Привязка сохраняет все существующие номера и записи.</p>{registry.complexes.map(c => {
            const owner = registry.projects.find(p => p.id !== draft.id && p.complex_ids.includes(c.id));
            return <label key={c.id} className="flex items-center gap-2 rounded-lg border p-3 text-sm"><input type="checkbox" disabled={!!owner} checked={draft.complex_ids.includes(c.id)} onChange={e => change({ complex_ids: e.target.checked ? [...draft.complex_ids, c.id] : draft.complex_ids.filter(id => id !== c.id) })}/>{c.name}{owner && <span className="text-xs text-slate-500">— {owner.name}</span>}</label>;
          })}</div>
          <div className="space-y-3"><h3 className="font-bold">Планируемый состав сотрудников</h3><p className="text-xs text-slate-500">Назначения не меняют текущие роли и доступ сотрудников. Для одного сотрудника можно подготовить участие в нескольких проектах.</p>{draft.members.map((m, i) => <div key={i} className="grid sm:grid-cols-[1fr_1fr_auto] gap-2"><select aria-label={`Сотрудник ${i + 1}`} required className={fieldClass} value={m.user_id} onChange={e => change({ members: draft.members.map((x, j) => i === j ? { ...x, user_id: Number(e.target.value) } : x) })}><option value="">Выберите сотрудника</option>{registry.users.filter(u => u.id === m.user_id || !draft.members.some(x => x.user_id === u.id)).map(u => <option key={u.id} value={u.id}>{u.name}</option>)}</select><select aria-label={`Роль в проекте ${i + 1}`} className={fieldClass} value={m.project_role} onChange={e => change({ members: draft.members.map((x, j) => i === j ? { ...x, project_role: e.target.value } : x) })}>{Object.entries(ROLE_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select><button type="button" className="p-2 text-rose-600" aria-label={`Убрать сотрудника ${i + 1}`} onClick={() => change({ members: draft.members.filter((_, j) => i !== j) })}>Убрать</button></div>)}<button type="button" className="text-sm font-bold text-blue-600" onClick={() => change({ members: [...draft.members, { user_id: '', project_role: 'MANAGER' }] })}>+ Назначить сотрудника</button></div>
        </fieldset>
        {error && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}{message && <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">{message}</p>}
        <button disabled={saving || adminBusy || !dirty} className="rounded-xl bg-blue-600 px-5 py-3 font-bold text-white disabled:opacity-40">{saving ? 'Сохранение…' : 'Сохранить проект'}</button>
      </form>}
      {draft?.id&&<ProjectSetup key={`${draft.id}:${draft.revision}`} projectId={draft.id} dirty={dirty||saving} onConfigured={configured} onBusy={setAdminBusy}/>}
      {draft?.id&&<ProjectReadiness key={`${draft.id}:${draft.revision}:${adminEpoch}`}  projectId={draft.id} revision={draft.revision} dirty={dirty}/>}
      {draft?.id&&import.meta.env.VITE_PROJECT_INTERNAL_REMINDERS_ENABLED==='true'&&<ProjectReminderSettings key={draft.id} projectId={draft.id}/>}
    </div>
  </section>;
}
