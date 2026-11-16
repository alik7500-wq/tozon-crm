import React, { useEffect, useRef, useState } from 'react';
import { buyerBlob, buyerRequest } from './buyer-api';

const words = {
  tj: {
    title: 'Рафти сохтмон',
    project: 'Маҷмааи истиқоматӣ',
    stage: 'Марҳилаи охирин',
    updated: 'Санаи навсозии охирин',
    empty: 'Маълумот дар бораи рафти сохтмон ҳоло илова нашудааст.',
    load: 'Боргирӣ…',
    open: 'Дидани акс',
    close: 'Пӯшидан',
    error: 'Маълумоти сохтмон дастрас нест. Баъдтар такрор кунед.'
  },
  ru: {
    title: 'Ход строительства',
    project: 'Жилой комплекс',
    stage: 'Текущий этап',
    updated: 'Дата последнего обновления',
    empty: 'Информация о ходе строительства пока не добавлена.',
    load: 'Загрузка…',
    open: 'Показать фото',
    close: 'Закрыть',
    error: 'Данные о ходе строительства недоступны. Повторите позже.'
  }
};

const formatDate = (value, lang) => {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return new Intl.DateTimeFormat(lang === 'ru' ? 'ru-RU' : 'ru-RU').format(d);
};

export default function BuyerConstruction({ dealId, initData, language }) {
  const lang = language === 'ru' ? 'ru' : 'tj';
  const t = words[lang];
  const [data, setData] = useState(null);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [photos, setPhotos] = useState({});
  const urls = useRef(new Set());
  const controller = useRef(null);

  useEffect(() => {
    const abort = new AbortController();
    controller.current = abort;
    setData(null);
    setError(false);
    setPhotos({});
    buyerRequest('/construction', initData, { method: 'POST', body: { dealId }, signal: abort.signal })
      .then((res) => { if (!abort.signal.aborted) setData(res); })
      .catch(() => { if (!abort.signal.aborted) setError(true); });
    const allocated = urls.current;
    return () => {
      abort.abort();
      allocated.forEach(URL.revokeObjectURL);
      allocated.clear();
    };
  }, [dealId, initData]);

  async function openPhoto(id) {
    if (busy || photos[id]) return;
    setBusy(true);
    setError(false);
    try {
      const blob = await buyerBlob(initData, { dealId, type: 'CONSTRUCTION', id }, { signal: controller.current?.signal });
      if (controller.current?.signal.aborted) return;
      const url = URL.createObjectURL(blob);
      urls.current.add(url);
      setPhotos((prev) => ({ ...prev, [id]: url }));
    } catch {
      if (!controller.current?.signal.aborted) setError(true);
    } finally {
      if (!controller.current?.signal.aborted) setBusy(false);
    }
  }

  return (
    <section className="space-y-4">
      <h3 className="font-bold">{t.title}</h3>
      {error ? <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{t.error}</p> : null}
      {!data && !error ? <p role="status">{t.load}</p> : null}
      {data ? (
        <>
          <div className="rounded-xl bg-slate-50 p-3 text-sm space-y-1">
            {data.projectName ? <p><span className="text-slate-500">{t.project}:</span> <strong>{data.projectName}</strong></p> : null}
            {data.latestTitle ? <p><span className="text-slate-500">{t.stage}:</span> <strong>{data.latestTitle}</strong></p> : null}
            {data.lastUpdatedAt ? <p><span className="text-slate-500">{t.updated}:</span> {formatDate(data.lastUpdatedAt, lang)}</p> : null}
            {data.latestDescription ? <p className="pt-1 text-slate-700 whitespace-pre-wrap">{data.latestDescription}</p> : null}
          </div>
          {data.items?.length ? (
            <div className="space-y-3">
              {data.items.map((item) => (
                <article key={item.id} className="rounded-xl border border-slate-200 p-3 text-sm space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <strong>{item.title}</strong>
                    <span className="text-xs text-slate-500">{formatDate(item.updatedAt || item.createdAt, lang)}</span>
                  </div>
                  {item.description ? <p className="text-slate-600 whitespace-pre-wrap">{item.description}</p> : null}
                  {photos[item.id] ? (
                    <div className="space-y-2">
                      <img src={photos[item.id]} alt={item.title} className="h-auto w-full rounded-xl" />
                    </div>
                  ) : (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => openPhoto(item.id)}
                      className="text-blue-700 underline disabled:opacity-50"
                    >
                      {t.open}
                    </button>
                  )}
                </article>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500">{t.empty}</p>
          )}
        </>
      ) : null}
    </section>
  );
}
