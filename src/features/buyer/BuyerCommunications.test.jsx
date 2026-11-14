// @vitest-environment jsdom
import React from 'react';
import {it,expect,vi,beforeEach,afterEach} from 'vitest';
import {render,screen,fireEvent,cleanup,waitFor} from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
vi.mock('./buyer-api',()=>({buyerRequest:vi.fn()}));
import {buyerRequest} from './buyer-api';
import BuyerCommunications from './BuyerCommunications';
beforeEach(()=>{vi.clearAllMocks();buyerRequest.mockImplementation(async path=>path==='/communication-settings'?{enabled:true,language:'ru'}:[]);});
afterEach(cleanup);
it('keeps one request ID when retrying an uncertain delivery and uses only the selected deal',async()=>{
 const ids=[];buyerRequest.mockImplementation(async(path,_auth,options)=>{if(path==='/communication-settings')return {enabled:true};if(path==='/contact'){ids.push(options.body);if(ids.length===1)throw new Error('NETWORK');return {id:ids[0].id};}return [];});
 render(<BuyerCommunications initData="signed" dealId="7" language="ru"/>);await screen.findByRole('checkbox');
 fireEvent.change(screen.getByRole('textbox'),{target:{value:'Мой вопрос'}});fireEvent.click(screen.getByRole('button',{name:'Отправить'}));
 expect(await screen.findByRole('alert')).toHaveTextContent('Повторите позже');
 fireEvent.click(screen.getByRole('button',{name:'Отправить'}));expect(await screen.findByRole('status')).toHaveTextContent('сохранено');
 expect(ids).toHaveLength(2);expect(ids[0]).toEqual(ids[1]);expect(ids[0]).toMatchObject({dealId:'7',message:'Мой вопрос'});expect(ids[0]).not.toHaveProperty('telegramId');expect(screen.getByRole('textbox')).toHaveValue('');
});
it('saves an explicit boolean notification preference and the displayed language',async()=>{
 buyerRequest.mockImplementation(async(path,_auth,options)=>path==='/communication-settings'?(options?.method==='PATCH'?{enabled:false,language:'tj'}:{enabled:true,language:'tj'}):[]);
 render(<BuyerCommunications initData="signed" dealId="7" language="tj"/>);fireEvent.click(await screen.findByRole('checkbox'));
 await waitFor(()=>expect(screen.getByRole('checkbox')).not.toBeChecked());
 expect(buyerRequest).toHaveBeenCalledWith('/communication-settings','signed',expect.objectContaining({method:'PATCH',body:{enabled:false,language:'tj'}}));
});
it('shows manager replies as text and marks only the chosen notice read',async()=>{
 buyerRequest.mockImplementation(async path=>path==='/communication-settings'?{enabled:true}:path==='/inquiries'?[{id:'q',message:'Вопрос',reply:'<script>Ответ</script>',createdAt:'2026-11-14T07:00:00Z'}]:path==='/notices'?[{id:'n',kind:'INQUIRY_REPLY',contractNumber:'001',readAt:null}]:{});
 render(<BuyerCommunications initData="signed" dealId="7" language="ru"/>);expect(await screen.findByText('<script>Ответ</script>')).toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:'Отметить прочитанным'}));expect(await screen.findByText('Прочитано')).toBeInTheDocument();
 expect(buyerRequest).toHaveBeenCalledWith('/notice-read','signed',expect.objectContaining({body:{id:'n'}}));
});
it('does not show a previous buyer history after changing contracts',async()=>{
 buyerRequest.mockImplementation(async(path,_auth,options)=>path==='/communication-settings'?{enabled:true}:path==='/inquiries'?(options.body.dealId==='7'?[{id:'q',message:'Первый договор',createdAt:'2026-11-14'}]:[]):[]);
 const view=render(<BuyerCommunications initData="signed" dealId="7" language="ru"/>);await screen.findByText('Первый договор');
 view.rerender(<BuyerCommunications initData="signed" dealId="8" language="ru"/>);await waitFor(()=>expect(screen.queryByText('Первый договор')).not.toBeInTheDocument());
});
