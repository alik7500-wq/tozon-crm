export const voidedRko = r => ['VOIDED','CANCELLED','REVERSED'].includes(r.status) || Boolean(r.voided_at || r.voidedAt);
export const rkoNumber = r => r.document_number || r.reference || `РКО-${r.id}`;
export const escapeRkoHtml = value => String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function duplicateRkoNumbers(rows) {
 const counts=new Map();rows.forEach(r=>counts.set(rkoNumber(r),(counts.get(rkoNumber(r))||0)+1));
 return new Set([...counts].filter(([,n])=>n>1).map(([key])=>key));
}
export function rkoBookPrintHtml(rows,totals) {
 const e=escapeRkoHtml;
 return `<!doctype html><html lang="ru"><head><meta charset="utf-8"><title>Книга регистрации РКО</title><style>@page{size:A4 landscape;margin:10mm}body{font:11px Arial;color:#172b42}table{border-collapse:collapse;width:100%}th,td{border:1px solid #aaa;padding:5px;text-align:left;overflow-wrap:anywhere}thead{display:table-header-group;background:#eef2f6}tr{break-inside:avoid}.voided{background:#fff0f1;color:#943544}</style></head><body><h1>Книга регистрации РКО</h1><p>Записей: ${rows.length}. Аннулированные документы не включены в итог.</p><table><thead><tr>${['Дата','№ РКО','Получатель','Статья расхода','Основание','Касса','Сумма','Ответственный','Статус'].map(h=>`<th>${e(h)}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr class="${voidedRko(r)?'voided':''}">${[String(r.date||'').slice(0,10),rkoNumber(r),r.recipient,r.category,r.description,r.cashDeskName,`${Number(r.amount).toFixed(2)} ${r.currency}`,r.createdByName,voidedRko(r)?'Аннулирован':'Действует'].map(v=>`<td>${e(v)}</td>`).join('')}</tr>`).join('')}</tbody></table><p>Итого действующих РКО: ${Object.entries(totals||{}).map(([c,n])=>e(`${Number(n).toFixed(2)} ${c}`)).join(' · ') || '0'}</p></body></html>`;
}
