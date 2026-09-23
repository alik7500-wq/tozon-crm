import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { DealDrawer } from '../deals/DealDrawer';
import { ContractPrintView } from '../deals/ContractPrintView';
import { FinanceTabs } from '../../components/FinanceTabs';
import { formatContractNumber } from '../../utils/formatters';
import { SendSmsModal } from '../../components/sms/SendSmsModal';
import {
  AlertCircle,
  Search,
  Phone,
  Calendar,
  Building2,
  TrendingDown,
  Clock,
  User,
  Eye,
  MessageSquare
} from 'lucide-react';

export const DebtorsPage = () => {
  const [deals, setDeals] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterMode, setFilterMode] = useState('OVERDUE_ONLY'); // 'OVERDUE_ONLY' | 'ALL_INSTALLMENTS'
  const [selectedDealIdForDrawer, setSelectedDealIdForDrawer] = useState(null);
  const [contractToPrint, setContractToPrint] = useState(null);
  const [smsDebtor, setSmsDebtor] = useState(null);

  const fetchDebtors = async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/deals');
      const list = res.data?.deals || res.deals || [];
      const debtorDeals = list.filter((d) => {
        const total = d.final_price_minor || 0;
        const paid = d.paid_amount_minor ?? d.total_paid_minor ?? 0;
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
    const matchesSearch =
      !search ||
      (d.contract_number && d.contract_number.toLowerCase().includes(search.toLowerCase())) ||
      (d.lead_name && d.lead_name.toLowerCase().includes(search.toLowerCase())) ||
      (d.project_name && d.project_name.toLowerCase().includes(search.toLowerCase()));

    if (!matchesSearch) return false;

    if (filterMode === 'OVERDUE_ONLY') {
      return (d.overdue_amount_minor || 0) > 0;
    }
    return true;
  });

  const totalOverdue = filtered.reduce((acc, d) => acc + (d.overdue_amount_minor || 0), 0);
  const totalOutstanding = filtered.reduce((acc, d) => {
    const total = d.final_price_minor || 0;
    const paid = d.paid_amount_minor ?? d.total_paid_minor ?? 0;
    return acc + Math.max(0, total - paid);
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
            Контроль просроченных платежей и графиков рассрочки по договорам
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-rose-50 border border-rose-200 px-4 py-2 text-xs text-rose-900 font-bold">
            Просрочено: {(totalOverdue / 100).toLocaleString()} USD
          </div>
          <div className="rounded-xl bg-slate-100 border border-slate-200 px-4 py-2 text-xs text-slate-700 font-semibold">
            Всего остаток: {(totalOutstanding / 100).toLocaleString()} USD
          </div>
        </div>
      </div>

      <FinanceTabs />

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl bg-white p-4 border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-3 flex-1">
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

          {/* Filter Mode Toggle */}
          <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setFilterMode('OVERDUE_ONLY')}
              className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                filterMode === 'OVERDUE_ONLY'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              С просрочкой
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('ALL_INSTALLMENTS')}
              className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                filterMode === 'ALL_INSTALLMENTS'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Все рассрочки
            </button>
          </div>
        </div>

        <div className="text-xs text-slate-500 font-semibold">
          Договоров в списке: <strong className="text-slate-900">{filtered.length}</strong>
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
          <h3 className="text-base font-bold text-slate-900">
            {filterMode === 'OVERDUE_ONLY' ? 'Просроченных платежей нет' : 'Задолженностей нет'}
          </h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm">
            {filterMode === 'OVERDUE_ONLY'
              ? 'Все клиенты оплачивают платежи в срок. Для просмотра всех договоров рассрочки выберите вкладку "Все рассрочки".'
              : 'Отсутствуют активные договоры рассрочки с остатком оплаты.'}
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
                  <th className="p-3.5">Остаток по договору</th>
                  <th className="p-3.5">Просрочено</th>
                  <th className="p-3.5 text-right pr-5">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((d) => {
                  const total = d.final_price_minor || 0;
                  const paid = d.paid_amount_minor ?? d.total_paid_minor ?? 0;
                  const debt = Math.max(0, total - paid);
                  const overdueMinor = d.overdue_amount_minor || 0;

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
                      <td className="p-3.5 font-bold text-blue-700 font-mono">{formatContractNumber(d.contract_number)}</td>
                      <td className="p-3.5 text-slate-600">
                        {d.project_name} (кв. №{d.unit_number})
                      </td>
                      <td className="p-3.5 font-bold text-slate-900">
                        {(total / 100).toLocaleString()} {d.currency || 'USD'}
                      </td>
                      <td className="p-3.5 font-semibold text-emerald-700">
                        {(paid / 100).toLocaleString()} {d.currency || 'USD'}
                      </td>
                      <td className="p-3.5 font-semibold text-slate-700">
                        {(debt / 100).toLocaleString()} {d.currency || 'USD'}
                      </td>
                      <td className="p-3.5">
                        {overdueMinor > 0 ? (
                          <span className="font-extrabold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                            {(overdueMinor / 100).toLocaleString()} {d.currency || 'USD'}
                          </span>
                        ) : (
                          <span className="font-medium text-slate-400">
                            0 {d.currency || 'USD'}
                          </span>
                        )}
                      </td>
                      <td className="p-3.5 text-right pr-5">
                        <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                          {d.lead_phone && (
                            <>
                              <a
                                href={`tel:${d.lead_phone}`}
                                className="inline-flex items-center gap-1 rounded-xl bg-blue-50 text-blue-700 px-2.5 py-1.5 text-xs font-bold hover:bg-blue-100 transition cursor-pointer"
                              >
                                <Phone className="h-3.5 w-3.5" />
                                <span>Звонок</span>
                              </a>

                              <button
                                type="button"
                                onClick={() => setSmsDebtor(d)}
                                className="inline-flex items-center gap-1 rounded-xl bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200/80 px-2.5 py-1.5 text-xs font-bold transition cursor-pointer"
                                title="Отправить SMS должнику"
                              >
                                <MessageSquare className="h-3.5 w-3.5" />
                                <span>SMS</span>
                              </button>
                            </>
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

      {/* Send SMS Modal */}
      {smsDebtor && (
        <SendSmsModal
          isOpen={Boolean(smsDebtor)}
          onClose={() => setSmsDebtor(null)}
          client={{
            id: smsDebtor.lead_id,
            lead_id: smsDebtor.lead_id,
            phone: smsDebtor.lead_phone,
            full_name: smsDebtor.lead_name,
            name: smsDebtor.lead_name,
            deal_id: smsDebtor.id,
            contract_number: smsDebtor.contract_number,
            apartment: `кв. ${smsDebtor.unit_number || ''}`,
            project_name: smsDebtor.project_name,
            overdue_amount: (
              ((smsDebtor.overdue_amount_minor || 0) / 100)
            ).toLocaleString('ru-RU')
          }}
          context="debtor"
          onSuccess={() => {
            fetchDebtors();
          }}
        />
      )}
    </div>
  );
};
