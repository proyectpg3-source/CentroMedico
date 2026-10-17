// Rutas y calculo reales; transacciones/bloqueos PostgreSQL simulados.
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
process.env.JWT_SECRET = require('node:crypto').randomBytes(48).toString('hex');
let charge, payments, clients, failInsert, failConnect;
function reset() {
  charge = { id_cargo: 1, id_paciente: 9, origen: 'consulta', total: 100, saldo: 100 };
  payments = []; clients = []; failInsert = false; failConnect = false;
}
async function query(sql, params = [], client) {
  const s = sql.replace(/\s+/g, ' ').trim();
  if (s.startsWith('SELECT id_usuario, nombre, email, rol, id_medico, activo')) return { rows: [{ id_usuario: 1, rol: 'admin', activo: true }] };
  if (s === 'BEGIN') { client.active = true; return { rows: [] }; }
  if (s === 'COMMIT' || s === 'ROLLBACK') {
    client.active = false;
    if (client.unlock) { client.unlock(); client.unlock = null; }
    return { rows: [] };
  }
  if (s === 'SELECT * FROM cargos_paciente WHERE id_cargo = $1 FOR UPDATE') {
    assert.ok(client.active, 'El bloqueo debe pertenecer a una transaccion');
    const previous = clients.find(c => c !== client && c.unlock);
    if (previous) await previous.done;
    client.done = new Promise(resolve => { client.unlock = resolve; });
    return { rows: params[0] === 1 ? [{ ...charge }] : [] };
  }
  if (s.startsWith('INSERT INTO pagos ')) {
    assert.ok(client.active && client.unlock, 'El saldo debe bloquearse antes de cobrar');
    if (failInsert) throw new Error('SYNTHETIC_INSERT_FAILURE');
    const p = { id_pago: payments.length + 1, id_paciente: params[0], id_cargo: params[1], monto: params[2] };
    payments.push(p); return { rows: [{ id_pago: p.id_pago }] };
  }
  if (s === 'SELECT * FROM cargos_paciente WHERE id_cargo = $1') return { rows: [{ ...charge }] };
  if (s.startsWith('SELECT COALESCE(SUM(monto), 0)')) return { rows: [{ total_pagado: payments.reduce((n, p) => n + p.monto, 0) }] };
  if (s.startsWith('UPDATE cargos_paciente SET saldo')) { charge.saldo = params[0]; charge.estado_pago = params[1]; return { rows: [] }; }
  if (s.includes('FROM cargos_paciente cp')) return { rows: [{ ...charge }] };
  if (s.includes('FROM pagos pg')) return { rows: payments.filter(p => p.id_pago === params[0]) };
  throw new Error('UNEXPECTED_QUERY: ' + s);
}
const pool = { query, async connect() {
  if (failConnect) throw new Error('SYNTHETIC_CONNECTION_FAILURE');
  const c = { active: false, released: false, query(sql, params) { return query(sql, params, c); }, release() { this.released = true; } };
  clients.push(c); return c;
} };
for (const [file, exports] of [['../src/config/db', pool], ['../schema', { ensureSchema: async () => {} }]]) {
  const id = require.resolve(file); require.cache[id] = { id, filename: id, loaded: true, exports };
}
const app = require('../src/app');
(async () => {
  const server = app.listen(0, '127.0.0.1'); await new Promise(r => server.once('listening', r));
  const base = 'http://127.0.0.1:' + server.address().port;
  const token = jwt.sign({ id_usuario: 1 }, process.env.JWT_SECRET);
  async function pay(body = {}) {
    const r = await fetch(base + '/api/pagos', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token }, body: JSON.stringify({ id_cargo: 1, monto: 60, metodo: 'efectivo', ...body }) });
    return { status: r.status, data: await r.json() };
  }
  let passed = 0;
  async function check(name, fn) { reset(); await fn(); assert.ok(clients.every(c => !c.active && !c.unlock && c.released)); console.log('APROBADO ' + name); passed++; }
  try {
    await check('Pago usa el paciente del cargo', async () => { const r = await pay(); assert.equal(r.status, 201); assert.equal(payments[0].id_paciente, 9); assert.equal(charge.saldo, 40); });
    await check('Pagos concurrentes comprueban el saldo bajo bloqueo', async () => { const r = await Promise.all([pay(), pay()]); assert.deepEqual(r.map(x => x.status).sort(), [201, 400]); assert.equal(payments.length, 1); });
    await check('Paciente distinto al cargo rechazado', async () => { assert.equal((await pay({ id_paciente: 10 })).status, 400); assert.equal(payments.length, 0); });
    await check('Cargo inexistente', async () => { assert.equal((await pay({ id_cargo: 999 })).status, 404); });
    await check('Saldo agotado', async () => { charge.saldo = 0; assert.equal((await pay()).status, 400); assert.equal(payments.length, 0); });
    await check('Monto invalido', async () => { assert.equal((await pay({ monto: -1 })).status, 400); assert.equal(payments.length, 0); });
    await check('Fallo al insertar libera transaccion', async () => { failInsert = true; assert.equal((await pay()).status, 500); assert.equal(payments.length, 0); });
    await check('Fallo de conexion devuelve error controlado', async () => { failConnect = true; const r = await pay(); assert.equal(r.status, 500); assert.ok(!JSON.stringify(r).includes('SYNTHETIC_CONNECTION_FAILURE')); });
    console.log(passed + ' pruebas aprobadas. Bloqueos simulados; falta integracion PostgreSQL.');
  } finally { await new Promise(r => server.close(r)); }
})().catch(e => { console.error(e); process.exitCode = 1; });
