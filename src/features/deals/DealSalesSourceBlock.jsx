import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { useAuth } from '../auth/AuthContext';
import {
  ShieldCheck,
  Users,
  Building2,
  AlertCircle,
  CheckCircle2,
  Lock,
  History,
  DollarSign,
  Percent,
  XCircle,
  Send,
  Pencil,
} from 'lucide-react';

const SOURCE_LABELS = {
  DIRECT: 'Прямая продажа TOZON',
  MARKETER: 'Продажа через маркетологов',
  UNSPECIFIED: 'Источник не определён',
};

const COMMISSION_STATUS_STYLES = {
  NOT_CALCULATED: 'bg-slate-100 text-slate-700 border-slate-200',
  CALCULATED: 'bg-blue-50 text-blue-700 border-blue-200',
  PENDING_APPROVAL: 'bg-amber-50 text-amber-800 border-amber-200',
  APPROVED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  PARTIALLY_PAID: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  PAID: 'bg-green-100 text-green-800 border-green-300',
  CANCELLED: 'bg-rose-50 text-rose-700 border-rose-200',
};

function formatUsd(val) {
  const num = Number(val || 0);
  return num.toLocaleString('ru-RU', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export const DealSalesSourceBlock = ({
  mode = 'deal', // 'form' | 'deal'
  deal = null,
  value = null, // for mode='form': { salesSource, marketingPartnerId, marketerName }
  onChange = null, // for mode='form': (nextValue) => void
  onDealUpdated = null, // for mode='deal': (updatedDeal) => void
  compact = false,
}) => {
  const { user } = useAuth();
  const role = String(user?.role || '').toUpperCase();
  const isAdmin = role === 'ADMIN';
  const isDirector = role === 'DIRECTOR';
  const isFinance = role === 'FINANCE_MANAGER';
  const isSalesManager = role === 'SALES_MANAGER';

  const [partners, setPartners] = useState([]);
  const [loadingPartners, setLoadingPartners] = useState(false);

  // State for 'deal' mode editing
  const currentSource = deal?.sales_source || 'UNSPECIFIED';
  const isSigned = String(deal?.status || '').toUpperCase() === 'SIGNED';
  const isCancelled = String(deal?.status || '').toUpperCase() === 'CANCELLED';

  const [isEditingSource, setIsEditingSource] = useState(false);
  const [draftSource, setDraftSource] = useState(currentSource === 'UNSPECIFIED' ? '' : currentSource);
  const [draftPartnerId, setDraftPartnerId] = useState(deal?.marketing_partner_id ? String(deal.marketing_partner_id) : '');
  const [draftMarketerName, setDraftMarketerName] = useState(deal?.marketer_name || '');
  const [changeReason, setChangeReason] = useState('');
  const [savingSource, setSavingSource] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Commission action states
  const [commissionActionModal, setCommissionActionModal] = useState(null); // 'SET_RATE' | 'APPROVE' | 'RECORD_PAYOUT' | 'CANCEL' | null
  const [ratePercentInput, setRatePercentInput] = useState('');
  const [payoutAmountInput, setPayoutAmountInput] = useState('');
  const [commissionNotes, setCommissionNotes] = useState('');
  const [savingCommission, setSavingCommission] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    let mounted = true;
    const loadPartners = async () => {
      setLoadingPartners(true);
      try {
        const res = await api.get('/reports/marketing-partners');
        const list = res?.data?.data?.partners || res?.data?.partners || [];
        if (mounted) {
          setPartners(Array.isArray(list) ? list : []);
        }
      } catch {
        if (mounted) setPartners([]);
      } finally {
        if (mounted) setLoadingPartners(false);
      }
    };
    loadPartners();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (deal) {
      setDraftSource(deal.sales_source && deal.sales_source !== 'UNSPECIFIED' ? deal.sales_source : '');
      setDraftPartnerId(deal.marketing_partner_id ? String(deal.marketing_partner_id) : '');
      setDraftMarketerName(deal.marketer_name || '');
    }
  }, [deal?.id, deal?.sales_source, deal?.marketing_partner_id, deal?.marketer_name]);

  // ============================================================================
  // MODE 1: Controlled Form Block (DealWizardModal / Pre-signing)
  // ============================================================================
  if (mode === 'form') {
    const selectedSource = value?.salesSource || '';
    const selectedPartnerId = value?.marketingPartnerId ? String(value.marketingPartnerId) : '';
    const marketerName = value?.marketerName || '';
    const selectedPartner = partners.find((p) => String(p.id) === selectedPartnerId);

    const handleSelectSource = (src) => {
      if (!onChange) return;
      onChange({
        salesSource: src,
        marketingPartnerId: src === 'MARKETER' ? selectedPartnerId : '',
        marketerName: src === 'MARKETER' ? marketerName : '',
      });
    };

    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 space-y-3" data-testid="deal-sales-source-form">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-indigo-600" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
              ИСТОЧНИК ПРОДАЖИ <span className="text-rose-500">*</span>
            </span>
          </div>
          <span className="text-[11px] text-slate-500">
            Обязательно для контроля маркетинговых комиссий
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={() => handleSelectSource('DIRECT')}
            data-testid="source-checkbox-direct"
            className={`flex items-start gap-3 p-3 rounded-lg border text-left transition-all ${
              selectedSource === 'DIRECT'
                ? 'border-emerald-600 bg-emerald-50/80 ring-2 ring-emerald-500/20'
                : 'border-slate-200 bg-white hover:border-slate-300'
            }`}
          >
            <input
              type="checkbox"
              readOnly
              checked={selectedSource === 'DIRECT'}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
            />
            <div>
              <div className="text-sm font-semibold text-slate-900">Прямая продажа TOZON</div>
              <div className="text-xs text-slate-500 mt-0.5">
                Без внешних маркетологов • Комиссия: 0 USD
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => handleSelectSource('MARKETER')}
            data-testid="source-checkbox-marketer"
            className={`flex items-start gap-3 p-3 rounded-lg border text-left transition-all ${
              selectedSource === 'MARKETER'
                ? 'border-indigo-600 bg-indigo-50/80 ring-2 ring-indigo-500/20'
                : 'border-slate-200 bg-white hover:border-slate-300'
            }`}
          >
            <input
              type="checkbox"
              readOnly
              checked={selectedSource === 'MARKETER'}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            <div>
              <div className="text-sm font-semibold text-slate-900">Продажа через маркетологов</div>
              <div className="text-xs text-slate-500 mt-0.5">
                Внешний партнёр / агентство • Выбор партнёра обязателен
              </div>
            </div>
          </button>
        </div>

        {selectedSource === 'DIRECT' && (
          <div className="flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 text-xs text-emerald-800">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              Прямая продажа компании TOZON. Начисление маркетинговой комиссии заблокировано (0.00 USD).
            </span>
          </div>
        )}

        {selectedSource === 'MARKETER' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Маркетинговый партнёр <span className="text-rose-500">*</span>
              </label>
              <select
                value={selectedPartnerId}
                onChange={(e) =>
                  onChange &&
                  onChange({
                    salesSource: 'MARKETER',
                    marketingPartnerId: e.target.value,
                    marketerName,
                  })
                }
                data-testid="select-marketing-partner"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none"
              >
                <option value="">— Выберите маркетингового партнёра —</option>
                {partners.map((p) => (
                  <option key={p.id} value={String(p.id)}>
                    {p.name}
                    {p.commissionType === 'PERCENT' && p.commissionRatePercent > 0
                      ? ` (${p.commissionRatePercent}%)`
                      : ''}
                  </option>
                ))}
              </select>
              {!loadingPartners && partners.length === 0 && (
                <p className="text-[11px] text-amber-700 mt-1">
                  В справочнике пока нет активных маркетинговых партнёров (добавляется администратором).
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Ответственный маркетолог / агент (необязательно)
              </label>
              <input
                type="text"
                value={marketerName}
                onChange={(e) =>
                  onChange &&
                  onChange({
                    salesSource: 'MARKETER',
                    marketingPartnerId: selectedPartnerId,
                    marketerName: e.target.value,
                  })
                }
                placeholder="ФИО или контакт представителя партнёра"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none"
              />
            </div>

            {selectedPartner && (
              <div className="sm:col-span-2 rounded-lg bg-indigo-50/70 border border-indigo-200 px-3 py-2 text-xs text-indigo-900 flex flex-wrap items-center justify-between gap-2">
                <span>
                  Партнёр: <strong>{selectedPartner.name}</strong>
                  {selectedPartner.contactPerson ? ` (${selectedPartner.contactPerson})` : ''}
                </span>
                <span>
                  Условия комиссии:{' '}
                  <strong>
                    {selectedPartner.commissionType === 'PERCENT' && selectedPartner.commissionRatePercent > 0
                      ? `${selectedPartner.commissionRatePercent}% от стоимости договора`
                      : selectedPartner.commissionType === 'FIXED_USD' && selectedPartner.commissionFixedUsd > 0
                        ? `${formatUsd(selectedPartner.commissionFixedUsd)} USD`
                        : 'Ставка не задана (0 USD до согласования)'}
                  </strong>
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // ============================================================================
  // MODE 2: Deal View & Management Block (DealDrawer & ApartmentDetailModal)
  // ============================================================================
  if (!deal) return null;

  const canModifySource = isSigned
    ? isAdmin
    : ['ADMIN', 'DIRECTOR', 'SALES_MANAGER'].includes(role);

  const commission = deal.commission || {
    status: 'NOT_CALCULATED',
    statusLabel: 'Не рассчитана',
    commissionRatePercent: 0,
    calculatedCommissionUsd: 0,
    approvedCommissionUsd: 0,
    paidCommissionUsd: 0,
    remainingCommissionUsd: 0,
  };

  const sourceHistory = Array.isArray(deal.source_history) ? deal.source_history : [];
  const commissionHistory = Array.isArray(deal.commission_history) ? deal.commission_history : [];

  const handleSaveSource = async (e) => {
    if (e) e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!draftSource || !['DIRECT', 'MARKETER'].includes(draftSource)) {
      setErrorMessage('Выберите источник продажи: «Прямая продажа TOZON» или «Продажа через маркетологов».');
      return;
    }
    if (draftSource === 'MARKETER' && !draftPartnerId) {
      setErrorMessage('При выборе «Продажа через маркетологов» необходимо указать маркетингового партнёра.');
      return;
    }
    if (isSigned && (!changeReason || changeReason.trim().length < 3)) {
      setErrorMessage('Для подписанного договора обязательно укажите причину изменения источника продажи.');
      return;
    }

    setSavingSource(true);
    try {
      const res = await api.patch(`/deals/${deal.id}/sales-source`, {
        salesSource: draftSource,
        marketingPartnerId: draftSource === 'MARKETER' ? Number(draftPartnerId) : null,
        marketerName: draftSource === 'MARKETER' ? draftMarketerName : '',
        reason: changeReason.trim(),
      });
      const updated = res?.data?.data?.deal || res?.data?.deal;
      setIsEditingSource(false);
      setChangeReason('');
      setSuccessMessage('Источник продажи успешно сохранён в журнале аудита.');
      if (onDealUpdated && updated) {
        onDealUpdated(updated);
      }
    } catch (err) {
      setErrorMessage(
        err?.response?.data?.message || err?.message || 'Не удалось сохранить источник продажи'
      );
    } finally {
      setSavingSource(false);
    }
  };

  const handleExecuteCommissionAction = async (actionType, extraPayload = {}) => {
    setErrorMessage('');
    setSuccessMessage('');
    setSavingCommission(true);
    try {
      const res = await api.patch(`/deals/${deal.id}/commission`, {
        action: actionType,
        notes: commissionNotes.trim(),
        ...extraPayload,
      });
      const updated = res?.data?.data?.deal || res?.data?.deal;
      setCommissionActionModal(null);
      setCommissionNotes('');
      setRatePercentInput('');
      setPayoutAmountInput('');
      setSuccessMessage('Статус комиссии маркетолога обновлён.');
      if (onDealUpdated && updated) {
        onDealUpdated(updated);
      }
    } catch (err) {
      setErrorMessage(
        err?.response?.data?.message || err?.message || 'Ошибка при обновлении комиссии'
      );
    } finally {
      setSavingCommission(false);
    }
  };

  return (
    <div
      className={`rounded-xl border border-slate-200 bg-white shadow-sm ${compact ? 'p-3.5' : 'p-4'} space-y-3.5`}
      data-testid="deal-sales-source-block"
    >
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-indigo-600" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
            ИСТОЧНИК ПРОДАЖИ И КОМИССИЯ МАРКЕТОЛОГОВ
          </h4>
        </div>

        <div className="flex items-center gap-2">
          {(sourceHistory.length > 0 || commissionHistory.length > 0) && (
            <button
              type="button"
              onClick={() => setShowHistory((prev) => !prev)}
              className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-indigo-600"
            >
              <History className="w-3.5 h-3.5" />
              <span>Аудит ({sourceHistory.length + commissionHistory.length})</span>
            </button>
          )}

          {canModifySource && !isEditingSource && !isCancelled && (
            <button
              type="button"
              onClick={() => {
                setIsEditingSource(true);
                setErrorMessage('');
                setSuccessMessage('');
              }}
              data-testid="btn-edit-sales-source"
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
            >
              <Pencil className="w-3 h-3" />
              <span>{currentSource === 'UNSPECIFIED' ? 'Подтвердить источник' : 'Изменить источник'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Current Status Display */}
      <div className="space-y-2.5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div
            className={`flex items-center gap-2.5 rounded-lg border px-3 py-2.5 ${
              currentSource === 'DIRECT'
                ? 'border-emerald-500 bg-emerald-50/70 text-emerald-900 font-semibold'
                : 'border-slate-200 bg-slate-50/50 text-slate-500'
            }`}
          >
            <input
              type="checkbox"
              readOnly
              checked={currentSource === 'DIRECT'}
              className="h-4 w-4 rounded border-slate-300 text-emerald-600"
            />
            <div className="text-xs">
              <div>Прямая продажа TOZON</div>
              {currentSource === 'DIRECT' && (
                <div className="text-[11px] font-normal text-emerald-700">
                  Комиссия маркетологам: 0.00 USD
                </div>
              )}
            </div>
          </div>

          <div
            className={`flex items-center gap-2.5 rounded-lg border px-3 py-2.5 ${
              currentSource === 'MARKETER'
                ? 'border-indigo-500 bg-indigo-50/70 text-indigo-900 font-semibold'
                : 'border-slate-200 bg-slate-50/50 text-slate-500'
            }`}
          >
            <input
              type="checkbox"
              readOnly
              checked={currentSource === 'MARKETER'}
              className="h-4 w-4 rounded border-slate-300 text-indigo-600"
            />
            <div className="text-xs">
              <div>Продажа через маркетологов</div>
              {currentSource === 'MARKETER' && (
                <div className="text-[11px] font-normal text-indigo-700">
                  Партнёр: {deal.marketing_partner_name || '—'}
                  {deal.marketer_name ? ` (${deal.marketer_name})` : ''}
                </div>
              )}
            </div>
          </div>
        </div>

        {currentSource === 'UNSPECIFIED' && (
          <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold">Статус: Источник не определён.</span> Комиссия маркетологам не начисляется (0.00 USD) до проверки и официального подтверждения источника продажи.
            </div>
          </div>
        )}

        {isSigned && !isAdmin && (
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
            <Lock className="w-3.5 h-3.5 text-slate-400" />
            <span>
              Договор подписан. Изменение источника продажи доступно только администратору (ADMIN) с записью в аудит.
            </span>
          </div>
        )}
      </div>

      {/* Edit Source Form */}
      {isEditingSource && (
        <form onSubmit={handleSaveSource} className="rounded-lg border border-indigo-200 bg-indigo-50/40 p-3.5 space-y-3">
          <div className="text-xs font-bold text-slate-800">
            {isSigned ? 'Изменение источника подписанного договора (с записью в аудит)' : 'Указание источника продажи'}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <label
              className={`flex items-center gap-2.5 p-2.5 rounded-lg border cursor-pointer text-xs font-medium ${
                draftSource === 'DIRECT'
                  ? 'border-emerald-600 bg-emerald-50 text-emerald-900'
                  : 'border-slate-200 bg-white text-slate-700'
              }`}
            >
              <input
                type="checkbox"
                checked={draftSource === 'DIRECT'}
                onChange={() => setDraftSource('DIRECT')}
                className="h-4 w-4 rounded text-emerald-600"
              />
              <span>Прямая продажа TOZON (Комиссия 0 USD)</span>
            </label>

            <label
              className={`flex items-center gap-2.5 p-2.5 rounded-lg border cursor-pointer text-xs font-medium ${
                draftSource === 'MARKETER'
                  ? 'border-indigo-600 bg-indigo-50 text-indigo-900'
                  : 'border-slate-200 bg-white text-slate-700'
              }`}
            >
              <input
                type="checkbox"
                checked={draftSource === 'MARKETER'}
                onChange={() => setDraftSource('MARKETER')}
                className="h-4 w-4 rounded text-indigo-600"
              />
              <span>Продажа через маркетологов</span>
            </label>
          </div>

          {draftSource === 'MARKETER' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Маркетинговый партнёр <span className="text-rose-500">*</span>
                </label>
                <select
                  value={draftPartnerId}
                  onChange={(e) => setDraftPartnerId(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900"
                >
                  <option value="">— Выберите партнёра —</option>
                  {partners.map((p) => (
                    <option key={p.id} value={String(p.id)}>
                      {p.name}
                      {p.commissionRatePercent > 0 ? ` (${p.commissionRatePercent}%)` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Ответственный маркетолог (ФИО)
                </label>
                <input
                  type="text"
                  value={draftMarketerName}
                  onChange={(e) => setDraftMarketerName(e.target.value)}
                  placeholder="ФИО представителя партнёра"
                  className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900"
                />
              </div>
            </div>
          )}

          {isSigned && (
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Причина изменения источника <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={changeReason}
                onChange={(e) => setChangeReason(e.target.value)}
                placeholder="Укажите основание (например: Подтверждён акт сверки с партнёром / Прямой клиент компании)"
                className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900"
              />
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setIsEditingSource(false)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={savingSource}
              className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {savingSource ? 'Сохранение...' : 'Сохранить источник'}
            </button>
          </div>
        </form>
      )}

      {/* Commission Control Panel (shown when MARKETER is active or has commission history) */}
      {(currentSource === 'MARKETER' || commission.paidCommissionUsd > 0) && (
        <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3 space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-xs font-bold text-slate-800">
              Расчёт и статус комиссии маркетолога
            </div>
            <span
              className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${
                COMMISSION_STATUS_STYLES[commission.status] || COMMISSION_STATUS_STYLES.NOT_CALCULATED
              }`}
            >
              {commission.statusLabel || 'Не рассчитана'}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
            <div className="rounded-md bg-white p-2 border border-slate-200/80">
              <div className="text-[11px] text-slate-500">Ставка комиссии</div>
              <div className="font-bold text-slate-900 mt-0.5">
                {commission.commissionRatePercent > 0 ? `${commission.commissionRatePercent}%` : 'Не задана (0%)'}
              </div>
            </div>
            <div className="rounded-md bg-white p-2 border border-slate-200/80">
              <div className="text-[11px] text-slate-500">Начислено</div>
              <div className="font-bold text-slate-900 mt-0.5">
                ${formatUsd(commission.calculatedCommissionUsd)}
              </div>
            </div>
            <div className="rounded-md bg-white p-2 border border-slate-200/80">
              <div className="text-[11px] text-slate-500">Утверждено</div>
              <div className="font-bold text-emerald-700 mt-0.5">
                ${formatUsd(commission.approvedCommissionUsd)}
              </div>
            </div>
            <div className="rounded-md bg-white p-2 border border-slate-200/80">
              <div className="text-[11px] text-slate-500">Выплачено</div>
              <div className="font-bold text-indigo-700 mt-0.5">
                ${formatUsd(commission.paidCommissionUsd)}
              </div>
            </div>
            <div className="rounded-md bg-white p-2 border border-slate-200/80">
              <div className="text-[11px] text-slate-500">Остаток к выплате</div>
              <div className="font-bold text-amber-700 mt-0.5">
                ${formatUsd(commission.remainingCommissionUsd)}
              </div>
            </div>
          </div>

          {/* Commission Action Buttons based on Role (Stage 8) */}
          {!isSalesManager && !isCancelled && currentSource === 'MARKETER' && (
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => {
                    setCommissionActionModal('SET_RATE');
                    setRatePercentInput(String(commission.commissionRatePercent || ''));
                  }}
                  className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  <Percent className="w-3 h-3" />
                  <span>Задать ставку %</span>
                </button>
              )}

              {(isDirector || isAdmin) &&
                commission.calculatedCommissionUsd > 0 &&
                commission.status === 'CALCULATED' && (
                  <button
                    type="button"
                    onClick={() => handleExecuteCommissionAction('SUBMIT_FOR_APPROVAL')}
                    disabled={savingCommission}
                    className="inline-flex items-center gap-1 rounded-md bg-amber-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-amber-700"
                  >
                    <Send className="w-3 h-3" />
                    <span>На утверждение</span>
                  </button>
                )}

              {isAdmin &&
                commission.calculatedCommissionUsd > 0 &&
                ['CALCULATED', 'PENDING_APPROVAL'].includes(commission.status) && (
                  <button
                    type="button"
                    onClick={() => setCommissionActionModal('APPROVE')}
                    className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-emerald-700"
                  >
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Утвердить комиссию</span>
                  </button>
                )}

              {(isFinance || isAdmin) &&
                ['APPROVED', 'PARTIALLY_PAID'].includes(commission.status) &&
                commission.remainingCommissionUsd > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setCommissionActionModal('RECORD_PAYOUT');
                      setPayoutAmountInput(String(commission.remainingCommissionUsd));
                    }}
                    className="inline-flex items-center gap-1 rounded-md bg-indigo-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-indigo-700"
                  >
                    <DollarSign className="w-3 h-3" />
                    <span>Зарегистрировать выплату</span>
                  </button>
                )}

              {isAdmin && commission.status !== 'CANCELLED' && commission.status !== 'NOT_CALCULATED' && (
                <button
                  type="button"
                  onClick={() => setCommissionActionModal('CANCEL')}
                  className="inline-flex items-center gap-1 rounded-md border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-medium text-rose-700 hover:bg-rose-100"
                >
                  <XCircle className="w-3 h-3" />
                  <span>Отменить комиссию</span>
                </button>
              )}
            </div>
          )}

          {/* Inline Action Mini-Form */}
          {commissionActionModal && (
            <div className="rounded-lg border border-slate-300 bg-white p-3 space-y-2.5 mt-2">
              {commissionActionModal === 'SET_RATE' && (
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Согласованная ставка комиссии маркетолога (%)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={ratePercentInput}
                    onChange={(e) => setRatePercentInput(e.target.value)}
                    placeholder="Например: 3.0"
                    className="w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-xs"
                  />
                </div>
              )}

              {commissionActionModal === 'RECORD_PAYOUT' && (
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Сумма выплаты комиссии, USD (доступно к выплате: ${formatUsd(commission.remainingCommissionUsd)})
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={commission.remainingCommissionUsd}
                    value={payoutAmountInput}
                    onChange={(e) => setPayoutAmountInput(e.target.value)}
                    className="w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-xs"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Примечание / основание {commissionActionModal === 'CANCEL' ? '*' : ''}
                </label>
                <input
                  type="text"
                  value={commissionNotes}
                  onChange={(e) => setCommissionNotes(e.target.value)}
                  placeholder="Комментарий для аудита"
                  className="w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setCommissionActionModal(null)}
                  className="rounded-md border border-slate-200 px-2.5 py-1 text-xs text-slate-600"
                >
                  Отмена
                </button>
                <button
                  type="button"
                  disabled={savingCommission}
                  onClick={() => {
                    if (commissionActionModal === 'SET_RATE') {
                      handleExecuteCommissionAction('SET_RATE', {
                        commissionType: 'PERCENT',
                        commissionRatePercent: Number(ratePercentInput || 0),
                      });
                    } else if (commissionActionModal === 'APPROVE') {
                      handleExecuteCommissionAction('APPROVE');
                    } else if (commissionActionModal === 'RECORD_PAYOUT') {
                      handleExecuteCommissionAction('RECORD_PAYOUT', {
                        payoutAmountUsd: Number(payoutAmountInput || 0),
                      });
                    } else if (commissionActionModal === 'CANCEL') {
                      handleExecuteCommissionAction('CANCEL');
                    }
                  }}
                  className="rounded-md bg-indigo-600 px-3 py-1 text-xs font-semibold text-white hover:bg-indigo-700"
                >
                  {savingCommission ? 'Сохранение...' : 'Подтвердить'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Alerts */}
      {errorMessage && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
          {errorMessage}
        </div>
      )}
      {successMessage && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
          {successMessage}
        </div>
      )}

      {/* Audit History Drawer */}
      {showHistory && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-2 text-xs">
          <div className="font-bold text-slate-700">Журнал изменений источника и комиссии</div>
          {sourceHistory.map((item, idx) => (
            <div key={`src-${idx}`} className="border-b border-slate-200/70 pb-1.5 last:border-b-0">
              <div className="font-medium text-slate-800">
                Источник: {item.oldSourceLabel} → <strong>{item.newSourceLabel}</strong>
                {item.newPartnerName ? ` (${item.newPartnerName})` : ''}
              </div>
              {item.reason && <div className="text-slate-600">Причина: {item.reason}</div>}
              <div className="text-[11px] text-slate-400">
                Пользователь: {item.changedByName} •{' '}
                {item.changedAt ? new Date(item.changedAt).toLocaleString('ru-RU') : '—'}
              </div>
            </div>
          ))}
          {commissionHistory.map((item, idx) => (
            <div key={`comm-${idx}`} className="border-b border-slate-200/70 pb-1.5 last:border-b-0">
              <div className="font-medium text-slate-800">
                Комиссия: <strong>{item.statusLabel}</strong> (Начислено: ${formatUsd(item.calculatedCommissionUsd)} / Утверждено: ${formatUsd(item.approvedCommissionUsd)} / Выплачено: ${formatUsd(item.paidCommissionUsd)})
              </div>
              {item.notes && <div className="text-slate-600">Комментарий: {item.notes}</div>}
              <div className="text-[11px] text-slate-400">
                Пользователь: {item.changedByName} •{' '}
                {item.changedAt ? new Date(item.changedAt).toLocaleString('ru-RU') : '—'}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
