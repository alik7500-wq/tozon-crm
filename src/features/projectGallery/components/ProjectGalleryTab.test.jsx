import React from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { ProjectGalleryTab } from './ProjectGalleryTab';
import { projectGalleryApi } from '../services/projectGalleryApi';

vi.mock('../../auth/AuthContext', () => ({ useAuth: () => ({ user: { role: 'ADMIN' } }) }));
vi.mock('../services/projectGalleryApi', () => ({ projectGalleryApi: { getProjectMedia: vi.fn() } }));
afterEach(() => { cleanup(); vi.clearAllMocks(); });

it('shows active materials and keeps archived images out of cards and the viewer', async () => {
  projectGalleryApi.getProjectMedia.mockResolvedValue([
    { id: 1, title: 'Новый фасад', url: '/new.jpg', category: 'EXTERIOR', is_active: true, description: 'Описание нового фасада' },
    { id: 2, title: 'Старый фасад', url: '/old.jpg', category: 'EXTERIOR', is_active: false }
  ]);
  render(<ProjectGalleryTab projectId={3} />);
  const card = await screen.findByText('Новый фасад');
  expect(projectGalleryApi.getProjectMedia).toHaveBeenCalledWith(3, { is_active: true });
  expect(screen.queryByText('Старый фасад')).toBeNull();
  fireEvent.click(card);
  expect(screen.getByText('1 / 1')).toBeTruthy();
  expect(screen.getAllByText('Описание нового фасада')).toHaveLength(2);
  expect(screen.queryByTitle('Следующее (→)')).toBeNull();
});

it('opens the requested active image after loading and stays closed after dismissal', async () => {
  projectGalleryApi.getProjectMedia.mockResolvedValue([
    { id: 1, title: 'Фасад', url: '/facade.jpg', category: 'EXTERIOR', is_active: true },
    { id: 37, title: 'TOZON PLAZA с высоты', url: '/aerial.jpg', category: 'MASTERPLAN', is_active: true }
  ]);
  render(<ProjectGalleryTab projectId={3} initialMediaId={37} />);
  await screen.findByText('2 / 2');
  expect(screen.getAllByAltText('TOZON PLAZA с высоты')).toHaveLength(2);
  fireEvent.click(screen.getByTitle('Закрыть (Esc)'));
  expect(screen.queryByText('2 / 2')).toBeNull();
  expect(screen.getAllByAltText('TOZON PLAZA с высоты')).toHaveLength(1);
});

it('reports a missing or archived target without opening a different image', async () => {
  projectGalleryApi.getProjectMedia.mockResolvedValue([
    { id: 1, title: 'Другой фасад', url: '/other.jpg', category: 'EXTERIOR', is_active: true },
    { id: 37, title: 'Архив', url: '/archived.jpg', category: 'MASTERPLAN', is_active: false }
  ]);
  render(<ProjectGalleryTab projectId={3} initialMediaId={37} />);
  expect((await screen.findByRole('alert')).textContent).toContain('Запрошенная визуализация недоступна');
  expect(screen.queryByTitle('Закрыть (Esc)')).toBeNull();
});

it('keeps the project visualization label and complete image in the card', async () => {
  projectGalleryApi.getProjectMedia.mockResolvedValue([
    { id: 1, title: 'Вид здания', url: '/render.jpg', category: 'EXTERIOR', is_active: true, metadata: { kind: 'architectural_visualization' } }
  ]);
  render(<ProjectGalleryTab projectId={3} />);
  const img = await screen.findByAltText('Вид здания');
  expect(img.className).toContain('object-contain');
  expect(screen.getByText('Проектная визуализация')).toBeTruthy();
});

it('opens the V/Г schematic inside project 4 even when there are no uploaded media', async () => {
  projectGalleryApi.getProjectMedia.mockResolvedValue([]);
  render(<ProjectGalleryTab projectId={4} initialMediaId="vg-schematic" initialBuildingId={7} buildings={[{ id:7,project_id:4,sections:[] }]} />);
  await screen.findByText('1 / 1');
  expect(screen.getByRole('heading',{name:'Блок Г',exact:true})).toBeTruthy();
  expect(screen.queryByRole('button',{name:'Блок А',exact:true})).toBeNull();
  fireEvent.mouseEnter(screen.getByRole('button',{name:'Блок В, 4 этаж',exact:true}));
  expect(screen.getByRole('heading',{name:'Блок В · 4 этаж'})).toBeTruthy();
  fireEvent.click(screen.getByRole('button',{name:'Блок В, 4 этаж',exact:true}));
  expect(screen.getByAltText('Типовая планировка Блок В, 4 этаж').getAttribute('src')).toContain('block_v_typical');
});
