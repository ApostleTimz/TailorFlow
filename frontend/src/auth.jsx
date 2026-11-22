import { createContext, useContext, useEffect, useState } from 'react';
import { api } from './api.js';

const Ctx = createContext(null);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined); // undefined = loading, null = signed out
  useEffect(() => { api('/auth/me').then(setSession).catch(() => setSession(null)); }, []);
  const value = {
    session,
    user: session && session.user,
    business: session && session.business,
    login: async (b) => setSession(await api('/auth/login', { method: 'POST', body: b })),
    register: async (b) => api('/auth/register', { method: 'POST', body: b }),
    logout: async () => { await api('/auth/logout', { method: 'POST' }).catch(() => {}); setSession(null); },
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
