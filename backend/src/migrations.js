const { sequelize } = require('./models');

// Ordered, tracked SQL migrations. Keep each migration additive and reversible where practical.
const migrations = [
  { id: '202611160001_auth_and_business_tools', up: async () => {
    await sequelize.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified_at timestamptz, ADD COLUMN IF NOT EXISTS token_hash varchar(64), ADD COLUMN IF NOT EXISTS token_expires_at timestamptz`);
    await sequelize.query(`UPDATE users SET email_verified_at = now() WHERE email_verified_at IS NULL AND created_at < '2026-11-16'`);
    await sequelize.query(`CREATE TABLE IF NOT EXISTS expenses (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE, description varchar(180) NOT NULL, amount_minor integer NOT NULL CHECK (amount_minor > 0), category varchar(80), spent_at date NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now())`);
    await sequelize.query(`CREATE TABLE IF NOT EXISTS inventory_items (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE, name varchar(120) NOT NULL, sku varchar(60), quantity numeric(12,2) NOT NULL DEFAULT 0, unit varchar(30) NOT NULL DEFAULT 'item', reorder_at numeric(12,2) NOT NULL DEFAULT 0, unit_cost_minor integer NOT NULL DEFAULT 0, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now())`);
  } },
  { id: '202611190001_token_purpose_and_session_version', up: async () => {
    await sequelize.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS token_purpose varchar(20), ADD COLUMN IF NOT EXISTS token_version integer NOT NULL DEFAULT 0`);
  } },
  { id: '202611190002_measurement_designs', up: async () => {
    await sequelize.query(`CREATE TABLE IF NOT EXISTS measurement_designs (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE, measurement_id uuid NOT NULL REFERENCES measurements(id) ON DELETE CASCADE, position integer NOT NULL CHECK (position BETWEEN 1 AND 3), filename varchar(120) NOT NULL, original_name varchar(255) NOT NULL, mime_type varchar(30) NOT NULL, size_bytes integer NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE (measurement_id, position))`);
  } },
];
async function runMigrations() {
  await sequelize.query('CREATE TABLE IF NOT EXISTS schema_migrations (id varchar(120) PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())');
  const [rows] = await sequelize.query('SELECT id FROM schema_migrations');
  const applied = new Set(rows.map((r) => r.id));
  for (const migration of migrations) if (!applied.has(migration.id)) {
    await sequelize.transaction(async (transaction) => {
      await migration.up(transaction);
      await sequelize.query('INSERT INTO schema_migrations (id) VALUES (:id)', { replacements: { id: migration.id }, transaction });
    });
  }
}
module.exports = { runMigrations };
