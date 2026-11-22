const { Router } = require('express');
const { requireAuth } = require('./middleware');
const { TEMPLATES, UNITS } = require('./measurements');
const r = Router();
r.get('/', requireAuth, (_req, res) => res.json({ templates: TEMPLATES, units: UNITS }));
module.exports = r;
