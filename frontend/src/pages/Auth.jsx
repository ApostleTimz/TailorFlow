import { useState } from 'react';
import { motion } from 'framer-motion';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth.jsx';
import { api } from '../api.js';
import { Button, ErrorNote, Field } from '../ui.jsx';

const CURRENCIES = [['NGN', 'Naira (NGN)'], ['USD', 'US dollar (USD)'], ['GBP', 'Pound (GBP)'], ['EUR', 'Euro (EUR)'], ['GHS', 'Cedi (GHS)'], ['KES', 'Kenyan shilling (KES)'], ['ZAR', 'Rand (ZAR)'], ['CAD', 'Canadian dollar (CAD)'], ['AUD', 'Australian dollar (AUD)']];

const PHOTOS = {
  main: 'https://images.pexels.com/photos/5264926/pexels-photo-5264926.jpeg?auto=compress&cs=tinysrgb&w=1400',
  fitting: 'https://images.pexels.com/photos/9852968/pexels-photo-9852968.jpeg?auto=compress&cs=tinysrgb&w=500',
  fabric: 'https://images.pexels.com/photos/6461063/pexels-photo-6461063.jpeg?auto=compress&cs=tinysrgb&w=500',
  studio: 'https://images.pexels.com/photos/4620607/pexels-photo-4620607.jpeg?auto=compress&cs=tinysrgb&w=500',
};

const SHOWCASE = {
  login: {
    eyebrow: 'Welcome back',
    headline: 'Every stitch, right where you left it.',
    copy: 'Your customers, measurements, orders and balances are waiting. Sign in and carry on from the fitting room or the counter.',
    points: ['Pick up any order in seconds', 'See who still owes you at a glance', 'Measurements saved to every customer'],
  },
  register: {
    eyebrow: 'Made for tailors',
    headline: 'Run your workshop from one calm place.',
    copy: 'Trade the scattered notebook for a simple home for customers, measurements, orders and payments. Set up once and get straight back to your craft.',
    points: ['No paper trail to lose', 'Prices and deposits in your currency', 'Ready on your phone and at your desk'],
  },
  security: {
    eyebrow: 'Account security',
    headline: 'Your work stays yours.',
    copy: 'A few quick steps keep your business details safe and get you back into your workshop.',
    points: ['Links expire after one hour', 'One-time use for every reset', 'Back to your dashboard in moments'],
  },
};

const gallery = [
  [PHOTOS.fitting, 'Fittings'],
  [PHOTOS.fabric, 'Fabrics'],
  [PHOTOS.studio, 'Your studio'],
];

function Showcase({ content }) {
  return (
    <aside className="relative isolate overflow-hidden bg-espresso text-ivory">
      <img src={PHOTOS.main} alt="" className="absolute inset-0 -z-20 h-full w-full object-cover object-center" />
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-b from-espresso/85 via-espresso/75 to-espresso" />
      <div className="flex min-h-[260px] flex-col justify-between gap-8 p-6 sm:p-8 lg:min-h-screen lg:p-12">
        <Link to="/" className="font-serif text-2xl text-ivory">TailorFlow</Link>
        <div className="max-w-lg">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-bronze-300">{content.eyebrow}</p>
          <h2 className="mt-3 font-serif text-3xl leading-tight !text-ivory sm:text-4xl lg:text-5xl">{content.headline}</h2>
          <p className="mt-4 text-ivory-200">{content.copy}</p>
          <ul className="mt-6 hidden gap-3 text-sm text-ivory lg:grid">
            {content.points.map((point) => (
              <li key={point} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-bronze text-xs font-bold text-espresso">✓</span>
                {point}
              </li>
            ))}
          </ul>
        </div>
        <div className="hidden grid-cols-3 gap-3 lg:grid">
          {gallery.map(([src, label]) => (
            <figure key={label} className="overflow-hidden rounded-xl border border-ivory/20">
              <img src={src} alt={label} className="h-24 w-full object-cover" />
              <figcaption className="bg-espresso/70 px-2 py-1.5 text-xs text-ivory-200">{label}</figcaption>
            </figure>
          ))}
        </div>
      </div>
    </aside>
  );
}

function Shell({ title, sub, children, foot, showcase }) {
  return (
    <div className="min-h-screen bg-ivory lg:grid lg:grid-cols-[1.05fr_.95fr]">
      <Showcase content={showcase || SHOWCASE.security} />
      <main className="grid place-items-center bg-gradient-to-b from-ivory to-ivory-200 px-4 py-10 lg:py-16">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="w-full max-w-md rounded-3xl border border-ivory-300 bg-white p-8 shadow-xl shadow-espresso/10">
          <h1 className="text-3xl">{title}</h1><p className="mt-1 text-charcoal/75">{sub}</p>
          <div className="mt-6">{children}</div>
          <p className="mt-6 text-center text-charcoal/80">{foot}</p>
        </motion.div>
      </main>
    </div>
  );
}

function useSubmit(fn) {
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setError(null);
    try { await fn(Object.fromEntries(new FormData(e.target))); } catch (err) { setError(err); } finally { setBusy(false); }
  };
  return { error, busy, submit };
}

const EyeIcon = ({ hidden }) => hidden
  ? <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="m3 3 18 18" strokeLinecap="round" /><path d="M10.6 6.1A10.9 10.9 0 0 1 12 6c6 0 9.5 6 9.5 6a17.4 17.4 0 0 1-2.1 2.7M6.2 6.2C3.8 8 2.5 12 2.5 12s3.5 6 9.5 6c1.6 0 3-.4 4.2-1.1" strokeLinecap="round" strokeLinejoin="round" /><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" strokeLinecap="round" /></svg>
  : <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" strokeLinecap="round" strokeLinejoin="round" /><circle cx="12" cy="12" r="2.75" /></svg>;

function PasswordField({ label, error, hint, className = '', ...props }) {
  const [visible, setVisible] = useState(false);
  return <Field label={label} error={error} hint={hint}>
    <div className="relative">
      <input {...props} className={`input pr-12 ${className}`} type={visible ? 'text' : 'password'} />
      <button type="button" onClick={() => setVisible((v) => !v)} aria-label={visible ? 'Hide password' : 'Show password'} aria-pressed={visible} className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-xl text-charcoal/60 transition-colors hover:text-espresso focus:outline-none focus:ring-2 focus:ring-inset focus:ring-bronze">
        <EyeIcon hidden={visible} />
      </button>
    </div>
  </Field>;
}

export function Login() {
  const { login, session } = useAuth();
  const nav = useNavigate();
  const { error, busy, submit } = useSubmit(async (d) => { await login(d); nav('/app'); });
  if (session) return <Navigate to="/app" replace />;
  return (
    <Shell showcase={SHOWCASE.login} title="Welcome back" sub="Sign in to your tailoring business." foot={<>New here? <Link className="font-semibold text-bronze-700 underline" to="/register">Create an account</Link></>}>
      <form onSubmit={submit} className="grid gap-4" noValidate>
        <Field label="Email address" error={error?.fields?.email}><input className="input" name="email" type="email" autoComplete="email" required /></Field>
        <PasswordField label="Password" error={error?.fields?.password} name="password" autoComplete="current-password" required />
        <Link className="text-sm font-semibold text-bronze-700 underline" to="/forgot-password">Forgot your password?</Link>
        {error && !Object.keys(error.fields).length && <ErrorNote error={error} />}
        <Button disabled={busy}>{busy ? 'Signing in...' : 'Sign in'}</Button>
      </form>
    </Shell>
  );
}

export function Register() {
  const { register, login, session } = useAuth();
  const nav = useNavigate();
  const { error, busy, submit } = useSubmit(async (d) => {
    const result = await register(d);
    if (result.emailVerified) { await login({ email: d.email, password: d.password }); nav('/app'); }
    else nav('/verify-email?sent=1');
  });
  if (session) return <Navigate to="/app" replace />;
  const f = error?.fields || {};
  return (
    <Shell showcase={SHOWCASE.register} title="Create your account" sub="Set up your tailoring business in a minute." foot={<>Already registered? <Link className="font-semibold text-bronze-700 underline" to="/login">Sign in</Link></>}>
      <form onSubmit={submit} className="grid gap-4" noValidate>
        <Field label="Business name" error={f.businessName}><input className="input" name="businessName" autoComplete="organization" required /></Field>
        <Field label="Your name" error={f.name}><input className="input" name="name" autoComplete="name" required /></Field>
        <Field label="Email address" error={f.email}><input className="input" name="email" type="email" autoComplete="email" required /></Field>
        <PasswordField label="Password" error={f.password} hint="At least 8 characters." name="password" autoComplete="new-password" required />
        <Field label="Currency for prices and payments" error={f.currency}><select className="input" name="currency" defaultValue="NGN">{CURRENCIES.map(([c, l]) => <option key={c} value={c}>{l}</option>)}</select></Field>
        {error && !Object.keys(f).length && <ErrorNote error={error} />}
        <Button disabled={busy}>{busy ? 'Creating account...' : 'Create account'}</Button>
      </form>
    </Shell>
  );
}

export function AccountAction({ mode }) {
  const params = new URLSearchParams(window.location.search);
  const token = params.get('token');
  const [message, setMessage] = useState(mode === 'verify' && !token ? (params.get('sent') ? 'Check your inbox for a verification link.' : 'Use the verification link from your email.') : '');
  const { error, busy, submit } = useSubmit(async (d) => {
    if (mode === 'verify') { const r = await api('/auth/verify-email', { method: 'POST', body: { token } }); setMessage(r.message); }
    else { const r = await api(mode === 'forgot' ? '/auth/forgot-password' : '/auth/reset-password', { method: 'POST', body: mode === 'forgot' ? d : { ...d, token } }); setMessage(r.message); }
  });
  const title = mode === 'forgot' ? 'Reset your password' : mode === 'reset' ? 'Choose a new password' : 'Verify your email';
  return <Shell title={title} sub="TailorFlow account security." foot={<Link className="font-semibold text-bronze-700 underline" to="/login">Back to sign in</Link>}>
    {message && <p className="mb-4 rounded-xl bg-green-50 p-3 text-green-900">{params.get('sent') ? 'Check your inbox for a verification link.' : message}</p>}
    {mode !== 'verify' && <form onSubmit={submit} className="grid gap-4" noValidate>
      {mode === 'forgot' ? <Field label="Email address"><input className="input" name="email" type="email" required /></Field> : <Field label="New password" hint="At least 8 characters."><input className="input" name="password" type="password" minLength="8" required /></Field>}
      {error && <ErrorNote error={error} />}<Button disabled={busy}>{busy ? 'Please wait...' : mode === 'forgot' ? 'Send reset link' : 'Reset password'}</Button>
    </form>}
    {mode === 'verify' && token && <form onSubmit={submit}><ErrorNote error={error}/><Button disabled={busy}>{busy ? 'Verifying...' : 'Verify email'}</Button></form>}
  </Shell>;
}
