import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { PaymentRecordModal } from '../deals/PaymentRecordModal';
import { DealDrawer } from '../deals/DealDrawer';
import { ContractPrintView } from '../deals/ContractPrintView';
import { FinanceTabs } from '../../components/FinanceTabs';
import { formatContractNumber } from '../../utils/formatters';
import {
  CreditCard,
  Plus,
  Search,
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
  TrendingUp,
  Wallet,
  Eye,
  ArrowUpRight
} from 'lucide-react';

export const PaymentsPage = () => {
  const [deals, setDeals] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedDealForPayment, setSelectedDealForPayment] = useState(null);
  const [selectedDealIdForDrawer, setSelectedDealIdForDrawer] = useState(null);
  const [contractToPrint, setContractToPrint] = useState(null);

  const fetchDeals = async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/deals');
      setDeals(res.data?.deals || res.deals || []);
    } catch (err) {
      console.error('Error fetching payments:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDeals();
  }, []);

  const filteredDeals = deals.filter((d) => {
    return (
      !search ||
      (d.contract_number && d.contract_number.toLowerCase().includes(search.toLowerCase())) ||
      (d.lead_name && d.lead_name.toLowerCase().includes(search.toLowerCase())) ||
      (d.project_name && d.project_name.toLowerCase().includes(search.toLowerCase()))
    );
  });

  const totalContractAmount = deals.reduce((acc, d) => acc + (d.final_price_minor || 0), 0);
  const totalCollected = deals.reduce((acc, d) => acc + (d.paid_amount_minor || 0), 0);
  const totalDebt = totalContractAmount - totalCollected;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <CreditCard className="h-7 w-7 text-emerald-600" />
            <span>Финансовый учет и платежи</span>
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500">
            Регистрация оплат по договорам рассрочки, учет поступлений и контроль остатков (кликните на строку для детализации)
          </p>
        </div>
      </div>

      <FinanceTabs />

      {/* Metrics Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <CreditCard className="h-6 w-6" />
            </div>
            <div>
              <span className="text-[11px] font-semibold text-slate-500 block">Общая сумма договоров</span>
              <div className="text-xl font-black text-slate-900 mt-0.5">
                {(totalContractAmount / 100).toLocaleString()} <span className="text-xs font-normal">TJS</span>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-5 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
              <Wallet className="h-6 w-6" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-emerald-700 block">Фактически получено</span>
              <div className="text-xl font-black text-emerald-800 mt-0.5">
                {(totalCollected / 100).toLocaleString()} <span className="text-xs font-normal">TJS</span>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-rose-200 bg-rose-50/50 p-5 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-rose-100 text-rose-700">
              <TrendingUp className="h-6 w-6" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-rose-700 block">Остаток к получению</span>
              <div className="text-xl font-black text-rose-800 mt-0.5">
                {(totalDebt / 100).toLocaleString()} <span className="text-xs font-normal">TJS</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex items-center justify-between gap-4 rounded-2xl bg-white p-4 border border-slate-200 shadow-2xs">
        <div className="relative min-w-[240px] max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Поиск по договору, покупателю или объекту..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3.5 py-1.5 text-xs text-slate-900 outline-none focus:border-emerald-500 focus:bg-white transition"
          />
        </div>

        <div className="text-xs text-slate-500 font-semibold">
          Всего договоров: <strong className="text-slate-900">{filteredDeals.length}</strong>
        </div>
      </div>

      {/* Payments / Deals Table */}
      {isLoading ? (
        <div className="h-72 rounded-2xl bg-white border border-slate-200 flex items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
            <span className="text-xs text-slate-500">Загрузка данных о платежах...</span>
          </div>
        </div>
      ) : filteredDeals.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center shadow-xs">
          <CreditCard className="h-12 w-12 text-slate-300 mb-2" />
          <h3 className="text-base font-bold text-slate-900">Платежи пока не зафиксированы</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm">
            Оформите первую сделку с рассрочкой, чтобы начать учет регулярных поступлений.
          </p>
        </div>
      ) : (
        <div className="rounded-2xl bg-white border border-slate-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                <tr>
                  <th className="p-3.5 pl-5">Договор</th>
                  <th className="p-3.5">Покупатель</th>
                  <th className="p-3.5">Объект / Кв.</th>
                  <th className="p-3.5">Сумма договора</th>
                  <th className="p-3.5">Оплачено</th>
                  <th className="p-3.5">Остаток</th>
                  <th className="p-3.5 text-right pr-5">Действие</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredDeals.map((d) => {
                  const paid = d.paid_amount_minor || 0;
                  const total = d.final_price_minor || 0;
                  const balance = total - paid;
                  const percent = total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 0;

                  return (
                    <tr
                      key={d.id}
                      onClick={() => setSelectedDealIdForDrawer(d.id)}
                      className="hover:bg-slate-50 transition cursor-pointer group"
                    >
                      <td className="p-3.5 pl-5 font-bold text-blue-700 group-hover:text-blue-900 font-mono">
                        {formatContractNumber(d.contract_number) || `СД-${d.id}`}
                      </td>
                      <td className="p-3.5">
                        <div className="font-bold text-slate-900">{d.lead_name}</div>
                        <div className="text-[11px] text-slate-400">{d.lead_phone}</div>
                      </td>
                      <td className="p-3.5 text-slate-600">
                        {d.project_name} (кв. №{d.unit_number})
                      </td>
                      <td className="p-3.5 font-bold text-slate-900">
                        {(total / 100).toLocaleString()} {d.currency || 'TJS'}
                      </td>
                      <td className="p-3.5">
                        <div className="font-bold text-emerald-700">
                          {(paid / 100).toLocaleString()} {d.currency || 'TJS'}
                        </div>
                        <div className="w-20 bg-slate-200 rounded-full h-1.5 mt-1 overflow-hidden">
                          <div
                            className="bg-emerald-500 h-1.5 rounded-full"
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </td>
                      <td className="p-3.5 font-bold text-rose-600">
                        {(balance / 100).toLocaleString()} {d.currency || 'TJS'}
                      </td>
                      <td className="p-3.5 text-right pr-5">
                        <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => setSelectedDealForPayment(d)}
                            className="inline-flex items-center gap-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 text-xs font-bold transition shadow-xs cursor-pointer"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            <span>Оплата</span>
                          </button>

                          <button
                            onClick={() => setSelectedDealIdForDrawer(d.id)}
                            className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 px-3 py-1.5 text-xs font-bold transition shadow-2xs cursor-pointer"
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

      {/* Payment Modal */}
      {selectedDealForPayment && (
        <PaymentRecordModal
          isOpen={Boolean(selectedDealForPayment)}
          onClose={() => setSelectedDealForPayment(null)}
          deal={selectedDealForPayment}
          onPaymentSuccess={() => {
            fetchDeals();
            setSelectedDealForPayment(null);
          }}
        />
      )}

      {/* Deal Full Details Drawer */}
      <DealDrawer
        isOpen={Boolean(selectedDealIdForDrawer)}
        onClose={() => setSelectedDealIdForDrawer(null)}
        dealId={selectedDealIdForDrawer}
        onDealUpdated={fetchDeals}
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
