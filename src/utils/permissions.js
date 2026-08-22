export const PERMISSION_GROUPS = [
  {
    id: 'analytics',
    title: 'Аналитика и отчеты',
    permissions: [
      { key: 'analytics.view', label: 'Просмотр дашборда и аналитики', desc: 'Доступ к графике, воронке и ключевым метрикам' },
      { key: 'analytics.reports', label: 'Сводные отчеты и выгрузка', desc: 'Просмотр и экспорт управленческих отчетов' },
    ]
  },
  {
    id: 'inventory',
    title: 'Объекты и шахматка',
    permissions: [
      { key: 'inventory.view', label: 'Просмотр ЖК и шахматки квартир', desc: 'Визуальная сетка, планировки и статусы квартир' },
      { key: 'inventory.manage', label: 'Создание ЖК, цен и генерация этажей', desc: 'Добавление комплексов, изменение цен и пакетная генерация' },
    ]
  },
  {
    id: 'crm',
    title: 'CRM: Лиды и Клиенты',
    permissions: [
      { key: 'leads.view', label: 'Просмотр лидов и базы клиентов', desc: 'Список контактов, история и карточки клиентов' },
      { key: 'leads.manage', label: 'Создание лидов и ведение воронки', desc: 'Добавление лидов, смена статусов и перевод по стадиям' },
      { key: 'tasks.manage', label: 'Задачи и напоминания', desc: 'Постановка задач, контроль сроков и звонки' },
    ]
  },
  {
    id: 'deals',
    title: 'Сделки и Бронирование',
    permissions: [
      { key: 'deals.view', label: 'Просмотр сделок и броней', desc: 'Реестр договоренностей и бронирований' },
      { key: 'deals.manage', label: 'Создание сделок, бронь и рассрочка', desc: 'Бронирование квартир, расчет графика и скидок' },
    ]
  },
  {
    id: 'contracts',
    title: 'Договоры и Документы',
    permissions: [
      { key: 'contracts.view', label: 'Просмотр и печать договоров', desc: 'Просмотр сформированных договоров и актов' },
      { key: 'contracts.manage', label: 'Генерация и изменение договоров', desc: 'Создание юридических документов и снепшотов' },
    ]
  },
  {
    id: 'finance',
    title: 'Финансы и Касса',
    permissions: [
      { key: 'finance.view', label: 'Просмотр финансовой сводки и календаря', desc: 'План-факт поступлений, календарь выплат' },
      { key: 'finance.payments', label: 'Прием платежей и квитанции (ПКО)', desc: 'Фиксация поступления денег, печать квитанций' },
      { key: 'finance.expenses', label: 'Оформление расходов (РКО)', desc: 'Фиксация выплат подрядчикам и расходов' },
      { key: 'finance.debtors', label: 'Реестр должников', desc: 'Контроль просрочек и график задолженностей' },
      { key: 'finance.cashflow', label: 'ДДС (Движение денежных средств)', desc: 'Отчет по движению средств и кассам' },
    ]
  },
  {
    id: 'automation',
    title: 'Автоматизация и Связь',
    permissions: [
      { key: 'automation.manage', label: 'Автоматизация, SMS и триггеры', desc: 'Уведомления о платежах, SMS-рассылки и шаблоны' },
    ]
  },
  {
    id: 'system',
    title: 'Администрирование и Настройки',
    permissions: [
      { key: 'users.manage', label: 'Управление сотрудниками и правами', desc: 'Добавление пользователей, смена ролей и доступов' },
      { key: 'settings.manage', label: 'Справочники и системные параметры', desc: 'Управление справочниками, ЖК и резервными копиями' },
    ]
  }
];

export const ALL_PERMISSIONS = PERMISSION_GROUPS.flatMap(g => g.permissions.map(p => p.key));

export const ROLE_DEFAULTS = {
  ADMIN: ALL_PERMISSIONS,
  DIRECTOR: [
    'analytics.view', 'analytics.reports',
    'inventory.view', 'inventory.manage',
    'leads.view', 'leads.manage', 'tasks.manage',
    'deals.view', 'deals.manage',
    'contracts.view', 'contracts.manage',
    'finance.view', 'finance.payments', 'finance.expenses', 'finance.debtors', 'finance.cashflow',
    'automation.manage', 'settings.manage'
  ],
  SALES_MANAGER: [
    'inventory.view',
    'leads.view', 'leads.manage', 'tasks.manage',
    'deals.view', 'deals.manage',
    'contracts.view',
    'finance.view'
  ],
  MANAGER: [
    'inventory.view',
    'leads.view', 'leads.manage', 'tasks.manage',
    'deals.view', 'deals.manage',
    'contracts.view',
    'finance.view'
  ],
  FINANCE_MANAGER: [
    'analytics.view', 'analytics.reports',
    'inventory.view',
    'deals.view',
    'contracts.view', 'contracts.manage',
    'finance.view', 'finance.payments', 'finance.expenses', 'finance.debtors', 'finance.cashflow',
    'tasks.manage'
  ]
};

export const hasPermission = (user, permission) => {
  if (!user) return false;
  if (user.role === 'ADMIN') return true;
  const userPerms = Array.isArray(user.permissions) ? user.permissions : [];
  if (userPerms.includes('*')) return true;
  if (!permission) return true;
  return userPerms.includes(permission);
};

export const hasAnyPermission = (user, permissions = []) => {
  if (!user) return false;
  if (user.role === 'ADMIN') return true;
  const userPerms = Array.isArray(user.permissions) ? user.permissions : [];
  if (userPerms.includes('*')) return true;
  if (!permissions || permissions.length === 0) return true;
  return permissions.some(p => userPerms.includes(p));
};
