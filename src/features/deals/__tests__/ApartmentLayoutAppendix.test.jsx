import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ContractPrintView } from '../ContractPrintView';
import { api } from '../../../api/client';
vi.mock('../../../api/client', () => ({ api: { get: vi.fn() } }));
vi.mock('../../settings/TemplateDocumentButton', () => ({ TemplateDocumentButton: () => null }));
const deal = { id:54, unit_id:1, unit_kind:'APARTMENT', contract_number:'25601-2026-0054', deal_date:'2026-10-20', passport_number:'TEST', schedules:[{due_date:'2026-11-20',amount_minor:10000}], project_name:'TOZON PLAZA', building_name:'Блок А', unit_number:'1', floor_number:2, area_m2_x100:5898, unit_rooms:1, lead_name:'Тестовый покупатель' };
const bundle = id => ({ status:'success',data:{unit:{id,unit_number:String(id),rooms:1,area_m2_x100:5898},layout:{technical_plan_path:`/plan-${id}-2d.png`,furnished_plan_path:`/plan-${id}-3d.png`}} });
const open = () => fireEvent.click(screen.getByRole('button',{name:'Планировка квартиры'}));
const printButton = () => screen.getByRole('button',{name:'Печать / PDF'});
beforeEach(()=>{ vi.clearAllMocks(); api.get.mockImplementation(path=>Promise.resolve(bundle(Number(path.split('/')[3])))); vi.spyOn(window,'print').mockImplementation(()=>{}); });
afterEach(()=>{cleanup();vi.restoreAllMocks();});
describe('contract apartment layout appendix',()=>{
  it('loads only the contracted unit, preserves snapshots, and waits for both images before printing',async()=>{
    render(<ContractPrintView deal={deal} initialLang="RU" onClose={()=>{}}/>);open();
    expect(printButton().disabled).toBe(true);
    const plans=await screen.findAllByRole('img');
    expect(api.get).toHaveBeenCalledWith('/inventory/units/1/presentation');
    expect(plans.map(img=>img.getAttribute('src'))).toEqual(['/plan-1-2d.png','/plan-1-3d.png']);
    const text=document.getElementById('print-section').textContent;
    expect(text).toContain('Приложение № 2');expect(text).toContain('0054');expect(text).toContain('20.10.2026');expect(text).toContain('Тестовый покупатель');expect(text).toMatch(/58[,.]98/);
    fireEvent.load(plans[0]);expect(printButton().disabled).toBe(true);
    fireEvent.load(plans[1]);await waitFor(()=>expect(printButton().disabled).toBe(false));
    open();expect(printButton().disabled).toBe(false);
    fireEvent.click(printButton());expect(window.print).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByText('🇹🇯 Тоҷикӣ'));expect(document.getElementById('print-section').textContent).toContain('Замимаи № 2');
    expect(document.querySelector('.layout-appendix-preview style').textContent).toContain('A4 landscape');
    fireEvent.click(screen.getByRole('button',{name:'Матни шартнома'}));expect(document.querySelector('.layout-appendix-sheet')).toBeNull();
  });
  it('handles the actual Axios response interceptor rather than a mocked transport envelope',async()=>{
    const { api: realApi } = await vi.importActual('../../../api/client');
    api.get.mockImplementation(url=>realApi.get(url,{adapter:async config=>({
      data:bundle(1),status:200,statusText:'OK',headers:{},config,request:{}
    })}));
    render(<ContractPrintView deal={deal} initialLang="RU" onClose={()=>{}}/>);open();
    const plans=await screen.findAllByRole('img');
    expect(plans.map(img=>img.getAttribute('src'))).toEqual(['/plan-1-2d.png','/plan-1-3d.png']);
    plans.forEach(img=>fireEvent.load(img));
    await waitFor(()=>expect(printButton().disabled).toBe(false));
  });
  it('blocks an incomplete or broken image pair and supports retry',async()=>{
    render(<ContractPrintView deal={deal} initialLang="RU" onClose={()=>{}}/>);open();
    const plans=await screen.findAllByRole('img');fireEvent.load(plans[0]);fireEvent.error(plans[1]);
    expect(printButton().disabled).toBe(true);expect(screen.getByText('Изображение недоступно')).toBeTruthy();
    fireEvent.click(screen.getByRole('button',{name:'Повторить загрузку'}));await screen.findAllByRole('img');
    expect(api.get).toHaveBeenCalledTimes(2);
  });
  it.each(['missing','wrong','denied'])('never prints fallback or unrelated apartment images: %s',async mode=>{
    api.get.mockImplementation(()=>mode==='denied'?Promise.reject(new Error('403')):Promise.resolve(mode==='wrong'?bundle(99):{status:'success',data:{unit:{id:1},layout:{furnished_plan_path:'/only-3d.png'}}}));
    render(<ContractPrintView deal={deal} initialLang="RU" onClose={()=>{}}/>);open();
    if(mode==='missing')await screen.findByRole('img');else await screen.findByText(/Не удалось загрузить планировку/);
    expect(printButton().disabled).toBe(true);expect(window.print).not.toHaveBeenCalled();
  });
  it('ignores a slow response after switching to another contract',async()=>{
    let resolveOld;api.get.mockImplementation(path=>path.includes('/1/')?new Promise(resolve=>{resolveOld=resolve;}):Promise.resolve(bundle(2)));
    const {rerender}=render(<ContractPrintView deal={deal} initialLang="RU" onClose={()=>{}}/>);open();
    rerender(<ContractPrintView deal={{...deal,id:55,unit_id:2,unit_number:'2'}} initialLang="RU" onClose={()=>{}}/>);open();
    await screen.findAllByRole('img');resolveOld(bundle(1));
    await waitFor(()=>expect(screen.getAllByRole('img').map(img=>img.getAttribute('src'))).toEqual(['/plan-2-2d.png','/plan-2-3d.png']));
  });
  it('does not offer an apartment appendix for parking',()=>{
    render(<ContractPrintView deal={{...deal,unit_kind:'PARKING'}} initialLang="RU" onClose={()=>{}}/>);
    expect(screen.queryByRole('button',{name:'Планировка квартиры'})).toBeNull();
  });
});
