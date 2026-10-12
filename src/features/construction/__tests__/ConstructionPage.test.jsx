import React from 'react';
import { describe,it,expect,vi,beforeEach,afterEach } from 'vitest';
import { render,screen,fireEvent,waitFor,cleanup,within } from '@testing-library/react';
import { QueryClient,QueryClientProvider } from '@tanstack/react-query';
const mocks=vi.hoisted(()=>({get:vi.fn(),post:vi.fn(),patch:vi.fn()}));
vi.mock('../../../api/client',()=>({api:mocks}));
vi.mock('../../../components/FinanceTabs',()=>({FinanceTabs:()=>null}));
import { ConstructionPage } from '../ConstructionPage';
const uid='b6064e96-2c4b-47f7-95c9-c26fdfd139b8';
const initial={settings:{start_date:'2026-10-01',approver_user_id:null},parties:[{id:uid,name:'Усмонов Саидкодир',kind:'EMPLOYEE',active:true,user_id:2}],warehouses:[],materials:[],documents:[],stock:[],settlements:[],projects:[],users:[],permissions:{stock:true,advance:true,settlements:false,settings:false,approve:false}};
const renderPage=()=>render(<QueryClientProvider client={new QueryClient({defaultOptions:{queries:{retry:false}}})}><ConstructionPage/></QueryClientProvider>);
beforeEach(()=>{vi.clearAllMocks();mocks.get.mockResolvedValue({data:initial});mocks.post.mockResolvedValue({data:{}});});
afterEach(cleanup);
describe('Construction page workflows',()=>{
 it('shows own advance without administrative opening or settlement tabs',async()=>{
  renderPage();await screen.findByText('Строительный учёт');
  expect(screen.queryByRole('button',{name:'Начальные остатки'})).toBeNull();
  expect(screen.queryByRole('button',{name:'Справочники и доступ'})).toBeNull();
  expect(screen.queryByRole('button',{name:'Дебиторы и кредиторы'})).toBeNull();
  expect(screen.getByRole('button',{name:'Подотчёт'})).toBeTruthy();
 });
 it('shows opening balance on the first day as opening, not a new period advance',async()=>{
  const id='b6064e96-2c4b-47f7-95c9-c26fdfd139b9';
  mocks.get.mockResolvedValue({data:{...initial,documents:[{id,number:1,kind:'OPENING_ADVANCE',doc_date:'2026-10-01',status:'POSTED',currency:'TJS',lines:[]}],settlements:[{id:1,document_id:id,party_id:uid,account:'EMPLOYEE',currency:'TJS',amount:1000}]}});
  renderPage();await screen.findByText('Строительный учёт');fireEvent.click(screen.getByRole('button',{name:'Подотчёт'}));
  const cells=within(screen.getByText('Сотрудник должен отчитаться').closest('tr')).getAllByRole('cell');
  expect(cells[2].textContent.replace(/\s/g,'')).toBe('1000,00');expect(cells[3].textContent).toBe('0,00');
 });
 it('creates an advance report draft with currency, employee and supporting document',async()=>{
  renderPage();await screen.findByText('Строительный учёт');
  const create=screen.getByDisplayValue('+ Создать документ');fireEvent.change(create,{target:{value:'ADVANCE_REPORT'}});
  fireEvent.change(screen.getByLabelText('Подотчётное лицо'),{target:{value:uid}});
  fireEvent.change(screen.getByLabelText('Основание / назначение / причина'),{target:{value:'Закупка для стройки'}});
  fireEvent.change(screen.getByLabelText('Назначение расхода'),{target:{value:'Доставка'}});
  fireEvent.change(screen.getByLabelText('Сумма'),{target:{value:'120'}});
  fireEvent.change(screen.getByLabelText('Чек / накладная / подтверждение'),{target:{value:'Квитанция №12'}});
  fireEvent.click(screen.getByRole('button',{name:'Сохранить черновик'}));
  await waitFor(()=>expect(mocks.post).toHaveBeenCalledTimes(1));
  const [path,body]=mocks.post.mock.calls[0];expect(path).toBe('/construction/documents');
  expect(body.kind).toBe('ADVANCE_REPORT');expect(body.party_id).toBe(uid);expect(body.currency).toBe('TJS');expect(body.status).toBeUndefined();expect(body.lines[0].proof).toBe('Квитанция №12');expect(body.id).toMatch(/^[0-9a-f-]{36}$/);
 });
});
