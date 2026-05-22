const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Load this project's .env first, then fall back to canonical OpenRouter env.
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'refugee_asylum',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

// Auto-apply benefits schema migration on startup (idempotent via IF NOT EXISTS).
// Runs asynchronously so the server binds immediately; errors are logged, not fatal.
(async () => {
  const migrationFile = path.join(__dirname, '..', 'migrations', '004_benefits_schema.sql');
  try {
    const sql = fs.readFileSync(migrationFile, 'utf8');
    await pool.query(sql);
    console.log('[db] benefits schema migration 004 applied (or already current)');
  } catch (err) {
    console.error('[db] WARNING: could not apply benefits schema migration 004:', err.message);
  }
})();

module.exports = pool;
