export const DISCOUNT_SCHEMES_CHANGED = 'tozon:discount-schemes-changed';
export const DISCOUNT_SCHEMES_STORAGE_KEY = 'tozon:discount-schemes-version';

export function notifyDiscountSchemesChanged() {
  window.dispatchEvent(new Event(DISCOUNT_SCHEMES_CHANGED));
  try {
    // Notify other tabs without storing prices or customer information.
    localStorage.setItem(DISCOUNT_SCHEMES_STORAGE_KEY, `${Date.now()}-${Math.random()}`);
  } catch { /* Same-tab updates still work when storage is unavailable. */ }
}
