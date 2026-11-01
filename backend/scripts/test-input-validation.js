// HTTP real y servicios reales, con frontera PostgreSQL simulada estrictamente.
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
process.env.JWT_SECRET = require('node:crypto').randomBytes(48).toString('hex');
let writes, appointment, role = 'admin';
const db = { async query(sql, params = []) {
  const s = sql.replace(/\s+/g, ' ').trim();
  if (['BEGIN', 'COMMIT', 'ROLLBACK'].includes(s)) return { rows: [] };
  if (s.startsWith('SELECT id_usuario, nombre, email, rol, id_medico, activo')) return { rows: [{ id_usuario: 1, rol: role, activo: true }] };
  if (s === 'SELECT * FROM citas WHERE id_cita=$1 FOR UPDATE') return { rows: params[0] === 41 ? [appointment] : [] };
  if (s.startsWith('SELECT fecha_nacimiento FROM pacientes')) return { rows: [{ fecha_nacimiento: '1990-01-01' }] };
  if (s.includes('FROM visitas_medicas') && s.includes('ORDER BY')) return { rows: [] };
  if (s.startsWith('INSERT INTO citas (')) {
    writes++;
    appointment = { id_cita: 42, id_paciente: params[0], id_medico: params[1], fecha_hora: params[2], motivo: params[3], estado: params[4] || 'pendiente', triaje_notas: params[5] };
    return { rows: [{ id_cita: 42 }], rowCount: 1 };
  }
  if (s.startsWith('UPDATE citas SET id_paciente=')) {
    writes++; appointment = { ...appointment, id_paciente: params[0], id_medico: params[1], fecha_hora: params[2], motivo: params[3], estado: params[4] }; return { rows: [], rowCount: 1 };
  }
  if (s.includes('FROM citas c') && s.includes('WHERE c.id_cita = $1')) return { rows: [appointment] };
  if (s.startsWith('UPDATE usuarios SET activo')) { writes++; return { rows: [{ id_usuario: params[1], activo: params[0], rol: 'medico' }] }; }
  if (s.startsWith('INSERT INTO eventos_auditoria')) return { rows: [] };
  throw new Error('UNEXPECTED_QUERY: ' + s);
} };
db.connect = async () => ({ query: db.query.bind(db), release() {} });
for (const [file, exports] of [['../src/config/db', db], ['../schema', { ensureSchema: async () => {} }]]) {
  const id = require.resolve(file); require.cache[id] = { id, filename: id, loaded: true, exports };
}
process.env.TRIAGE_SERVICE_URL = '';
const app = require('../src/app');
(async () => {
  const server = app.listen(0, '127.0.0.1'); await new Promise(r => server.once('listening', r));
  const token = jwt.sign({ id_usuario: 1 }, process.env.JWT_SECRET);
  let failures = 0, passed = 0;
  async function check(name, fn) {
    writes = 0; appointment = { id_cita: 41, id_paciente: 51, id_medico: 61, fecha_hora: new Date('2026-10-20T10:00:00Z'), estado: 'confirmada', motivo: 'Consulta sintetica' };
    try { await fn(); passed++; console.log('APROBADO ' + name); }
    catch (e) { failures++; console.error('FALLIDO ' + name + ': ' + e.message); }
  }
  async function req(endpoint, body, method = 'PUT') {
    const r = await fetch('http://127.0.0.1:' + server.address().port + endpoint, { method, headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token }, body: JSON.stringify(body) });
    return { status: r.status, data: await r.json() };
  }
  try {
    const receptionInput = { id_paciente: 51, id_medico: 61, fecha_hora: '2026-10-31T15:30:00.000Z', motivo: 'Consulta sintética', estado: 'pendiente' };
    for (role of ['admin', 'recepcionista', 'enfermero']) await check('Registrar visita de Recepción con fecha_hora: ' + role, async () => {
      const r = await req('/api/citas', receptionInput, 'POST');
      assert.equal(r.status, 201, JSON.stringify(r.data));
      assert.equal(r.data.fecha_hora, receptionInput.fecha_hora);
      assert.equal(r.data.estado, 'pendiente'); assert.equal(r.data.motivo, receptionInput.motivo); assert.equal(writes, 1);
    });
    role = 'admin';
    await check('Alta de agenda conserva estado y notas', async () => {
      const r = await req('/api/citas', { ...receptionInput, estado: 'confirmada', triaje_notas: 'Nota sintética' }, 'POST');
      assert.equal(r.status, 201, JSON.stringify(r.data)); assert.equal(r.data.estado, 'confirmada'); assert.equal(r.data.triaje_notas, 'Nota sintética');
    });
    for (const change of [{ fecha_hora: undefined }, { fecha_hora: 'invalida' }, { id_paciente: null }, { id_medico: '61basura' }, { estado: 'inexistente' }]) {
      await check('Alta inválida no escribe: ' + JSON.stringify(change), async () => {
        const r = await req('/api/citas', { ...receptionInput, ...change }, 'POST'); assert.equal(r.status, 400); assert.equal(writes, 0);
      });
    }
    for (role of ['medico', 'fundacion']) await check('Rol sin alta de citas no escribe: ' + role, async () => {
      const r = await req('/api/citas', receptionInput, 'POST'); assert.equal(r.status, 403); assert.equal(writes, 0);
    });
    role = 'admin';
    for (const body of [{ fecha_hora: 'invalida' }, { id_paciente: null }, { id_medico: '61basura' }, { estado: 'inexistente' }]) {
      await check('Cita invalida no escribe: ' + JSON.stringify(body), async () => { const r = await req('/api/citas/41', body); assert.equal(r.status, 400); assert.equal(writes, 0); });
    }
    await check('Edicion parcial conserva fecha PostgreSQL', async () => { const r = await req('/api/citas/41', { motivo: 'Motivo actualizado' }); assert.equal(r.status, 200); assert.equal(r.data.fecha_hora, '2026-10-20T10:00:00.000Z'); assert.equal(writes, 1); });
    await check('Cita inexistente', async () => { assert.equal((await req('/api/citas/999', {})).status, 404); assert.equal(writes, 0); });
    for (const id of ['41abc', '-41', '41.5']) await check('ID de ruta estricto: ' + id, async () => { assert.equal((await req('/api/citas/' + id, {})).status, 400); assert.equal(writes, 0); });
    for (const body of [{}, { activo: 'false' }, { activo: 0 }, { activo: null }]) await check('Estado usuario invalido: ' + JSON.stringify(body), async () => { assert.equal((await req('/api/auth/usuarios/2/activo', body, 'PATCH')).status, 400); assert.equal(writes, 0); });
    await check('Administrador no se desactiva', async () => { assert.equal((await req('/api/auth/usuarios/1/activo', { activo: false }, 'PATCH')).status, 400); assert.equal(writes, 0); });
    for (const activo of [true, false]) await check('Estado booleano valido: ' + activo, async () => { const r = await req('/api/auth/usuarios/2/activo', { activo }, 'PATCH'); assert.equal(r.status, 200); assert.equal(r.data.activo, activo); assert.equal(writes, 1); });
    const { parseMoney, isValidDateTime } = require('../src/utils/validators');
    await check('Importes rechazan sufijos, booleanos y valores no finitos', async () => { for (const v of ['60abc', true, [], Infinity, -1]) assert.equal(parseMoney(v), null); assert.equal(parseMoney('60.50'), 60.5); assert.equal(parseMoney(0), 0); });
    await check('Fechas ausentes no se interpretan como 1970', async () => { for (const v of [null, false, 0, '', []]) assert.equal(isValidDateTime(v), false); });
  } finally { await new Promise(r => server.close(r)); }
  console.log(`${passed} aprobadas; ${failures} fallidas. DB simulada.`); if (failures) process.exitCode = 1;
})().catch(e => { console.error(e); process.exitCode = 1; });
