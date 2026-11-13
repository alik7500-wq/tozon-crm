import { useEffect, useState } from 'react';
import { api } from '../../api/client';

export default function useWorkspaceRead(path, params, nonce, contextActor = null) {
  const sourceKey = JSON.stringify({path,params,contextActor});
  const requestKey = JSON.stringify({ path, params, nonce, contextActor });
  const [result, setResult] = useState(null);
  useEffect(() => {
    const request = JSON.parse(requestKey);
    if (!request.path) return;
    const controller = new AbortController(); let current = true;
    api.get(request.path, { params: request.params, signal: controller.signal })
      .then(r => { if (current) setResult({ key: requestKey, source: JSON.stringify({path:request.path,params:request.params,contextActor:request.contextActor}), data: r.data, error: '' }); })
      .catch(e => { if (current) setResult({ key: requestKey, source: JSON.stringify({path:request.path,params:request.params,contextActor:request.contextActor}), data: null, error: e.message, errorStatus:e.status??null }); });
    return () => { current = false; controller.abort(); };
  }, [requestKey]);
  // Retain only project navigation during a same-actor context refresh. Record
  // readers still clear their data; a denied context response clears everything.
  return result?.key === requestKey ? { ...result, loading: false } : { data: contextActor!=null&&path&&result?.source===sourceKey?result.data:null, error: '', loading: !!path };
}

