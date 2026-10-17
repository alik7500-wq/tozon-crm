import React from 'react';
import {
  User,
  Phone,
  Building2,
  Calendar,
  MessageSquare,
  ChevronRight,
  MoreVertical,
  Edit2,
  UserCheck,
  PhoneCall,
  Clock,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';

export const LeadTableView = ({
  leads,
  onSelectLead,
  onEditLead,
  onStatusChange,
  onAssignLead,
  onFirstContact,
  canAssign = false
}) => {
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

  const getSlaBadge = (lead) => {
    const sla = lead.sla_info;
    if (!sla) return null;

    if (['WON', 'LOST'].includes(lead.status)) {
      const isWon = lead.status === 'WON';
      return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-semibold text-[10px] border ${
          isWon ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-50 text-slate-600 border-slate-200'
        }`}>
          {isWon && <CheckCircle2 className="h-3 w-3 shrink-0 text-emerald-600" />}
          <span>{isWon ? 'Сделка заключена' : 'Отказ / Архив'}</span>
        </span>
      );
    }

    if (sla.is_unassigned) {
      const isOverdue = sla.pool_sla?.is_overdue;
      return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-semibold text-[10px] border ${
          isOverdue ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-blue-50 text-blue-700 border-blue-200'
        }`}>
          <Clock className="h-3 w-3 shrink-0" />
          <span>{isOverdue ? `Пул: просрочен (+${sla.pool_sla.overdue_minutes}м)` : `Пул: ${sla.pool_sla.remaining_minutes}м до назначения`}</span>
        </span>
      );
    }

    if (sla.manager_sla?.contact_made) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-semibold text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200">
          <CheckCircle2 className="h-3 w-3 shrink-0 text-emerald-600" />
          <span>Контакт состоялся</span>
        </span>
      );
    }

    const isOverdue = sla.manager_sla?.is_overdue;
    const isWarning = sla.manager_sla?.status === 'CONTACT_WARNING';

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-semibold text-[10px] border ${
        isOverdue
          ? 'bg-rose-50 text-rose-700 border-rose-200 animate-pulse'
          : isWarning
          ? 'bg-amber-50 text-amber-700 border-amber-200'
          : 'bg-blue-50 text-blue-700 border-blue-200'
      }`}>
        <Clock className="h-3 w-3 shrink-0" />
        <span>{isOverdue ? `SLA 15м просрочен (+${sla.manager_sla.overdue_minutes}м)` : `SLA: ${sla.manager_sla.remaining_minutes}м до связи`}</span>
      </span>
    );
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-2xs">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
            <tr>
              <th className="p-3.5 pl-5">ФИО клиента</th>
              <th className="p-3.5">Телефон</th>
              <th className="p-3.5">Ответственный менеджер</th>
              <th className="p-3.5">Регламент первого контакта (SLA)</th>
              <th className="p-3.5">Стадия воронки</th>
              <th className="p-3.5">Интересующий ЖК</th>
              <th className="p-3.5">Бюджет</th>
              <th className="p-3.5">Заметки</th>
              <th className="p-3.5 text-right pr-5">Действия</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {leads.map((lead) => {
              const badge = getStatusBadge(lead.status);
              const isUnassigned = !lead.responsible_user_id && !['WON', 'LOST'].includes(lead.status);

              return (
                <tr
                  key={lead.id}
                  onClick={() => onSelectLead(lead)}
                  className="hover:bg-slate-50/80 transition cursor-pointer group"
                >
                  {/* Client Full Name */}
                  <td className="p-3.5 pl-5 font-bold text-slate-900 group-hover:text-purple-600">
                    <div className="flex items-center gap-1.5">
                      <span>{lead.full_name}</span>
                      {isUnassigned && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-rose-100 text-rose-700">
                          ПУЛ
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Phone */}
                  <td className="p-3.5 text-slate-600 font-medium">{lead.phone}</td>

                  {/* Responsible Manager */}
                  <td className="p-3.5" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-1.5">
                      {isUnassigned ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-bold text-[11px] bg-slate-100 text-slate-600 border border-slate-200">
                          <User className="h-3 w-3 text-slate-400" />
                          <span>Общий пул</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-semibold text-[11px] bg-purple-50 text-purple-700 border border-purple-200">
                          <User className="h-3 w-3 text-purple-600" />
                          <span>{lead.responsible_user_name || '—'}</span>
                        </span>
                      )}

                      {canAssign && (
                        <button
                          type="button"
                          onClick={() => onAssignLead && onAssignLead(lead)}
                          title="Назначить / изменить менеджера"
                          className="p-1 rounded-md text-slate-400 hover:text-purple-700 hover:bg-purple-50 transition cursor-pointer"
                        >
                          <UserCheck className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </td>

                  {/* SLA Status */}
                  <td className="p-3.5">
                    {getSlaBadge(lead)}
                  </td>

                  {/* Funnel Stage */}
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

                  {/* Interested Project */}
                  <td className="p-3.5 text-slate-700">
                    {lead.interested_project_name || <span className="text-slate-400">—</span>}
                  </td>

                  {/* Budget */}
                  <td className="p-3.5 font-bold text-slate-800">
                    {lead.budget_max_minor ? `${(lead.budget_max_minor / 100).toLocaleString()} USD` : <span className="text-slate-400">—</span>}
                  </td>

                  {/* Notes */}
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

                  {/* Actions */}
                  <td className="p-3.5 text-right pr-5" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1.5">
                      {/* Record contact button */}
                      <button
                        type="button"
                        onClick={() => onFirstContact && onFirstContact(lead)}
                        title="Зафиксировать контакт с клиентом"
                        className="p-1 rounded-md text-emerald-600 hover:bg-emerald-50 transition cursor-pointer"
                      >
                        <PhoneCall className="h-4 w-4" />
                      </button>

                      {/* Edit lead button */}
                      <button
                        type="button"
                        onClick={() => onEditLead(lead)}
                        title="Редактировать лида"
                        className="p-1 rounded-md text-slate-400 hover:text-purple-600 hover:bg-slate-100 transition cursor-pointer"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                    </div>
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
