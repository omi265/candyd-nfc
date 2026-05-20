const { Pool } = require('pg');
const pool = new Pool({
  connectionString: "postgresql://postgres:in78wvZkIUxWWc+D@localhost:5433/postgres"
});

async function listCharms() {
  try {
    const res = await pool.query('SELECT id, name, type FROM "Product"');
    console.log('CHARMS_LIST_START');
    console.log(JSON.stringify(res.rows, null, 2));
    console.log('CHARMS_LIST_END');
  } catch (error) {
    console.error('Error listing charms:', error);
  } finally {
    await pool.end();
  }
}

listCharms();
