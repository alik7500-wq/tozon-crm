import React, { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { downloadDocument, DOCUMENT_LANGUAGES } from './documentTemplates';

export function TemplateDocumentButton({kind,language='TJ',projectId,context,label='Ваш бланк Word'}) {
  const [templates,setTemplates]=useState([]),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const [selectedLang,setSelectedLang]=useState(language);
  useEffect(()=>setSelectedLang(language),[language]);
  useEffect(()=>{let alive=true;api.get('/document-settings/templates').then(r=>{if(alive){setTemplates(r.data.templates.filter(t=>t.active));setError('');}}).catch(()=>{if(alive)setError('Не удалось проверить ваши бланки');});return()=>{alive=false;};},[]);
  const available=templates.filter(t=>t.kind===kind && (t.scope===String(projectId)||t.scope==='*'));
  const template=available.find(t=>t.language===selectedLang && t.scope===String(projectId)) || available.find(t=>t.language===selectedLang && t.scope==='*');
  if(!available.length) return error ? <span className="text-xs text-amber-300" role="status">{error}</span> : null;
  async function download(){setBusy(true);setError('');try{await downloadDocument(`/document-settings/render/${template.id}`,`TOZON-${kind}.docx`,context);}catch(e){setError(e.message);}finally{setBusy(false);}}
  return <div className="flex flex-col gap-1"><div className="flex gap-1"><select aria-label={`Язык: ${label}`} value={template?selectedLang:''} onChange={e=>setSelectedLang(e.target.value)} className="text-xs rounded bg-slate-700 text-white p-1"><option value="" disabled>Язык бланка</option>{[...new Set(available.map(t=>t.language))].map(l=><option key={l} value={l}>{DOCUMENT_LANGUAGES[l]}</option>)}</select><button disabled={busy||!template} onClick={download} title={template?.name} className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">{busy?'Подготовка…':label}</button></div>{error && <span role="alert" className="text-xs text-amber-300">{error}</span>}</div>;
}
