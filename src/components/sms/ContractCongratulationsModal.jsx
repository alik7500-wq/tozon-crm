import React, { useEffect, useRef, useState } from 'react';
import { api } from '../../api/client';
import { CheckCircle2, Send } from 'lucide-react';

export function ContractCongratulationsModal() {
  const [deal, setDeal] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const generation = useRef(0);
  const sendLock = useRef(false);
  const load = async (signedDeal) => {
    const run = ++generation.current;
    setPreview(null); setError(''); setLoading(true); setSent(false);
    try {
      const res = await api.get('/sms/events', { params: { dealId: signedDeal.id, eventType: 'CONTRACT_CREATED', limit: 20 } });
      const data = res.data || res;
      const event = (data.events || []).find(e => String(e.deal_id) === String(signedDeal.id) && e.event_type === 'CONTRACT_CREATED');
      if (!event) throw new Error('Поздравительное SMS не найдено в очереди. Проверьте настройки сообщений.');
      const result = await api.post(`/sms/events/${event.id}/preview`);
      if (run === generation.current) setPreview(result.data || result);
    } catch (err) { if (run === generation.current) setError(err.message || 'Не удалось загрузить SMS'); }
    finally { if (run === generation.current) setLoading(false); }
  };
  useEffect(() => {
    const open = event => { if (!event.detail?.id) return; setDeal(event.detail); load(event.detail); };
    window.addEventListener('tozon:contract-signed', open);
    return () => { generation.current++; window.removeEventListener('tozon:contract-signed', open); };
  }, []);
  const close = () => { if (sendLock.current) return; generation.current++; setDeal(null); setPreview(null); };
  const send = async () => {
    if (sendLock.current || !preview?.previewHash || preview?.event?.status !== 'AWAITING_CONFIRMATION' || preview.isApplicable === false) return;
    sendLock.current = true; setSending(true); setError('');
    try {
      const result = await api.post(`/sms/events/${preview.event.id}/confirm`, { previewHash: preview.previewHash });
      if (!result.success || result.data?.status !== 'SENT') throw new Error('Отправка не подтверждена. Проверьте статус сообщения в очереди SMS.');
      setSent(true);
    } catch (err) { setError(err.message || 'Ошибка отправки. Проверьте статус в истории SMS перед повторной попыткой.'); }
    finally { sendLock.current = false; setSending(false); }
  };
  if (!deal) return null;
  const canSend = preview?.event?.status === 'AWAITING_CONFIRMATION' && preview?.isApplicable !== false && Boolean(preview?.previewHash && preview?.text);
  return <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 p-4" role="dialog" aria-modal="true" aria-labelledby="contract-sms-title">
    <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl border border-emerald-200">
      <CheckCircle2 className="h-14 w-14 text-emerald-600 mx-auto mb-4" />
      <h2 id="contract-sms-title" className="text-xl font-black text-slate-900 text-center">Договор успешно подписан</h2>
      <p className="text-sm text-slate-500 text-center mt-2">Договор №{deal.contract_number || deal.id}. Прочитайте поздравление перед отправкой клиенту.</p>
      <div className="mt-5 rounded-2xl border border-blue-200 bg-blue-50/50 p-4 space-y-3">
        <h3 className="text-sm font-bold text-blue-800">Поздравительное SMS клиенту</h3>
        {loading ? <p className="text-sm text-slate-500">Загрузка текста…</p> : preview?.text ? <p className="whitespace-pre-wrap rounded-xl border border-blue-100 bg-white p-4 text-sm text-slate-800 leading-relaxed">{preview.text}</p> : null}
        {preview?.phone && <p className="text-xs text-slate-500">Номер: {preview.phone}</p>}
        {error && <p className="text-sm text-rose-700" role="alert">{error}</p>}
        {sent ? <p className="text-sm font-bold text-emerald-700">SMS отправлено</p> : <>
          {preview && !canSend && <p className="text-xs text-amber-700">Отправка недоступна. Статус: {preview.event?.status || 'не определён'}. Проверьте очередь SMS.</p>}
          <button onClick={send} disabled={!canSend || sending || loading} className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-white font-bold disabled:opacity-50 cursor-pointer"><Send className="h-4 w-4" />{sending ? 'Отправка…' : 'Отправить SMS'}</button>
          {error && !preview && <button onClick={() => load(deal)} className="text-sm text-blue-700 cursor-pointer">Повторить загрузку</button>}
        </>}
      </div>
      <button onClick={close} disabled={sending} className="mt-4 w-full rounded-xl border border-slate-200 py-3 text-sm font-bold text-slate-600 disabled:opacity-50 cursor-pointer">{sent ? 'Закрыть' : 'Закрыть без SMS'}</button>
    </div>
  </div>;
}
