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

export function ApartmentLayoutAppendix({ deal, language, onReady, isCombined = false }) {
  const isTJ = language === 'TJ';
  const unitId = deal.unit_id || deal.units?.id || deal.unit?.id;
  const hasDealPlans = Boolean(deal.technical_plan_path && (deal.furnished_plan_path || deal.layout_image_path));
  const isExplicitlyNoPlans = deal.technical_plan_path === null && deal.furnished_plan_path === null;

  const [state, setState] = useState(() => {
    if (hasDealPlans) {
      return { data: { unit: deal.units || deal, layout: { technical_plan_path: deal.technical_plan_path, furnished_plan_path: deal.furnished_plan_path || deal.layout_image_path } } };
    }
    if (isExplicitlyNoPlans || !unitId) {
      return { error: true };
    }
    return { loading: true };
  });

  const [attempt, setAttempt] = useState(0);
  const [images, setImages] = useState({});

  useEffect(() => {
    let alive = true;
    if (hasDealPlans) {
      setState({ data: { unit: deal.units || deal, layout: { technical_plan_path: deal.technical_plan_path, furnished_plan_path: deal.furnished_plan_path || deal.layout_image_path } } });
      return () => { alive = false; };
    }
    if (isExplicitlyNoPlans || !unitId) {
      setState({ error: true });
      return () => { alive = false; };
    }
    setState({ loading: true });
    setImages({});
    onReady(false);
    api.get(`/inventory/units/${unitId}/presentation`).then(res => {
      // The shared API interceptor already returns response.data.
      const data = res?.data?.data || res?.data || res;
      if (!data?.unit || String(data.unit.id) !== String(unitId)) throw new Error('Wrong unit presentation');
      if (alive) setState({ data });
    }).catch(() => {
      if (alive) {
        if (deal.technical_plan_path && (deal.furnished_plan_path || deal.layout_image_path)) {
          setState({ data: { unit: deal.units || deal, layout: { technical_plan_path: deal.technical_plan_path, furnished_plan_path: deal.furnished_plan_path || deal.layout_image_path } } });
        } else {
          setState({ error: true });
        }
      }
    });
    return () => { alive = false; };
  }, [unitId, attempt, onReady, hasDealPlans, isExplicitlyNoPlans, deal.technical_plan_path, deal.furnished_plan_path, deal.layout_image_path]);

  const plan2d = safeImage(state.data?.layout?.technical_plan_path || deal.technical_plan_path);
  const plan3d = safeImage(state.data?.layout?.furnished_plan_path || state.data?.layout?.image_path || deal.furnished_plan_path || deal.layout_image_path);
  const ready = Boolean(!state.loading && !state.error && plan2d && plan3d && images['2D'] === plan2d && images['3D'] === plan3d);
  useEffect(() => { onReady(ready); }, [ready, onReady]);

  useEffect(() => {
    if (deal.unit_kind === 'PARKING') {
      onReady(true);
    }
  }, [deal.unit_kind, onReady]);

  if (deal.unit_kind === 'PARKING') {
    return (
      <div id={isCombined ? undefined : 'print-section'} className={`layout-appendix-sheet ${isCombined ? 'print-page-break' : ''} p-8 text-slate-800`}>
        <div className="layout-appendix-heading">
          <div>
            <h1>{deal.project_name || 'TOZON PLAZA'}</h1>
            <p>{isTJ ? 'МАЪЛУМОТ ДАР БОРАИ ҶОЙИ ТАВАҚҚУФ' : 'СВЕДЕНИЯ О МАШИНО-МЕСТЕ'}</p>
          </div>
          <div>
            <strong>{isTJ ? 'Замимаи № 2' : 'Приложение № 2'}</strong>
            <p>{isTJ ? 'Замимаи № 2 ба Шартномаи' : 'Приложение № 2 к Договору'} № {shortNumber(deal.contract_number)}</p>
          </div>
        </div>
        <div className="my-8 p-6 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
          <p className="font-semibold text-slate-900">
            {isTJ
              ? 'Нақшаи инфиродӣ барои ҷойи таваққуф пешбинӣ нашудааст.'
              : 'Индивидуальная планировка для машино-места не предусмотрена.'}
          </p>
          <p className="text-sm text-slate-600">
            {isTJ
              ? 'Ҷойгиршавӣ ва ҳудуди ҷойи таваққуф тибқи нақшаи куллии тасдиқшудаи ошёна муайян карда мешавад.'
              : 'Расположение и границы машино-места определяются утверждённым генеральным планом этажа.'}
          </p>
        </div>
      </div>
    );
  }

  if (state.loading || state.error) return <div id={isCombined ? undefined : 'print-section'} className="p-8 text-slate-700" role="status">
    {state.loading ? (isTJ ? 'Нақшаи хона бор карда мешавад…' : 'Загрузка планировки квартиры…')
      : (
        <div className="space-y-2">
          <p className="font-bold text-amber-700">
            {isTJ ? 'Нақшаи тасдиқшуда барои ин хона дар феҳрист мавҷуд нест.' : 'Утверждённый план для данной квартиры отсутствует в каталоге.'}
          </p>
          <p className="text-sm text-slate-600">
            {isTJ
              ? 'Лутфан, ба мудир барои боргирии маводҳои расмии 2D/3D муроҷиат намоед. Чоп дастнорас аст.'
              : 'Пожалуйста, обратитесь к администратору для загрузки официальных 2D/3D материалов. Не удалось загрузить планировку квартиры. Печать недоступна.'}
          </p>
        </div>
      )}
    {state.error && <button className="block mt-4 text-blue-600 underline" onClick={() => setAttempt(n => n + 1)}>{isTJ ? 'Такрор кардан' : 'Повторить загрузку'}</button>}
  </div>;

  const unit = state.data?.unit || {};
  const building = unit.floors?.sections?.buildings;
  const area = deal.area_m2_x100 != null ? Number(deal.area_m2_x100) / 100
    : deal.unit_area != null ? Number(deal.unit_area) : Number(unit.area_m2_x100) / 100;
  const buyer = deal.lead_name || deal.buyer_name || '____________________________';
  const facts = [
    [isTJ ? 'Маҷмааи истиқоматӣ' : 'Жилой комплекс', deal.project_name || building?.projects?.name || '—'],
    [isTJ ? 'Блок / Хона' : 'Блок / Квартира', `${deal.building_name || building?.name || '—'} / № ${deal.unit_number || unit.unit_number || '—'}`],
    [isTJ ? 'Даромадгоҳ / Ошёна' : 'Подъезд / Этаж', `${deal.section_name || unit.floors?.sections?.name || '—'} / ${deal.floor_number ?? unit.floors?.floor_number ?? '—'}`],
    [isTJ ? 'Масоҳати умумӣ' : 'Общая площадь', `${Number.isFinite(area) && area > 0 ? (Math.round(area * 100) / 100).toFixed(2) : '—'} м²`],
    [isTJ ? 'Ҳуҷраҳо' : 'Комнаты', deal.unit_rooms ?? unit.rooms ?? '—'],
    [isTJ ? 'Баландии шифт' : 'Высота потолков', state.data?.layout?.ceiling_height ? `${formatMeasure(state.data.layout.ceiling_height)} м` : '—'],
  ];

  const sheetContent = (
    <article className={`layout-appendix-sheet ${isCombined ? 'print-page-break' : ''}`} aria-label={isTJ ? 'Замима: нақшаи хона' : 'Приложение: планировка квартиры'}>
      <div className="layout-appendix-heading">
        <div>
          <h1>{deal.project_name || building?.projects?.name || 'ПЛАНИРОВКА КВАРТИРЫ'}</h1>
          <p>{isTJ ? 'Нақшаи меъморию техникӣ ва тарҳи 3D-и хона' : 'Архитектурно-технический и 3D-план'}</p>
        </div>
        <div>
          <strong>{isTJ ? 'Замимаи № 2' : 'Приложение № 2'}</strong>
          <p>{isTJ ? 'Замимаи № 2 ба Шартномаи' : 'Приложение № 2 к Договору'} № {shortNumber(deal.contract_number)} {isTJ ? 'аз' : 'от'} {dateLabel(deal.deal_date || deal.created_at)}</p>
        </div>
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
      <p className="layout-appendix-note">{isTJ ? 'Нақшаи мазкур қисми ҷудонашавандаи Шартнома буда, 3D: мебел, таҷҳизот ва ороиш шартӣ нишон дода шудаанд. Таҷҳизот ва шартҳои супоридан тибқи шартнома муайян мешаванд.' : 'Настоящее Приложение является неотъемлемой частью Договора. 3D: мебель, техника и отделка показаны условно. Комплектация и условия передачи определяются договором.'}</p>
      <div className="layout-appendix-signatures">
        <div><b>{isTJ ? 'Намояндаи ширкати сохтмонӣ' : 'Представитель застройщика'}</b><p>{isTJ ? 'Абдуллоев Акмалхон Раҳматуллоевич' : 'Абдуллоев Акмалхон Рахматуллоевич'}</p><div className="layout-appendix-signature-line" /><small>{isTJ ? 'Имзо / Ному насаб' : 'Подпись / ФИО'}</small></div>
        <div><b>{isTJ ? 'Харидор' : 'Покупатель'}</b><p>{buyer}</p><div className="layout-appendix-signature-line" /><small>{isTJ ? 'Имзо / Ному насаб' : 'Подпись / ФИО'}</small></div>
      </div>
    </article>
  );

  return <div className="layout-appendix-preview">
    <style>{'@page apartmentLayout { size: A4 landscape; margin: 10mm; }'}</style>
    {!ready && <div className="layout-appendix-warning print:hidden" role="status">{isTJ ? 'Чоп пас аз бор шудани ҳар ду тасвир дастрас мешавад. Агар тасвир набошад, ба корти хона илова кунед.' : 'Печать станет доступна после загрузки обеих планировок. Отсутствующие изображения добавьте в карточке квартиры.'}<button className="ml-3 underline" onClick={() => setAttempt(n => n + 1)}>{isTJ ? 'Такрор кардан' : 'Повторить загрузку'}</button></div>}
    {isCombined ? sheetContent : <div id="print-section">{sheetContent}</div>}
  </div>;
}
