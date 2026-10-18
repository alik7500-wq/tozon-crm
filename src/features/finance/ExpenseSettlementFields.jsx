import React from 'react';
const settlementPurposes={PAYABLE:'Погашение долга поставщику / кредитору',ADVANCE_GIVEN:'Аванс поставщику / подрядчику',RECEIVABLE:'Выдача средств дебитору — нам должны',ADVANCE_RECEIVED:'Возврат полученного аванса'};
export function ExpenseSettlementFields({value,onChange,parties=[],loading=false,error,disabled=false}){
 const party=value.settlement_party_id||'';
 return <fieldset className="rounded-xl border border-blue-200 bg-blue-50 p-3 space-y-2" disabled={disabled||loading}>
  <legend className="px-1 font-bold text-blue-900">Автоматический учёт задолженности</legend>
  <label className="block">Контрагент в расчётах<select className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2" value={party} onChange={e=>{
   const selected=parties.find(p=>p.id===e.target.value);
   onChange(selected?{settlement_party_id:selected.id,settlement_account:value.settlement_account||(selected.kind==='DEBTOR'?'RECEIVABLE':'PAYABLE'),recipient:selected.name}:{settlement_party_id:null,settlement_account:null});
  }}><option value="">Обычный расход — без взаиморасчётов</option>{parties.filter(p=>p.active||p.id===party).map(p=><option key={p.id} value={p.id}>{p.name}{p.active?'':' (архив)'}</option>)}</select></label>
  {loading&&<p>Загрузка контрагентов…</p>}
  {error&&<p role="alert" className="text-red-700">Не удалось загрузить контрагентов. Повторите открытие формы для связи РКО с задолженностью.</p>}
  {party&&<><label className="block">Назначение расчёта<select className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2" required value={value.settlement_account||''} onChange={e=>onChange({settlement_account:e.target.value})}><option value="">Выберите назначение</option>{Object.entries(settlementPurposes).map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label>
   <p className="text-blue-900">{value.settlement_account==='PAYABLE'?'Долг перед контрагентом уменьшится':value.settlement_account==='ADVANCE_GIVEN'?'Аванс поставщику увеличится':value.settlement_account==='RECEIVABLE'?'Задолженность контрагента перед нами увеличится':'Полученный аванс уменьшится'} на {Number(value.amount||0).toLocaleString('ru-RU',{maximumFractionDigits:2})} {value.currency}. Расчёт обновится вместе с РКО, отдельный документ вводить не нужно.</p>
  </>}
 </fieldset>;
}
