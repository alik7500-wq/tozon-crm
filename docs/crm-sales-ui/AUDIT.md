# AUDIT.md — Аудит интерфейса TOZON CRM (A00)

**Дата аудита:** 2026-11-23  
**Исполнитель:** Antigravity (`alik7500-wq/tozon-crm`, ветка `a00`)  
**Статус контракта C01:** `PENDING_C01` (в `alik7500-wq/tozon-backend` на `origin/main` каталог `docs/crm-sales/` ещё не создан).

---

## 1. Зафиксированные SHA и окружение

| Репозиторий | Ветка | Исторический SHA из ТЗ | Актуальный SHA (`origin/main`) | Примечание |
|---|---|---|---|---|
| `alik7500-wq/tozon-crm` (`client/`) | `a00` (от `origin/main`) | `f6c7bd4b4009d2f2c9f60f0d2525466984fafac3` | `d39a253861a3874e162adde57f638aae0eaaaca7` | +1 коммит (`Show barter sale receivable and installment schedule`) |
| `alik7500-wq/tozon-backend` (`server/`) | `main` (`origin/main`) | `dbf0ce7ca195500d5904fd77c9f97a4046225dec` | `9f75559fa8ff6229833b92ecb7cdffccbf9be967` | +2 коммита поверх среза ТЗ; файлов `docs/crm-sales/` нет |

**Стек frontend (`client/package.json`):**
- React `19.2.8`, Vite `8.2.0`, React Router `7.18.2`, Axios `1.19.0`, TanStack React Query `5.101.4`, Ant Design `6.6.1`, Tailwind CSS `4.3.3`, Vitest `4.1.11`, Oxlint `1.75.0`. JavaScript (без TypeScript).

**Результаты базовых проверок на `d39a253861a3874e162adde57f638aae0eaaaca7`:**
1. `npm.cmd --prefix client run build` (`vite build && node scripts/buyer-static-entry.js`): **PASS** (4.70s).
2. `npx.cmd --prefix client vitest run src/features/leads src/features/crm src/features/instagram --environment jsdom`: **PASS** (11 test files, 56 tests).
3. `npm.cmd --prefix client run test` (`vitest run`): **FAIL** (49 failed / 39 passed из 88 файлов) — причина: в `client/vite.config.js` не задан `test.environment: 'jsdom'`, из-за чего DOM-тесты без pragma падают с `ReferenceError: document is not defined`.
4. `npm.cmd --prefix client run lint` (`oxlint`): **FAIL** (16 errors, 806 warnings на 312 файлах — предсуществующие замечания).

---

## 2. Карта страниц, маршрутов и сценариев

Источник истины маршрутов: `client/src/App.jsx`, навигации: `client/src/config/navigationRegistry.js`, прав: `client/src/utils/permissions.js`.

| Раздел ТЗ | Маршруты (`App.jsx`) | Основные компоненты (`client/src/features/`) | Текущие права (`navigationRegistry` / `ProtectedRoute`) |
|---|---|---|---|
| Аутентификация и профиль | `/login` | `auth/AuthContext.jsx`, `auth/LoginPage.jsx`, `auth/ProtectedRoute.jsx` | Публичный `/login`; опрос `/auth/me` каждые 60s + focus/visibility |
| Лиды / Воронка / Контроль / KPI | `/leads`, `/pipeline` → `/leads` | `leads/LeadsPage.jsx`, `LeadKanbanView.jsx`, `LeadTableView.jsx`, `LeadControlView.jsx`, `ManagerPerformanceView.jsx`, `SalesPlanView.jsx`, `LeadDrawer.jsx`, `CreateLeadModal.jsx`, `AssignLeadModal.jsx`, `FirstContactModal.jsx`, `LeadIntakeModal.jsx` | `leads.view`, `canAssign = ADMIN \| DIRECTOR` в UI |
| Instagram Direct | `/instagram/inbox` | `instagram/InstagramInboxPage.jsx`, `InstagramReplyComposer.jsx`, `InstagramMessageContent.jsx` | `automation.manage` в меню; внутри компонента жёсткая проверка `['ADMIN', 'DIRECTOR'].includes(user?.role)` |
| Клиенты (Покупатели) | `/clients` | `crm/ClientsPage.jsx`, `ClientDetailModal.jsx`, `ClientModal.jsx`, `EditClientModal.jsx` | `leads.view`; фильтрация `isSignedBuyerDeal` на клиенте |
| Задачи | `/tasks` | `tasks/TasksPage.jsx` | `tasks.manage` |
| Сделки и договоры | `/deals`, `/contracts` | `deals/DealsPage.jsx`, `DealWizardModal.jsx`, `EditDealModal.jsx`, `DealDrawer.jsx`, `contracts/ContractsPage.jsx` | `deals.view` / `contracts.view` |
| Аналитика | `/reports`, `/analytics/sales`, `/analytics/apartment-sales`, `/analytics/1..3` | `analytics/SalesAnalyticsPage.jsx`, `SalesControlPanel.jsx`, `SalesManagementDashboard.jsx`, `ApartmentSalesReportPage.jsx`, `reports/ReportsPage.jsx` | `analytics.view` / `analytics.reports` |
| Автоматизация и SMS | `/automation`, `/crm/sms-notifications`, `/crm/sms-templates`, `/crm/buyer-invitations`, `/settings/messages` | `automation/AutomationPage.jsx`, `crm/SmsNotificationsPage.jsx`, `crm/SmsTemplatesPage.jsx`, `buyer/BuyerInvitationsPage.jsx`, `settings/MessageSettingsPage.jsx` | `automation.manage` / `settings.manage` |
| Уведомления и активность | `/notifications`, `/activity` | `notifications/NotificationsPage.jsx`, `activity/ActivityPage.jsx` | Авторизованный пользователь / `adminOnly` |
| Существующие нетрогаемые модули | `/projects/*`, `/apartments`, `/payments/*`, `/finance/*`, `/buyer` | `projects/`, `apartments/`, `payments/`, `finance/`, `construction/`, `costs/`, `buyer/` | Сохраняются без регрессий (A50) |

---

## 3. Разрывы с требованиями F-01–F-20 и N-01–N-03 (план для A01–A10)

1. **API-слой и контекст (A01 / F-03, F-11, N-01):**
   - `client/src/api/client.js`: для не-Instagram маршрутов интерцептор превращает ошибку в `new Error(message)` и теряет `status`, `code` (`403`, `409`, `422`, `429`, timeout). Нет генерации/отмены устаревших запросов на уровне общего клиента (`AbortController` / request generation), нет сброса React Query cache и `sessionStorage` черновиков при logout или отзыве прав.
   - `AuthContext.jsx`: при изменении роли/отзыве прав на `/auth/me` нет принудительного сброса кэша чувствительных данных.

2. **Доска, таблица, список и фильтры (A02 / F-01, F-03, F-04):**
   - `LeadKanbanView.jsx` использует 5 стадий (`NEW`, `IN_PROGRESS`, `NEGOTIATION`, `WON`, `LOST`) вместо канонических стадий F-01 с сервера (включая `встреча назначена`, `показ проведён`, `бронь`, `подготовка договора`, `договор подписан`).
   - В `LeadsPage.jsx` отсутствуют фильтр по менеджеру/источнику/аккаунту/датам `[from, to)` и группировка по менеджеру; нет cursor-пагинации и отображения `server total` отдельно от размера страницы; нет drag-and-drop с обработкой `409` конфликта версий.

3. **Карточка лида, события и задачи (A03 / F-02, F-10, F-12, F-13, F-14):**
   - `LeadDrawer.jsx` и `TasksPage.jsx` работают с date-only (`due_date` `YYYY-MM-DD`) без точного `due_at` + часового пояса (`Asia/Dushanbe`).
   - Нет отдельных форм результатов звонка/встречи/показа (попытка / недозвон / состоявшийся разговор; назначено / проведено / перенесено) и обязательной причины отказа + комментария для `OTHER`.
   - Нет разрешённой паузы следующего шага и прямого перехода «Оформить сделку» без обхода через «Клиенты».

4. **Переписка Instagram и мультиаккаунтность (A04 / F-11):**
   - `InstagramInboxPage.jsx` сейчас ограничен `ADMIN`/`DIRECTOR` и не открыт для назначенных диалогов `SALES_MANAGER` по серверному capability.
   - Опрос каждые 3s перезагружает список и открытый диалог целиком (нужен incremental cursor в A05); черновики нужно изолировать по полному scope (`user/org/project/account/dialog`) в сессии с очисткой при logout; нужно явное состояние `unknown` с ручной сверкой без слепого retry.

5. **Автообновление (A05 / N-01–N-03):**
   - `LeadsPage.jsx` не имеет фонового автообновления/подписки; `InstagramInboxPage.jsx` использует full-refresh polling раз в 3s. Нужен единый транспорт/fallback с курсором, дедупликацией и сохранением скролла/черновика.

6. **Клиенты и оформление сделки (A06 / F-15):**
   - `ClientsPage.jsx` уже фильтрует `isSignedBuyerDeal` и перенаправляет `leadId` в `/leads`, но опирается на клиентскую агрегацию `/deals?status=SIGNED`. Требуется серверный критерий и явный переход `lead → deal` в `DealWizardModal` без поломки существующего мастера.

7. **Распределение и импорт (A07 / F-06–F-09):**
   - `LeadIntakeModal.jsx` уже реализует preview → mapping → confirm. Недостаёт проектных настроек распределения (`ROUND_ROBIN` / `LEAST_LOADED`, календарь, допуски, лимиты, пул причин), журнала переназначений с версией (`409`).

8. **Аналитика руководителя (A08 / F-16–F-18):**
   - `ManagerPerformanceView.jsx`, `SalesControlPanel.jsx`, `SalesManagementDashboard.jsx`, `SalesPlanView.jsx` используют разные разрозненные endpoints. Требуется единый контракт C11 (4 режима: портфель / события / когорта / план-факт), drill-down с тем же scope, серверный Excel-экспорт и честные статусы «Нет базы для расчёта» / «Недостаточно данных».

9. **Правила автоматизации и ИИ-анализ звонков (A09, A10 / F-19, F-20):**
   - `AutomationPage.jsx` не разделяет сохранение и включение правила, не имеет preview последствий и версионирования.
   - UI для ИИ-анализа звонков (F-20) в `client/src/` отсутствует — будет создан в A10 после C13.

---

## 4. Границы файлов и UX-состояния

- **Граница Antigravity:** только `client/` (`tozon-crm`). Файлы в `server/` (`tozon-backend`) не изменяются.
- **Финансовые и складские экраны** (`/finance/*`, `/payments/*`, `/contracts`, `/projects/showroom`, `/apartments`, `/buyer`) не переделываются (регрессия проверяется в A06/A11).
- **Обязательные UX-состояния на каждом новом/доработанном экране:**
  - `loading` (скелетон/индикатор без сброса черновика);
  - `empty` (действительно 0 записей от сервера);
  - `error` / `DATA_UNAVAILABLE` (прочерк `—` и сообщение, никогда не `0` и не пустая база);
  - `403 FORBIDDEN` (честный экран/баннер отказа доступа);
  - `409 CONFLICT` (обновление актуальной версии карточки без тихой перезаписи);
  - `unknown` при отправке сообщения (без слепого повторного POST).
