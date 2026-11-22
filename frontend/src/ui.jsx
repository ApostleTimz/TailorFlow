import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

const variants = {
  primary: 'bg-bronze text-espresso hover:bg-bronze-300',
  dark: 'bg-espresso text-ivory hover:bg-espresso-600',
  ghost: 'border border-bronze/70 text-espresso hover:bg-bronze/10',
  danger: 'border border-red-800/60 text-red-800 hover:bg-red-800/10',
};
export const btn = (v = 'primary', extra = '') =>
  `inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-base font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${variants[v]} ${extra}`;

export const Button = ({ variant, className, ...p }) => <motion.button whileTap={{ scale: 0.97 }} className={btn(variant, className)} {...p} />;
export const LinkButton = ({ variant, className, ...p }) => <Link className={btn(variant, className)} {...p} />;

export function Field({ label, error, hint, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-semibold text-espresso">{label}</span>
      {children}
      {hint && !error && <span className="mt-1 block text-sm text-charcoal/70">{hint}</span>}
      {error && <span className="mt-1 block text-sm text-red-800" role="alert">{error}</span>}
    </label>
  );
}

export const Page = ({ children }) => (
  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>{children}</motion.div>
);

export const PageHeader = ({ title, children, sub }) => (
  <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
    <div><h1 className="text-3xl md:text-4xl">{title}</h1>{sub && <p className="mt-1 text-charcoal/70">{sub}</p>}</div>
    <div className="flex flex-wrap gap-2">{children}</div>
  </div>
);

export const Spinner = () => <div className="flex justify-center py-16" role="status" aria-label="Loading"><div className="h-8 w-8 animate-spin rounded-full border-4 border-ivory-300 border-t-bronze" /></div>;

export function ErrorNote({ error, onRetry }) {
  if (!error) return null;
  return (
    <div className="rounded-xl border border-red-800/30 bg-red-50 p-4 text-red-900" role="alert">
      {error.message || String(error)}
      {onRetry && <button onClick={onRetry} className="ml-3 font-semibold underline">Try again</button>}
    </div>
  );
}

export const Empty = ({ title, children }) => (
  <div className="rounded-2xl border border-dashed border-bronze/60 p-10 text-center">
    <p className="font-serif text-xl text-espresso">{title}</p>
    <div className="mt-2 text-charcoal/75">{children}</div>
  </div>
);

export const Badge = ({ children, tone = 'plain' }) => (
  <span className={`inline-block whitespace-nowrap rounded-full px-3 py-1 text-sm font-semibold ${{ plain: 'bg-ivory-200 text-charcoal', dark: 'bg-espresso text-ivory', warn: 'bg-amber-100 text-amber-900', good: 'bg-green-100 text-green-900', bad: 'bg-red-100 text-red-900' }[tone]}`}>{children}</span>
);

export const statusTone = (s) => (s === 'delivered' ? 'good' : s === 'cancelled' ? 'bad' : s === 'ready' ? 'dark' : 'plain');
