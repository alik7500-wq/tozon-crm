// @vitest-environment jsdom
import React from 'react';
import {it, expect, vi, afterEach} from 'vitest';
import {render, screen, cleanup} from '@testing-library/react';
import {LayoutsTab} from '../tabs/LayoutsTab';
vi.mock('../../../api/client', () => ({api: {get: vi.fn().mockResolvedValue({data:{layouts:[
  {id:1,code:'PDF20251016-A-5',name:'Блок А — тип 5 — 55.7100000000000000 м²',rooms:1,area_m2_x100:5571,default_price_per_m2_minor:65000},
  {id:2,code:'CEILING315-10-A-4',name:'Блок А — 10 этаж — тип 4',rooms:1,area_m2_x100:5500,default_price_per_m2_minor:65000}
]}})}}));
vi.mock('../../auth/AuthContext', () => ({useAuth: () => ({user:{role:'MANAGER'}})}));
vi.mock('../../../components/ImageUpload', () => ({default: () => null}));
afterEach(cleanup);
it('shows clean layout titles and exact hundredths in the project cards', async () => {
  const {container}=render(<LayoutsTab projectId={3}/>);
  expect(await screen.findByText('Блок А — тип 5 — 55.71 м²')).toBeTruthy();
  expect(screen.getByText('55,71 м²')).toBeTruthy();
  expect(screen.getByText('55 м²')).toBeTruthy();
  expect(screen.getByText('PDF20251016-A-5')).toBeTruthy();
  expect(container.textContent).not.toContain('55.710000');
  expect(container.textContent).not.toContain('55.0');
});
