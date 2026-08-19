import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { ContractPrintView } from '../deals/ContractPrintView';
import {
  FileText,
  Search,
  Printer,
  Download,
  Building2,
  Calendar,
  CheckCircle2,
  Coins,
  ArrowUpRight,
  ExternalLink
} from 'lucide-react';

export const ContractsPage = () => {
  const [deals, setDeals] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [contractToPrint, setContractToPrint] = useState(null);

  useEffect(() => {
    const fetchContracts = async () => {
      try {
        setIsLoading(true);
        const res = await api.get('/deals');
        const list = res.data?.deals || res.deals || [];
        setDeals(list);
      } catch (err) {
        console.error('Error fetching contracts:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchContracts();
  }, []);

  const filteredDeals = deals.filter((d) => {
    return (
      !search ||
      (d.contract_number && d.contract_number.toLowerCase().includes(search.toLowerCase())) ||
      (d.lead_name && d.lead_name.toLowerCase().includes(search.toLowerCase())) ||
      (d.project_name && d.project_name.toLowerCase().includes(search.toLowerCase()))
    );
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <FileText className="h-7 w-7 text-blue-600" />
            <span>Реестр договоров купли-продажи</span>
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500">
            Официальные договоры, сгенерированные графики рассрочек и печать юридических документов
          </p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex items-center justify-between gap-4 rounded-2xl bg-white p-4 border border-slate-200 shadow-2xs">
        <div className="relative min-w-[240px] max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Поиск по номеру договора, покупателю или ЖК..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3.5 py-1.5 text-xs text-slate-900 outline-none focus:border-blue-500 focus:bg-white transition"
          />
        </div>

        <div className="text-xs text-slate-500 font-semibold">
          Всего договоров: <strong className="text-slate-900">{filteredDeals.length}</strong>
        </div>
      </div>

      {/* Contracts Table */}
      {isLoading ? (
        <div className="h-72 rounded-2xl bg-white border border-slate-200 flex items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
            <span className="text-xs text-slate-500">Загрузка реестра договоров...</span>
          </div>
        </div>
      ) : filteredDeals.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center shadow-xs">
          <FileText className="h-12 w-12 text-slate-300 mb-2" />
          <h3 className="text-base font-bold text-slate-900">Договоры пока не оформлены</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm">
            Договоры формируются автоматически при оформлении сделки в шахматке или в разделе Сделки.
          </p>
        </div>
      ) : (
        <div className="rounded-2xl bg-white border border-slate-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                <tr>
                  <th className="p-3.5 pl-5">№ Договора</th>
                  <th className="p-3.5">Покупатель</th>
                  <th className="p-3.5">Объект / Квартира</th>
                  <th className="p-3.5">Форма оплаты</th>
                  <th className="p-3.5">Сумма договора</th>
                  <th className="p-3.5">Статус</th>
                  <th className="p-3.5 text-right pr-5">Печать</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredDeals.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50 transition">
                    <td className="p-3.5 pl-5 font-bold text-blue-700">
                      {d.contract_number || `СД-${d.id}`}
                    </td>
                    <td className="p-3.5">
                      <div className="font-bold text-slate-900">{d.lead_name}</div>
                      <div className="text-[11px] text-slate-400">{d.lead_phone}</div>
                    </td>
                    <td className="p-3.5 text-slate-600">
                      <div>{d.project_name}</div>
                      <div className="text-[11px] text-slate-500">
                        {d.building_name} • Кв. №{d.unit_number}
                      </div>
                    </td>
                    <td className="p-3.5">
                      <span className="font-semibold text-slate-700">
                        {d.payment_type === 'INSTALLMENT'
                          ? 'Рассрочка'
                          : d.payment_type === 'BARTER'
                          ? 'Бартер'
                          : '100% Оплата'}
                      </span>
                    </td>
                    <td className="p-3.5 font-extrabold text-slate-900">
                      {(d.final_price_minor / 100).toLocaleString()} {d.currency || 'USD'}
                    </td>
                    <td className="p-3.5">
                      <span
                        className={`px-2.5 py-0.5 rounded-full font-bold border text-[10px] ${
                          d.status === 'SIGNED'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : d.status === 'RESERVED'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}
                      >
                        {d.status === 'SIGNED' ? 'Подписан' : d.status === 'RESERVED' ? 'Бронь' : d.status}
                      </span>
                    </td>
                    <td className="p-3.5 text-right pr-5">
                      <button
                        onClick={() => setContractToPrint(d)}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 shadow-2xs transition cursor-pointer"
                      >
                        <Printer className="h-3.5 w-3.5 text-blue-600" />
                        <span>Печать</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Contract Printable View Modal */}
      {contractToPrint && (
        <ContractPrintView
          deal={contractToPrint}
          onClose={() => setContractToPrint(null)}
        />
      )}
    </div>
  );
};
