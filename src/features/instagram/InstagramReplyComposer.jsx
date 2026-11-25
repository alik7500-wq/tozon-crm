import React, { useState } from 'react';
import { api } from '../../api/client';
import { useAuth } from '../auth/AuthContext';

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
  const readInitialDraft = () => {
    if (draftStore?.get(baseKey)) return draftStore.get(baseKey);
    try { return storageKey && typeof sessionStorage !== 'undefined' ? (sessionStorage.getItem(storageKey) || '') : ''; } catch { return ''; }
  };
  const [text, setText] = useState(readInitialDraft);
  const [sending, setSending] = useState(false);
  const [deliveryState, setDeliveryState] = useState('idle'); // idle | sending | confirmed | unknown | error
  const [error, setError] = useState('');
  const [idempotencyKey, setIdempotencyKey] = useState(() => `ig_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`);

  const updateDraft = (val) => {
    setText(val);
    setDeliveryState('idle');
    draftStore?.set(baseKey, val);
    try {
      if (storageKey && typeof sessionStorage !== 'undefined') {
        if (val) sessionStorage.setItem(storageKey, val);
        else sessionStorage.removeItem(storageKey);
      }
    } catch { /* ignore */ }
  };

  const submit = async (event) => {
    event.preventDefault();
    if (!conversation || !text.trim() || sending) return;
    setSending(true);
    setDeliveryState('sending');
    setError('');
    try {
      const account = encodeURIComponent(conversation.instagramAccountId);
      const contact = encodeURIComponent(conversation.contactId);
      const result = await api.post(
        `/integrations/instagram/send/${account}/${contact}`,
        { text: text.trim() },
        { timeout: 25000 }
      );
      if (result?.deliveryStatus === 'unknown' || result?.data?.acceptedButUnsaved) {
        setDeliveryState('unknown');
        setError('Instagram принял сообщение, но CRM не сохранила его. Выполните сверку перед повтором.');
        setSending(false);
        return;
      }
      setDeliveryState('confirmed');
      updateDraft('');
      draftStore?.delete(baseKey);
      setIdempotencyKey(`ig_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`);
      onSent?.(result?.data);
    } catch (err) {
      setDeliveryState(err?.response?.data?.code === 'SENT_NOT_SAVED' ? 'unknown' : 'error');
      setError(err?.response?.data?.code === 'SENT_NOT_SAVED'
        ? 'Instagram принял сообщение, но CRM не сохранила его. Проверьте диалог перед повтором.'
        : err?.code === 'INSTAGRAM_REPLY_WINDOW_CLOSED'
          ? 'Окно ответа закрыто. Дождитесь нового сообщения клиента.'
          : ['INSTAGRAM_PERMISSION_REQUIRED', 'INSTAGRAM_RECONNECT_REQUIRED', 'INSTAGRAM_ACCOUNT_MISMATCH', 'INSTAGRAM_RATE_LIMIT', 'INSTAGRAM_THREAD_OWNER_REQUIRED'].includes(err?.code)
            ? err.message
          : 'Отправка не подтверждена. Проверьте Instagram перед повторной попыткой.');
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
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    <div className="flex justify-between items-center">
      <span className="text-xs text-slate-500">{text.length}/1000</span>
      <button type="submit" disabled={sending || !text.trim() || deliveryState === 'unknown'}
        className="rounded-lg bg-blue-600 px-4 py-2 text-white disabled:opacity-50">
        {sending ? 'Отправка…' : 'Отправить'}
      </button>
    </div>
  </form>;
}
