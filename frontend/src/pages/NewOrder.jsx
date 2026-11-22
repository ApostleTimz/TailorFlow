import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api, useQuery } from '../api.js';
import { useAuth } from '../auth.jsx';
import { METHODS, date, money, toMinor } from '../lib.js';
import { Button, ErrorNote, Field, Page, PageHeader, Spinner } from '../ui.jsx';

const GARMENTS = ['Agbada', 'Senator suit', 'Kaftan', 'Two-piece suit', 'Shirt', 'Trouser', 'Dress', 'Gown', 'Skirt', 'Blouse', 'Iro and buba', 'Alteration'];
const blank = () => ({ garment: '', description: '', price: '', quantity: 1 });

export default function NewOrder() {
  const [sp] = useSearchParams();
  const nav = useNavigate();
  const { business } = useAuth();
  const [cid, setCid] = useState(sp.get('customer') || '');
  const [mid, setMid] = useState('');
  const [items, setItems] = useState([blank()]);
  const [due, setDue] = useState('');
  const [notes, setNotes] = useState('');
  const [dep, setDep] = useState('');
  const [method, setMethod] = useState('cash');
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);
  const list = useQuery('/customers');
  const cust = useQuery(cid ? `/customers/${cid}` : null);
  const f = err?.fields || {};
  const total = items.reduce((s, i) => s + toMinor(i.price) * (Number(i.quantity) || 1), 0);
  const set = (i, k, v) => setItems(items.map((x, j) => (j === i ? { ...x, [k]: v } : x)));
  const ms = (cid && cust.data && cust.data.customer.id === cid) ? cust.data.measurements : [];
  const effectiveMid = mid && ms.some((m) => m.id === mid) ? mid : (ms[0] ? ms[0].id : '');
  const [useMeasure, setUseMeasure] = useState(true);

  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setErr(null);
    try {
      const body = {
        customerId: cid, measurementId: useMeasure && effectiveMid ? effectiveMid : null, dueDate: due || null, notes,
        items: items.map((i) => ({ garment: i.garment, description: i.description, priceMinor: toMinor(i.price), quantity: Number(i.quantity) || 1 })),
        deposit: toMinor(dep) > 0 ? { amountMinor: toMinor(dep), method } : null,
      };
      const r = await api('/orders', { method: 'POST', body });
      nav(`/app/orders/${r.order.id}`);
    } catch (x) { setErr(x); setBusy(false); }
  };

  if (list.loading && !list.data) return <Spinner />;
  return (
    <Page>
      <PageHeader title="Create order" sub="Choose the customer, the garments and the measurements to use." />
      <form onSubmit={submit} className="space-y-6" noValidate>
        <div className="card grid gap-4 sm:grid-cols-2">
          <Field label="Customer" error={f.customerId}>
            <select className="input" value={cid} onChange={(e) => { setCid(e.target.value); setMid(''); }} required>
              <option value="">Choose a customer</option>
              {list.data?.customers.map((c) => <option key={c.id} value={c.id}>{c.name}{c.phone ? ` · ${c.phone}` : ''}</option>)}
            </select>
          </Field>
          <div>
            {cid && cust.loading ? <p className="pt-7 text-charcoal/70">Loading measurements...</p> : cid && (ms.length === 0
              ? <p className="pt-7">No measurements saved yet. <Link className="font-semibold text-bronze-700 underline" to={`/app/customers/${cid}/measure`}>Take measurements</Link></p>
              : (<>
                <Field label="Measurements for this order" error={f.measurementId}>
                  <select className="input" value={effectiveMid} disabled={!useMeasure} onChange={(e) => setMid(e.target.value)}>
                    {ms.map((m) => <option key={m.id} value={m.id}>{m.gender === 'male' ? 'Male' : 'Female'} · version {m.version} · {date(m.createdAt)}</option>)}
                  </select>
                </Field>
                <label className="mt-2 flex items-center gap-2 text-sm"><input type="checkbox" className="h-4 w-4 accent-bronze" checked={!useMeasure} onChange={(e) => setUseMeasure(!e.target.checked)} /> Confirm measurements later</label>
              </>))}
          </div>
        </div>

        <div className="card space-y-4">
          <h2 className="text-2xl">Garments</h2>
          <datalist id="garments">{GARMENTS.map((g) => <option key={g} value={g} />)}</datalist>
          {items.map((it, i) => (
            <div key={i} className="grid gap-3 rounded-xl border border-ivory-300 p-4 sm:grid-cols-[1.2fr_1fr_.5fr_auto]">
              <Field label="Garment" error={f.items}><input list="garments" className="input" value={it.garment} onChange={(e) => set(i, 'garment', e.target.value)} placeholder="e.g. Agbada" /></Field>
              <Field label={`Price (${business.currency})`}><input className="input" inputMode="decimal" value={it.price} onChange={(e) => set(i, 'price', e.target.value)} placeholder="0.00" /></Field>
              <Field label="Qty"><input className="input" type="number" min="1" max="100" value={it.quantity} onChange={(e) => set(i, 'quantity', e.target.value)} /></Field>
              {items.length > 1 && <button type="button" className="self-end pb-3 font-semibold text-red-800 underline" onClick={() => setItems(items.filter((_, j) => j !== i))}>Remove</button>}
              <div className="sm:col-span-4"><Field label="Design notes (optional)"><input className="input" value={it.description} onChange={(e) => set(i, 'description', e.target.value)} placeholder="Fabric, style, details" /></Field></div>
            </div>
          ))}
          <Button type="button" variant="ghost" onClick={() => items.length < 30 && setItems([...items, blank()])}>Add another garment</Button>
          <p className="text-right font-serif text-2xl text-espresso">Total {money(total, business.currency)}</p>
        </div>

        <div className="card grid gap-4 sm:grid-cols-2">
          <Field label="Due date" error={f.dueDate}><input className="input" type="date" value={due} onChange={(e) => setDue(e.target.value)} /></Field>
          <Field label="Order notes (optional)"><input className="input" value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
          <Field label={`Deposit received (${business.currency}, optional)`} error={f['deposit.amountMinor']}><input className="input" inputMode="decimal" value={dep} onChange={(e) => setDep(e.target.value)} placeholder="0.00" /></Field>
          <Field label="Deposit method"><select className="input" value={method} onChange={(e) => setMethod(e.target.value)}>{METHODS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></Field>
        </div>
        {err && <ErrorNote error={err} />}
        <Button disabled={busy || !cid}>{busy ? 'Creating...' : 'Create order'}</Button>
      </form>
    </Page>
  );
}
