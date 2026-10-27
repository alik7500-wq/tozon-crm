import React from 'react';
import {it,expect,vi} from 'vitest';
import {render,screen,fireEvent,waitFor} from '@testing-library/react';
import {DiscountSchemesTab,EXAMPLE_DISCOUNT_RULES} from './DiscountSchemesTab';
import {api} from '../../api/client';
vi.mock('../../api/client',()=>({api:{get:vi.fn(),post:vi.fn()}}));
it('creates a project scheme with all six example conditions',async()=>{
api.get.mockResolvedValue({data:{schemes:[]}});api.post.mockResolvedValue({data:{scheme:{id:'s',project_id:3,name:'Новая схема',rules:EXAMPLE_DISCOUNT_RULES,is_active:true}}});
render(<DiscountSchemesTab projects={[{id:3,name:'Плаза'}]}/>);
fireEvent.click(screen.getByText('+ Создать схему'));
fireEvent.change(screen.getByLabelText('Цена со скидкой за м² 2'),{target:{value:'650'}});
fireEvent.click(screen.getByText('Сохранить'));
await waitFor(()=>expect(api.post).toHaveBeenCalledWith('/discount-schemes',expect.objectContaining({project_id:3,rules:EXAMPLE_DISCOUNT_RULES.map((r,i)=>i===1?{...r,price_per_m2:'650'}:r)})));
await screen.findByText('Схема сохранена');
});
