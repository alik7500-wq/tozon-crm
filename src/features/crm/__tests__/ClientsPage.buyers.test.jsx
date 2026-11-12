import React from 'react';
import { it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup, act } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
const api=vi.hoisted(()=>({get:vi.fn()}));
vi.mock('../../../api/client',()=>({api}));
vi.mock('../ClientDetailModal',()=>({ClientDetailModal:()=>null}));
vi.mock('../EditClientModal',()=>({EditClientModal:()=>null}));
vi.mock('../../../components/sms/SendSmsModal',()=>({SendSmsModal:()=>null}));
import { ClientsPage } from '../ClientsPage';
afterEach(()=>{cleanup();vi.resetAllMocks();});
const deal=(id,lead,name,status='SIGNED',price=10000)=>({id,lead_id:lead,lead_name:name,status,final_price_minor:price,paid_amount_minor:1000,contract_number:String(id),unit_number:String(id),project_name:'Test project'});
const show=()=>render(<MemoryRouter><ClientsPage/></MemoryRouter>);
it('lists only signed buyers, excluding Instagram/manual leads, reservations, cancelled and missing statuses',async()=>{
 api.get.mockImplementation(url=>Promise.resolve({data:url==='/deals'?{deals:[deal(1,10,'Buyer'),deal(2,20,'Reservation','RESERVED'),deal(3,30,'Cancelled','CANCELLED'),{...deal(4,40,'Unknown'),status:undefined}]}:{leads:[{id:50,full_name:'Instagram lead',source:'INSTAGRAM'},{id:60,full_name:'Manual lead'}]}}));
 show();expect(await screen.findByText('Buyer')).toBeTruthy();
 for(const name of ['Reservation','Cancelled','Unknown','Instagram lead','Manual lead'])expect(screen.queryByText(name)).toBeNull();
 expect(api.get).toHaveBeenCalledWith('/deals',{params:{status:'SIGNED'}});expect(api.get.mock.calls.some(([url])=>url==='/leads')).toBe(false);
 expect(screen.queryByText('Добавить клиента')).toBeNull();expect(screen.getByRole('link',{name:'Перейти к лидам'}).getAttribute('href')).toBe('/leads');
});
it('groups purchases by lead identity without merging unrelated people who share a name',async()=>{
 api.get.mockResolvedValue({data:{deals:[deal(1,10,'Same name'),deal(2,10,'Same name'),deal(3,30,'Same name')]}});
 show();await screen.findByText('2 сделки');expect(screen.getAllByText('Same name')).toHaveLength(2);
});
it('adds a buyer after signing and refreshes on the contract event',async()=>{
 let signed=false;api.get.mockImplementation(()=>Promise.resolve({data:{deals:[deal(1,10,'New buyer',signed?'SIGNED':'RESERVED')]}}));
 show();await screen.findByText('Клиенты пока не найдены');signed=true;
 await act(async()=>{window.dispatchEvent(new CustomEvent('tozon:contract-signed'));});
 expect(await screen.findByText('New buyer')).toBeTruthy();
});
it('does not report a request failure as an empty buyers register and can retry',async()=>{
 api.get.mockRejectedValueOnce(new Error('offline')).mockResolvedValue({data:{deals:[deal(1,10,'Buyer')]}});
 show();expect(await screen.findByRole('alert')).toBeTruthy();expect(screen.queryByText('Клиенты пока не найдены')).toBeNull();
 fireEvent.click(screen.getByText('Повторить'));expect(await screen.findByText('Buyer')).toBeTruthy();
});
it('routes an existing notification for an unconverted lead to the leads section',async()=>{
 api.get.mockResolvedValue({data:{deals:[]}});
 const LeadLocation=()=>{const location=useLocation();return <p>Lead page{location.search}</p>;};
 render(<MemoryRouter initialEntries={['/clients?clientId=50']}><Routes><Route path="/clients" element={<ClientsPage/>}/><Route path="/leads" element={<LeadLocation/>}/></Routes></MemoryRouter>);
 expect(await screen.findByText('Lead page?leadId=50')).toBeTruthy();
});
