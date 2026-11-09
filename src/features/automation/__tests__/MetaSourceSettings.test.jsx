import React from 'react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
const { api, auth } = vi.hoisted(() => ({ api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() }, auth: { user: { role: 'ADMIN' } } }));
vi.mock('../../../api/client', () => ({ api }));
vi.mock('../../auth/AuthContext', () => ({ useAuth: () => auth }));
import { MetaSourceSettings } from '../MetaSourceSettings';
beforeAll(() => { HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); }; });
afterEach(() => { cleanup(); vi.clearAllMocks(); auth.user = { role: 'ADMIN' }; });
const catalogue = () => ({ data: { enabled: true, connection: { display_name: 'Fixture administrator', status: 'connected', connected: true },
  sources: [{ id: 'fixture-source', channel: 'INSTAGRAM_MESSAGES', name: 'Tower account', username: 'tower', available: true, project_id: null }],
  projects: [{ id: '11', name: 'Tozon Plaza' }, { id: '12', name: 'Tozon Garden' }] } });
async function open() {
  render(<MetaSourceSettings />);
  fireEvent.click(screen.getByRole('button', { name: 'Настроить Instagram' }));
  await screen.findByText('Fixture administrator');
}
describe('Meta source settings', () => {
  it('shows discovered accounts and saves an explicit project mapping', async () => {
    api.get.mockResolvedValue(catalogue()); api.patch.mockResolvedValue({ status: 'success' });
    await open();
    fireEvent.change(screen.getByLabelText('Объект для Tower account'), { target: { value: '12' } });
    fireEvent.click(screen.getByRole('button', { name: 'Сохранить' }));
    await screen.findByText('Привязка сохранена');
    expect(api.patch).toHaveBeenCalledWith('/integrations/meta/sources/fixture-source', { projectId: '12' });
  });
  it('does not show save success when the server rejects the mapping', async () => {
    api.get.mockResolvedValue(catalogue()); api.patch.mockRejectedValue(new Error('Offline'));
    await open();
    fireEvent.change(screen.getByLabelText('Объект для Tower account'), { target: { value: '11' } });
    fireEvent.click(screen.getByRole('button', { name: 'Сохранить' }));
    await screen.findByRole('alert');
    expect(screen.queryByText('Привязка сохранена')).not.toBeInTheDocument();
  });
  it('distinguishes a load failure from an empty catalogue', async () => {
    api.get.mockRejectedValue(new Error('Offline'));
    render(<MetaSourceSettings />); fireEvent.click(screen.getByRole('button', { name: 'Настроить Instagram' }));
    await screen.findByRole('alert');
    expect(screen.queryByText('Учётная запись Meta не подключена')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Повторить загрузку' })).toBeInTheDocument();
  });
  it('does not offer a connect action when rollout is disabled', async () => {
    api.get.mockResolvedValue({ data: { enabled: false } });
    render(<MetaSourceSettings />); fireEvent.click(screen.getByRole('button', { name: 'Настроить Instagram' }));
    await screen.findByText(/Подключение новых источников пока недоступно/);
    expect(screen.queryByRole('button', { name: 'Подключить' })).not.toBeInTheDocument();
  });
  it('requires confirming shared-account disconnect and reloads actual status', async () => {
    api.get.mockResolvedValue(catalogue()); api.delete.mockResolvedValue({});
    await open();
    fireEvent.click(screen.getByRole('button', { name: 'Отключить' }));
    expect(api.delete).not.toHaveBeenCalled();
    api.get.mockResolvedValue({ data: { ...catalogue().data, connection: { status: 'disconnected', connected: false }, sources: [] } });
    fireEvent.click(screen.getByRole('button', { name: 'Подтвердить отключение' }));
    await screen.findByText('Учётная запись Meta не подключена');
    expect(api.delete).toHaveBeenCalledWith('/integrations/meta/connection');
  });
  it('does not expose source settings to employees or restricted administrators', () => {
    auth.user = { role: 'MANAGER' };
    const view = render(<MetaSourceSettings />);
    expect(screen.queryByRole('button', { name: 'Настроить Instagram' })).not.toBeInTheDocument();
    auth.user = { role: 'ADMIN', permissions: ['access.v2', 'automation.view'] };
    view.rerender(<MetaSourceSettings />);
    expect(screen.queryByRole('button', { name: 'Настроить Instagram' })).not.toBeInTheDocument();
    expect(api.get).not.toHaveBeenCalled();
  });
});
