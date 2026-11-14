import React from 'react';
import {afterEach,it,expect,vi} from 'vitest';
import {render,screen,fireEvent,waitFor,cleanup} from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import WorkspaceOffer from './WorkspaceOffer';
import {workspaceOfferHtml} from './workspaceOfferHtml';
import {api} from '../../api/client';
vi.mock('../../api/client',()=>({api:{post:vi.fn()}}));
afterEach(()=>{cleanup();vi.restoreAllMocks();vi.clearAllMocks();});
const data={language:'RU',checked_at:'2026-11-14T06:00:00Z',project_name:'Plaza',prepared_by:'Manager',currency:'USD',unit:{number:'101',complex_name:'Own complex',building_name:'A',section_name:'1',floor:10,rooms:2,area_m2_x100:6000,status:'SOLD'},quote:{base_minor:3600000,total_minor:3600000,discount_minor:0,down_payment_minor:1000000,remaining_minor:2600000,months:36,monthly_minor:72223,reference_rate:10,scheme_name:null}};
const request={unit_id:1,complex_id:3};
it('renders an escaped RU/TJ document without external assets or active content',()=>{
 const html=workspaceOfferHtml({...data,prepared_by:'<img src=x onerror=alert(1)>',project_name:'A & B'});
 expect(html).toContain('A &amp; B');expect(html).toContain('&lt;img');expect(html).not.toMatch(/<script|<img|<link|<iframe/);expect(html).toContain('Продана');expect(html).toContain('722,23 USD');expect(html).toContain('введённый вручную');
 const tj=workspaceOfferHtml({...data,language:'TJ'});expect(tj).toContain('lang="tg"');expect(tj).toContain('Пешниҳод оид ба хариди хона');expect(tj).toContain('Фурӯхта шудааст');
});
it('uses only the scoped endpoint and reauthorizes when language changes',async()=>{
 api.post.mockImplementation((url,body)=>Promise.resolve({data:{...data,language:body.language}}));render(<WorkspaceOffer project="plaza" request={request} onClose={()=>{}}/>);
 const frame=await screen.findByTitle('Печатное предложение клиенту');expect(frame).toHaveAttribute('sandbox','allow-same-origin allow-modals');expect(frame.getAttribute('srcdoc')).toContain('Предложение по квартире');
 expect(api.post).toHaveBeenCalledWith('/project-workspace/plaza/offers/preview',{...request,language:'RU'},expect.any(Object));
 fireEvent.change(screen.getByLabelText('Язык предложения'),{target:{value:'TJ'}});await waitFor(()=>expect(screen.getByTitle('Печатное предложение клиенту').getAttribute('srcdoc')).toContain('Пешниҳод оид ба хариди хона'));
});
it('rechecks before printing and removes the preview on a stale-price/access error',async()=>{
 api.post.mockResolvedValueOnce({data}).mockRejectedValueOnce(new Error('Условия изменились'));
 render(<WorkspaceOffer project="plaza" request={request} onClose={()=>{}}/>);await screen.findByTitle('Печатное предложение клиенту');fireEvent.click(screen.getByRole('button',{name:'Печать / Сохранить PDF'}));
 expect(await screen.findByRole('alert')).toHaveTextContent('Условия изменились');expect(screen.queryByTitle('Печатное предложение клиенту')).not.toBeInTheDocument();expect(api.post).toHaveBeenCalledTimes(2);
});
it('prints only the freshly validated frame and supports repeated prints with identical HTML',async()=>{
 const print=vi.fn(),focus=vi.fn();
 vi.spyOn(HTMLIFrameElement.prototype,'contentWindow','get').mockReturnValue({print,focus});
 api.post.mockResolvedValue({data});
 render(<WorkspaceOffer project="plaza" request={request} onClose={()=>{}}/>);
 const initial=await screen.findByTitle('Печатное предложение клиенту');
 fireEvent.load(initial);expect(print).not.toHaveBeenCalled();
 for(let attempt=0;attempt<2;attempt++){
  const previous=screen.getByTitle('Печатное предложение клиенту');
  fireEvent.click(screen.getByRole('button',{name:'Печать / Сохранить PDF'}));
  await waitFor(()=>expect(screen.getByTitle('Печатное предложение клиенту')).not.toBe(previous));
  const fresh=screen.getByTitle('Печатное предложение клиенту');
  fireEvent.load(fresh);expect(print).toHaveBeenCalledTimes(attempt+1);
  fireEvent.load(fresh);expect(print).toHaveBeenCalledTimes(attempt+1);
 }
 expect(api.post).toHaveBeenCalledTimes(3);
});
