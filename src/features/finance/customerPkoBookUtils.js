export const voidedPko = p => ['VOIDED','CANCELLED','REVERSED'].includes(p.status) || Boolean(p.voidedAt);
export const pkoNumber = p => p.document_number || p.reference || 'Номер не указан';
export const escapeBookHtml = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function duplicatePkoNumbers(rows) {
  const counts = new Map();
  rows.forEach(p => { const n=pkoNumber(p);counts.set(n,(counts.get(n)||0)+1); });
  return new Set([...counts].filter(([,count])=>count>1).map(([n])=>n));
}
export function customerBookPrintHtml(rows) {
  const e=escapeBookHtml;
  return `<!doctype html><html lang="ru"><meta charset="utf-8"><title>Книга ПКО покупателей</title><style>@page{size:A4 landscape;margin:10mm}body{font:11px Arial}table{border-collapse:collapse;width:100%}th,td{border:1px solid #aaa;padding:5px;text-align:left}thead{display:table-header-group}tr{break-inside:avoid}</style><h1>Книга регистрации ПКО покупателей недвижимости</h1><p>Выбранных записей: ${rows.length}. Аннулированные документы отмечены в графе «Статус».</p><table><thead><tr>${['Дата','№ ПКО','Покупатель','Договор','Объект','Касса','Сумма учёта','ПКО, TJS','Ответственный','Статус'].map(x=>`<th>${e(x)}</th>`).join('')}</tr></thead><tbody>${rows.map(p=>`<tr>${[p.date?.slice(0,10),pkoNumber(p),p.clientName,p.contract,p.property,p.cashDeskName,`${Number(p.amount).toFixed(2)} ${p.currency}`,p.amountTjs ?? (p.currency==='TJS'?p.amount:'—'),p.createdByName,voidedPko(p)?'Аннулирован':'Действует'].map(x=>`<td>${e(x)}</td>`).join('')}</tr>`).join('')}</tbody></table></html>`;
}
