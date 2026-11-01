import vm from 'node:vm';
import { it,expect,vi } from 'vitest';
import { googleFormsScript } from '../googleFormsScript';
function harness() {
 const cells=[['ФИО','Телефон','Timestamp'],['Test person','900123456','2026-11-02']];
 const props={TOZON_KEY:'synthetic-key',TOZON_BOOK:'book',TOZON_SHEET:'1',TOZON_START:'2'};
 const sheet={getSheetId:()=>1,getLastColumn:()=>cells[0].length,getLastRow:()=>cells.length,getRange:(r,c,h=1,w=1)=>({
 getDisplayValues:()=>Array.from({length:h},(_,i)=>Array.from({length:w},(_,j)=>String(cells[r-1+i]?.[c-1+j]??''))),
 setValue:v=>{cells[r-1]??=[];cells[r-1][c-1]=v;}
 })};
 const fetch=vi.fn(),getUuid=vi.fn(()=>'stable-answer-uuid');
 const book={getSheetById:()=>sheet,getId:()=>'book',getActiveSheet:()=>sheet};
 const scriptTrigger={forSpreadsheet:()=>scriptTrigger,onFormSubmit:()=>scriptTrigger,timeBased:()=>scriptTrigger,everyMinutes:()=>scriptTrigger,create:vi.fn()};
 const context=vm.createContext({Date,JSON,String,Number,Math,Error,PropertiesService:{getScriptProperties:()=>({getProperty:k=>props[k],setProperties:p=>Object.assign(props,p)})},SpreadsheetApp:{openById:()=>book,getActiveSpreadsheet:()=>book,flush:()=>{}},LockService:{getScriptLock:()=>({tryLock:()=>true,releaseLock:()=>{}})},Utilities:{getUuid},UrlFetchApp:{fetch},ScriptApp:{getProjectTriggers:()=>[],newTrigger:()=>scriptTrigger}});
 vm.runInContext(googleFormsScript('https://crm.invalid/api/leads/intake/google/id'),context);
 return {context,cells,props,fetch,getUuid};
}
it('retries a failed submission with the same response ID and stops after success',()=>{
 const h=harness();h.fetch.mockImplementationOnce(()=>{throw new Error('offline')}).mockReturnValue({getResponseCode:()=>200,getContentText:()=>JSON.stringify({data:{outcome:'CREATED',lead_id:7}})});
 h.context.tozonRetry();expect(h.cells[1][4]).toContain('RETRY');
 h.context.tozonRetry();expect(h.cells[1][4]).toBe('OK: CREATED');expect(h.cells[1][6]).toBe(7);
 h.context.tozonRetry();expect(h.fetch).toHaveBeenCalledTimes(2);expect(h.getUuid).toHaveBeenCalledOnce();
 const payloads=h.fetch.mock.calls.map(call=>JSON.parse(call[1].payload));expect(payloads[0].external_key).toBe(payloads[1].external_key);expect(payloads[0].phone).toBe('900123456');
});
it('marks invalid records for review without endless automatic retries and preserves installation cursor',()=>{
 const h=harness();h.fetch.mockReturnValue({getResponseCode:()=>422});h.context.tozonRetry();expect(h.cells[1][4]).toContain('ERROR');h.context.tozonRetry();expect(h.fetch).toHaveBeenCalledOnce();
 h.context.installTozon();expect(h.props.TOZON_START).toBe('2');
});
