import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { X, Send, MessageSquare, AlertCircle, CheckCircle, Sparkles } from 'lucide-react';

function formatPhoneDisplay(rawPhone) {
  if (!rawPhone || typeof rawPhone !== 'string') return 'Номер отсутствует';
  let cleaned = rawPhone.trim().replace(/[\s\-\(\)\.]/g, '');
  if (cleaned.startsWith('00992')) cleaned = '+' + cleaned.slice(2);
  else if (cleaned.startsWith('8992')) cleaned = '+' + cleaned.slice(1);
  if (!cleaned.startsWith('+')) {
    const digitsOnly = cleaned.replace(/\D/g, '');
    if (digitsOnly.length === 9) cleaned = '+992' + digitsOnly;
    else if (digitsOnly.length === 12 && digitsOnly.startsWith('992')) cleaned = '+' + digitsOnly;
    else cleaned = '+' + digitsOnly;
  }
  return cleaned;
}

// Built-in fallback templates by context
const CONTEXT_TEMPLATES = {
  lead: [
    { code: 'CLIENT_WELCOME', name: 'Приветствие клиента', text: 'Здравствуйте, {{client_name}}! Спасибо за обращение в отдел продаж ЖК TOZON-PLAZA.' },
    { code: 'MEETING_REMINDER', name: 'Напоминание о встрече', text: 'Здравствуйте, {{client_name}}! Напоминаем о запланированной встрече {{meeting_date}} в {{meeting_time}}. TOZON-PLAZA.' }
  ],
  client: [
    { code: 'CLIENT_WELCOME', name: 'Приветствие клиента', text: 'Здравствуйте, {{client_name}}! Спасибо за обращение в ЖК TOZON-PLAZA.' },
    { code: 'MEETING_REMINDER', name: 'Напоминание о встрече', text: 'Здравствуйте, {{client_name}}! Напоминаем о запланированной встрече {{meeting_date}} в {{meeting_time}}. TOZON-PLAZA.' }
  ],
  deal: [
    { code: 'DEAL_INFO', name: 'Сообщение по договору', text: 'Здравствуйте, {{client_name}}! Информация по вашему договору №{{contract_number}} (кв. №{{apartment}}, {{project_name}}). TOZON-PLAZA.' },
    { code: 'PAYMENT_REMINDER', name: 'Напоминание об оплате', text: 'Здравствуйте, {{client_name}}! Напоминаем об очередной оплате по договору №{{contract_number}} в размере {{payment_amount}} {{currency}} до {{payment_date}}. TOZON-PLAZA.' }
  ],
  debtor: [
    { code: 'DEBTOR_REMINDER', name: 'Напоминание о задолженности', text: 'Уважаемый(ая) {{client_name}}! Просим внести просроченную оплату {{overdue_amount}} {{currency}} по договору №{{contract_number}}. TOZON-PLAZA.' }
  ]
};

const CONTEXT_MAPPING = {
  lead: ['CLIENT_WELCOME', 'MEETING_REMINDER'],
  client: ['CLIENT_WELCOME', 'MEETING_REMINDER'],
  deal: ['DEAL_INFO', 'PAYMENT_REMINDER'],
  debtor: ['DEBTOR_REMINDER']
};

export function SendSmsModal({ isOpen, onClose, client, context = 'lead', onSuccess }) {
  const [text, setText] = useState('');
  const [templates, setTemplates] = useState([]);
  const [selectedTemplateCode, setSelectedTemplateCode] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successResult, setSuccessResult] = useState(null);

  const displayPhone = formatPhoneDisplay(client?.phone || client?.secondary_phone);

  useEffect(() => {
    if (isOpen) {
      setText('');
      setError(null);
      setSuccessResult(null);
      setSelectedTemplateCode('');
      setIsPreviewLoading(false);
      fetchTemplates();
    }
  }, [isOpen, context]);

  const fetchTemplates = async () => {
    const allowedCodes = CONTEXT_MAPPING[context] || CONTEXT_MAPPING.lead;
    const defaults = (CONTEXT_TEMPLATES[context] || CONTEXT_TEMPLATES.lead).filter((t) => allowedCodes.includes(t.code));

    try {
      const res = await api.get('/sms/templates');
      let loaded = [];
      if (res.success && Array.isArray(res.data)) {
        loaded = res.data;
      }

      const mergedMap = new Map();
      defaults.forEach((t) => mergedMap.set(t.code, t));

      loaded
        .filter((t) => allowedCodes.includes(t.code) && t.code !== 'CUSTOM_MESSAGE')
        .forEach((t) => {
          if (t.text && t.text !== '{{text}}') {
            mergedMap.set(t.code, t);
          }
        });

      setTemplates(Array.from(mergedMap.values()));
    } catch (err) {
      console.warn('Не удалось загрузить шаблоны SMS:', err);
      setTemplates(defaults);
    }
  };

  const handleTemplateSelect = async (code) => {
    setSelectedTemplateCode(code);
    setError(null);
    setSuccessResult(null);

    if (!code || code === 'CUSTOM_MESSAGE' || code === 'DEFAULT') {
      setText('');
      return;
    }

    const clientId = client?.id || client?.clientId || client?.lead_id || null;
    const dealId = client?.deal_id || client?.dealId || null;
    const taskId = client?.task_id || client?.taskId || client?.meeting_id || client?.meetingId || null;

    setIsPreviewLoading(true);
    try {
      const res = await api.post('/sms/preview', {
        templateCode: code,
        clientId,
        dealId,
        taskId
      });

      if (res.success && res.data?.text) {
        setText(res.data.text);
      } else {
        const errorMsg = typeof res.error === 'string' ? res.error : res.error?.message || 'Не удалось сформировать предпросмотр шаблона';
        setError(errorMsg);
        setText('');
      }
    } catch (err) {
      setError(err.message || 'Ошибка генерации предпросмотра SMS');
      setText('');
    } finally {
      setIsPreviewLoading(false);
    }
  };

  if (!isOpen || !client) return null;

  const fullName = client.full_name || client.name || 'Не указано';
  const charCount = text.length;

  // SMS standard calculation:
  // Unicode (Cyrillic): single <= 70, multi-part = Math.ceil(len / 67)
  // GSM-7 (ASCII): single <= 160, multi-part = Math.ceil(len / 153)
  const isUnicode = /[^\u0000-\u007F]/.test(text);
  let smsSegments = 0;
  if (charCount > 0) {
    if (isUnicode) {
      smsSegments = charCount <= 70 ? 1 : Math.ceil(charCount / 67);
    } else {
      smsSegments = charCount <= 160 ? 1 : Math.ceil(charCount / 153);
    }
  }

  const getCharLabel = (count) => {
    const mod10 = count % 10;
    const mod100 = count % 100;
    if (mod100 >= 11 && mod100 <= 19) return 'символов';
    if (mod10 === 1) return 'символ';
    if (mod10 >= 2 && mod10 <= 4) return 'символа';
    return 'символов';
  };

  const counterDisplay = `${charCount} ${getCharLabel(charCount)} • ${smsSegments} SMS`;

  // Unresolved placeholder detection: generic protection blocking ANY {{anything}}
  const unresolvedMatch = text.match(/\{\{[^{}]+\}\}/);
  const hasUnresolvedPlaceholder = Boolean(unresolvedMatch);

  const handleSend = async (e) => {
    e.preventDefault();
    if (isSending || hasUnresolvedPlaceholder) return; // Prevent double submission / invalid placeholder
    if (!text.trim()) {
      setError('Введите текст сообщения');
      return;
    }

    setIsSending(true);
    setError(null);
    setSuccessResult(null);

    try {
      const res = await api.post('/sms/send', {
        clientId: client.id || client.clientId || client.lead_id || null,
        phone: displayPhone,
        text: text.trim(),
        dealId: client.deal_id || client.dealId || null
      });

      if (res.success) {
        setSuccessResult(res.data);
        if (onSuccess) onSuccess(res.data);
        setTimeout(() => {
          onClose();
        }, 1200);
      } else {
        const errorMsg = typeof res.error === 'string' ? res.error : res.error?.message || 'Не удалось отправить SMS';
        setError(errorMsg);
      }
    } catch (err) {
      setError(err.message || 'Ошибка подключения к серверу');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden text-slate-100">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/50">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Отправить SMS сообщение</h3>
              <p className="text-xs text-slate-400">Провайдер Payom.tj • Имя отправителя: <span className="font-mono text-blue-400 font-medium">TOZON-PLAZA</span></p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSending}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSend} className="p-6 space-y-4">
          
          {/* Recipient Details */}
          <div className="grid grid-cols-2 gap-4 bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80 text-sm">
            <div>
              <span className="text-xs text-slate-500 block mb-0.5">Получатель (ФИО)</span>
              <span
                className="font-medium text-slate-200 truncate block cursor-help"
                title={fullName}
              >
                {fullName}
              </span>
            </div>
            <div>
              <span className="text-xs text-slate-500 block mb-0.5">Телефон</span>
              <span className="font-mono text-emerald-400 font-medium block">{displayPhone}</span>
            </div>
          </div>

          {/* Template Selector */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              Выбрать шаблон сообщения ({context.toUpperCase()})
            </label>
            <select
              value={selectedTemplateCode}
              onChange={(e) => handleTemplateSelect(e.target.value)}
              disabled={isSending || isPreviewLoading}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500 transition-colors disabled:opacity-50"
            >
              <option value="">-- Своё сообщение --</option>
              {templates.map((t) => (
                <option key={t.id || t.code} value={t.code}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          {/* Message Textarea */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-xs font-medium text-slate-300">Текст сообщения</label>
              <span className="text-xs text-slate-400 font-mono">
                {isPreviewLoading ? 'Загрузка...' : counterDisplay}
              </span>
            </div>
            <textarea
              rows={4}
              value={text}
              disabled={isSending || isPreviewLoading}
              onChange={(e) => setText(e.target.value)}
              placeholder={isPreviewLoading ? 'Загрузка шаблона...' : 'Введите текст сообщения клиенту...'}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all resize-none disabled:opacity-50"
            />
          </div>

          {/* Unresolved Placeholder Protection Warning */}
          {hasUnresolvedPlaceholder && !isPreviewLoading && (
            <div className="flex items-center gap-2 p-3 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-xl text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>Не все данные шаблона заполнены: <strong className="font-mono">{unresolvedMatch[0]}</strong></span>
            </div>
          )}

          {/* High SMS Segment Warning */}
          {smsSegments >= 3 && !hasUnresolvedPlaceholder && !isPreviewLoading && (
            <div className="flex items-center gap-2 p-2.5 bg-blue-500/10 border border-blue-500/20 text-blue-300 rounded-xl text-xs">
              <Sparkles className="w-4 h-4 shrink-0 text-blue-400" />
              <span>Сообщение будет отправлено как {smsSegments} SMS-сегмента(ов).</span>
            </div>
          )}

          {/* Error Banner */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Success Banner */}
          {successResult && (
            <div className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-xs animate-in fade-in">
              <CheckCircle className="w-4 h-4 shrink-0" />
              <span>SMS отправлено</span>
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-end space-x-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSending || isPreviewLoading}
              className="px-4 py-2 rounded-xl border border-slate-800 text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-colors disabled:opacity-50"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={isSending || isPreviewLoading || !text.trim() || hasUnresolvedPlaceholder}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors shadow-lg shadow-blue-600/20 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isSending ? (
                <span>Отправка...</span>
              ) : isPreviewLoading ? (
                <span>Загрузка...</span>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Отправить SMS</span>
                </>
              )}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
