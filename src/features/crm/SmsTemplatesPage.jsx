import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { MessageSquare } from "lucide-react";
import { api } from "../../api/client";
import { useAuth } from "../auth/AuthContext";
import { TemplateEditor, TemplateList } from "../settings/MessageSettingsPage";
export const SmsTemplatesPage = () => {
  const { user } = useAuth();
  const admin = user?.role === "ADMIN";
  const [templates, setTemplates] = useState([]),
    [editing, setEditing] = useState(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true);
  useEffect(() => {
    api
      .get(admin ? "/sms/settings" : "/sms/templates")
      .then((res) => setTemplates(admin ? res.data.templates : res.data))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [admin]);
  return (
    <div className="max-w-5xl mx-auto pb-16 space-y-5">
      <div className="flex justify-between gap-4">
        <h1 className="flex gap-3 text-2xl font-extrabold text-slate-900">
          <MessageSquare className="text-blue-600" />
          Шаблоны сообщений
        </h1>
        {admin && (
          <Link
            to="/settings/messages"
            className="text-blue-600 font-semibold text-sm"
          >
            Настройки отправки
          </Link>
        )}
      </div>
      <p className="text-sm text-slate-500">
        Тексты SMS, которые используются при отправке клиентам.
      </p>
      {loading && <p>Загрузка…</p>}
      {error && (
        <p role="alert" className="text-red-600">
          {error}
        </p>
      )}
      <TemplateList templates={templates} onEdit={admin ? setEditing : null} />
      {editing && (
        <TemplateEditor
          template={editing}
          onClose={() => setEditing(null)}
          onSaved={(t) =>
            setTemplates((ts) => ts.map((x) => (x.id === t.id ? t : x)))
          }
        />
      )}
    </div>
  );
};
