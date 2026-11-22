import { useEffect, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Link, Navigate, NavLink, Outlet, Route, Routes, useLocation } from 'react-router-dom';
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

const MenuIcon = () => <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" /></svg>;
const CloseIcon = () => <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" strokeLinecap="round" /></svg>;

function Sidebar({ links, business, user, logout, open, onClose }) {
  const link = ({ isActive }) => `block rounded-xl px-4 py-3 font-semibold transition-colors ${isActive ? 'bg-bronze text-espresso' : 'text-ivory/80 hover:bg-white/10 hover:text-ivory'}`;
  return (
    <>
      {open && <button type="button" className="fixed inset-0 z-30 bg-espresso/50 md:hidden" onClick={onClose} aria-label="Close navigation" />}
      <aside className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col bg-espresso text-ivory shadow-xl transition-transform duration-300 md:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between px-5 py-5">
          <Link to="/app" onClick={onClose} className="font-serif text-2xl">TailorFlow</Link>
          <button type="button" onClick={onClose} className="rounded-full p-2 hover:bg-white/10 md:hidden" aria-label="Close navigation"><CloseIcon /></button>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto px-3" aria-label="Main">
          {links.map(([to, l, end]) => <NavLink key={to} to={to} end={end} onClick={onClose} className={link}>{l}</NavLink>)}
        </nav>
        <div className="border-t border-white/10 p-4">
          <div className="mb-3 text-sm">
            <p className="font-semibold">{business.name}</p>
            <p className="truncate text-ivory/60">{user.name}</p>
          </div>
          <button type="button" onClick={logout} className="w-full rounded-full border border-ivory/30 px-4 py-2 font-semibold hover:bg-white/10">Sign out</button>
        </div>
      </aside>
    </>
  );
}

function Shell() {
  const { business, user, logout } = useAuth();
  const loc = useLocation();
  const [navOpen, setNavOpen] = useState(false);
  const closeNav = () => setNavOpen(false);
  const links = user.role === 'owner' ? [...nav, ['/app/staff', 'Staff']] : nav;
  useEffect(() => { closeNav(); }, [loc.pathname]);
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') closeNav(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  return (
    <div className="shell min-h-screen pb-24 md:pb-0 md:pl-72">
      <Sidebar links={links} business={business} user={user} logout={logout} open={navOpen} onClose={closeNav} />
      <button type="button" onClick={() => setNavOpen(true)} className="fixed bottom-5 left-5 z-20 inline-flex items-center gap-2 rounded-full bg-espresso px-4 py-3 text-sm font-semibold text-ivory shadow-lg md:hidden" aria-label="Open navigation" aria-expanded={navOpen}>
        <MenuIcon /> Menu
      </button>
      <main className="mx-auto max-w-6xl px-4 py-8 md:py-10">
        <AnimatePresence mode="wait"><Outlet key={loc.pathname} /></AnimatePresence>
      </main>
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
