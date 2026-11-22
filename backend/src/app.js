const path = require('path');
const fs = require('fs');
const express = require('express');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const { sequelize } = require('./models');
const { config } = require('./lib/config');
const { errorHandler } = require('./middleware');

const app = express();
app.set('trust proxy', config.trustProxy);
app.disable('x-powered-by');
app.use(helmet());
app.use(cookieParser());
app.use('/api', (_req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });

app.use('/api', (req, res, next) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  const origin = req.get('origin');
  if (!origin) return next();
  try {
    if (new URL(origin).origin !== config.appOrigin) return res.status(403).json({ error: 'Cross-site request blocked.' });
  } catch { return res.status(400).json({ error: 'Invalid origin.' }); }
  next();
});

const rateMessage = { error: 'Too many attempts. Please try again in a few minutes.' };
const apiLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: Number(process.env.API_RATE_LIMIT || 300), standardHeaders: true, legacyHeaders: false, message: rateMessage });
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: Number(process.env.AUTH_RATE_LIMIT || 10), standardHeaders: true, legacyHeaders: false, message: rateMessage, keyGenerator: (req) => `${req.ip}:${String(req.body?.email || '').trim().toLowerCase()}` });
const healthLimiter = rateLimit({ windowMs: 60 * 1000, limit: 30, standardHeaders: true, legacyHeaders: false, message: rateMessage });

app.use('/api', apiLimiter);
app.get('/api/health', healthLimiter, async (_req, res) => {
  try { await sequelize.query('SELECT 1'); res.json({ status: 'ok' }); } catch { res.status(503).json({ status: 'unavailable' }); }
});
app.use('/api/auth', express.json({ limit: '100kb', strict: true }));
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth/forgot-password', authLimiter);
app.use('/api/auth/reset-password', authLimiter);
app.use('/api/auth/verify-email', authLimiter);
const { uploadRouter, designRouter } = require('./routes/designs');
app.use('/api/measurements', express.json({ limit: '10mb', strict: true }), uploadRouter);
app.use('/api/designs', designRouter);
app.use(express.json({ limit: '100kb', strict: true }));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/customers', require('./routes/customers'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/measurement-templates', require('./measurement-routes'));
app.use('/api/business', require('./routes/business-tools'));
app.use('/api', (_req, res) => res.status(404).json({ error: 'Not found.' }));

const dist = path.join(__dirname, '..', '..', 'frontend', 'dist');
if (fs.existsSync(dist)) {
  app.use(express.static(dist, { maxAge: '1h', index: false }));
  app.get('*', (_req, res) => res.sendFile(path.join(dist, 'index.html')));
}
app.use(errorHandler);
module.exports = app;
