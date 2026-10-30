// Sin conexiones ni esquema reales: servicio y rutas reales con pool simulado.
const assert = require('node:assert/strict');
const { localDate, validateDate, getDailySummary } = require('../src/modules/pagos/resumenDiario');
const now = new Date('2026-10-17T05:59:59Z');
assert.equal(localDate(now), '2026-10-16');
assert.equal(localDate(new Date('2026-10-17T06:00:00Z')), '2026-10-17');
assert.equal(validateDate('2024-02-29', now), '2024-02-29');
for (const date of ['2026-02-29', '2026-02-30', '2026-10-17', '2026-1-01', '', ['2026-10-16'], {}, '1899-12-31']) {
  assert.throws(() => validateDate(date, now), (error) => error.status === 400);
}
let role = 'admin', active = true, reads = 0;
const pool = { async query(sql, params) {
  if (sql.includes('FROM usuarios')) return { rows: [{ id_usuario: 1, rol: role, activo: active }] };
  assert.ok(sql.includes('WITH movimientos AS'));
  assert.deepEqual(params, ['2024-02-29']);
  reads++;
  return { rows: [{ cantidad: 2, total: '0.30', metodos: [{ metodo: 'efectivo', cantidad: 2, total: '0.30' }] }] };
} };
const id = require.resolve('../src/config/db');
require.cache[id] = { id, filename: id, loaded: true, exports: pool };
process.env.JWT_SECRET = require('node:crypto').randomBytes(48).toString('hex');
const jwt = require('jsonwebtoken');
const app = require('express')();
app.use('/api/pagos', require('../src/modules/pagos/pagos.routes'));
(async () => {
  const summary = await getDailySummary(pool, '2024-02-29', now);
  assert.equal(summary.total, '0.30');
  assert.equal(summary.zona_horaria, 'America/Guatemala');
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  const url = `http://127.0.0.1:${server.address().port}/api/pagos/resumen-diario`;
  const token = jwt.sign({ id_usuario: 1 }, process.env.JWT_SECRET);
  async function request(query = '?fecha=2024-02-29', authenticated = true) {
    return fetch(url + query, { headers: authenticated ? { Authorization: `Bearer ${token}` } : {} });
  }
  try {
    assert.equal((await request('', false)).status, 401);
    for (role of ['admin', 'recepcionista', 'fundacion']) {
      const result = await request();
      assert.equal(result.status, 200);
      assert.equal((await result.json()).total, '0.30');
    }
    for (role of ['medico', 'enfermero']) assert.equal((await request()).status, 403);
    role = 'admin'; active = false;
    assert.equal((await request()).status, 401);
    active = true;
    const previous = reads;
    assert.equal((await request('?fecha=2026-02-30')).status, 400);
    assert.equal((await request('?fecha=2024-02-29&fecha=2024-03-01')).status, 400);
    assert.equal(reads, previous, 'Las fechas invalidas no consultan pagos');
    console.log('APROBADO resumen diario: fechas, zona horaria, autenticacion, roles y cuenta desactivada.');
  } finally { await new Promise((resolve) => server.close(resolve)); }
})().catch((error) => { console.error(error); process.exitCode = 1; });
