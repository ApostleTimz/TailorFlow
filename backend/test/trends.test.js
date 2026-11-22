const test = require('node:test');
const assert = require('node:assert/strict');
const { trendMonths, totals, counts } = require('../src/lib/trends');

test('trendMonths builds contiguous UTC month keys ending in the current month', () => {
  assert.deepEqual(trendMonths(3, new Date('2026-01-15T22:00:00Z')), ['2025-11', '2025-12', '2026-01']);
  assert.deepEqual(trendMonths(12, new Date('2026-01-01T00:00:00Z'))[0], '2025-02');
});

test('totals buckets rows by month and fills missing months with zeroes', () => {
  const keys = ['2026-04', '2026-05', '2026-06'];
  const rows = [
    { key: '2026-04', count: '2', total: '150000' },
    { key: '2026-06', count: '1', total: '4250' },
  ];
  assert.deepEqual(totals(keys, rows), [
    { count: 2, totalMinor: 150000 },
    { count: 0, totalMinor: 0 },
    { count: 1, totalMinor: 4250 },
  ]);
});

test('counts buckets rows by month and fills missing months with zeroes', () => {
  const keys = ['2026-04', '2026-05', '2026-06'];
  assert.deepEqual(counts(keys, [{ key: '2026-05', count: '3' }]), [0, 3, 0]);
});
