import React, { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../../api/client';
import { InstagramReplyComposer } from './InstagramReplyComposer';
import { useAuth } from '../auth/AuthContext';

export function InstagramInboxPage() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [selected, setSelected] = useState(null);
  const [messages, setMessages] = useState([]);
  const [nextCursor, setNextCursor] = useState(null);
  const [messagesCursor, setMessagesCursor] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const historyRequest = useRef(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [connection, setConnection] = useState(null);
  const [connecting, setConnecting] = useState(false);
  const allowed = ['ADMIN', 'DIRECTOR'].includes(user?.role);

  const refresh = useCallback(async (after) => {
    const cursor = typeof after === 'string' ? after : null;
    setLoading(true);
    setError('');
    try {
      const response = await api.get(cursor ? '/integrations/instagram/inbox/conversations/page' : '/integrations/instagram/inbox/conversations', { params: cursor ? { after: cursor } : {} });
      setConversations(previous => cursor ? [...new Map([...previous, ...(response?.data || [])].map(c => [c.contactId, c])).values()] : (response?.data || []));
      setNextCursor(response?.nextCursor || null);
    } catch (err) {
      setError(err.message || 'Не удалось загрузить переписки Instagram.');
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
  const openConversation = async (conversation, after = null) => {
    const requestId = ++historyRequest.current;
    setHistoryLoading(true);
    setSelected(conversation);
    if (!after) { setMessages([]); setMessagesCursor(null); }
    setError('');
    try {
      const account = encodeURIComponent(conversation.instagramAccountId);
      const contact = encodeURIComponent(conversation.contactId);
      const response = await api.get(`/integrations/instagram/inbox/conversations/${account}/${contact}/messages`, { params: after ? { after } : {} });
      if (requestId !== historyRequest.current) return;
      setMessages(previous => after ? [...new Map([...(response?.data || []), ...previous].map(m => [m.message_id, m])).values()] : (response?.data || []));
      setMessagesCursor(response?.nextCursor || null);
    } catch (err) {
      if (requestId === historyRequest.current) setError(err.message || 'Не удалось загрузить историю переписки.');
    } finally {
      if (requestId === historyRequest.current) setHistoryLoading(false);
    }
  };

  if (!allowed) return <div className="p-6 text-slate-700">Доступ к перепискам Instagram ограничен.</div>;
  return <section className="p-6 space-y-5">
    <div className="flex flex-wrap justify-between gap-3 items-center">
      <div><h1 className="text-2xl font-bold text-slate-900">Instagram Direct</h1><p className="text-sm text-slate-500">Просмотр сообщений и ответы клиентам после активации интеграции.</p></div>
      <button type="button" onClick={() => { void refresh(); if (selected) void openConversation(selected); }} disabled={loading || historyLoading} className="rounded-lg bg-blue-600 px-4 py-2 text-white disabled:opacity-50">{loading ? 'Загрузка…' : 'Обновить'}</button>
    </div>
    <div className="rounded-xl border border-slate-200 bg-white p-4 flex flex-wrap gap-3 items-center justify-between">
      <div><div className="font-medium">Аккаунт TOZON PLAZA</div><div className="text-sm text-slate-500">{connection?.connected ? 'Instagram подключён' : 'Подключение не подтверждено'}</div></div>
      <button type="button" onClick={connect} disabled={connecting} className="rounded-lg border border-blue-600 px-4 py-2 text-blue-700 disabled:opacity-50">{connecting ? 'Подключение…' : connection?.connected ? 'Переподключить Instagram' : 'Подключить Instagram'}</button>
    </div>
    {error && <p role="alert" className="text-red-700">{error}</p>}
    <div className="grid gap-4 md:grid-cols-[minmax(230px,1fr)_minmax(0,2fr)]">
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <h2 className="border-b p-4 font-semibold">Диалоги</h2>
        {!loading && !error && conversations.length === 0 && <p className="p-4 text-sm text-slate-500">Сообщений пока нет.</p>}
        {conversations.map(c => <button type="button" key={c.instagramAccountId + ':' + c.contactId} onClick={() => openConversation(c)} className={'w-full border-b p-4 text-left hover:bg-blue-50 ' + (selected?.contactId === c.contactId ? 'bg-blue-50' : '')}>
          <div className="font-medium text-slate-900">{c.name || ('Instagram ID: ' + c.contactId)}</div>
          <div className="truncate text-sm text-slate-500">{c.lastMessage || 'Вложение или сообщение без текста'}</div>
        </button>)}
        {nextCursor && <button type="button" disabled={loading} onClick={() => refresh(nextCursor)} className="p-4 text-blue-700">Загрузить ещё диалоги</button>}
      </div>
      <div className="rounded-xl border border-slate-200 bg-white min-h-80">
        <h2 className="border-b p-4 font-semibold">{selected ? 'Переписка: ' + (selected.name || selected.contactId) : 'Выберите диалог'}</h2>
        <div className="space-y-3 p-4">
          {historyLoading && <p role="status">Загрузка сообщений…</p>}
          {messagesCursor && <button type="button" disabled={historyLoading} onClick={() => openConversation(selected, messagesCursor)} className="text-blue-700">Более ранние сообщения</button>}
          {messages.map(m => <div key={m.message_id} className={'max-w-[85%] rounded-xl p-3 text-sm ' + (m.is_echo ? 'ml-auto bg-blue-100' : 'bg-slate-100')}>
            <div className="whitespace-pre-wrap break-words">{m.text_content || (m.has_attachments ? 'Вложение' : 'Сообщение без текста')}</div>
            <div className="mt-1 text-xs text-slate-500">{m.is_echo ? 'Исходящее' : 'Входящее'}</div>
          </div>)}
        </div>
        <InstagramReplyComposer key={selected ? selected.instagramAccountId + ':' + selected.contactId : 'none'} conversation={selected} onSent={() => openConversation(selected)} />
      </div>
    </div>
  </section>;
}
