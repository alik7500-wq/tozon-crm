import React, { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { Select } from 'antd';
import { useAuth } from '../auth/AuthContext';

const area = n => (Number(n || 0) / 100).toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const money = n => (Number(n || 0) / 100).toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const signingBlockers = {
  CASE_NOT_APPROVED: 'Переселение ещё не утверждено',
  ALLOCATION_NOT_APPROVED: 'Не утверждено распределение стоимости',
  ALLOCATION_LINE_MISSING: 'Для договора не определена утверждённая сумма',
  ALLOCATION_INTEGRITY_FAILED: 'Сумма распределения или состав договоров не совпадают с карточкой',
  DEAL_NOT_FOUND: 'Связанный договор не найден',
  CURRENCY_MISMATCH: 'Валюта договора не USD',
  CONTRACT_AMOUNT_REQUIRES_LEGAL_RECONCILIATION: 'Договорная сумма отличается от утверждённой: необходимо оформить юридическое изменение',
  DEAL_RECONCILIATION_REQUIRED: 'Есть договоры, требующие согласования стоимости'
};
const signingBlockerLabel = code => signingBlockers[code] ?? code;
const draftErrors = {
  DIFFERENT_BUYERS: 'Выбранные договоры относятся к разным карточкам покупателей.',
  ALREADY_LINKED: 'Одна из выбранных квартир уже входит в другое дело переселения.',
  AREA_MISMATCH: 'Площадь одной из квартир изменилась. Откройте форму заново и проверьте расчёт.'
};
const statuses = { DRAFT: 'Черновик', APPROVED: 'Утверждено', CLOSED: 'Закрыто', CANCELLED: 'Отменено' };

export function ResettlementsPage() {
  const { user } = useAuth();
  const canApprove = ['ADMIN', 'DIRECTOR'].includes(user?.role);
  const canView = ['ADMIN', 'DIRECTOR', 'FINANCE_MANAGER'].includes(user?.role);
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');
  const [creating, setCreating] = useState(false);
  const [allocation, setAllocation] = useState({});
  const [allocationPreview, setAllocationPreview] = useState(null);
  const [allocationDocument, setAllocationDocument] = useState('');
  const [allocationApproval, setAllocationApproval] = useState(null);
  const [allocationHistory, setAllocationHistory] = useState([]);
  const [signingReadiness, setSigningReadiness] = useState(null);
  const [signingHistory, setSigningHistory] = useState([]);
  const [signingDocuments, setSigningDocuments] = useState({});
  const [projects, setProjects] = useState([]);
  const [deals, setDeals] = useState([]);
  const [residentId, setResidentId] = useState(null);
  const [loadingDeals, setLoadingDeals] = useState(false);
  const [draft, setDraft] = useState({ project_id: null, original: '', extra: '', mode: 'percent', price: '', dealIds: [] });
  const toHundredths = value => {
    const normalized = String(value).trim().replace(',', '.');
    if (!/^\d{1,6}(?:\.\d{1,2})?$/.test(normalized)) return null;
    const [whole, decimal = ''] = normalized.split('.');
    return Number(whole) * 100 + Number(decimal.padEnd(2, '0'));
  };
  const changeDraft = (field, value) => setDraft(prev => ({ ...prev, [field]: value }));
  const residents = new Map();
  for (const deal of deals) {
    if (!residents.has(deal.lead_id)) residents.set(deal.lead_id, []);
    residents.get(deal.lead_id).push(deal);
  }
  const residentDeals = residents.get(residentId) ?? [];
  const selectedDeals = residentDeals.filter(deal => draft.dealIds.includes(deal.id));
  const original = toHundredths(draft.original);
  const extra = toHundredths(draft.extra);
  const price = toHundredths(draft.price);
  const extraArea = draft.mode === 'percent' && original !== null && extra !== null
    ? Number((BigInt(original) * BigInt(extra) + 5000n) / 10000n)
    : extra;
  const compensated = original === null || extraArea === null ? null : original + extraArea;
  const allocated = selectedDeals.reduce((sum, deal) => sum + Number(deal.area_m2_x100), 0);
  const paid = compensated === null ? null : Math.max(0, allocated - compensated);
  const missing = compensated === null ? null : Math.max(0, compensated - allocated);
  const payable = paid === null || price === null ? null : Number((BigInt(paid) * BigInt(price) + 50n) / 100n);

  useEffect(() => {
    if (!canView) return;
    const controller = new AbortController();
    api.get('/projects', { signal: controller.signal }).then(response => {
      if (!controller.signal.aborted) setProjects(response?.data?.projects ?? []);
    }).catch(() => {
      if (!controller.signal.aborted) setError('Не удалось загрузить жилые комплексы.');
    });
    return () => controller.abort();
  }, [canView]);

  useEffect(() => {
    if (!creating || !draft.project_id) return;
    const controller = new AbortController();
    api.get('/deals', { params: { projectId: draft.project_id }, signal: controller.signal }).then(response => {
      if (controller.signal.aborted) return;
      setDeals((response?.data?.deals ?? []).filter(deal =>
        String(deal.project_id) === String(draft.project_id) && deal.lead_id && deal.unit_id &&
        deal.unit_kind === 'APARTMENT' && ['SIGNED', 'RESERVED', 'DRAFT'].includes(deal.status)
      ));
    }).catch(() => {
      if (!controller.signal.aborted) setError('Не удалось загрузить договоры и квартиры.');
    }).finally(() => {
      if (!controller.signal.aborted) setLoadingDeals(false);
    });
    return () => controller.abort();
  }, [creating, draft.project_id]);

  const chooseProject = project_id => {
    setError('');
    setDeals([]);
    setResidentId(null);
    setLoadingDeals(true);
    setDraft(prev => ({ ...prev, project_id, dealIds: [] }));
  };

  const createDraft = async event => {
    event.preventDefault();
    const projectId = Number(draft.project_id);
    const links = selectedDeals.map(deal => ({ unit_id: Number(deal.unit_id), deal_id: Number(deal.id) }));
    if (!Number.isSafeInteger(projectId) || projectId < 1 || compensated === null || price === null ||
        missing > 0 || links.length < 1 || links.length > 20 ||
        new Set(links.map(link => link.unit_id)).size !== links.length) {
      setError('Проверьте ЖК, выбранные квартиры, компенсационную площадь и цену.');
      return;
    }
    setBusy(true); setError('');
    try {
      const response = await api.post('/resettlements', {
        project_id: projectId, original_home_area_x100: original,
        compensated_area_x100: compensated, paid_area_x100: paid,
        price_per_m2_minor: price, links
      });
      setCreating(false);
      setDraft({ project_id: null, original: '', extra: '', mode: 'percent', price: '', dealIds: [] });
      setResidentId(null);
      setDeals([]);
      await refresh();
      if (response?.data?.id) await openCase(response.data.id);
    } catch (e) {
      setError('Создание не выполнено: ' + (draftErrors[e?.message] ?? e?.message ?? 'ошибка сервера'));
    } finally { setBusy(false); }
  };

  const refresh = async () => {
    setError('');
    try {
      const response = await api.get('/resettlements');
      setItems(response?.data ?? []);
    } catch {
      setError('Не удалось загрузить реестр переселений.');
    }
  };
  useEffect(() => { if (canView) refresh(); }, [canView]);

  const openCase = async id => {
    setBusy(true);
    setError('');
    try {
      const response = await api.get('/resettlements/' + id);
      setSelected(response?.data ?? null);
      const historyResponse = await api.get('/resettlements/' + id + '/allocations');
      setAllocationHistory(historyResponse?.data ?? []);
      const readinessResponse = await api.get('/resettlements/' + id + '/signing-readiness');
      setSigningReadiness(readinessResponse?.data ?? null);
      const signingsResponse = await api.get('/resettlements/' + id + '/signings');
      setSigningHistory(signingsResponse?.data ?? []);
      setSigningDocuments({});
      // Owner-confirmed allocation for case #1: apartment 16 (deal 27) paid;
      // apartment 17 (deal 42) entirely compensated. This pre-fills a draft only.
      setAllocation(Number(id) === 1 ? { 27: '14008.00', 42: '0.00' } : {});
      setAllocationPreview(null);
      setAllocationApproval(null);
      setAllocationDocument('');
    } catch {
      setError('Не удалось открыть карточку переселения.');
    } finally { setBusy(false); }
  };

  const approve = async () => {
    if (!selected || !canApprove || selected.status !== 'DRAFT') return;
    if (!window.confirm('Утвердить переселение? После утверждения финансовые параметры будут заблокированы.')) return;
    setBusy(true);
    setError('');
    try {
      await api.post('/resettlements/' + selected.id + '/approve', { note });
      await refresh();
      await openCase(selected.id);
    } catch {
      setError('Утверждение не выполнено. Проверьте договоры, площади и права доступа.');
    } finally { setBusy(false); }
  };

  const previewAllocation = async () => {
    if (!selected || !canApprove) return;
    const rows = (selected.units ?? []).map(u => ({
      deal_id: Number(u.deal_id), allocated_minor: toHundredths(allocation[u.deal_id] ?? '')
    }));
    if (!rows.length || rows.some(r => !Number.isSafeInteger(r.allocated_minor) || r.allocated_minor < 0)) {
      setError('Укажите распределение стоимости для каждого договора в USD.');
      return;
    }
    setBusy(true); setError(''); setAllocationPreview(null);
    try {
      const response = await api.post('/resettlements/' + selected.id + '/allocation-preview', { allocations: rows });
      setAllocationPreview(response?.data ?? null);
    } catch (e) {
      setError('Проверка распределения не пройдена. Сумма по договорам должна совпадать со стоимостью платной площади.');
    } finally { setBusy(false); }
  };

  const approveAllocation = async () => {
    if (!selected || !allocationPreview?.validated || !canApprove || allocationDocument.trim().length < 3) return;
    if (!window.confirm('Сохранить распределение как утверждённое? Договоры и задолженность автоматически не изменятся.')) return;
    setBusy(true); setError('');
    try {
      const response = await api.post('/resettlements/' + selected.id + '/approve-allocation', {
        allocations: allocationPreview.allocations.map(a => ({ deal_id: a.deal_id, allocated_minor: a.allocated_minor })),
        supporting_document_ref: allocationDocument.trim()
      });
      setAllocationApproval(response?.data ?? null);
      setAllocationPreview(null);
      const historyResponse = await api.get('/resettlements/' + selected.id + '/allocations');
      setAllocationHistory(historyResponse?.data ?? []);
      const readinessResponse = await api.get('/resettlements/' + selected.id + '/signing-readiness');
      setSigningReadiness(readinessResponse?.data ?? null);
    } catch {
      setError('Сохранение распределения не выполнено. Проверьте подтверждающий документ и состояние карточки.');
    } finally { setBusy(false); }
  };

  const signResettlementDeal = async dealId => {
    if (!selected || !canApprove || !signingReadiness?.ready || !allocationHistory[0]?.id) return;
    const documentRef = String(signingDocuments[dealId] ?? '').trim();
    if (documentRef.length < 3) { setError('Укажите номер и дату подписанного договора.'); return; }
    if (!window.confirm('Подтвердить подписание договора и перевод квартиры в статус «Продано»? Действие изменит учёт CRM.')) return;
    setBusy(true); setError('');
    try {
      await api.post('/resettlements/' + selected.id + '/sign-deal', {
        deal_id: Number(dealId), approval_id: Number(allocationHistory[0].id),
        signed_document_ref: documentRef
      });
      await refresh();
      await openCase(selected.id);
    } catch (e) {
      setError('Подписание отклонено: ' + (e?.response?.data?.message || e?.message || 'проверьте договоры и согласование стоимости'));
    } finally { setBusy(false); }
  };

  if (!canView) return <div role="alert" className="p-6 text-red-700">Нет доступа к модулю переселения.</div>;

  return <div className="p-6 space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h1 className="text-2xl font-semibold">Переселение и компенсация</h1><p className="text-sm text-slate-500">Учёт замещающей, дополнительной и платной площади</p></div>
      <div className="flex gap-2">{canApprove && <button className="rounded-lg bg-blue-700 px-4 py-2 text-white" onClick={() => { if (!creating && draft.project_id) setLoadingDeals(true); setCreating(v => !v); }} disabled={busy}>{creating ? 'Отменить' : 'Новое переселение'}</button>}<button className="border rounded-lg px-4 py-2" onClick={refresh} disabled={busy}>Обновить</button></div>
    </div>
    {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-red-700">{error}</div>}
    {creating && canApprove && <form onSubmit={createDraft} className="rounded-xl border bg-white p-5 space-y-4">
      <h2 className="font-semibold text-lg">Создать черновик переселения</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm">Жилой комплекс
          <Select aria-label="Жилой комплекс" className="mt-1 w-full" showSearch optionFilterProp="label"
            value={draft.project_id ?? undefined} onChange={chooseProject}
            options={projects.map(project => ({ value: project.id, label: project.name }))} />
        </label>
        <label className="text-sm">Житель
          <Select aria-label="Житель" className="mt-1 w-full" showSearch optionFilterProp="search"
            disabled={!draft.project_id || loadingDeals} loading={loadingDeals}
            value={residentId ?? undefined} onChange={id => { setResidentId(id); changeDraft('dealIds', []); }}
            options={[...residents].map(([id, rows]) => ({
              value: id,
              label: [rows[0].lead_name, rows[0].lead_phone].filter(Boolean).join(' · ') || 'Житель без имени',
              search: rows.flatMap(deal => [deal.lead_name, deal.lead_phone, deal.passport_number,
                deal.inn, deal.contract_number, deal.unit_number]).filter(Boolean).join(' ')
            }))} />
        </label>
      </div>
      {residentId !== null && <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead><tr>{['Выбор', 'Блок', 'Квартира', 'Этаж', 'Комнат', 'Площадь, м²', 'Договор', 'Статус', 'Стоимость', 'Оплачено', 'Долг'].map(title =>
            <th key={title} className="p-2">{title}</th>)}</tr></thead>
          <tbody>{residentDeals.map(deal => {
            const checked = draft.dealIds.includes(deal.id);
            const duplicateUnit = selectedDeals.some(row => row.unit_id === deal.unit_id && row.id !== deal.id);
            return <tr key={deal.id} className="border-t">
              <td className="p-2"><input type="checkbox" checked={checked}
                aria-label={`Квартира ${deal.unit_number}, договор ${deal.contract_number ?? 'без номера'}`}
                disabled={busy || duplicateUnit || !(Number(deal.area_m2_x100) > 0) || (!checked && draft.dealIds.length >= 20)}
                onChange={() => changeDraft('dealIds', checked ? draft.dealIds.filter(id => id !== deal.id) : [...draft.dealIds, deal.id])} /></td>
              {[deal.building_name, deal.unit_number, deal.floor_number, deal.unit_rooms,
                deal.area_m2_x100 == null ? null : area(deal.area_m2_x100), deal.contract_number,
                ({ SIGNED: 'Подписан', RESERVED: 'Бронь', DRAFT: 'Черновик' })[deal.status],
                ...[deal.final_price_minor, deal.total_paid_minor, deal.remaining_debt_minor]
                  .map(value => value == null ? null : `${money(value)} ${deal.currency ?? ''}`)]
                .map((value, index) => <td key={index} className="p-2">{value ?? '—'}</td>)}
            </tr>;
          })}</tbody>
        </table>
      </div>}
      {selectedDeals.length > 0 && <>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="text-sm">Дополнительная компенсация
            <select className="mt-1 block w-full rounded-lg border p-2" value={draft.mode} onChange={e => setDraft(prev => ({ ...prev, mode: e.target.value, extra: '' }))}>
              <option value="percent">В процентах</option><option value="area">В квадратных метрах</option>
            </select>
          </label>
          {[
            ['original', 'Площадь старого жилья, м²'],
            ['extra', draft.mode === 'percent' ? 'Дополнительная площадь, %' : 'Дополнительная площадь, м²'],
            ['price', 'Цена платной площади, USD/м²']
          ].map(([key, label]) => <label key={key} className="text-sm">{label}
            <input required inputMode="decimal" value={draft[key]} onChange={e => changeDraft(key, e.target.value)} className="mt-1 block w-full rounded-lg border p-2" />
          </label>)}
        </div>
        <dl className="grid gap-3 rounded-lg bg-slate-50 p-3 text-sm sm:grid-cols-2 lg:grid-cols-5">
          {[
            ['Выделено, м²', area(allocated)], ['Бесплатная площадь, м²', compensated === null ? '—' : area(compensated)],
            ['Платная площадь, м²', paid === null ? '—' : area(paid)], ['Недостаёт, м²', missing === null ? '—' : area(missing)],
            ['Стоимость, USD', payable === null ? '—' : money(payable)]
          ].map(([label, value]) => <div key={label}><dt>{label}</dt><dd className="font-semibold">{value}</dd></div>)}
        </dl>
        {missing > 0 && <p role="alert" className="text-sm text-red-700">Выделенной площади недостаточно. Текущий порядок создания черновика требует покрыть всю компенсационную площадь.</p>}
      </>}
      <div><button type="submit" disabled={busy || loadingDeals || !selectedDeals.length || payable === null || missing > 0}
        className="rounded-lg bg-blue-700 px-4 py-2 text-white disabled:opacity-50">Сохранить черновик</button></div>
    </form>}
    <div className="overflow-x-auto rounded-xl border bg-white">
      <table className="w-full text-sm text-left">
        <thead className="bg-slate-50"><tr>{['№', 'ЖК', 'Старое жильё, м²', 'Компенсация, м²', 'Платная площадь, м²', 'К оплате', 'Статус'].map(h => <th key={h} className="p-3">{h}</th>)}</tr></thead>
        <tbody>{items.map(c => <tr key={c.id} className="border-t hover:bg-slate-50 cursor-pointer" onClick={() => openCase(c.id)}>
          <td className="p-3">{c.id}</td><td className="p-3">{projects.find(project => String(project.id) === String(c.project_id))?.name ?? '—'}</td><td className="p-3">{area(c.original_home_area_x100)}</td><td className="p-3">{area(c.compensated_area_x100)}</td><td className="p-3">{area(c.paid_area_x100)}</td><td className="p-3">{money(c.payable_total_minor)} USD</td><td className="p-3">{statuses[c.status] || c.status}</td>
        </tr>)}</tbody>
      </table>
      {!items.length && <p className="p-6 text-slate-500">Карточек переселения пока нет.</p>}
    </div>
    {selected && <section className="rounded-xl border bg-white p-5 space-y-4">
      <div className="flex items-center justify-between"><h2 className="text-xl font-semibold">Карточка №{selected.id}</h2><button onClick={() => setSelected(null)} className="border rounded px-3 py-1">Закрыть</button></div>
      <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm"><strong>Тип сделки: Переселение жителя</strong><span className="ml-2 text-slate-600">Компенсационная и платная площадь учитываются отдельно. Статус квартиры «Продана» устанавливается только после оформления договора.</span></div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div>Старое жильё: <strong>{area(selected.original_home_area_x100)} м²</strong></div>
        <div>Дополнительная компенсация: <strong>{area(selected.compensated_extra_area_x100)} м²</strong></div>
        <div>Платная площадь: <strong>{area(selected.paid_area_x100)} м²</strong></div>
        <div>Сумма к оплате: <strong>{money(selected.payable_total_minor)} USD</strong></div>
      </div>
      {!selected.area_matches && <p role="alert" className="text-red-700">Несоответствие общей площади квартир расчёту компенсации.</p>}
      {selected.financials && <div className="space-y-3 rounded-xl border p-4">
        <h3 className="font-semibold">Финансовая детализация (из действующих платежей CRM)</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>Денежные поступления: <strong>{money(selected.financials.cash_received_minor)} USD</strong></div>
          <div>Неденежные зачёты: <strong>{money(selected.financials.non_cash_credited_minor)} USD</strong></div>
          <div>Всего учтено: <strong>{money(selected.financials.total_recorded_minor)} USD</strong></div>
          <div>Предварительный остаток: <strong>{selected.financials.preliminary_balance_minor === null ? 'Требуется сверка валют' : money(selected.financials.preliminary_balance_minor) + ' USD'}</strong></div>
        </div>
        <p className="text-sm text-amber-800">Это справочная сверка с расчётной стоимостью платной площади, а не изменение договорной задолженности. Неденежные зачёты не являются поступлением в кассу. Классификация зачётов требует подтверждения бухгалтером.</p>
        {selected.financials.excluded_payment_count > 0 && <p role="alert" className="text-red-700">Есть платежи в другой валюте или с некорректной суммой: {selected.financials.excluded_payment_count}. Остаток не рассчитывается.</p>}
        <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="text-left"><th className="p-2">Дата</th><th className="p-2">Договор ID</th><th className="p-2">Платёж №</th><th className="p-2">Сумма</th><th className="p-2">Вид расчёта</th><th className="p-2">Статус</th></tr></thead>
          <tbody>{selected.financials.payments.map(p => <tr key={p.id} className="border-t"><td className="p-2">{p.payment_date || '—'}</td><td className="p-2">{p.deal_id}</td><td className="p-2">{p.customer_pko_number ?? p.document_number ?? p.id}</td><td className="p-2">{money(p.amount_minor)} {p.currency}</td><td className="p-2">{p.settlement_method === 'CASH' ? 'Денежный' : 'Неденежный зачёт (' + (p.settlement_method || 'не указан') + ')'}</td><td className="p-2">{p.status}</td></tr>)}</tbody>
        </table>{!selected.financials.payments.length && <p className="p-3 text-slate-500">Платежей по связанным договорам пока нет.</p>}</div>
      </div>}
      <h3 className="font-semibold">Связанные квартиры</h3>
      <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="text-left"><th className="p-2">Квартира</th><th className="p-2">Площадь</th><th className="p-2">Договор</th><th className="p-2">Статус</th></tr></thead><tbody>{(selected.units ?? []).map(u => <tr key={u.id} className="border-t"><td className="p-2">{u.unit?.unit_number ?? u.unit_id}</td><td className="p-2">{area(u.area_x100)} м²</td><td className="p-2">{u.deal?.contract_number ?? u.deal_id}</td><td className="p-2">{u.unit?.status ?? '—'}</td></tr>)}</tbody></table></div>
      {canApprove && selected.status === 'APPROVED' && <div className="space-y-3 rounded-xl border p-4">
        <h3 className="font-semibold">Подготовка распределения стоимости по договорам</h3>
        <p className="text-sm text-amber-800">Только предварительная проверка. Договоры, бронь, задолженность и платежи не изменяются. Для уже подписанного договора может потребоваться дополнительное соглашение.</p>
        <p className="text-sm">Общая стоимость платной площади: <strong>{money(selected.payable_total_minor)} USD</strong></p>
        <div className="grid gap-3 sm:grid-cols-2">
          {(selected.units ?? []).map(u => <label key={u.deal_id} className="text-sm">
            Договор №{u.deal?.contract_number ?? u.deal_id}, квартира №{u.unit?.unit_number ?? u.unit_id} — распределённая стоимость, USD
            <input inputMode="decimal" value={allocation[u.deal_id] ?? ''} onChange={e => { setAllocation(p => ({ ...p, [u.deal_id]: e.target.value })); setAllocationPreview(null); }} className="mt-1 block w-full rounded-lg border p-2" placeholder="0,00" />
          </label>)}
        </div>
        <button type="button" disabled={busy} onClick={previewAllocation} className="rounded-lg bg-blue-700 px-4 py-2 text-white disabled:opacity-50">Проверить распределение</button>
        {allocationApproval?.saved && <p role="status" className="text-green-800">Распределение сохранено, запись №{allocationApproval.approval_id}. Договоры не изменены.</p>}
        {allocationPreview?.validated && <div role="status" className="space-y-2 rounded-lg border p-3 text-sm">
          <p className="font-semibold">Сумма распределения совпадает с утверждённой стоимостью.</p>
          {(allocationPreview.allocations ?? []).map(a => <p key={a.deal_id}>Договор ID {a.deal_id}: {money(a.allocated_minor)} USD. {a.amendment_required ? 'Требуется согласование изменения подписанного договора.' : 'Изменение подписанного договора по сумме не выявлено.'}</p>)}
          <label className="block">Основание распределения (номер и дата подписанного документа)
            <input value={allocationDocument} onChange={e => setAllocationDocument(e.target.value)} maxLength={500} className="mt-1 block w-full rounded border p-2" placeholder="Дополнительное соглашение №… от …" />
          </label>
          <button type="button" onClick={approveAllocation} disabled={busy || allocationDocument.trim().length < 3} className="rounded-lg border px-4 py-2 disabled:opacity-50">Утвердить и сохранить распределение</button>
          <p className="text-amber-800">Утверждение сохраняет только распределение. Оформление продажи станет доступно только после юридического согласования стоимости всех договоров и проверки готовности.</p>
        </div>}
      </div>}
      {allocationHistory.length > 0 && <div className="space-y-2 rounded-xl border p-4">
        <h3 className="font-semibold">История утверждённого распределения</h3>
        {allocationHistory.map(h => <div key={h.id} className="rounded-lg border p-3 text-sm">
          <p><strong>Версия {h.approval_version}</strong> · {h.approved_at ? new Date(h.approved_at).toLocaleString('ru-RU') : '—'} · основание: {h.supporting_document_ref}</p>
          <p>Общая сумма: {money(h.payable_total_minor)} USD</p>
          {(h.allocations ?? []).map(a => <p key={a.deal_id}>Договор ID {a.deal_id}: {money(a.allocated_minor)} USD</p>)}
        </div>)}
        <p className="text-sm text-amber-800">История не изменяет подписанные договоры. Для юридического изменения суммы необходимо дополнительное соглашение.</p>
      </div>}
      {selected.status === 'APPROVED' && <div className="space-y-3 rounded-xl border p-4">
        <h3 className="font-semibold">Специальное оформление продажи при переселении</h3>
        <p className="text-sm text-slate-600">Продажа допускается только после юридического согласования сумм всех связанных договоров с утверждённым распределением. Подписанные документы должны существовать до нажатия кнопки.</p>
        {signingReadiness?.blockers?.length > 0 && <div role="alert" className="rounded-lg border border-amber-200 p-3 text-sm text-amber-800">
          <strong>Подписание заблокировано:</strong> {signingReadiness.blockers.map(signingBlockerLabel).join('; ')}
        </div>}
        {(signingReadiness?.deals ?? []).map(d => <div key={d.deal_id} className="space-y-2 rounded-lg border p-3 text-sm">
          <p><strong>Договор №{d.contract_number ?? d.deal_id}</strong> · {d.status} · текущая сумма {money(d.contract_amount_minor)} USD · утверждённая сумма {d.approved_amount_minor == null ? 'не определена' : money(d.approved_amount_minor) + ' USD'}</p>
          {d.blockers.length > 0 && <p className="text-amber-800">Причины блокировки: {d.blockers.map(signingBlockerLabel).join('; ')}</p>}
          {canApprove && d.status === 'RESERVED' && <label className="block">Подписанный договор (номер, дата)
            <input className="mt-1 block w-full rounded border p-2" maxLength={500}
              value={signingDocuments[d.deal_id] ?? ''}
              onChange={e => setSigningDocuments(p => ({ ...p, [d.deal_id]: e.target.value }))}
              placeholder="Договор №… от …" />
          </label>}
          {canApprove && d.status === 'RESERVED' && <button type="button" className="rounded-lg bg-blue-700 px-4 py-2 text-white disabled:opacity-50"
            disabled={busy || !signingReadiness?.ready || !allocationHistory[0]?.id || String(signingDocuments[d.deal_id] ?? '').trim().length < 3}
            onClick={() => signResettlementDeal(d.deal_id)}>Подписать и перевести квартиру в продажу</button>}
        </div>)}
      </div>}
      {signingHistory.length > 0 && <div className="space-y-2 rounded-xl border p-4">
        <h3 className="font-semibold">Журнал подписанных договоров переселения</h3>
        <div className="overflow-x-auto"><table className="w-full text-sm text-left">
          <thead><tr><th className="p-2">Договор ID</th><th className="p-2">Основание</th><th className="p-2">Версия распределения</th><th className="p-2">Сотрудник ID</th><th className="p-2">Дата оформления</th></tr></thead>
          <tbody>{signingHistory.map(h => <tr key={h.id} className="border-t">
            <td className="p-2">{h.deal_id}</td><td className="p-2">{h.signed_document_ref}</td>
            <td className="p-2">{allocationHistory.find(a => Number(a.id) === Number(h.approval_id))?.approval_version ?? h.approval_id}</td>
            <td className="p-2">{h.signed_by}</td>
            <td className="p-2">{h.signed_at ? new Date(h.signed_at).toLocaleString('ru-RU') : '—'}</td>
          </tr>)}</tbody>
        </table></div>
        <p className="text-sm text-slate-600">Записи показывают действия специальной процедуры; они не заменяют подписанные бумажные договоры.</p>
      </div>}
      {canApprove && selected.status === 'DRAFT' && <div className="space-y-2">
        <label className="block text-sm">Основание утверждения</label>
        <textarea value={note} onChange={e => setNote(e.target.value)} maxLength={2000} className="w-full rounded-lg border p-3" rows={2} />
        <button disabled={busy || !selected.area_matches} onClick={approve} className="rounded-lg bg-blue-700 px-4 py-2 text-white disabled:opacity-50">Утвердить переселение</button>
      </div>}
    </section>}
  </div>;
}
