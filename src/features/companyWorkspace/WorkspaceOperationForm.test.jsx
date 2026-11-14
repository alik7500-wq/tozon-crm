import React from 'react';
import {afterEach,beforeEach,it,expect,vi} from 'vitest';
import {render,screen,fireEvent,waitFor,cleanup} from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import WorkspaceOperationForm from './WorkspaceOperationForm';
import {api} from '../../api/client';
vi.mock('../../api/client',()=>({api:{get:vi.fn(),post:vi.fn()}}));
afterEach(cleanup);
beforeEach(()=>{
 vi.clearAllMocks();api.get.mockImplementation(path=>Promise.resolve({data:{records:path.endsWith('cash_desks')?[{id:'cash',name:'Касса Plaza'}]:[],has_more:false}}));
});
async function fill(){
 fireEvent.change(await screen.findByLabelText('Касса'),{target:{value:'cash'}});
 fireEvent.change(screen.getByLabelText('Сумма'),{target:{value:'10'}});
 fireEvent.change(screen.getByLabelText('Статья расхода'),{target:{value:'Расход Plaza'}});
}
it('preserves the same command on uncertain retries and locks editing and closing',async()=>{
 const complete=vi.fn(),close=vi.fn();
 api.post.mockRejectedValueOnce(new Error('Network failure')).mockResolvedValueOnce({data:{id:'expense',resource:'expenses'}});
 render(<WorkspaceOperationForm project="plaza" kind="EXPENSE" onComplete={complete} onClose={close}/>);await fill();
 fireEvent.click(screen.getByRole('button',{name:'Подтвердить операцию'}));
 const retry=await screen.findByRole('button',{name:'Повторить тот же запрос'});
 expect(screen.getByLabelText('Сумма')).toBeDisabled();expect(screen.getByLabelText('Закрыть операцию')).toBeDisabled();
 fireEvent.click(retry);await waitFor(()=>expect(complete).toHaveBeenCalledTimes(1));
 expect(api.post).toHaveBeenCalledTimes(2);expect(api.post.mock.calls[1]).toEqual(api.post.mock.calls[0]);expect(close).not.toHaveBeenCalled();
});
it('prevents duplicate submit while a request is pending',async()=>{
 api.post.mockReturnValue(new Promise(()=>{}));render(<WorkspaceOperationForm project="plaza" kind="EXPENSE" onComplete={vi.fn()} onClose={vi.fn()}/>);await fill();
 const button=screen.getByRole('button',{name:'Подтвердить операцию'});fireEvent.click(button);fireEvent.click(button);
 expect(api.post).toHaveBeenCalledTimes(1);expect(screen.getByRole('button',{name:'Сохранение…'})).toBeDisabled();
});
it('allows correction after a definitive validation rejection',async()=>{
 api.post.mockRejectedValue(Object.assign(new Error('Недостаточно средств'),{status:409}));render(<WorkspaceOperationForm project="plaza" kind="EXPENSE" onComplete={vi.fn()} onClose={vi.fn()}/>);await fill();fireEvent.click(screen.getByRole('button',{name:'Подтвердить операцию'}));
 expect(await screen.findByRole('alert')).toHaveTextContent('Недостаточно средств');expect(screen.getByLabelText('Сумма')).toBeEnabled();expect(screen.getByLabelText('Закрыть операцию')).toBeEnabled();
});

it('requires separate confirmation for draft cancellation and keeps a financial rejection editable',async()=>{
 api.get.mockResolvedValue({data:{records:[{id:1,name:'Own draft',status:'DRAFT',updated_at:'version'}],has_more:false}});api.post.mockRejectedValue(Object.assign(new Error('Нужна отдельная процедура расчёта'),{status:409}));
 render(<WorkspaceOperationForm project="plaza" kind="CANCEL_DRAFT" onComplete={vi.fn()} onClose={vi.fn()}/>);
 fireEvent.change(await screen.findByLabelText('Черновик для отмены'),{target:{value:'1'}});fireEvent.change(screen.getByLabelText('Причина закрытия'),{target:{value:'Клиент отказался'}});fireEvent.click(screen.getByRole('checkbox'));
 fireEvent.click(screen.getByRole('button',{name:'Отменить черновик'}));expect(await screen.findByRole('alert')).toHaveTextContent('отдельная процедура');expect(api.post.mock.calls[0][1]).toMatchObject({kind:'CANCEL_DRAFT',payload:{deal_id:1,expected_updated_at:'version',reason:'Клиент отказался'}});expect(screen.getByLabelText('Причина закрытия')).toBeEnabled();
});
