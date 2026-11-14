// @vitest-environment jsdom
import React from 'react';
import {it,expect,vi,beforeEach,afterEach} from 'vitest';
import {render,screen,fireEvent,cleanup,waitFor} from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
vi.mock('../../api/client',()=>({api:{get:vi.fn(),post:vi.fn()}}));
import {api} from '../../api/client';
import {BuyerParticipantsPanel} from './BuyerParticipantsPanel';
const user={role:'DIRECTOR'},deal={id:1,status:'SIGNED'};
beforeEach(()=>{vi.clearAllMocks();api.get.mockResolvedValue({data:[]});api.post.mockResolvedValue({data:{id:'p'}});});afterEach(cleanup);
it('requires a CRM card preview and verification before approving a participant',async()=>{
 api.get.mockImplementation(async path=>({data:path.includes('/candidate/')?{id:2,name:'Участник',maskedPhone:'+992•••••0002'}:[]}));
 render(<BuyerParticipantsPanel deal={deal} user={user} onInvite={vi.fn()}/>);
 expect(screen.getByRole('button',{name:'Подтвердить участника'})).toBeDisabled();
 fireEvent.change(screen.getByLabelText('ID карточки участника в CRM'),{target:{value:'2'}});fireEvent.click(screen.getByRole('button',{name:'Проверить карточку'}));
 expect(await screen.findByText('Участник · +992•••••0002')).toBeInTheDocument();
 await waitFor(()=>expect(screen.getByRole('checkbox')).toBeEnabled());
 fireEvent.change(screen.getByLabelText('Основание доступа'),{target:{value:'Доверенность №123'}});fireEvent.click(screen.getByRole('checkbox'));fireEvent.click(screen.getByRole('button',{name:'Подтвердить участника'}));
 await waitFor(()=>expect(api.post).toHaveBeenCalledWith('/deals/1/buyer-participants',{leadId:2,role:'CO_BUYER',basis:'Доверенность №123',verified:true}));
});
it('lets assigned managers issue approved participant QR but hides approval/revocation controls',async()=>{
 api.get.mockResolvedValue({data:[{id:'p',lead_id:2,leads:{full_name:'Участник'},role:'CO_BUYER',basis:'Проверенный договор'}]});const invite=vi.fn();
 render(<BuyerParticipantsPanel deal={deal} user={{role:'SALES_MANAGER'}} onInvite={invite}/>);fireEvent.click(await screen.findByRole('button',{name:'QR участника'}));
 expect(invite).toHaveBeenCalledWith('p','Участник');expect(screen.queryByRole('button',{name:'Подтвердить участника'})).not.toBeInTheDocument();expect(screen.queryByRole('button',{name:'Отозвать доступ к договору'})).not.toBeInTheDocument();
});
it('allows revoking archived participation and never issues a fresh QR after termination',async()=>{
 api.get.mockResolvedValue({data:[{id:'p',lead_id:2,role:'CO_BUYER',basis:'Проверенный договор'}]});const revoked=vi.fn();
 render(<BuyerParticipantsPanel deal={{...deal,status:'CANCELLED'}} user={user} onInvite={vi.fn()} onRevoked={revoked}/>);fireEvent.click(await screen.findByRole('button',{name:'Отозвать доступ к договору'}));
 await waitFor(()=>expect(api.post).toHaveBeenCalledWith('/deals/1/buyer-participants/p/revoke'));expect(revoked).toHaveBeenCalledWith('p');expect(screen.queryByRole('button',{name:'QR участника'})).not.toBeInTheDocument();expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
});
