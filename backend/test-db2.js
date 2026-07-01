const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres.fihrcrtkzieqjlwelixa:escmarketplace1210@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true',
  ssl: { rejectUnauthorized: false }
});

async function test() {
  try {
    const res = await pool.query('SELECT * FROM admin_users');
    console.log('Admin users:', res.rows);
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

test();
