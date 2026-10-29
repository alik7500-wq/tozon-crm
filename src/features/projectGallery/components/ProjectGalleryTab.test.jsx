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

it('keeps the project visualization label and complete image in the card', async () => {
  projectGalleryApi.getProjectMedia.mockResolvedValue([
    { id: 1, title: 'Вид здания', url: '/render.jpg', category: 'EXTERIOR', is_active: true, metadata: { kind: 'architectural_visualization' } }
  ]);
  render(<ProjectGalleryTab projectId={3} />);
  const img = await screen.findByAltText('Вид здания');
  expect(img.className).toContain('object-contain');
  expect(screen.getByText('Проектная визуализация')).toBeTruthy();
});
