import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import {
  dushanbeDateTimeToUtcIso,
  formatDushanbeDateTimeParts,
  formatTaskDueDisplay,
  isTaskOverdue
} from '../../../utils/taskDueTime';

const { apiMock } = vi.hoisted(() => ({
  apiMock: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn()
  }
}));

vi.mock('../../../api/client', () => ({
  api: apiMock
}));

import { TasksPage } from '../TasksPage';

describe('GAP-08: Exact Task Date/Time (Asia/Dushanbe), Modes & Overdue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('converts Asia/Dushanbe across UTC date boundary independently of browser timezone', () => {
    // 2026-11-27 01:00 Asia/Dushanbe === 2026-11-26T20:00:00.000Z (previous UTC date!)
    const utcIso = dushanbeDateTimeToUtcIso('2026-11-27', '01:00');
    expect(utcIso).toBe('2026-11-26T20:00:00.000Z');

    const parts = formatDushanbeDateTimeParts('2026-11-26T20:00:00.000Z');
    expect(parts).toEqual({ date: '2026-11-27', time: '01:00' });
  });

  it('evaluates overdue accurately right before/after due_at, at 18:00 Asia/Dushanbe for date-only, and excludes COMPLETED/CANCELLED', () => {
    const exactTask = {
      id: 1,
      status: 'OPEN',
      due_date_only: false,
      due_at: '2026-11-27T09:00:00.000Z', // 14:00 Asia/Dushanbe
      due_date: '2026-11-27'
    };
    expect(isTaskOverdue(exactTask, new Date('2026-11-27T08:59:59.000Z'))).toBe(false);
    expect(isTaskOverdue(exactTask, new Date('2026-11-27T09:00:01.000Z'))).toBe(true);

    const dateOnlyTask = {
      id: 2,
      status: 'OPEN',
      due_date_only: true,
      due_at: null,
      due_date: '2026-11-27'
    };
    // 17:59 Asia/Dushanbe = 12:59Z; 18:01 Asia/Dushanbe = 13:01Z
    expect(isTaskOverdue(dateOnlyTask, new Date('2026-11-27T12:59:00.000Z'))).toBe(false);
    expect(isTaskOverdue(dateOnlyTask, new Date('2026-11-27T13:01:00.000Z'))).toBe(true);

    expect(isTaskOverdue({ ...exactTask, status: 'COMPLETED' }, new Date('2026-11-27T15:00:00.000Z'))).toBe(false);
    expect(isTaskOverdue({ ...exactTask, status: 'CANCELLED' }, new Date('2026-11-27T15:00:00.000Z'))).toBe(false);
    expect(formatTaskDueDisplay(dateOnlyTask)).toBe('27.11.2026 (до 18:00 Asia/Dushanbe)');
  });

  it('creates and edits both modes, preserves exact time on normal edit, switches modes cleanly, and handles legacy tasks without due_at', async () => {
    const tasksDb = [
      {
        id: 10,
        title: 'Старая задача',
        type: 'CALL',
        priority: 'NORMAL',
        status: 'OPEN',
        due_date: '2026-12-01',
        due_at: null,
        due_date_only: true
      }
    ];

    apiMock.get.mockResolvedValue({ data: { tasks: [...tasksDb] } });
    apiMock.post.mockImplementation((_url, body) => {
      const created = { id: 11, status: 'OPEN', ...body };
      tasksDb.unshift(created);
      return Promise.resolve({ data: { task: created } });
    });
    apiMock.put.mockImplementation((url, body) => {
      const id = Number(url.split('/').pop());
      const idx = tasksDb.findIndex((t) => t.id === id);
      tasksDb[idx] = { ...tasksDb[idx], ...body };
      return Promise.resolve({ data: { task: tasksDb[idx] } });
    });

    render(
      <MemoryRouter>
        <TasksPage />
      </MemoryRouter>
    );

    await waitFor(() => expect(screen.getByText('Старая задача')).toBeTruthy());
    expect(screen.getByText(/01\.12\.2026 \(до 18:00 Asia\/Dushanbe\)/)).toBeTruthy();

    // 1. Create exact DATETIME task (01:00 Asia/Dushanbe on 2026-12-02 -> 2026-12-01T20:00:00.000Z)
    fireEvent.click(screen.getByRole('button', { name: /Создать задачу/i }));
    fireEvent.change(screen.getByPlaceholderText(/Позвонить по поводу первого взноса/i), {
      target: { value: 'Точный звонок' }
    });
    fireEvent.change(screen.getByLabelText(/Дата \*/i), { target: { value: '2026-12-02' } });
    fireEvent.change(screen.getByLabelText(/Время \(Asia\/Dushanbe\) \*/i), { target: { value: '01:00' } });
    fireEvent.click(screen.getByRole('button', { name: /^Сохранить$/i }));

    await waitFor(() => expect(apiMock.post).toHaveBeenCalledWith('/tasks', expect.objectContaining({
      title: 'Точный звонок',
      due_at: '2026-12-01T20:00:00.000Z',
      due_date: '2026-12-02',
      due_date_only: false,
      timezone: 'Asia/Dushanbe'
    })));

    // 2. Re-open for normal edit (title only) -> preserves exact due_at
    fireEvent.click(screen.getByRole('button', { name: 'Редактировать задачу Точный звонок' }));
    expect(screen.getByLabelText(/Дата \*/i).value).toBe('2026-12-02');
    expect(screen.getByLabelText(/Время \(Asia\/Dushanbe\) \*/i).value).toBe('01:00');

    fireEvent.change(screen.getByPlaceholderText(/Позвонить по поводу первого взноса/i), {
      target: { value: 'Точный звонок (обновлён)' }
    });
    fireEvent.click(screen.getByRole('button', { name: /^Сохранить$/i }));

    await waitFor(() => expect(apiMock.put).toHaveBeenCalledWith('/tasks/11', expect.objectContaining({
      title: 'Точный звонок (обновлён)',
      due_at: '2026-12-01T20:00:00.000Z',
      due_date_only: false
    })));

    // 3. Switch mode to DATE_ONLY -> clears due_at to null
    fireEvent.click(screen.getByRole('button', { name: 'Редактировать задачу Точный звонок (обновлён)' }));
    fireEvent.click(screen.getByLabelText('Только дата'));
    fireEvent.click(screen.getByRole('button', { name: /^Сохранить$/i }));

    await waitFor(() => expect(apiMock.put).toHaveBeenLastCalledWith('/tasks/11', expect.objectContaining({
      due_at: null,
      due_date: '2026-12-02',
      due_date_only: true,
      timezone: 'Asia/Dushanbe'
    })));

    // 4. Open legacy task without due_at -> opens in DATE_ONLY without fabricated time
    fireEvent.click(screen.getByRole('button', { name: 'Редактировать задачу Старая задача' }));
    expect(screen.getByLabelText('Только дата').checked).toBe(true);
    expect(screen.queryByLabelText(/Время \(Asia\/Dushanbe\)/i)).toBeNull();
  });
});
