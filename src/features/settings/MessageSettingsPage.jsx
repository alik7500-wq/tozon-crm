import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  MessageSquare,
  ChevronRight,
  Settings2,
  FileText,
  History,
  ArrowLeft,
  X,
  ShieldCheck,
} from "lucide-react";
import { api } from "../../api/client";
const button =
  "rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50";
const input =
  "w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-blue-500";
export function TemplateEditor({ template, onClose, onSaved }) {
  const [name, setName] = useState(template.name),
    [text, setText] = useState(template.text),
    [active, setActive] = useState(template.is_active),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await api.put(`/sms/settings/templates/${template.id}`, {
        name,
        text,
        is_active: active,
        updated_at: template.updated_at,
      });
      onSaved(res.data);
      onClose();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <form
        onSubmit={save}
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white p-6 shadow-xl space-y-4"
      >
        <div className="flex justify-between">
          <h2 className="text-xl font-bold">Шаблон сообщения</h2>
          <button type="button" aria-label="Закрыть" onClick={onClose}>
            <X />
          </button>
        </div>
        <label className="block text-sm">
          Название
          <input
            required
            maxLength={150}
            className={input}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <label className="block text-sm">
          Текст сообщения
          <textarea
            required
            rows={6}
            maxLength={2000}
            className={input}
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
        </label>
        <p className="text-xs text-slate-500">
          Нажмите на переменную, чтобы добавить данные клиента.
        </p>
        <div className="flex flex-wrap gap-2">
          {(template.variables || []).map((v) => (
            <button
              type="button"
              className="rounded-lg bg-blue-50 px-2 py-1 text-xs text-blue-700"
              key={v}
              onClick={() => setText((t) => t + " {{" + v + "}}")}
            >
              {"{{" + v + "}}"}
            </button>
          ))}
        </div>
        <p className="text-xs text-slate-500">
          {text.length} символов. Кириллица: до 70 символов в одном SMS, до 67 в
          каждой части длинного сообщения. Точное количество частей
          рассчитывается при предпросмотре.
        </p>
        <label className="flex gap-2 text-sm">
          <input
            type="checkbox"
            checked={active}
            onChange={(e) => setActive(e.target.checked)}
          />
          Шаблон доступен для отправки
        </label>
        {error && (
          <p role="alert" className="text-red-600">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-3">
          <button type="button" onClick={onClose}>
            Отмена
          </button>
          <button disabled={busy} className={button}>
            {busy ? "Сохранение…" : "Сохранить шаблон"}
          </button>
        </div>
      </form>
    </div>
  );
}
export function TemplateList({ templates, onEdit }) {
  return (
    <div className="space-y-3">
      {templates.map((t) => (
        <article
          key={t.id}
          className="rounded-2xl border border-slate-200 bg-white p-5"
        >
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-bold text-slate-900">{t.name}</h3>
            {onEdit && (
              <button
                className="text-sm font-semibold text-blue-600"
                onClick={() => onEdit(t)}
              >
                Изменить
              </button>
            )}
          </div>
          <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">
            {t.text}
          </p>
          <p className="mt-3 text-xs text-slate-400">
            {t.is_active ? "Доступен" : "Отключён"}
          </p>
        </article>
      ))}
    </div>
  );
}
export const MessageSettingsPage = () => {
  const [data, setData] = useState(null),
    [error, setError] = useState(""),
    [tab, setTab] = useState("events"),
    [expanded, setExpanded] = useState(null),
    [editing, setEditing] = useState(null),
    [busy, setBusy] = useState(null),
    [history, setHistory] = useState([]);
  async function load() {
    setError("");
    try {
      const res = await api.get("/sms/settings");
      setData(res.data);
    } catch (e) {
      setError(e.message);
    }
  }
  useEffect(() => {
    load();
  }, []);
  async function save(rule, patch) {
    setBusy(rule.event_type);
    setError("");
    try {
      const res = await api.put(`/sms/settings/rules/${rule.event_type}`, {
        enabled: rule.enabled,
        mode: rule.mode,
        offset_days: rule.offset_days,
        repeat_days: rule.repeat_days,
        version: rule.version,
        ...patch,
      });
      setData((d) => ({
        ...d,
        rules: d.rules.map((r) =>
          r.event_type === rule.event_type ? res.data : r,
        ),
      }));
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(null);
    }
  }
  async function selectTab(value) {
    setTab(value);
    if (value === "audit") {
      try {
        const res = await api.get("/sms/settings/history");
        setHistory(res.data);
      } catch (e) {
        setError(e.message);
      }
    }
  }
  const groups = ["Бронь", "Договор", "Платежи", "Другой", "Задолженность"];
  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-16">
      <Link
        to="/settings"
        className="inline-flex items-center gap-2 text-sm text-slate-500"
      >
        <ArrowLeft size={16} />
        Настройки
      </Link>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-3 text-2xl font-extrabold text-slate-900">
            <MessageSquare className="text-blue-600" />
            Настройки сообщений
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Уведомления клиентам по событиям вашего сервиса
          </p>
        </div>
        <Link
          className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold"
          to="/crm/sms-notifications"
        >
          Очередь и история SMS
        </Link>
      </div>
      {error && (
        <div role="alert" className="rounded-xl bg-red-50 p-4 text-red-700">
          {error}{" "}
          <button className="underline" onClick={load}>
            Обновить
          </button>
        </div>
      )}
      {!data && !error && <p>Загрузка настроек…</p>}
      {data && (
        <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
          <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-2">
            {[
              ["events", "Отправка сообщений", MessageSquare],
              ["templates", "Шаблоны сообщений", FileText],
              ["system", "Система сообщений", Settings2],
              ["audit", "История настроек", History],
            ].map(([id, label, Icon]) => (
              <button
                key={id}
                onClick={() => selectTab(id)}
                className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold ${tab === id ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-50"}`}
              >
                <Icon size={18} />
                {label}
              </button>
            ))}
          </aside>
          <main className="space-y-5">
            {tab === "events" && (
              <>
                <div className="flex gap-3 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-800">
                  <ShieldCheck className="shrink-0" size={20} />
                  <p>
                    Новые сообщения поступают в очередь и отправляются после
                    подтверждения. Переключатели сохраняются сразу. Изменения
                    действуют на будущие события и ещё не отправленные
                    сообщения.
                  </p>
                </div>
                {groups.map((group) => (
                  <section
                    key={group}
                    className="overflow-hidden rounded-2xl border border-slate-200 bg-white"
                  >
                    <h2 className="border-b border-slate-100 bg-slate-50 px-5 py-3 text-sm font-bold text-slate-900">
                      {group}
                    </h2>
                    {data.rules
                      .filter((r) => r.group_name === group)
                      .map((rule) => {
                        const template = data.templates.find(
                          (t) => t.code === rule.template_code,
                        );
                        return (
                          <div
                            key={rule.event_type}
                            className="border-b border-slate-100 last:border-0"
                          >
                            <div className="flex items-center gap-4 px-5 py-4">
                              <button
                                type="button"
                                role="switch"
                                aria-checked={rule.enabled}
                                aria-label={rule.name}
                                disabled={busy === rule.event_type}
                                onClick={() =>
                                  save(rule, { enabled: !rule.enabled })
                                }
                                className={`relative h-6 w-11 shrink-0 rounded-full transition disabled:opacity-50 ${rule.enabled ? "bg-blue-600" : "bg-slate-200"}`}
                              >
                                <span
                                  className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition ${rule.enabled ? "left-6" : "left-1"}`}
                                />
                              </button>
                              <button
                                onClick={() =>
                                  setExpanded(
                                    expanded === rule.event_type
                                      ? null
                                      : rule.event_type,
                                  )
                                }
                                className="flex flex-1 items-center justify-between gap-3 text-left"
                              >
                                <span>
                                  <span className="block text-sm font-semibold text-slate-800">
                                    {rule.name}
                                  </span>
                                  <span className="mt-1 block text-xs text-slate-400">
                                    {rule.enabled ? "Включено" : "Выключено"} ·{" "}
                                    {rule.event_type === "PAYMENT_REMINDER" &&
                                    rule.mode === "INHERIT" &&
                                    data.system.automaticEnabled
                                      ? "Действующий автоматический режим"
                                      : "С подтверждением"}
                                  </span>
                                </span>
                                <ChevronRight
                                  size={18}
                                  className={
                                    expanded === rule.event_type
                                      ? "rotate-90 text-blue-600"
                                      : "text-slate-400"
                                  }
                                />
                              </button>
                            </div>
                            {expanded === rule.event_type && (
                              <div className="space-y-4 bg-slate-50 px-5 pb-5 pt-2">
                                {[
                                  "PAYMENT_REMINDER",
                                  "RESERVATION_EXPIRING",
                                ].includes(rule.event_type) && (
                                  <label className="block text-sm text-slate-600">
                                    За сколько дней напоминать
                                    <input
                                      aria-label="За сколько дней"
                                      type="number"
                                      min={0}
                                      max={30}
                                      defaultValue={rule.offset_days}
                                      key={rule.version}
                                      onBlur={(e) => {
                                        const n = Number(e.target.value);
                                        if (
                                          Number.isInteger(n) &&
                                          n >= 0 &&
                                          n <= 30 &&
                                          n !== rule.offset_days
                                        )
                                          save(rule, { offset_days: n });
                                      }}
                                      className={`${input} mt-1 max-w-32`}
                                    />
                                  </label>
                                )}
                                {rule.event_type === "DEBTOR_REMINDER" && (
                                  <label className="block text-sm text-slate-600">
                                    Повторять не чаще чем раз в (дней)
                                    <input
                                      aria-label="Интервал задолженности"
                                      type="number"
                                      min={1}
                                      max={90}
                                      defaultValue={rule.repeat_days}
                                      key={rule.version}
                                      onBlur={(e) => {
                                        const n = Number(e.target.value);
                                        if (
                                          Number.isInteger(n) &&
                                          n >= 1 &&
                                          n <= 90 &&
                                          n !== rule.repeat_days
                                        )
                                          save(rule, { repeat_days: n });
                                      }}
                                      className={`${input} mt-1 max-w-32`}
                                    />
                                  </label>
                                )}
                                {rule.event_type === "PAYMENT_REMINDER" && (
                                  <label className="block text-sm text-slate-600">
                                    Режим отправки
                                    <select
                                      className={`${input} mt-1`}
                                      value={rule.mode}
                                      disabled={!!busy}
                                      onChange={(e) =>
                                        save(rule, { mode: e.target.value })
                                      }
                                    >
                                      <option value="CONFIRM">
                                        После подтверждения сотрудником
                                      </option>
                                      <option value="INHERIT">
                                        Действующий режим сервера (с лимитом
                                        отправки)
                                      </option>
                                    </select>
                                  </label>
                                )}
                                <p className="text-sm whitespace-pre-wrap text-slate-600">
                                  {template?.text || "Шаблон отсутствует"}
                                </p>
                                {template && !template.is_active && (
                                  <p className="text-sm text-amber-700">
                                    Шаблон отключён. Включите его для отправки.
                                  </p>
                                )}
                                {template && (
                                  <button
                                    onClick={() => setEditing(template)}
                                    className="text-sm font-semibold text-blue-600"
                                  >
                                    Изменить текст сообщения
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                  </section>
                ))}
                <p className="text-xs text-slate-500">
                  Сообщения о зачислении на отдельный баланс клиента недоступны:
                  в Тозон платежи учитываются по договору.
                </p>
              </>
            )}
            {tab === "templates" && (
              <TemplateList templates={data.templates} onEdit={setEditing} />
            )}{" "}
            {tab === "system" && (
              <section className="rounded-2xl border border-slate-200 bg-white p-6 space-y-5">
                <h2 className="font-bold text-lg">Подключение SMS</h2>
                <dl className="grid grid-cols-2 gap-4 text-sm">
                  {[
                    ["Провайдер", data.system.provider],
                    [
                      "Отправка с подтверждением",
                      data.system.confirmationEnabled
                        ? "Доступна"
                        : "Отключена на сервере",
                    ],
                    [
                      "Ежедневный планировщик",
                      data.system.detectorEnabled ? "Включён" : "Отключён",
                    ],
                    ["Имя отправителя", data.system.sender],
                    [
                      "Подключение",
                      data.system.tokenConfigured
                        ? "Настроено"
                        : "Требуется настройка сервера",
                    ],
                    [
                      "Автоматические напоминания",
                      data.system.automaticEnabled
                        ? "Включены на сервере"
                        : "Отключены на сервере",
                    ],
                    ["Лимит за запуск", data.system.batchLimit],
                    [
                      "Ежедневная проверка",
                      `${data.system.dailyTime} · ${data.system.timezone}`,
                    ],
                  ].map(([k, v]) => (
                    <React.Fragment key={k}>
                      <dt className="text-slate-500">{k}</dt>
                      <dd className="font-semibold">{v}</dd>
                    </React.Fragment>
                  ))}
                </dl>
                <p className="text-sm text-slate-500">
                  Включение событий и изменение текстов не отправляет SMS. Перед
                  отправкой в очереди доступны предпросмотр, количество частей
                  сообщения и отмена.
                </p>
              </section>
            )}
            {tab === "audit" && (
              <section className="rounded-2xl border border-slate-200 bg-white p-5">
                <h2 className="mb-4 font-bold">Последние изменения</h2>
                {history.length ? (
                  history.map((h) => (
                    <div
                      key={h.id}
                      className="border-b border-slate-100 py-3 text-sm"
                    >
                      <span>
                        {new Date(h.changed_at).toLocaleString("ru-RU")} ·{" "}
                      </span>
                      <span className="font-medium">
                        {data.rules.find((r) => r.event_type === h.entity_id)
                          ?.name ||
                          data.templates.find(
                            (t) => String(t.id) === h.entity_id,
                          )?.name ||
                          h.entity_id}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-500">Изменений пока нет.</p>
                )}
              </section>
            )}
          </main>
        </div>
      )}
      {editing && (
        <TemplateEditor
          key={editing.id}
          template={editing}
          onClose={() => setEditing(null)}
          onSaved={(t) =>
            setData((d) => ({
              ...d,
              templates: d.templates.map((x) => (x.id === t.id ? t : x)),
            }))
          }
        />
      )}
    </div>
  );
};
