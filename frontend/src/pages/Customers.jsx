import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { api, useQuery } from '../api.js';
import { Button, Empty, ErrorNote, Field, Page, PageHeader, Spinner } from '../ui.jsx';

export function CustomerForm({ initial = {}, onSaved, onCancel, submitLabel = 'Save customer' }) {
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);
  const f = err?.fields || {};
  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setErr(null);
    try { await onSaved(Object.fromEntries(new FormData(e.target))); } catch (x) { setErr(x); } finally { setBusy(false); }
  };
  return (
    <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2" noValidate>
      <Field label="Full name" error={f.name}><input className="input" name="name" defaultValue={initial.name} required autoFocus /></Field>
      <Field label="Phone or WhatsApp" error={f.phone}><input className="input" name="phone" type="tel" defaultValue={initial.phone || ''} /></Field>
      <Field label="Email (optional)" error={f.email}><input className="input" name="email" type="email" defaultValue={initial.email || ''} /></Field>
      <Field label="Address (optional)" error={f.address}><input className="input" name="address" defaultValue={initial.address || ''} /></Field>
      <div className="sm:col-span-2"><Field label="Notes and preferences (optional)" error={f.notes}><textarea className="input" name="notes" rows={2} defaultValue={initial.notes || ''} /></Field></div>
      {err && !Object.keys(f).length && <div className="sm:col-span-2"><ErrorNote error={err} /></div>}
      <div className="flex gap-2 sm:col-span-2"><Button disabled={busy}>{busy ? 'Saving...' : submitLabel}</Button>{onCancel && <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>}</div>
    </form>
  );
}

export default function Customers() {
  const [q, setQ] = useState('');
  const [dq, setDq] = useState('');
  const [archived, setArchived] = useState(false);
  const [adding, setAdding] = useState(false);
  const nav = useNavigate();
  useEffect(() => { const t = setTimeout(() => setDq(q), 250); return () => clearTimeout(t); }, [q]);
  const { data, error, loading, reload } = useQuery(`/customers?q=${encodeURIComponent(dq)}${archived ? '&archived=1' : ''}`);

  return (
    <Page>
      <PageHeader title="Customers" sub="Find anyone by name or phone number.">
        <Button onClick={() => setAdding((a) => !a)}>{adding ? 'Close' : 'Add customer'}</Button>
      </PageHeader>
      <AnimatePresence>
        {adding && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="card mb-6"><CustomerForm onCancel={() => setAdding(false)} onSaved={async (d) => { const r = await api('/customers', { method: 'POST', body: d }); nav(`/app/customers/${r.customer.id}`); }} /></div>
          </motion.div>
        )}
      </AnimatePresence>
      <div className="mb-4 flex flex-wrap gap-3">
        <input className="input max-w-md" type="search" placeholder="Search by name or phone" aria-label="Search customers" value={q} onChange={(e) => setQ(e.target.value)} />
        <label className="flex items-center gap-2 font-semibold"><input type="checkbox" checked={archived} onChange={(e) => setArchived(e.target.checked)} className="h-5 w-5 accent-bronze" /> Show archived</label>
      </div>
      {loading && !data && <Spinner />}
      <ErrorNote error={error} onRetry={reload} />
      {data && (data.customers.length === 0
        ? <Empty title={dq ? 'No matching customers' : 'No customers yet'}>{dq ? 'Try a different name or number.' : 'Add your first customer to get started.'}</Empty>
        : (
          <motion.ul className="divide-y divide-ivory-300 overflow-hidden rounded-2xl border border-ivory-300 bg-white/70" initial="h" animate="s" variants={{ s: { transition: { staggerChildren: 0.03 } } }}>
            {data.customers.map((c) => (
              <motion.li key={c.id} variants={{ h: { opacity: 0, x: -8 }, s: { opacity: 1, x: 0 } }}>
                <Link to={`/app/customers/${c.id}`} className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-ivory-200">
                  <span className="font-semibold text-espresso">{c.name}</span><span className="text-charcoal/70">{c.phone || 'No phone'}</span>
                </Link>
              </motion.li>
            ))}
          </motion.ul>
        ))}
    </Page>
  );
}
