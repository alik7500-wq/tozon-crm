# HANDOFF_A00.md — Аудит интерфейса и подключение контракта

- **Задача:** `A00`
- **Статус:** `IN_PROGRESS` (аудит завершён; финальное закрытие в `DONE` заблокировано ожиданием `C01` от Codex)
- **Репозиторий / Ветка:** `alik7500-wq/tozon-crm` (`client/`), ветка `a00` (от `origin/main` `d39a253861a3874e162adde57f638aae0eaaaca7`)
- **Backend SHA (`tozon-backend`):** `9f75559fa8ff6229833b92ecb7cdffccbf9be967` (`origin/main`)
- **Контракт SHA (`C01`):** `PENDING_C01` (в `tozon-backend` ещё нет `docs/crm-sales/`)

## Выполненные артефакты
- `client/docs/crm-sales-ui/TASKS.md` — реестр задач A00–A13
- `client/docs/crm-sales-ui/CURRENT_TASK.md` — текущее состояние и чекпоинт
- `client/docs/crm-sales-ui/AUDIT.md` — полный аудит маршрутов, компонентов, тестов и разрывов с F-01–F-20 / N-01–N-03
- `client/docs/crm-sales-ui/contracts.lock` — заготовка блокировки контракта (`PENDING_C01`)

## Проверки (выполнены на `d39a253861a3874e162adde57f638aae0eaaaca7`)
- `npm.cmd --prefix client run build` → **PASS** (`vite build` + `buyer-static-entry.js`, 4.70s)
- `npx.cmd --prefix client vitest run src/features/leads src/features/crm src/features/instagram --environment jsdom` → **PASS** (11 files, 56 tests)
- `npm.cmd --prefix client run test` → **FAIL** (49/88 files failed: `document is not defined` без `--environment jsdom`)
- `npm.cmd --prefix client run lint` → **FAIL** (16 errors, 806 warnings в существующем коде)

## Блокер для закрытия A00 → DONE
- Отсутствует зафиксированный контракт `C01` (OpenAPI/JSON Schema, fixtures, commit SHA) в `alik7500-wq/tozon-backend`.

## Команда следующего запуска
После публикации `C01` в `alik7500-wq/tozon-backend`:
```text
Прочитай TOZON_CRM_TZ_ANTIGRAVITY_V1_1.md, AGENTS.md, TASKS.md, CURRENT_TASK.md и handoff C01. Продолжи задачу A00: подключи контракт C01 по его SHA в contracts.lock, сверь роли/стадии и закрой A00 в DONE.
```
