# HANDOFF_GAP05.md — Управление проектными правами (`GAP-05` / `GAP-05.1`)

## Статус проверок
| Проверка | Среда | Статус |
|---|---|---|
| Форма `ProjectAccessModal` + `UsersPage` (конкретные проекты, «Все проекты», пустой список, ошибки, смена пользователя, закрытие/повторное открытие во время сохранения, блокировка полей при `isSaving`) | Vitest jsdom (`UsersProjectAccess.test.jsx`, 6/6) | `PASS` |
| Production build frontend (`npm.cmd --prefix client run build`) | Vite | `PASS` |
| Проверка репозитория после отзыва доступа + RBAC `PUT /api/users/:id/project-access` (`075_gap05_project_access_api.test.js`, 2/2) | PGlite + Express | `PASS` |
| Полный HTTP/Instagram сценарий с действующей сессией | Staging / Browser E2E | `NOT_RUN` |
