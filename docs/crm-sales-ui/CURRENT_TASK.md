# CURRENT_TASK.md

- **ID задачи:** `A00` — Аудит интерфейса и подключение контракта
- **Статус:** `IN_PROGRESS` (аудит UI завершён; закрытие в `DONE` заблокировано отсутствием C01 в `tozon-backend`)
- **Ветка:** `a00` (создана от `origin/main` = `d39a253861a3874e162adde57f638aae0eaaaca7`)
- **Base SHA (`tozon-crm`):** `d39a253861a3874e162adde57f638aae0eaaaca7`
- **Backend SHA (`tozon-backend`, `origin/main`):** `9f75559fa8ff6229833b92ecb7cdffccbf9be967`
- **Последний сохранённый SHA:** локальные коммиты в ветке `a00` выполняются после записи контрольных файлов

## Что уже работает
- Проведён полный аудит frontend (`client/src/`): маршруты (`App.jsx`), навигация (`navigationRegistry.js`), права (`permissions.js`), API-слой (`api/client.js`), аутентификация (`AuthContext.jsx`), модули лидов, клиентов, Instagram Direct, задач, сделок, аналитики и автоматизации.
- Проверена production-сборка: `npm.cmd --prefix client run build` — PASS (`vite build` + `buyer-static-entry.js`, 4.70s).
- Проверены CRM/Sales UI-тесты с `--environment jsdom`: `npx.cmd --prefix client vitest run src/features/leads src/features/crm src/features/instagram --environment jsdom` — 11/11 файлов, 56/56 тестов PASS.
- Созданы контрольные документы `TASKS.md`, `CURRENT_TASK.md`, `AUDIT.md`, `contracts.lock` (со статусом `PENDING_C01`), `HANDOFF_A00.md`.

## Что не работает / ограничения
- `C01` от Codex ещё не опубликован в `alik7500-wq/tozon-backend` (каталог `docs/crm-sales/` отсутствует на `origin/main` `9f75559fa8ff6229833b92ecb7cdffccbf9be967`), поэтому реальный SHA контракта и OpenAPI/JSON Schema не могут быть закреплены в `contracts.lock`.
- `npm.cmd --prefix client run test` без `--environment jsdom` падает на 49/88 файлах с `ReferenceError: document is not defined`, так как в `client/vite.config.js` не задан `test.environment: 'jsdom'`.
- `npm.cmd --prefix client run lint` (`oxlint`) завершается с кодом 1: 16 errors и 806 warnings в существующем коде (до начала работ по A00).

## Последние проверки
- `npm.cmd --prefix client run build` → exit 0 (`dist/` собран за 4.70s)
- `npx.cmd --prefix client vitest run src/features/leads src/features/crm src/features/instagram --environment jsdom` → exit 0 (11 files, 56 tests passed)
- `npm.cmd --prefix client run test` → exit 1 (49 failed / 39 passed из 88 файлов — отсутствует `--environment jsdom` по умолчанию)
- `npm.cmd --prefix client run lint` → exit 1 (16 errors, 806 warnings)

## Необходимое следующее действие
1. Дождаться публикации задачи `C01` (OpenAPI/JSON Schema, fixtures и commit SHA) в репозитории `alik7500-wq/tozon-backend`.
2. Обновить `contracts.lock` реальными `contract_sha`, `contract_version`, `checksum` и сверить названия ролей/стадий.
3. Перевести `A00` в `DONE` и перейти к задаче `A01`.
