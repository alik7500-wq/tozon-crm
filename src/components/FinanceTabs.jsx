import React from 'react';
import { NavLink } from 'react-router-dom';
import { CreditCard, Calendar, AlertCircle, TrendingUp, TrendingDown, Wallet, Table } from 'lucide-react';

export const FinanceTabs = ({ compact = false, className = '' }) => {
  const tabs = [
    { label: 'Приём платежей', path: '/payments', icon: CreditCard },
    { label: 'План-Факт по клиентам', path: '/payments/plan-fact', icon: Table },
    { label: 'Календарь поступлений', path: '/finance/calendar', icon: Calendar },
    { label: 'Реестр должников', path: '/finance/debtors', icon: AlertCircle },
    { label: 'Реестр приходов (ПКО)', path: '/finance/income', icon: TrendingUp },
    { label: 'Реестр расходов (РКО)', path: '/finance/expenses', icon: TrendingDown },
    { label: 'ДДС (Движение средств)', path: '/finance/cashflow', icon: Wallet },
  ];

  return (
    <div className={`flex flex-wrap items-center gap-1.5 border-b border-slate-200 ${compact ? 'pb-1 mb-1' : 'pb-3 mb-6'} ${className}`}>
      {tabs.map((tab) => {
        const Icon = tab.icon;
        return (
          <NavLink
            key={tab.path}
            to={tab.path}
            className={({ isActive }) =>
              `flex items-center gap-1.5 rounded-xl font-bold transition cursor-pointer ${
                compact ? 'px-2.5 py-1 text-[11px]' : 'px-3.5 py-2 text-xs'
              } ${
                isActive
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 hover:text-slate-900'
              }`
            }
          >
            <Icon className={compact ? "h-3 w-3" : "h-3.5 w-3.5"} />
            <span>{tab.label}</span>
          </NavLink>
        );
      })}
    </div>
  );
};
