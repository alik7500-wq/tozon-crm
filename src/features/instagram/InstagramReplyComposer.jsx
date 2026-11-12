import React, { useState } from 'react';
import { api } from '../../api/client';

// Reply composer is opt-in; server validates the account, permissions and reply window.
export function InstagramReplyComposer({ conversation, onSent }) {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const submit = async (event) => {
    event.preventDefault();
    if (!conversation || !text.trim() || sending) return;
    setSending(true);
    setError('');
    try {
      const account = encodeURIComponent(conversation.instagramAccountId);
      const contact = encodeURIComponent(conversation.contactId);
      const result = await api.post(`/integrations/instagram/send/${account}/${contact}`, { text: text.trim() }, { timeout: 25000 });
      setText('');
      onSent?.(result?.data);
    } catch (err) {
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
  return <form onSubmit={submit} className="border-t p-4 space-y-2">
    <label htmlFor="instagram-reply" className="block text-sm font-medium">Ответ клиенту</label>
    <textarea id="instagram-reply" rows={3} maxLength={1000} value={text}
      onChange={e => setText(e.target.value)} disabled={sending}
      placeholder="Напишите ответ…" className="w-full rounded-lg border border-slate-300 p-3" />
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    <div className="flex justify-between items-center">
      <span className="text-xs text-slate-500">{text.length}/1000</span>
      <button type="submit" disabled={sending || !text.trim()}
        className="rounded-lg bg-blue-600 px-4 py-2 text-white disabled:opacity-50">
        {sending ? 'Отправка…' : 'Отправить'}
      </button>
    </div>
  </form>;
}
