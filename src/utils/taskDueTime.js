export const TASK_TIMEZONE = 'Asia/Dushanbe';

/**
 * Returns YYYY-MM-DD in Asia/Dushanbe regardless of browser timezone.
 */
export function getDushanbeToday(nowInput = new Date()) {
  const date = nowInput instanceof Date ? nowInput : new Date(nowInput);
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TASK_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(date);
  const map = {};
  parts.forEach((p) => { map[p.type] = p.value; });
  return `${map.year}-${map.month}-${map.day}`;
}

/**
 * Converts a UTC ISO string into { date: 'YYYY-MM-DD', time: 'HH:MM' } in Asia/Dushanbe.
 */
export function formatDushanbeDateTimeParts(isoInput) {
  if (!isoInput) return { date: '', time: '' };
  const date = new Date(isoInput);
  if (Number.isNaN(date.getTime())) return { date: '', time: '' };

  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TASK_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).formatToParts(date);
  const map = {};
  parts.forEach((p) => { map[p.type] = p.value; });
  const hour = map.hour === '24' ? '00' : String(map.hour || '00').padStart(2, '0');
  const minute = String(map.minute || '00').padStart(2, '0');
  return {
    date: `${map.year}-${map.month}-${map.day}`,
    time: `${hour}:${minute}`
  };
}

/**
 * Converts Asia/Dushanbe date ('YYYY-MM-DD') + time ('HH:MM') into a UTC ISO string.
 * Returns null if date or time is empty/invalid (never substitutes a default time).
 */
export function dushanbeDateTimeToUtcIso(dateStr, timeStr) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(dateStr || ''))) return null;
  if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(String(timeStr || ''))) return null;
  const [y, m, d] = String(dateStr).split('-').map(Number);
  const check = new Date(Date.UTC(y, m - 1, d));
  if (check.getUTCFullYear() !== y || check.getUTCMonth() + 1 !== m || check.getUTCDate() !== d) return null;
  const parsed = new Date(`${dateStr}T${timeStr}:00+05:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

export function isTaskDateOnly(task) {
  if (!task) return true;
  return Boolean(task.due_date_only) || !task.due_at;
}

/**
 * Overdue evaluation consistent with backend:
 * - Only OPEN tasks can be overdue
 * - Exact due_at tasks: overdue after due_at
 * - Date-only / legacy tasks without due_at: overdue after 18:00 Asia/Dushanbe on due_date
 */
export function isTaskOverdue(task, nowInput = new Date()) {
  if (!task || task.status !== 'OPEN') return false;
  const nowMs = (nowInput instanceof Date ? nowInput : new Date(nowInput)).getTime();

  if (!isTaskDateOnly(task) && task.due_at) {
    const dueMs = Date.parse(task.due_at);
    return Number.isFinite(dueMs) ? dueMs < nowMs : false;
  }

  if (task.due_date && /^\d{4}-\d{2}-\d{2}$/.test(String(task.due_date).slice(0, 10))) {
    const datePart = String(task.due_date).slice(0, 10);
    const cutoffMs = Date.parse(`${datePart}T18:00:00+05:00`);
    return Number.isFinite(cutoffMs) ? cutoffMs < nowMs : false;
  }

  return false;
}

export function formatTaskDueDisplay(task) {
  if (!task?.due_at && !task?.due_date) return 'Без срока';

  if (!isTaskDateOnly(task) && task.due_at) {
    const { date, time } = formatDushanbeDateTimeParts(task.due_at);
    if (date) {
      const [y, m, d] = date.split('-');
      return `${d}.${m}.${y}, ${time} (Asia/Dushanbe)`;
    }
  }

  const rawDate = String(task.due_date || '').slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) {
    const [y, m, d] = rawDate.split('-');
    return `${d}.${m}.${y} (до 18:00 Asia/Dushanbe)`;
  }

  return 'Без срока';
}

export function buildTaskDuePayload({ mode, date, time }) {
  if (mode === 'DATETIME') {
    const utcIso = dushanbeDateTimeToUtcIso(date, time);
    return {
      due_at: utcIso,
      due_date: date,
      due_date_only: false,
      timezone: TASK_TIMEZONE
    };
  }
  return {
    due_at: null,
    due_date: date,
    due_date_only: true,
    timezone: TASK_TIMEZONE
  };
}
