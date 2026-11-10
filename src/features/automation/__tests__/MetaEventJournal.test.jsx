import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
const { api } = vi.hoisted(() => ({ api: { get: vi.fn(), post: vi.fn() } }));
vi.mock('../../../api/client', () => ({ api }));
import { MetaEventJournal } from '../MetaEventJournal';
afterEach(() => { cleanup(); vi.clearAllMocks(); });
const projects = [{ id: '11', name: 'Plaza' }, { id: '12', name: 'Garden' }];
const event = (id, projectId, channel = 'INSTAGRAM_MESSAGES') => ({ id, source_id: 'source', project_id: projectId, channel,
  status: projectId ? 'DONE' : 'UNASSIGNED', received_at: '2026-11-01T00:00:00Z', payload: { text: `Fixture ${id}` }, projects: projectId ? { name: projectId === '11' ? 'Plaza' : 'Garden' } : null });
const renderJournal = () => render(<MetaEventJournal provider="INSTAGRAM" projects={projects} sources={[{ id: 'source', project_id: '12', available: true }]} />);
describe('Meta event journal', () => {
  it('filters events by provider and selected project', async () => {
    api.get.mockResolvedValue({ data: { events: [event('one', '11'), event('two', '12'), event('other', '11', 'FACEBOOK_FORM')] } });
    renderJournal(); await screen.findByText('Fixture one'); expect(screen.queryByText('Fixture other')).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Фильтр обращений по ЖК'), { target: { value: '12' } });
    expect(screen.queryByText('Fixture one')).not.toBeInTheDocument(); expect(screen.getByText('Fixture two')).toBeInTheDocument();
  });
  it('requires an explicit action before routing a historical unassigned event', async () => {
    api.get.mockResolvedValue({ data: { events: [event('unassigned', null)] } }); api.post.mockResolvedValue({ status: 'success' });
    renderJournal(); await screen.findByText('Fixture unassigned'); expect(api.post).not.toHaveBeenCalled();
    api.get.mockResolvedValue({ data: { events: [event('unassigned', '12')] } });
    fireEvent.click(screen.getByRole('button', { name: 'Принять в Garden' }));
    await screen.findByText('Получено');
    expect(api.post).toHaveBeenCalledWith('/integrations/meta/events/unassigned/assign', { expectedProjectId: '12' });
  });
  it('distinguishes failed loading from an empty event list', async () => {
    api.get.mockRejectedValue(new Error('Offline')); renderJournal(); await screen.findByRole('alert');
    expect(screen.queryByText('Обращений по выбранному фильтру пока нет.')).not.toBeInTheDocument();
  });
  it('shows a created lead link and a fixed review reason', async () => {
    api.get.mockResolvedValue({ data: { events: [{ ...event('lead', '11'), lead_id: '71' }, { ...event('review', '11'), status: 'NEEDS_REVIEW', error_code: 'PHONE_MISSING_OR_INVALID' }] } });
    renderJournal(); await screen.findByText('Передано в лиды');
    expect(screen.getByRole('link', { name: 'Открыть лид' })).toHaveAttribute('href', '/leads?leadId=71');
    expect(screen.getByText('В форме нет корректного телефона. Лид не создан.')).toBeInTheDocument();
  });
});
