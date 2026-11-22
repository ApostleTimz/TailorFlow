const { Router } = require('express');
const { z } = require('zod');
const { Op } = require('sequelize');
const { sequelize, STAGES, METHODS, Business, Customer, Measurement, Order, OrderItem, Payment } = require('../models');
const { HttpError, wrap, parse, requireAuth, audit, uuidParams } = require('../middleware');
const { optionalDate, escapeLike } = require('../lib/validation');
const { sendOrderNotification } = require('../lib/whatsapp');

const r = Router();
r.use(requireAuth);
uuidParams(r, 'id', 'itemId', 'paymentId');

const include = [
  { model: Customer, as: 'customer', attributes: ['id', 'name', 'phone'] },
  { model: OrderItem, as: 'items', separate: true, order: [['createdAt', 'ASC']] },
  { model: Payment, as: 'payments', separate: true, order: [['paidAt', 'ASC'], ['createdAt', 'ASC']] },
];
const measurementInclude = (businessId) => ({ model: Measurement, as: 'measurement', where: { businessId }, required: false });

function shape(o) {
  const j = o.toJSON();
  const paidMinor = (j.payments || []).reduce((s, p) => s + p.amountMinor, 0);
  return { ...j, paidMinor, balanceMinor: j.totalMinor - paidMinor };
}

const load = async (req, id, extra = {}) => {
  const o = await Order.findOne({ where: { id, businessId: req.businessId }, include: [...include, ...(extra.include || [])] });
  if (!o) throw new HttpError(404, 'Order not found.');
  return o;
};

const deriveStatus = (items) => {
  const idx = items.map((i) => STAGES.indexOf(i.stage));
  return STAGES[Math.min(...idx)];
};

r.get('/', wrap(async (req, res) => {
  const where = { businessId: req.businessId };
  const f = req.query.filter;
  if (f === 'active') where.status = { [Op.notIn]: ['delivered', 'cancelled'] };
  else if (f === 'delivered' || f === 'cancelled') where.status = f;
  const q = escapeLike(String(req.query.q || '').trim().slice(0, 60));
  if (q) where[Op.or] = [{ reference: { [Op.iLike]: `%${q}%` } }, { '$customer.name$': { [Op.iLike]: `%${q}%` } }];
  const orders = await Order.findAll({ where, include, order: [['dueDate', 'ASC NULLS LAST'], ['createdAt', 'DESC']], limit: 100 });
  res.json({ orders: orders.map(shape) });
}));

const orderSchema = z.object({
  customerId: z.string().uuid('Choose a customer.'),
  measurementId: z.string().uuid().nullable().optional(),
  dueDate: optionalDate,
  notes: z.string().trim().max(2000).optional().nullable().transform((v) => v || null),
  items: z.array(z.object({
    garment: z.string().trim().min(2, 'Enter the garment.').max(80),
    description: z.string().trim().max(500).optional().nullable().transform((v) => v || null),
    priceMinor: z.number().int().min(0).max(1_000_000_000),
    quantity: z.number().int().min(1).max(100).default(1),
  })).min(1, 'Add at least one garment.').max(30),
  deposit: z.object({ amountMinor: z.number().int().min(1).max(1_000_000_000), method: z.enum(METHODS) }).nullable().optional(),
});

r.post('/', wrap(async (req, res) => {
  const d = parse(orderSchema, req.body);
  const customer = await Customer.findOne({ where: { id: d.customerId, businessId: req.businessId } });
  if (!customer) throw new HttpError(400, 'Customer not found.', { customerId: 'Choose a customer.' });
  if (d.measurementId) {
    const m = await Measurement.findOne({ where: { id: d.measurementId, customerId: customer.id, businessId: req.businessId } });
    if (!m) throw new HttpError(400, 'Those measurements do not belong to this customer.', { measurementId: 'Choose a valid measurement record.' });
  }
  const total = d.items.reduce((s, i) => s + i.priceMinor * i.quantity, 0);
  if (total > 2_000_000_000) throw new HttpError(400, 'The order total is too large.');
  if (d.deposit && d.deposit.amountMinor > total) throw new HttpError(400, 'The deposit cannot be more than the order total.', { 'deposit.amountMinor': 'Cannot exceed the total.' });
  const stage = d.measurementId ? 'measurement_confirmed' : 'new';

  const id = await sequelize.transaction(async (transaction) => {
    const biz = await Business.findByPk(req.businessId, { transaction, lock: transaction.LOCK.UPDATE });
    biz.orderSeq += 1;
    await biz.save({ transaction });
    const order = await Order.create({
      businessId: req.businessId, customerId: customer.id, measurementId: d.measurementId || null,
      reference: `TF-${String(biz.orderSeq).padStart(4, '0')}`, status: stage, dueDate: d.dueDate, notes: d.notes, totalMinor: total,
    }, { transaction });
    await OrderItem.bulkCreate(d.items.map((i) => ({ ...i, orderId: order.id, stage })), { transaction });
    if (d.deposit) {
      await Payment.create({ businessId: req.businessId, orderId: order.id, amountMinor: d.deposit.amountMinor, method: d.deposit.method, note: 'Deposit' }, { transaction });
    }
    await audit(req, 'order.create', 'order', order.id, { reference: order.reference, totalMinor: total }, transaction);
    return order.id;
  });
  const order = shape(await load(req, id, { include: [measurementInclude(req.businessId)] }));
  res.status(201).json({ order });
  sendOrderNotification(order, req.business).catch((err) => console.error(`[whatsapp] failed to notify order ${order.reference}:`, err));
}));

r.get('/:id', wrap(async (req, res) => {
  const o = await load(req, req.params.id, { include: [measurementInclude(req.businessId)] });
  res.json({ order: shape(o) });
}));

r.patch('/:id', wrap(async (req, res) => {
  const d = parse(z.object({
    dueDate: orderSchema.shape.dueDate.optional(),
    notes: orderSchema.shape.notes.optional(),
    cancel: z.literal(true).optional(),
  }).refine((v) => Object.keys(v).length > 0, 'Nothing to update.'), req.body);
  const o = await load(req, req.params.id);
  if (o.status === 'cancelled') throw new HttpError(409, 'This order is cancelled.');
  if (d.cancel && o.status === 'delivered') throw new HttpError(409, 'A delivered order cannot be cancelled.');
  const patch = {};
  if (d.dueDate !== undefined) patch.dueDate = d.dueDate;
  if (d.notes !== undefined) patch.notes = d.notes;
  if (d.cancel) patch.status = 'cancelled';
  await o.update(patch);
  await audit(req, d.cancel ? 'order.cancel' : 'order.update', 'order', o.id, patch);
  res.json({ order: shape(await load(req, o.id, { include: [measurementInclude(req.businessId)] })) });
}));

r.patch('/:id/items/:itemId', wrap(async (req, res) => {
  const { stage } = parse(z.object({ stage: z.enum(STAGES) }), req.body);
  const o = await load(req, req.params.id);
  if (o.status === 'cancelled' || o.status === 'delivered') throw new HttpError(409, 'This order can no longer be changed.');
  const item = o.items.find((i) => i.id === req.params.itemId);
  if (!item) throw new HttpError(404, 'Garment not found.');
  if (STAGES.indexOf(stage) < STAGES.indexOf(item.stage)) throw new HttpError(409, 'A garment cannot move backwards.');
  await sequelize.transaction(async (transaction) => {
    const from = item.stage;
    if (stage === 'delivered' && o.items.every((i) => i.id === item.id || i.stage === 'delivered')) {
      const paid = (await Payment.sum('amountMinor', { where: { orderId: o.id }, transaction })) || 0;
      if (o.totalMinor - paid > 0) throw new HttpError(400, 'Settle the balance before marking the order delivered.', { stage: 'Balance is still due.' });
    }
    await item.update({ stage }, { transaction });
    await o.update({ status: deriveStatus(o.items) }, { transaction });
    await audit(req, 'order.stage', 'order', o.id, { itemId: item.id, from, to: stage }, transaction);
  });
  res.json({ order: shape(await load(req, o.id, { include: [measurementInclude(req.businessId)] })) });
}));

const paymentSchema = z.object({
  amountMinor: z.number({ invalid_type_error: 'Enter an amount.' }).int().min(1, 'Enter an amount above 0.').max(1_000_000_000),
  method: z.enum(METHODS, { errorMap: () => ({ message: 'Choose a payment method.' }) }),
  note: z.string().trim().max(300).optional().nullable().transform((v) => v || null),
});

r.post('/:id/payments', wrap(async (req, res) => {
  const d = parse(paymentSchema, req.body);
  await sequelize.transaction(async (transaction) => {
    const o = await Order.findOne({ where: { id: req.params.id, businessId: req.businessId }, transaction, lock: transaction.LOCK.UPDATE });
    if (!o) throw new HttpError(404, 'Order not found.');
    if (o.status === 'cancelled') throw new HttpError(409, 'This order is cancelled.');
    const paid = (await Payment.sum('amountMinor', { where: { orderId: o.id }, transaction })) || 0;
    if (d.amountMinor > o.totalMinor - paid) throw new HttpError(400, 'That is more than the balance due.', { amountMinor: 'More than the balance due.' });
    const p = await Payment.create({ ...d, businessId: req.businessId, orderId: o.id }, { transaction });
    await audit(req, 'payment.create', 'payment', p.id, { orderId: o.id, amountMinor: d.amountMinor }, transaction);
  });
  res.status(201).json({ order: shape(await load(req, req.params.id, { include: [measurementInclude(req.businessId)] })) });
}));

r.post('/:id/payments/:paymentId/reverse', wrap(async (req, res) => {
  const { reason } = parse(z.object({ reason: z.string().trim().min(3, 'Give a short reason.').max(290) }), req.body);
  await sequelize.transaction(async (transaction) => {
    const o = await Order.findOne({ where: { id: req.params.id, businessId: req.businessId }, transaction, lock: transaction.LOCK.UPDATE });
    if (!o) throw new HttpError(404, 'Order not found.');
    const p = await Payment.findOne({ where: { id: req.params.paymentId, orderId: o.id, businessId: req.businessId }, transaction });
    if (!p || p.amountMinor <= 0) throw new HttpError(404, 'Payment not found.');
    if (await Payment.findOne({ where: { reversesId: p.id }, transaction })) throw new HttpError(409, 'This payment was already reversed.');
    const rev = await Payment.create({ businessId: req.businessId, orderId: o.id, amountMinor: -p.amountMinor, method: p.method, note: `Reversal: ${reason}`, reversesId: p.id }, { transaction });
    await audit(req, 'payment.reverse', 'payment', rev.id, { reverses: p.id, reason }, transaction);
  });
  res.json({ order: shape(await load(req, req.params.id, { include: [measurementInclude(req.businessId)] })) });
}));

module.exports = r;
