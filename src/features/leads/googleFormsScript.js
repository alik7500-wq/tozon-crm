// A spreadsheet-bound Apps Script. The secret is supplied through Script Properties,
// never inserted into the downloadable source or the browser's persistent storage.
export function googleFormsScript(endpoint) {
 return `/** TOZON CRM — Google Forms → linked response sheet.
 * Select the response sheet before running installTozon().
 * Project Settings → Script Properties:
 * TOZON_KEY = one-time key from CRM
 * Optional NAME_COLUMN / PHONE_COLUMN / NOTES_COLUMN = exact question headings.
 * Run installTozon once and approve Google's permissions.
 * Existing responses are not sent: import them separately through CRM.
 */
const TOZON_URL = ${JSON.stringify(endpoint)};
function installTozon() {
 const p = PropertiesService.getScriptProperties();
 if (!p.getProperty('TOZON_KEY')) throw new Error('Add TOZON_KEY in Script Properties');
 const ss = SpreadsheetApp.getActiveSpreadsheet(), sheet = ss.getActiveSheet();
 const sameSheet = p.getProperty('TOZON_BOOK') === ss.getId() && p.getProperty('TOZON_SHEET') === String(sheet.getSheetId());
 const start = sameSheet && p.getProperty('TOZON_START') ? p.getProperty('TOZON_START') : String(sheet.getLastRow() + 1);
 p.setProperties({TOZON_SHEET: String(sheet.getSheetId()), TOZON_BOOK: ss.getId(), TOZON_START: start});
 ScriptApp.getProjectTriggers().filter(t => ['tozonSubmit','tozonRetry'].includes(t.getHandlerFunction())).forEach(t => ScriptApp.deleteTrigger(t));
 ScriptApp.newTrigger('tozonSubmit').forSpreadsheet(ss).onFormSubmit().create();
 ScriptApp.newTrigger('tozonRetry').timeBased().everyMinutes(5).create();
}
function tozonSubmit(e) { if (e && e.range) tozonRetry(); }
function tozonRetry() {
 const lock = LockService.getScriptLock(); if (!lock.tryLock(5000)) return;
 try {
 const p = PropertiesService.getScriptProperties(), key = p.getProperty('TOZON_KEY');
 if (!key) throw new Error('TOZON_KEY is missing');
 const sheet = SpreadsheetApp.openById(p.getProperty('TOZON_BOOK')).getSheetById(Number(p.getProperty('TOZON_SHEET')));
 let headers = sheet.getRange(1,1,1,sheet.getLastColumn()).getDisplayValues()[0];
 const meta = ['TOZON ID','TOZON статус','TOZON попытка','TOZON лид'];
 meta.forEach(h => {if (!headers.includes(h)) {sheet.getRange(1,headers.length+1).setValue(h);headers.push(h);}});
 const columns = meta.map(h => headers.indexOf(h));
 const findColumn = (property, pattern) => {
  const configured = p.getProperty(property);
  const i = configured ? headers.indexOf(configured) : headers.findIndex(h => pattern.test(h.trim()));
  if (i < 0) throw new Error('Set exact heading in Script Properties: ' + property);
  return i;
 };
 const nameCol = findColumn('NAME_COLUMN', /фио|имя|full.?name|ному|номи шумо|^ном$/i);
 const phoneCol = findColumn('PHONE_COLUMN', /телефон|phone|рақам|номер.*(ватсап|whatsapp)/i);
 const notesCol = p.getProperty('NOTES_COLUMN') ? headers.indexOf(p.getProperty('NOTES_COLUMN')) : -1;
 const started = Date.now(); let attempts = 0;
 const first = Math.max(2, Number(p.getProperty('TOZON_START') || 2));
 const last = sheet.getLastRow();
 if (last < first) return;
 const rows = sheet.getRange(first,1,last-first+1,headers.length).getDisplayValues();
 for(let n=0;n<rows.length && attempts<25 && Date.now()-started<45000;n++) {
  const row = rows[n], number = first+n, state = row[columns[1]];
  if (/^(OK|ERROR)/.test(state) || !row.some(Boolean)) continue;
  let id = row[columns[0]];
  if (!id) {id = Utilities.getUuid(); sheet.getRange(number,columns[0]+1).setValue(id); SpreadsheetApp.flush();}
  const answers = notesCol>=0 ? row[notesCol] : headers.map((h,i) => (i!==nameCol && i!==phoneCol && !h.startsWith('TOZON ') && row[i]) ? h + ': ' + row[i] : '').filter(Boolean).join('\\n');
  const payload = {external_key:id, full_name:row[nameCol], phone:row[phoneCol], notes:String(answers).slice(0,4000), submitted_at:row[0]};
  sheet.getRange(number,columns[1]+1).setValue('SENDING');
  sheet.getRange(number,columns[2]+1).setValue(new Date());
  attempts++;
  try {
   const response=UrlFetchApp.fetch(TOZON_URL,{method:'post',contentType:'application/json',headers:{'x-lead-intake-key':key},payload:JSON.stringify(payload),muteHttpExceptions:true});
   const code=response.getResponseCode();
   if(code>=200 && code<300) {
    const data=JSON.parse(response.getContentText()).data;
    const outcome=data.outcome==='DUPLICATE' ? data.original_outcome : data.outcome;
    const needsReview=['AMBIGUOUS','ARCHIVED'].includes(outcome);
    sheet.getRange(number,columns[1]+1).setValue((needsReview?'ERROR: ':'OK: ')+outcome);
    sheet.getRange(number,columns[3]+1).setValue(data.lead_id || '');
   } else {
    sheet.getRange(number,columns[1]+1).setValue((code===422 ? 'ERROR: проверьте имя и телефон; ' : 'RETRY: ')+'HTTP '+code);
    if(code===401 || code===403 || code===429) break;
   }
  } catch(err) {sheet.getRange(number,columns[1]+1).setValue('RETRY: ошибка соединения');}
 }
 } finally {lock.releaseLock();}
}
`;
}
