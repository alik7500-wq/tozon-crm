import React from 'react';
import { it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { TelegramFinanceTab } from './TelegramFinanceTab';
import { api } from '../../api/client';
vi.mock('../../api/client', () => ({ api: { get: vi.fn(), put: vi.fn() } }));
beforeEach(() => { cleanup(); vi.clearAllMocks(); api.get.mockResolvedValue({ data: { tokenConfigured: true, workerActive: true, slots: { AKMALKHON: 'Акмалхон', ILHOM: 'Илхом', ASRORKHON: 'Асрорхон', MUBINCHON: 'Мубинчон' }, subscribers: [{ telegram_id: '12345', display_name: 'Synthetic user', status: 'PENDING' }], deliveries: [] } }); api.put.mockResolvedValue({}); });
it('requires selecting a named recipient and binds the verified Telegram ID', async () => {
  render(<TelegramFinanceTab/>);
  await screen.findByText('Synthetic user');
  const confirm = screen.getByText('Подтвердить доступ'); expect(confirm.disabled).toBe(true);
  fireEvent.change(screen.getByLabelText('Получатель 12345'), { target: { value: 'ILHOM' } });
  fireEvent.click(confirm);
  await waitFor(() => expect(api.put).toHaveBeenCalledWith('/telegram-finance/subscribers/12345', { slot: 'ILHOM' }));
});
it('revokes using a null slot and shows API errors', async () => {
  api.put.mockRejectedValue(new Error('Access failed'));
  render(<TelegramFinanceTab/>); await screen.findByText('Synthetic user'); fireEvent.click(screen.getByText('Отозвать доступ'));
  await screen.findByRole('alert'); expect(api.put).toHaveBeenCalledWith('/telegram-finance/subscribers/12345', { slot: null }); expect(screen.getByRole('alert').textContent).toBe('Access failed');
});
it('saves the cashier assignment, CRM author and explicit expense permission',async()=>{
 api.get.mockResolvedValue({data:{tokenConfigured:true,workerActive:true,slots:{ILHOM:'Илхом'},subscribers:[{telegram_id:'12345',display_name:'Synthetic user',slot:'ILHOM',status:'APPROVED'}],deliveries:[],cashDesks:[{id:'desk-a',name:'Own desk'}],crmUsers:[{id:2,name:'Synthetic cashier'}]}});
 render(<TelegramFinanceTab/>);await screen.findByText('Synthetic user');fireEvent.change(screen.getByLabelText('Касса 12345'),{target:{value:'desk-a'}});fireEvent.change(screen.getByLabelText('Автор РКО 12345'),{target:{value:'2'}});fireEvent.click(screen.getByLabelText('Ввод РКО 12345'));fireEvent.click(screen.getByText('Сохранить кассовый доступ'));
 await waitFor(()=>expect(api.put).toHaveBeenCalledWith('/telegram-finance/subscribers/12345/cash-access',{cash_desk_id:'desk-a',crm_user_id:2,can_create_expense:true}));
});
