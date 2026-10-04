/**
 * PKO Journal Table Display Formatter
 * Formats PKO amounts for the income journal table following canonical accounting rules:
 * - PRIMARY AMOUNT = physical cash received in TJS (amount_tjs / amountTjs).
 * - SECONDARY TEXT = deal equivalent in USD & exchange rate, if applicable.
 * - Standard TJS PKOs retain primary TJS amount without synthetic USD equivalents.
 * - USD payments without TJS cash amount display controlled state: "Сумма в TJS не определена".
 */
export function getPkoJournalDisplay(item) {
  if (!item) {
    return {
      primary: '—',
      secondary: null,
      isDefined: false
    };
  }

  const rawTjs = item.amount_tjs ?? item.amountTjs;
  const rawUsd = item.amount_usd ?? item.amountUsd;
  const rawRate = item.exchange_rate ?? item.exchangeRate;
  const cur = (item.currency || 'TJS').toUpperCase();
  const amt = Number(item.amount || 0);

  const formatNum = (val, minDec = 2, maxDec = 2) => {
    return val.toLocaleString('ru-RU', { minimumFractionDigits: minDec, maximumFractionDigits: maxDec }).replace(/\u00A0/g, ' ');
  };

  // CASE A: amount_tjs exists and > 0
  if (rawTjs !== null && rawTjs !== undefined && Number(rawTjs) > 0) {
    const tjsVal = Number(rawTjs);
    const primaryText = `+${formatNum(tjsVal)} TJS`;

    let secondaryText = null;
    const usdVal = (rawUsd !== null && rawUsd !== undefined && Number(rawUsd) > 0)
      ? Number(rawUsd)
      : (cur === 'USD' ? amt : null);

    if (usdVal) {
      const formattedUsd = formatNum(usdVal);
      if (rawRate && Number(rawRate) > 0) {
        const formattedRate = formatNum(Number(rawRate), 2, 4);
        secondaryText = `≈ ${formattedUsd} USD · курс ${formattedRate}`;
      } else {
        secondaryText = `≈ ${formattedUsd} USD`;
      }
    } else if (cur !== 'TJS' && amt > 0) {
      const formattedForeign = formatNum(amt);
      if (rawRate && Number(rawRate) > 0) {
        const formattedRate = formatNum(Number(rawRate), 2, 4);
        secondaryText = `≈ ${formattedForeign} ${cur} · курс ${formattedRate}`;
      } else {
        secondaryText = `≈ ${formattedForeign} ${cur}`;
      }
    }

    return {
      primary: primaryText,
      secondary: secondaryText,
      isDefined: true
    };
  }

  // CASE B: currency === 'TJS' and amount_tjs absent
  if (cur === 'TJS') {
    return {
      primary: `+${formatNum(amt)} TJS`,
      secondary: null,
      isDefined: true
    };
  }

  // CASE C: currency === 'USD' (or other non-TJS) and amount_tjs absent / null / <= 0
  if (cur === 'USD') {
    const formattedUsd = formatNum(amt);
    return {
      primary: 'Сумма в TJS не определена',
      secondary: `Платёж по договору: ${formattedUsd} USD`,
      isDefined: false
    };
  }

  // Fallback for other foreign currencies without amount_tjs
  const formattedAmount = formatNum(amt);
  return {
    primary: `+${formattedAmount} ${cur}`,
    secondary: null,
    isDefined: true
  };
}

/**
 * Shared Canonical Predicate for TJS Reconciliation Eligibility
 * Active USD payments where amount_tjs IS NULL require historical TJS reconciliation.
 */
export function requiresTjsReconciliation(item) {
  if (!item) return false;
  const isVoided = item.status === 'VOIDED' || item.status === 'CANCELLED';
  if (isVoided) return false;
  const cur = (item.currency || 'USD').toUpperCase();
  if (cur !== 'USD') return false;
  const rawTjs = item.amount_tjs ?? item.amountTjs ?? null;
  return rawTjs === null || rawTjs === undefined;
}
