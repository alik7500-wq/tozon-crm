import {it,expect} from 'vitest';
import {cashPeriod,isBookDate} from './cashPeriod';
const row=(date,kind,amount,currency='USD',active=true)=>({date,kind,amount,currency,active});
it('includes all prior movements in opening, both inclusive date boundaries, and excludes later movements',()=>{
 const records=[row('2026-10-01','INCOME','100.00'),row('2026-10-02','EXPENSE','25.00'),row('2026-11-01','INCOME','10.50'),row('2026-11-30','EXPENSE','4.25'),row('2026-12-01','INCOME','999.00'),row('2026-11-10','INCOME','999.00','USD',false)];
 expect(cashPeriod(records,{from:'2026-11-01',to:'2026-11-30'}).totals).toEqual([{currency:'USD',opening:'75.00',income:'10.50',expense:'4.25',closing:'81.25'}]);
});
it('keeps each currency separate and supports open-ended ranges',()=>{
 const records=[row('2026-10-01','INCOME','10.00'),row('2026-11-01','EXPENSE','2.00'),row('2026-11-01','INCOME','20.00','TJS')];
 expect(cashPeriod(records,{to:'2026-10-31'}).totals).toEqual([{currency:'TJS',opening:'0.00',income:'0.00',expense:'0.00',closing:'0.00'},{currency:'USD',opening:'0.00',income:'10.00',expense:'0.00',closing:'10.00'}]);
 expect(cashPeriod(records,{from:'2026-11-02',currency:'USD'}).totals).toEqual([{currency:'USD',opening:'8.00',income:'0.00',expense:'0.00',closing:'8.00'}]);
});
it('preserves cents above Number precision, negative balances and cancellation to exact zero',()=>{
 const records=[row('2026-01-01','INCOME','9999999999999999.99'),row('2026-02-01','EXPENSE','10000000000000000.00')];
 expect(cashPeriod(records,{from:'2026-02-01'}).totals[0]).toMatchObject({opening:'9999999999999999.99',closing:'-0.01'});
 expect(cashPeriod([...records,row('2026-02-02','INCOME','0.01')]).totals[0].closing).toBe('0.00');
});
it('refuses impossible dates and incomplete or malformed active history rather than giving partial totals',()=>{
 for(const date of ['2026-02-29','2026-13-01','2026-04-31','0000-01-01','2026-1-01','2026-11-01T12:00:00Z'])expect(isBookDate(date)).toBe(false);
 expect(isBookDate('2028-02-29')).toBe(true);expect(isBookDate('2000-02-29')).toBe(true);expect(isBookDate('2100-02-29')).toBe(false);
 expect(cashPeriod([],{from:'2026-12-01',to:'2026-11-01'}).error).toBeTruthy();
 for(const bad of [{date:null},{amount:'NaN'},{amount:'-1.00'},{kind:'OTHER'},{currency:null}])expect(cashPeriod([{...row('2026-01-01','INCOME','1.00'),...bad}]).error).toBeTruthy();
 expect(cashPeriod([row(null,'INCOME','bad','USD',false)]).totals).toEqual([]);
});
it('uses the complete book irrespective of visible pagination or a period with no rows',()=>{
 const records=Array.from({length:150},()=>row('2026-01-01','INCOME','0.01'));
 expect(cashPeriod(records,{from:'2026-02-01',to:'2026-02-28'}).totals[0]).toEqual({currency:'USD',opening:'1.50',income:'0.00',expense:'0.00',closing:'1.50'});
 expect(cashPeriod([])).toEqual({error:'',totals:[],days:[]});
});
it('orders daily balances chronologically, combines same-day movements and carries each currency independently',()=>{
 const records=[row('2026-11-03','EXPENSE','100.21'),row('2026-11-03','EXPENSE','20.00','TJS'),row('2026-11-01','EXPENSE','0.05'),row('2026-11-01','INCOME','10.25'),row('2026-11-01','INCOME','1000.00','TJS'),row('2026-10-31','INCOME','100.00'),row('2026-10-31','EXPENSE','10.00'),row('2026-11-02','INCOME','999.00','USD',false),row('2026-11-04','INCOME','999.00')];
 const report=cashPeriod(records,{from:'2026-11-01',to:'2026-11-03'});
 expect(report.days).toEqual([
  {date:'2026-11-01',currency:'TJS',opening:'0.00',income:'1000.00',expense:'0.00',closing:'1000.00'},
  {date:'2026-11-01',currency:'USD',opening:'90.00',income:'10.25',expense:'0.05',closing:'100.20'},
  {date:'2026-11-03',currency:'TJS',opening:'1000.00',income:'0.00',expense:'20.00',closing:'980.00'},
  {date:'2026-11-03',currency:'USD',opening:'100.20',income:'0.00',expense:'100.21',closing:'-0.01'}
 ]);
 for(const total of report.totals){const days=report.days.filter(d=>d.currency===total.currency);expect(days[0].opening).toBe(total.opening);expect(days.at(-1).closing).toBe(total.closing);}
 expect(cashPeriod(records,{from:'2026-11-01',to:'2026-11-03',currency:'USD'}).days.every(d=>d.currency==='USD')).toBe(true);
});
it('keeps daily carries exact beyond the first page and returns no partial days for malformed history',()=>{
 const records=Array.from({length:150},(_,i)=>row(new Date(Date.UTC(2026,0,i+1)).toISOString().slice(0,10),'INCOME','0.01'));
 const report=cashPeriod(records);expect(report.days).toHaveLength(150);expect(report.days[100]).toMatchObject({opening:'1.00',closing:'1.01'});expect(report.days.at(-1).closing).toBe('1.50');
 expect(cashPeriod([...records,row(null,'INCOME','1.00')]).days).toEqual([]);
 expect(cashPeriod(records,{from:'2027-01-01'})).toMatchObject({days:[],totals:[{opening:'1.50',closing:'1.50'}]});
 const huge=cashPeriod([row('2026-01-01','INCOME','9999999999999999.99'),row('2026-01-02','EXPENSE','10000000000000000.00')]);expect(huge.days[1]).toMatchObject({opening:'9999999999999999.99',closing:'-0.01'});
});
