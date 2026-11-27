# CURRENT_TASK.md

- **ID задачи:** `GAP-08.1` — Серверная согласованность сроков задач и строгая валидация времени на клиенте
- **Статус:** `DONE` (`TasksPageDueTime.test.jsx` 3/3 + `vite build` + `076_gap08_task_due_time.test.js` 4/4 `PASS`; браузерный E2E — `NOT_RUN`)
- **Ветки:**
  - `alik7500-wq/tozon-crm`: `a00`
  - `alik7500-wq/tozon-backend`: `feat/crm-sales-completion`
- **Что сделано:**
  - `taskDueTime.js` + `TasksPage.jsx`: режимы «Дата и время» (`due_at` в UTC, ввод/показ `Asia/Dushanbe`) и «Только дата» (`due_date_only=true`, просрочка после `18:00 Asia/Dushanbe`), форма редактирования с сохранением режима и очисткой противоречивых полей.

## Следующая задача
- Переход к `GAP-07` (серверные rollback-скрипты) и `R09.3`.
