import React, { useState } from 'react';
import {
  Smartphone,
  Send,
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
  Plus,
  X,
  Users,
  Filter
} from 'lucide-react';

export const SmsNotificationsPage = () => {
  const [logs, setLogs] = useState([
    {
      id: 1,
      recipient: '+992 911 01 06 66',
      client_name: 'Алиев Рахим',
      text: 'TOZON CRM: По договору 25601-2026-0004 принята оплата 10,000 USD. Спасибо!',
      status: 'DELIVERED',
      sent_at: new Date(Date.now() - 30 * 60000).toLocaleString('ru-RU'),
    },
    {
      id: 2,
      recipient: '+992 927 77 97 57',
      client_name: 'Акмалхон Абдуллоев',
      text: 'Здравствуйте! Напоминаем, что через 3 дня наступает срок оплаты по вашему договору на квартиру в ЖК TOZON PLAZA.',
      status: 'DELIVERED',
      sent_at: new Date(Date.now() - 120 * 60000).toLocaleString('ru-RU'),
    },
    {
      id: 3,
      recipient: '+992 935 55 12 34',
      client_name: 'Шахноза Алиева',
      text: 'Здравствуйте! Сегодня срок оплаты по вашему договору на приобретение квартиры. Просим внести платеж согласно графику.',
      status: 'DELIVERED',
      sent_at: new Date(Date.now() - 360 * 60000).toLocaleString('ru-RU'),
    },
  ]);

  const [search, setSearch] = useState('');
  const [isSendModalOpen, setIsSendModalOpen] = useState(false);
  const [newSms, setNewSms] = useState({ recipient: '', client_name: '', text: '' });
  const [isSending, setIsSending] = useState(false);

  const handleSendSms = (e) => {
    e.preventDefault();
    if (!newSms.recipient || !newSms.text) return;

    setIsSending(true);
    setTimeout(() => {
      setLogs((prev) => [
        {
          id: Date.now(),
          recipient: newSms.recipient,
          client_name: newSms.client_name || 'Клиент',
          text: newSms.text,
          status: 'DELIVERED',
          sent_at: new Date().toLocaleString('ru-RU'),
        },
        ...prev,
      ]);
      setIsSending(false);
      setIsSendModalOpen(false);
      setNewSms({ recipient: '', client_name: '', text: '' });
    }, 600);
  };

  const filtered = logs.filter(
    (l) =>
      !search ||
      l.recipient.includes(search) ||
      l.client_name.toLowerCase().includes(search.toLowerCase()) ||
      l.text.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Smartphone className="h-7 w-7 text-purple-600" />
            <span>SMS-оповещения</span>
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500">
            История отправленных SMS-сообщений, чеков об оплате и массовые оповещения клиентам
          </p>
        </div>

        <button
          onClick={() => setIsSendModalOpen(true)}
          className="flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 text-xs font-bold transition shadow-md cursor-pointer"
        >
          <Send className="h-4 w-4" />
          <span>Отправить SMS</span>
        </button>
      </div>

      {/* Filter toolbar */}
      <div className="flex items-center justify-between gap-4 rounded-2xl bg-white p-4 border border-slate-200 shadow-2xs">
        <div className="relative min-w-[240px] max-w-md flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Поиск по номеру, имени или тексту..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3.5 py-2 text-xs text-slate-900 outline-none focus:border-purple-500 focus:bg-white transition"
          />
        </div>

        <div className="text-xs text-slate-500 font-semibold">
          Всего отправлено: <strong className="text-slate-900">{filtered.length}</strong>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-3xl bg-white border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
              <tr>
                <th className="p-3.5 pl-6">Дата и время</th>
                <th className="p-3.5">Получатель</th>
                <th className="p-3.5">Текст SMS</th>
                <th className="p-3.5 text-right pr-6">Статус доставки</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((l) => (
                <tr key={l.id} className="hover:bg-purple-50/20 transition">
                  <td className="p-3.5 pl-6 text-slate-500 font-medium whitespace-nowrap">
                    {l.sent_at}
                  </td>
                  <td className="p-3.5">
                    <div className="font-bold text-slate-900">{l.client_name}</div>
                    <div className="text-[11px] text-purple-700 font-mono">{l.recipient}</div>
                  </td>
                  <td className="p-3.5 text-slate-700 max-w-xl leading-relaxed">
                    {l.text}
                  </td>
                  <td className="p-3.5 text-right pr-6">
                    <span className="inline-flex items-center gap-1 text-emerald-700 font-bold text-[11px]">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                      <span>Доставлено</span>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {isSendModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
          <div className="relative w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-extrabold text-slate-900">Новое SMS-оповещение</h3>
              <button
                onClick={() => setIsSendModalOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSendSms} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Номер получателя *</label>
                <input
                  type="text"
                  required
                  placeholder="+992 92 000 0000"
                  value={newSms.recipient}
                  onChange={(e) => setNewSms({ ...newSms, recipient: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2 text-xs outline-none focus:border-purple-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">ФИО получателя</label>
                <input
                  type="text"
                  placeholder="Рахимов Фарход"
                  value={newSms.client_name}
                  onChange={(e) => setNewSms({ ...newSms, client_name: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2 text-xs outline-none focus:border-purple-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Текст SMS *</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Введите текст сообщения..."
                  value={newSms.text}
                  onChange={(e) => setNewSms({ ...newSms, text: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 p-3 text-xs outline-none focus:border-purple-500 focus:bg-white leading-relaxed"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsSendModalOpen(false)}
                  className="rounded-xl px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={isSending}
                  className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2 text-xs font-bold text-white shadow-md hover:bg-blue-700 transition disabled:opacity-50"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>{isSending ? 'Отправка...' : 'Отправить'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
