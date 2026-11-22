import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useQuery } from '../api.js';
import { useAuth } from '../auth.jsx';
import { date, money, stageLabel } from '../lib.js';
import { Badge, Empty, ErrorNote, LinkButton, Page, PageHeader, Spinner, statusTone } from '../ui.jsx';

const FILTERS = [['active', 'Active'], ['delivered', 'Delivered'], ['cancelled', 'Cancelled'], ['all', 'All']];

export default function Orders() {
  const [filter, setFilter] = useState('active');
  const [q, setQ] = useState('');
  const [dq, setDq] = useState('');
  const { business } = useAuth();
  useEffect(() => { const t = setTimeout(() => setDq(q), 250); return () => clearTimeout(t); }, [q]);
  const { data, error, loading, reload } = useQuery(`/orders?filter=${filter}&q=${encodeURIComponent(dq)}`);
  return (
    <Page>
      <PageHeader title="Orders" sub="Every garment, due date and balance."><LinkButton to="/app/orders/new">Create order</LinkButton></PageHeader>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex gap-2" role="group" aria-label="Filter orders">
          {FILTERS.map(([v, l]) => <button key={v} aria-pressed={filter === v} onClick={() => setFilter(v)} className={`rounded-full px-4 py-2 font-semibold ${filter === v ? 'bg-espresso text-ivory' : 'bg-ivory-200'}`}>{l}</button>)}
        </div>
        <input className="input max-w-xs" type="search" placeholder="Search order or customer" aria-label="Search orders" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      {loading && !data && <Spinner />}
      <ErrorNote error={error} onRetry={reload} />
      {data && (data.orders.length === 0 ? <Empty title="No orders here">Orders you create will appear in this list.</Empty> : (
        <motion.ul className="space-y-3" initial="h" animate="s" variants={{ s: { transition: { staggerChildren: 0.04 } } }}>
          {data.orders.map((o) => (
            <motion.li key={o.id} variants={{ h: { opacity: 0, y: 8 }, s: { opacity: 1, y: 0 } }}>
              <Link to={`/app/orders/${o.id}`} className="card flex flex-wrap items-center justify-between gap-3 hover:border-bronze">
                <span><b className="text-espresso">{o.reference}</b> · {o.customer.name}<span className="block text-sm text-charcoal/70">{o.items.map((i) => i.garment).join(', ')} · due {date(o.dueDate)}</span></span>
                <span className="flex items-center gap-3"><Badge tone={statusTone(o.status)}>{stageLabel(o.status)}</Badge>
                  <span className="font-semibold">{o.status === 'cancelled' ? '' : o.balanceMinor > 0 ? `${money(o.balanceMinor, business.currency)} due` : 'Paid'}</span></span>
              </Link>
            </motion.li>
          ))}
        </motion.ul>
      ))}
    </Page>
  );
}
