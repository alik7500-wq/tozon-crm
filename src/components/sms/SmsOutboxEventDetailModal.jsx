import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import {
  X,
  Send,
  AlertTriangle,
  CheckCircle2,
  Clock,
  MessageSquare,
  ShieldAlert,
  User,
  FileText,
  Ban,
  RefreshCw
} from 'lucide-react';

export function SmsOutboxEventDetailModal({ eventId, isOpen, onClose, onRefreshQueue }) {
  const [previewData, setPreviewData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  const fetchPreview = async () => {
    if (!eventId) return;
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await api.post(`/sms/events/${eventId}/preview`);
      if (res.success && res.data) {
        setPreviewData(res.data);
      } else {
        setErrorMessage(res.error?.message || 'Не удалось загрузить предпросмотр события');
      }
    } catch (err) {
      console.error('Error fetching event preview:', err);
      setErrorMessage(err.response?.data?.error?.message || err.message || 'Ошибка загрузки предпросмотра');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && eventId) {
      setPreviewData(null);
      setSuccessMessage(null);
      setErrorMessage(null);
      setShowCancelConfirm(false);
      setCancelReason('');
      fetchPreview();
    }
  }, [isOpen, eventId]);

  if (!isOpen || !eventId) return null;

  const eventObj = previewData?.event || {};
  const isAwaitingConfirmation = eventObj.status === 'AWAITING_CONFIRMATION';
  const isApplicable = previewData?.isApplicable !== false && isAwaitingConfirmation;

  const handleConfirmSend = async () => {
    if (!isApplicable || isSending) return;
    setIsSending(true);
    setErrorMessage(null);
    try {
      const res = await api.post(`/sms/events/${eventId}/confirm`, {
        previewHash: previewData?.previewHash
      });

      if (res.success) {
        setSuccessMessage('SMS успешно отправлено!');
        setTimeout(() => {
          if (onRefreshQueue) onRefreshQueue();
          onClose();
        }, 1200);
      } else {
        setErrorMessage(res.error?.message || 'Ошибка подтверждения отправки SMS');
      }
    } catch (err) {
      const errCode = err.response?.data?.error?.code;
      const errMsg = err.response?.data?.error?.message || err.message;
      if (errCode === 'PREVIEW_CHANGED') {
        setErrorMessage('Текст сообщения изменился из-за обновления данных. Загрузка обновлённого текста...');
        fetchPreview();
      } else {
        setErrorMessage(errMsg);
      }
    } finally {
      setIsSending(false);
    }
  };

  const handleCancelEvent = async () => {
    if (isCancelling) return;
    setIsCancelling(true);
    setErrorMessage(null);
    try {
      const res = await api.post(`/sms/events/${eventId}/cancel`, {
        reason: cancelReason || 'Отменено менеджером'
      });

      if (res.success) {
        setSuccessMessage('Событие успешно отменено');
        setTimeout(() => {
          if (onRefreshQueue) onRefreshQueue();
          onClose();
        }, 1000);
      } else {
        setErrorMessage(res.error?.message || 'Не удалось отменить событие');
      }
    } catch (err) {
      setErrorMessage(err.response?.data?.error?.message || err.message || 'Ошибка при отмене события');
    } finally {
      setIsCancelling(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'AWAITING_CONFIRMATION':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Clock className="w-3.5 h-3.5" />
            Ожидает подтверждения
          </span>
        );
      case 'PROCESSING':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            Обрабатывается
          </span>
        );
      case 'SENT':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Отправлено
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-500/10 text-slate-400 border border-slate-500/20">
            <Ban className="w-3.5 h-3.5" />
            Отменено
          </span>
        );
      case 'DELIVERY_UNKNOWN':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <AlertTriangle className="w-3.5 h-3.5" />
            Статус доставки неизвестен
          </span>
        );
      case 'FAILED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <ShieldAlert className="w-3.5 h-3.5" />
            Ошибка
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded text-xs bg-slate-800 text-slate-400">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Просмотр события Outbox #{eventId}</h3>
              <p className="text-xs text-slate-400">Серверный предпросмотр текста SMS</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 overflow-y-auto max-h-[75vh]">
          {isLoading ? (
            <div className="py-12 text-center text-slate-400 space-y-3">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-400" />
              <p className="text-sm">Загрузка авторитетных данных сервера...</p>
            </div>
          ) : errorMessage ? (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold">Ошибка</h4>
                <p className="text-xs mt-1 text-rose-300">{errorMessage}</p>
              </div>
            </div>
          ) : previewData ? (
            <>
              {/* Event Metadata Banner */}
              <div className="bg-slate-950/60 rounded-xl p-4 border border-slate-800 space-y-2 text-xs text-slate-300">
                <div className="flex justify-between items-center pb-2 border-b border-slate-800/60">
                  <span className="font-semibold text-white">Тип уведомления:</span>
                  <span className="font-mono text-blue-400 font-bold">{eventObj.event_type}</span>
                </div>
                <div className="flex justify-between items-center pt-1">
                  <span className="text-slate-400">Статус:</span>
                  <div>{getStatusBadge(eventObj.status)}</div>
                </div>
                {eventObj.template_code && (
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Шаблон:</span>
                    <span className="font-mono text-slate-200">{eventObj.template_code}</span>
                  </div>
                )}
                {eventObj.created_at && (
                  <div className="flex justify-between items-center text-slate-400">
                    <span>Запланировано / Создано:</span>
                    <span className="font-mono text-slate-300">
                      {new Date(eventObj.created_at).toLocaleString('ru-RU')}
                    </span>
                  </div>
                )}
              </div>

              {/* Stale / Not Applicable Warning */}
              {!isApplicable && (
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-amber-300">Событие больше не актуально</h4>
                    <p className="mt-1 text-amber-200">
                      {previewData.cancelReason || 'Контекстные данные изменились (платёж оплачен, долг погашен или сделка/встреча отменена). Отправка заблокирована.'}
                    </p>
                  </div>
                </div>
              )}

              {/* Rendered SMS Text Box */}
              {isApplicable && (
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-300 flex justify-between items-center">
                    <span>Текст SMS к отправке (авторитетный серверный текст):</span>
                    <span className="text-[11px] font-mono text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                      {previewData.characterCount} симв. • {previewData.smsSegments} SMS {previewData.isUnicode ? '(Юникод)' : ''}
                    </span>
                  </label>
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-sm font-medium text-slate-100 leading-relaxed break-words shadow-inner">
                    {previewData.text}
                  </div>
                </div>
              )}

              {/* Success Banner */}
              {successMessage && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  {successMessage}
                </div>
              )}

              {/* Cancel Reason Input if cancelling */}
              {showCancelConfirm && (
                <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 space-y-3">
                  <h4 className="text-xs font-bold text-rose-300 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4" />
                    Подтвердите отмену сообщения
                  </h4>
                  <input
                    type="text"
                    placeholder="Причина отмены (необязательно)"
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
                  />
                  <div className="flex gap-2 justify-end">
                    <button
                      type="button"
                      onClick={() => setShowCancelConfirm(false)}
                      className="px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300 text-xs hover:bg-slate-800 transition cursor-pointer"
                    >
                      Назад
                    </button>
                    <button
                      type="button"
                      disabled={isCancelling}
                      onClick={handleCancelEvent}
                      className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                    >
                      {isCancelling ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Ban className="w-3.5 h-3.5" />}
                      Подтвердить отмену
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : null}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/50 flex items-center justify-between gap-3">
          {isAwaitingConfirmation && !showCancelConfirm && (
            <button
              type="button"
              onClick={() => setShowCancelConfirm(true)}
              disabled={isSending || isCancelling || isLoading}
              className="px-4 py-2 rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer"
            >
              <Ban className="w-4 h-4" />
              Не отправлять
            </button>
          )}

          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-800 hover:bg-slate-800 text-slate-300 text-xs font-medium transition cursor-pointer"
            >
              Закрыть
            </button>

            {isApplicable && !showCancelConfirm && (
              <button
                type="button"
                disabled={isSending || isLoading}
                onClick={handleConfirmSend}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-bold transition flex items-center gap-2 shadow-lg shadow-blue-500/20 cursor-pointer"
              >
                {isSending ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Отправка...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Отправить SMS</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
