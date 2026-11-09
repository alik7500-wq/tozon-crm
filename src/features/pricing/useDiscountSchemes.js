import { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { DISCOUNT_SCHEMES_CHANGED, DISCOUNT_SCHEMES_STORAGE_KEY } from '../settings/discountSchemeUpdates';

export function useDiscountSchemes(unitId, reload) {
  const [schemes, setSchemes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    let requestId = 0;
    let controller;
    setLoading(true);
    setError('');
    const refresh = async () => {
      const current = ++requestId;
      controller?.abort();
      controller = new AbortController();
      try {
        const response = await api.get('/discount-schemes', { signal: controller.signal });
        if (!alive || current !== requestId) return;
        const next = response.data?.schemes || [];
        setSchemes(previous => JSON.stringify(previous) === JSON.stringify(next) ? previous : next);
        setError('');
      } catch {
        if (alive && current === requestId) setError('Не удалось загрузить схемы скидок. Повторите загрузку перед расчётом.');
      } finally {
        if (alive && current === requestId) setLoading(false);
      }
    };
    const refreshVisible = () => { if (document.visibilityState !== 'hidden') refresh(); };
    const onStorage = event => { if (event.key === DISCOUNT_SCHEMES_STORAGE_KEY) refreshVisible(); };
    refresh();
    window.addEventListener(DISCOUNT_SCHEMES_CHANGED, refreshVisible);
    window.addEventListener('storage', onStorage);
    window.addEventListener('focus', refreshVisible);
    document.addEventListener('visibilitychange', refreshVisible);
    const timer = window.setInterval(refreshVisible, 30000);
    return () => {
      alive = false;
      controller?.abort();
      window.clearInterval(timer);
      window.removeEventListener(DISCOUNT_SCHEMES_CHANGED, refreshVisible);
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('focus', refreshVisible);
      document.removeEventListener('visibilitychange', refreshVisible);
    };
  }, [unitId, reload]);

  return { schemes, loading, error };
}
