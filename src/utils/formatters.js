/**
 * Formats a contract number to its short numeric format.
 * Strips out prefixes like '25601-2026-0003' -> '0003'
 */
export const formatContractNumber = (raw) => {
  if (!raw && raw !== 0) return '—';
  const str = String(raw).trim();
  const parts = str.split('-');
  if (parts.length >= 2) {
    const lastPart = parts[parts.length - 1];
    if (/^\d+$/.test(lastPart)) {
      return lastPart;
    }
  }
  return str;
};
