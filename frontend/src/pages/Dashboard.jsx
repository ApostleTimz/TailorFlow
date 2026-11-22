import { useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useQuery } from '../api.js';
import { useAuth } from '../auth.jsx';
import { ChartCard, GroupedBarChart, LineChart } from '../charts.jsx';
import { date, money } from '../lib.js';
import { Empty, ErrorNote, LinkButton, Page, PageHeader, Spinner } from '../ui.jsx';

const sum = (values) => values.reduce((total, value) => total + value, 0);
const monthLabel = (key) => new Date(`${key}-01T00:00:00Z`).toLocaleDateString(undefined, { month: 'short', timeZone: 'UTC' });

function Summary({ label, value, tone = 'text-espresso' }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-charcoal/60">{label}</p>
      <p className={`mt-0.5 font-serif text-lg ${tone}`}>{value}</p>
    </div>
  );
}

function OrderList({ title, orders, empty }) {
  return (
    <div className="card">
      <h2 className="text-2xl">{title}</h2>
      {orders.length === 0 ? <p className="mt-3 text-charcoal/70">{empty}</p> : (
        <ul className="mt-3 divide-y divide-ivory-300">
          {orders.map((o) => (
            <li key={o.id}><Link to={`/app/orders/${o.id}`} className="flex items-center justify-between gap-3 py-3 hover:text-bronze-700">
              <span><b>{o.reference}</b> · {o.customer.name}</span><span className="text-sm text-charcoal/70">{date(o.dueDate)}</span>
            </Link></li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function Dashboard() {
  const [months, setMonths] = useState(6);
  const { data, error, loading, reload } = useQuery('/dashboard');
  const trends = useQuery(`/dashboard/trends?months=${months}`);
  const { business, user } = useAuth();
  const c = business.currency;
  const trendData = trends.data;
  const labels = trendData?.months.map(monthLabel) || [];
  const received = trendData?.transactions.map((t) => t.totalMinor) || [];
  const spent = trendData?.expenses.map((e) => e.totalMinor) || [];
  const receivedTotal = sum(received);
  const spentTotal = sum(spent);
  const transactionCount = sum(trendData?.transactions.map((t) => t.count) || []);
  const orderTotal = sum(trendData?.orders.map((o) => o.count) || []);
  const customerTotal = sum(trendData?.customersGained || []);
  const stats = data && [
    ['Active orders', data.activeOrders], ['Customers', data.customers],
    ['Received this month', money(data.receivedThisMonthMinor, c)], ['Balances due', money(data.balancesDueMinor, c), `${data.unpaidOrders} unpaid order${data.unpaidOrders === 1 ? '' : 's'}`],
  ];
  return (
    <Page>
      <PageHeader title={`Hello, ${user.name.split(' ')[0]}`} sub="Here is what needs your attention today.">
        <LinkButton to="/app/customers" variant="ghost">Add customer</LinkButton>
        <LinkButton to="/app/orders/new">Create order</LinkButton>
      </PageHeader>
      {loading && <Spinner />}
      <ErrorNote error={error} onRetry={reload} />
      {data && (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {stats.map(([l, v, s], i) => (
              <motion.div key={l} className="card" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}>
                <p className="text-sm font-semibold text-charcoal/70">{l}</p>
                <p className="mt-1 font-serif text-3xl text-espresso">{v}</p>{s && <p className="text-sm text-charcoal/70">{s}</p>}
              </motion.div>
            ))}
          </div>
          <section className="mt-6" aria-labelledby="insights-heading">
            <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 id="insights-heading" className="text-2xl">Business insights</h2>
                <p className="text-sm text-charcoal/70">Monthly activity across your business.</p>
              </div>
              <div className="inline-flex rounded-full border border-ivory-300 bg-white/70 p-1" role="group" aria-label="Chart period">
                {[6, 12].map((m) => (
                  <button key={m} type="button" onClick={() => setMonths(m)} aria-pressed={months === m} className={`rounded-full px-3 py-1.5 text-sm font-semibold transition-colors ${months === m ? 'bg-espresso text-ivory' : 'text-charcoal/70 hover:text-espresso'}`}>{m} months</button>
                ))}
              </div>
            </div>
            {trends.loading && !trendData && <Spinner />}
            <ErrorNote error={trends.error} onRetry={trends.reload} />
            {trendData && (
              <div className={`grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] ${trends.loading ? 'opacity-60' : ''}`}>
                <ChartCard title="Transactions & expenses" subtitle={`Payments received against expenses over the last ${months} months.`} legend={[['Transactions', '#a67c52'], ['Expenses', '#2b1b14']]}>
                  <GroupedBarChart
                    labels={labels}
                    series={[
                      { name: 'Transactions', values: received, color: '#a67c52' },
                      { name: 'Expenses', values: spent, color: '#2b1b14' },
                    ]}
                    formatValue={(value, i, name) => name === 'Transactions' ? `${money(value, c)} from ${trendData.transactions[i].count} transaction${trendData.transactions[i].count === 1 ? '' : 's'}` : money(value, c)}
                    formatScale={(value) => money(value, c)}
                    emptyMessage="No transactions or expenses recorded in this period."
                  />
                  <div className="mt-4 grid grid-cols-3 gap-3 border-t border-ivory-300 pt-4">
                    <Summary label="Received" value={money(receivedTotal, c)} />
                    <Summary label="Spent" value={money(spentTotal, c)} />
                    <Summary label="Net" value={money(receivedTotal - spentTotal, c)} tone={receivedTotal - spentTotal < 0 ? 'text-red-800' : 'text-green-800'} />
                  </div>
                  <p className="mt-2 text-xs text-charcoal/60">{transactionCount} transactions recorded in this period.</p>
                </ChartCard>
                <ChartCard title="Orders & customers" subtitle={`New orders and customers gained over the last ${months} months.`} legend={[['Orders', '#74522e'], ['Customers gained', '#c9a275']]}>
                  <LineChart
                    labels={labels}
                    series={[
                      { name: 'Orders', values: trendData.orders.map((o) => o.count), color: '#74522e' },
                      { name: 'Customers gained', values: trendData.customersGained, color: '#c9a275' },
                    ]}
                    formatValue={(value, i, name) => `${value} ${name === 'Orders' ? 'orders' : 'customers'}`}
                    formatScale={(value) => `${value}`}
                    emptyMessage="No orders or new customers in this period."
                  />
                  <div className="mt-4 grid grid-cols-2 gap-3 border-t border-ivory-300 pt-4">
                    <Summary label="Orders" value={orderTotal} />
                    <Summary label="Customers gained" value={customerTotal} />
                  </div>
                </ChartCard>
              </div>
            )}
          </section>
          {data.customers === 0 && <div className="mt-6"><Empty title="Start with your first customer">Add a customer, take their measurements, then create an order. <Link className="font-semibold text-bronze-700 underline" to="/app/customers">Add a customer</Link></Empty></div>}
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <OrderList title={`Overdue (${data.overdueCount})`} orders={data.overdue} empty="Nothing overdue. Well done." />
            <OrderList title="Due in the next 7 days" orders={data.dueSoon} empty="No deliveries due this week." />
          </div>
        </>
      )}
    </Page>
  );
}
