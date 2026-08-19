import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
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
  UserCheck,
  CheckCircle2,
  X
} from 'lucide-react';

export const ClientsPage = () => {
  const [clients, setClients] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newClient, setNewClient] = useState({
    full_name: '',
    phone: '',
    passport_series: '',
    passport_number: '',
    registration_address: '',
  });

  const fetchClients = async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/deals');
      const deals = res.data?.deals || res.deals || [];

      // Group unique clients from deals and leads
      const map = new Map();
      deals.forEach((d) => {
        if (d.lead_name && !map.has(d.lead_phone || d.lead_name)) {
          map.set(d.lead_phone || d.lead_name, {
            id: d.id,
            name: d.lead_name,
            phone: d.lead_phone,
            passport: d.passport_series ? `${d.passport_series} ${d.passport_number}` : 'Уточняется',
            address: d.registration_address || 'г. Худжанд',
            dealsCount: 1,
            totalPurchasesMinor: d.final_price_minor || 0,
            totalPaidMinor: d.paid_amount_minor || 0,
            projectName: d.project_name,
            unitNumber: d.unit_number,
            created_at: new Date(d.created_at || Date.now()).toLocaleDateString('ru-RU'),
          });
        }
      });

      setClients(Array.from(map.values()));
    } catch (err) {
      console.error('Error fetching clients:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const handleCreateClient = (e) => {
    e.preventDefault();
    setClients((prev) => [
      {
        id: Date.now(),
        name: newClient.full_name,
        phone: newClient.phone,
        passport: `${newClient.passport_series} ${newClient.passport_number}`,
        address: newClient.registration_address,
        dealsCount: 0,
        totalPurchasesMinor: 0,
        totalPaidMinor: 0,
        projectName: '—',
        unitNumber: '—',
        created_at: new Date().toLocaleDateString('ru-RU'),
      },
      ...prev,
    ]);
    setIsModalOpen(false);
    setNewClient({ full_name: '', phone: '', passport_series: '', passport_number: '', registration_address: '' });
  };

  const filtered = clients.filter(
    (c) =>
      !search ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.phone && c.phone.toLowerCase().includes(search.toLowerCase())) ||
      (c.passport && c.passport.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Users className="h-7 w-7 text-blue-600" />
            <span>База покупателей и клиентов</span>
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500">
            Реестр покупателей недвижимости, паспортные данные, история покупок и договоров
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 text-xs font-bold transition shadow-md cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          <span>Добавить клиента</span>
        </button>
      </div>

      {/* Filter toolbar */}
      <div className="flex items-center justify-between gap-4 rounded-2xl bg-white p-4 border border-slate-200 shadow-2xs">
        <div className="relative min-w-[240px] max-w-md flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Поиск по ФИО, телефону или паспорту..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3.5 py-2 text-xs text-slate-900 outline-none focus:border-blue-500 focus:bg-white transition"
          />
        </div>

        <div className="text-xs text-slate-500 font-semibold">
          Всего покупателей: <strong className="text-slate-900">{filtered.length}</strong>
        </div>
      </div>

      {/* Clients Table */}
      {isLoading ? (
        <div className="h-72 rounded-3xl bg-white border border-slate-200 flex items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
            <span className="text-xs text-slate-500">Загрузка базы клиентов...</span>
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-white p-12 text-center shadow-xs">
          <Users className="h-12 w-12 text-slate-300 mb-2" />
          <h3 className="text-base font-bold text-slate-900">Клиенты пока не зарегистрированы</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm">
            База клиентов формируется автоматически при оформлении броней и договоров купли-продажи.
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
                  <tr key={c.id} className="hover:bg-blue-50/20 transition">
                    <td className="p-3.5 pl-6 font-bold text-slate-900 flex items-center gap-2.5">
                      <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-100 text-blue-800 font-black text-xs">
                        {c.name.charAt(0)}
                      </div>
                      <span>{c.name}</span>
                    </td>
                    <td className="p-3.5 font-bold text-blue-700">
                      {c.phone ? (
                        <a href={`tel:${c.phone}`} className="hover:underline flex items-center gap-1">
                          <Phone className="h-3 w-3 text-blue-500" />
                          <span>{c.phone}</span>
                        </a>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="p-3.5 text-slate-600 font-mono text-[11px]">{c.passport}</td>
                    <td className="p-3.5 text-slate-700 font-medium">
                      {c.projectName} (кв. №{c.unitNumber})
                    </td>
                    <td className="p-3.5 font-black text-slate-900">
                      {(c.totalPurchasesMinor / 100).toLocaleString()} USD/TJS
                    </td>
                    <td className="p-3.5 font-black text-emerald-700">
                      {(c.totalPaidMinor / 100).toLocaleString()} USD/TJS
                    </td>
                    <td className="p-3.5 text-right pr-6">
                      <a
                        href={`tel:${c.phone}`}
                        className="inline-flex items-center gap-1 rounded-xl bg-blue-50 text-blue-700 px-3 py-1.5 text-xs font-bold hover:bg-blue-100 transition cursor-pointer"
                      >
                        <Phone className="h-3 w-3" />
                        <span>Позвонить</span>
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
          <div className="relative w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-extrabold text-slate-900">Добавить покупателя</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateClient} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">ФИО клиента *</label>
                <input
                  type="text"
                  required
                  placeholder="Рахимов Фарход"
                  value={newClient.full_name}
                  onChange={(e) => setNewClient({ ...newClient, full_name: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2 text-xs outline-none focus:border-blue-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Телефон *</label>
                <input
                  type="text"
                  required
                  placeholder="+992 92 000 0000"
                  value={newClient.phone}
                  onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2 text-xs outline-none focus:border-blue-500 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Серия паспорта</label>
                  <input
                    type="text"
                    placeholder="А"
                    value={newClient.passport_series}
                    onChange={(e) => setNewClient({ ...newClient, passport_series: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs outline-none focus:border-blue-500 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Номер паспорта</label>
                  <input
                    type="text"
                    placeholder="1234567"
                    value={newClient.passport_number}
                    onChange={(e) => setNewClient({ ...newClient, passport_number: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs outline-none focus:border-blue-500 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Адрес прописки</label>
                <input
                  type="text"
                  placeholder="г. Худжанд, ул. Ленина, д. 10"
                  value={newClient.registration_address}
                  onChange={(e) => setNewClient({ ...newClient, registration_address: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2 text-xs outline-none focus:border-blue-500 focus:bg-white"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-blue-600 px-5 py-2 text-xs font-bold text-white shadow-md hover:bg-blue-700 transition"
                >
                  Сохранить
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
