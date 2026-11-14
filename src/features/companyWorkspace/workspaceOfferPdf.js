import {jsPDF} from 'jspdf';
import {offerLabels,offerRate} from './workspaceOfferHtml.js';

const fontUrls=[new URL('../../assets/fonts/OfferSans.ttf',import.meta.url).href,new URL('../../assets/fonts/OfferSans-Bold.ttf',import.meta.url).href];
let fontsPromise;
const base64=bytes=>{let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(binary);};
export function loadOfferFonts(){
 if(!fontsPromise)fontsPromise=Promise.all(fontUrls.map(async url=>{
  const response=await fetch(url,{credentials:'omit'});
  if(!response.ok)throw new Error('Не удалось загрузить шрифт PDF. Повторите скачивание.');
  const bytes=new Uint8Array(await response.arrayBuffer());
  if(bytes[0]!==0||bytes[1]!==1||bytes[2]!==0||bytes[3]!==0)throw new Error('Файл шрифта PDF недоступен. Обновите страницу.');
  return base64(bytes);
 })).catch(error=>{fontsPromise=null;throw error;});
 return fontsPromise;
}
// Remove control and bidi formatting characters before writing visible PDF text.
// eslint-disable-next-line no-control-regex
const clean=value=>String(value??'—').replace(/[\u0000-\u001f\u007f-\u009f]/g,' ').replace(/[\u202a-\u202e\u2066-\u2069]/g,'');
const number=value=>Number(value).toLocaleString('ru-RU',{maximumFractionDigits:2});

export function buildOfferPdf(data,fonts){
 const doc=new jsPDF({unit:'mm',format:'a4',compress:true,putOnlyUsedFonts:true});
 for(const [index,style] of ['normal','bold'].entries()){
  const file=`OfferSans-${style}.ttf`;doc.addFileToVFS(file,fonts[index]);doc.addFont(file,'OfferSans',style);
 }
 const l=offerLabels[data.language]||offerLabels.RU,u=data.unit,q=data.quote;
 const statuses={AVAILABLE:l.available,RESERVED:l.reserved,SOLD:l.sold,BLOCKED:l.blocked};
 const amount=minor=>`${number(minor/100)} ${clean(data.currency)}`;
 const equivalent=minor=>data.currency==='USD'&&q.reference_rate?`≈ ${number(Math.round(minor*q.reference_rate)/100)} сомони`:'';
 const margin=18,width=174,column=82;let y=20;
 const style=(size=10,bold=false,color='#17233c')=>{doc.setFont('OfferSans',bold?'bold':'normal');doc.setFontSize(size);doc.setTextColor(color);};
 const lines=(value,w,size,bold=false)=>{style(size,bold);return doc.splitTextToSize(clean(value),w);};
 const room=height=>{if(y+height>276){doc.addPage();y=20;}};
 const paragraph=(value,{size=10,bold=false,color='#17233c',gap=3}={})=>{
  const wrapped=lines(value,width,size,bold),step=size*0.45;
  for(const line of wrapped){room(step);style(size,bold,color);doc.text(line,margin,y);y+=step;}
  y+=gap;
 };
 doc.setProperties({title:`TOZON - ${l.title} ${clean(u.number)}`,author:'TOZON CRM',subject:'Preliminary apartment offer'});
 paragraph('TOZON CRM',{size:21,bold:true,color:'#3154f5',gap:4});
 paragraph(data.project_name,{size:10,gap:6});
 paragraph(`${l.title} · №${clean(u.number)}`,{size:18,bold:true,gap:3});
 paragraph(`${clean(u.complex_name)} · ${clean(u.building_name)} · ${clean(u.section_name)}`,{size:9,color:'#64748b',gap:4});
 paragraph(`${l.status}: ${statuses[u.status]||clean(u.status)}`,{size:10,bold:true,gap:6});
 doc.setDrawColor('#3154f5');doc.setLineWidth(0.7);doc.line(margin,y,192,y);y+=9;
 const details=[[l.area,`${number(u.area_m2_x100/100)} м²`],[l.rooms,u.rooms],[l.floor,u.floor],[l.scheme,q.scheme_name||l.base],[l.term,q.months?`${q.months} ${l.months}`:l.full],[l.discount,amount(q.discount_minor)]];
 for(let i=0;i<details.length;i+=2){
  const pair=details.slice(i,i+2).map(([label,value])=>({label:lines(label,column,8),value:lines(value,column,10,true)}));
  const labelHeight=Math.max(...pair.map(item=>item.label.length))*3.6,valueHeight=Math.max(...pair.map(item=>item.value.length))*4.5;
  room(labelHeight+valueHeight+6);
  pair.forEach((item,index)=>{const x=margin+index*92;style(8,false,'#64748b');doc.text(item.label,x,y);style(10,true);doc.text(item.value,x,y+labelHeight+1,{lineHeightFactor:1.27});});
  y+=labelHeight+valueHeight+6;
 }
 const cards=[[l.total,q.total_minor],[l.down,q.down_payment_minor],[l.balance,q.remaining_minor],...(q.months?[[l.monthly,q.monthly_minor]]:[])];
 for(let i=0;i<cards.length;i+=2){
  const pair=cards.slice(i,i+2).map(([label,value])=>({label:lines(label,74,8),value,amount:lines(amount(value),74,16,true)}));
  const labelHeight=Math.max(...pair.map(item=>item.label.length))*3.6,amountHeight=Math.max(...pair.map(item=>item.amount.length))*7.2;
  const height=labelHeight+amountHeight+17+(equivalent(pair[0].value)?5:0);room(height+5);
  pair.forEach((item,index)=>{const x=margin+index*90;doc.setFillColor(i===0&&index===0?'#edf9f3':'#f5f7ff');doc.setDrawColor('#dbe3f0');doc.setLineWidth(0.25);doc.roundedRect(x,y,84,height,3,3,'FD');style(8,false,'#64748b');doc.text(item.label,x+5,y+7);style(16,true);doc.text(item.amount,x+5,y+labelHeight+13,{lineHeightFactor:1.27});if(equivalent(item.value)){style(8,false,'#64748b');doc.text(equivalent(item.value),x+5,y+labelHeight+amountHeight+15);}});
  y+=height+5;
 }
 if(data.currency==='USD'&&q.reference_rate)paragraph(`${l.rate}: 1 USD = ${offerRate(q.reference_rate)} сомони`,{size:8,color:'#64748b'});
 y+=3;
 paragraph(`${l.date}: ${new Date(data.checked_at).toLocaleString('ru-RU',{timeZone:'Asia/Dushanbe'})}`,{size:8,color:'#64748b'});
 if(data.prepared_by)paragraph(`${l.manager}: ${clean(data.prepared_by)}`,{size:8,color:'#64748b'});
 paragraph(l.note,{size:8,color:'#64748b'});
 const pages=doc.getNumberOfPages();for(let page=1;page<=pages;page++){doc.setPage(page);style(8,false,'#64748b');doc.text(`${page} / ${pages}`,105,287,{align:'center'});}
 return doc;
}
export function saveOfferPdf(data,fonts){
 const filename=`TOZON-offer-${clean(data.unit.number).replace(/[^\p{L}\p{N}_-]/gu,'_').slice(0,50)}-${data.language==='TJ'?'TJ':'RU'}.pdf`;
 buildOfferPdf(data,fonts).save(filename);
 return filename;
}
