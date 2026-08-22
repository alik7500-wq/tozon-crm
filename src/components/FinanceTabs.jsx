import React from 'react';
import { NavLink } from 'react-router-dom';
import { CreditCard, Calendar, AlertCircle, TrendingUp, TrendingDown, Wallet } from 'lucide-react';

export const FinanceTabs = () => {
  const tabs = [
    { label: 'Реестр договоров и оплат', path: '/payments', icon: CreditCard },
    { label: 'Календарь поступлений', path: '/finance/calendar', icon: Calendar },
    { label: 'Реестр должников', path: '/finance/debtors', icon: AlertCircle },
    { label: 'Доходы (ПКО)', path: '/finance/income', icon: TrendingUp },
    { label: 'Расходы (РКО)', path: '/finance/expenses', icon: TrendingDown },
    { label: 'ДДС (Движение средств)', path: '/finance/cashflow', icon: Wallet },
  ];

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3 mb-6">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        return (
          <NavLink
            key={tab.path}
            to={tab.path}
            className={({ isActive }) =>
              `flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition cursor-pointer ${
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
