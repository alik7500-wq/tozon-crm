// A read-only projection of the complete, authorized book. Money stays in integer cents.
export function isBookDate(value){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(value||''))return false;
 const [year,month,day]=value.split('-').map(Number);
 const leap=year%4===0&&(year%100!==0||year%400===0);
 return year>0&&month>=1&&month<=12&&day>=1&&day<=[31,leap?29:28,31,30,31,30,31,31,30,31,30,31][month-1];
}
const decimal=cents=>`${cents<0n?'-':''}${(cents<0n?-cents:cents)/100n}.${String((cents<0n?-cents:cents)%100n).padStart(2,'0')}`;
export function cashPeriod(records,{from='',to='',currency=''}={}){
 if((from&&!isBookDate(from))||(to&&!isBookDate(to))||(from&&to&&from>to))return {error:'Укажите корректный период: начальная дата должна быть не позже конечной.',totals:[],days:[]};
 const groups=new Map(),days=new Map();
 for(const row of records){
  if(!row.active)continue;
  if(!isBookDate(row.date)||!/^\d+\.\d{2}$/.test(row.amount||'')||!['INCOME','EXPENSE'].includes(row.kind)||!['USD','TJS','RUB'].includes(row.currency))return {error:'В действующих документах есть некорректная дата, сумма или валюта. Итоги периода требуют сверки.',totals:[],days:[]};
  if(currency&&row.currency!==currency)continue;
  if(!groups.has(row.currency))groups.set(row.currency,{opening:0n,income:0n,expense:0n});
  const group=groups.get(row.currency),cents=BigInt(row.amount.replace('.',''));
  if(to&&row.date>to)continue;
  if(from&&row.date<from)group.opening+=row.kind==='INCOME'?cents:-cents;
  else {
   const key=`${row.date}:${row.currency}`;
   if(!days.has(key))days.set(key,{date:row.date,currency:row.currency,income:0n,expense:0n});
   const day=days.get(key);
   if(row.kind==='INCOME'){group.income+=cents;day.income+=cents;}
   else {group.expense+=cents;day.expense+=cents;}
  }
 }
 const balances=new Map([...groups].map(([currency,g])=>[currency,g.opening]));
 const daily=[...days].sort(([a],[b])=>a.localeCompare(b)).map(([,day])=>{
  const opening=balances.get(day.currency),closing=opening+day.income-day.expense;balances.set(day.currency,closing);
  return {date:day.date,currency:day.currency,opening:decimal(opening),income:decimal(day.income),expense:decimal(day.expense),closing:decimal(closing)};
 });
 return {error:'',totals:[...groups].sort(([a],[b])=>a.localeCompare(b)).map(([currency,g])=>({currency,opening:decimal(g.opening),income:decimal(g.income),expense:decimal(g.expense),closing:decimal(g.opening+g.income-g.expense)})),days:daily};
}
