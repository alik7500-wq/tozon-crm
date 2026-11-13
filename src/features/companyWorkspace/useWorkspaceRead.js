import { useEffect, useState } from 'react';
import { api } from '../../api/client';

export default function useWorkspaceRead(path, params, nonce) {
  const requestKey = JSON.stringify({ path, params, nonce });
  const [result, setResult] = useState(null);
  useEffect(() => {
    const request = JSON.parse(requestKey);
    if (!request.path) return;
    const controller = new AbortController(); let current = true;
    api.get(request.path, { params: request.params, signal: controller.signal })
      .then(r => { if (current) setResult({ key: requestKey, data: r.data, error: '' }); })
      .catch(e => { if (current) setResult({ key: requestKey, data: null, error: e.message }); });
    return () => { current = false; controller.abort(); };
  }, [requestKey]);
  return result?.key === requestKey ? { ...result, loading: false } : { data: null, error: '', loading: !!path };
}

