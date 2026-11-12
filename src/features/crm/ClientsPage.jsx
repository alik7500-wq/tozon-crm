import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../../api/client';
import { ClientDetailModal } from './ClientDetailModal';
import { EditClientModal } from './EditClientModal';
import { SendSmsModal } from '../../components/sms/SendSmsModal';
import { matchSearchQuery } from '../../utils/searchUtils';
import {
  Users,
  Plus,
  Search,
  Phone,
  Building2,
  FileText,
  Calendar,
  Wallet,
  Eye,
  Pencil,
  UserCheck,
  CheckCircle2,
  X,
  History,
  ChevronRight,
  ShieldCheck,
  Sparkles,
  MessageSquare
} from 'lucide-react';

export const ClientsPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialSearch = searchParams.get('search') || '';
  const [clients, setClients] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState(initialSearch);
  const [selectedClient, setSelectedClient] = useState(null);
  const [clientToEdit, setClientToEdit] = useState(null);
  const [smsClient, setSmsClient] = useState(null);
  const [error, setError] = useState('');

  // Sync search state or clientId deep link if URL searchParams change
  useEffect(() => {
    const query = searchParams.get('search') || '';
    if (query !== search) {
      setSearch(query);
    }
    const clientIdParam = searchParams.get('clientId') || searchParams.get('leadId');
    if (clientIdParam && !isLoading && !error) {
      const leadId = String(clientIdParam).replace(/^lead-/, '');
      const match = clients.find(c => String(c.id) === String(clientIdParam) || String(c.lead_id) === leadId);
      if (match) {
        setSelectedClient(match);
      } else if (/^\d+$/.test(leadId)) {
        // Existing notification links may target /clients with a lead ID. Keep
        // those contacts in the correct section instead of inventing a buyer row.
        navigate(`/leads?leadId=${leadId}`, { replace: true });
      }
    }
  }, [searchParams, clients, isLoading, error, navigate]);

  const handleSearchChange = (val) => {
    setSearch(val);
    if (val) {
      setSearchParams({ search: val }, { replace: true });
    } else {
      setSearchParams({}, { replace: true });
    }
  };

  const fetchClients = async () => {
    try {
      setIsLoading(true);
      setError('');
      const dealsRes = await api.get('/deals', { params: { status: 'SIGNED' } });
      // A reservation, draft or lead alone never establishes a buyer.
      const deals = (dealsRes.data?.deals || dealsRes.deals || []).filter(d => d.status === 'SIGNED');

      // Prefer stable lead identity; names alone must never merge buyers.
      const map = new Map();

      // Buyers appear automatically when a contract becomes SIGNED.
      deals.forEach((d) => {
        const phone = String(d.lead_phone || '').replace(/\D/g, '');
        const clientKey = d.lead_id != null ? `lead-${d.lead_id}` : phone ? `phone-${phone}` : `deal-${d.id}`;
        if (!map.has(clientKey)) {
          map.set(clientKey, {
            id: `deal-${d.id}`,
            lead_id: d.lead_id,
            deal_id: d.id,
            name: d.lead_name || 'Клиент',
            phone: d.lead_phone || '',
            passport: d.passport_series && d.passport_number ? `${d.passport_series} ${d.passport_number}` : 'Уточняется',
            passport_series: d.passport_series,
            passport_number: d.passport_number,
            inn: d.inn || '',
            address: d.registration_address || 'г. Худжанд',
            dealsCount: 1,
            totalPurchasesMinor: d.final_price_minor || 0,
            totalPaidMinor: d.total_paid_minor || d.paid_amount_minor || 0,
            projectName: d.project_name || 'ЖК',
            unitNumber: d.unit_number || '—',
            contract_number: d.contract_number || '',
            contractsList: d.contract_number ? [String(d.contract_number)] : [],
            unitsList: d.unit_number ? [String(d.unit_number)] : [],
            manager_name: d.manager_name || 'Admin',
            source: 'DEAL',
            status: d.status || 'SIGNED',
            created_at: d.created_at || d.deal_date || new Date().toISOString(),
          });
        } else {
          // Accumulate totals if client has multiple deals
          const existing = map.get(clientKey);
          existing.dealsCount += 1;
          existing.totalPurchasesMinor += (d.final_price_minor || 0);
          existing.totalPaidMinor += (d.total_paid_minor || d.paid_amount_minor || 0);
          if (d.contract_number && !existing.contractsList.includes(String(d.contract_number))) {
            existing.contractsList.push(String(d.contract_number));
          }
          if (d.unit_number && !existing.unitsList.includes(String(d.unit_number))) {
            existing.unitsList.push(String(d.unit_number));
          }
          if (!existing.passport_series && d.passport_series) existing.passport_series = d.passport_series;
          if (!existing.passport_number && d.passport_number) existing.passport_number = d.passport_number;
          if (!existing.inn && d.inn) existing.inn = d.inn;
        }
      });

      setClients(Array.from(map.values()));
    } catch (err) {
      setError('Не удалось загрузить покупателей. Повторите попытку.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
    const refresh = () => { void fetchClients(); };
    window.addEventListener('tozon:contract-signed', refresh);
    window.addEventListener('focus', refresh);
    return () => { window.removeEventListener('tozon:contract-signed', refresh); window.removeEventListener('focus', refresh); };
  }, []);

  const filtered = clients.filter((c) =>
    matchSearchQuery(
      c,
      ['name', 'phone', 'passport', 'passport_series', 'passport_number', 'inn', 'projectName', 'address'],
      search,
      {
        phoneFields: ['phone'],
        contractFields: ['contract_number', 'contractsList'],
        unitFields: ['unitNumber', 'unitsList'],
        innFields: ['inn']
      }
    )
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <Users className="h-7 w-7 text-tozon-blue" />
            <span>База покупателей и клиентов</span>
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500 font-medium">
            Только покупатели с подписанным договором. До заключения договора обращения остаются в разделе «Лиды».
          </p>
        </div>

        <Link
          to="/leads"
          className="flex items-center gap-2 rounded-xl bg-tozon-red hover:bg-tozon-red-hover text-white px-4 py-2.5 text-xs font-black transition shadow-md shadow-tozon-red/20 cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          <span>Перейти к лидам</span>
        </Link>
      </div>

      {/* Filter toolbar */}
      <div className="flex items-center justify-between gap-4 rounded-2xl bg-white p-4 border border-slate-200 shadow-2xs">
        <div className="relative min-w-[240px] max-w-md flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Поиск по ФИО, телефону или паспорту..."
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3.5 py-2 text-xs text-slate-900 outline-none focus:border-tozon-blue focus:bg-white focus:ring-4 focus:ring-tozon-blue/10 transition"
          />
        </div>

        <div className="text-xs text-slate-500 font-semibold flex items-center gap-2">
          <span>Всего покупателей:</span>
          <span className="font-extrabold text-slate-900 bg-slate-100 border border-slate-200 px-2.5 py-0.5 rounded-lg text-xs">
            {filtered.length}
          </span>
        </div>
      </div>

      {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error} <button type="button" onClick={fetchClients} className="underline">Повторить</button></div>}

      {/* Clients Table */}
      {isLoading ? (
        <div className="h-72 rounded-3xl bg-white border border-slate-200 flex items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
            <span className="text-xs text-slate-500">Загрузка базы клиентов...</span>
          </div>
        </div>
      ) : error ? null : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-white p-12 text-center shadow-xs">
          <Users className="h-12 w-12 text-slate-300 mb-2" />
          <h3 className="text-base font-bold text-slate-900">Клиенты пока не найдены</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm">
            Покупатель появится здесь автоматически после подписания договора. Брони и лиды отображаются в своих разделах.
          </p>
        </div>
      ) : (
        <div className="rounded-3xl bg-white border border-slate-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                <tr>
                  <th className="p-3.5 pl-6">ФИО Покупателя</th>
                  <th className="p-3.5">Телефон</th>
                  <th className="p-3.5">Паспортные данные</th>
                  <th className="p-3.5">Объект / Квартира</th>
                  <th className="p-3.5">Объем договоров</th>
                  <th className="p-3.5">Оплачено</th>
                  <th className="p-3.5 text-right pr-6">Действие</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => setSelectedClient(c)}
                    className="hover:bg-blue-50/50 transition cursor-pointer group"
                  >
                    <td className="p-3.5 pl-6 font-bold text-slate-900 flex items-center gap-2.5">
                      <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-100 text-blue-800 font-black text-xs group-hover:bg-blue-600 group-hover:text-white transition shadow-2xs">
                        {c.name.charAt(0)}
                      </div>
                      <div>
                        <span className="group-hover:text-blue-600 transition block font-bold">{c.name}</span>
                        {c.dealsCount > 1 && (
                          <span className="text-[10px] text-emerald-600 font-semibold">
                            {c.dealsCount} сделки
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="p-3.5 font-bold text-blue-700">
                      {c.phone ? (
                        <div className="flex items-center gap-1">
                          <Phone className="h-3 w-3 text-blue-500" />
                          <span>{c.phone}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 font-normal">—</span>
                      )}
                    </td>

                    <td className="p-3.5 text-slate-600 text-[11px]">
                      <div className="font-mono">{c.passport}</div>
                      {c.inn && (
                        <div className="text-[10px] text-slate-500">
                          ИНН: <span className="font-mono font-bold text-slate-700">{c.inn}</span>
                        </div>
                      )}
                    </td>

                    <td className="p-3.5 text-slate-700 font-medium">
                      {c.projectName} {c.unitNumber !== '—' ? `(кв. №${c.unitNumber})` : ''}
                    </td>

                    <td className="p-3.5 font-black text-slate-900">
                      {(c.totalPurchasesMinor / 100).toLocaleString('ru-RU')} USD
                    </td>

                    <td className="p-3.5 font-black text-emerald-700">
                      {(c.totalPaidMinor / 100).toLocaleString('ru-RU')} USD
                    </td>

                    <td className="p-3.5 text-right pr-6">
                      <div className="flex items-center justify-end gap-2">
                        {c.phone && (
                          <>
                            <a
                              href={`tel:${c.phone}`}
                              onClick={(e) => e.stopPropagation()}
                              title="Позвонить клиенту"
                              className="inline-flex items-center gap-1 rounded-xl bg-blue-50 text-blue-700 px-3 py-1.5 text-xs font-bold hover:bg-blue-100 transition cursor-pointer"
                            >
                              <Phone className="h-3 w-3" />
                              <span>Позвонить</span>
                            </a>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSmsClient(c);
                              }}
                              title="Отправить SMS клиенту"
                              className="inline-flex items-center gap-1 rounded-xl bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200/80 px-2.5 py-1.5 text-xs font-bold transition cursor-pointer"
                            >
                              <MessageSquare className="h-3 w-3" />
                              <span>SMS</span>
                            </button>
                          </>
                        )}

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setClientToEdit(c);
                          }}
                          className="inline-flex items-center gap-1 rounded-xl bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200/80 px-2.5 py-1.5 text-xs font-bold transition cursor-pointer"
                          title="Редактировать данные клиента"
                        >
                          <Pencil className="h-3 w-3" />
                          <span>Изменить</span>
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedClient(c);
                          }}
                          className="inline-flex items-center gap-1 rounded-xl bg-slate-100 text-slate-700 px-3 py-1.5 text-xs font-bold hover:bg-slate-200 transition cursor-pointer"
                        >
                          <Eye className="h-3 w-3" />
                          <span>Данные</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Edit Client Modal */}
      {clientToEdit && (
        <EditClientModal
          isOpen={Boolean(clientToEdit)}
          client={clientToEdit}
          onClose={() => setClientToEdit(null)}
          onClientUpdated={() => {
            fetchClients();
            setClientToEdit(null);
          }}
        />
      )}

      {/* Client Details & History Modal */}
      {selectedClient && (
        <ClientDetailModal
          isOpen={!!selectedClient}
          client={selectedClient}
          onClose={() => setSelectedClient(null)}
          onClientUpdated={fetchClients}
          onEditClient={(client) => {
            setSelectedClient(null);
            setClientToEdit(client);
          }}
        />
      )}

      {/* Send SMS Modal */}
      {smsClient && (
        <SendSmsModal
          isOpen={Boolean(smsClient)}
          onClose={() => setSmsClient(null)}
          client={{
            id: smsClient.lead_id || smsClient.id,
            phone: smsClient.phone,
            full_name: smsClient.name || smsClient.full_name,
            name: smsClient.name || smsClient.full_name,
            deal_id: smsClient.deal_id
          }}
          context="client"
          onSuccess={() => {
            fetchClients();
          }}
        />
      )}

    </div>
  );
};
