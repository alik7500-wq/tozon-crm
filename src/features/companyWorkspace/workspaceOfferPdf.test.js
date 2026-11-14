import {readFileSync} from 'node:fs';
import {it,expect} from 'vitest';
import {buildOfferPdf} from './workspaceOfferPdf';
const fonts=['OfferSans.ttf','OfferSans-Bold.ttf'].map(name=>readFileSync(`src/assets/fonts/${name}`).toString('base64'));
const data={language:'TJ',checked_at:'2026-11-14T06:00:00Z',project_name:'Tozon Plaza',prepared_by:'Тестовый сотрудник Plaza',currency:'USD',unit:{number:'101',complex_name:'Демонстрационный ЖК',building_name:'А',section_name:'Подъезд 1',floor:1,rooms:2,area_m2_x100:6000,status:'SOLD'},quote:{base_minor:3600000,total_minor:3600000,discount_minor:0,down_payment_minor:1000000,remaining_minor:2600000,months:36,monthly_minor:72223,reference_rate:10,scheme_name:null}};
it('builds compact one-page RU/TJ PDFs with embedded fonts',()=>{
 for(const language of ['RU','TJ']){
  const pdf=buildOfferPdf({...data,language},fonts),output=pdf.output('arraybuffer');
  expect(pdf.getNumberOfPages()).toBe(1);
  expect(Buffer.from(output).subarray(0,5).toString()).toBe('%PDF-');
  expect(output.byteLength).toBeLessThan(100000);
 }
});
it('supports full payment and long names without truncating to a fixed page count',()=>{
 const full=buildOfferPdf({...data,currency:'TJS',quote:{...data.quote,down_payment_minor:3600000,remaining_minor:0,months:0,monthly_minor:0,reference_rate:null}},fonts);
 expect(full.getNumberOfPages()).toBe(1);
 const long=buildOfferPdf({...data,project_name:'Длинное название проекта '.repeat(100)},fonts);
 expect(long.getNumberOfPages()).toBeGreaterThan(1);
});
