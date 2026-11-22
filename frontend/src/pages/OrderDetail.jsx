import { useState } from 'react';
import { motion } from 'framer-motion';
import { Link, useParams } from 'react-router-dom';
import { api, useQuery } from '../api.js';
import { useAuth } from '../auth.jsx';
import { METHODS, STAGES, date, methodLabel, money, stageLabel, toMinor } from '../lib.js';
import { Badge, Button, ErrorNote, Field, Page, PageHeader, Spinner, statusTone } from '../ui.jsx';
import { MeasurementValues } from './CustomerDetail.jsx';

export default function OrderDetail() {
  const { id } = useParams();
  const { business } = useAuth();
  const { data, error, loading, reload, setData } = useQuery(`/orders/${id}`);
  const tpl = useQuery('/measurement-templates');
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('cash');
  const [note, setNote] = useState('');
  const [rev, setRev] = useState(null);
  const [reason, setReason] = useState('');
  const [msg, setMsg] = useState(null);
  const [showM, setShowM] = useState(false);
  const c = business.currency;

  if (loading && !data) return <Spinner />;
  if (error) return <ErrorNote error={error} onRetry={reload} />;
  const o = data.order;
  const closed = o.status === 'cancelled';
  const pct = o.totalMinor ? Math.min(100, Math.max(0, (o.paidMinor / o.totalMinor) * 100)) : 0;
  const run = async (fn) => { setMsg(null); try { const r = await fn(); setData({ order: r.order }); return true; } catch (e) { setMsg(e); return false; } };

  const addPayment = async (e) => {
    e.preventDefault();
    if (await run(() => api(`/orders/${id}/payments`, { method: 'POST', body: { amountMinor: toMinor(amount), method, note } }))) { setAmount(''); setNote(''); }
  };
  const reverse = async (pid) => { if (await run(() => api(`/orders/${id}/payments/${pid}/reverse`, { method: 'POST', body: { reason } }))) { setRev(null); setReason(''); } };
  const reversed = new Set(o.payments.map((p) => p.reversesId).filter(Boolean));

  return (
    <Page>
      <Link to={`/app/customers/${o.customer.id}`} className="mb-3 inline-block font-semibold text-bronze-700 hover:underline">Back to {o.customer.name}</Link>
      <PageHeader title={o.reference} sub={`${o.customer.name} · due ${date(o.dueDate)}`}>
        <Link to={`/app/orders/${id}/receipt`} className="rounded-full border border-bronze/70 px-5 py-2.5 font-semibold text-espresso hover:bg-bronze/10">Receipt / PDF</Link>
        <Badge tone={statusTone(o.status)}>{stageLabel(o.status)}</Badge>
        {!closed && o.status !== 'delivered' && <Button variant="danger" onClick={() => window.confirm('Cancel this order? Payments already recorded stay on file.') && run(() => api(`/orders/${id}`, { method: 'PATCH', body: { cancel: true } }))}>Cancel order</Button>}
      </PageHeader>
      <ErrorNote error={msg} />

      <section className="card mt-4">
        <h2 className="text-2xl">Garments</h2>
        <ul className="mt-3 divide-y divide-ivory-300">
          {o.items.map((it) => {
            const idx = STAGES.findIndex((s) => s[0] === it.stage);
            return (
              <li key={it.id} className="py-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div><b className="text-espresso">{it.garment}</b>{it.quantity > 1 && ` × ${it.quantity}`}<span className="ml-2 text-charcoal/70">{money(it.priceMinor * it.quantity, c)}</span>{it.description && <p className="text-sm text-charcoal/70">{it.description}</p>}</div>
                  <label className="text-sm font-semibold">Stage
                    <select disabled={closed} className="input ml-2 !w-auto" value={it.stage} onChange={(e) => run(() => api(`/orders/${id}/items/${it.id}`, { method: 'PATCH', body: { stage: e.target.value } }))}>
                      {STAGES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  </label>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-ivory-200" role="progressbar" aria-valuemin={0} aria-valuemax={9} aria-valuenow={idx} aria-label={`${it.garment} progress`}>
                  <motion.div className="h-full rounded-full bg-bronze" initial={false} animate={{ width: `${(idx / (STAGES.length - 1)) * 100}%` }} transition={{ type: 'spring', stiffness: 120, damping: 20 }} />
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="card mt-6">
        <h2 className="text-2xl">Payments</h2>
        <div className="mt-3 grid grid-cols-3 gap-3 text-center">
          {[['Total', o.totalMinor], ['Paid', o.paidMinor], ['Balance', o.balanceMinor]].map(([l, v]) => <div key={l} className="rounded-xl bg-ivory-200 p-3"><p className="text-sm font-semibold text-charcoal/70">{l}</p><p className="font-serif text-xl text-espresso md:text-2xl">{money(v, c)}</p></div>)}
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-ivory-200"><motion.div className="h-full bg-bronze" initial={false} animate={{ width: `${pct}%` }} /></div>
        {!closed && o.balanceMinor > 0 && (
          <form onSubmit={addPayment} className="mt-5 grid gap-3 sm:grid-cols-[1fr_1fr_1.2fr_auto] sm:items-end" noValidate>
            <Field label={`Amount (${c})`} error={msg?.fields?.amountMinor}><input className="input" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder={(o.balanceMinor / 100).toFixed(2)} /></Field>
            <Field label="Method"><select className="input" value={method} onChange={(e) => setMethod(e.target.value)}>{METHODS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></Field>
            <Field label="Note (optional)"><input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Second instalment" /></Field>
            <Button>Record payment</Button>
          </form>
        )}
        {o.payments.length === 0 ? <p className="mt-5 text-charcoal/70">No payments recorded yet.</p> : (
          <ul className="mt-5 divide-y divide-ivory-300">
            {o.payments.map((p) => (
              <li key={p.id} className="py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span><b className={p.amountMinor < 0 ? 'text-red-800' : 'text-espresso'}>{money(p.amountMinor, c)}</b> · {methodLabel(p.method)} · {date(p.paidAt)}{p.note && <span className="text-charcoal/70"> · {p.note}</span>}</span>
                  {p.amountMinor > 0 && !reversed.has(p.id) && <button className="text-sm font-semibold text-red-800 underline" onClick={() => { setRev(rev === p.id ? null : p.id); setReason(''); }}>Reverse</button>}
                  {reversed.has(p.id) && <Badge tone="bad">Reversed</Badge>}
                </div>
                {rev === p.id && (
                  <div className="mt-3 flex flex-wrap items-end gap-3">
                    <Field label="Reason for reversing" error={msg?.fields?.reason}><input className="input" value={reason} onChange={(e) => setReason(e.target.value)} /></Field>
                    <Button variant="danger" onClick={() => reverse(p.id)}>Confirm reversal</Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card mt-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-2xl">Measurements used</h2>
          {o.measurement && <Button variant="ghost" onClick={() => setShowM(!showM)}>{showM ? 'Hide' : 'Show'} measurements</Button>}
        </div>
        {o.measurement ? <>
          <p className="mt-2 text-charcoal/80">{o.measurement.gender === 'male' ? 'Male' : 'Female'} version {o.measurement.version}, saved {date(o.measurement.createdAt)}. Later updates will not change this order.</p>
          {showM && <MeasurementValues m={o.measurement} templates={tpl.data?.templates} />}
        </> : <p className="mt-2 text-charcoal/80">No measurements linked yet.</p>}
        {o.notes && <p className="mt-4 border-t border-ivory-300 pt-3">{o.notes}</p>}
      </section>
    </Page>
  );
}
