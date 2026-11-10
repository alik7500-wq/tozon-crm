import React, { useEffect, useState } from 'react';
import WorkspaceDocuments from './WorkspaceDocuments';
import WorkspaceOperationForm from './WorkspaceOperationForm';
import { operationLabels } from './workspaceOperations';
import { api } from '../../api/client';
import { useAuth } from '../auth/AuthContext';

const resources = {
  complexes: { label: 'Жилые комплексы', permission: 'inventory.view', columns: [['name','ЖК'],['code','Код'],['address','Адрес']] },
  units: { label: 'Помещения', permission: 'inventory.view', columns: [['unit_number','Номер'],['complex_name','ЖК'],['area_m2_x100','Площадь, м²'],['status','Статус']] },
  leads: { label: 'Клиенты и лиды', permission: 'leads.view', columns: [['full_name','ФИО'],['phone','Телефон'],['status','Статус']] },
  deals: { label: 'Договоры', permission: 'deals.view', columns: [['contract_number','Договор'],['deal_date','Дата'],['final_price_minor','Стоимость'],['currency','Валюта'],['status','Статус']] },
  payments: { label: 'Поступления', permission: 'finance.payments', columns: [['id','№ записи'],['payment_date','Дата'],['amount_minor','Сумма'],['currency','Валюта'],['status','Статус']] },
  schedules: { label: 'Графики платежей', permission: 'finance.payments', columns: [['deal_id','Договор, ID'],['due_date','Дата платежа'],['amount_minor','План'],['paid_amount_minor','Оплачено'],['currency','Валюта'],['status','Статус']] },
  expenses: { label: 'Расходы', permission: 'finance.expenses', columns: [['id','№ записи'],['expense_date','Дата'],['category','Статья'],['amount_minor','Сумма'],['currency','Валюта'],['status','Статус']] },
  warehouses: { label: 'Склады', permission: 'construction.stock', columns: [['name','Склад'],['active','Действующий']] },
};
const format = (key, value) => value == null ? '—' : typeof value === 'boolean' ? (value ? 'Да' : 'Нет') : key.endsWith('_minor') || key === 'area_m2_x100' ? (Number(value) / 100).toLocaleString('ru-RU', { maximumFractionDigits: 2 }) : String(value);

function useWorkspaceRead(path, params, nonce) {
  const requestKey = JSON.stringify({ path, params, nonce });
  const [result, setResult] = useState(null);
  useEffect(() => {
    const request = JSON.parse(requestKey);
    if (!request.path) return;
    const controller = new AbortController(); let current = true;
    api.get(request.path, { params: request.params, signal: controller.signal })
      .then(r => { if (current) setResult({ key: requestKey, data: r.data, error: '' }); })
      .catch(e => { if (current) setResult({ key: requestKey, data: null, error: e.message }); });
    return () => { current = false; controller.abort(); };
  }, [requestKey]);
  return result?.key === requestKey ? { ...result, loading: false } : { data: null, error: '', loading: !!path };
}

function WorkspaceRecords({ project, resource, canDocuments, onDocument }) {
  const [after, setAfter] = useState('');
  const [reload, setReload] = useState(0);
  const { data, loading, error } = useWorkspaceRead(`/project-workspace/${project}/${resource}`, { after, limit: 50 }, reload);
  const page = data || { records: [], has_more: false };
  const config = resources[resource];
  return <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
    <div className="flex justify-between items-center"><h2 className="font-bold text-lg">{config.label}</h2><button type="button" disabled={loading} onClick={() => setReload(n => n + 1)} className="text-sm font-bold text-blue-600 disabled:opacity-50">Обновить данные</button></div>
    {loading ? <p role="status">Загрузка данных выбранного проекта…</p> : error ? <p role="alert" className="rounded-xl bg-rose-50 p-4 text-rose-700">{error}</p> : !page.records.length ? <p className="text-slate-500">Нет записей в этом разделе выбранного проекта.</p> : <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr>{config.columns.map(([key,label]) => <th key={key} className="border-b p-3 text-slate-500">{label}</th>)}{canDocuments&&<th className="border-b p-3">Документы</th>}</tr></thead><tbody>{page.records.map(row => <tr key={row.id}>{config.columns.map(([key]) => <td key={key} className="border-b border-slate-100 p-3">{format(key,row[key])}</td>)}{canDocuments&&<td className="border-b p-3"><button type="button" className="font-bold text-blue-600" onClick={()=>onDocument(row.id)}>Документы № {row.contract_number||row.id}</button></td>}</tr>)}</tbody></table></div>}
    <div className="flex gap-4 text-sm"><button type="button" disabled={loading || !after} onClick={() => setAfter('')} className="font-bold text-blue-600 disabled:text-slate-400">В начало</button><button type="button" disabled={loading || !page.has_more || !page.records.length} onClick={() => setAfter(String(page.records.at(-1).id))} className="font-bold text-blue-600 disabled:text-slate-400">Следующая страница</button></div>
  </div>;
}

function WorkspaceOperations({ project, version, onOpen, disabled }) {
  const { data, loading, error } = useWorkspaceRead(`/project-workspace/${project}/options`, {}, version);
  const commands = (data?.commands || []).filter(kind => operationLabels[kind]);
  return <section aria-label="Операции проекта" className="rounded-xl border bg-white p-4">
    {loading ? <p role="status">Проверка разрешённых операций…</p> : error ? <p role="alert">{error}</p> : commands.length ? <div className="flex flex-wrap gap-2">{commands.map(kind => <button key={kind} type="button" disabled={disabled} onClick={() => onOpen({ kind, signerConfigured: data.signer_configured, signerName: data.signer_name })} className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white">{operationLabels[kind]}</button>)}</div> : <p className="text-sm text-slate-500">Для этой учётной записи доступен только просмотр.</p>}
  </section>;
}

export default function ProjectWorkspacePage() {
  const { user, logout } = useAuth();
  const [projectId, setProjectId] = useState('');
  const [resource, setResource] = useState('');
  const [version, setVersion] = useState(0);
  const [operation, setOperation] = useState(null);
  const projectOnly = user?.permissions?.includes('company.project-only');
  const { data: context, loading, error } = useWorkspaceRead(projectOnly ? '/project-workspace/projects' : null, {}, `${user?.id}:${version}`);
  useEffect(() => {
    if (operation) return;
    const refresh = () => { if (document.visibilityState === 'visible') setVersion(n => n + 1); };
    window.addEventListener('focus', refresh); document.addEventListener('visibilitychange', refresh);
    const timer = window.setInterval(refresh, 30000);
    return () => { window.removeEventListener('focus', refresh); document.removeEventListener('visibilitychange', refresh); window.clearInterval(timer); };
  }, [operation]);
  if (!projectOnly) return <p role="alert" className="p-8">Рабочее пространство доступно только назначенной проектной учётной записи.</p>;
  const project = context?.projects.find(p => p.id === projectId) || context?.projects[0];
  const available = Object.entries(resources).filter(([,r]) => project?.sections.includes(r.permission));
  const currentResource = available.some(([key]) => key === resource) ? resource : available[0]?.[0];
  return <main className="min-h-screen bg-slate-50 p-4 sm:p-8 text-slate-900"><div className="max-w-7xl mx-auto space-y-5">
    <div className="space-y-5" inert={!!operation}>
    <header className="flex justify-between items-start gap-4"><div><p className="text-blue-700 font-extrabold">TOZON CRM</p><h1 className="text-2xl font-extrabold mt-1">Рабочее пространство проекта</h1><p className="text-sm text-slate-500 mt-1">{user.name}</p></div><button type="button" disabled={!!operation} onClick={logout} className="rounded-xl border bg-white px-4 py-2 font-bold">Выйти</button></header>
    <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">Тестовое пространство проекта. Доступные операции определяются Вашими правами. Доступ к документам выдаётся отдельно. Общие разделы CRM пока закрыты.</p>
    {loading ? <p role="status">Проверка доступа к проектам…</p> : error ? <div role="alert" className="rounded-xl bg-rose-50 p-4 text-rose-700">{error}<button type="button" className="block mt-3 font-bold underline" onClick={() => setVersion(n => n + 1)}>Повторить проверку доступа</button></div> : !project ? <p role="status" className="rounded-xl border bg-white p-5">Вам не назначен доступ ни к одному проекту. Обратитесь к администратору компании.</p> : <>
      <label className="block font-semibold">Проект<select aria-label="Рабочий проект" disabled={!!operation} className="block mt-2 w-full sm:max-w-lg rounded-xl border border-slate-300 bg-white p-3" value={project.id} onChange={e => { setProjectId(e.target.value); setResource(''); }}>{context.projects.map(p => <option key={p.id} value={p.id}>{p.name} · {p.location}</option>)}</select></label>
      <WorkspaceOperations key={`${project.id}:${version}`} project={project.id} version={version} onOpen={setOperation} disabled={!!operation}/>
      <nav aria-label="Разделы проекта" className="flex flex-wrap gap-2">{available.map(([key,r]) => <button key={key} type="button" disabled={!!operation} aria-pressed={currentResource===key} onClick={() => setResource(key)} className={`rounded-xl px-4 py-2 text-sm font-bold ${currentResource===key ? 'bg-blue-600 text-white' : 'border bg-white text-slate-600'}`}>{r.label}</button>)}</nav>
      {currentResource ? <WorkspaceRecords key={`${version}:${project.id}:${currentResource}`} project={project.id} resource={currentResource} canDocuments={currentResource==='deals'&&project.sections.includes('documents.print')} onDocument={dealId=>setOperation({kind:'DOCUMENTS',dealId})}/> : <p className="rounded-xl border bg-white p-5">Для проекта не назначены разрешённые разделы.</p>}
    </>}
    </div>
    {operation && project && operation.kind==='DOCUMENTS' && <WorkspaceDocuments key={`${user.id}:${project.id}:${operation.dealId}`} project={project.id} dealId={operation.dealId} onClose={()=>setOperation(null)}/>}
    {operation && project && operation.kind!=='DOCUMENTS' && <WorkspaceOperationForm key={`${user.id}:${project.id}:${operation.kind}`} project={project.id} {...operation} onClose={() => setOperation(null)} onComplete={() => { setOperation(null); setVersion(n => n + 1); }}/>}
  </div></main>;
}
