# CURRENT_TASK.md

- **ID задачи:** `R01` — Актуальность веток (review-fix)
- **Статус:** `DONE`
- **Ветка (`tozon-crm`):** `a00`
- **Актуальный `origin/main` (`tozon-crm`):** `2737182` (слит в `a00` без конфликтов через `git merge --no-edit origin/main`, включая 15 коммитов `resettlement`)
- **Актуальный `origin/main` (`tozon-backend`):** `261018e` (слит в `feat/crm-sales-completion` без конфликтов через `git merge --no-edit origin/main`, включая 8 коммитов `resettlement`)

## Что сделано в R01
- Получен актуальный `origin/main` обоих репозиториев (`git fetch origin`).
- Обе рабочие ветки (`feat/crm-sales-completion` и `a00`) согласованы с `origin/main` без force push и без reset, с сохранением всех изменений `resettlement` и нашей доработки CRM.
- Конфликтов слияния: 0.
- Проверены сборка и тесты после слияния:
  - `npm.cmd --prefix client run build` → PASS (`2.62s`)
  - `npx.cmd --prefix client vitest run src/features/leads src/features/crm src/features/instagram scripts/__tests__/sync-crm-contract.test.js --environment jsdom` → PASS (13/13 файлов, 64/64 тестов)
  - `npm.cmd --prefix server test -- src/db/migrations/__tests__/060_crm_sales_completion_foundation.test.js src/db/migrations/__tests__/060_pre_release_isolation.test.js src/modules/leads/__tests__/leadDomain.test.js` → PASS (3/3 файлов, 8/8 тестов)

## Следующая задача
- `R02` — Безопасная миграция и откат (проверка реестра миграций, откат версии приложения без удаления накопленных данных, `EXECUTE` для всех перегрузок `fn_assign_lead_atomic`).
