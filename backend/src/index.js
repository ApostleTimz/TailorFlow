require('dotenv').config();
if (!process.env.DATABASE_URL) { console.error('DATABASE_URL is not set.'); process.exit(1); }
try { require('./lib/config'); } catch (e) { console.error(`Configuration error: ${e.message}`); process.exit(1); }
const { initDb } = require('./models');
const { runMigrations } = require('./migrations');
const app = require('./app');

initDb().then(runMigrations).then(() => {
  const port = process.env.PORT || 4000;
  app.listen(port, () => console.log(`TailorFlow listening on port ${port}`));
}).catch((e) => { console.error('Startup failed:', e.message); process.exit(1); });
