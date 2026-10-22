import React from 'react';
import { describe,it,expect,vi,beforeEach,afterEach } from 'vitest';
import {render,screen,fireEvent,waitFor,cleanup} from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import {EditDealModal} from '../EditDealModal';
import {ContractPrintView} from '../ContractPrintView';
import {api} from '../../../api/client';
vi.mock('../../../api/client',()=>({api:{get:vi.fn(),post:vi.fn(),patch:vi.fn()}}));
vi.mock('../../../hooks/useModalDismiss',()=>({useModalDismiss:({onClose})=>({requestClose:onClose})}));
const car={brand_model:'Test Camry',production_year:'2010',color:'Серебро',registration_number:'TEST',vin:'TESTVIN',registration_certificate:'CERT-TEST',mileage_km:'123000',handover_date:'2026-10-22',condition:'Исправен',accessories:'Два ключа',encumbrances:'Нет'};
const deal={id:62,unit_id:24,unit_number:'24',currency:'USD',status:'SIGNED',payment_type:'PARTIAL_BARTER',contract_number:'0062',deal_date:'2026-10-22',area_m2_x100:5571,final_price_minor:3398300,deal_price_per_m2_minor:61000,discount_minor:0,down_payment_minor:1405400,barter_amount_minor:1405400,installment_months:12,total_paid_minor:1405405,vehicle_details:null,passport_number:'TEST',schedules:[{due_date:'2026-11-22',amount_minor:100000}]};
beforeEach(()=>{vi.clearAllMocks();api.get.mockImplementation(path=>Promise.resolve(path==='/users'?{users:[]}:{data:{deal:{...deal,vehicle_details:car},amendments:[]}}));api.patch.mockResolvedValue({data:{deal:{...deal,vehicle_details:car}}});});
afterEach(cleanup);
const open=(value=deal)=>render(<EditDealModal isOpen deal={value} onClose={()=>{}} />);
describe('car fields in paid contract editing',()=>{
 it('fills missing data on an already paid deal and sends no locked financial fields',async()=>{
  open(); fireEvent.change(screen.getByLabelText('Марка и модель'),{target:{value:car.brand_model}});
  fireEvent.change(screen.getByLabelText('Госномер'),{target:{value:car.registration_number}});
  fireEvent.click(screen.getByRole('button',{name:'Сохранить изменения'}));
  await waitFor(()=>expect(api.patch).toHaveBeenCalled());
  const [url,payload]=api.patch.mock.calls[0];expect(url).toBe('/deals/62');expect(payload.vehicle_details).toEqual({brand_model:car.brand_model,registration_number:car.registration_number});
  for(const key of ['final_price_minor','down_payment_minor','payment_type','installment_months','barter_amount_minor'])expect(payload).not.toHaveProperty(key);
 });
 it('loads all saved fields and leaves the vehicle unchanged if editing another field',async()=>{
  open({...deal,vehicle_details:car});
  Object.values(car).forEach(value=>expect(screen.getAllByDisplayValue(value).length).toBeGreaterThan(0));
  fireEvent.click(screen.getByRole('button',{name:'Сохранить изменения'}));
  await waitFor(()=>expect(api.patch).toHaveBeenCalled());expect(api.patch.mock.calls[0][1]).not.toHaveProperty('vehicle_details');
  expect(screen.queryByText(/Номер двигателя/)).toBeNull();
 });
 it('fetches canonical vehicle values when the list row omits them',async()=>{
  open({...deal,vehicle_details:undefined});await screen.findByDisplayValue(car.vin);
  expect(api.get).toHaveBeenCalledWith('/deals/62');
 });
 it('blocks save if canonical vehicle loading fails',async()=>{
  api.get.mockImplementation(path=>path==='/deals/62'?Promise.reject(new Error('Offline')):Promise.resolve({users:[]}));
  open({...deal,vehicle_details:undefined});await screen.findByText(/Не удалось загрузить данные автомобиля/);
  fireEvent.click(screen.getByRole('button',{name:'Сохранить изменения'}));expect(api.patch).not.toHaveBeenCalled();
 });
 it('preserves entered car fields after a save failure',async()=>{
  api.patch.mockRejectedValue(new Error('Save failed'));open();fireEvent.change(screen.getByLabelText('VIN'),{target:{value:'NEWVIN'}});fireEvent.click(screen.getByRole('button',{name:'Сохранить изменения'}));await screen.findByText('Save failed');expect(screen.getByDisplayValue('NEWVIN')).toBeInTheDocument();
 });
 it('resets car fields when another deal is opened',()=>{
  const view=open({...deal,vehicle_details:car});view.rerender(<EditDealModal isOpen deal={{...deal,id:63,vehicle_details:null}} onClose={()=>{}}/>);expect(screen.getByLabelText('Марка и модель')).toHaveValue('');
 });
 it('prints the updated canonical car values in the act',()=>{
  render(<ContractPrintView deal={{...deal,vehicle_details:car}} initialLang="RU" onClose={()=>{}}/>);fireEvent.click(screen.getByText('Акт приёма-передачи'));const text=document.getElementById('print-section').textContent;expect(text).toContain(car.brand_model);expect(text).toContain(car.vin);expect(text).toContain(car.registration_number);
 });
});
