import { AnimatePresence } from 'framer-motion';
import { Navigate, NavLink, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from './auth.jsx';
import { Spinner } from './ui.jsx';
import Landing from './pages/Landing.jsx';
import { Login, Register, AccountAction } from './pages/Auth.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Customers from './pages/Customers.jsx';
import CustomerDetail from './pages/CustomerDetail.jsx';
import MeasurementForm from './pages/MeasurementForm.jsx';
import Orders from './pages/Orders.jsx';
import NewOrder from './pages/NewOrder.jsx';
import OrderDetail from './pages/OrderDetail.jsx';
import BusinessTools from './pages/BusinessTools.jsx';
import Legal from './pages/Legal.jsx';
import Receipt from './pages/Receipt.jsx';

function Protected() {
  const { session } = useAuth();
  if (session === undefined) return <Spinner />;
  return session ? <Shell /> : <Navigate to="/login" replace />;
}

const nav = [['/app', 'Dashboard', true], ['/app/customers', 'Customers'], ['/app/orders', 'Orders'], ['/app/calendar', 'Calendar'], ['/app/expenses', 'Expenses'], ['/app/inventory', 'Inventory']];

function Shell() {
  const { business, user, logout } = useAuth();
  const loc = useLocation();
  const link = ({ isActive }) => `rounded-full px-4 py-2 font-semibold transition-colors ${isActive ? 'bg-bronze text-espresso' : 'text-ivory/85 hover:bg-white/10'}`;
  const links = user.role === 'owner' ? [...nav, ['/app/staff', 'Staff']] : nav;
  return (
    <div className="min-h-screen pb-24 md:pb-0">
      <header className="sticky top-0 z-20 bg-espresso text-ivory">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-6">
            <span className="font-serif text-xl">TailorFlow</span>
            <nav className="hidden gap-1 md:flex" aria-label="Main">{links.map(([to, l, end]) => <NavLink key={to} to={to} end={end} className={link}>{l}</NavLink>)}</nav>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="hidden sm:block text-ivory/80">{business.name} · {user.name}</span>
            <button onClick={logout} className="rounded-full border border-ivory/30 px-4 py-1.5 font-semibold hover:bg-white/10">Sign out</button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">
        <AnimatePresence mode="wait"><Outlet key={loc.pathname} /></AnimatePresence>
      </main>
      <nav className="fixed inset-x-0 bottom-0 z-20 flex justify-around border-t border-white/10 bg-espresso p-2 md:hidden" aria-label="Main mobile">
        {links.map(([to, l, end]) => <NavLink key={to} to={to} end={end} className={link}>{l}</NavLink>)}
      </nav>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<AccountAction mode="forgot" />} />
      <Route path="/reset-password" element={<AccountAction mode="reset" />} />
      <Route path="/verify-email" element={<AccountAction mode="verify" />} />
      <Route path="/privacy" element={<Legal kind="privacy" />} />
      <Route path="/terms" element={<Legal kind="terms" />} />
      <Route path="/app" element={<Protected />}>
        <Route index element={<Dashboard />} />
        <Route path="customers" element={<Customers />} />
        <Route path="customers/:id" element={<CustomerDetail />} />
        <Route path="customers/:id/measure" element={<MeasurementForm />} />
        <Route path="orders" element={<Orders />} />
        <Route path="orders/new" element={<NewOrder />} />
        <Route path="orders/:id" element={<OrderDetail />} />
        <Route path="orders/:id/receipt" element={<Receipt />} />
        <Route path="calendar" element={<BusinessTools mode="calendar" />} />
        <Route path="expenses" element={<BusinessTools mode="expenses" />} />
        <Route path="inventory" element={<BusinessTools mode="inventory" />} />
        <Route path="staff" element={<BusinessTools mode="staff" />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
