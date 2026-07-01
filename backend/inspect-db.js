require('dotenv').config();
const { Pool } = require('pg');

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const res = await pool.query(`
      SELECT table_name, column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema = 'public'
    `);
    console.log("Existing schema:");
    res.rows.forEach(r => console.log(`- ${r.table_name}.${r.column_name} (${r.data_type})`));
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}
main();
