import React, { useState } from 'react';

const instagramInbox = 'https://www.instagram.com/direct/inbox/';
const names = { image: 'Фото / GIF', video: 'Видео', audio: 'Голосовое / аудио', sticker: 'Стикер', file: 'Файл' };
const reactionNames = { like: '👍', love: '❤️', haha: '😆', wow: '😮', sad: '😢', angry: '😠' };
const mediaHost = host => host === 'lookaside.facebook.com' || ['fbcdn.net', 'cdninstagram.com', 'fbsbx.com'].some(d => host === d || host.endsWith('.' + d));
function safeUrl(value, media = false) {
  try {
    const u = new URL(value);
    return u.protocol === 'https:' && !u.username && !u.password &&
      ![...u.searchParams.keys()].some(k => /^(access_token|client_secret|appsecret_proof)$/i.test(k)) &&
      (!media || mediaHost(u.hostname)) ? u.href : null;
  } catch { return null; }
}
function InstagramLink() {
  return <a className="text-blue-700 underline" href={instagramInbox} target="_blank" rel="noopener noreferrer">Открыть Instagram</a>;
}
function Media({ attachment }) {
  const [failed, setFailed] = useState(false);
  const url = safeUrl(attachment.url, true);
  const label = names[attachment.type] || 'Вложение';
  const preview = safeUrl(attachment.previewUrl, true);
  if (!url || failed) return <div className="rounded-lg border border-slate-200 p-3 text-slate-600">
    <div>{label}: файл недоступен или срок ссылки истёк.</div>
    <div className="mt-1 text-xs">Нажмите «Обновить» или <InstagramLink />.</div>
  </div>;
  if (attachment.type === 'image' || attachment.type === 'sticker') return <a href={url} target="_blank" rel="noopener noreferrer" aria-label={'Открыть: ' + label}>
    <img src={url} alt={label} loading="lazy" referrerPolicy="no-referrer" onError={() => setFailed(true)} className="max-h-96 max-w-full rounded-lg object-contain" />
  </a>;
  if (attachment.type === 'video') return <video src={url} poster={preview || undefined} controls preload="none" playsInline onError={() => setFailed(true)} aria-label={label} className="max-h-96 max-w-full rounded-lg" />;
  if (attachment.type === 'audio') return <div><div className="mb-1 text-xs text-slate-600">{label}</div><audio src={url} controls preload="none" onError={() => setFailed(true)} aria-label={label} className="max-w-full" /></div>;
  return <a href={url} target="_blank" rel="noopener noreferrer" className="block text-blue-700 underline">{attachment.title || 'Открыть файл'}</a>;
}

export function InstagramMessageContent({ message }) {
  const attachments = Array.isArray(message.attachments) ? message.attachments : [];
  const shares = Array.isArray(message.shares) ? message.shares : [];
  const reactions = Array.isArray(message.reactions) ? message.reactions : [];
  const empty = !message.text_content && !attachments.length && !shares.length && !reactions.length;
  return <div className="space-y-2">
    {message.text_content && <div className="whitespace-pre-wrap break-words">{message.text_content}</div>}
    {attachments.map((a, i) => <Media key={i + ':' + (a.url || a.type)} attachment={a} />)}
    {shares.map((s, i) => {
      const url = safeUrl(s.url);
      const preview = safeUrl(s.previewUrl, true);
      const label = s.type === 'story' ? 'История Instagram' : 'Публикация или ссылка';
      return <div key={i} className="rounded-lg border border-slate-200 p-3">
        {preview && <img src={preview} alt={label} referrerPolicy="no-referrer" loading="lazy" className="mb-2 max-h-56 max-w-full rounded object-contain" />}
        <div className="font-medium">{label}</div>
        {s.title && <div className="whitespace-pre-wrap break-words">{s.title}</div>}
        {url ? <a href={url} target="_blank" rel="noopener noreferrer" className="text-blue-700 underline">Открыть материал</a> : <><div className="text-xs text-slate-500">Meta не передала ссылку. История или публикация могла стать недоступной.</div><InstagramLink /></>}
      </div>;
    })}
    {!!reactions.length && <div aria-label="Реакции" className="flex flex-wrap gap-1">{reactions.map((r, i) => <span key={i} className="rounded-full border border-slate-200 bg-white px-2 py-1">{reactionNames[r.emoji?.toLowerCase()] || r.emoji}{r.count > 1 ? ' × ' + r.count : ''}</span>)}</div>}
    {empty && <div className="text-slate-600">
      <div>{message.unsupported ? 'Этот тип сообщения не поддерживается API Instagram.' : 'Meta не передала содержимое этого сообщения.'}</div>
      <div className="mt-1 text-xs">Оно может быть удалено или недоступно через API. <InstagramLink /></div>
    </div>}
  </div>;
}
