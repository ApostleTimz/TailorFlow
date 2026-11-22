const fs = require('fs');
const { Sequelize, DataTypes: T } = require('sequelize');
const { config } = require('./lib/config');

const ssl = process.env.DATABASE_SSL === 'true'
  ? { require: true, rejectUnauthorized: true, ca: process.env.DATABASE_SSL_CA ? fs.readFileSync(process.env.DATABASE_SSL_CA, 'utf8') : undefined }
  : {};
const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  logging: false,
  dialectOptions: Object.keys(ssl).length ? { ssl } : {},
  define: { underscored: true },
});

const pk = { type: T.UUID, defaultValue: T.UUIDV4, primaryKey: true };
const STAGES = ['new', 'measurement_confirmed', 'awaiting_fabric', 'cutting', 'sewing', 'fitting', 'adjustments', 'quality_check', 'ready', 'delivered'];
const METHODS = ['cash', 'transfer', 'card', 'mobile_money', 'other'];

const Business = sequelize.define('Business', {
  id: pk,
  name: { type: T.STRING(120), allowNull: false },
  currency: { type: T.STRING(3), allowNull: false, defaultValue: 'NGN' },
  orderSeq: { type: T.INTEGER, allowNull: false, defaultValue: 0 },
}, { tableName: 'businesses' });

const User = sequelize.define('User', {
  id: pk,
  name: { type: T.STRING(100), allowNull: false },
  email: { type: T.STRING(254), allowNull: false, unique: true },
  passwordHash: { type: T.STRING(100), allowNull: false },
  role: { type: T.STRING(10), allowNull: false, defaultValue: 'owner' },
  emailVerifiedAt: T.DATE,
  tokenHash: T.STRING(64),
  tokenExpiresAt: T.DATE,
  tokenPurpose: T.STRING(20),
  tokenVersion: { type: T.INTEGER, allowNull: false, defaultValue: 0 },
}, { tableName: 'users' });

const Customer = sequelize.define('Customer', {
  id: pk,
  name: { type: T.STRING(120), allowNull: false },
  phone: T.STRING(30),
  email: T.STRING(254),
  address: T.STRING(300),
  notes: T.TEXT,
  archived: { type: T.BOOLEAN, allowNull: false, defaultValue: false },
}, { tableName: 'customers' });

// Measurement records are immutable: a change creates a new version.
const Measurement = sequelize.define('Measurement', {
  id: pk,
  gender: { type: T.STRING(6), allowNull: false },
  unit: { type: T.STRING(2), allowNull: false },
  values: { type: T.JSONB, allowNull: false },
  notes: T.STRING(1000),
  version: { type: T.INTEGER, allowNull: false },
}, { tableName: 'measurements' });

const MeasurementDesign = sequelize.define('MeasurementDesign', {
  id: pk,
  position: { type: T.INTEGER, allowNull: false },
  filename: { type: T.STRING(120), allowNull: false },
  originalName: { type: T.STRING(255), allowNull: false },
  mimeType: { type: T.STRING(30), allowNull: false },
  sizeBytes: { type: T.INTEGER, allowNull: false },
}, { tableName: 'measurement_designs' });

const Order = sequelize.define('Order', {
  id: pk,
  reference: { type: T.STRING(20), allowNull: false },
  status: { type: T.STRING(30), allowNull: false, defaultValue: 'new' },
  dueDate: T.DATEONLY,
  notes: T.TEXT,
  totalMinor: { type: T.INTEGER, allowNull: false },
}, { tableName: 'orders' });

const OrderItem = sequelize.define('OrderItem', {
  id: pk,
  garment: { type: T.STRING(80), allowNull: false },
  description: T.STRING(500),
  priceMinor: { type: T.INTEGER, allowNull: false },
  quantity: { type: T.INTEGER, allowNull: false, defaultValue: 1 },
  stage: { type: T.STRING(30), allowNull: false, defaultValue: 'new' },
}, { tableName: 'order_items' });

// Payments are append-only. A reversal is a new negative entry pointing at the original.
const Payment = sequelize.define('Payment', {
  id: pk,
  amountMinor: { type: T.INTEGER, allowNull: false },
  method: { type: T.STRING(20), allowNull: false },
  note: T.STRING(300),
  paidAt: { type: T.DATE, allowNull: false, defaultValue: T.NOW },
  reversesId: T.UUID,
}, { tableName: 'payments', updatedAt: false });

const AuditLog = sequelize.define('AuditLog', {
  id: pk,
  userId: T.UUID,
  action: { type: T.STRING(60), allowNull: false },
  entity: { type: T.STRING(40), allowNull: false },
  entityId: T.UUID,
  meta: T.JSONB,
}, { tableName: 'audit_logs', updatedAt: false });

const Expense = sequelize.define('Expense', { id: pk, description: { type: T.STRING(180), allowNull: false }, amountMinor: { type: T.INTEGER, allowNull: false }, category: T.STRING(80), spentAt: { type: T.DATEONLY, allowNull: false } }, { tableName: 'expenses' });
const InventoryItem = sequelize.define('InventoryItem', { id: pk, name: { type: T.STRING(120), allowNull: false }, sku: T.STRING(60), quantity: { type: T.DECIMAL(12, 2), allowNull: false, defaultValue: 0 }, unit: { type: T.STRING(30), allowNull: false, defaultValue: 'item' }, reorderAt: { type: T.DECIMAL(12, 2), allowNull: false, defaultValue: 0 }, unitCostMinor: { type: T.INTEGER, allowNull: false, defaultValue: 0 } }, { tableName: 'inventory_items' });

for (const M of [User, Customer, Measurement, MeasurementDesign, Order, Payment, AuditLog, Expense, InventoryItem]) {
  Business.hasMany(M, { foreignKey: { name: 'businessId', allowNull: false }, onDelete: 'CASCADE' });
  M.belongsTo(Business, { foreignKey: 'businessId' });
}
Customer.hasMany(Measurement, { as: 'measurements', foreignKey: { name: 'customerId', allowNull: false } });
Measurement.belongsTo(Customer, { foreignKey: 'customerId' });
Measurement.hasMany(MeasurementDesign, { as: 'designs', foreignKey: { name: 'measurementId', allowNull: false }, onDelete: 'CASCADE' });
MeasurementDesign.belongsTo(Measurement, { foreignKey: 'measurementId' });
Customer.hasMany(Order, { as: 'orders', foreignKey: { name: 'customerId', allowNull: false } });
Order.belongsTo(Customer, { as: 'customer', foreignKey: 'customerId' });
Measurement.hasMany(Order, { foreignKey: { name: 'measurementId', allowNull: true } });
Order.belongsTo(Measurement, { as: 'measurement', foreignKey: 'measurementId' });
Order.hasMany(OrderItem, { as: 'items', foreignKey: { name: 'orderId', allowNull: false }, onDelete: 'CASCADE' });
OrderItem.belongsTo(Order, { foreignKey: 'orderId' });
Order.hasMany(Payment, { as: 'payments', foreignKey: { name: 'orderId', allowNull: false } });
Payment.belongsTo(Order, { foreignKey: 'orderId' });

async function initDb() {
  await sequelize.authenticate();
  if (config.dbSync) await sequelize.sync();
  const idx = [
    'CREATE INDEX IF NOT EXISTS customers_biz_idx ON customers (business_id, archived, name)',
    'CREATE INDEX IF NOT EXISTS measurements_cust_idx ON measurements (customer_id, gender, version DESC)',
    'CREATE UNIQUE INDEX IF NOT EXISTS measurement_designs_position ON measurement_designs (measurement_id, position)',
    'CREATE INDEX IF NOT EXISTS orders_biz_idx ON orders (business_id, status, due_date)',
    'CREATE UNIQUE INDEX IF NOT EXISTS orders_ref_unique ON orders (business_id, reference)',
    'CREATE INDEX IF NOT EXISTS payments_order_idx ON payments (order_id)',
    'CREATE UNIQUE INDEX IF NOT EXISTS payments_one_reversal ON payments (reverses_id) WHERE reverses_id IS NOT NULL',
  ];
  for (const q of idx) await sequelize.query(q);
}

module.exports = { sequelize, initDb, STAGES, METHODS, Business, User, Customer, Measurement, MeasurementDesign, Order, OrderItem, Payment, AuditLog, Expense, InventoryItem };
