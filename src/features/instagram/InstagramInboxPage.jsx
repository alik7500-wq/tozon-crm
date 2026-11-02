import React, { useCallback, useEffect, useState } from 'react';
import { api } from '../../api/client';
import { InstagramReplyComposer } from './InstagramReplyComposer';
import { useAuth } from '../auth/AuthContext';

export function InstagramInboxPage() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [selected, setSelected] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [connection, setConnection] = useState(null);
  const [connecting, setConnecting] = useState(false);
  const allowed = ['ADMIN', 'DIRECTOR'].includes(user?.role);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/integrations/instagram/inbox/conversations');
      setConversations(response?.data || []);
    } catch {
      setError('Не удалось загрузить переписки Instagram.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!allowed) return;
    void refresh();
    api.get('/integrations/instagram/connection')
      .then(result => setConnection(result?.data || null))
      .catch(() => setConnection(null));
  }, [allowed, refresh]);
  const connect = async () => {
    setConnecting(true);
    setError('');
    try {
      const result = await api.post('/integrations/instagram/connect');
      const url = result?.data?.authorizationUrl;
      if (!url || !/^https:\/\/www\.facebook\.com\//.test(url)) throw new Error('Invalid authorization URL');
      window.location.assign(url);
    } catch {
      setError('Не удалось начать подключение Instagram. Проверьте настройки Meta.');
      setConnecting(false);
    }
  };
  const openConversation = async (conversation) => {
    setSelected(conversation);
    setMessages([]);
    setError('');
    try {
      const account = encodeURIComponent(conversation.instagramAccountId);
      const contact = encodeURIComponent(conversation.contactId);
      const response = await api.get(`/integrations/instagram/inbox/conversations/${account}/${contact}/messages`);
      setMessages(response?.data || []);
    } catch {
      setError('Не удалось загрузить историю переписки.');
    }
  };

  if (!allowed) return <div className="p-6 text-slate-700">Доступ к перепискам Instagram ограничен.</div>;
  return <section className="p-6 space-y-5">
    <div className="flex flex-wrap justify-between gap-3 items-center">
      <div><h1 className="text-2xl font-bold text-slate-900">Instagram Direct</h1><p className="text-sm text-slate-500">Просмотр сообщений и ответы клиентам после активации интеграции.</p></div>
      <button type="button" onClick={refresh} disabled={loading} className="rounded-lg bg-blue-600 px-4 py-2 text-white disabled:opacity-50">{loading ? 'Загрузка…' : 'Обновить'}</button>
    </div>
    <div className="rounded-xl border border-slate-200 bg-white p-4 flex flex-wrap gap-3 items-center justify-between">
      <div><div className="font-medium">Аккаунт TOZON PLAZA</div><div className="text-sm text-slate-500">{connection?.connected ? 'Instagram подключён' : 'Подключение не подтверждено'}</div></div>
      <button type="button" onClick={connect} disabled={connecting} className="rounded-lg border border-blue-600 px-4 py-2 text-blue-700 disabled:opacity-50">{connecting ? 'Подключение…' : 'Подключить Instagram'}</button>
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
        <InstagramReplyComposer conversation={selected} onSent={() => openConversation(selected)} />
      </div>
    </div>
  </section>;
}
