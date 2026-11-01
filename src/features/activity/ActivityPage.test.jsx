import React from'react';import{it,expect,vi,afterEach}from'vitest';import{render,screen,fireEvent,cleanup,waitFor}from'@testing-library/react';
import{ActivityPage}from'./ActivityPage';import{api}from'../../api/client';
const auth=vi.hoisted(()=>({role:'ADMIN'}));vi.mock('../auth/AuthContext',()=>({useAuth:()=>({user:{role:auth.role}})}));vi.mock('../../api/client',()=>({api:{get:vi.fn()}}));afterEach(()=>{cleanup();vi.clearAllMocks();auth.role='ADMIN'});
it('shows staff and event history and sends employee filters to the server',async()=>{
 api.get.mockResolvedValue({data:{online_count:1,visited_today:1,users:[{id:2,name:'Менеджер',online:true,is_active:1}],events:[{id:1,actor_name:'Менеджер',summary:'Изменение · Сделки',entity_id:'77',outcome:'SUCCESS',changed_fields:['status'],created_at:'2026-11-02T05:00:00Z'}],next_before:'1'}});
 render(<ActivityPage/>);await screen.findByText('История действий');expect(screen.getByText('Изменение · Сделки')).toBeTruthy();expect(screen.getByText('Поля операции: Статус')).toBeTruthy();
 fireEvent.change(screen.getByLabelText('Сотрудник'),{target:{value:'2'}});await waitFor(()=>expect(api.get).toHaveBeenLastCalledWith('/auth/activity',expect.objectContaining({params:expect.objectContaining({user_id:'2'})})));
 fireEvent.click(screen.getByText('Следующие 100 событий'));await waitFor(()=>expect(api.get).toHaveBeenLastCalledWith('/auth/activity',expect.objectContaining({params:expect.objectContaining({before:'1'})})));
});
it('does not request privileged data for a manager',()=>{auth.role='SALES_MANAGER';render(<ActivityPage/>);expect(screen.getByText(/только администратору/)).toBeTruthy();expect(api.get).not.toHaveBeenCalled()});
it('shows a loading failure instead of inventing zero online users',async()=>{api.get.mockRejectedValue(new Error('Нет связи'));render(<ActivityPage/>);expect((await screen.findByRole('alert')).textContent).toBe('Нет связи');expect(screen.queryByText('Сейчас в CRM')).toBeNull()});
