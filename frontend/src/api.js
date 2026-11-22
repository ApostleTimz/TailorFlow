import { useCallback, useEffect, useState } from 'react';

export class ApiError extends Error {
  constructor(message, status, fields) { super(message); this.status = status; this.fields = fields || {}; }
}

export async function api(path, { method = 'GET', body } = {}) {
  let res;
  try {
    res = await fetch('/api' + path, { method, credentials: 'same-origin', headers: body ? { 'Content-Type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined });
  } catch { throw new ApiError('No connection. Check your internet and try again.', 0); }
  let data = null;
  try { data = await res.json(); } catch { /* empty body */ }
  if (!res.ok) throw new ApiError((data && data.error) || 'Something went wrong. Please try again.', res.status, data && data.fields);
  return data;
}

export function useQuery(path) {
  const [state, setState] = useState({ data: null, error: null, loading: !!path });
  const load = useCallback(async () => {
    if (!path) return;
    try { setState((s) => ({ ...s, loading: true })); setState({ data: await api(path), error: null, loading: false }); }
    catch (e) { setState({ data: null, error: e, loading: false }); }
  }, [path]);
  useEffect(() => { load(); }, [load]);
  return { ...state, reload: load, setData: (data) => setState((s) => ({ ...s, data })) };
}
