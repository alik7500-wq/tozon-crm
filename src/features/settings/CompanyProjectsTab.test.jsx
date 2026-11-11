import React from 'react';
import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { CompanyProjectsTab } from './CompanyProjectsTab';
import { api } from '../../api/client';
vi.mock('../../api/client', () => ({ api: { get: vi.fn(), put: vi.fn(), post: vi.fn() } }));
const first = { id:'ddac6e43-39b6-4f31-a872-aaf77e77d416',name:'Tozon Plaza',code:'TOZON_PLAZA',location:'Худжанд',director_name:'',director_authority:'',revision:1,partners:[],members:[],complex_ids:[3,4] };
const data = { company:{name:'ООО «ТОЗОН»'},isolation_ready:false,projects:[first,{...first,id:'ddac6e43-39b6-4f31-a872-aaf77e77d417',name:'Tozon Tower',code:'TOZON_TOWER',complex_ids:[5]}],complexes:[{id:3,name:'ЖК TOZON PLAZA'},{id:4,name:'ЖК TOZON PLAZA-2'},{id:5,name:'ЖК Tower'}],users:[{id:1,name:'Тестовый сотрудник'}] };
beforeEach(() => { vi.clearAllMocks(); api.get.mockImplementation(path=>Promise.resolve({data:path.endsWith('/setup')?{revision:1,members:[],cash_desks:[],warehouses:[]}:path.endsWith('/unbound-deals')?{records:[],has_more:false}:data})); });
afterEach(cleanup);
async function open() { render(<CompanyProjectsTab/>); fireEvent.click(await screen.findByRole('button',{name:/Tozon Plaza/})); }
describe('company project preparation settings', () => {
  it('shows preparation state and locks complexes belonging to another project', async () => {
    await open(); expect(screen.getByText('Подготовка разделения данных.')).toBeVisible();
    expect(screen.getByRole('checkbox',{name:'ЖК TOZON PLAZA'})).toBeChecked();
    expect(screen.getByRole('checkbox',{name:/ЖК Tower/})).toBeDisabled();
    expect(screen.getByRole('button',{name:'Сохранить проект'})).toBeDisabled();
  });
  it('validates shares before sending and then saves both complexes with revision', async () => {
    await open(); fireEvent.click(screen.getByRole('button',{name:'+ Добавить партнёра'}));
    fireEvent.change(screen.getByLabelText('Партнёр 1'),{target:{value:'Акмалхон'}});
    fireEvent.change(screen.getByLabelText('Доля партнёра 1'),{target:{value:'50'}});
    fireEvent.click(screen.getByRole('button',{name:'Сохранить проект'}));
    expect(await screen.findByRole('alert')).toHaveTextContent('100%'); expect(api.put).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button',{name:'+ Добавить партнёра'}));
    fireEvent.change(screen.getByLabelText('Партнёр 2'),{target:{value:'Партнёр ТОЗОН'}});
    fireEvent.change(screen.getByLabelText('Доля партнёра 2'),{target:{value:'50'}});
    api.put.mockResolvedValue({data:{project:{...first,revision:2}}});
    fireEvent.click(screen.getByRole('button',{name:'Сохранить проект'}));
    await waitFor(() => expect(api.put).toHaveBeenCalledWith(`/company-projects/${first.id}`, expect.objectContaining({revision:1,complex_ids:[3,4],partners:[{name:'Акмалхон',share_percent:50},{name:'Партнёр ТОЗОН',share_percent:50}]})));
    expect(await screen.findByText(/Проект сохранён/)).toBeVisible();
  });
  it('keeps user input on revision conflict, without silently overwriting another save', async () => {
    await open(); fireEvent.change(screen.getByLabelText('ФИО директора объекта'),{target:{value:'Новый директор'}});
    api.put.mockRejectedValue(new Error('Проект изменён другим пользователем. Обновите список и повторите.'));
    fireEvent.click(screen.getByRole('button',{name:'Сохранить проект'}));
    expect(await screen.findByRole('alert')).toHaveTextContent('другим пользователем');
    expect(screen.getByLabelText('ФИО директора объекта')).toHaveValue('Новый директор');
  });
  it('requires an employee before saving a planned membership', async () => {
    await open(); fireEvent.click(screen.getByRole('button',{name:'+ Назначить сотрудника'}));
    fireEvent.submit(screen.getByRole('button',{name:'Сохранить проект'}).closest('form'));
    expect(await screen.findByRole('alert')).toHaveTextContent('Выберите сотрудника'); expect(api.put).not.toHaveBeenCalled();
  });
});
