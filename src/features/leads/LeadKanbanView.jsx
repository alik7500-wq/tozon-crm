import React from 'react';
import {
  User,
  Phone,
  Building2,
  DollarSign,
  MessageSquare,
  ChevronRight,
  MoreVertical,
  Plus,
  Clock,
  ArrowRight,
  CheckCircle2,
  XCircle
} from 'lucide-react';

export const LeadKanbanView = ({ leads, onSelectLead, onStatusChange, onAddNewLead }) => {
  const columns = [
    { key: 'NEW', title: 'Новый', color: 'border-blue-500 bg-blue-50/40 text-blue-700', next: 'IN_PROGRESS', nextLabel: 'В работу' },
    { key: 'IN_PROGRESS', title: 'В работе', color: 'border-amber-500 bg-amber-50/40 text-amber-700', next: 'NEGOTIATION', nextLabel: 'Переговоры' },
    { key: 'NEGOTIATION', title: 'Переговоры', color: 'border-purple-500 bg-purple-50/40 text-purple-700', next: 'WON', nextLabel: 'В сделку' },
    { key: 'WON', title: 'Сделка (WON)', color: 'border-emerald-500 bg-emerald-50/40 text-emerald-700', next: null },
    { key: 'LOST', title: 'Отказ (LOST)', color: 'border-rose-500 bg-rose-50/40 text-rose-700', next: null },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 overflow-x-auto pb-4">
      {columns.map((col) => {
        const colLeads = leads.filter((l) => l.status === col.key);

        return (
          <div
            key={col.key}
            className="flex flex-col rounded-2xl bg-slate-100/70 border border-slate-200 p-3 min-w-[240px] max-h-[calc(100vh-220px)] shadow-2xs"
          >
            {/* Column Header */}
            <div className="flex items-center justify-between px-2 py-1.5 mb-2">
              <div className="flex items-center gap-2">
                <span className={`h-2.5 w-2.5 rounded-full ${col.key === 'NEW' ? 'bg-blue-500' : col.key === 'IN_PROGRESS' ? 'bg-amber-500' : col.key === 'NEGOTIATION' ? 'bg-purple-500' : col.key === 'WON' ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">{col.title}</h4>
              </div>
              <span className="rounded-md bg-white border border-slate-200 px-2 py-0.5 text-xs font-bold text-slate-600 shadow-2xs">
                {colLeads.length}
              </span>
            </div>

            {/* Cards Container */}
            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
              {colLeads.map((lead) => (
                <div
                  key={lead.id}
                  onClick={() => onSelectLead(lead)}
                  className="rounded-xl bg-white border border-slate-200 p-3.5 shadow-2xs hover:shadow-md hover:border-purple-300 transition cursor-pointer space-y-2.5 group"
                >
                  <div className="flex items-start justify-between">
                    <h5 className="text-xs font-bold text-slate-900 group-hover:text-purple-600 transition leading-snug line-clamp-1">
                      {lead.full_name}
                    </h5>
                  </div>

                  <div className="flex items-center gap-1.5 text-[11px] text-slate-600">
                    <Phone className="h-3 w-3 text-slate-400 shrink-0" />
                    <span>{lead.phone}</span>
                  </div>

                  {lead.interested_project_name && (
                    <div className="flex items-center gap-1 text-[11px] text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-100">
                      <Building2 className="h-3 w-3 shrink-0" />
                      <span className="truncate">{lead.interested_project_name}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between border-t border-slate-100 pt-2 text-[10px] text-slate-400">
                    <span className="font-semibold text-slate-700">
                      {lead.budget_max_minor ? `${(lead.budget_max_minor / 100).toLocaleString()} TJS` : lead.source}
                    </span>

                    <div className="flex items-center gap-2">
                      {lead.notes_count > 0 && (
                        <span className="flex items-center gap-1 text-slate-500 font-semibold">
                          <MessageSquare className="h-3 w-3 text-purple-600" />
                          <span>{lead.notes_count}</span>
                        </span>
                      )}

                      {col.next && onStatusChange && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onStatusChange(lead.id, col.next);
                          }}
                          title={`Перевести в «${col.nextLabel}»`}
                          className="flex items-center gap-0.5 rounded-md bg-purple-50 text-purple-700 px-1.5 py-0.5 font-bold hover:bg-purple-100 transition cursor-pointer"
                        >
                          <span>{col.nextLabel}</span>
                          <ArrowRight className="h-2.5 w-2.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {colLeads.length === 0 && (
                <div className="h-24 flex items-center justify-center rounded-xl border border-dashed border-slate-200 text-[11px] text-slate-400">
                  Нет лидов
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
