export function isPureUsdOperation(item) {
  if (!item) return false;
  const cur = (item.currency || 'USD').toUpperCase();
  if (cur !== 'USD') return false;

  const rawTjs = item.amount_tjs ?? item.amountTjs ?? null;
  if (rawTjs !== null && rawTjs !== undefined && Number(rawTjs) > 0) {
    return false; // Has physical TJS snapshot
  }

  const isTransfer = Boolean(
    item.transfer_id ||
    item.transferId ||
    item.operation_type === 'INTERNAL_CASH_TRANSFER' ||
    item.operationType === 'INTERNAL_CASH_TRANSFER' ||
    (item.reference && String(item.reference).includes('ПЕРЕМ')) ||
    item.category === 'Внутренние перемещения между кассами'
  );

  const directReceipt = (item.dealId === null || item.deal_id === null || item.contract === 'Прямой приход' || item.contract === 'Инвестиция партнёра')
    && !item.dealId && !item.deal_id && !item.deal?.id;
  return isTransfer || directReceipt || Boolean(item.is_pure_usd || item.isPureUsd);
}

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

  // CASE A: amount_tjs exists and > 0 (TJS physical cash snapshot)
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

  // CASE C: Pure USD cash operation (e.g. USD cash transfer, pure USD cash desk movement)
  if (cur === 'USD' && isPureUsdOperation(item)) {
    const formattedUsd = formatNum(amt);
    return {
      primary: `+${formattedUsd} USD`,
      secondary: null,
      isDefined: true
    };
  }

  // CASE D: USD deal payment without physical TJS amount recorded (historical deal PKO requiring reconciliation)
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
 * Active USD deal payments where amount_tjs IS NULL require historical TJS reconciliation.
 * Pure USD transfers and pure USD operations do NOT require TJS reconciliation.
 */
export function requiresTjsReconciliation(item) {
  if (!item) return false;
  const isVoided = item.status === 'VOIDED' || item.status === 'CANCELLED';
  if (isVoided) return false;
  const cur = (item.currency || 'USD').toUpperCase();
  if (cur !== 'USD') return false;

  if (isPureUsdOperation(item)) return false;

  const rawTjs = item.amount_tjs ?? item.amountTjs ?? null;
  return rawTjs === null || rawTjs === undefined;
}
