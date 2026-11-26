import React, { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { useAuth } from '../auth/AuthContext';

const makeKey = () => `ig_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

function readStoredComposerState(draftStore, baseKey, storageKey) {
  const mem = draftStore?.get(baseKey);
  if (mem && typeof mem === 'object') return mem;
  if (typeof mem === 'string') return { text: mem };
  try {
    if (storageKey && typeof sessionStorage !== 'undefined') {
      const raw = sessionStorage.getItem(storageKey);
      if (!raw) return {};
      if (raw.startsWith('{')) return JSON.parse(raw);
      return { text: raw };
    }
  } catch { /* ignore */ }
  return {};
}

function writeStoredComposerState(draftStore, baseKey, storageKey, state) {
  const hasContent = Boolean(state.text || state.deliveryState === 'unknown');
  if (hasContent) {
    draftStore?.set(baseKey, state);
  } else {
    draftStore?.delete(baseKey);
  }
  try {
    if (storageKey && typeof sessionStorage !== 'undefined') {
      if (hasContent) sessionStorage.setItem(storageKey, JSON.stringify(state));
      else sessionStorage.removeItem(storageKey);
    }
  } catch { /* ignore */ }
}

function mapSendErrorMessage(err) {
  const code = err?.response?.data?.code || err?.code;
  if (code === 'SENT_NOT_SAVED') {
    return 'Instagram принял сообщение, но CRM не сохранила его. Выполните сверку перед повтором.';
  }
  if (code === 'INSTAGRAM_REPLY_WINDOW_CLOSED') {
    return 'Окно ответа закрыто. Дождитесь нового сообщения клиента.';
  }
  if (code === 'IDEMPOTENCY_CONFLICT') {
    return 'Ключ отправки уже использован для другого сообщения. Начните новое сообщение.';
  }
  if (code === 'SEND_IN_PROGRESS') {
    return 'Эта отправка уже выполняется на сервере. Подождите завершения или выполните сверку.';
  }
  if (code === 'INSTAGRAM_ACCESS_DENIED' || err?.response?.status === 403) {
    return 'Недостаточно прав для отправки в этот диалог.';
  }
  if (code === 'INSTAGRAM_RATE_LIMIT') {
    return 'Превышен лимит запросов Instagram. Повторите позже.';
  }
  if (['INSTAGRAM_PERMISSION_REQUIRED', 'INSTAGRAM_RECONNECT_REQUIRED', 'INSTAGRAM_ACCOUNT_MISMATCH', 'INSTAGRAM_THREAD_OWNER_REQUIRED'].includes(code)) {
    return err.message || 'Требуется проверка подключения Instagram.';
  }
  return 'Отправка не подтверждена. Проверьте Instagram перед повторной попыткой.';
}

// Reply composer is opt-in; server validates the account, permissions and reply window.
export function InstagramReplyComposer({ conversation, onSent, draftStore }) {
  let user = null;
  try {
    user = useAuth()?.user || null;
  } catch {
    user = null;
  }
  const baseKey = conversation ? `${conversation.instagramAccountId}:${conversation.contactId}` : '';
  const storageKey = baseKey ? `tozon:draft:ig:${user?.id || 'anon'}:${baseKey}` : '';

  const [initial] = useState(() => readStoredComposerState(draftStore, baseKey, storageKey));
  const [text, setText] = useState(initial.text || '');
  const [sending, setSending] = useState(false);
  const [reconciling, setReconciling] = useState(false);
  const [deliveryState, setDeliveryState] = useState(initial.deliveryState === 'unknown' ? 'unknown' : 'idle'); // idle | sending | confirmed | unknown | error
  const [statusNotice, setStatusNotice] = useState('');
  const [error, setError] = useState(initial.error || '');
  const [idempotencyKey, setIdempotencyKey] = useState(() => initial.idempotencyKey || makeKey());

  useEffect(() => {
    if (!baseKey) return;
    const loaded = readStoredComposerState(draftStore, baseKey, storageKey);
    setText(loaded.text || '');
    setDeliveryState(loaded.deliveryState === 'unknown' ? 'unknown' : 'idle');
    setError(loaded.error || '');
    setIdempotencyKey(loaded.idempotencyKey || makeKey());
    setStatusNotice('');
  }, [baseKey, storageKey]);

  const persist = (nextPatch) => {
    const nextState = {
      text: nextPatch.text !== undefined ? nextPatch.text : text,
      idempotencyKey: nextPatch.idempotencyKey !== undefined ? nextPatch.idempotencyKey : idempotencyKey,
      deliveryState: nextPatch.deliveryState !== undefined ? nextPatch.deliveryState : deliveryState,
      error: nextPatch.error !== undefined ? nextPatch.error : error
    };
    writeStoredComposerState(draftStore, baseKey, storageKey, nextState);
  };

  const updateDraft = (val) => {
    setText(val);
    // Editing text NEVER clears unknown state of the previous operation
    const nextDelivery = deliveryState === 'unknown' ? 'unknown' : 'idle';
    if (deliveryState !== 'unknown') {
      setDeliveryState('idle');
      setStatusNotice('');
    }
    persist({ text: val, deliveryState: nextDelivery });
  };

  const resetUnknownOperation = () => {
    const freshKey = makeKey();
    setDeliveryState('idle');
    setError('');
    setStatusNotice('');
    setIdempotencyKey(freshKey);
    persist({ deliveryState: 'idle', error: '', idempotencyKey: freshKey });
  };

  const reconcile = async () => {
    if (!conversation || reconciling || sending) return;
    setReconciling(true);
    setError('');
    try {
      const account = encodeURIComponent(conversation.instagramAccountId);
      const contact = encodeURIComponent(conversation.contactId);
      const result = await api.post(
        `/integrations/instagram/send/${account}/${contact}/reconcile`,
        { idempotency_key: idempotencyKey },
        { timeout: 25000 }
      );
      if (result?.deliveryStatus === 'confirmed' && result?.data?.saved !== false) {
        const freshKey = makeKey();
        setDeliveryState('confirmed');
        setStatusNotice('Принято поставщиком');
        setText('');
        setIdempotencyKey(freshKey);
        writeStoredComposerState(draftStore, baseKey, storageKey, { text: '', deliveryState: 'idle', error: '', idempotencyKey: freshKey });
        onSent?.(result?.data);
      } else {
        const msg = result?.data?.nextAction || 'Результат доставки всё ещё неизвестен. Проверьте переписку в Instagram.';
        setDeliveryState('unknown');
        setError(msg);
        persist({ deliveryState: 'unknown', error: msg });
      }
    } catch (err) {
      const msg = mapSendErrorMessage(err);
      setError(msg);
      persist({ deliveryState: 'unknown', error: msg });
    } finally {
      setReconciling(false);
    }
  };

  const submit = async (event) => {
    event.preventDefault();
    if (!conversation || !text.trim() || sending || deliveryState === 'unknown') return;
    setSending(true);
    setDeliveryState('sending');
    setStatusNotice('');
    setError('');
    try {
      const account = encodeURIComponent(conversation.instagramAccountId);
      const contact = encodeURIComponent(conversation.contactId);
      const result = await api.post(
        `/integrations/instagram/send/${account}/${contact}`,
        { text: text.trim(), idempotency_key: idempotencyKey },
        { timeout: 25000 }
      );
      if (result?.deliveryStatus === 'unknown' || result?.data?.acceptedButUnsaved) {
        const msg = result?.data?.acceptedButUnsaved
          ? 'Instagram принял сообщение, но CRM не сохранила его. Выполните сверку перед повтором.'
          : (result?.data?.nextAction || 'Результат доставки неизвестен. Выполните сверку перед повтором.');
        setDeliveryState('unknown');
        setError(msg);
        persist({ deliveryState: 'unknown', error: msg });
        setSending(false);
        return;
      }
      const freshKey = makeKey();
      setDeliveryState('confirmed');
      setStatusNotice('Принято поставщиком');
      setText('');
      setIdempotencyKey(freshKey);
      writeStoredComposerState(draftStore, baseKey, storageKey, { text: '', deliveryState: 'idle', error: '', idempotencyKey: freshKey });
      onSent?.(result?.data);
    } catch (err) {
      const isAmbiguous = !err?.response && !err?.code;
      const code = err?.response?.data?.code || err?.code;
      const nextState = (code === 'SENT_NOT_SAVED' || isAmbiguous) ? 'unknown' : 'error';
      const msg = mapSendErrorMessage(err);
      setDeliveryState(nextState);
      setError(msg);
      persist({ deliveryState: nextState, error: msg });
      setSending(false);
      return;
    }
    setSending(false);
  };

  if (!conversation) return null;
  return <form onSubmit={submit} className="border-t p-4 space-y-2" data-delivery-state={deliveryState}>
    <label htmlFor="instagram-reply" className="block text-sm font-medium">Ответ клиенту</label>
    <textarea id="instagram-reply" rows={3} maxLength={1000} value={text}
      onChange={e => updateDraft(e.target.value)} disabled={sending}
      placeholder="Напишите ответ…" className="w-full rounded-lg border border-slate-300 p-3" />
    {statusNotice && <p role="status" className="text-xs font-medium text-emerald-700">{statusNotice}</p>}
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    <div className="flex flex-wrap justify-between items-center gap-2">
      <span className="text-xs text-slate-500">{text.length}/1000</span>
      <div className="flex flex-wrap gap-2 items-center">
        {deliveryState === 'unknown' && (
          <>
            <button type="button" onClick={reconcile} disabled={reconciling || sending}
              className="rounded-lg border border-amber-600 px-3 py-2 text-xs font-medium text-amber-800 disabled:opacity-50">
              {reconciling ? 'Сверка…' : 'Сверить доставку'}
            </button>
            <button type="button" onClick={resetUnknownOperation} disabled={reconciling || sending}
              className="rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-700 disabled:opacity-50">
              Начать новое сообщение
            </button>
          </>
        )}
        <button type="submit" disabled={sending || !text.trim() || deliveryState === 'unknown'}
          className="rounded-lg bg-blue-600 px-4 py-2 text-white disabled:opacity-50">
          {sending ? 'Отправка…' : 'Отправить'}
        </button>
      </div>
    </div>
  </form>;
}
