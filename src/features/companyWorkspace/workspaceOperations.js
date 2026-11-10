import { api } from '../../api/client';
import { businessDate, discountRuleKey, tierPrice } from '../pricing/pricingCalculator';
export const operationLabels={CANCEL_DRAFT:'Отменить черновик',TERMINATE_UNPAID:'Расторгнуть без оплат',DEAL_DRAFT:'Создать черновик',SIGN_DEAL:'Подписать договор',PAYMENT:'Принять оплату',EXPENSE:'Оформить РКО',STOCK_POST:'Складской документ'};
export const lookupKinds={CANCEL_DRAFT:['cancel_drafts'],TERMINATE_UNPAID:['terminate_deals'],DEAL_DRAFT:['units','leads'],SIGN_DEAL:['deals','schemes'],PAYMENT:['deals','cash_desks'],EXPENSE:['cash_desks','parties'],STOCK_POST:['warehouses','parties','materials','complexes']};
export async function loadOperationLookups(project,kind,signal){
 const entries=await Promise.all(lookupKinds[kind].map(async name=>{
  const rows=[];let after='';
  for(let page=0;page<500;page++){
   const r=await api.get(`/project-workspace/${project}/options/${name}`,{params:{after,limit:100},signal});
   const data=r.data;rows.push(...data.records);
   if(!data.has_more)return [name,rows];
   const cursor=String(data.records.at(-1)?.id||'');if(!cursor||cursor===after)throw new Error('Не удалось загрузить полный справочник');after=cursor;
  }
  throw new Error('Список слишком большой для этой формы. Уточните выбор у администратора.');
 }));return Object.fromEntries(entries);
}
export const initialOperation=()=>({date:businessDate(),reason:'',termination_basis:'',basis_date:businessDate(),closure_confirmed:false,unit_id:'',lead_id:'',deal_id:'',cash_desk_id:'',amount:'',currency:'USD',exchange_rate:'',category:'',recipient:'',description:'',comment:'',settlement_party_id:'',settlement_account:'PAYABLE',kind:'RECEIPT',warehouse_id:'',destination_id:'',complex_id:'',party_id:'',work_type:'',basis:'',scheme_id:'',rule_key:'',down:'0',down_currency:'USD',down_rate:'',months:'12',first_payment_date:'',final_price:'',lines:[{material_id:'',quantity:'',value:''}]});
function decimal(value,label,max=21474836.47,places=2,zero=false){
 const input=String(value??'').trim().replace(',','.');const n=Number(input),factor=10**places;
 if(!input||!Number.isFinite(n)||n<(zero?0:1/factor)||n>max||Math.abs(n*factor-Math.round(n*factor))>0.0001)throw new Error(`Проверьте поле «${label}»`);return n;
}
const minor=(v,label,zero=false)=>Math.round(decimal(v,label,21474836.47,2,zero)*100);
function chosen(rows,id,label){const row=rows?.find(x=>String(x.id)===String(id));if(!row)throw new Error(`Выберите ${label}`);return row;}
export function signingPrice(form,lookups){
 const deal=lookups.deals?.find(d=>String(d.id)===String(form.deal_id));if(!deal)return null;
 const unit=deal.unit,scheme=lookups.schemes?.find(s=>String(s.id)===form.scheme_id&&Number(s.project_id)===Number(unit.project_id));
 const rule=scheme?.rules.find(r=>discountRuleKey(r)===form.rule_key);
 if(form.scheme_id&&(!scheme||!rule))return null;
 const price=unit.unit_kind!=='APARTMENT'&&unit.manual_total_price_minor!=null?{total_minor:Number(unit.manual_total_price_minor),minimum_minor:0}:tierPrice(unit,rule);
 return price?{...price,deal,scheme,rule,maxMonths:rule?.months??120}:null;
}
export function prepareOperation(kind,form,lookups,requestId){
 const date=form.date;
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||new Date(date).toISOString().slice(0,10)!==date)throw new Error('Проверьте дату документа');
 let payload;
 if(['CANCEL_DRAFT','TERMINATE_UNPAID'].includes(kind)){
  const draft=kind==='CANCEL_DRAFT';const deal=chosen(lookups[draft?'cancel_drafts':'terminate_deals'],form.deal_id,'договор');
  if(deal.status!==(draft?'DRAFT':'SIGNED'))throw new Error('Состояние договора изменилось');
  if(!form.closure_confirmed)throw new Error('Подтвердите закрытие и возврат помещения в продажу');
  if(form.reason.trim().length<5)throw new Error('Укажите причину закрытия');
  payload={deal_id:deal.id,expected_updated_at:deal.updated_at,reason:form.reason.trim()};
  if(!draft){if(form.termination_basis.trim().length<3||!form.basis_date)throw new Error('Укажите основание и дату расторжения');Object.assign(payload,{basis:form.termination_basis.trim(),basis_date:form.basis_date});}
 }else if(kind==='DEAL_DRAFT'){
  const unit=chosen(lookups.units,form.unit_id,'квартиру'),lead=chosen(lookups.leads,form.lead_id,'клиента');
  payload={unit_id:unit.id,lead_id:lead.id,final_price_minor:minor(form.final_price,'Предварительная стоимость'),payment_type:'FULL',installment_months:0,date};
 }else if(kind==='SIGN_DEAL'){
  const quote=signingPrice(form,lookups);if(!quote)throw new Error('Выберите черновик и актуальный оффер');
  let down=minor(form.down,'Первоначальный взнос',true);
  if(form.down_currency==='TJS')down=Math.round(down/decimal(form.down_rate,'Курс',100000,6));
  const months=Number(form.months),full=down===quote.total_minor;
  if(down<quote.minimum_minor||down>quote.total_minor)throw new Error('Взнос не соответствует выбранному офферу');
  if(!Number.isInteger(months)||(full?months!==0:months<1||months>quote.maxMonths))throw new Error('Проверьте срок рассрочки');
  payload={deal_id:quote.deal.id,expected_updated_at:quote.deal.updated_at,down_payment_minor:down,installment_months:months,...(form.first_payment_date?{first_payment_date:form.first_payment_date}:{})};
  if(quote.scheme)Object.assign(payload,{scheme_id:quote.scheme.id,scheme_updated_at:quote.scheme.updated_at,rule_key:form.rule_key});
 }else if(kind==='PAYMENT'||kind==='EXPENSE'){
  const cash=chosen(lookups.cash_desks,form.cash_desk_id,'кассу');
  payload={cash_desk_id:cash.id,amount_minor:minor(form.amount,'Сумма'),currency:form.currency,date};
  if(form.currency==='TJS')payload.exchange_rate=decimal(form.exchange_rate,'Исторический курс',100000,6);
  if(kind==='PAYMENT'){
   const deal=chosen(lookups.deals?.filter(d=>d.status==='SIGNED'),form.deal_id,'подписанный договор');payload.deal_id=deal.id;payload.comment=form.comment.trim();
  }else{
   if(!form.category.trim())throw new Error('Укажите статью расхода');
   Object.assign(payload,{category:form.category.trim(),recipient:form.recipient.trim(),description:form.description.trim()});
   if(form.settlement_party_id){payload.settlement_party_id=chosen(lookups.parties,form.settlement_party_id,'контрагента').id;payload.settlement_account=form.settlement_account;}
  }
 }else if(kind==='STOCK_POST'){
  if(!form.basis.trim())throw new Error('Укажите основание документа');
  payload={kind:form.kind,date,currency:form.currency,warehouse_id:chosen(lookups.warehouses,form.warehouse_id,'склад').id,basis:form.basis.trim(),lines:form.lines.map(row=>{
   const material=chosen(lookups.materials,row.material_id,'материал');const line={material_id:material.id,quantity:decimal(row.quantity,'Количество',1e9,4)};
   if(['RECEIPT','RETURN_STOCK'].includes(form.kind))line.value=decimal(row.value,'Стоимость строки',1e12,2,true);return line;
  })};
  if(form.kind==='TRANSFER'){payload.destination_id=chosen(lookups.warehouses,form.destination_id,'склад назначения').id;if(payload.destination_id===payload.warehouse_id)throw new Error('Выберите другой склад назначения');}
  if(form.party_id)payload.party_id=chosen(lookups.parties,form.party_id,'поставщика').id;
  if(form.kind==='RECEIPT'&&!payload.party_id)throw new Error('Выберите поставщика');
  if(['ISSUE','WRITE_OFF'].includes(form.kind)){payload.complex_id=chosen(lookups.complexes,form.complex_id,'ЖК').id;if(!form.work_type.trim())throw new Error('Укажите вид работ');payload.work_type=form.work_type.trim();}
 }else throw new Error('Операция недоступна');
 return {request_id:requestId,kind,payload};
}
