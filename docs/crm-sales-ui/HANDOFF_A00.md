# HANDOFF_A00.md — Аудит интерфейса и подготовка подключения контракта

- **Задача:** `A00`
- **Статус:** `IN_PROGRESS` (заблокировано ожиданием публикации `C01` в `alik7500-wq/tozon-backend`)
- **Репозиторий / Ветка:** `alik7500-wq/tozon-crm` (`client/`), ветка `a00` (на базе `origin/main` `77901ae212622150e745152e77cc868bc48e8178`)
- **Backend SHA (`tozon-backend`, `origin/main`):** `e3464dd85f2d39d243c895864c9da35b513e7c34` (`C00 — IN_PROGRESS`, `C01` ещё не опубликован)
- **Контракт SHA (`C01`):** `PENDING_C01`

## Артефакты A00
- `client/docs/crm-sales-ui/TASKS.md` — реестр задач A00–A13 с зависимостями
- `client/docs/crm-sales-ui/CURRENT_TASK.md` — текущее состояние и блокер
- `client/docs/crm-sales-ui/AUDIT.md` — аудит маршрутов, компонентов, тестов и разрывов с F-01–F-20 / N-01–N-03
- `client/docs/crm-sales-ui/ACCEPTANCE_UI.md` — матрица A01–A52 в статусе `PENDING`
- `client/docs/crm-sales-ui/contracts.lock` — блокировка контракта (`PENDING_C01`)
- `client/scripts/sync-crm-contract.mjs` (+ `npm run contract:sync` в `client/package.json`) — скрипт синхронизации контракта и fixtures из `tozon-backend` с проверкой 40-символьного commit SHA и SHA-256 контрольных сумм
- `client/scripts/__tests__/sync-crm-contract.test.js` — unit-тесты синхронизации контракта

## Ограничения
- Ни один endpoint, поле, стадия или формат ответа не придуман.
- Backend (`server/`) и production не изменялись; merge в `main` не выполнялся.
- Синтетические fixtures не используются и не считаются доказательством готовности API.
- К задаче `A01` не переходим до закрытия `A00` после публикации `C01`.

## Команда следующего запуска (после публикации `C01`)
```text
Прочитай TOZON_CRM_TZ_ANTIGRAVITY_V1_1.md, AGENTS.md, TASKS.md, CURRENT_TASK.md и handoff C01. Выполни npm.cmd --prefix client run contract:sync, проверь версию контракта, полный SHA и SHA-256 в contracts.lock, сверь роли/стадии и закрой A00 в DONE.
```
