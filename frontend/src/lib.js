export const money = (minor, currency = 'NGN') =>
  new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: 2 }).format((minor || 0) / 100);

export const toMinor = (v) => {
  const n = Number(String(v).replace(/,/g, ''));
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) : 0;
};

export const date = (d) => (d ? new Date(d.length === 10 ? d + 'T00:00:00' : d).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : 'No date');

export const STAGES = [
  ['new', 'New order'], ['measurement_confirmed', 'Measurement confirmed'], ['awaiting_fabric', 'Awaiting fabric'], ['cutting', 'Cutting'],
  ['sewing', 'Sewing'], ['fitting', 'Fitting'], ['adjustments', 'Adjustments'], ['quality_check', 'Quality check'], ['ready', 'Ready'], ['delivered', 'Delivered'],
];
export const stageLabel = (s) => (s === 'cancelled' ? 'Cancelled' : (STAGES.find((x) => x[0] === s) || [, s])[1]);
export const METHODS = [['cash', 'Cash'], ['transfer', 'Bank transfer'], ['card', 'Card'], ['mobile_money', 'Mobile money'], ['other', 'Other']];
export const methodLabel = (m) => (METHODS.find((x) => x[0] === m) || [, m])[1];
export const convert = (v, from, to) => (from === to ? v : Math.round((from === 'cm' ? v / 2.54 : v * 2.54) * 10) / 10);
export const today = () => new Date().toISOString().slice(0, 10);
