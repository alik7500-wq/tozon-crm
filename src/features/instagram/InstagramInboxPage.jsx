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

function InstagramAccountInbox({ accountId, drafts }) {
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
  const contextVersionRef = useRef(0);
  const backoffMsRef = useRef(3000);
  const [showingCached, setShowingCached] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [syncStatus, setSyncStatus] = useState(() => (typeof navigator !== 'undefined' && navigator.onLine === false ? 'offline' : 'online'));
  const [lastSyncAt, setLastSyncAt] = useState(null);
  const allowed = ['ADMIN', 'DIRECTOR', 'SALES_MANAGER'].includes(user?.role);

  const clearAuthScopedState = useCallback((onlyKey = null) => {
    if (onlyKey) {
      historyCache.current.delete(onlyKey);
      drafts?.delete?.(onlyKey);
      if (selectedRef.current && (selectedRef.current.instagramAccountId + ':' + selectedRef.current.contactId) === onlyKey) {
        selectedRef.current = null;
        ++historyRequest.current;
        setSelected(null);
        setMessages([]);
        setMessagesCursor(null);
        setShowingCached(false);
      }
      return;
    }
    historyCache.current.clear();
    pendingHistory.current.clear();
    historyVersions.current.clear();
    drafts?.clear?.();
    selectedRef.current = null;
    ++historyRequest.current;
    setConversations([]);
    setSelected(null);
    setMessages([]);
    setMessagesCursor(null);
    setShowingCached(false);
  }, [drafts]);

  const refresh = useCallback(async (after, quiet = false) => {
    const cursor = typeof after === 'string' ? after : null;
    const ctxVersion = contextVersionRef.current;
    if (!quiet) { setLoading(true); setError(''); }
    try {
      const response = await api.get(cursor ? '/integrations/instagram/inbox/conversations/page' : '/integrations/instagram/inbox/conversations', { params: { ...(cursor ? { after: cursor } : {}), ...(accountId ? { account: accountId } : {}) } });
      if (ctxVersion !== contextVersionRef.current) return false;
      const incoming = response?.data || [];
      setConversations(previous => {
        if (cursor) {
          return [...new Map([...previous, ...incoming].map(c => [`${c.instagramAccountId}:${c.contactId}`, c])).values()];
        }
        if (quiet && previous.length > 0) {
          // Merge page 1 updates while preserving already-loaded pages 2..N (and never close selected off-page-1)
          const incomingKeys = new Set(incoming.map(c => `${c.instagramAccountId}:${c.contactId}`));
          const tail = previous.filter(c => !incomingKeys.has(`${c.instagramAccountId}:${c.contactId}`));
          return [...incoming, ...tail];
        }
        return incoming;
      });
      setNextCursor(prevCur => {
        if (cursor) return response?.nextCursor || null;
        if (quiet && prevCur) return prevCur;
        return response?.nextCursor || null;
      });
      backoffMsRef.current = 3000;
      setSyncStatus('online');
      setLastSyncAt(new Date().toISOString());
      return true;
    } catch (err) {
      if (ctxVersion !== contextVersionRef.current) return false;
      const status = err?.response?.status ?? err?.status;
      // Only clear caches/drafts on real auth/access denial (401/403), NEVER on 409 conflict or 503 transient failure
      if (status === 401 || status === 403) {
        clearAuthScopedState();
      }
      const offlineNow = typeof navigator !== 'undefined' && navigator.onLine === false;
      setSyncStatus(offlineNow ? 'offline' : 'reconnecting');
      backoffMsRef.current = Math.min(30000, backoffMsRef.current * 2);
      setError(err.message || 'Не удалось загрузить переписки Instagram.');
      return false;
    } finally {
      if (!quiet && ctxVersion === contextVersionRef.current) setLoading(false);
    }
  }, [accountId, clearAuthScopedState]);

  useEffect(() => {
    contextVersionRef.current += 1;
    historyCache.current.clear();
    pendingHistory.current.clear();
    historyVersions.current.clear();
    selectedRef.current = null;
    ++historyRequest.current;
    setSelected(null);
    setMessages([]);
    setMessagesCursor(null);
    setShowingCached(false);
    if (!allowed) {
      drafts?.clear?.();
      setConversations([]);
      return;
    }
    void refresh();
    return () => {
      contextVersionRef.current += 1;
      ++historyRequest.current;
      selectedRef.current = null;
    };
  }, [allowed, refresh, user?.id, user?.role, drafts]);
  const openConversation = useCallback(async (conversation, after = null, force = false, quiet = false) => {
    const requestId = ++historyRequest.current;
    const ctxVersion = contextVersionRef.current;
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
      if (ctxVersion !== contextVersionRef.current) return;
      if (historyVersions.current.get(pendingKey) !== pending) return;
      // Preserve older loaded messages on both explicit `after` paging and background latest refresh!
      const mergedMap = new Map();
      for (const m of (cached?.messages || [])) mergedMap.set(m.message_id, m);
      for (const m of (response?.data || [])) mergedMap.set(m.message_id, m);
      const loaded = [...mergedMap.values()].sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at));
      const resolvedNextCursor = after ? (response?.nextCursor || null) : (cached?.nextCursor ?? response?.nextCursor ?? null);
      historyCache.current.delete(key);
      historyCache.current.set(key, { messages: loaded, nextCursor: resolvedNextCursor,
        loadedAt: after ? (cached?.loadedAt || 0) : Date.now() });
      while (historyCache.current.size > 20) historyCache.current.delete(historyCache.current.keys().next().value);
      if (!quiet && requestId !== historyRequest.current) return;
      if (selectedRef.current && (selectedRef.current.instagramAccountId + ':' + selectedRef.current.contactId) === key) {
        setMessages(loaded);
        setMessagesCursor(resolvedNextCursor);
        setShowingCached(false);
      }
      backoffMsRef.current = 3000;
      setSyncStatus('online');
      setLastSyncAt(new Date().toISOString());
      if (!quiet) setError('');
    } catch (err) {
      if (ctxVersion !== contextVersionRef.current) return;
      const status = err?.response?.status ?? err?.status;
      const shouldClear = status === 401 || status === 403 || status === 404;
      if (requestId === historyRequest.current || quiet) {
        setError((cached && !shouldClear ? 'Не удалось обновить историю. ' : '') + (err.message || 'Не удалось загрузить историю переписки.'));
      }
      if (shouldClear) {
        clearAuthScopedState(key);
      }
    } finally {
      if (requestId === historyRequest.current && ctxVersion === contextVersionRef.current) setHistoryLoading(false);
    }
  }, [clearAuthScopedState]);

  useEffect(() => {
    if (!allowed) return;
    let alive = true;
    let timerId = null;

    const scheduleNext = () => {
      if (!alive) return;
      if (timerId) clearTimeout(timerId);
      timerId = setTimeout(tick, backoffMsRef.current);
    };

    const tick = async () => {
      if (!alive || document.hidden || refreshBusy.current || pendingHistory.current.size) {
        scheduleNext();
        return;
      }
      if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        setSyncStatus('offline');
        scheduleNext();
        return;
      }
      refreshBusy.current = true;
      const current = selectedRef.current;
      try {
        const ok = await refresh(null, true);
        if (alive && ok && current && selectedRef.current === current && !pendingHistory.current.size) {
          await openConversation(current, null, true, true);
        }
      } finally {
        refreshBusy.current = false;
        scheduleNext();
      }
    };

    const handleOnline = () => {
      backoffMsRef.current = 3000;
      setSyncStatus('reconnecting');
      void tick();
    };
    const handleOffline = () => {
      setSyncStatus('offline');
    };

    scheduleNext();
    document.addEventListener('visibilitychange', tick);
    window.addEventListener('focus', tick);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      alive = false;
      if (timerId) clearTimeout(timerId);
      document.removeEventListener('visibilitychange', tick);
      window.removeEventListener('focus', tick);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [allowed, refresh, openConversation]);

  const sent = (result, opContext = null) => {
    const targetAccount = opContext?.accountId || selectedRef.current?.instagramAccountId;
    const targetContact = opContext?.contactId || selectedRef.current?.contactId;
    if (!targetAccount || !targetContact) return;
    const key = targetAccount + ':' + targetContact;
    const isCurrentlySelected =
      selectedRef.current &&
      String(selectedRef.current.instagramAccountId) === String(targetAccount) &&
      String(selectedRef.current.contactId) === String(targetContact);
    const message = result?.message;
    if (message) {
      const cached = historyCache.current.get(key);
      const updated = [...new Map([...(cached?.messages || []), message].map(m => [m.message_id, m])).values()];
      historyCache.current.set(key, { ...cached, messages: updated, loadedAt: Date.now() });
      if (isCurrentlySelected) {
        setMessages(updated);
        if (result.saved === false) setError('Сообщение отправлено. Обновление сохранённой истории будет повторено автоматически.');
      }
      setConversations(items => items.map(c => (String(c.contactId) === String(targetContact) && String(c.instagramAccountId) === String(targetAccount)) ? { ...c, lastMessage: message.text_content, updatedAt: message.created_at } : c));
    } else if (isCurrentlySelected) {
      void openConversation(selectedRef.current, null, true, true);
    }
  };

  if (!allowed) return <div className="p-6 text-slate-700">Доступ к перепискам Instagram ограничен.</div>;
  return <section className="p-6 space-y-5">
    <div className="flex flex-wrap justify-between gap-3 items-center">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Instagram Direct</h1>
        <p className="text-sm text-slate-500" data-testid="ig-sync-status">
          {syncStatus === 'offline' ? 'Нет сети · Ожидание подключения' : syncStatus === 'reconnecting' ? 'Повторное подключение…' : lastSyncAt ? `Онлайн · Обновлено ${new Date(lastSyncAt).toLocaleTimeString('ru-RU')}` : 'Автообновление включено · Проверка каждые 3 секунды.'}
        </p>
      </div>
      <button type="button" onClick={() => { void refresh(); if (selected) void openConversation(selected, null, true); }} disabled={loading || historyLoading} className="rounded-lg bg-blue-600 px-4 py-2 text-white disabled:opacity-50">{loading ? 'Загрузка…' : 'Обновить'}</button>
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
        <InstagramReplyComposer key={selected ? selected.instagramAccountId + ':' + selected.contactId : 'none'} conversation={selected} onSent={sent} draftStore={drafts} />
      </div>
    </div>
  </section>;
}

export function InstagramInboxPage() {
  const {user}=useAuth();
  const allowed=['ADMIN','DIRECTOR','SALES_MANAGER'].includes(user?.role);
  const canManageAccounts=['ADMIN','DIRECTOR'].includes(user?.role);
  const [connection,setConnection]=useState(null);
  const [accountId,setAccountId]=useState('');
  const [loaded,setLoaded]=useState(false);
  const [connecting,setConnecting]=useState(false);
  const [error,setError]=useState('');
  const [confirmDisconnect,setConfirmDisconnect]=useState(null);
  const [disconnecting,setDisconnecting]=useState(false);
  const drafts=useRef(new Map());
  const load=useCallback(async()=>{
    try {
      const endpoint=canManageAccounts?'/integrations/instagram/connection':'/integrations/instagram/inbox/accounts';
      const result=await api.get(endpoint);
      const data=result?.data || {};
      setConnection(data);
      if(Array.isArray(data.accounts))setAccountId(previous=>data.accounts.some(a=>a.accountId===previous)?previous:(data.accounts.find(a=>a.connected)||data.accounts[0])?.accountId || '');
      setError('');
    }catch(err){setError(err.message || 'Не удалось получить список аккаунтов Instagram.');}
    finally{setLoaded(true);}
  },[canManageAccounts]);
  useEffect(()=>{
    drafts.current.clear();
    setConnection(null);
    setAccountId('');
    setLoaded(false);
    if(!allowed)return;
    void load();
    window.addEventListener('focus',load);
    return()=>window.removeEventListener('focus',load);
  },[allowed,load,user?.id,user?.role]);
  const connect=async()=>{
    if(!canManageAccounts)return;
    setConnecting(true);setError('');
    try{
      const result=await api.post('/integrations/instagram/connect');
      const url=result?.data?.authorizationUrl;
      if(!url||!/^https:\/\/www\.facebook\.com\//.test(url))throw new Error();
      window.location.assign(url);
    }catch{setConnecting(false);setError('Не удалось начать подключение Instagram. Проверьте настройки Meta.');}
  };
  const disconnect=async()=>{
    if(!canManageAccounts)return;
    const target=confirmDisconnect;if(!target||disconnecting)return;
    setDisconnecting(true);setError('');
    try{
      await api.post(`/integrations/instagram/accounts/${encodeURIComponent(target)}/disconnect`);
      for(const key of drafts.current.keys())if(key.startsWith(target+':'))drafts.current.delete(key);
      setConfirmDisconnect(null);await load();
    }catch(err){setError(err.message || 'Не удалось отключить аккаунт.');}
    finally{setDisconnecting(false);}
  };
  if(!allowed)return <div className="p-6 text-slate-700">Доступ к перепискам Instagram ограничен.</div>;
  const accounts=Array.isArray(connection?.accounts)?connection.accounts:null;
  const selected=accounts?.find(a=>a.accountId===accountId);
  const managerHasNoAccounts=!canManageAccounts && loaded && Array.isArray(accounts) && accounts.length===0;
  return <div className="space-y-3">
    <div className="mx-6 mt-6 rounded-xl border border-slate-200 bg-white p-4 space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          {accounts?.length ? <><label htmlFor="instagram-account" className="block text-sm font-medium mb-1">Аккаунт Instagram</label>
            <select id="instagram-account" value={accountId} onChange={event=>{setAccountId(event.target.value);setConfirmDisconnect(null);}} className="rounded-lg border border-slate-300 p-2">
              {accounts.map(a=><option key={a.accountId} value={a.accountId}>{a.username?'@'+a.username:a.accountId}{a.needsReconnect?' — требуется переподключение':''}</option>)}
            </select></> : <div className="font-medium">Аккаунты Instagram</div>}
          {canManageAccounts ? (
            <p className="text-sm text-slate-500">{selected ? selected.connected?'Instagram подключён':'Необходимо переподключение' : connection?.connected?'Instagram подключён':'Подключите профессиональный аккаунт через Meta'}</p>
          ) : (
            <p className="text-sm text-slate-500">{managerHasNoAccounts ? 'Нет доступных диалогов Instagram для вашего профиля.' : 'Доступны только закреплённые за вами диалоги.'}</p>
          )}
        </div>
        {canManageAccounts && <div className="flex flex-wrap gap-2">
          <button type="button" onClick={connect} disabled={connecting} className="rounded-lg border border-blue-600 px-4 py-2 text-blue-700 disabled:opacity-50">{connecting?'Подключение…':'Добавить аккаунт Instagram'}</button>
          {selected && <><button type="button" onClick={connect} disabled={connecting} className="px-3 py-2 text-blue-700">Переподключить</button>
            <button type="button" onClick={()=>setConfirmDisconnect(accountId)} disabled={disconnecting} className="px-3 py-2 text-red-700">Отключить аккаунт</button></>}
        </div>}
      </div>
      {canManageAccounts && confirmDisconnect && <div className="rounded-lg bg-slate-50 p-3 text-sm">
        <p>Отключить выбранный аккаунт от CRM? Сохранённые переписки и лиды останутся в базе.</p>
        <button type="button" onClick={disconnect} disabled={disconnecting} className="mr-4 py-2 text-red-700">Подтвердить отключение</button>
        <button type="button" onClick={()=>setConfirmDisconnect(null)} disabled={disconnecting}>Отмена</button>
      </div>}
      {error && <p role="alert" className="text-red-700">{error}</p>}
    </div>
    {!loaded ? <p role="status" className="p-6">Загрузка аккаунтов…</p> : managerHasNoAccounts ? (
      <section className="p-6"><div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600">Нет доступных диалогов Instagram.</div></section>
    ) : (accounts===null || selected) && !error &&
      <InstagramAccountInbox key={accountId || 'legacy'} accountId={accountId || undefined} drafts={drafts.current}/>}
  </div>;
}
