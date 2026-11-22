const monthKey = (d) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;

const trendMonths = (count, now = new Date()) =>
  Array.from({ length: count }, (_, i) => monthKey(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (count - 1 - i), 1))));

const totals = (keys, rows) => {
  const by = new Map(rows.map((row) => [row.key, row]));
  return keys.map((key) => {
    const row = by.get(key);
    return { count: Number(row?.count || 0), totalMinor: Number(row?.total || 0) };
  });
};

const counts = (keys, rows) => {
  const by = new Map(rows.map((row) => [row.key, Number(row.count)]));
  return keys.map((key) => by.get(key) || 0);
};

module.exports = { trendMonths, totals, counts };
