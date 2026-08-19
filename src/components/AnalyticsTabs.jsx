import React from 'react';
import { NavLink } from 'react-router-dom';
import { BarChart3, PieChart, TrendingUp, Target } from 'lucide-react';

export const AnalyticsTabs = () => {
  const tabs = [
    { label: 'Сводные отчеты', path: '/reports', icon: BarChart3 },
    { label: 'Аналитика 1.0 (ЖК и Шахматка)', path: '/analytics/1', icon: PieChart },
    { label: 'Аналитика 2.0 (Продажи и Финансы)', path: '/analytics/2', icon: TrendingUp },
    { label: 'Аналитика 3.0 (Маркетинг и Лиды)', path: '/analytics/3', icon: Target },
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
