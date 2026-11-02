import React, { useCallback, useEffect, useState } from 'react';
import { api } from '../../api/client';
import { useAuth } from '../auth/AuthContext';

export function InstagramInboxPage() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [selected, setSelected] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const allowed = ['ADMIN', 'DIRECTOR'].includes(user?.role);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/integrations/instagram/inbox/conversations');
      setConversations(response.data?.data || []);
    } catch {
      setError('Не удалось загрузить переписки Instagram.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (allowed) void refresh(); }, [allowed, refresh]);
  const openConversation = async (conversation) => {
    setSelected(conversation);
    setMessages([]);
    setError('');
    try {
      const account = encodeURIComponent(conversation.instagramAccountId);
      const contact = encodeURIComponent(conversation.contactId);
      const response = await api.get(`/integrations/instagram/inbox/conversations/${account}/${contact}/messages`);
      setMessages(response.data?.data || []);
    } catch {
      setError('Не удалось загрузить историю переписки.');
    }
  };

  if (!allowed) return <div className="p-6 text-slate-700">Доступ к перепискам Instagram ограничен.</div>;
  return <section className="p-6 space-y-5">
    <div className="flex flex-wrap justify-between gap-3 items-center">
      <div><h1 className="text-2xl font-bold text-slate-900">Instagram Direct</h1><p className="text-sm text-slate-500">Просмотр входящих сообщений. Отправка ответов пока недоступна.</p></div>
      <button type="button" onClick={refresh} disabled={loading} className="rounded-lg bg-blue-600 px-4 py-2 text-white disabled:opacity-50">{loading ? 'Загрузка…' : 'Обновить'}</button>
    </div>
    {error && <p role="alert" className="text-red-700">{error}</p>}
    <div className="grid gap-4 md:grid-cols-[minmax(230px,1fr)_minmax(0,2fr)]">
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <h2 className="border-b p-4 font-semibold">Диалоги</h2>
        {conversations.length === 0 && <p className="p-4 text-sm text-slate-500">Сообщений пока нет.</p>}
        {conversations.map(c => <button type="button" key={c.instagramAccountId + ':' + c.contactId} onClick={() => openConversation(c)} className={'w-full border-b p-4 text-left hover:bg-blue-50 ' + (selected?.contactId === c.contactId ? 'bg-blue-50' : '')}>
          <div className="font-medium text-slate-900">Instagram ID: {c.contactId}</div>
          <div className="truncate text-sm text-slate-500">{c.lastMessage || 'Вложение или сообщение без текста'}</div>
        </button>)}
      </div>
      <div className="rounded-xl border border-slate-200 bg-white min-h-80">
        <h2 className="border-b p-4 font-semibold">{selected ? 'Переписка: ' + selected.contactId : 'Выберите диалог'}</h2>
        <div className="space-y-3 p-4">
          {messages.map(m => <div key={m.message_id} className={'max-w-[85%] rounded-xl p-3 text-sm ' + (m.is_echo ? 'ml-auto bg-blue-100' : 'bg-slate-100')}>
            <div className="whitespace-pre-wrap break-words">{m.text_content || (m.has_attachments ? 'Вложение' : 'Сообщение без текста')}</div>
            <div className="mt-1 text-xs text-slate-500">{m.is_echo ? 'Исходящее' : 'Входящее'}</div>
          </div>)}
        </div>
      </div>
    </div>
  </section>;
}
