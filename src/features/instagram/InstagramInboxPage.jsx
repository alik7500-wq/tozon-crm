import React, { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../../api/client';
import { InstagramReplyComposer } from './InstagramReplyComposer';
import { InstagramMessageContent } from './InstagramMessageContent';
import { useAuth } from '../auth/AuthContext';

const dateTimeFormat = new Intl.DateTimeFormat('ru-RU', {
  day: '2-digit', month: '2-digit', year: 'numeric',
  hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
});

function InstagramTime({ value }) {
  if (!value) return null;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return null;
  return <time dateTime={date.toISOString()} title={date.toLocaleString('ru-RU', { timeZoneName: 'short' })}>
    {dateTimeFormat.format(date)}
  </time>;
}

export function InstagramInboxPage() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [selected, setSelected] = useState(null);
  const [messages, setMessages] = useState([]);
  const [nextCursor, setNextCursor] = useState(null);
  const [messagesCursor, setMessagesCursor] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const historyRequest = useRef(0);
  // Component-local only: cleared on leaving the inbox, never stored in browser storage.
  const historyCache = useRef(new Map());
  const pendingHistory = useRef(new Map());
  const historyVersions = useRef(new Map());
  const selectedRef = useRef(null);
  const refreshBusy = useRef(false);
  const [showingCached, setShowingCached] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [connection, setConnection] = useState(null);
  const [connecting, setConnecting] = useState(false);
  const allowed = ['ADMIN', 'DIRECTOR'].includes(user?.role);

  const refresh = useCallback(async (after, quiet = false) => {
    const cursor = typeof after === 'string' ? after : null;
    if (!quiet) { setLoading(true); setError(''); }
    try {
      const response = await api.get(cursor ? '/integrations/instagram/inbox/conversations/page' : '/integrations/instagram/inbox/conversations', { params: cursor ? { after: cursor } : {} });
      setConversations(previous => cursor ? [...new Map([...previous, ...(response?.data || [])].map(c => [c.contactId, c])).values()] : (response?.data || []));
      setNextCursor(response?.nextCursor || null);
      return true;
    } catch (err) {
      if ([401, 403, 409].includes(err.response?.status)) {
        historyCache.current.clear(); selectedRef.current = null; ++historyRequest.current;
        setConversations([]); setSelected(null); setMessages([]); setMessagesCursor(null);
      }
      setError(err.message || 'Не удалось загрузить переписки Instagram.');
      return false;
    } finally {
      if (!quiet) setLoading(false);
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
  const openConversation = useCallback(async (conversation, after = null, force = false, quiet = false) => {
    const requestId = ++historyRequest.current;
    const key = conversation.instagramAccountId + ':' + conversation.contactId;
    const cached = historyCache.current.get(key);
    if (!quiet) {
      setHistoryLoading(true);
      setSelected(conversation); selectedRef.current = conversation;
      setShowingCached(Boolean(cached));
    }
    if (!after && !quiet) {
      setMessages(cached?.messages || []);
      setMessagesCursor(cached?.nextCursor || null);
    }
    if (!quiet) setError('');
    // Very recent successful histories need no repeated request on rapid switching.
    if (!after && !force && cached && Date.now() - cached.loadedAt < 10000) {
      setHistoryLoading(false);
      return;
    }
    try {
      const account = encodeURIComponent(conversation.instagramAccountId);
      const contact = encodeURIComponent(conversation.contactId);
      const pendingKey = key + ':' + (after || 'latest');
      let pending = !force ? pendingHistory.current.get(pendingKey) : null;
      if (!pending) {
        pending = api.get(`/integrations/instagram/inbox/conversations/${account}/${contact}/messages`, { params: after ? { after } : {} });
        pendingHistory.current.set(pendingKey, pending);
        historyVersions.current.set(pendingKey, pending);
        while (historyVersions.current.size > 60) historyVersions.current.delete(historyVersions.current.keys().next().value);
        // Use both handlers to avoid an unhandled rejection from an ignored finally promise.
        const clearPending = () => { if (pendingHistory.current.get(pendingKey) === pending) pendingHistory.current.delete(pendingKey); };
        pending.then(clearPending, clearPending);
      }
      const response = await pending;
      if (historyVersions.current.get(pendingKey) !== pending) return;
      const loaded = after ? [...new Map([...(response?.data || []), ...(cached?.messages || [])].map(m => [m.message_id, m])).values()] : (response?.data || []);
      historyCache.current.delete(key);
      historyCache.current.set(key, { messages: loaded, nextCursor: response?.nextCursor || null,
        loadedAt: after ? (cached?.loadedAt || 0) : Date.now() });
      while (historyCache.current.size > 20) historyCache.current.delete(historyCache.current.keys().next().value);
      if (requestId !== historyRequest.current) return;
      setMessages(loaded);
      setMessagesCursor(response?.nextCursor || null);
      setShowingCached(false);
      if (!quiet) setError('');
    } catch (err) {
      if (requestId === historyRequest.current) {
        if ([401, 403, 404, 409].includes(err.response?.status)) {
          historyCache.current.delete(key); setMessages([]); setMessagesCursor(null); setShowingCached(false);
        }
        setError((cached ? 'Не удалось обновить историю. ' : '') + (err.message || 'Не удалось загрузить историю переписки.'));
      }
    } finally {
      if (requestId === historyRequest.current) setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!allowed) return;
    let alive = true;
    const tick = async () => {
      if (!alive || document.hidden || refreshBusy.current || pendingHistory.current.size) return;
      refreshBusy.current = true;
      const current = selectedRef.current;
      try {
        const ok = await refresh(null, true);
        if (alive && ok && current && selectedRef.current === current && !pendingHistory.current.size) {
          await openConversation(current, null, true, true);
        }
      } finally { refreshBusy.current = false; }
    };
    const timer = setInterval(tick, 3000);
    document.addEventListener('visibilitychange', tick);
    window.addEventListener('focus', tick);
    return () => { alive = false; clearInterval(timer); document.removeEventListener('visibilitychange', tick); window.removeEventListener('focus', tick); };
  }, [allowed, refresh, openConversation]);

  const sent = (result) => {
    if (!selected) return;
    const message = result?.message;
    const key = selected.instagramAccountId + ':' + selected.contactId;
    if (message) {
      const cached = historyCache.current.get(key);
      const updated = [...new Map([...(cached?.messages || []), message].map(m => [m.message_id, m])).values()];
      historyCache.current.set(key, { ...cached, messages: updated, loadedAt: Date.now() });
      setMessages(updated);
      setConversations(items => items.map(c => c.contactId === selected.contactId ? { ...c, lastMessage: message.text_content, updatedAt: message.created_at } : c));
      if (result.saved === false) setError('Сообщение отправлено. Обновление сохранённой истории будет повторено автоматически.');
    } else void openConversation(selected, null, true, true);
  };

  if (!allowed) return <div className="p-6 text-slate-700">Доступ к перепискам Instagram ограничен.</div>;
  return <section className="p-6 space-y-5">
    <div className="flex flex-wrap justify-between gap-3 items-center">
      <div><h1 className="text-2xl font-bold text-slate-900">Instagram Direct</h1><p className="text-sm text-slate-500">Автообновление включено · Новые сообщения проверяются каждые 3 секунды.</p></div>
      <button type="button" onClick={() => { void refresh(); if (selected) void openConversation(selected, null, true); }} disabled={loading || historyLoading} className="rounded-lg bg-blue-600 px-4 py-2 text-white disabled:opacity-50">{loading ? 'Загрузка…' : 'Обновить'}</button>
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
          <div className="truncate text-sm text-slate-500">{c.lastMessage || 'Содержимое недоступно в API Instagram'}</div>
          <div className="mt-1 text-xs text-slate-500"><InstagramTime value={c.updatedAt} /></div>
        </button>)}
        {nextCursor && <button type="button" disabled={loading} onClick={() => refresh(nextCursor)} className="p-4 text-blue-700">Загрузить ещё диалоги</button>}
      </div>
      <div className="rounded-xl border border-slate-200 bg-white min-h-80">
        <h2 className="border-b p-4 font-semibold">{selected ? 'Переписка: ' + (selected.name || selected.contactId) : 'Выберите диалог'}</h2>
        <div className="space-y-3 p-4">
          {historyLoading && <p role="status">{showingCached ? 'Обновление сообщений…' : 'Загрузка сообщений…'}</p>}
          {showingCached && !historyLoading && <p className="text-xs text-slate-500">Показана ранее загруженная история. Новые сообщения появятся автоматически.</p>}
          {messagesCursor && <button type="button" disabled={historyLoading} onClick={() => openConversation(selected, messagesCursor)} className="text-blue-700">Более ранние сообщения</button>}
          {messages.map(m => <div key={m.message_id} className={'max-w-[85%] rounded-xl p-3 text-sm ' + (m.is_echo ? 'ml-auto bg-blue-100' : 'bg-slate-100')}>
            <InstagramMessageContent message={m} />
            <div className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-slate-500">
              <span>{m.is_echo ? 'Исходящее' : 'Входящее'}</span>
              <InstagramTime value={m.created_at} />
            </div>
          </div>)}
        </div>
        <InstagramReplyComposer key={selected ? selected.instagramAccountId + ':' + selected.contactId : 'none'} conversation={selected} onSent={sent} />
      </div>
    </div>
  </section>;
}
