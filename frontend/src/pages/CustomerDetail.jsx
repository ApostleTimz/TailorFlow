import { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { api, useQuery } from '../api.js';
import { useAuth } from '../auth.jsx';
import { date, money, stageLabel } from '../lib.js';
import { Badge, Button, Empty, ErrorNote, LinkButton, Page, PageHeader, Spinner, statusTone } from '../ui.jsx';
import { CustomerForm } from './Customers.jsx';
import { DesignGallery } from './DesignImages.jsx';

export function MeasurementValues({ m, templates }) {
  const fields = (templates && templates[m.gender]) || [];
  const rows = fields.filter((f) => m.values[f.key] != null);
  return (
    <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 sm:grid-cols-3">
      {rows.map((f) => <div key={f.key} className="flex justify-between gap-2 border-b border-ivory-300 py-1"><dt className="text-charcoal/75">{f.label}</dt><dd className="font-semibold">{m.values[f.key]} {m.unit}</dd></div>)}
    </dl>
  );
}

export default function CustomerDetail() {
  const { id } = useParams();
  const [search] = useSearchParams();
  const { data, error, loading, reload } = useQuery(`/customers/${id}`);
  const tpl = useQuery('/measurement-templates');
  const { business } = useAuth();
  const [editing, setEditing] = useState(false);
  const [open, setOpen] = useState(null);
  const [tab, setTab] = useState('measurements');

  if (loading && !data) return <Spinner />;
  if (error) return <ErrorNote error={error} onRetry={reload} />;
  const { customer: c, measurements, orders } = data;
  const act = async (path) => { await api(`/customers/${id}/${path}`, { method: 'POST' }); reload(); };
  const tabCls = (t) => `rounded-full px-5 py-2 font-semibold ${tab === t ? 'bg-espresso text-ivory' : 'bg-ivory-200 text-charcoal'}`;

  return (
    <Page>
      <Link to="/app/customers" className="mb-3 inline-block font-semibold text-bronze-700 hover:underline">Back to customers</Link>
      {search.get('designs') === '1' && <div className="mb-4 rounded-xl bg-amber-100 p-3 text-amber-900">Measurements were saved, but the design images could not be uploaded. Add them from a measurement below.</div>}
      <PageHeader title={c.name} sub={[c.phone, c.email].filter(Boolean).join(' · ') || 'No contact details yet'}>
        {!c.archived && <LinkButton to={`/app/customers/${id}/measure`} variant="ghost">Take measurements</LinkButton>}
        {!c.archived && <LinkButton to={`/app/orders/new?customer=${id}`}>New order</LinkButton>}
      </PageHeader>
      {c.archived && <div className="mb-4 rounded-xl bg-amber-100 p-3 text-amber-900">This customer is archived. <button onClick={() => act('restore')} className="font-semibold underline">Restore</button></div>}
      <div className="card mb-6">
        {editing ? (
          <CustomerForm initial={c} submitLabel="Save changes" onCancel={() => setEditing(false)} onSaved={async (d) => { await api(`/customers/${id}`, { method: 'PATCH', body: d }); setEditing(false); reload(); }} />
        ) : (
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-1 text-charcoal/85">{c.address && <p>{c.address}</p>}{c.notes ? <p>{c.notes}</p> : <p className="text-charcoal/60">No notes yet.</p>}</div>
            <div className="flex gap-2"><Button variant="ghost" onClick={() => setEditing(true)}>Edit</Button>{!c.archived && <Button variant="danger" onClick={() => window.confirm('Archive this customer? Their records are kept.') && act('archive')}>Archive</Button>}</div>
          </div>
        )}
      </div>

      <div className="mb-4 flex gap-2" role="tablist">
        <button role="tab" aria-selected={tab === 'measurements'} className={tabCls('measurements')} onClick={() => setTab('measurements')}>Measurements ({measurements.length})</button>
        <button role="tab" aria-selected={tab === 'orders'} className={tabCls('orders')} onClick={() => setTab('orders')}>Orders ({orders.length})</button>
      </div>

      {tab === 'measurements' && (measurements.length === 0
        ? <Empty title="No measurements yet">Take measurements to use them on orders. <Link className="font-semibold text-bronze-700 underline" to={`/app/customers/${id}/measure`}>Take measurements</Link></Empty>
        : <ul className="space-y-3">{measurements.map((m, i) => (
          <li key={m.id} className="card">
            <button className="flex w-full flex-wrap items-center justify-between gap-2 text-left" aria-expanded={open === m.id} onClick={() => setOpen(open === m.id ? null : m.id)}>
              <span className="font-semibold text-espresso">{m.gender === 'male' ? 'Male' : 'Female'} measurements, version {m.version}</span>
              <span className="flex items-center gap-2 text-sm text-charcoal/70">{i === 0 || measurements.findIndex((x) => x.gender === m.gender) === i ? <Badge tone="dark">Latest</Badge> : null}{date(m.createdAt)} · {m.unit}</span>
            </button>
            {open === m.id && <>
              <MeasurementValues m={m} templates={tpl.data?.templates} />
              {m.notes && <p className="mt-3 text-charcoal/80">{m.notes}</p>}
              <div className="mt-4 border-t border-ivory-300 pt-4">
                <p className="font-semibold text-espresso">Design images</p>
                <DesignGallery measurement={m} onChanged={reload} />
              </div>
            </>}
          </li>))}</ul>)}

      {tab === 'orders' && (orders.length === 0
        ? <Empty title="No orders yet">Create this customer's first order.</Empty>
        : <ul className="space-y-3">{orders.map((o) => (
          <li key={o.id}><Link to={`/app/orders/${o.id}`} className="card flex flex-wrap items-center justify-between gap-3 hover:border-bronze">
            <span><b className="text-espresso">{o.reference}</b> · due {date(o.dueDate)}</span>
            <span className="flex items-center gap-3"><Badge tone={statusTone(o.status)}>{stageLabel(o.status)}</Badge><span className="font-semibold">{o.balanceMinor > 0 && o.status !== 'cancelled' ? `${money(o.balanceMinor, business.currency)} due` : 'Paid'}</span></span>
          </Link></li>))}</ul>)}
    </Page>
  );
}
