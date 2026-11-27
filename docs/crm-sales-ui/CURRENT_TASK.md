# CURRENT_TASK.md

- **ID задачи:** `GAP-08` — Точные дата и время задач (`due_at`, `due_date_only`, `Asia/Dushanbe`)
- **Статус:** `DONE` (`TasksPageDueTime.test.jsx` 3/3 вкл. `TZ=America/New_York` + `vite build` `PASS`; браузерный E2E — `NOT_RUN`)
- **Ветки:**
  - `alik7500-wq/tozon-crm`: `a00`
  - `alik7500-wq/tozon-backend`: `feat/crm-sales-completion`
- **Что сделано:**
  - `taskDueTime.js` + `TasksPage.jsx`: режимы «Дата и время» (`due_at` в UTC, ввод/показ `Asia/Dushanbe`) и «Только дата» (`due_date_only=true`, просрочка после `18:00 Asia/Dushanbe`), форма редактирования с сохранением режима и очисткой противоречивых полей.

## Следующая задача
- Переход к `GAP-07` (серверные rollback-скрипты) и `R09.3`.
