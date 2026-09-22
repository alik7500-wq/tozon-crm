import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { X, Send, MessageSquare, AlertCircle, CheckCircle, Sparkles } from 'lucide-react';

export function SendSmsModal({ isOpen, onClose, client, onSuccess }) {
  const [text, setText] = useState('');
  const [templates, setTemplates] = useState([]);
  const [selectedTemplateCode, setSelectedTemplateCode] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState(null);
  const [successResult, setSuccessResult] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setText('');
      setError(null);
      setSuccessResult(null);
      setSelectedTemplateCode('');
      fetchTemplates();
    }
  }, [isOpen]);

  const fetchTemplates = async () => {
    try {
      const res = await api.get('/sms/templates');
      if (res.success && Array.isArray(res.data)) {
        setTemplates(res.data);
      }
    } catch (err) {
      console.warn('Не удалось загрузить шаблоны SMS:', err);
    }
  };

  const handleTemplateSelect = (code) => {
    setSelectedTemplateCode(code);
    const tmpl = templates.find((t) => t.code === code);
    if (tmpl) {
      let filledText = tmpl.text;
      if (client?.full_name) {
        filledText = filledText.replace(/\{\{client_name\}\}/g, client.full_name);
      }
      setText(filledText);
    }
  };

  if (!isOpen || !client) return null;

  const charCount = text.length;
  // Standard Cyrillic SMS limits: 70 chars per SMS segment
  const isCyrillic = /[а-яА-ЯёЁ]/i.test(text);
  const maxSegmentLen = isCyrillic ? 70 : 160;
  const smsSegments = charCount === 0 ? 0 : Math.ceil(charCount / maxSegmentLen);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!text.trim()) {
      setError('Введите текст сообщения');
      return;
    }

    setIsSending(true);
    setError(null);
    setSuccessResult(null);

    try {
      const res = await api.post('/sms/send', {
        clientId: client.id,
        phone: client.phone,
        text: text.trim()
      });

      if (res.success) {
        setSuccessResult(res.data);
        if (onSuccess) onSuccess(res.data);
        setTimeout(() => {
          onClose();
        }, 1800);
      } else {
        setError(res.error?.message || 'Не удалось отправить SMS');
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
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
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
              <span className="font-medium text-slate-200 truncate block">{client.full_name || 'Не указано'}</span>
            </div>
            <div>
              <span className="text-xs text-slate-500 block mb-0.5">Телефон</span>
              <span className="font-mono text-emerald-400 font-medium block">{client.phone || client.secondary_phone || 'Номер отсутствует'}</span>
            </div>
          </div>

          {/* Template Selector */}
          {templates.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                Выбрать шаблон сообщения
              </label>
              <select
                value={selectedTemplateCode}
                onChange={(e) => handleTemplateSelect(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500 transition-colors"
              >
                <option value="">-- Своё сообщение --</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.code}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Message Textarea */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-xs font-medium text-slate-300">Текст сообщения</label>
              <span className="text-xs text-slate-500 font-mono">
                {charCount} симв. ({smsSegments} SMS)
              </span>
            </div>
            <textarea
              rows={4}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Введите текст сообщения клиенту..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all resize-none"
            />
          </div>

          {/* Error Banner */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Success Banner */}
          {successResult && (
            <div className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-xs">
              <CheckCircle className="w-4 h-4 shrink-0" />
              <span>
                {successResult.isMock
                  ? 'Сообщение успешно обработано (Тестовый режим Payom)'
                  : 'SMS успешно отправлено через Payom.tj!'}
              </span>
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-end space-x-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSending}
              className="px-4 py-2 rounded-xl border border-slate-800 text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-colors disabled:opacity-50"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={isSending || !text.trim()}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors shadow-lg shadow-blue-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSending ? (
                <span>Отправка...</span>
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
