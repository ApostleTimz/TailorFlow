const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { config } = require('./lib/config');
const { Business, User, AuditLog } = require('./models');

const SECRET = config.jwtSecret;
const ISSUER = 'tailorflow';
const AUDIENCE = 'tailorflow-api';
const verifyOptions = { algorithms: ['HS256'], issuer: ISSUER, audience: AUDIENCE };

class HttpError extends Error {
  constructor(status, message, fields) { super(message); this.status = status; this.fields = fields; }
}

const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

function parse(schema, data) {
  const r = schema.safeParse(data);
  if (r.success) return r.data;
  const fields = {};
  for (const i of r.error.issues) { const k = i.path.join('.') || '_'; if (!fields[k]) fields[k] = i.message; }
  throw new HttpError(400, 'Please check the highlighted fields.', fields);
}

const requireAuth = wrap(async (req, _res, next) => {
  const token = req.cookies && req.cookies.tf_token;
  if (!token) throw new HttpError(401, 'Please sign in.');
  let payload;
  try { payload = jwt.verify(token, SECRET, verifyOptions); } catch { throw new HttpError(401, 'Your session has expired. Please sign in again.'); }
  const user = await User.findByPk(payload.sub, { include: [{ model: Business }] });
  if (!user || payload.ver !== user.tokenVersion) throw new HttpError(401, 'Your session has expired. Please sign in again.');
  req.user = user; req.businessId = user.businessId; req.business = user.Business;
  next();
});

const signToken = (user) => jwt.sign({ sub: user.id, ver: user.tokenVersion || 0 }, SECRET, {
  algorithm: 'HS256', issuer: ISSUER, audience: AUDIENCE, expiresIn: '7d', jwtid: crypto.randomUUID(),
});

const requestMeta = (req) => ({ ip: req.ip, userAgent: String(req.get('user-agent') || '').slice(0, 300) });

const audit = (req, action, entity, entityId, meta, transaction) =>
  AuditLog.create({ businessId: req.businessId, userId: req.user.id, action, entity, entityId, meta: { ...(meta || {}), ...requestMeta(req) } }, { transaction });

const auditEvent = (req, action, { userId = null, businessId = null, entity = 'security', entityId = null, meta = {} } = {}) => {
  if (!businessId) return Promise.resolve(null);
  return AuditLog.create({ businessId, userId, action, entity, entityId, meta: { ...meta, ...requestMeta(req) } });
};

const uuidParams = (router, ...names) => names.forEach((n) =>
  router.param(n, (_req, _res, next, v) => (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v) ? next() : next(new HttpError(404, 'Not found.')))));

// eslint-disable-next-line no-unused-vars
function errorHandler(err, _req, res, _next) {
  if (err instanceof HttpError) return res.status(err.status).json({ error: err.message, fields: err.fields });
  if (err.name === 'SequelizeUniqueConstraintError') return res.status(409).json({ error: 'That record already exists.' });
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid request.' });
  console.error(err);
  res.status(500).json({ error: 'Something went wrong on our side. Please try again.' });
}

module.exports = { HttpError, wrap, parse, requireAuth, signToken, audit, auditEvent, uuidParams, errorHandler };
