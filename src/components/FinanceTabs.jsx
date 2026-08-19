import React from 'react';
import { NavLink } from 'react-router-dom';
import { CreditCard, Calendar, AlertCircle } from 'lucide-react';

export const FinanceTabs = () => {
  const tabs = [
    { label: 'Реестр платежей', path: '/payments', icon: CreditCard },
    { label: 'Календарь поступлений', path: '/finance/calendar', icon: Calendar },
    { label: 'Реестр должников', path: '/finance/debtors', icon: AlertCircle },
  ];

  return (
    <div className="flex items-center gap-2 border-b border-slate-200 pb-3 mb-6">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        return (
          <NavLink
            key={tab.path}
            to={tab.path}
            className={({ isActive }) =>
              `flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition cursor-pointer ${
                isActive
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 hover:text-slate-900'
              }`
            }
          >
            <Icon className="h-3.5 w-3.5" />
            <span>{tab.label}</span>
          </NavLink>
        );
      })}
    </div>
  );
};
