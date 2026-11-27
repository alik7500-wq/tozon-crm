import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';

const { authState, apiMock } = vi.hoisted(() => ({
  authState: {
    user: { id: 1, name: 'Admin', role: 'ADMIN', permissions: ['*'] }
  },
  apiMock: {
    get: vi.fn(),
    put: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn()
  }
}));

vi.mock('../../../api/client', () => ({
  api: apiMock
}));

vi.mock('../../auth/AuthContext', () => ({
  useAuth: () => authState
}));

import { UsersPage } from '../UsersPage';
import { ProjectAccessModal } from '../ProjectAccessModal';

describe('GAP-05: Users Project Access UI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authState.user = { id: 1, name: 'Admin', role: 'ADMIN', permissions: ['*'] };
  });

  afterEach(() => {
    cleanup();
  });

  it('hides project-access action for DIRECTOR and SALES_MANAGER, shows for ADMIN', async () => {
    apiMock.get.mockImplementation((url) => {
      if (url === '/users') {
        return Promise.resolve({
          data: {
            users: [
              { id: 2, name: 'Manager A', email: 'm@t.tj', role: 'SALES_MANAGER', permissions: ['leads.view'], is_active: 1 }
            ]
          }
        });
      }
      if (url === '/roles') return Promise.resolve({ data: { roles: [] } });
      return Promise.resolve({ data: {} });
    });

    authState.user = { id: 10, name: 'Director', role: 'DIRECTOR', permissions: ['users.view', 'users.manage'] };
    const { unmount } = render(<UsersPage />);
    await waitFor(() => expect(screen.getByText('Manager A')).toBeTruthy());
    expect(screen.queryByRole('button', { name: /Доступ к проектам/i })).toBeNull();
    unmount();

    authState.user = { id: 1, name: 'Admin', role: 'ADMIN', permissions: ['*'] };
    render(<UsersPage />);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Доступ к проектам Manager A' })).toBeTruthy());
  });

  it('loads and saves specific projects, allProjectsAccess toggle, and empty list ("Нет доступа к проектам")', async () => {
    const onSaved = vi.fn();
    apiMock.get.mockImplementation((url) => {
      if (url === '/users/2') {
        return Promise.resolve({
          data: { user: { id: 2, name: 'Manager A', email: 'm@t.tj', all_projects_access: false, allowed_project_ids: ['1'] } }
        });
      }
      if (url === '/projects') {
        return Promise.resolve({
          data: { projects: [{ id: 1, name: 'Somon Residence' }, { id: 2, name: 'Tozon Plaza' }] }
        });
      }
      return Promise.resolve({ data: {} });
    });
    apiMock.put.mockImplementation((_url, body) =>
      Promise.resolve({
        data: {
          user: {
            id: 2,
            name: 'Manager A',
            email: 'm@t.tj',
            all_projects_access: body.all_projects_access,
            allowed_project_ids: body.allowed_project_ids.map(String)
          }
        }
      })
    );

    render(
      <ProjectAccessModal
        user={{ id: 2, name: 'Manager A', email: 'm@t.tj' }}
        isOpen={true}
        onClose={vi.fn()}
        onSaved={onSaved}
      />
    );

    await waitFor(() => expect(screen.getByLabelText('Somon Residence')).toBeTruthy());
    expect(screen.getByLabelText('Somon Residence').checked).toBe(true);
    expect(screen.getByLabelText('Tozon Plaza').checked).toBe(false);

    // Select 2nd project and save
    fireEvent.click(screen.getByLabelText('Tozon Plaza'));
    fireEvent.click(screen.getByRole('button', { name: /Сохранить доступ/i }));

    await waitFor(() => expect(apiMock.put).toHaveBeenCalledWith('/users/2/project-access', {
      all_projects_access: false,
      allowed_project_ids: [1, 2]
    }));
    expect(screen.getByText('Проектные права успешно сохранены')).toBeTruthy();
    expect(onSaved).toHaveBeenCalledTimes(1);

    // Toggle "Все проекты" on and save
    fireEvent.click(screen.getByLabelText(/Все проекты/i));
    fireEvent.click(screen.getByRole('button', { name: /Сохранить доступ/i }));
    await waitFor(() => expect(apiMock.put).toHaveBeenLastCalledWith('/users/2/project-access', {
      all_projects_access: true,
      allowed_project_ids: [1, 2]
    }));

    // Turn off "Все проекты" and uncheck all -> explicit "Нет доступа к проектам" state
    fireEvent.click(screen.getByLabelText(/Все проекты/i));
    fireEvent.click(screen.getByLabelText('Somon Residence'));
    fireEvent.click(screen.getByLabelText('Tozon Plaza'));
    expect(screen.getByText(/Нет доступа к проектам/i)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /Сохранить доступ/i }));
    await waitFor(() => expect(apiMock.put).toHaveBeenLastCalledWith('/users/2/project-access', {
      all_projects_access: false,
      allowed_project_ids: []
    }));
  });

  it('shows load error without rendering empty list, preserves edited values on save error, and blocks double submit', async () => {
    apiMock.get.mockRejectedValueOnce(new Error('Network down'));

    render(
      <ProjectAccessModal
        user={{ id: 2, name: 'Manager A', email: 'm@t.tj' }}
        isOpen={true}
        onClose={vi.fn()}
      />
    );

    await waitFor(() => expect(screen.getByText(/Не удалось загрузить проектные права/i)).toBeTruthy());
    expect(screen.queryByText(/Нет доступа к проектам/i)).toBeNull();
    expect(screen.getByRole('button', { name: /Сохранить доступ/i }).disabled).toBe(true);

    // Retry succeeds
    apiMock.get.mockImplementation((url) => {
      if (url === '/users/2') {
        return Promise.resolve({ data: { user: { id: 2, name: 'Manager A', all_projects_access: false, allowed_project_ids: [] } } });
      }
      return Promise.resolve({ data: { projects: [{ id: 1, name: 'Somon Residence' }] } });
    });
    fireEvent.click(screen.getByRole('button', { name: /Повторить загрузку/i }));
    await waitFor(() => expect(screen.getByLabelText('Somon Residence')).toBeTruthy());

    // Edit and simulate slow failing PUT (verify double-submit lock + preserved state)
    fireEvent.click(screen.getByLabelText('Somon Residence'));
    let rejectPut;
    apiMock.put.mockImplementationOnce(() => new Promise((_res, rej) => { rejectPut = rej; }));

    const saveBtn = screen.getByRole('button', { name: /Сохранить доступ/i });
    fireEvent.click(saveBtn);
    fireEvent.click(saveBtn); // 2nd click while in flight
    expect(apiMock.put).toHaveBeenCalledTimes(1);
    expect(saveBtn.disabled).toBe(true);

    rejectPut(new Error('Server 500'));
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('Server 500'));
    expect(screen.getByLabelText('Somon Residence').checked).toBe(true);
    expect(screen.queryByText('Проектные права успешно сохранены')).toBeNull();
  });

  it('ignores late response for previous user when switching user mid-request', async () => {
    let resolveUserA;
    apiMock.get.mockImplementation((url) => {
      if (url === '/users/2') {
        return new Promise((res) => { resolveUserA = res; });
      }
      if (url === '/users/3') {
        return Promise.resolve({
          data: { user: { id: 3, name: 'Manager B', email: 'b@t.tj', all_projects_access: true, allowed_project_ids: ['2'] } }
        });
      }
      if (url === '/projects') {
        return Promise.resolve({
          data: { projects: [{ id: 1, name: 'Proj 1' }, { id: 2, name: 'Proj 2' }] }
        });
      }
      return Promise.resolve({ data: {} });
    });

    const { rerender } = render(
      <ProjectAccessModal
        user={{ id: 2, name: 'Manager A', email: 'a@t.tj' }}
        isOpen={true}
        onClose={vi.fn()}
      />
    );

    // Switch immediately to Manager B before Manager A response resolves
    rerender(
      <ProjectAccessModal
        user={{ id: 3, name: 'Manager B', email: 'b@t.tj' }}
        isOpen={true}
        onClose={vi.fn()}
      />
    );

    await waitFor(() => expect(screen.getByLabelText('Proj 2').checked).toBe(true));
    expect(screen.getByLabelText(/Все проекты/i).checked).toBe(true);

    // Now late response for Manager A arrives with all_projects_access=false and Proj 1
    resolveUserA({
      data: { user: { id: 2, name: 'Manager A', email: 'a@t.tj', all_projects_access: false, allowed_project_ids: ['1'] } }
    });

    await waitFor(() => {
      expect(screen.getByLabelText(/Все проекты/i).checked).toBe(true);
      expect(screen.getByLabelText('Proj 2').checked).toBe(true);
      expect(screen.getByLabelText('Proj 1').checked).toBe(false);
    });
  });
});
