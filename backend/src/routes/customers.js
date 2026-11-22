const { Router } = require('express');
const { z } = require('zod');
const { Op } = require('sequelize');
const { sequelize, Customer, Measurement, MeasurementDesign, Order, OrderItem, Payment } = require('../models');
const { TEMPLATES, UNITS } = require('../measurements');
const { phoneSchema, escapeLike } = require('../lib/validation');
const { HttpError, wrap, parse, requireAuth, audit, uuidParams } = require('../middleware');

const r = Router();
r.use(requireAuth);
uuidParams(r, 'id');

const opt = (max) => z.string().trim().max(max).optional().nullable().transform((v) => v || null);
const customerSchema = z.object({
  name: z.string().trim().min(2, 'Enter the customer name.').max(120),
  phone: phoneSchema,
  email: z.string().trim().toLowerCase().max(254).email('Enter a valid email.').optional().nullable().or(z.literal('')).transform((v) => v || null),
  address: opt(300),
  notes: opt(2000),
});

const find = async (req) => {
  const c = await Customer.findOne({ where: { id: req.params.id, businessId: req.businessId } });
  if (!c) throw new HttpError(404, 'Customer not found.');
  return c;
};

r.get('/', wrap(async (req, res) => {
  const where = { businessId: req.businessId, archived: req.query.archived === '1' };
  const q = escapeLike(String(req.query.q || '').trim().slice(0, 60));
  if (q) where[Op.or] = [{ name: { [Op.iLike]: `%${q}%` } }, { phone: { [Op.iLike]: `%${q}%` } }];
  res.json({ customers: await Customer.findAll({ where, order: [['name', 'ASC']], limit: 200 }) });
}));

r.post('/', wrap(async (req, res) => {
  const d = parse(customerSchema, req.body);
  const c = await Customer.create({ ...d, businessId: req.businessId });
  await audit(req, 'customer.create', 'customer', c.id, { name: c.name });
  res.status(201).json({ customer: c });
}));

r.get('/:id', wrap(async (req, res) => {
  const customer = await find(req);
  const [measurements, orders] = await Promise.all([
    Measurement.findAll({ where: { customerId: customer.id, businessId: req.businessId }, include: [{ model: MeasurementDesign, as: 'designs' }], order: [['createdAt', 'DESC'], [{ model: MeasurementDesign, as: 'designs' }, 'position', 'ASC']] }),
    Order.findAll({
      where: { customerId: customer.id, businessId: req.businessId }, order: [['createdAt', 'DESC']],
      include: [{ model: OrderItem, as: 'items', separate: true }, { model: Payment, as: 'payments', separate: true }],
    }),
  ]);
  const summarised = orders.map((o) => {
    const j = o.toJSON();
    const paidMinor = j.payments.reduce((s, p) => s + p.amountMinor, 0);
    delete j.payments;
    return { ...j, paidMinor, balanceMinor: j.totalMinor - paidMinor };
  });
  res.json({ customer, measurements, orders: summarised });
}));

r.patch('/:id', wrap(async (req, res) => {
  const c = await find(req);
  const d = parse(customerSchema, { ...c.toJSON(), ...req.body });
  await c.update(d);
  await audit(req, 'customer.update', 'customer', c.id);
  res.json({ customer: c });
}));

for (const [path, value] of [['archive', true], ['restore', false]]) {
  r.post(`/:id/${path}`, wrap(async (req, res) => {
    const c = await find(req);
    await c.update({ archived: value });
    await audit(req, `customer.${path}`, 'customer', c.id);
    res.json({ customer: c });
  }));
}

const measureSchema = z.object({
  gender: z.enum(['male', 'female'], { errorMap: () => ({ message: 'Choose male or female measurements.' }) }),
  unit: z.enum(UNITS),
  values: z.record(z.number({ invalid_type_error: 'Use numbers only.' }).finite().positive('Must be above 0.')),
  notes: opt(1000),
});

r.get('/:id/measurements', wrap(async (req, res) => {
  const c = await find(req);
  res.json({ measurements: await Measurement.findAll({ where: { customerId: c.id, businessId: req.businessId }, include: [{ model: MeasurementDesign, as: 'designs' }], order: [['createdAt', 'DESC'], [{ model: MeasurementDesign, as: 'designs' }, 'position', 'ASC']] }) });
}));

r.post('/:id/measurements', wrap(async (req, res) => {
  const c = await find(req);
  const d = parse(measureSchema, req.body);
  const allowed = new Set(TEMPLATES[d.gender].map((x) => x.key));
  const max = d.unit === 'cm' ? 400 : 160;
  const values = {};
  for (const [k, v] of Object.entries(d.values)) {
    if (!allowed.has(k)) throw new HttpError(400, `"${k}" is not a ${d.gender} measurement.`, { [`values.${k}`]: 'Not a valid field.' });
    if (v > max) throw new HttpError(400, 'A value looks too large. Check the unit.', { [`values.${k}`]: `Must be ${max} ${d.unit} or less.` });
    values[k] = Math.round(v * 10) / 10;
  }
  if (!Object.keys(values).length) throw new HttpError(400, 'Enter at least one measurement.', { _: 'Enter at least one measurement.' });
  const m = await sequelize.transaction(async (transaction) => {
    const last = await Measurement.max('version', { where: { customerId: c.id, gender: d.gender }, transaction });
    const rec = await Measurement.create({ businessId: req.businessId, customerId: c.id, gender: d.gender, unit: d.unit, values, notes: d.notes, version: (last || 0) + 1 }, { transaction });
    await audit(req, 'measurement.create', 'measurement', rec.id, { customerId: c.id, version: rec.version }, transaction);
    return rec;
  });
  res.status(201).json({ measurement: m });
}));

module.exports = r;
