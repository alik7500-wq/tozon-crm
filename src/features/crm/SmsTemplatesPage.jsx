import React, { useState } from 'react';
import {
  MessageSquare,
  Plus,
  Search,
  Pencil,
  Trash2,
  CheckCircle2,
  Calendar,
  X,
  Send,
  Sparkles
} from 'lucide-react';

export const SmsTemplatesPage = () => {
  const [templates, setTemplates] = useState([
    {
      id: 1,
      text: 'Здравствуйте! Интересует ли вас всё ещё данный объект?',
      created_at: '12.02.2026',
    },
    {
      id: 3,
      text: 'Отправили договор вам на почту для ознакомления.',
      created_at: '12.02.2026',
    },
    {
      id: 4,
      text: 'Мы получили оплату. Спасибо!',
      created_at: '12.02.2026',
    },
    {
      id: 12,
      text: 'Могу предложить просмотр в удобное для вас время.',
      created_at: '26.03.2026',
    },
    {
      id: 13,
      text: 'Ожидаем вас в офисе продаж по адресу: г. Душанбе / Худжанд.',
      created_at: '26.03.2026',
    },
    {
      id: 14,
      text: 'Спасибо за обращение в компанию TOZON!',
      created_at: '26.03.2026',
    },
    {
      id: 9,
      text: 'Здравствуйте! Напоминаем, что через 3 дня наступает срок оплаты по вашему договору на квартиру. Просим внести платеж согласно утвержденному графику.',
      created_at: '12.03.2026',
    },
    {
      id: 10,
      text: 'Здравствуйте! Напоминаем, что завтра наступает срок оплаты по вашему договору на квартиру. Просим внести платеж согласно графику.',
      created_at: '12.03.2026',
    },
    {
      id: 11,
      text: 'Здравствуйте! Сегодня срок оплаты по вашему договору на приобретение квартиры. Просим внести платеж согласно графику.',
      created_at: '12.03.2026',
    },
    {
      id: 7,
      text: 'Здравствуйте! У Вас просрочка по оплате, внесите оплату по утвержденному графику пожалуйста!',
      created_at: '09.03.2026',
    },
    {
      id: 8,
      text: 'Здравствуйте! Напоминаем, что через 7 дней наступает срок очередного платежа по договору на квартиру. Просим подготовить оплату согласно графику. Спасибо!',
      created_at: '12.03.2026',
    },
  ]);

  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [templateText, setTemplateText] = useState('');

  const handleOpenCreate = () => {
    setEditingTemplate(null);
    setTemplateText('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (t) => {
    setEditingTemplate(t);
    setTemplateText(t.text);
    setIsModalOpen(true);
  };

  const handleDelete = (id) => {
    if (window.confirm('Удалить этот шаблон сообщения?')) {
      setTemplates((prev) => prev.filter((t) => t.id !== id));
    }
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (!templateText.trim()) return;

    if (editingTemplate) {
      setTemplates((prev) =>
        prev.map((t) =>
          t.id === editingTemplate.id ? { ...t, text: templateText.trim() } : t
        )
      );
    } else {
      const newT = {
        id: Date.now(),
        text: templateText.trim(),
        created_at: new Date().toLocaleDateString('ru-RU'),
      };
      setTemplates((prev) => [newT, ...prev]);
    }

    setIsModalOpen(false);
    setTemplateText('');
    setEditingTemplate(null);
  };

  const filtered = templates.filter((t) =>
    !search || t.text.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <MessageSquare className="h-7 w-7 text-amber-500" />
            <span>Быстрые сообщения и SMS шаблоны</span>
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500">
            Готовые тексты для быстрой отправки клиентам через SMS, WhatsApp и Telegram
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="flex items-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-5 py-2.5 text-xs shadow-md transition cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          <span>Создать</span>
        </button>
      </div>

      {/* Filter toolbar */}
      <div className="flex items-center justify-between gap-4 rounded-2xl bg-white p-4 border border-slate-200 shadow-2xs">
        <div className="relative min-w-[240px] max-w-md flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Поиск по тексту шаблона..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3.5 py-2 text-xs text-slate-900 outline-none focus:border-amber-500 focus:bg-white transition"
          />
        </div>

        <div className="text-xs text-slate-500 font-semibold">
          Всего шаблонов: <strong className="text-slate-900">{filtered.length}</strong>
        </div>
      </div>

      {/* Templates Table */}
      <div className="rounded-3xl bg-white border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
              <tr>
                <th className="p-3.5 pl-6 w-16">№</th>
                <th className="p-3.5">Сообщение</th>
                <th className="p-3.5 w-36">Дата создания</th>
                <th className="p-3.5 text-right pr-6 w-28">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((t, index) => (
                <tr key={t.id} className="hover:bg-amber-50/20 transition">
                  <td className="p-3.5 pl-6 font-bold text-slate-500">
                    {t.id < 1000 ? t.id : index + 1}
                  </td>
                  <td className="p-3.5 font-medium text-slate-800 leading-relaxed max-w-2xl">
                    {t.text}
                  </td>
                  <td className="p-3.5 text-slate-500 font-medium whitespace-nowrap">
                    {t.created_at}
                  </td>
                  <td className="p-3.5 text-right pr-6">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleOpenEdit(t)}
                        title="Редактировать"
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-800 transition cursor-pointer"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(t.id)}
                        title="Удалить"
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition cursor-pointer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
          <div className="relative w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-extrabold text-slate-900">
                {editingTemplate ? 'Редактировать шаблон' : 'Новый шаблон сообщения'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Текст сообщения *
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="Введите текст сообщения или напоминания..."
                  value={templateText}
                  onChange={(e) => setTemplateText(e.target.value)}
                  className="w-full rounded-2xl border border-slate-300 bg-slate-50 p-3.5 text-xs text-slate-900 outline-none focus:border-amber-500 focus:bg-white leading-relaxed"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-amber-500 hover:bg-amber-600 px-5 py-2 text-xs font-bold text-slate-950 shadow-md transition cursor-pointer"
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
