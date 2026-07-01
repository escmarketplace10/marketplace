const { Pool } = require('pg');

async function test(region) {
  const connectionString = `postgresql://postgres.fihrcrtkzieqjlwelixa:escmarketplace1210@aws-0-${region}.pooler.supabase.com:6543/postgres`;
  const pool = new Pool({ connectionString });
  try {
    const res = await pool.query('SELECT 1 as connected');
    console.log(`Success on ${region}:`, res.rows[0]);
    return connectionString;
  } catch (err) {
    console.error(`Failed on ${region}:`, err.message);
    return null;
  } finally {
    await pool.end();
  }
}

async function main() {
  const regions = [
    'ap-southeast-1', // Singapore
    'ap-southeast-2', // Sydney
    'ap-southeast-3', // Jakarta
    'us-east-1',
    'us-west-1'
  ];
  for (const r of regions) {
    const url = await test(r);
    if (url) {
      console.log('FOUND_URL=' + url);
      return;
    }
  }
}
main();
