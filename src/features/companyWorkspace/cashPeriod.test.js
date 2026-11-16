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
 expect(cashPeriod([])).toEqual({error:'',totals:[]});
});
