import { useId } from 'react';
import { motion } from 'framer-motion';

export function ChartCard({ title, subtitle, legend, className = '', children }) {
  return (
    <section className={`card ${className}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-serif text-xl text-espresso">{title}</h2>
          {subtitle && <p className="mt-1 text-sm text-charcoal/70">{subtitle}</p>}
        </div>
        {legend && (
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs font-semibold text-charcoal/70">
            {legend.map(([label, color]) => (
              <span key={label} className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} aria-hidden="true" />
                {label}
              </span>
            ))}
          </div>
        )}
      </div>
      {children}
    </section>
  );
}

const barHeight = (value, max) => (value > 0 ? Math.max(4, (value / max) * 100) : 0);

export function GroupedBarChart({ labels, series, formatValue, formatScale = String, emptyMessage, height = 176 }) {
  const peak = Math.max(0, ...series.flatMap((s) => s.values));
  const max = Math.max(1, peak);
  const summary = series.map((s) => `${s.name}: ${s.values.map((v, i) => formatValue(v, i, s.name)).join(', ')}`).join('; ');
  return (
    <div className="mt-5" role="img" aria-label={summary}>
      <p className="mb-1 text-xs text-charcoal/50">Scale: 0 – {formatScale(peak)}</p>
      <div className="relative" style={{ height }}>
        <div className="absolute inset-0 flex flex-col justify-between" aria-hidden="true">
          {[0, 0.25, 0.5, 0.75, 1].map((line) => <div key={line} className="border-t border-dashed border-ivory-300" />)}
        </div>
        <div className="absolute inset-0 flex gap-1.5 sm:gap-3">
          {labels.map((label, i) => (
            <div key={`${label}-${i}`} className="flex h-full flex-1 items-end justify-center gap-1 sm:gap-1.5">
              {series.map((s, sIndex) => (
                <motion.div
                  key={s.name}
                  className="w-full min-w-[5px] max-w-7 rounded-t-md"
                  style={{ height: `${barHeight(s.values[i], max)}%`, backgroundColor: s.color, transformOrigin: 'bottom' }}
                  initial={{ scaleY: 0 }}
                  animate={{ scaleY: 1 }}
                  transition={{ duration: 0.45, delay: i * 0.03 + sIndex * 0.05 }}
                  title={`${label}: ${s.name} — ${formatValue(s.values[i], i, s.name)}`}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
      <div className="mt-2 flex gap-1.5 sm:gap-3">
        {labels.map((label, i) => <span key={`${label}-${i}`} className="flex-1 text-center text-[10px] font-medium text-charcoal/60 sm:text-xs">{label}</span>)}
      </div>
      {emptyMessage && peak === 0 && <p className="mt-3 rounded-xl border border-dashed border-ivory-300 bg-ivory/40 px-3 py-2 text-center text-xs text-charcoal/60">{emptyMessage}</p>}
    </div>
  );
}

export function LineChart({ labels, series, formatValue, formatScale = String, emptyMessage, height = 176 }) {
  const rawId = useId();
  const id = rawId.replace(/:/g, '');
  const width = 600;
  const inset = 18;
  const innerWidth = width - inset * 2;
  const innerHeight = height - inset * 2;
  const bottom = height - inset;
  const peak = Math.max(0, ...series.flatMap((s) => s.values));
  const max = Math.max(1, peak);
  const x = (i) => inset + (i * innerWidth) / Math.max(1, labels.length - 1);
  const y = (v) => bottom - (v / max) * innerHeight;
  const summary = series.map((s) => `${s.name}: ${s.values.map((v, i) => formatValue(v, i, s.name)).join(', ')}`).join('; ');
  return (
    <div role="img" aria-label={summary}>
      <p className="mt-3 text-xs text-charcoal/50">Scale: 0 – {formatScale(peak)}</p>
      <svg viewBox={`0 0 ${width} ${height}`} className="mt-2 h-44 w-full overflow-visible">
        {[0, 0.25, 0.5, 0.75, 1].map((line) => (
          <line key={line} x1={inset} x2={width - inset} y1={bottom - line * innerHeight} y2={bottom - line * innerHeight} stroke="#ebe1cf" strokeDasharray="4 6" vectorEffect="non-scaling-stroke" />
        ))}
        {series.map((s, sIndex) => {
          const points = s.values.map((v, i) => [x(i), y(v)]);
          const line = points.map(([px, py], i) => `${i ? 'L' : 'M'} ${px} ${py}`).join(' ');
          const area = `${line} L ${points[points.length - 1][0]} ${bottom} L ${points[0][0]} ${bottom} Z`;
          const gradientId = `${id}-${sIndex}`;
          return (
            <g key={s.name}>
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={s.color} stopOpacity="0.22" />
                  <stop offset="100%" stopColor={s.color} stopOpacity="0" />
                </linearGradient>
              </defs>
              <motion.path d={area} fill={`url(#${gradientId})`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6, delay: 0.15 + sIndex * 0.1 }} />
              <motion.path d={line} fill="none" stroke={s.color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.7, delay: sIndex * 0.1 }} />
              {points.map(([px, py], i) => (
                <circle key={`${s.name}-${i}`} cx={px} cy={py} r={3.5} fill="#fff" stroke={s.color} strokeWidth={2} vectorEffect="non-scaling-stroke">
                  <title>{`${labels[i]}: ${s.name} — ${formatValue(s.values[i], i, s.name)}`}</title>
                </circle>
              ))}
            </g>
          );
        })}
      </svg>
      <div className="mt-1 flex justify-between px-1">
        {labels.map((label, i) => <span key={`${label}-${i}`} className="text-[10px] font-medium text-charcoal/60 sm:text-xs">{label}</span>)}
      </div>
      {emptyMessage && peak === 0 && <p className="mt-3 rounded-xl border border-dashed border-ivory-300 bg-ivory/40 px-3 py-2 text-center text-xs text-charcoal/60">{emptyMessage}</p>}
    </div>
  );
}
