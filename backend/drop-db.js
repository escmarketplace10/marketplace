require('dotenv').config();
const { Pool } = require('pg');

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const res = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    `);
    const tables = res.rows.map(r => r.table_name);
    if (tables.length > 0) {
      console.log('Dropping tables:', tables.join(', '));
      await pool.query(`DROP TABLE IF EXISTS ${tables.map(t => `"${t}"`).join(', ')} CASCADE`);
      console.log('All tables dropped!');
    } else {
      console.log('No tables to drop.');
    }
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}
main();
