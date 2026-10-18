import React from 'react';
import { describe,it,expect,vi,afterEach } from 'vitest';
import { render,screen,fireEvent,waitFor,cleanup } from '@testing-library/react';
import { ReceiptPriceCorrection } from '../ReceiptPriceCorrection';
import { api } from '../../../api/client';
vi.mock('../../../api/client',()=>({api:{post:vi.fn()}}));
afterEach(()=>{cleanup();vi.clearAllMocks();});
const doc={id:'receipt',number:3,currency:'TJS',price_version:2,lines:[{material_id:'concrete',quantity:84.5,value:27885}]};
const materials=[{id:'concrete',name:'Бетон',unit:'м³'}];
it('converts unit price to receipt total and sends optimistic version and reason',async()=>{
 api.post.mockResolvedValue({});const saved=vi.fn();render(<ReceiptPriceCorrection document={doc} materials={materials} onSaved={saved} onClose={()=>{}}/>);
 fireEvent.change(screen.getByLabelText('Новая цена за единицу, TJS'),{target:{value:'500'}});
 expect(screen.getByLabelText('Новая стоимость строки, TJS').value).toBe('42250.00');
 fireEvent.change(screen.getByLabelText('Причина корректировки'),{target:{value:'Новая накладная'}});
 fireEvent.click(screen.getByText('Сохранить и пересчитать'));
 await waitFor(()=>expect(saved).toHaveBeenCalled());
 expect(api.post).toHaveBeenCalledWith('/construction/documents/receipt/price-corrections',expect.objectContaining({expected_version:2,reason:'Новая накладная',values:[42250]}));
});
it('shows failed correction and keeps dialog open with the same retry id',async()=>{
 api.post.mockRejectedValue(new Error('Цена уже изменена'));const saved=vi.fn();render(<ReceiptPriceCorrection document={doc} materials={materials} onSaved={saved} onClose={()=>{}}/>);
 fireEvent.change(screen.getByLabelText('Новая стоимость строки, TJS'),{target:{value:'30000'}});
 fireEvent.change(screen.getByLabelText('Причина корректировки'),{target:{value:'Ошибка цены'}});
 fireEvent.click(screen.getByText('Сохранить и пересчитать'));await screen.findByRole('alert');
 expect(saved).not.toHaveBeenCalled();
 fireEvent.click(screen.getByText('Сохранить и пересчитать'));await waitFor(()=>expect(api.post).toHaveBeenCalledTimes(2));
 expect(api.post.mock.calls[0][1].id).toBe(api.post.mock.calls[1][1].id);
});
