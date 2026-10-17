// Production HTTP routes, strict in-memory PostgreSQL boundary, no real schema/DB.
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const jwt = require('jsonwebtoken');
const secret = crypto.randomBytes(48).toString('hex');
process.env.JWT_SECRET = secret;
let stored = null, writes = 0, failSave = false;
const allowedBackupTables = new Set(['usuarios','pacientes','medicos','citas','triajes','visitas_medicas','ordenes_laboratorio','resultados_laboratorio','insumos_laboratorio','movimientos_insumos_laboratorio','prescripciones','cargos_paciente','pagos','eventos_auditoria','productos','movimientos_productos','documentos_paciente','configuracion_centro','atenciones_rapidas']);
const db = { async query(sql, params = []) {
  const s = sql.replace(/\s+/g, ' ').trim();
  if (s.startsWith('SELECT id_usuario, nombre, email, rol, id_medico, activo FROM usuarios WHERE')) return { rows: [{ id_usuario: params[0], nombre: 'Prueba', rol: params[0] === 1 ? 'admin' : 'recepcionista', activo: true }] };
  if (s === 'SELECT datos FROM configuracion_centro WHERE id = 1') return { rows: stored ? [{ datos: structuredClone(stored) }] : [] };
  if (s.startsWith('INSERT INTO configuracion_centro ')) {
    if (failSave) throw new Error('SYNTHETIC_SAVE_FAILURE');
    assert.ok(!s.includes('Centro sintético'));
    stored = JSON.parse(params[0]); writes++; return { rows: [{ datos: structuredClone(stored) }] };
  }
  if (s.startsWith('INSERT INTO eventos_auditoria ')) return { rows: [], rowCount: 1 };
  const backup = /^SELECT .+ FROM (\w+) ORDER BY .+$/.exec(s);
  if (backup && allowedBackupTables.has(backup[1])) return { rows: backup[1] === 'configuracion_centro' && stored ? [{ id: 1, datos: stored }] : [] };
  throw new Error('UNEXPECTED_QUERY');
}};
for (const [file, exports] of [['../src/config/db', db], ['../schema', { ensureSchema: async () => {} }]]) {
  const id = require.resolve(file); require.cache[id] = { id, filename: id, loaded: true, exports };
}
const app = require('../src/app');
const valid = { centerName: 'Centro sintético', rut: 'TEST-001', address: 'Dirección de prueba', phone: '00000000', email: 'test@example.invalid', website: 'https://example.invalid', timezone: 'America/Guatemala', language: 'Español (Latinoamérica)' };

(async () => {
  const server = app.listen(0, '127.0.0.1'); await new Promise(r => server.once('listening', r));
  const base = 'http://127.0.0.1:' + server.address().port;
  let passed = 0;
  async function req(method, endpoint = '/api/configuracion', data, id = 1) {
    const r = await fetch(base + endpoint, { method, headers: { 'Content-Type': 'application/json', ...(id ? { Authorization: 'Bearer ' + jwt.sign({ id_usuario: id }, secret) } : {}) }, body: data === undefined ? undefined : JSON.stringify(data), signal: AbortSignal.timeout(10000) });
    return { status: r.status, data: await r.json() };
  }
  async function check(name, fn) { await fn(); passed++; console.log('PASS ' + name); }
  try {
    await check('Configuración inicial sin datos ficticios', async () => { const r = await req('GET'); assert.equal(r.status, 200); assert.equal(r.data.phone, ''); assert.equal(r.data.timezone, 'America/Guatemala'); });
    await check('Guardado y nueva lectura', async () => { const a = await req('PUT', undefined, valid); assert.equal(a.status, 200); assert.deepEqual(a.data, valid); const b = await req('GET'); assert.deepEqual(b.data, valid); assert.equal(writes, 1); });
    await check('No autenticado', async () => { const r = await req('GET', undefined, undefined, null); assert.equal(r.status, 401); });
    await check('Recepción no guarda ni consulta', async () => { const before = writes; for (const method of ['GET','PUT']) { const r = await req(method, undefined, method === 'PUT' ? valid : undefined, 2); assert.equal(r.status, 403); } assert.equal(writes, before); });
    for (const [key,value] of [['centerName',''],['centerName','a'.repeat(121)],['email','invalid'],['timezone','Invalid/Zone'],['website','javascript:alert(1)'],['language','unsupported']]) await check('Validación ' + key + ' ' + String(value).slice(0,12), async () => { const before = writes; const r = await req('PUT', undefined, {...valid,[key]:value}); assert.equal(r.status,400); assert.equal(writes,before); });
    await check('Objeto parcial no sobrescribe', async () => { const r = await req('PUT', undefined, { centerName: 'Incompleto' }); assert.equal(r.status,400); assert.deepEqual(stored,valid); });
    await check('Campos adicionales rechazados', async () => { const r = await req('PUT', undefined, {...valid,rol:'admin'}); assert.equal(r.status,400); });
    await check('Fallo de BD sin éxito ni filtración', async () => { failSave = true; const r = await req('PUT', undefined, {...valid,centerName:'Cambio no guardado'}); failSave=false; assert.equal(r.status,500); assert.ok(!JSON.stringify(r.data).includes('SYNTHETIC')); assert.equal(stored.centerName,valid.centerName); });
    await check('Respaldo contiene la configuración guardada', async () => { const r = await req('GET','/api/backups/export'); assert.equal(r.status,200); assert.equal(r.data.schemaVersion,4); assert.deepEqual(r.data.data.configuracionCentro[0].datos,valid); });
    console.log('PASS ' + passed + ' casos; código real y frontera DB aislada.');
  } finally { await new Promise(r => server.close(r)); }
})().catch(e => { console.error(e.message); process.exitCode = 1; });
