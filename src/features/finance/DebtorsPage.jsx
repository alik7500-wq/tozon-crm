import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { DealDrawer } from '../deals/DealDrawer';
import { ContractPrintView } from '../deals/ContractPrintView';
import {
  AlertCircle,
  Search,
  Phone,
  Calendar,
  Building2,
  TrendingDown,
  Clock,
  User,
  Eye
} from 'lucide-react';

export const DebtorsPage = () => {
  const [deals, setDeals] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedDealIdForDrawer, setSelectedDealIdForDrawer] = useState(null);
  const [contractToPrint, setContractToPrint] = useState(null);

  const fetchDebtors = async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/deals');
      const list = res.data?.deals || res.deals || [];
      const debtorDeals = list.filter((d) => {
        const total = d.final_price_minor || 0;
        const paid = d.paid_amount_minor || 0;
        return total > paid && d.payment_type === 'INSTALLMENT';
      });
      setDeals(debtorDeals);
    } catch (err) {
      console.error('Error fetching debtors:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDebtors();
  }, []);

  const filtered = deals.filter((d) => {
    return (
      !search ||
      (d.contract_number && d.contract_number.toLowerCase().includes(search.toLowerCase())) ||
      (d.lead_name && d.lead_name.toLowerCase().includes(search.toLowerCase())) ||
      (d.project_name && d.project_name.toLowerCase().includes(search.toLowerCase()))
    );
  });

  const totalOutstanding = filtered.reduce((acc, d) => {
    const total = d.final_price_minor || 0;
    const paid = d.paid_amount_minor || 0;
    return acc + (total - paid);
  }, 0);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <AlertCircle className="h-7 w-7 text-rose-600" />
            <span>Реестр задолженностей и должников</span>
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500">
            Контроль остатков оплат по договорам и графикам рассрочки (кликните на строку для детализации платежей)
          </p>
        </div>

        <div className="rounded-xl bg-rose-50 border border-rose-200 px-4 py-2 text-xs text-rose-900 font-bold">
          Общая задолженность: {(totalOutstanding / 100).toLocaleString()} TJS/USD
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center justify-between gap-4 rounded-2xl bg-white p-4 border border-slate-200 shadow-2xs">
        <div className="relative min-w-[240px] max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Поиск должника по ФИО, договору или ЖК..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3.5 py-1.5 text-xs text-slate-900 outline-none focus:border-rose-500 focus:bg-white transition"
          />
        </div>

        <div className="text-xs text-slate-500 font-semibold">
          Договоров с остатком: <strong className="text-slate-900">{filtered.length}</strong>
        </div>
      </div>

      {/* Debtors Table */}
      {isLoading ? (
        <div className="h-72 rounded-2xl bg-white border border-slate-200 flex items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-rose-600 border-t-transparent" />
            <span className="text-xs text-slate-500">Загрузка должников...</span>
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center shadow-xs">
          <AlertCircle className="h-12 w-12 text-slate-300 mb-2" />
          <h3 className="text-base font-bold text-slate-900">Задолженностей нет</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm">
            Все клиенты оплачивают платежи в срок или отсутствуют активные рассрочки.
          </p>
        </div>
      ) : (
        <div className="rounded-2xl bg-white border border-slate-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                <tr>
                  <th className="p-3.5 pl-5">Покупатель</th>
                  <th className="p-3.5">Договор</th>
                  <th className="p-3.5">Объект / Квартира</th>
                  <th className="p-3.5">Сумма договора</th>
                  <th className="p-3.5">Оплачено</th>
                  <th className="p-3.5">Остаток долга</th>
                  <th className="p-3.5 text-right pr-5">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((d) => {
                  const total = d.final_price_minor || 0;
                  const paid = d.paid_amount_minor || 0;
                  const debt = total - paid;

                  return (
                    <tr
                      key={d.id}
                      onClick={() => setSelectedDealIdForDrawer(d.id)}
                      className="hover:bg-rose-50/40 transition cursor-pointer group"
                    >
                      <td className="p-3.5 pl-5">
                        <div className="font-bold text-slate-900 group-hover:text-rose-700">{d.lead_name}</div>
                        <div className="text-[11px] text-slate-400">{d.lead_phone}</div>
                      </td>
                      <td className="p-3.5 font-bold text-blue-700">{d.contract_number}</td>
                      <td className="p-3.5 text-slate-600">
                        {d.project_name} (кв. №{d.unit_number})
                      </td>
                      <td className="p-3.5 font-bold text-slate-900">
                        {(total / 100).toLocaleString()} {d.currency || 'TJS'}
                      </td>
                      <td className="p-3.5 font-semibold text-emerald-700">
                        {(paid / 100).toLocaleString()} {d.currency || 'TJS'}
                      </td>
                      <td className="p-3.5 font-extrabold text-rose-600">
                        {(debt / 100).toLocaleString()} {d.currency || 'TJS'}
                      </td>
                      <td className="p-3.5 text-right pr-5">
                        <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                          {d.lead_phone && (
                            <a
                              href={`tel:${d.lead_phone}`}
                              className="inline-flex items-center gap-1 rounded-xl bg-blue-50 text-blue-700 px-2.5 py-1.5 text-xs font-bold hover:bg-blue-100 transition cursor-pointer"
                            >
                              <Phone className="h-3.5 w-3.5" />
                              <span>Звонок</span>
                            </a>
                          )}
                          <button
                            onClick={() => setSelectedDealIdForDrawer(d.id)}
                            className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 px-2.5 py-1.5 text-xs font-bold transition shadow-2xs cursor-pointer"
                          >
                            <Eye className="h-3.5 w-3.5 text-slate-400" />
                            <span>Детали</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Deal Full Details Drawer */}
      <DealDrawer
        isOpen={Boolean(selectedDealIdForDrawer)}
        onClose={() => setSelectedDealIdForDrawer(null)}
        dealId={selectedDealIdForDrawer}
        onDealUpdated={fetchDebtors}
        onOpenContractPrint={(deal) => setContractToPrint(deal)}
      />

      {/* Printable Contract Modal */}
      {contractToPrint && (
        <ContractPrintView
          deal={contractToPrint}
          onClose={() => setContractToPrint(null)}
        />
      )}
    </div>
  );
};
