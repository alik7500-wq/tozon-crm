import React, { useEffect, useRef, useState } from 'react';
import { api } from '../../api/client';
import { useAuth } from '../auth/AuthContext';

const makeKey = () => `ig_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

function readStoredComposerState(draftStore, baseKey, storageKey) {
  const mem = draftStore?.get(baseKey);
  if (mem && typeof mem === 'object') return mem;
  if (typeof mem === 'string') return { draftText: mem };
  try {
    if (storageKey && typeof sessionStorage !== 'undefined') {
      const raw = sessionStorage.getItem(storageKey);
      if (!raw) return {};
      if (raw.startsWith('{')) return JSON.parse(raw);
      return { draftText: raw };
    }
  } catch { /* ignore */ }
  return {};
}

function writeStoredComposerState(draftStore, baseKey, storageKey, state) {
  const opState = state.operation?.state || 'idle';
  const hasContent = Boolean(state.draftText || opState === 'unknown' || opState === 'failed');
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

function isAmbiguousDeliveryError(err) {
  const code = err?.response?.data?.code || err?.code;
  if (code === 'SENT_NOT_SAVED' || code === 'INSTAGRAM_SEND_UNCONFIRMED' || code === 'SEND_IN_PROGRESS') {
    return true;
  }
  if (err?.isTimeout || err?.isNetworkError || err?.hasHttpResponse === false) {
    return true;
  }
  if (!err?.response && !code) {
    return true;
  }
  const status = err?.response?.status ?? err?.status;
  if (Number.isFinite(status) && status >= 500) {
    return true;
  }
  return false;
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
    return 'Ключ отправки уже использован для другого сообщения. Начните новую попытку.';
  }
  if (code === 'SEND_IN_PROGRESS') {
    return 'Эта отправка уже выполняется на сервере. Подождите завершения или выполните сверку.';
  }
  if (code === 'INSTAGRAM_ACCESS_DENIED' || err?.response?.status === 403 || err?.status === 403) {
    return 'Недостаточно прав для отправки в этот диалог.';
  }
  if (code === 'INSTAGRAM_RATE_LIMIT') {
    return 'Превышен лимит запросов Instagram. Повторите позже.';
  }
  if (['INSTAGRAM_PERMISSION_REQUIRED', 'INSTAGRAM_RECONNECT_REQUIRED', 'INSTAGRAM_ACCOUNT_MISMATCH', 'INSTAGRAM_THREAD_OWNER_REQUIRED'].includes(code)) {
    return err.message || 'Требуется проверка подключения Instagram.';
  }
  if (isAmbiguousDeliveryError(err)) {
    return err.message || 'Результат отправки неизвестен. Выполните сверку перед повтором.';
  }
  return 'Отправка отклонена. Исправьте причину и начните новую попытку.';
}

function buildOperation(storedOp = {}) {
  const state = ['unknown', 'failed'].includes(storedOp.state) ? storedOp.state : 'idle';
  return {
    idempotencyKey: storedOp.idempotencyKey || makeKey(),
    sentText: storedOp.sentText || '',
    state,
    error: storedOp.error || ''
  };
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

  const activeBaseKeyRef = useRef(baseKey);
  activeBaseKeyRef.current = baseKey;
  const activeUserIdRef = useRef(user?.id);
  activeUserIdRef.current = user?.id;
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const [initial] = useState(() => readStoredComposerState(draftStore, baseKey, storageKey));
  const [draftText, setDraftText] = useState(initial.draftText ?? initial.text ?? '');
  const [operation, setOperation] = useState(() => buildOperation(initial.operation || initial));
  const [reconciling, setReconciling] = useState(false);
  const [confirmResetUnknown, setConfirmResetUnknown] = useState(false);
  const [statusNotice, setStatusNotice] = useState('');

  const draftTextRef = useRef(draftText);
  draftTextRef.current = draftText;

  useEffect(() => {
    if (!baseKey) return;
    const loaded = readStoredComposerState(draftStore, baseKey, storageKey);
    setDraftText(loaded.draftText ?? loaded.text ?? '');
    setOperation(buildOperation(loaded.operation || loaded));
    setConfirmResetUnknown(false);
    setStatusNotice('');
  }, [baseKey, storageKey]);

  const persist = (nextDraft, nextOp) => {
    writeStoredComposerState(draftStore, baseKey, storageKey, {
      draftText: nextDraft,
      operation: nextOp
    });
  };

  const updateDraft = (val) => {
    setDraftText(val);
    draftTextRef.current = val;
    // Editing text NEVER clears unknown or failed operation identity/state
    if (operation.state === 'confirmed') {
      const freshOp = { idempotencyKey: makeKey(), sentText: '', state: 'idle', error: '' };
      setOperation(freshOp);
      setStatusNotice('');
      persist(val, freshOp);
      return;
    }
    persist(val, operation);
  };

  const startNewAttempt = () => {
    const freshOp = { idempotencyKey: makeKey(), sentText: '', state: 'idle', error: '' };
    setOperation(freshOp);
    setConfirmResetUnknown(false);
    setStatusNotice('');
    persist(draftText, freshOp);
  };

  const applyOperationOutcome = (opBaseKey, opStorageKey, opText, opKey, opUserId, outcome) => {
    // Discard late response if user logged out / changed or component unmounted on revocation
    if (!mountedRef.current || activeUserIdRef.current !== opUserId) {
      return;
    }
    if (outcome.revoked) {
      writeStoredComposerState(draftStore, opBaseKey, opStorageKey, { draftText: '', operation: { idempotencyKey: makeKey(), sentText: '', state: 'idle', error: '' } });
      return;
    }
    const isSameDialog = activeBaseKeyRef.current === opBaseKey;
    const currentStored = readStoredComposerState(draftStore, opBaseKey, opStorageKey);
    const currentDraft = isSameDialog ? draftTextRef.current : (currentStored.draftText ?? currentStored.text ?? '');

    if (outcome.confirmed) {
      const nextDraft = currentDraft === opText ? '' : currentDraft;
      const freshOp = { idempotencyKey: makeKey(), sentText: '', state: 'idle', error: '' };
      writeStoredComposerState(draftStore, opBaseKey, opStorageKey, { draftText: nextDraft, operation: freshOp });
      if (isSameDialog) {
        setDraftText(nextDraft);
        setOperation({ ...freshOp, state: 'confirmed' });
        setConfirmResetUnknown(false);
        setStatusNotice('Принято поставщиком');
      }
      const [accountId, contactId] = String(opBaseKey).split(':');
      onSent?.(outcome.data, { accountId, contactId, idempotencyKey: opKey });
      return;
    }

    writeStoredComposerState(draftStore, opBaseKey, opStorageKey, {
      draftText: currentDraft,
      operation: outcome.nextOp
    });
    if (isSameDialog) {
      setOperation(outcome.nextOp);
    }
  };

  const reconcile = async () => {
    if (!conversation || reconciling || operation.state === 'sending') return;
    const opBaseKey = baseKey;
    const opStorageKey = storageKey;
    const opKey = operation.idempotencyKey;
    const opText = operation.sentText;
    const opUserId = user?.id;

    setReconciling(true);
    try {
      const account = encodeURIComponent(conversation.instagramAccountId);
      const contact = encodeURIComponent(conversation.contactId);
      const result = await api.post(
        `/integrations/instagram/send/${account}/${contact}/reconcile`,
        { idempotency_key: opKey },
        { timeout: 25000 }
      );
      if (result?.deliveryStatus === 'confirmed' && result?.data?.saved !== false) {
        applyOperationOutcome(opBaseKey, opStorageKey, opText, opKey, opUserId, { confirmed: true, data: result?.data });
      } else {
        const msg = result?.data?.nextAction || 'Результат доставки всё ещё неизвестен. Проверьте переписку в Instagram.';
        applyOperationOutcome(opBaseKey, opStorageKey, opText, opKey, opUserId, {
          confirmed: false,
          nextOp: { idempotencyKey: opKey, sentText: opText, state: 'unknown', error: msg }
        });
      }
    } catch (err) {
      const status = err?.response?.status ?? err?.status;
      if (status === 401 || status === 403) {
        applyOperationOutcome(opBaseKey, opStorageKey, opText, opKey, opUserId, { revoked: true });
      } else {
        const msg = mapSendErrorMessage(err);
        applyOperationOutcome(opBaseKey, opStorageKey, opText, opKey, opUserId, {
          confirmed: false,
          nextOp: { idempotencyKey: opKey, sentText: opText, state: 'unknown', error: msg }
        });
      }
    } finally {
      if (mountedRef.current && activeBaseKeyRef.current === opBaseKey) {
        setReconciling(false);
      }
    }
  };

  const submit = async (event) => {
    event.preventDefault();
    if (!conversation || !draftText.trim() || operation.state === 'sending' || operation.state === 'unknown' || operation.state === 'failed') {
      return;
    }
    const opBaseKey = baseKey;
    const opStorageKey = storageKey;
    const opKey = operation.idempotencyKey;
    const opText = draftText.trim();
    const opUserId = user?.id;

    const sendingOp = { idempotencyKey: opKey, sentText: opText, state: 'sending', error: '' };
    setOperation(sendingOp);
    setStatusNotice('');

    try {
      const account = encodeURIComponent(conversation.instagramAccountId);
      const contact = encodeURIComponent(conversation.contactId);
      const result = await api.post(
        `/integrations/instagram/send/${account}/${contact}`,
        { text: opText, idempotency_key: opKey },
        { timeout: 25000 }
      );
      if (result?.deliveryStatus === 'unknown' || result?.data?.acceptedButUnsaved) {
        const msg = result?.data?.acceptedButUnsaved
          ? 'Instagram принял сообщение, но CRM не сохранила его. Выполните сверку перед повтором.'
          : (result?.data?.nextAction || 'Результат доставки неизвестен. Выполните сверку перед повтором.');
        applyOperationOutcome(opBaseKey, opStorageKey, opText, opKey, opUserId, {
          confirmed: false,
          nextOp: { idempotencyKey: opKey, sentText: opText, state: 'unknown', error: msg }
        });
        return;
      }
      applyOperationOutcome(opBaseKey, opStorageKey, opText, opKey, opUserId, { confirmed: true, data: result?.data });
    } catch (err) {
      const status = err?.response?.status ?? err?.status;
      if (status === 401 || status === 403) {
        applyOperationOutcome(opBaseKey, opStorageKey, opText, opKey, opUserId, { revoked: true });
        return;
      }
      const nextState = isAmbiguousDeliveryError(err) ? 'unknown' : 'failed';
      const msg = mapSendErrorMessage(err);
      applyOperationOutcome(opBaseKey, opStorageKey, opText, opKey, opUserId, {
        confirmed: false,
        nextOp: { idempotencyKey: opKey, sentText: opText, state: nextState, error: msg }
      });
    }
  };

  if (!conversation) return null;
  const sending = operation.state === 'sending';
  const isUnknown = operation.state === 'unknown';
  const isFailed = operation.state === 'failed';

  return <form onSubmit={submit} className="border-t p-4 space-y-2" data-delivery-state={operation.state}>
    <label htmlFor="instagram-reply" className="block text-sm font-medium">Ответ клиенту</label>
    <textarea id="instagram-reply" rows={3} maxLength={1000} value={draftText}
      onChange={e => updateDraft(e.target.value)} disabled={sending}
      placeholder="Напишите ответ…" className="w-full rounded-lg border border-slate-300 p-3" />
    {statusNotice && <p role="status" className="text-xs font-medium text-emerald-700">{statusNotice}</p>}
    {operation.error && <p role="alert" className="text-sm text-red-700">{operation.error}</p>}
    {isUnknown && confirmResetUnknown && (
      <div className="rounded-lg bg-amber-50 border border-amber-200 p-2.5 text-xs text-amber-900 space-y-2">
        <p>Прежняя отправка могла состояться в Instagram. Убедитесь, что сообщение не доставлено, перед началом новой отправки.</p>
        <div className="flex gap-2">
          <button type="button" onClick={startNewAttempt} className="rounded bg-amber-700 px-2.5 py-1 text-white">Подтвердить новую отправку</button>
          <button type="button" onClick={() => setConfirmResetUnknown(false)} className="rounded border border-amber-300 px-2.5 py-1">Отмена</button>
        </div>
      </div>
    )}
    <div className="flex flex-wrap justify-between items-center gap-2">
      <span className="text-xs text-slate-500">{draftText.length}/1000</span>
      <div className="flex flex-wrap gap-2 items-center">
        {isUnknown && (
          <>
            <button type="button" onClick={reconcile} disabled={reconciling || sending}
              className="rounded-lg border border-amber-600 px-3 py-2 text-xs font-medium text-amber-800 disabled:opacity-50">
              {reconciling ? 'Сверка…' : 'Сверить доставку'}
            </button>
            {!confirmResetUnknown && (
              <button type="button" onClick={() => setConfirmResetUnknown(true)} disabled={reconciling || sending}
                className="rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-700 disabled:opacity-50">
                Начать новое сообщение
              </button>
            )}
          </>
        )}
        {isFailed && (
          <button type="button" onClick={startNewAttempt} disabled={sending}
            className="rounded-lg border border-blue-600 px-3 py-2 text-xs font-medium text-blue-700 disabled:opacity-50">
            Начать новую попытку
          </button>
        )}
        <button type="submit" disabled={sending || !draftText.trim() || isUnknown || isFailed}
          className="rounded-lg bg-blue-600 px-4 py-2 text-white disabled:opacity-50">
          {sending ? 'Отправка…' : 'Отправить'}
        </button>
      </div>
    </div>
  </form>;
}
