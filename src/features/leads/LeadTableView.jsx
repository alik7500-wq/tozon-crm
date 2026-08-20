import React from 'react';
import {
  User,
  Phone,
  Building2,
  Calendar,
  MessageSquare,
  ChevronRight,
  MoreVertical,
  Edit2
} from 'lucide-react';

export const LeadTableView = ({ leads, onSelectLead, onEditLead, onStatusChange }) => {
  const getStatusBadge = (status) => {
    switch (status) {
      case 'NEW':
        return { label: 'Новый', bg: 'bg-blue-50 text-blue-700 border-blue-200' };
      case 'IN_PROGRESS':
        return { label: 'В работе', bg: 'bg-amber-50 text-amber-700 border-amber-200' };
      case 'NEGOTIATION':
        return { label: 'Переговоры', bg: 'bg-purple-50 text-purple-700 border-purple-200' };
      case 'WON':
        return { label: 'Сделка (WON)', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
      case 'LOST':
        return { label: 'Отказ (LOST)', bg: 'bg-rose-50 text-rose-700 border-rose-200' };
      default:
        return { label: status, bg: 'bg-slate-50 text-slate-700 border-slate-200' };
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-2xs">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
            <tr>
              <th className="p-3.5 pl-5">ФИО клиента</th>
              <th className="p-3.5">Телефон</th>
              <th className="p-3.5">Стадия воронки</th>
              <th className="p-3.5">Интересующий ЖК</th>
              <th className="p-3.5">Паспорт</th>
              <th className="p-3.5">Бюджет</th>
              <th className="p-3.5">Заметки</th>
              <th className="p-3.5 text-right pr-5">Действия</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {leads.map((lead) => {
              const badge = getStatusBadge(lead.status);
              return (
                <tr
                  key={lead.id}
                  onClick={() => onSelectLead(lead)}
                  className="hover:bg-slate-50/80 transition cursor-pointer group"
                >
                  <td className="p-3.5 pl-5 font-bold text-slate-900 group-hover:text-purple-600">
                    {lead.full_name}
                  </td>
                  <td className="p-3.5 text-slate-600 font-medium">{lead.phone}</td>
                  <td className="p-3.5" onClick={(e) => e.stopPropagation()}>
                    <select
                      value={lead.status}
                      onChange={(e) => onStatusChange && onStatusChange(lead.id, e.target.value)}
                      className={`px-2.5 py-1 rounded-lg font-bold border text-[11px] outline-none cursor-pointer ${badge.bg}`}
                    >
                      <option value="NEW">Новый</option>
                      <option value="IN_PROGRESS">В работе</option>
                      <option value="NEGOTIATION">Переговоры</option>
                      <option value="WON">Сделка (WON)</option>
                      <option value="LOST">Отказ (LOST)</option>
                    </select>
                  </td>
                  <td className="p-3.5 text-slate-700">
                    {lead.interested_project_name || <span className="text-slate-400">—</span>}
                  </td>
                  <td className="p-3.5 text-slate-600">
                    {lead.passport_number ? `${lead.passport_series || ''} ${lead.passport_number}` : <span className="text-slate-400">—</span>}
                  </td>
                  <td className="p-3.5 font-bold text-slate-800">
                    {lead.budget_max_minor ? `${(lead.budget_max_minor / 100).toLocaleString()} USD` : <span className="text-slate-400">—</span>}
                  </td>
                  <td className="p-3.5 text-slate-500">
                    {lead.notes_count > 0 ? (
                      <span className="flex items-center gap-1 font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-100 w-fit">
                        <MessageSquare className="h-3.5 w-3.5" />
                        <span>{lead.notes_count}</span>
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="p-3.5 text-right pr-5">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditLead(lead);
                      }}
                      className="p-1 text-slate-400 hover:text-purple-600 transition cursor-pointer"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {leads.length === 0 && (
          <div className="p-8 text-center text-xs text-slate-400">
            Лиды не найдены по заданным критериям
          </div>
        )}
      </div>
    </div>
  );
};
