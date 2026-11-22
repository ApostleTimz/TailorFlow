import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth.jsx';
import { btn } from '../ui.jsx';

const line = ['Every measurement,', 'order and payment', 'in its place.'];
const steps = [
  ['Add the customer', 'Name, phone number and preferences, searchable in seconds.'],
  ['Save measurements', 'Male and female templates with centimetres or inches, saved as dated versions.'],
  ['Create the order', 'Garments, prices, due date and a deposit, linked to the exact measurements used.'],
  ['Record payments', 'Every payment is counted and the balance updates itself.'],
];
const reveal = { initial: { opacity: 0, y: 24 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, margin: '-60px' }, transition: { duration: 0.6 } };
const fittingPhotos = [
  'https://images.pexels.com/photos/5264926/pexels-photo-5264926.jpeg?auto=compress&cs=tinysrgb&w=900',
  'https://images.pexels.com/photos/9852968/pexels-photo-9852968.jpeg?auto=compress&cs=tinysrgb&w=900',
  'https://images.pexels.com/photos/6461063/pexels-photo-6461063.jpeg?auto=compress&cs=tinysrgb&w=900',
  'https://images.pexels.com/photos/9852976/pexels-photo-9852976.jpeg?auto=compress&cs=tinysrgb&w=900',
  'https://images.pexels.com/photos/4620607/pexels-photo-4620607.jpeg?auto=compress&cs=tinysrgb&w=900',
  'https://images.pexels.com/photos/6765071/pexels-photo-6765071.jpeg?auto=compress&cs=tinysrgb&w=900',
];

export default function Landing() {
  const { session } = useAuth();
  const cta = session ? ['/app', 'Open dashboard'] : ['/register', 'Create your free account'];
  return (
    <div>
      <header className="fixed inset-x-0 top-0 z-20 flex items-center justify-between bg-espresso/95 px-5 py-3 text-ivory backdrop-blur">
        <span className="font-serif text-2xl">TailorFlow</span>
        <div className="flex items-center gap-3">
          {!session && <Link to="/login" className="px-3 py-2 font-semibold hover:underline">Sign in</Link>}
          <Link to={cta[0]} className={btn('primary', '!py-2')}>{session ? 'Dashboard' : 'Get started'}</Link>
        </div>
      </header>

      <section className="relative isolate grid min-h-screen items-center gap-10 overflow-hidden bg-espresso px-5 pb-16 pt-28 text-ivory md:grid-cols-[1.1fr_.9fr] md:px-[max(2rem,calc((100vw-72rem)/2))]">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0 flex flex-col justify-center gap-1 overflow-hidden opacity-90">
          {[false, true].map((reverse) => <motion.div key={String(reverse)} className="flex h-[48%] w-max gap-1" animate={{ x: reverse ? ['-50%', '0%'] : ['0%', '-50%'] }} transition={{ duration: reverse ? 82 : 72, repeat: Infinity, ease: 'linear' }}>
            {[...fittingPhotos, ...fittingPhotos].map((src, i) => <div key={`${reverse}-${i}`} className="h-full w-[32vw] min-w-[260px] max-w-[480px] overflow-hidden"><img src={src} alt="" className="h-full w-full object-cover" /></div>)}
          </motion.div>)}
        </div>
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-r from-espresso/75 via-espresso/30 to-espresso/10" />
        <div className="relative z-10">
          <h1 className="text-5xl leading-[1.05] !text-ivory md:text-7xl" aria-label={line.join(' ')}>
            {line.map((l, i) => (
              <span key={l} className="block overflow-hidden pb-1">
                <motion.span className="block" initial={{ y: '105%' }} animate={{ y: 0 }} transition={{ duration: 0.9, delay: i * 0.15, ease: [0.2, 0.7, 0.2, 1] }}>{l}</motion.span>
              </span>
            ))}
          </h1>
          <motion.p className="mt-7 max-w-xl text-xl text-ivory-200" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }}>
            TailorFlow brings customers, measurements, orders and payments together, so nothing gets lost between the notebook and the sewing machine.
          </motion.p>
          <motion.div className="mt-9 flex flex-wrap gap-3" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1 }}>
            <Link to={cta[0]} className={btn('primary')}>{cta[1]}</Link>
            <a href="#how" className={btn('ghost', '!text-ivory')}>See how it works</a>
          </motion.div>
        </div>
      </section>

      <section className="bg-ivory-200 px-5 py-20 md:py-24">
        <div className="mx-auto max-w-6xl">
          <motion.div {...reveal} className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div><p className="font-semibold uppercase tracking-[0.18em] text-bronze-700">The fitting room</p><h2 className="mt-2 text-4xl md:text-5xl">Every detail, measured by hand</h2></div>
            <p className="max-w-md text-charcoal/75">A closer look at the people and craft behind a perfectly fitted garment.</p>
          </motion.div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              [fittingPhotos[2], 'Taking a careful measurement'],
              [fittingPhotos[3], 'Checking the fit together'],
              [fittingPhotos[4], 'Getting the waist just right'],
              [fittingPhotos[5], 'Preparing a custom suit'],
            ].map(([src, caption], i) => <motion.figure key={src} {...reveal} transition={{ duration: 0.6, delay: i * 0.08 }} className="group relative h-72 overflow-hidden rounded-2xl bg-espresso sm:h-80">
              <img src={src} alt={caption} loading="lazy" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
              <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-espresso/90 to-transparent px-4 pb-4 pt-16 font-semibold text-ivory">{caption}</figcaption>
            </motion.figure>)}
          </div>
        </div>
      </section>

      <section id="how" className="mx-auto max-w-6xl px-5 py-24">
        <motion.h2 {...reveal} className="max-w-3xl text-4xl md:text-5xl">One customer, one order, one trail from first fitting to final payment</motion.h2>
        <ol className="mt-14 grid gap-8 border-t-[3px] border-dashed border-bronze pt-10 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map(([t, d], i) => (
            <motion.li key={t} {...reveal} transition={{ duration: 0.6, delay: i * 0.1 }}>
              <span className="font-serif text-5xl text-bronze-700">{i + 1}</span>
              <h3 className="mt-3 text-2xl">{t}</h3><p className="mt-2 text-charcoal/80">{d}</p>
            </motion.li>
          ))}
        </ol>
      </section>

      <section className="bg-ivory-200 py-24">
        <div className="mx-auto grid max-w-6xl gap-12 px-5 md:grid-cols-2">
          <motion.div {...reveal}>
            <h2 className="text-4xl md:text-5xl">Measurements for men and women</h2>
            <p className="mt-5 text-lg text-charcoal/85">Separate male and female templates cover the measurements tailors actually take, from chest and trouser length to bust, underbust and dress length. Work in centimetres or inches, and every update is saved as a new dated version.</p>
          </motion.div>
          <motion.div {...reveal} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {[
              ['Male', 'Neck, chest, waist, hip, sleeve, shirt length, trouser length, inseam, thigh and more', fittingPhotos[5], 'A tailor measuring a man for a suit fitting'],
              ['Female', 'Bust, underbust, waist, hip, shoulder, bust point, blouse, dress and skirt length and more', fittingPhotos[2], 'A tailor measuring a woman for a custom garment'],
            ].map(([t, d, image, alt]) => (
              <div key={t} className="overflow-hidden rounded-2xl border border-ivory-300 bg-white/70">
                <img src={image} alt={alt} loading="lazy" className="h-44 w-full object-cover sm:h-52" />
                <div className="p-5"><h3 className="text-2xl">{t}</h3><p className="mt-2 text-charcoal/80">{d}</p></div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      <section className="bg-charcoal py-24 text-ivory">
        <div className="mx-auto max-w-6xl px-5">
          <motion.h2 {...reveal} className="text-4xl !text-ivory md:text-5xl">Rules we build by</motion.h2>
          <div className="mt-12 grid gap-10 md:grid-cols-3">
            {[['Old orders keep their measurements', 'Update a customer and work already in progress stays exactly as agreed.'], ['Payments keep their history', 'Each payment is its own record. Corrections are reversals you can trace, never silent edits.'], ['Your records stay yours', 'Every business is kept separate from every other business.']].map(([t, d], i) => (
              <motion.div key={t} {...reveal} transition={{ duration: 0.6, delay: i * 0.1 }} className="md:border-l md:border-white/20 md:pl-8 md:first:border-0 md:first:pl-0">
                <h3 className="text-2xl !text-ivory">{t}</h3><p className="mt-3 text-ivory-300">{d}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-5 py-24 text-center">
        <motion.div {...reveal}>
          <h2 className="text-4xl md:text-5xl">Put your shop in order today</h2>
          <p className="mt-4 text-lg text-charcoal/80">Create an account, add your first customer and take their measurements in minutes.</p>
          <Link to={cta[0]} className={btn('dark', 'mt-8')}>{cta[1]}</Link>
        </motion.div>
      </section>
      <footer className="bg-espresso px-5 py-8 text-center text-sm text-ivory-300">TailorFlow · Customers, measurements, orders and payments in one place. <span className="mx-2">·</span><Link className="underline" to="/privacy">Privacy</Link><span className="mx-2">·</span><Link className="underline" to="/terms">Terms</Link></footer>
    </div>
  );
}
