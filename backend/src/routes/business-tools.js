const { Router } = require('express');
const { z } = require('zod');
const { Op } = require('sequelize');
const { Expense, InventoryItem, Order, Customer, OrderItem, Payment } = require('../models');
const { dateString, calendarRange } = require('../lib/validation');
const { wrap, parse, requireAuth, audit, auditEvent, HttpError, uuidParams } = require('../middleware');

const r = Router();
r.use(requireAuth);
uuidParams(r, 'id');

const expenseSchema = z.object({
  description: z.string().trim().min(2).max(180),
  amountMinor: z.number().int().positive().max(1_000_000_000),
  category: z.string().trim().max(80).optional().nullable(),
  spentAt: dateString,
});
const inventorySchema = z.object({
  name: z.string().trim().min(2).max(120),
  sku: z.string().trim().max(60).optional().nullable(),
  quantity: z.number().min(0).max(1_000_000),
  unit: z.string().trim().min(1).max(30),
  reorderAt: z.number().min(0).max(1_000_000),
  unitCostMinor: z.number().int().min(0).max(1_000_000_000),
});
const inventoryPatchSchema = inventorySchema.partial().refine((v) => Object.keys(v).length > 0, 'Nothing to update.');

r.get('/expenses', wrap(async (req, res) => res.json({ expenses: await Expense.findAll({ where: { businessId: req.businessId }, order: [['spentAt', 'DESC'], ['createdAt', 'DESC']], limit: 500 }) })));

r.post('/expenses', wrap(async (req, res) => {
  const expense = await Expense.create({ ...parse(expenseSchema, req.body), businessId: req.businessId });
  await audit(req, 'expense.create', 'expense', expense.id, { amountMinor: expense.amountMinor });
  res.status(201).json({ expense });
}));

r.delete('/expenses/:id', wrap(async (req, res) => {
  const expense = await Expense.findOne({ where: { id: req.params.id, businessId: req.businessId } });
  if (!expense) throw new HttpError(404, 'Expense not found.');
  await expense.destroy();
  await audit(req, 'expense.delete', 'expense', expense.id);
  res.json({ ok: true });
}));

r.get('/inventory', wrap(async (req, res) => res.json({ items: await InventoryItem.findAll({ where: { businessId: req.businessId }, order: [['name', 'ASC']] }) })));

r.post('/inventory', wrap(async (req, res) => {
  const item = await InventoryItem.create({ ...parse(inventorySchema, req.body), businessId: req.businessId });
  await audit(req, 'inventory.create', 'inventory', item.id);
  res.status(201).json({ item });
}));

r.patch('/inventory/:id', wrap(async (req, res) => {
  const d = parse(inventoryPatchSchema, req.body);
  const item = await InventoryItem.findOne({ where: { id: req.params.id, businessId: req.businessId } });
  if (!item) throw new HttpError(404, 'Inventory item not found.');
  await item.update(d);
  await audit(req, 'inventory.update', 'inventory', item.id, d);
  res.json({ item });
}));

r.delete('/inventory/:id', wrap(async (req, res) => {
  const item = await InventoryItem.findOne({ where: { id: req.params.id, businessId: req.businessId } });
  if (!item) throw new HttpError(404, 'Inventory item not found.');
  await item.destroy();
  await audit(req, 'inventory.delete', 'inventory', item.id);
  res.json({ ok: true });
}));

r.get('/calendar', wrap(async (req, res) => {
  const { start, end } = parse(calendarRange, req.query);
  const orders = await Order.findAll({
    where: { businessId: req.businessId, dueDate: { [Op.between]: [start, end] } },
    include: [{ model: Customer, as: 'customer', attributes: ['id', 'name'] }, { model: OrderItem, as: 'items', attributes: ['garment', 'stage'] }],
    order: [['dueDate', 'ASC']], limit: 1000,
  });
  res.json({ orders });
}));

r.get('/receipts/:id', wrap(async (req, res) => {
  const order = await Order.findOne({
    where: { id: req.params.id, businessId: req.businessId },
    include: [
      { model: Customer, as: 'customer', attributes: ['id', 'name', 'phone'] },
      { model: OrderItem, as: 'items' },
      { model: Payment, as: 'payments' },
    ],
  });
  if (!order) throw new HttpError(404, 'Order not found.');
  await auditEvent(req, 'order.receipt_view', { userId: req.user.id, businessId: req.businessId, entity: 'order', entityId: order.id });
  res.json({ order, business: req.business });
}));

module.exports = r;
