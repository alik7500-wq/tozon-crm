import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import {
  Search,
  X,
  FileCheck,
  User,
  Home,
  Building2,
  Phone,
  ArrowRight,
  Loader2,
  Sparkles,
  ChevronRight
} from 'lucide-react';

export const GlobalSearch = () => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState({ deals: [], leads: [], units: [], total: 0 });
  const [selectedIndex, setSelectedIndex] = useState(-1);

  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const debounceTimerRef = useRef(null);
  const navigate = useNavigate();

  // Perform search query
  const performSearch = useCallback(async (searchTerm) => {
    const trimmed = searchTerm.trim();
    if (!trimmed) {
      setResults({ deals: [], leads: [], units: [], total: 0 });
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const res = await api.get('/search', { params: { q: trimmed } });
      const data = res.data || res;
      setResults({
        deals: data.deals || [],
        leads: data.leads || [],
        units: data.units || [],
        total: data.total || 0
      });
    } catch (err) {
      console.error('Global search error:', err);
      setResults({ deals: [], leads: [], units: [], total: 0 });
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Handle input changes with debounce
  const handleInputChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    setSelectedIndex(-1);

    if (val.trim().length > 0) {
      setIsOpen(true);
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = setTimeout(() => {
        performSearch(val);
      }, 200);
    } else {
      setResults({ deals: [], leads: [], units: [], total: 0 });
      setIsOpen(false);
    }
  };

  // Keyboard shortcut: Ctrl+K or / to focus search
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        if (query.trim()) setIsOpen(true);
      } else if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [query]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Format currency
  const formatMoney = (val, currency = 'USD') => {
    if (!val) return '0 ' + currency;
    return Number(val).toLocaleString('ru-RU') + ' ' + currency;
  };

  // Status badges
  const getDealStatusBadge = (status) => {
    switch (status) {
      case 'CONTRACTED':
      case 'COMPLETED':
      case 'SIGNED':
        return { label: 'Договор', color: 'bg-emerald-100 text-emerald-800' };
      case 'RESERVED':
        return { label: 'Бронь', color: 'bg-amber-100 text-amber-800' };
      case 'DRAFT':
        return { label: 'Черновик', color: 'bg-slate-100 text-slate-700' };
      case 'CANCELLED':
        return { label: 'Расторгнут', color: 'bg-rose-100 text-rose-700' };
      default:
        return { label: status, color: 'bg-blue-100 text-blue-800' };
    }
  };

  const getUnitStatusBadge = (status) => {
    switch (status) {
      case 'AVAILABLE':
        return { label: 'Свободна', color: 'bg-emerald-100 text-emerald-800' };
      case 'RESERVED':
        return { label: 'Бронь', color: 'bg-amber-100 text-amber-800' };
      case 'SOLD':
        return { label: 'Продана', color: 'bg-rose-100 text-rose-800' };
      case 'BLOCKED':
        return { label: 'Заблокирована', color: 'bg-slate-100 text-slate-700' };
      default:
        return { label: status, color: 'bg-slate-100 text-slate-700' };
    }
  };

  // Navigation handlers
  const handleSelectDeal = (deal) => {
    setIsOpen(false);
    navigate(`/deals?search=${encodeURIComponent(deal.contract_number || deal.lead_name || '')}`);
  };

  const handleSelectLead = (lead) => {
    setIsOpen(false);
    navigate(`/clients?search=${encodeURIComponent(lead.full_name || lead.phone || '')}`);
  };

  const handleSelectUnit = (unit) => {
    setIsOpen(false);
    navigate(`/apartments?unitNumber=${unit.unit_number}`);
  };

  const handleClear = () => {
    setQuery('');
    setResults({ deals: [], leads: [], units: [], total: 0 });
    setIsOpen(false);
    inputRef.current?.focus();
  };

  return (
    <div ref={containerRef} className="relative w-full max-w-lg">
      {/* Search Input Bar */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onFocus={() => {
            if (query.trim().length > 0) setIsOpen(true);
          }}
          onChange={handleInputChange}
          placeholder="Поиск по ФИО, телефону, номеру договора или квартиры..."
          className="w-full rounded-2xl border border-slate-200 bg-slate-50/80 px-10 py-2.5 text-xs font-medium text-slate-900 placeholder-slate-400 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 shadow-2xs"
        />

        {isLoading ? (
          <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
            <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
          </div>
        ) : query.length > 0 ? (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        ) : (
          <div className="hidden sm:flex absolute right-3 top-1/2 -translate-y-1/2 items-center gap-0.5 text-[10px] font-bold text-slate-400 bg-white border border-slate-200 px-1.5 py-0.5 rounded-md shadow-2xs">
            <span>Ctrl</span>
            <span>K</span>
          </div>
        )}
      </div>

      {/* Floating Results Dropdown */}
      {isOpen && query.trim().length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-2 rounded-2xl border border-slate-200 bg-white shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100 max-h-[75vh] flex flex-col">
          {/* Header info */}
          <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 border-b border-slate-100 text-xs">
            <span className="font-bold text-slate-600 flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-blue-600" />
              Результаты поиска
            </span>
            <span className="text-[11px] font-semibold text-slate-400">
              Найдено совпадений: {results.total}
            </span>
          </div>

          {/* Results List */}
          <div className="overflow-y-auto divide-y divide-slate-100 p-2 space-y-2">
            {results.total === 0 && !isLoading ? (
              <div className="p-8 text-center">
                <Search className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-700">Ничего не найдено</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  По запросу «{query}» совпадений в CRM не обнаружено
                </p>
              </div>
            ) : null}

            {/* 1. Deals & Contracts */}
            {results.deals.length > 0 && (
              <div>
                <div className="px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                  <FileCheck className="h-3 w-3 text-blue-600" />
                  Сделки и договоры ({results.deals.length})
                </div>
                <div className="mt-1 space-y-1">
                  {results.deals.map((deal) => {
                    const badge = getDealStatusBadge(deal.status);
                    const price = deal.final_price_minor
                      ? deal.final_price_minor / 100
                      : deal.total_amount || 0;
                    return (
                      <div
                        key={`deal-${deal.id}`}
                        onClick={() => handleSelectDeal(deal)}
                        className="group flex items-center justify-between p-2.5 rounded-xl hover:bg-blue-50/70 border border-transparent hover:border-blue-200 transition cursor-pointer"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                            №{deal.contract_number ? deal.contract_number.slice(-4) : deal.id}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-black text-slate-900 group-hover:text-blue-700">
                                Договор №{deal.contract_number || deal.id}
                              </span>
                              <span className={`px-2 py-0.2 rounded-md text-[10px] font-bold ${badge.color}`}>
                                {badge.label}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-2">
                              <span>👤 {deal.lead_name || 'Клиент'}</span>
                              {deal.lead_phone && <span>• 📞 {deal.lead_phone}</span>}
                              {deal.unit_number && <span>• 🏢 Кв. №{deal.unit_number}</span>}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 text-right">
                          <div>
                            <div className="text-xs font-black text-slate-900">
                              {formatMoney(price, deal.currency || 'USD')}
                            </div>
                            <span className="text-[10px] text-slate-400 block">
                              {deal.deal_date ? new Date(deal.deal_date).toLocaleDateString('ru-RU') : ''}
                            </span>
                          </div>
                          <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-blue-600 transition" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 2. Clients & Leads */}
            {results.leads.length > 0 && (
              <div>
                <div className="px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                  <User className="h-3 w-3 text-emerald-600" />
                  Клиенты и лиды ({results.leads.length})
                </div>
                <div className="mt-1 space-y-1">
                  {results.leads.map((lead) => (
                    <div
                      key={`lead-${lead.id}`}
                      onClick={() => handleSelectLead(lead)}
                      className="group flex items-center justify-between p-2.5 rounded-xl hover:bg-emerald-50/70 border border-transparent hover:border-emerald-200 transition cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">
                          <User className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black text-slate-900 group-hover:text-emerald-700">
                              {lead.full_name || 'Без имени'}
                            </span>
                            {lead.stage && (
                              <span className="px-2 py-0.2 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700">
                                {lead.stage}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-2">
                            {lead.phone && <span className="text-blue-600 font-semibold">📞 {lead.phone}</span>}
                            {lead.passport_series && lead.passport_number && (
                              <span>• Паспорт: {lead.passport_series} {lead.passport_number}</span>
                            )}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-slate-400">Открыть карточку</span>
                        <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-emerald-600 transition" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 3. Units / Apartments */}
            {results.units.length > 0 && (
              <div>
                <div className="px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                  <Home className="h-3 w-3 text-indigo-600" />
                  Квартиры и объекты ({results.units.length})
                </div>
                <div className="mt-1 space-y-1">
                  {results.units.map((unit) => {
                    const badge = getUnitStatusBadge(unit.status);
                    return (
                      <div
                        key={`unit-${unit.id}`}
                        onClick={() => handleSelectUnit(unit)}
                        className="group flex items-center justify-between p-2.5 rounded-xl hover:bg-indigo-50/70 border border-transparent hover:border-indigo-200 transition cursor-pointer"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-black text-xs">
                            №{unit.unit_number}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-black text-slate-900 group-hover:text-indigo-700">
                                Квартира №{unit.unit_number}
                              </span>
                              <span className={`px-2 py-0.2 rounded-md text-[10px] font-bold ${badge.color}`}>
                                {badge.label}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-2">
                              <span>{unit.rooms === 0 ? 'Студия' : `${unit.rooms}-комн.`}</span>
                              <span>• {unit.area_m2} м²</span>
                              {unit.floor_number && <span>• {unit.floor_number} этаж</span>}
                              {unit.project_name && <span>• {unit.project_name}</span>}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 text-right">
                          <div>
                            <div className="text-xs font-black text-slate-900">
                              {unit.price_per_m2 ? `${unit.price_per_m2} ${unit.currency}/м²` : ''}
                            </div>
                            <span className="text-[10px] text-slate-400 block">
                              {(unit.price_per_m2 * unit.area_m2).toLocaleString('ru-RU')} {unit.currency}
                            </span>
                          </div>
                          <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-indigo-600 transition" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Quick Footer */}
          <div className="px-4 py-2 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
            <span>Используйте <kbd className="px-1 py-0.5 rounded bg-white border text-[10px] font-bold text-slate-600 shadow-2xs">Esc</kbd> для закрытия</span>
            <span>Нажмите на результат для перехода</span>
          </div>
        </div>
      )}
    </div>
  );
};
