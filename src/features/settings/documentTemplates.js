import { api } from '../../api/client';

export const DOCUMENT_TYPES = { CONTRACT:'Договор',ACT:'Акт приёма-передачи',PKO:'ПКО',RKO:'РКО',SCHEDULE:'График погашения',RESERVATION:'Бронирование',OFFER:'Коммерческое предложение',APARTMENT:'Карточка квартиры' };
export const DOCUMENT_LANGUAGES = { TJ:'Тоҷикӣ',RU:'Русский',UZ:'O‘zbek',EN:'English' };

export async function downloadDocument(url, name, context) {
  const blob = context === undefined ? await api.get(url,{responseType:'blob'}) : await api.post(url,context,{responseType:'blob'});
  const href=URL.createObjectURL(blob);
  const a=document.createElement('a'); a.href=href; a.download=name; a.click();
  setTimeout(()=>URL.revokeObjectURL(href),1000);
}

const money = n => n == null ? '—' : (Number(n)/100).toLocaleString('ru-RU',{minimumFractionDigits:2,maximumFractionDigits:2});
const date = s => { const raw=String(s || '').slice(0,10); return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw.split('-').reverse().join('.') : '—'; };
export function dealDocumentContext(d = {}) {
  return {
    document_number:d.contract_number || '', document_date:date(d.deal_date),
    contract_number:d.contract_number || '', contract_date:date(d.deal_date),
    client_name:d.lead_name || d.full_name || d.client_name || '',client_phone:d.lead_phone || d.phone || '',client_inn:d.inn || '',
    passport_number:[d.passport_series,d.passport_number].filter(Boolean).join(' '),passport_issued_by:d.passport_issued_by || '',passport_issue_date:date(d.passport_issue_date),
    client_address:d.registration_address || '',birth_date:date(d.birth_date),
    project_name:d.project_name || '',project_address:d.project_address || '',company_name:d.developer_name || '',
    building_name:d.building_name || '',section_name:d.section_name || '',floor_number:d.floor_number ?? '',
    unit_number:d.unit_number || '',rooms:d.unit_rooms ?? '',area:d.area_m2_x100 == null ? '—' : Number(d.area_m2_x100)/100,
    price_per_m2:money(d.deal_price_per_m2_minor ?? d.price_per_m2_minor),contract_total:money(d.final_price_minor),currency:d.currency || d.project_currency || '',
    down_payment:money(d.down_payment_minor),total_paid:money(d.total_paid_minor ?? d.paid_amount_minor),remaining_debt:money(d.remaining_debt_minor),payment_type:d.payment_type || '',
    schedules:(d.schedules || []).map((s,i)=>({row_number:i+1,due_date:date(s.due_date),planned_amount:money(s.amount_minor),paid_amount:money(s.paid_amount_minor),balance:money(Math.max(0,Number(s.amount_minor)-Number(s.paid_amount_minor || 0))),status:s.status || ''}))
  };
}
