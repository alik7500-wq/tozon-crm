import React, { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { formatMeasure } from '../../utils/numberDisplay';
import './ApartmentLayoutAppendix.css';

const safeImage = value => typeof value === 'string' && (/^https?:\/\//i.test(value) || /^\/(?!\/)/.test(value)) ? value : null;
const shortNumber = value => /^\d+-\d{4}-\d+$/.test(String(value)) ? String(value).split('-').at(-1) : value || '____';
const dateLabel = value => {
  const day = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  return day ? `${day[3]}.${day[2]}.${day[1]}` : '__________';
};

export function ApartmentLayoutAppendix({ deal, language, onReady }) {
  const isTJ = language === 'TJ';
  const unitId = deal.unit_id || deal.units?.id || deal.unit?.id;
  const [state, setState] = useState({ loading: true });
  const [attempt, setAttempt] = useState(0);
  const [images, setImages] = useState({});
  useEffect(() => {
    let alive = true;
    setState({ loading: true });
    setImages({});
    onReady(false);
    if (!unitId) {
      setState({ error: true });
      return () => { alive = false; };
    }
    api.get(`/inventory/units/${unitId}/presentation`).then(res => {
      const data = res?.data?.data;
      if (!data?.unit || String(data.unit.id) !== String(unitId)) throw new Error('Wrong unit presentation');
      if (alive) setState({ data });
    }).catch(() => { if (alive) setState({ error: true }); });
    return () => { alive = false; };
  }, [unitId, attempt, onReady]);

  const plan2d = safeImage(state.data?.layout?.technical_plan_path);
  const plan3d = safeImage(state.data?.layout?.furnished_plan_path || state.data?.layout?.image_path);
  const ready = Boolean(!state.loading && !state.error && plan2d && plan3d && images['2D'] === plan2d && images['3D'] === plan3d);
  useEffect(() => { onReady(ready); }, [ready, onReady]);

  if (state.loading || state.error) return <div className="p-8 text-slate-700" role="status">
    {state.loading ? (isTJ ? 'Нақшаи хона бор карда мешавад…' : 'Загрузка планировки квартиры…')
      : (isTJ ? 'Нақшаи хонаро бор кардан нашуд. Чоп дастнорас аст.' : 'Не удалось загрузить планировку квартиры. Печать недоступна.')}
    {state.error && <button className="block mt-4 text-blue-600 underline" onClick={() => setAttempt(n => n + 1)}>{isTJ ? 'Такрор кардан' : 'Повторить загрузку'}</button>}
  </div>;

  const unit = state.data.unit;
  const building = unit.floors?.sections?.buildings;
  const area = deal.area_m2_x100 != null ? Number(deal.area_m2_x100) / 100
    : deal.unit_area != null ? Number(deal.unit_area) : Number(unit.area_m2_x100) / 100;
  const buyer = deal.lead_name || deal.buyer_name || '____________________________';
  const facts = [
    [isTJ ? 'Маҷмааи истиқоматӣ' : 'Жилой комплекс', deal.project_name || building?.projects?.name || '—'],
    [isTJ ? 'Блок / Хона' : 'Блок / Квартира', `${deal.building_name || building?.name || '—'} / № ${deal.unit_number || unit.unit_number || '—'}`],
    [isTJ ? 'Даромадгоҳ / Ошёна' : 'Подъезд / Этаж', `${deal.section_name || unit.floors?.sections?.name || '—'} / ${deal.floor_number ?? unit.floors?.floor_number ?? '—'}`],
    [isTJ ? 'Масоҳати умумӣ' : 'Общая площадь', `${Number.isFinite(area) && area > 0 ? formatMeasure(area) : '—'} м²`],
    [isTJ ? 'Ҳуҷраҳо' : 'Комнаты', deal.unit_rooms ?? unit.rooms ?? '—'],
    [isTJ ? 'Баландии шифт' : 'Высота потолков', state.data.layout?.ceiling_height ? `${formatMeasure(state.data.layout.ceiling_height)} м` : '—'],
  ];
  return <div className="layout-appendix-preview">
    <style>{'@page apartmentLayout { size: A4 landscape; margin: 10mm; }'}</style>
    {!ready && <div className="layout-appendix-warning print:hidden" role="status">{isTJ ? 'Чоп пас аз бор шудани ҳар ду тасвир дастрас мешавад. Агар тасвир набошад, ба корти хона илова кунед.' : 'Печать станет доступна после загрузки обеих планировок. Отсутствующие изображения добавьте в карточке квартиры.'}<button className="ml-3 underline" onClick={() => setAttempt(n => n + 1)}>{isTJ ? 'Такрор кардан' : 'Повторить загрузку'}</button></div>}
    <div id="print-section">
      <article className="layout-appendix-sheet" aria-label={isTJ ? 'Замима: нақшаи хона' : 'Приложение: планировка квартиры'}>
        <div className="layout-appendix-heading">
          <div><h1>{deal.project_name || building?.projects?.name || 'ПЛАНИРОВКА КВАРТИРЫ'}</h1><p>{isTJ ? 'НАҚШАИ ХОНАИ ИНТИХОБШУДА' : 'ПЛАНИРОВКА ВЫБРАННОЙ КВАРТИРЫ'}</p></div>
          <div><strong>{isTJ ? 'Замимаи № 2' : 'Приложение № 2'}</strong><p>{isTJ ? 'ба шартномаи' : 'к договору'} № {shortNumber(deal.contract_number)} {isTJ ? 'аз' : 'от'} {dateLabel(deal.deal_date || deal.created_at)}</p></div>
        </div>
        <dl className="layout-appendix-facts">{facts.map(([label,value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
        <p className="layout-appendix-buyer"><b>{isTJ ? 'Харидор:' : 'Покупатель:'}</b> {buyer}</p>
        <div className="layout-appendix-plans">
          {[
            ['2D', plan2d, isTJ ? 'НАҚШАИ ТЕХНИКӢ' : 'ТЕХНИЧЕСКАЯ ПЛАНИРОВКА'],
            ['3D', plan3d, isTJ ? 'ТАСВИРИ ҲАҶМӢ' : 'ВИЗУАЛИЗАЦИЯ'],
          ].map(([kind,url,title]) => <figure key={kind}>
            <figcaption>{kind} / {title}</figcaption>
            <div className="layout-appendix-image">
              {url && images[kind] !== 'error' ? <img key={`${unitId}-${url}-${attempt}`} src={url} alt={`${kind} ${isTJ ? 'нақшаи хона' : 'планировка квартиры'} № ${deal.unit_number || unit.unit_number || ''}`}
                onLoad={() => setImages(prev => ({...prev,[kind]:url}))} onError={() => setImages(prev => ({...prev,[kind]:'error'}))} />
                : <span>{isTJ ? 'Тасвир дастрас нест' : 'Изображение недоступно'}</span>}
            </div>
          </figure>)}
        </div>
        <p className="layout-appendix-note">{isTJ ? '3D: мебел, таҷҳизот ва ороиш шартӣ нишон дода шудаанд. Таҷҳизот ва шартҳои супоридан тибқи шартнома муайян мешаванд.' : '3D: мебель, техника и отделка показаны условно. Комплектация и условия передачи определяются договором.'}</p>
        <div className="layout-appendix-signatures">
          <div><b>{isTJ ? 'Намояндаи ширкати сохтмонӣ' : 'Представитель застройщика'}</b><p>{isTJ ? 'Абдуллоев Акмалхон Раҳматуллоевич' : 'Абдуллоев Акмалхон Рахматуллоевич'}</p><div className="layout-appendix-signature-line" /><small>{isTJ ? 'Имзо / Ному насаб' : 'Подпись / ФИО'}</small></div>
          <div><b>{isTJ ? 'Харидор' : 'Покупатель'}</b><p>{buyer}</p><div className="layout-appendix-signature-line" /><small>{isTJ ? 'Имзо / Ному насаб' : 'Подпись / ФИО'}</small></div>
        </div>
      </article>
    </div>
  </div>;
}
