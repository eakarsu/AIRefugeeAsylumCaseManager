const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');
const pool = require('./config/database');

function encodePassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  return `scrypt$${salt}$${crypto.scryptSync(password, salt, 64).toString('hex')}`;
}

async function bootstrapRuntime() {
  if (process.env.MIGRATE_ON_START !== 'true') return;
  const email = process.env.PROVISION_ADMIN_EMAIL;
  const password = process.env.PROVISION_ADMIN_PASSWORD;
  if (!email || !password) throw new Error('runtime admin credentials are required');
  const migrationsDir = path.join(__dirname, 'migrations');
  const files = (await fs.readdir(migrationsDir)).filter((name) => name.endsWith('.sql')).sort();
  for (const file of files) {
    await pool.query(await fs.readFile(path.join(migrationsDir, file), 'utf8'));
  }
  await pool.query(
    `INSERT INTO users (email, password, name, role)
     VALUES ($1, $2, $3, 'admin')
     ON CONFLICT (email) DO UPDATE SET password=EXCLUDED.password, name=EXCLUDED.name, role='admin', updated_at=NOW()`,
    [email.toLowerCase(), encodePassword(password), process.env.PROVISION_ADMIN_NAME || 'Runtime Admin']
  );
}

module.exports = { bootstrapRuntime };
