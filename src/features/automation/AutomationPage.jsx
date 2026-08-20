import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import {
  Zap,
  Send,
  MessageSquare,
  Smartphone,
  CheckCircle2,
  AlertCircle,
  Clock,
  Settings,
  Bell,
  Check,
  Power,
  RotateCw,
  Eye,
  Plus,
  Radio,
  FileCode,
  Globe,
  Copy,
  Code2,
  Share2,
  ExternalLink,
  ShieldCheck,
  Play
} from 'lucide-react';

export const AutomationPage = () => {
  const [activeTab, setActiveTab] = useState('CHANNELS'); // 'CHANNELS', 'RULES', 'TEMPLATES', 'LOGS', 'WEBHOOKS'
  const [settings, setSettings] = useState(null);
  const [rules, setRules] = useState([]);
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState('');
  const [copiedUrl, setCopiedUrl] = useState(false);

  // Webhook Test Form state
  const [webhookTestForm, setWebhookTestForm] = useState({
    full_name: 'Шохин Рахмонов',
    phone: '+992927771234',
    source: 'INSTAGRAM',
    notes: 'Интересуется 3-комнатной квартирой в ЖК TOZON PLAZA',
  });
  const [isTestingWebhook, setIsTestingWebhook] = useState(false);
  const [webhookTestResult, setWebhookTestResult] = useState(null);

  // Test Modal / Form state
  const [testModalChannel, setTestModalChannel] = useState(null);
  const [testRecipient, setTestRecipient] = useState('');
  const [testMessage, setTestMessage] = useState('');
  const [isSendingTest, setIsSendingTest] = useState(false);

  const fetchAutomationData = async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/automation/settings');
      const data = res.data?.data || res.data || res;
      setSettings(data.settings);
      setRules(data.rules || []);
      setLogs(data.logs || []);
    } catch (err) {
      console.error('Error loading automation data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAutomationData();
  }, []);

  const handleToggleRule = async (ruleId) => {
    try {
      await api.patch(`/automation/rules/${ruleId}/toggle`);
      setRules((prev) =>
        prev.map((r) => (r.id === ruleId ? { ...r, isActive: !r.isActive } : r))
      );
    } catch (err) {
      alert(err.message || 'Ошибка изменения правила');
    }
  };

  const handleSaveSettings = async () => {
    try {
      setIsSaving(true);
      await api.post('/automation/settings', { settings, rules });
      setFeedbackMsg('Настройки каналов успешно сохранены!');
      setTimeout(() => setFeedbackMsg(''), 4000);
    } catch (err) {
      alert(err.message || 'Ошибка сохранения настроек');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSendTest = async (e) => {
    e.preventDefault();
    if (!testRecipient) return;

    try {
      setIsSendingTest(true);
      const res = await api.post('/automation/test-send', {
        channel: testModalChannel,
        recipient: testRecipient,
        message: testMessage || `Тестовое сообщение из Tozon CRM через ${testModalChannel}`,
      });

      setFeedbackMsg(res.message || `Сообщение отправлено в ${testModalChannel}!`);
      setTimeout(() => setFeedbackMsg(''), 4000);
      setTestModalChannel(null);
      fetchAutomationData();
    } catch (err) {
      alert(err.message || 'Ошибка отправки тестового сообщения');
    } finally {
      setIsSendingTest(false);
    }
  };

  const openTestModal = (channel) => {
    setTestModalChannel(channel);
    if (channel === 'TELEGRAM') {
      setTestRecipient(settings?.telegram?.chatId || '@tozon_sales_bot');
      setTestMessage('🔔 Tozon CRM: Проверка интеграции Telegram Bot. Система работает штатно!');
    } else if (channel === 'WHATSAPP') {
      setTestRecipient('+992 90 000 0000');
      setTestMessage('Здравствуйте! Это тестовое уведомление Tozon CRM через WhatsApp Business API.');
    } else if (channel === 'SMS') {
      setTestRecipient('+992 92 777 0000');
      setTestMessage('TOZON CRM: Тестовое SMS-сообщение. Шлюз подключен успешно.');
    }
  };

  const handleTestWebhook = async (e) => {
    e.preventDefault();
    try {
      setIsTestingWebhook(true);
      setWebhookTestResult(null);
      const res = await api.post('/leads/webhook', webhookTestForm);
      setWebhookTestResult({
        success: true,
        message: 'Лид успешно принят и сохранен в базу CRM!',
        data: res.data || res,
      });
      setFeedbackMsg('Тестовый лид из соцсети успешно принят в CRM!');
      setTimeout(() => setFeedbackMsg(''), 4000);
    } catch (err) {
      setWebhookTestResult({
        success: false,
        message: err.message || 'Ошибка обработки вебхука',
      });
    } finally {
      setIsTestingWebhook(false);
    }
  };

  const copyWebhookUrl = () => {
    const url = 'https://tozon-backend.onrender.com/api/leads/webhook';
    navigator.clipboard.writeText(url);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Zap className="h-7 w-7 text-amber-500 fill-amber-500/20" />
            <span>Автоматизация и Каналы связи</span>
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500">
            Настройка интеграций Telegram, WhatsApp, SMS-шлюзов, Webhook для сайта и соцсетей
          </p>
        </div>

        <div className="flex items-center gap-3">
          {feedbackMsg && (
            <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 px-3.5 py-1.5 text-xs font-bold text-emerald-800 animate-in fade-in">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <span>{feedbackMsg}</span>
            </div>
          )}

          <button
            onClick={handleSaveSettings}
            disabled={isSaving}
            className="flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 text-xs font-bold transition shadow-md cursor-pointer disabled:opacity-50"
          >
            <Settings className="h-4 w-4" />
            <span>{isSaving ? 'Сохранение...' : 'Сохранить изменения'}</span>
          </button>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-2">
        {[
          { id: 'CHANNELS', label: 'Каналы связи (Telegram / WhatsApp / SMS)', icon: Send },
          { id: 'WEBHOOKS', label: 'Интеграция с сайтом и соцсетями (Webhook)', icon: Globe },
          { id: 'RULES', label: 'Сценарии и Авто-правила', icon: Zap },
          { id: 'TEMPLATES', label: 'Шаблоны сообщений', icon: FileCode },
          { id: 'LOGS', label: 'Очередь и Логи отправки', icon: Clock },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-white text-blue-700 border border-slate-200 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100/70'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab 1: Channels & Adapters */}
      {activeTab === 'CHANNELS' && settings && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Telegram Channel Card */}
          <div className="rounded-3xl border border-blue-200 bg-white p-6 shadow-2xs space-y-4 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-500 text-white shadow-md shadow-blue-500/20">
                    <Send className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900">Telegram Bot</h3>
                    <span className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                      Подключен к CRM
                    </span>
                  </div>
                </div>
              </div>

              <p className="text-xs text-slate-500 leading-relaxed">
                Мгновенные оповещения менеджерам и руководителю о новых лидах, бронях и критических событиях.
              </p>

              <div className="space-y-3 pt-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Bot API Token</label>
                  <input
                    type="password"
                    value={settings.telegram.botToken}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        telegram: { ...settings.telegram, botToken: e.target.value },
                      })
                    }
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-mono text-slate-900 outline-none focus:border-blue-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">ID Группы / Чата для уведомлений</label>
                  <input
                    type="text"
                    value={settings.telegram.chatId}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        telegram: { ...settings.telegram, chatId: e.target.value },
                      })
                    }
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-mono text-slate-900 outline-none focus:border-blue-500 focus:bg-white"
                  />
                </div>
              </div>
            </div>

            <button
              onClick={() => openTestModal('TELEGRAM')}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-50 border border-blue-200 py-2.5 text-xs font-bold text-blue-700 hover:bg-blue-100 transition cursor-pointer"
            >
              <Send className="h-3.5 w-3.5" />
              <span>Тест отправки в Telegram</span>
            </button>
          </div>

          {/* WhatsApp Channel Card */}
          <div className="rounded-3xl border border-emerald-200 bg-white p-6 shadow-2xs space-y-4 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500 text-white shadow-md shadow-emerald-500/20">
                    <MessageSquare className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900">WhatsApp API</h3>
                    <span className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                      Green-API / WABA активен
                    </span>
                  </div>
                </div>
              </div>

              <p className="text-xs text-slate-500 leading-relaxed">
                Автоматическая рассылка покупателям графиков платежей, напоминаний о сроках и счетов в WhatsApp.
              </p>

              <div className="space-y-3 pt-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Instance ID</label>
                  <input
                    type="text"
                    value={settings.whatsapp.instanceId}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        whatsapp: { ...settings.whatsapp, instanceId: e.target.value },
                      })
                    }
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-mono text-slate-900 outline-none focus:border-emerald-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">API Token</label>
                  <input
                    type="password"
                    value={settings.whatsapp.apiToken}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        whatsapp: { ...settings.whatsapp, apiToken: e.target.value },
                      })
                    }
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-mono text-slate-900 outline-none focus:border-emerald-500 focus:bg-white"
                  />
                </div>
              </div>
            </div>

            <button
              onClick={() => openTestModal('WHATSAPP')}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 py-2.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100 transition cursor-pointer"
            >
              <MessageSquare className="h-3.5 w-3.5" />
              <span>Тест отправки в WhatsApp</span>
            </button>
          </div>

          {/* SMS Channel Card */}
          <div className="rounded-3xl border border-purple-200 bg-white p-6 shadow-2xs space-y-4 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-purple-600 text-white shadow-md shadow-purple-500/20">
                    <Smartphone className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900">SMS Центр</h3>
                    <span className="text-[11px] font-semibold text-purple-600 flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-purple-500 animate-pulse" />
                      Баланс: {settings.sms.balance}
                    </span>
                  </div>
                </div>
              </div>

              <p className="text-xs text-slate-500 leading-relaxed">
                Отправка официальных SMS-квитанций и чеков об оплате клиентам (OsonSMS / Babilon-T / Tcell).
              </p>

              <div className="space-y-3 pt-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">API Key / Шлюз</label>
                  <input
                    type="password"
                    value={settings.sms.apiKey}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        sms: { ...settings.sms, apiKey: e.target.value },
                      })
                    }
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-mono text-slate-900 outline-none focus:border-purple-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Имя отправителя (Sender ID)</label>
                  <input
                    type="text"
                    value={settings.sms.senderId}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        sms: { ...settings.sms, senderId: e.target.value },
                      })
                    }
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-900 outline-none focus:border-purple-500 focus:bg-white"
                  />
                </div>
              </div>
            </div>

            <button
              onClick={() => openTestModal('SMS')}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-purple-50 border border-purple-200 py-2.5 text-xs font-bold text-purple-700 hover:bg-purple-100 transition cursor-pointer"
            >
              <Smartphone className="h-3.5 w-3.5" />
              <span>Тест отправки SMS</span>
            </button>
          </div>
        </div>
      )}

      {/* Tab 2: Automation Rules */}
      {activeTab === 'RULES' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
            <span className="text-xs font-bold text-slate-700">
              Активных сценариев: {rules.filter((r) => r.isActive).length} из {rules.length}
            </span>
            <span className="text-xs text-slate-500">
              События срабатывают в фоновом режиме по расписанию
            </span>
          </div>

          <div className="space-y-3">
            {rules.map((rule) => (
              <div
                key={rule.id}
                className={`rounded-2xl border p-5 transition flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                  rule.isActive ? 'bg-white border-slate-200 shadow-2xs' : 'bg-slate-50 border-slate-200 opacity-60'
                }`}
              >
                <div className="space-y-1.5 max-w-2xl">
                  <div className="flex items-center gap-2.5">
                    <h4 className="text-sm font-extrabold text-slate-900">{rule.name}</h4>
                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase border ${
                        rule.channel === 'TELEGRAM'
                          ? 'bg-blue-50 text-blue-700 border-blue-200'
                          : rule.channel === 'WHATSAPP'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-purple-50 text-purple-700 border-purple-200'
                      }`}
                    >
                      {rule.channel}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-200 font-mono text-[11px]">
                    {rule.template}
                  </p>
                </div>

                <div className="flex items-center gap-4">
                  <button
                    onClick={() => handleToggleRule(rule.id)}
                    className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition cursor-pointer ${
                      rule.isActive
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                    }`}
                  >
                    <Power className="h-3.5 w-3.5" />
                    <span>{rule.isActive ? 'Включено' : 'Выключено'}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Message Templates */}
      {activeTab === 'TEMPLATES' && (
        <div className="rounded-3xl bg-white border border-slate-200 p-6 shadow-2xs space-y-6">
          <div>
            <h3 className="text-base font-extrabold text-slate-900">Редактирование шаблонов сообщений</h3>
            <p className="text-xs text-slate-500 mt-1">
              Доступные переменные для подстановки: <code className="bg-slate-100 px-1.5 py-0.5 rounded text-blue-700 font-bold">{'{{customerName}}'}</code>, <code className="bg-slate-100 px-1.5 py-0.5 rounded text-blue-700 font-bold">{'{{amount}}'}</code>, <code className="bg-slate-100 px-1.5 py-0.5 rounded text-blue-700 font-bold">{'{{dueDate}}'}</code>, <code className="bg-slate-100 px-1.5 py-0.5 rounded text-blue-700 font-bold">{'{{contractNumber}}'}</code>, <code className="bg-slate-100 px-1.5 py-0.5 rounded text-blue-700 font-bold">{'{{projectName}}'}</code>
            </p>
          </div>

          <div className="space-y-4">
            {rules.map((rule, idx) => (
              <div key={rule.id} className="rounded-2xl bg-slate-50 border border-slate-200 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">{rule.name} ({rule.channel})</span>
                </div>
                <textarea
                  rows={2}
                  value={rule.template}
                  onChange={(e) => {
                    const newRules = [...rules];
                    newRules[idx].template = e.target.value;
                    setRules(newRules);
                  }}
                  className="w-full rounded-xl border border-slate-300 bg-white p-3 text-xs text-slate-900 outline-none focus:border-blue-500 font-mono"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 4: Dispatch Logs */}
      {activeTab === 'LOGS' && (
        <div className="rounded-3xl bg-white border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-slate-900">Журнал отправленных уведомлений</h3>
            <span className="text-xs text-slate-500">Всего записей: {logs.length}</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                <tr>
                  <th className="p-3.5 pl-5">Время</th>
                  <th className="p-3.5">Канал</th>
                  <th className="p-3.5">Получатель</th>
                  <th className="p-3.5">Текст сообщения</th>
                  <th className="p-3.5 text-right pr-5">Статус</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 transition">
                    <td className="p-3.5 pl-5 text-slate-500 whitespace-nowrap">
                      {new Date(log.sentAt).toLocaleString('ru-RU')}
                    </td>
                    <td className="p-3.5 font-bold">
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] uppercase border ${
                          log.channel === 'TELEGRAM'
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : log.channel === 'WHATSAPP'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-purple-50 text-purple-700 border-purple-200'
                        }`}
                      >
                        {log.channel}
                      </span>
                    </td>
                    <td className="p-3.5 font-semibold text-slate-900">{log.recipient}</td>
                    <td className="p-3.5 text-slate-600 max-w-md truncate" title={log.message}>
                      {log.message}
                    </td>
                    <td className="p-3.5 text-right pr-5">
                      <span className="inline-flex items-center gap-1 text-emerald-700 font-bold text-[11px]">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                        <span>Доставлено</span>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: WEBHOOKS & SOCIAL INTEGRATION */}
      {activeTab === 'WEBHOOKS' && (
        <div className="space-y-6">
          {/* Main Webhook URL Card */}
          <div className="rounded-3xl border border-blue-200 bg-gradient-to-br from-blue-50/60 to-white p-6 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-blue-100 px-2.5 py-1 text-[11px] font-extrabold text-blue-700 uppercase tracking-wider mb-2">
                  <Globe className="h-3.5 w-3.5" />
                  Публичный API шлюз для заявок
                </span>
                <h3 className="text-lg font-extrabold text-slate-900">
                  Webhook URL для сайта и соцсетей
                </h3>
                <p className="text-xs text-slate-600 mt-1 max-w-2xl">
                  Укажите этот URL в формах на сайте (Tilda, WordPress), в интеграциях Facebook / Instagram Lead Ads, или Telegram-боте для автоматического приема новых лидов.
                </p>
              </div>

              <button
                onClick={copyWebhookUrl}
                className="flex items-center gap-2 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 text-xs font-bold transition shadow-md cursor-pointer shrink-0"
              >
                {copiedUrl ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                <span>{copiedUrl ? 'Скопировано!' : 'Копировать Webhook URL'}</span>
              </button>
            </div>

            <div className="flex items-center gap-3 rounded-2xl bg-slate-900 p-3.5 text-white font-mono text-xs overflow-x-auto">
              <span className="text-emerald-400 font-bold select-none">POST</span>
              <span className="text-slate-200 select-all">https://tozon-backend.onrender.com/api/leads/webhook</span>
            </div>
          </div>

          {/* 4 Social & Site Integration Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Card 1: Instagram & Facebook */}
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-2xs space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 text-white shadow-xs">
                  <Share2 className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Instagram & Facebook Lead Ads</h4>
                  <p className="text-[11px] text-slate-500">Заявки из рекламных лид-форм Meta</p>
                </div>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Подключите через коннектор <strong>Albato</strong> или <strong>Make.com</strong>. При заполнении клиентом формы в Instagram данные моментально отправляются в CRM с меткой <code className="bg-slate-100 px-1.5 py-0.5 rounded text-blue-600 font-mono">source: "INSTAGRAM"</code>.
              </p>
              <div className="rounded-xl bg-slate-50 p-3 text-[11px] text-slate-500 space-y-1 font-medium">
                <div>✓ Авто-создание Лида со статусом NEW</div>
                <div>✓ Авто-задача менеджеру: «Первичный звонок»</div>
              </div>
            </div>

            {/* Card 2: Telegram Bot */}
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-2xs space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-500 text-white shadow-xs">
                  <Send className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Telegram Bot застройщика</h4>
                  <p className="text-[11px] text-slate-500">Заявки и каталог планировок в Telegram</p>
                </div>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Клиент нажимает «Оставить заявку» или делится номером телефона в боте. Бот отправляет данные в CRM с источником <code className="bg-slate-100 px-1.5 py-0.5 rounded text-sky-600 font-mono">source: "TELEGRAM"</code>.
              </p>
              <div className="rounded-xl bg-slate-50 p-3 text-[11px] text-slate-500 space-y-1 font-medium">
                <div>✓ Мгновенное оповещение в рабочий Telegram-чат</div>
                <div>✓ Автоматическая фиксация номера телефона</div>
              </div>
            </div>

            {/* Card 3: WhatsApp Business */}
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-2xs space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-xs">
                  <MessageSquare className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">WhatsApp Business</h4>
                  <p className="text-[11px] text-slate-500">Чат-боты и лиды по рекламе в WhatsApp</p>
                </div>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Через Green API или Meta Cloud API новое входящее обращение регистрируется как лид с источником <code className="bg-slate-100 px-1.5 py-0.5 rounded text-emerald-600 font-mono">source: "WHATSAPP"</code>.
              </p>
              <div className="rounded-xl bg-slate-50 p-3 text-[11px] text-slate-500 space-y-1 font-medium">
                <div>✓ Прямая ссылка для звонка и переписки из CRM</div>
                <div>✓ Привязка истории сообщений</div>
              </div>
            </div>

            {/* Card 4: Сайт / Tilda / WordPress */}
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-2xs space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-xs">
                  <Globe className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Сайт застройщика (Tilda / Landing)</h4>
                  <p className="text-[11px] text-slate-500">Формы обратной связи и бронирования</p>
                </div>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                В настройках форм на Tilda выберите «Webhook» и вставьте URL выше. Заявки с выбором комнатности и этажа попадают в CRM моментально.
              </p>
              <div className="rounded-xl bg-slate-50 p-3 text-[11px] text-slate-500 space-y-1 font-medium">
                <div>✓ Фиксация выбранного ЖК и бюджета</div>
                <div>✓ Передача UTM-меток маркетинга</div>
              </div>
            </div>
          </div>

          {/* Interactive Webhook Simulator / Tester */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <Play className="h-4 w-4 text-blue-600 fill-blue-600" />
                  <span>Симулятор входящей заявки (Онлайн-тест)</span>
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Отправьте тестовый запрос, чтобы проверить, как лид из соцсети создается в БД и ставится в задачи
                </p>
              </div>
            </div>

            <form onSubmit={handleTestWebhook} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">ФИО клиента</label>
                <input
                  type="text"
                  required
                  value={webhookTestForm.full_name}
                  onChange={(e) => setWebhookTestForm({ ...webhookTestForm, full_name: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs outline-none focus:border-blue-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Телефон</label>
                <input
                  type="text"
                  required
                  value={webhookTestForm.phone}
                  onChange={(e) => setWebhookTestForm({ ...webhookTestForm, phone: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs outline-none focus:border-blue-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Источник</label>
                <select
                  value={webhookTestForm.source}
                  onChange={(e) => setWebhookTestForm({ ...webhookTestForm, source: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs outline-none focus:border-blue-500 focus:bg-white font-semibold text-blue-700"
                >
                  <option value="INSTAGRAM">Instagram</option>
                  <option value="TELEGRAM">Telegram</option>
                  <option value="WHATSAPP">WhatsApp</option>
                  <option value="FACEBOOK">Facebook Lead Ads</option>
                  <option value="WEBSITE">Заявка с сайта</option>
                </select>
              </div>

              <div className="flex items-end">
                <button
                  type="submit"
                  disabled={isTestingWebhook}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 text-xs font-bold transition shadow-md cursor-pointer disabled:opacity-50"
                >
                  <Play className="h-3.5 w-3.5 fill-white" />
                  <span>{isTestingWebhook ? 'Отправка...' : 'Отправить в CRM'}</span>
                </button>
              </div>
            </form>

            {webhookTestResult && (
              <div
                className={`p-4 rounded-2xl border text-xs animate-in fade-in ${
                  webhookTestResult.success
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : 'bg-rose-50 border-rose-200 text-rose-900'
                }`}
              >
                <div className="flex items-center gap-2 font-bold mb-1">
                  {webhookTestResult.success ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-rose-600" />
                  )}
                  <span>{webhookTestResult.message}</span>
                </div>
                <p className="text-[11px] text-slate-600">
                  Лид автоматически появился в <strong>«Лиды»</strong> со статусом <code>NEW</code>, а в <strong>«Задачи»</strong> поступило задание ответственному менеджеру.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Test Modal */}
      {testModalChannel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
          <div className="relative w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-extrabold text-slate-900">
                Тест отправки ({testModalChannel})
              </h3>
              <button
                onClick={() => setTestModalChannel(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSendTest} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Получатель (Телефон / Chat ID / @username) *
                </label>
                <input
                  type="text"
                  required
                  value={testRecipient}
                  onChange={(e) => setTestRecipient(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2 text-xs outline-none focus:border-blue-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Текст тестового сообщения
                </label>
                <textarea
                  rows={3}
                  required
                  value={testMessage}
                  onChange={(e) => setTestMessage(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 p-3 text-xs outline-none focus:border-blue-500 focus:bg-white"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setTestModalChannel(null)}
                  className="rounded-xl px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={isSendingTest}
                  className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2 text-xs font-bold text-white shadow-md hover:bg-blue-700 transition disabled:opacity-50"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>{isSendingTest ? 'Отправка...' : 'Отправить'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
