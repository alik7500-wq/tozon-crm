import React, { useEffect, useState } from 'react';
import WorkspaceDocuments from './WorkspaceDocuments';
import WorkspaceOperationForm from './WorkspaceOperationForm';
import { operationLabels } from './workspaceOperations';
import {LayoutDashboard,Users,FileText,Building2,House,Wallet,CalendarDays,Package,Bell,ArrowDownLeft} from 'lucide-react';
import ProjectShell from './ProjectShell';
import WorkspaceOverview from './WorkspaceOverview';
import { api } from '../../api/client';
import { useAuth } from '../auth/AuthContext';

const resources = {
  reminders:{label:'Напоминания',permission:'finance.payments',also:'deals.view',columns:[['contract_number','Договор'],['client_name','Клиент'],['unit_number','Помещение'],['due_date','Срок платежа'],['remaining_minor','Остаток'],['currency','Валюта'],['reminder_kind','Событие'],['is_read','Прочитано']]},
  complexes: { label: 'Жилые комплексы', permission: 'inventory.view', columns: [['name','ЖК'],['code','Код'],['address','Адрес']] },
  units: { label: 'Помещения', permission: 'inventory.view', columns: [['unit_number','Номер'],['complex_name','ЖК'],['area_m2_x100','Площадь, м²'],['status','Статус']] },
  leads: { label: 'Клиенты и лиды', permission: 'leads.view', columns: [['full_name','ФИО'],['phone','Телефон'],['status','Статус']] },
  deals: { label: 'Договоры', permission: 'deals.view', columns: [['contract_number','Договор'],['deal_date','Дата'],['final_price_minor','Стоимость'],['currency','Валюта'],['status','Статус']] },
  payments: { label: 'Поступления', permission: 'finance.payments', columns: [['id','№ записи'],['payment_date','Дата'],['amount_minor','Сумма'],['currency','Валюта'],['status','Статус']] },
  schedules: { label: 'Графики платежей', permission: 'finance.payments', columns: [['deal_id','Договор, ID'],['due_date','Дата платежа'],['amount_minor','План'],['paid_amount_minor','Оплачено'],['currency','Валюта'],['status','Статус']] },
  expenses: { label: 'Расходы', permission: 'finance.expenses', columns: [['id','№ записи'],['expense_date','Дата'],['category','Статья'],['amount_minor','Сумма'],['currency','Валюта'],['status','Статус']] },
  warehouses: { label: 'Склады', permission: 'construction.stock', columns: [['name','Склад'],['active','Действующий']] },
};
const statusNames={AVAILABLE:'Свободна',RESERVED:'Забронирована',SOLD:'Продана',BLOCKED:'Недоступна',SIGNED:'Подписан',DRAFT:'Черновик',CANCELLED:'Отменён',TERMINATED:'Расторгнут',ACTIVE:'Действует',POSTED:'Проведён',VOIDED:'Аннулирован',UPCOMING:'Предстоит',PAID:'Оплачен',PARTIAL:'Частично',NEW:'Новый',WON:'Клиент',LOST:'Закрыт'};
const format = (key, value) => value == null ? '—' : key==='status' ? (statusNames[value]||String(value)) : key.endsWith('_date') ? String(value).slice(0,10).replace(/^(\d{4})-(\d{2})-(\d{2})$/,'$3.$2.$1') : key==='reminder_kind' ? (value==='OVERDUE'?'Просрочен':'Скоро платёж') : typeof value === 'boolean' ? (value ? 'Да' : 'Нет') : key.endsWith('_minor') || key === 'area_m2_x100' ? (Number(value) / 100).toLocaleString('ru-RU', { maximumFractionDigits: 2 }) : String(value);

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
  const [search,setSearch]=useState('');
  const [ackError,setAckError]=useState(''),[ackBusy,setAckBusy]=useState(false);
  async function acknowledge(id){if(ackBusy)return;setAckBusy(true);setAckError('');try{await api.post(`/project-workspace/${project}/reminders/${id}/read`,{});setReload(n=>n+1);}catch(e){setAckError(e.message);}finally{setAckBusy(false);}}
  const [after, setAfter] = useState('');
  const [reload, setReload] = useState(0);
  const { data, loading, error } = useWorkspaceRead(`/project-workspace/${project}/${resource}`, { after, limit: 50 }, reload);
  const page = data || { records: [], has_more: false };
  const config = resources[resource];
  const rows=page.records.filter(row=>config.columns.some(([key])=>format(key,row[key]).toLocaleLowerCase('ru-RU').includes(search.trim().toLocaleLowerCase('ru-RU'))));
  return <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
    <div className="flex justify-between items-center"><h2 className="font-bold text-lg">{config.label}</h2><button type="button" disabled={loading} onClick={() => setReload(n => n + 1)} className="text-sm font-bold text-blue-600 disabled:opacity-50">Обновить данные</button></div>
    <label className="block text-sm text-slate-500">Поиск на текущей странице<input type="search" aria-label="Поиск на текущей странице" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Введите имя, номер или значение" className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 sm:max-w-md"/></label>
    {loading ? <p role="status">Загрузка данных выбранного проекта…</p> : error ? <p role="alert" className="rounded-xl bg-rose-50 p-4 text-rose-700">{error}</p> : !rows.length ? <p className="text-slate-500">{search?'На этой странице совпадений нет.':'Нет записей в этом разделе выбранного проекта.'}</p> : <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr>{config.columns.map(([key,label]) => <th key={key} className="border-b p-3 text-slate-500">{label}</th>)}{canDocuments&&<th className="border-b p-3">Документы</th>}{resource==='reminders'&&<th className="border-b p-3">Отметка</th>}</tr></thead><tbody>{rows.map(row => <tr key={row.id}>{config.columns.map(([key]) => <td key={key} className="border-b border-slate-100 p-3">{format(key,row[key])}</td>)}{canDocuments&&<td className="border-b p-3"><button type="button" className="font-bold text-blue-600" onClick={()=>onDocument(row.id)}>Документы № {row.contract_number||row.id}</button></td>}{resource==='reminders'&&<td className="border-b p-3">{row.is_read?'Прочитано':<button type="button" disabled={ackBusy} onClick={()=>acknowledge(row.id)} className="text-blue-600">Отметить прочитанным</button>}</td>}</tr>)}</tbody></table></div>}
    {ackError&&<p role="alert" className="text-rose-700">{ackError}</p>}
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

const menuGroups=[
 {label:'CRM',items:[['leads',Users],['deals',FileText]]},
 {label:'Проекты',items:[['complexes',Building2],['units',House]]},
 {label:'Финансы',items:[['payments',Wallet],['schedules',CalendarDays],['expenses',ArrowDownLeft]]},
 {label:'Строительный учёт',items:[['warehouses',Package]]},
 {label:'Уведомления',items:[['reminders',Bell]]},
];
export default function ProjectWorkspacePage() {
 const {user,logout}=useAuth();
 const [projectId,setProjectId]=useState(''),[resource,setResource]=useState('overview'),[version,setVersion]=useState(0),[operation,setOperation]=useState(null);
 const projectOnly=user?.permissions?.includes('company.project-only');
 const {data:context,loading,error}=useWorkspaceRead(projectOnly?'/project-workspace/projects':null,{},`${user?.id}:${version}`);
 useEffect(()=>{
  if(operation)return;
  const refresh=()=>{if(document.visibilityState==='visible')setVersion(n=>n+1);};
  window.addEventListener('focus',refresh);document.addEventListener('visibilitychange',refresh);
  const timer=window.setInterval(refresh,30000);
  return ()=>{window.removeEventListener('focus',refresh);document.removeEventListener('visibilitychange',refresh);window.clearInterval(timer);};
 },[operation]);
 const project=context?.projects.find(p=>p.id===projectId)||context?.projects[0];
 const available=Object.entries(resources).filter(([,r])=>project?.sections.includes(r.permission)&&(!r.also||project.sections.includes(r.also))&&(r.label!=='Напоминания'||import.meta.env.VITE_PROJECT_INTERNAL_REMINDERS_ENABLED==='true'));
 const currentResource=available.some(([id])=>id===resource)?resource:'overview';
 const overview=useWorkspaceRead(project&&currentResource==='overview'?`/project-workspace/${project.id}/overview`:null,{},version);
 if(!projectOnly)return <p role="alert" className="p-8">Рабочее пространство доступно только назначенной проектной учётной записи.</p>;
 const groups=project?[{label:'',items:[{id:'overview',label:'Обзор',icon:LayoutDashboard}]},...menuGroups.map(g=>({label:g.label,items:g.items.filter(([id])=>available.some(([key])=>key===id)).map(([id,icon])=>({id,label:resources[id].label,icon}))})).filter(g=>g.items.length)]:[];
 const canDocuments=project?.sections.includes('documents.print')&&project?.sections.includes('deals.view');
 const openDocument=dealId=>setOperation({kind:'DOCUMENTS',dealId});
 return <>
  <ProjectShell user={user} logout={logout} groups={groups} current={currentResource} onNavigate={setResource} project={project} projects={context?.projects||[]} onProjectChange={id=>{setProjectId(id);setResource('overview');}} disabled={!!operation}>
   <p className="text-xs text-slate-500">Тестовое пространство проекта. Разделы и операции доступны в соответствии с Вашими правами.</p>
   {loading?<p role="status" className="rounded-2xl border bg-white p-6">Проверка доступа к проектам…</p>:error?<div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-rose-700">{error}<button type="button" className="ml-3 font-bold underline" onClick={()=>setVersion(n=>n+1)}>Повторить проверку доступа</button></div>:!project?<p role="status" className="rounded-2xl border bg-white p-6">Вам не назначен доступ ни к одному проекту. Обратитесь к администратору компании.</p>:<>
    {currentResource==='overview'?<WorkspaceOverview key={project.id} project={project} user={user} {...overview} onNavigate={setResource} onDocument={openDocument} canDocuments={canDocuments} onRefresh={()=>setVersion(n=>n+1)}/>:<div><p className="mb-1 text-sm text-slate-400">{project.name}</p><h1 className="text-2xl font-extrabold">{resources[currentResource].label}</h1></div>}
    <WorkspaceOperations key={`${project.id}:${version}`} project={project.id} version={version} onOpen={setOperation} disabled={!!operation}/>
    {currentResource!=='overview'&&<WorkspaceRecords key={`${version}:${project.id}:${currentResource}`} project={project.id} resource={currentResource} canDocuments={currentResource==='deals'&&canDocuments} onDocument={openDocument}/>}
   </>}
  </ProjectShell>
  {operation&&project&&operation.kind==='DOCUMENTS'&&<WorkspaceDocuments key={`${user.id}:${project.id}:${operation.dealId}`} project={project.id} dealId={operation.dealId} onClose={()=>setOperation(null)}/>}
  {operation&&project&&operation.kind!=='DOCUMENTS'&&<WorkspaceOperationForm key={`${user.id}:${project.id}:${operation.kind}`} project={project.id} {...operation} onClose={()=>setOperation(null)} onComplete={()=>{setOperation(null);setVersion(n=>n+1);}}/>}
 </>;
}
