# CURRENT_TASK.md

- **ID задачи:** `A00` — Аудит интерфейса и подключение контракта
- **Статус:** `IN_PROGRESS` (аудит UI и механизм синхронизации контракта готовы; закрытие в `DONE` заблокировано отсутствием C01 в `tozon-backend`)
- **Ветка:** `a00` (перебазирована на `origin/main` = `77901ae212622150e745152e77cc868bc48e8178`)
- **Base SHA (`tozon-crm`):** `77901ae212622150e745152e77cc868bc48e8178`
- **Backend SHA (`tozon-backend`, `origin/main`):** `e3464dd85f2d39d243c895864c9da35b513e7c34` (C00 — IN_PROGRESS, C01 — не опубликован)

## Что уже работает
- Проведён полный аудит frontend (`client/src/`) и зафиксирован в `AUDIT.md`.
- Создана матрица UI-приёмки `ACCEPTANCE_UI.md` (все сценарии A01–A52 в статусе `PENDING`, без фиктивных `PASS`).
- Реализован и протестирован механизм синхронизации контракта и синтетических fixtures из `alik7500-wq/tozon-backend`:
  - `client/scripts/sync-crm-contract.mjs` (npm-скрипт `contract:sync`)
  - `client/scripts/__tests__/sync-crm-contract.test.js`
  - Проверка SHA-256 контрольных сумм, полного 40-символьного commit SHA, версии контракта и защита от подмены `contracts.lock` при отсутствии C01.

## Что не работает / блокировка
- `C01` от Codex ещё не опубликован в `alik7500-wq/tozon-backend` (`docs/crm-sales/` отсутствует на `origin/main` `e3464dd85f2d39d243c895864c9da35b513e7c34`).
- Поэтому `contracts.lock` остаётся в статусе `PENDING_C01`, ветка `a00` не завершена и не публикуется как готовая, переход к `A01` запрещён.

## Необходимое следующее действие
После публикации `C01` в `alik7500-wq/tozon-backend`:
1. Выполнить `git -C ../server fetch origin` и `npm.cmd --prefix client run contract:sync`.
2. Проверить версию контракта, полный commit SHA, SHA-256 суммы в `contracts.lock` и соответствие ролей/стадий в `AUDIT.md`.
3. Перевести `A00` в `DONE`, обновить `HANDOFF_A00.md` и опубликовать ветку `a00` в GitHub (без merge в `main`).
