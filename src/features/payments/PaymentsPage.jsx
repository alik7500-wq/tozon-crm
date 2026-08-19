import React from 'react';
import { CreditCard, Plus } from 'lucide-react';

export const PaymentsPage = () => {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <CreditCard className="h-6 w-6 text-emerald-600" />
            <span>График и фиксация платежей</span>
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500">
            Контроль оплат по договорам рассрочки Tozon CRM, учет задолженностей и статусы платежей
          </p>
        </div>

        <button className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white shadow-md hover:bg-emerald-700 transition cursor-pointer">
          <Plus className="h-4 w-4" />
          <span>Внести оплату</span>
        </button>
      </div>

      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center shadow-xs">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 mb-3 border border-emerald-100">
          <CreditCard className="h-7 w-7" />
        </div>
        <h3 className="text-base font-bold text-slate-900">Реестр платежей</h3>
        <p className="mt-1 text-xs text-slate-500 max-w-md">
          Автоматический расчет статусов (UPCOMING, DUE, PARTIAL, PAID, OVERDUE) и остатков по каждой сделке.
        </p>
      </div>
    </div>
  );
};
