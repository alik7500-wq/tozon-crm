// @vitest-environment jsdom
import React from 'react';
import {it,expect,vi,afterEach} from 'vitest';
import {render,screen,cleanup} from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
vi.mock('../../api/client',()=>({api:{get:vi.fn()}}));
import {api} from '../../api/client';
import {BuyerNoticesPanel} from './BuyerNoticesPanel';
afterEach(()=>{cleanup();vi.clearAllMocks();});
it('distinguishes uncertain delivery from sent and never displays private recipient IDs',async()=>{
 api.get.mockResolvedValue({data:[{id:'n',kind:'PAYMENT',status:'UNKNOWN',audience:'OWNER',createdAt:'2026-11-14T07:00:00Z',telegramId:'PRIVATE_TG'}]});
 render(<BuyerNoticesPanel dealId={1}/>);expect(await screen.findByText(/Доставка не подтверждена/)).toBeInTheDocument();expect(screen.getByText(/Основной покупатель/)).toBeInTheDocument();expect(screen.queryByText(/PRIVATE_TG/)).not.toBeInTheDocument();
});
it('does not invent successful delivery when the journal is unavailable',async()=>{
 api.get.mockRejectedValue(new Error('Denied'));render(<BuyerNoticesPanel dealId={2}/>);expect(await screen.findByRole('alert')).toHaveTextContent('Не удалось загрузить журнал');expect(screen.queryByText('Отправлено')).not.toBeInTheDocument();
});
