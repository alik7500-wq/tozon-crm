const LEGACY_PERMISSION_GROUPS = [
  { id: 'construction', title: 'Строительный учёт', permissions: [
    { key: 'construction.stock', label: 'Склад', desc: 'Поступления, выдача и перемещения материалов' },
    { key: 'construction.advance', label: 'Свой подотчёт', desc: 'Собственные авансовые отчёты и остатки' },
    { key: 'construction.settlements', label: 'Взаиморасчёты', desc: 'Все долги, авансы и денежные операции подотчёта' },
    { key: 'construction.settings', label: 'Настройка строительного учёта', desc: 'Справочники, связь сотрудников и назначение утверждающего' },
  ] },
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

export const ACCESS_PROFILE = 'access.v2';
const paired = {
  'inventory.view': 'inventory.manage', 'leads.view': 'leads.manage',
  'deals.view': 'deals.manage', 'contracts.view': 'contracts.manage'
};
const standalone = {
  'tasks.manage': 'tasks.view', 'automation.manage': 'automation.view',
  'users.manage': 'users.view', 'settings.manage': 'settings.view'
};
export const PERMISSION_GROUPS = LEGACY_PERMISSION_GROUPS.map(group => ({
  ...group,
  permissions: group.permissions.filter(p => !Object.values(paired).includes(p.key)).map(p => ({
    ...p,
    readKey: standalone[p.key] || p.key,
    writeKey: paired[p.key] || (standalone[p.key] ? p.key : `${p.key}.write`),
    legacyKeys: paired[p.key] ? [p.key, paired[p.key]] : [p.key],
    legacyWrite: paired[p.key] || (p.key.endsWith('.manage') || p.key.startsWith('construction.') || ['finance.payments','finance.expenses'].includes(p.key) ? p.key : null),
    label: ({'inventory.view':'ЖК, квартиры и шахматка', 'leads.view':'Лиды и база клиентов', 'deals.view':'Сделки и бронирование', 'contracts.view':'Договоры и документы', 'analytics.view':'Дашборд и аналитика', 'finance.view':'Финансовая сводка и календарь', 'finance.payments':'Платежи и квитанции (ПКО)', 'finance.expenses':'Расходы (РКО)'})[p.key] || p.label
  }))
}));
const rows = PERMISSION_GROUPS.flatMap(g => g.permissions);
export const ALL_PERMISSIONS = rows.flatMap(p => [p.readKey, p.writeKey]);
export const normalizePermissions = (permissions = []) => {
  if (permissions.includes(ACCESS_PROFILE)) return [...permissions];
  const result = permissions.filter(k => !rows.some(p => p.legacyKeys.includes(k)) && k !== '*');
  for (const p of rows) {
    if (permissions.includes('*') || p.legacyKeys.some(k => permissions.includes(k))) result.push(p.readKey);
    if (permissions.includes('*') || (p.legacyWrite && permissions.includes(p.legacyWrite))) result.push(p.writeKey);
  }
  if (permissions.some(k => ['sms.send','sms.history','sms.view','leads.manage','deals.manage'].includes(k))) result.push('automation.view');
  if (permissions.some(k => ['sms.send','leads.manage','deals.manage'].includes(k))) result.push('automation.manage');
  return [...new Set([ACCESS_PROFILE, ...result])];
};



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
    'contracts.view'
  ],
  WAREHOUSE_MANAGER: [
    'access.v2',
    'construction.stock',
    'construction.stock.write',
    'construction.advance',
    'construction.advance.write',
    'construction.settlements',
    'finance.expenses',
    'finance.expenses.write'
  ],
  MANAGER: [
    'inventory.view',
    'leads.view', 'leads.manage', 'tasks.manage',
    'deals.view', 'deals.manage',
    'contracts.view'
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


// Page access checks differ from action checks for legacy *.manage keys.
export const hasReadPermission = (user, permission) => {
  if (!user?.permissions?.includes(ACCESS_PROFILE)) return hasPermission(user, permission);
  const row = rows.find(p => p.legacyKeys.includes(permission) || p.readKey === permission || p.writeKey === permission);
  return hasPermission(user, row?.readKey || permission);
};
export const canWriteSection = (user, permission) => {
  if (!user) return false;
  const row = rows.find(p => p.legacyKeys.includes(permission) || p.readKey === permission || p.writeKey === permission);
  if (user.permissions?.includes(ACCESS_PROFILE)) return hasPermission(user, row?.writeKey || permission);
  return hasPermission(user, row?.legacyWrite || row?.writeKey || permission);
};
