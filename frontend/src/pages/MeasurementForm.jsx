import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, useQuery } from '../api.js';
import { convert } from '../lib.js';
import { Button, ErrorNote, Field, Page, PageHeader, Spinner } from '../ui.jsx';
import { DesignPicker } from './DesignImages.jsx';

function Segmented({ label, value, onChange, options, id }) {
  return (
    <div role="radiogroup" aria-label={label} className="relative inline-flex rounded-full bg-ivory-200 p-1">
      {options.map(([v, l]) => (
        <button key={v} type="button" role="radio" aria-checked={value === v} onClick={() => onChange(v)} className={`relative z-10 rounded-full px-6 py-2 font-semibold transition-colors ${value === v ? 'text-ivory' : 'text-charcoal'}`}>
          {value === v && <motion.span layoutId={id} className="absolute inset-0 -z-10 rounded-full bg-espresso" transition={{ type: 'spring', stiffness: 400, damping: 32 }} />}
          {l}
        </button>
      ))}
    </div>
  );
}

export default function MeasurementForm() {
  const { id } = useParams();
  const nav = useNavigate();
  const cust = useQuery(`/customers/${id}`);
  const tpl = useQuery('/measurement-templates');
  const [gender, setGender] = useState('female');
  const [unit, setUnit] = useState('cm');
  const [vals, setVals] = useState({});
  const [notes, setNotes] = useState('');
  const [prefilled, setPrefilled] = useState(null);
  const [designs, setDesigns] = useState([]);
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);

  const latest = useMemo(() => cust.data && cust.data.measurements.find((m) => m.gender === gender), [cust.data, gender]);
  useEffect(() => {
    if (!cust.data) return;
    if (latest) {
      const v = {};
      for (const [k, n] of Object.entries(latest.values)) v[k] = String(convert(n, latest.unit, unit));
      setVals(v); setPrefilled(latest);
    } else { setVals({}); setPrefilled(null); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gender, cust.data]);

  const changeUnit = (u) => {
    if (u === unit) return;
    setVals((cur) => Object.fromEntries(Object.entries(cur).map(([k, v]) => [k, Number(v) > 0 ? String(convert(Number(v), unit, u)) : v])));
    setUnit(u);
  };

  if ((cust.loading && !cust.data) || (tpl.loading && !tpl.data)) return <Spinner />;
  if (cust.error || tpl.error) return <ErrorNote error={cust.error || tpl.error} />;
  const fields = tpl.data.templates[gender];
  const groups = [...new Set(fields.map((f) => f.group))];
  const f = err?.fields || {};

  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setErr(null);
    const values = {};
    for (const [k, v] of Object.entries(vals)) if (Number(v) > 0) values[k] = Number(v);
    try {
      const created = await api(`/customers/${id}/measurements`, { method: 'POST', body: { gender, unit, values, notes } });
      let designWarning = false;
      if (designs.length) {
        try { await api(`/measurements/${created.measurement.id}/designs`, { method: 'POST', body: { designs } }); }
        catch { designWarning = true; }
      }
      nav(`/app/customers/${id}${designWarning ? '?designs=1' : ''}`);
    } catch (x) { setErr(x); setBusy(false); }
  };

  return (
    <Page>
      <Link to={`/app/customers/${id}`} className="mb-3 inline-block font-semibold text-bronze-700 hover:underline">Back to {cust.data.customer.name}</Link>
      <PageHeader title="Take measurements" sub="Saving creates a new dated version. Older versions and existing orders are never changed." />
      <form onSubmit={submit} noValidate>
        <div className="mb-6 flex flex-wrap gap-4">
          <Segmented id="g" label="Measurement type" value={gender} onChange={setGender} options={[['female', 'Female'], ['male', 'Male']]} />
          <Segmented id="u" label="Unit" value={unit} onChange={changeUnit} options={[['cm', 'Centimetres'], ['in', 'Inches']]} />
        </div>
        {prefilled && <p className="mb-4 rounded-xl bg-ivory-200 p-3">Filled in from version {prefilled.version}. Change only what has changed.</p>}
        <motion.div key={gender} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          {groups.map((g) => (
            <fieldset key={g} className="card">
              <legend className="px-2 font-serif text-xl text-espresso">{g}</legend>
              <div className="mt-2 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {fields.filter((x) => x.group === g).map((x) => (
                  <Field key={x.key} label={`${x.label} (${unit})`} error={f[`values.${x.key}`]}>
                    <input className="input" inputMode="decimal" type="number" step="0.1" min="0" value={vals[x.key] ?? ''} aria-invalid={!!f[`values.${x.key}`]} onChange={(e) => setVals({ ...vals, [x.key]: e.target.value })} />
                  </Field>
                ))}
              </div>
            </fieldset>
          ))}
          <Field label="Notes (optional)" hint="For example posture, preferred fit or fabric stretch."><textarea className="input" rows={2} value={notes} maxLength={1000} onChange={(e) => setNotes(e.target.value)} /></Field>
          <div className="card">
            <p className="font-semibold text-espresso">Design images (optional)</p>
            <p className="mb-3 text-sm text-charcoal/70">Attach up to three design images to this set of measurements.</p>
            <DesignPicker value={designs} onChange={setDesigns} />
          </div>
        </motion.div>
        {err && <div className="mt-4"><ErrorNote error={err} /></div>}
        <div className="mt-6"><Button disabled={busy}>{busy ? 'Saving...' : 'Save measurements'}</Button></div>
      </form>
    </Page>
  );
}
