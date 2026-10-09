import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { financeApi } from '../../api/finance.api';

export function summarizeInvestments(list = []) {
  const investors = new Map();
  let totalMinor = 0;
  let missingRate = 0;
  for (const item of list) {
    if (['VOIDED', 'CANCELLED', 'REVERSED'].includes(item.status) || item.voidedAt || item.transferId) continue;
    if (item.operationType !== 'INVESTMENT' && item.category !== 'Инвестиции партнёров' && item.contract !== 'Инвестиция партнёра') continue;
    const name = (item.payerName || item.clientName || 'Инвестор не указан').trim() || 'Инвестор не указан';
    const key = name.replace(/\s+/g, ' ').toLocaleLowerCase('ru-RU');
    if (!investors.has(key)) investors.set(key, { name, usdMinor: 0, currencies: {} });
    const investor = investors.get(key);
    const currency = item.currency || 'USD';
    const amount = Number(item.amount);
    if (!Number.isFinite(amount)) continue;
    investor.currencies[currency] = (investor.currencies[currency] || 0) + Math.round(amount * 100);
    const usd = currency === 'USD' ? amount : Number(item.amountUsd ?? item.amount_usd);
    if (currency !== 'USD' && (item.amountUsd ?? item.amount_usd) == null) { missingRate++; continue; }
    if (!Number.isFinite(usd)) { missingRate++; continue; }
    investor.usdMinor += Math.round(usd * 100);
    totalMinor += Math.round(usd * 100);
  }
  return { totalMinor, missingRate, investors: [...investors.values()].sort((a, b) => b.usdMinor - a.usdMinor) };
}
const money = minor => (minor / 100).toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export function InvestmentSummaryCard() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['finance-income', 'investment-summary', 'ALL'],
    queryFn: () => financeApi.getIncome({ year: 'ALL', currency: 'ALL' })
  });
  const summary = summarizeInvestments(data?.list);
  return <div className="p-4 rounded-2xl border border-purple-200 bg-purple-50/40 flex flex-col gap-3">
    <div className="flex items-center justify-between"><span className="text-2xl">💼</span><span className="text-[10px] font-bold text-purple-700">ЗА ВСЁ ВРЕМЯ</span></div>
    <h4 className="text-xs font-black text-slate-900">Инвестиции инвесторов</h4>
    {isLoading ? <p className="text-xs text-slate-500">Загрузка…</p> : isError ? <button onClick={() => refetch()} className="text-xs text-rose-600 cursor-pointer">Не удалось загрузить. Повторить</button> : <>
      <div className="border-t border-purple-100 pt-2"><span className="text-[11px] text-slate-500">Всего внесено, эквивалент USD</span><div className="font-black text-lg text-purple-700">${money(summary.totalMinor)}</div></div>
      <div className="max-h-48 overflow-y-auto space-y-2">
        {summary.investors.map(investor => <div key={investor.name} className="text-xs border-t border-purple-100 pt-2"><div className="font-semibold text-slate-700 break-words">{investor.name}</div><div className="font-mono font-bold text-purple-700">${money(investor.usdMinor)}</div><div className="text-[10px] text-slate-500">{Object.entries(investor.currencies).map(([currency, minor]) => `${money(minor)} ${currency}`).join(' · ')}</div></div>)}
        {!summary.investors.length && <p className="text-xs text-slate-500">Инвестиции не зарегистрированы</p>}
      </div>
      {summary.missingRate > 0 && <p className="text-[10px] text-amber-700">Без USD-эквивалента: {summary.missingRate}. Эти взносы показаны в исходной валюте и не включены в общий USD.</p>}
      <p className="text-[10px] text-slate-500">Внесённые инвестиции, независимо от остатка в кассе.</p>
    </>}
  </div>;
}
