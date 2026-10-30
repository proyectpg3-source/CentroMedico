// Solo admite el cluster desechable del runner; no carga dotenv ni el esquema.
const assert = require('node:assert/strict');
const { Client } = require('pg');
const { getDailySummary } = require('../src/modules/pagos/resumenDiario');
if (process.env.RUN_DB_INTEGRATION !== 'true' || process.env.DB_NAME !== 'centromedico_isolated_test' || process.env.DB_HOST !== '127.0.0.1') {
  throw new Error('Usa npm run test:postgres-isolated; no se permite la base real.');
}
(async () => {
  const db = new Client({ host: process.env.DB_HOST, port: Number(process.env.DB_PORT), user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME });
  try {
    await db.connect();
    await db.query('BEGIN');
    // La tabla temporal oculta pagos de este cluster solo en esta conexion.
    await db.query('CREATE TEMP TABLE pagos (monto numeric(10,2), fecha_pago timestamptz, metodo text) ON COMMIT DROP');
    await db.query(`INSERT INTO pagos VALUES
      (999, '2024-02-29T05:59:59Z', 'efectivo'),
      (0.10, '2024-02-29T06:00:00Z', 'Efectivo'),
      (0.20, '2024-03-01T05:59:59.999Z', ' efectivo '),
      (15, '2024-02-29T15:00:00Z', 'Tarjeta'),
      (777, '2024-03-01T06:00:00Z', 'efectivo')`);
    for (const zone of ['UTC', 'Asia/Tokyo', 'America/Guatemala']) {
      await db.query("SELECT set_config('TimeZone', $1, true)", [zone]);
      const summary = await getDailySummary(db, '2024-02-29');
      assert.equal(summary.cantidad, 3);
      assert.equal(summary.total, '15.30');
      assert.deepEqual(summary.metodos, [
        { metodo: 'efectivo', cantidad: 2, total: '0.30' },
        { metodo: 'tarjeta', cantidad: 1, total: '15.00' },
      ]);
    }
    const empty = await getDailySummary(db, '2024-02-27');
    assert.equal(empty.total, '0');
    assert.equal(empty.cantidad, 0);
    assert.deepEqual(empty.metodos, []);
    console.log('APROBADO PostgreSQL: limites de medianoche, centavos, desglose, dia vacio y tres zonas del servidor.');
  } finally { try { await db.query('ROLLBACK'); } finally { await db.end(); } }
})().catch((error) => { console.error(error); process.exitCode = 1; });
