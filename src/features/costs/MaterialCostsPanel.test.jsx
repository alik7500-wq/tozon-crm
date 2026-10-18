// @vitest-environment jsdom
import React from 'react';
import { it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MaterialCostsPanel } from './MaterialCostsPanel';
import { api } from '../../api/client';
vi.mock('../../api/client',()=>({api:{put:vi.fn(),post:vi.fn()}}));
const blocks=[{id:3,name:'Блок Б',project_name:'TOZON PLAZA'}];
const usage={id:'00000000-0000-4000-8000-000000000001',building_id:3,material_kind:'CONCRETE',usage_date:'2026-10-01',quantity:84.5,unit:'м³',amount:27885,currency:'TJS',exchange_rate:9.26,reason:'Акт подбетонки',status:'ACTIVE',version:1,paid_amount:0,unpaid_amount:27885,usd_minor:301134,unpaid_usd_minor:301134,included:true,payments:[]};
const data={can_write:true,material_sources:[{id:4,document_number:4,material_name:'Бетон М-150',quantity:84.5,amount:27885,currency:'TJS',exchange_rate:9.26,usage_date:'2026-10-01',unit:'м³',linked:false}],rows:[{id:8,reference:'РКО-8',date:'2026-10-02',currency:'USD',amount_minor:100000,available_material_payment_usd_minor:100000,state:'UNASSIGNED'}]};
const mount = d => render(<QueryClientProvider client={new QueryClient({defaultOptions:{mutations:{retry:false}}})}><MaterialCostsPanel data={d} blocks={blocks} asOf="2026-10-18"/></QueryClientProvider>);
afterEach(()=>{cleanup();vi.resetAllMocks();});
it('requires an explicit block and imports the actual stock writeoff values',async()=>{
 api.put.mockResolvedValue({data:{}});mount(data);fireEvent.click(screen.getByText('Добавить расход материала'));
 fireEvent.change(screen.getByLabelText('Источник материала'),{target:{value:'4'}});
 expect(screen.getByLabelText('Стоимость материала').value).toBe('27885');expect(screen.getByLabelText('Стоимость материала').disabled).toBe(true);
 expect(screen.getByLabelText('Блок материала').value).toBe('');fireEvent.click(screen.getByText('Сохранить'));
 expect(screen.getByRole('alert').textContent).toContain('Выберите блок');expect(api.put).not.toHaveBeenCalled();
 fireEvent.change(screen.getByLabelText('Блок материала'),{target:{value:'3'}});fireEvent.change(screen.getByLabelText('Основание материала'),{target:{value:'Акт подбетонки'}});fireEvent.click(screen.getByText('Сохранить'));
 await waitFor(()=>expect(api.put).toHaveBeenCalledWith(expect.stringContaining('/costs/material-usages/'),expect.objectContaining({stock_entry_id:4,building_id:3,material_kind:'CONCRETE',amount:27885,quantity:84.5,expected_version:0})));
});
it('keeps native debt settlement separate from cash USD for cross-currency payment',async()=>{
 api.put.mockResolvedValue({data:{}});mount({...data,material_usages:[usage]});fireEvent.click(screen.getByText('Привязать оплату по РКО'));
 fireEvent.change(screen.getByLabelText('Оплачивающий РКО'),{target:{value:'8'}});
 expect(screen.getByLabelText('Часть РКО USD').value).toBe('1000');expect(screen.getByLabelText('Погашено материала').value).toBe('');
 fireEvent.change(screen.getByLabelText('Погашено материала'),{target:{value:'9260'}});fireEvent.change(screen.getByLabelText('Основание оплаты материала'),{target:{value:'Оплата поставщику по акту'}});fireEvent.click(screen.getByText('Сохранить'));
 await waitFor(()=>expect(api.put).toHaveBeenCalledWith(expect.stringContaining('/costs/material-payments/'),expect.objectContaining({usage_id:usage.id,expense_id:8,paid_amount:9260,cash_usd_minor:100000})));
});
it('hides mutation controls for read-only users',()=>{
 mount({...data,can_write:false,material_usages:[usage]});expect(screen.queryByText('Добавить расход материала')).toBeNull();expect(screen.queryByText('Привязать оплату по РКО')).toBeNull();
});
