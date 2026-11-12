import React from 'react';
import { it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
const api=vi.hoisted(()=>({get:vi.fn(),post:vi.fn()}));
vi.mock('../../../api/client',()=>({api}));
vi.mock('../../documents/PassportScannerModal',()=>({PassportScannerModal:()=>null}));
import { DealWizardModal } from '../DealWizardModal';
const unit={id:30,unit_kind:'APARTMENT',unit_number:'24',area_m2_x100:5000,price_per_m2_minor:50000,project_currency:'USD'};
const leads=[{id:1,full_name:'Existing buyer',phone:'000000001'},{id:2,full_name:'Instagram lead',phone:''},{id:3,full_name:'Reserved contact',phone:'000000003'},{id:4,full_name:'Won without contract',status:'WON'}];
function setup(fail=false){api.get.mockImplementation(path=>path==='/deals'&&fail?Promise.reject(new Error('offline')):Promise.resolve({data:path==='/leads'?{leads}:path==='/deals'?{deals:[{lead_id:'1',status:'SIGNED'},{lead_id:2,status:'CANCELLED'},{lead_id:3,status:'RESERVED'}]}:path==='/projects'?{projects:[]}:path==='/deals/available-units'?{units:[unit]}:{}}));}
afterEach(()=>{cleanup();vi.resetAllMocks();});
it('offers only buyers with signed contracts, not new leads, reservations or WON alone',async()=>{
 setup();render(<DealWizardModal isOpen unit={unit} onClose={vi.fn()}/>);
 expect(await screen.findByText('Existing buyer')).toBeTruthy();
 for(const name of ['Instagram lead','Reserved contact','Won without contract'])expect(screen.queryByText(name)).toBeNull();
 expect(api.get).toHaveBeenCalledWith('/deals',{params:{status:'SIGNED'}});
 fireEvent.click(screen.getByText('Existing buyer'));fireEvent.click(screen.getByText('Далее'));expect(screen.getByText('Existing buyer')).toBeTruthy();
});
it('fails closed if signed contracts cannot be loaded',async()=>{
 setup(true);render(<DealWizardModal isOpen unit={unit} onClose={vi.fn()}/>);
 expect(await screen.findByText('Не удалось загрузить существующих покупателей. Повторите открытие окна.')).toBeTruthy();
 expect(screen.queryByText('Instagram lead')).toBeNull();expect(screen.queryByText('Existing buyer')).toBeNull();
});
it('keeps a manually entered first buyer selectable for this contract without adding them to the existing buyer list',async()=>{
 setup();api.post.mockResolvedValue({data:{lead:{id:5,full_name:'New first buyer',phone:'000000005'}}});
 render(<DealWizardModal isOpen unit={unit} onClose={vi.fn()}/>);await screen.findByText('Existing buyer');
 fireEvent.click(screen.getByText('+ Создать вручную'));
 fireEvent.change(screen.getByPlaceholderText('Алиев Рустам Бахромович'),{target:{value:'New first buyer'}});
 fireEvent.change(screen.getByPlaceholderText('+992 900 00 00 00'),{target:{value:'000000005'}});
 fireEvent.click(screen.getByText('Сохранить и выбрать'));
 expect(await screen.findByText('Новый покупатель для этого договора: New first buyer')).toBeTruthy();
 fireEvent.click(screen.getByText('Далее'));expect(screen.getByText('New first buyer')).toBeTruthy();
});
