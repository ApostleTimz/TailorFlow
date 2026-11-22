const { Router } = require('express');
const { z } = require('zod');
const { Op, QueryTypes } = require('sequelize');
const { sequelize, Customer, Order, OrderItem, Payment } = require('../models');
const { wrap, parse, requireAuth } = require('../middleware');
const { trendMonths, totals, counts } = require('../lib/trends');

const r = Router();
r.use(requireAuth);

const iso = (d) => d.toISOString().slice(0, 10);

r.get('/trends', wrap(async (req, res) => {
  const { months } = parse(z.object({ months: z.enum(['6', '12']).optional() }), req.query);
  const b = req.businessId;
  const keys = trendMonths(Number(months || 6));
  const start = new Date(`${keys[0]}-01T00:00:00.000Z`);
  const [payments, expenses, customers, orders] = await Promise.all([
    sequelize.query(
      `SELECT to_char(date_trunc('month', paid_at AT TIME ZONE 'UTC'), 'YYYY-MM') AS key, COUNT(*)::int AS count, COALESCE(SUM(amount_minor),0)::bigint AS total
       FROM payments WHERE business_id = :b AND paid_at >= :start GROUP BY 1`,
      { replacements: { b, start }, type: QueryTypes.SELECT }),
    sequelize.query(
      `SELECT to_char(spent_at, 'YYYY-MM') AS key, COUNT(*)::int AS count, COALESCE(SUM(amount_minor),0)::bigint AS total
       FROM expenses WHERE business_id = :b AND spent_at >= :start GROUP BY 1`,
      { replacements: { b, start: `${keys[0]}-01` }, type: QueryTypes.SELECT }),
    sequelize.query(
      `SELECT to_char(date_trunc('month', created_at AT TIME ZONE 'UTC'), 'YYYY-MM') AS key, COUNT(*)::int AS count
       FROM customers WHERE business_id = :b AND created_at >= :start GROUP BY 1`,
      { replacements: { b, start }, type: QueryTypes.SELECT }),
    sequelize.query(
      `SELECT to_char(date_trunc('month', created_at AT TIME ZONE 'UTC'), 'YYYY-MM') AS key, COUNT(*)::int AS count, COALESCE(SUM(total_minor),0)::bigint AS total
       FROM orders WHERE business_id = :b AND created_at >= :start GROUP BY 1`,
      { replacements: { b, start }, type: QueryTypes.SELECT }),
  ]);
  res.json({
    months: keys,
    transactions: totals(keys, payments),
    expenses: totals(keys, expenses),
    customersGained: counts(keys, customers),
    orders: totals(keys, orders),
  });
}));

r.get('/', wrap(async (req, res) => {
  const b = req.businessId;
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const today = iso(now);
  const soon = iso(new Date(now.getTime() + 7 * 864e5));
  const open = { businessId: b, status: { [Op.notIn]: ['delivered', 'cancelled'] } };

  const [activeOrders, customers, received, due, overdue, dueSoon] = await Promise.all([
    Order.count({ where: open }),
    Customer.count({ where: { businessId: b, archived: false } }),
    Payment.sum('amountMinor', { where: { businessId: b, paidAt: { [Op.gte]: monthStart } } }),
    sequelize.query(
      `SELECT COALESCE(SUM(o.total_minor - COALESCE(p.paid,0)),0)::bigint AS due, COUNT(*)::int AS cnt
       FROM orders o LEFT JOIN (SELECT order_id, SUM(amount_minor) paid FROM payments GROUP BY order_id) p ON p.order_id = o.id
       WHERE o.business_id = :b AND o.status <> 'cancelled' AND o.total_minor - COALESCE(p.paid,0) > 0`,
      { replacements: { b }, type: QueryTypes.SELECT }),
    Order.findAll({ where: { ...open, dueDate: { [Op.lt]: today } }, include: [{ model: Customer, as: 'customer', attributes: ['id', 'name'] }], order: [['dueDate', 'ASC']], limit: 5 }),
    Order.findAll({ where: { ...open, dueDate: { [Op.between]: [today, soon] } }, include: [{ model: Customer, as: 'customer', attributes: ['id', 'name'] }], order: [['dueDate', 'ASC']], limit: 5 }),
  ]);
  const overdueCount = await Order.count({ where: { ...open, dueDate: { [Op.lt]: today } } });
  res.json({
    activeOrders, customers, overdueCount,
    receivedThisMonthMinor: Number(received || 0),
    balancesDueMinor: Number(due[0].due), unpaidOrders: due[0].cnt,
    overdue: overdue.map((o) => o.toJSON()), dueSoon: dueSoon.map((o) => o.toJSON()),
  });
}));

module.exports = r;
