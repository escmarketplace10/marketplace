const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
  connectionString: 'postgresql://postgres.fihrcrtkzieqjlwelixa:escmarketplace1210@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true',
  ssl: { rejectUnauthorized: false }
});

async function fix() {
  try {
    const hash = await bcrypt.hash('password123', 10);
    await pool.query('UPDATE admin_users SET password_hash = $1, email = $2 WHERE id = $3', [hash, 'admin@kantinku.com', 'admin_web_1']);
    console.log('Fixed admin_web_1 password hash to bcrypt of "password123"');
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

fix();
