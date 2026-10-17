const assert = require('node:assert/strict');
if (process.env.RUN_DB_INTEGRATION !== 'true' || !/_test$/i.test(process.env.DB_NAME || '')) throw Error('Requiere base aislada de pruebas.');
const pool = require('../src/config/db');
const { ensureSchema } = require('../schema');
(async () => {
  try {
    await ensureSchema(pool);
    let count = 0;
    for (const [name, sql] of Object.entries(require('../src/utils/queries'))) {
      if (!name.endsWith('_SELECT')) continue;
      const result = await pool.query(sql + ' LIMIT 0');
      assert.equal(result.rowCount,0); count++;
    }
    console.log(`${count} consultas compartidas compatibles con el esquema PostgreSQL real.`);
  } finally { await pool.end(); }
})().catch(e=>{console.error(e);process.exitCode=1;});
