// Local security checks against production routes and authentication code.
// PostgreSQL and schema initialization are replaced BEFORE loading the app.
// No real database, migration, account, patient or external service is used.
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const secret = crypto.randomBytes(48).toString('hex');
process.env.JWT_SECRET = secret;
process.env.JWT_EXPIRES_IN = '1h';
process.env.NODE_ENV = 'test';
process.env.CORS_ORIGIN = 'http://localhost:5173';
process.env.RATE_LIMIT_DISABLED = 'false';
process.env.RATE_LIMIT_LOGIN_MAX = '10';
process.env.RATE_LIMIT_API_PER_MIN = '300';
const password = 'Synthetic-test-password-42';
const passwordHash = bcrypt.hashSync(password, 4);
const users = new Map();
let trace = [], writes = 0, failLoginQuery = false, audits = [];

function reset() {
  users.clear();
  ['admin', 'recepcionista', 'medico', 'enfermero', 'fundacion'].forEach((rol, i) => {
    users.set(i + 1, { id_usuario: i + 1, nombre: 'Prueba ' + rol, email: rol + '@example.invalid', rol, activo: true, id_medico: rol === 'medico' ? 1 : null, password: passwordHash });
  });
  trace = []; writes = 0; failLoginQuery = false; audits = [];
}

const db = {
  async query(sql, params = []) {
    const text = sql.replace(/\s+/g, ' ').trim();
    trace.push({ sql: text, params });
    if (text === 'SELECT * FROM usuarios WHERE email = $1') {
      if (failLoginQuery) throw new Error('SYNTHETIC_DB_DETAIL_DO_NOT_EXPOSE');
      return { rows: [...users.values()].filter(u => u.email === params[0]) };
    }
    if (text.startsWith('SELECT id_usuario, nombre, email, rol, id_medico, activo FROM usuarios WHERE')) {
      const u = users.get(params[0]);
      if (!u) return { rows: [] };
      const { password: ignored, ...safe } = u;
      return { rows: [safe] };
    }
    if (text === 'SELECT * FROM usuarios WHERE id_usuario = $1') {
      const u = users.get(params[0]); return { rows: u ? [u] : [] };
    }
    if (text.startsWith('SELECT u.id_usuario, u.nombre, u.email')) {
      return { rows: [...users.values()].map(({ password: ignored, ...u }) => u) };
    }
    if (text.startsWith('INSERT INTO usuarios (nombre, email, password, rol')) {
      writes++;
      const [nombre, email, hashed, rol, id_medico] = params;
      const u = { id_usuario: 99, nombre, email, password: hashed, rol, id_medico, activo: true };
      users.set(99, u); return { rows: [u] };
    }
    if (text.startsWith('UPDATE usuarios SET password = $1')) {
      writes++; users.get(params[1]).password = params[0]; return { rowCount: 1, rows: [] };
    }
    if (text.startsWith('SELECT * FROM pacientes ') && text.includes('ORDER BY id_paciente LIMIT')) {
      return { rows: [{ id_paciente: 901, nombre: 'PACIENTE SINTÉTICO', dni: 'TEST-901' }] };
    }
    if (text.startsWith('SELECT id_paciente, nombre FROM pacientes ')) return { rows: [{ id_paciente: 901, nombre: 'PACIENTE SINTETICO' }] };
    if (/^SELECT COUNT\(\*\).*FROM pacientes/.test(text)) return { rows: [{ total: 1 }] };
    if (text === 'SELECT 1') return { rows: [{ '?column?': 1 }] };
    if (text === 'SELECT * FROM pacientes WHERE id_paciente = $1') {
      return { rows: params[0] === 901 ? [{ id_paciente: 901, nombre: 'PACIENTE SINTÉTICO', dni: 'TEST-901' }] : [] };
    }
    if (text.startsWith('INSERT INTO eventos_auditoria')) {
      audits.push({ id_usuario: params[0], accion: params[1], entidad: params[2], metadata: params[5] });
      return { rows: [], rowCount: 1 };
    }
    throw new Error('UNEXPECTED_MOCK_QUERY');
  },
  async connect() { throw new Error('UNEXPECTED_TRANSACTION_ACCESS'); },
};

const dbFile = require.resolve('../src/config/db');
require.cache[dbFile] = { id: dbFile, filename: dbFile, loaded: true, exports: db };
const schemaFile = require.resolve('../schema');
require.cache[schemaFile] = { id: schemaFile, filename: schemaFile, loaded: true, exports: { ensureSchema: async () => {} } };
const app = require('../src/app');
const results = [];
let base;
const token = (id = 1, opts = {}) => jwt.sign({ id_usuario: id, rol: users.get(id)?.rol, ...opts }, secret, opts.exp === undefined ? { expiresIn: '1h' } : {});

async function request(method, endpoint, { auth, body, raw, headers: extra } = {}) {
  const headers = { ...(extra || {}) };
  if (auth !== undefined) headers.Authorization = auth;
  if (body !== undefined || raw !== undefined) headers['Content-Type'] = 'application/json';
  const r = await fetch(base + endpoint, { method, headers, body: raw !== undefined ? raw : body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(10000) });
  const text = await r.text();
  let data; try { data = JSON.parse(text); } catch { data = text; }
  return { status: r.status, data, text, headers: r.headers };
}
async function check(id, title, type, fn) {
  reset();
  require('../src/middlewares/rateLimit').loginLimiter.resetKey('127.0.0.1');
  try { const observed = await fn(); results.push({ id, title, type, status: 'APROBADO', observed: observed || 'Comportamiento esperado comprobado' }); }
  catch (e) { results.push({ id, title, type, status: 'FALLIDO', observed: e.message }); }
  console.log(results.at(-1).status + ' ' + id + ' ' + title);
}
async function denied(method, endpoint, auth, body, status = 403) {
  const r = await request(method, endpoint, { auth, body });
  assert.equal(r.status, status, 'Esperado HTTP ' + status + '; recibido ' + r.status);
  assert.equal(writes, 0, 'Una solicitud rechazada no debe escribir');
  return 'HTTP ' + r.status + '; cero escrituras';
}

async function main() {
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  base = 'http://127.0.0.1:' + server.address().port;
  try {
    await check('SEG-01', 'Rutas sensibles sin autenticación', 'Caja negra API', async () => {
      for (const endpoint of ['/api/auth/me', '/api/auth/usuarios', '/api/pacientes', '/api/medicos', '/api/citas', '/api/visitas', '/api/triajes', '/api/prescripciones', '/api/laboratorio/ordenes', '/api/cargos', '/api/pagos', '/api/productos?tipo=farmacia', '/api/documentos', '/api/backups/export', '/api/auditoria', '/api/analisis/priorizacion']) await denied('GET', endpoint, undefined, undefined, 401);
      assert.equal(trace.length, 0); return '16 endpoints rechazan con 401; cero consultas y escrituras';
    });
    await check('SEG-02', 'Token mal formado', 'Caja negra API', () => denied('GET', '/api/auth/me', 'Bearer invalid.token', undefined, 401));
    await check('SEG-03', 'Token con firma ajena', 'Caja negra API', () => denied('GET', '/api/auth/me', 'Bearer ' + jwt.sign({ id_usuario: 1 }, crypto.randomBytes(32).toString('hex')), undefined, 401));
    await check('SEG-04', 'Token vencido', 'Caja negra API', () => denied('GET', '/api/auth/me', 'Bearer ' + token(1, { exp: 1 }), undefined, 401));
    await check('SEG-05', 'Token sin firma', 'Caja negra API', () => denied('GET', '/api/auth/me', 'Bearer ' + jwt.sign({ id_usuario: 1 }, null, { algorithm: 'none' }), undefined, 401));
    await check('SEG-06', 'Cuenta eliminada', 'Caja blanca ramas autenticación', () => denied('GET', '/api/auth/me', 'Bearer ' + token(999), undefined, 401));
    await check('SEG-07', 'Revocación por cuenta inactiva', 'Caja blanca ramas autenticación', async () => {
      const t = token(); users.get(1).activo = false; return denied('GET', '/api/auth/me', 'Bearer ' + t, undefined, 401);
    });
    await check('SEG-08', 'Rol actual prevalece sobre rol antiguo del token', 'Caja blanca permisos', async () => {
      const t = token(); users.get(1).rol = 'recepcionista'; return denied('GET', '/api/auth/usuarios', 'Bearer ' + t);
    });
    await check('SEG-09', 'No escalar rol desde campos del login', 'Caja negra API', async () => {
      await denied('POST', '/api/auth/login', undefined, { email: 'recepcionista@example.invalid', password, rol: 'admin' });
    });
    await check('SEG-10', 'Administrador accede sin exponer hash', 'Caja negra API', async () => {
      const r = await request('GET', '/api/auth/usuarios', { auth: 'Bearer ' + token() });
      assert.equal(r.status, 200); assert.ok(r.data.every(u => !('password' in u))); return 'HTTP 200; lista sin contraseñas';
    });
    await check('SEG-11', 'Recepción no administra usuarios', 'Caja negra API', () => denied('POST', '/api/auth/usuarios', 'Bearer ' + token(2), { nombre: 'Intento', email: 'new@example.invalid', password, rol: 'admin' }));
    await check('SEG-12', 'Médico no elimina pacientes', 'Caja negra API', () => denied('DELETE', '/api/pacientes/901', 'Bearer ' + token(3)));
    await check('SEG-13', 'Médico no registra movimientos de farmacia', 'Caja negra API', () => denied('POST', '/api/productos/1/movimientos', 'Bearer ' + token(3), { tipo: 'salida', cantidad: 1, motivo: 'Prueba' }));
    await check('SEG-14', 'Enfermería no elimina documentos', 'Caja negra API', () => denied('DELETE', '/api/documentos/1', 'Bearer ' + token(4)));
    await check('SEG-15', 'Fundación no exporta respaldo', 'Caja negra API', () => denied('GET', '/api/backups/export', 'Bearer ' + token(5)));
    await check('SEG-16', 'Recepción no dispensa prescripciones', 'Caja negra API', () => denied('POST', '/api/prescripciones/1/dispensar', 'Bearer ' + token(2), { cantidad: 1 }));
    await check('SEG-17', 'Login vacío rechazado antes de consulta', 'Caja blanca validación', async () => { await denied('POST', '/api/auth/login', undefined, {}, 400); assert.equal(trace.length, 0); });
    await check('SEG-18', 'Credenciales incorrectas y usuario inexistente', 'Caja negra API', async () => {
      const a = await request('POST', '/api/auth/login', { body: { email: 'admin@example.invalid', password: 'wrong' } });
      const b = await request('POST', '/api/auth/login', { body: { email: 'unknown@example.invalid', password: 'wrong' } });
      assert.equal(a.status, 401); assert.equal(b.status, 401); assert.deepEqual(a.data, b.data); assert.equal(writes, 0);
      return 'Ambos rechazan con mismo mensaje; no mide diferencias temporales';
    });
    await check('SEG-19', 'Login válido y hash ausente en respuesta', 'Caja negra API', async () => {
      const r = await request('POST', '/api/auth/login', { body: { email: 'admin@example.invalid', password } });
      assert.equal(r.status, 200); assert.ok(!('password' in r.data.usuario)); assert.equal(jwt.verify(r.data.token, secret).id_usuario, 1);
      return 'HTTP 200; token verificable; usuario sin hash';
    });
    await check('SEG-20', 'Cambio de contraseña exige clave actual', 'Caja blanca validación y efectos', () => denied('PUT', '/api/auth/password', 'Bearer ' + token(), { password_actual: 'wrong', password_nuevo: 'New-synthetic-password-42' }, 401));
    await check('SEG-21', 'Contraseña demasiado corta rechazada', 'Caja blanca validación', () => denied('PUT', '/api/auth/password', 'Bearer ' + token(), { password_actual: password, password_nuevo: 'short' }, 400));
    await check('SEG-22', 'Creación almacena bcrypt y oculta hash', 'Caja blanca efectos y caja negra API', async () => {
      const r = await request('POST', '/api/auth/usuarios', { auth: 'Bearer ' + token(), body: { nombre: 'Cuenta sintética', email: 'new@example.invalid', password, rol: 'recepcionista' } });
      assert.equal(r.status, 201); assert.ok(!('password' in r.data)); assert.notEqual(users.get(99).password, password); assert.ok(await bcrypt.compare(password, users.get(99).password));
      assert.equal(bcrypt.getRounds(users.get(99).password), 12); return 'Hash bcrypt con factor 12 en doble de BD; respuesta sin hash';
    });
    await check('SEG-23', 'Cadena SQL del login permanece parametrizada', 'Caja blanca frontera SQL', async () => {
      const input = "' or '1'='1";
      await denied('POST', '/api/auth/login', undefined, { email: input, password: 'wrong' }, 401);
      assert.equal(trace[0].sql, 'SELECT * FROM usuarios WHERE email = $1'); assert.equal(trace[0].params[0], input);
      return 'Dato tratado como parámetro; no verifica motor PostgreSQL';
    });
    await check('SEG-24', 'Documento con tipo no permitido', 'Caja negra API', () => denied('POST', '/api/documentos', 'Bearer ' + token(), { id_paciente: 901, nombre: 'archivo.html', tipo: 'text/html', contenido: 'SGVsbG8=' }, 400));
    await check('SEG-25', 'Documento vacío o base64 inválido', 'Caja blanca validación', async () => {
      for (const contenido of ['', 'not-base64!']) await denied('POST', '/api/documentos', 'Bearer ' + token(), { id_paciente: 901, nombre: 'archivo.txt', tipo: 'text/plain', contenido }, 400);
    });
    await check('SEG-26', 'Documento mayor de 5 MB', 'Caja negra API', () => denied('POST', '/api/documentos', 'Bearer ' + token(), { id_paciente: 901, nombre: 'archivo.txt', tipo: 'text/plain', contenido: Buffer.alloc(5 * 1024 * 1024 + 1, 65).toString('base64') }, 400));
    await check('SEG-27', 'Fundación sin acceso directo a pacientes según roles de interfaz', 'Caja negra API contra política frontend', async () => {
      const r = await request('GET', '/api/pacientes', { auth: 'Bearer ' + token(5) });
      assert.equal(r.status, 403, 'Política frontend excluye Fundación de Pacientes; API respondió HTTP ' + r.status + (r.status === 200 ? ' y devolvió un paciente sintético' : ''));
    });
    await check('SEG-28', 'Login no revela detalles de una falla interna', 'Caja blanca rama de error y caja negra API', async () => {
      failLoginQuery = true;
      const r = await request('POST', '/api/auth/login', { body: { email: 'admin@example.invalid', password } });
      assert.equal(r.status, 500); assert.ok(!r.text.includes('SYNTHETIC_DB_DETAIL_DO_NOT_EXPOSE'), 'La respuesta HTTP 500 incluyó el mensaje interno de la excepción sintética');
    });

    await check('SEG-29', 'Cabeceras de seguridad (helmet) y sin x-powered-by', 'Caja negra API', async () => {
      const r = await request('GET', '/api/health');
      assert.equal(r.headers.get('x-content-type-options'), 'nosniff');
      assert.ok(r.headers.get('strict-transport-security'), 'Falta Strict-Transport-Security');
      assert.equal(r.headers.get('x-powered-by'), null);
      return 'nosniff, HSTS presentes; x-powered-by ausente';
    });
    await check('SEG-30', 'CORS rechaza origenes no autorizados', 'Caja negra API', async () => {
      const bad = await request('GET', '/api/health', { headers: { Origin: 'https://sitio-malicioso.example' } });
      assert.equal(bad.headers.get('access-control-allow-origin'), null, 'No debe reflejar un origen ajeno');
      const ok = await request('GET', '/api/health', { headers: { Origin: 'http://localhost:5173' } });
      assert.equal(ok.headers.get('access-control-allow-origin'), 'http://localhost:5173');
      return 'Origen ajeno sin cabecera CORS; origen del frontend permitido';
    });
    await check('SEG-31', 'JSON mal formado responde 400 sin detalles internos', 'Caja negra API', async () => {
      const r = await request('POST', '/api/auth/login', { raw: '{"email": ' });
      assert.equal(r.status, 400); assert.ok(!/SyntaxError|at \w+|node_modules/.test(r.text)); return 'HTTP 400 con mensaje generico';
    });
    await check('SEG-32', 'Token firmado con algoritmo distinto a HS256 es rechazado', 'Caja negra API', () =>
      denied('GET', '/api/auth/me', 'Bearer ' + jwt.sign({ id_usuario: 1 }, secret, { algorithm: 'HS512' }), undefined, 401));
    await check('SEG-33', 'Login exitoso y fallido quedan en auditoria sin guardar la contrasena', 'Caja blanca auditoria', async () => {
      await request('POST', '/api/auth/login', { body: { email: 'admin@example.invalid', password } });
      await request('POST', '/api/auth/login', { body: { email: 'admin@example.invalid', password: 'incorrecta-123' } });
      assert.ok(audits.some(a => a.accion === 'auth.login' && a.id_usuario === 1), 'Falta auth.login');
      const fallido = audits.find(a => a.accion === 'auth.login_fallido');
      assert.ok(fallido, 'Falta auth.login_fallido');
      assert.ok(!JSON.stringify(audits).includes('incorrecta-123') && !JSON.stringify(audits).includes(password), 'La auditoria no debe contener contrasenas');
      return 'auth.login y auth.login_fallido registrados; sin contrasenas';
    });
    await check('SEG-34', 'Consultar un paciente queda auditado con usuario y entidad', 'Caja blanca auditoria', async () => {
      const r = await request('GET', '/api/pacientes/901', { auth: 'Bearer ' + token(3) });
      assert.equal(r.status, 200);
      const ev = audits.find(a => a.accion === 'paciente.consultado');
      assert.ok(ev, 'No se registro paciente.consultado');
      assert.equal(ev.id_usuario, 3); assert.equal(ev.entidad, 'paciente');
      return 'HTTP 200 y evento paciente.consultado atribuido al medico';
    });
    await check('SEG-34b', 'Una consulta rechazada por rol no genera auditoria de acceso', 'Caja blanca auditoria', async () => {
      const r = await request('GET', '/api/pacientes/901', { auth: 'Bearer ' + token(5) });
      assert.equal(r.status, 403); assert.equal(audits.length, 0);
    });
    await check('SEG-35', 'Configuracion insegura impide arrancar', 'Caja blanca entorno', async () => {
      const { assertSecureEnv } = require('../src/config/env');
      const saved = { ...process.env };
      try {
        process.env.DB_PASSWORD = 'unaClaveFuerte-9x!';
        process.env.JWT_SECRET = 'clave_super_secreta_centromedico_2026_cambiar_esto';
        assert.throws(() => assertSecureEnv(), /valor de ejemplo/);
        process.env.JWT_SECRET = 'corta';
        assert.throws(() => assertSecureEnv(), /32 caracteres/);
        delete process.env.JWT_SECRET;
        assert.throws(() => assertSecureEnv(), /JWT_SECRET no esta definido/);
        process.env.JWT_SECRET = crypto.randomBytes(48).toString('hex');
        delete process.env.DB_PASSWORD;
        assert.throws(() => assertSecureEnv(), /DB_PASSWORD no esta definido/);
        process.env.DB_PASSWORD = 'unaClaveFuerte-9x!';
        assert.doesNotThrow(() => assertSecureEnv());
      } finally { for (const k of Object.keys(process.env)) delete process.env[k]; Object.assign(process.env, saved); }
      return 'Rechaza secreto de ejemplo, corto o ausente y BD sin contrasena';
    });
    await check('SEG-36', 'Sin contrasenas por defecto en el codigo de conexion', 'Caja blanca codigo', async () => {
      for (const f of ['../db.js', '../src/config/db.js']) {
        const src = fs.readFileSync(path.resolve(__dirname, f), 'utf8');
        assert.ok(!/\|\|\s*["']root["']/.test(src), f + ' conserva una contrasena por defecto');
      }
    });
    await check('SEG-37', 'Login se bloquea tras demasiados intentos fallidos (429)', 'Caja negra API', async () => {
      let blocked = false;
      for (let i = 0; i < 15 && !blocked; i++) {
        const r = await request('POST', '/api/auth/login', { body: { email: 'fuerza-bruta@example.invalid', password: 'x' + i } });
        if (r.status === 429) blocked = true;
      }
      assert.ok(blocked, 'Nunca se recibio HTTP 429');
      return 'HTTP 429 tras intentos fallidos repetidos';
    });
    await check('SEG-38', 'Fundacion puede seleccionar pacientes sin recibir su ficha', 'Caja negra API', async () => {
      const r = await request('GET', '/api/pacientes/opciones', { auth: 'Bearer ' + token(5) });
      assert.equal(r.status, 200); assert.equal(r.data.meta.total, 1);
      assert.deepEqual(Object.keys(r.data.data[0]).sort(), ['id_paciente', 'nombre']);
      assert.ok(trace.some(t => t.sql.startsWith('SELECT id_paciente, nombre FROM pacientes ')));
      await denied('GET', '/api/pacientes/901', 'Bearer ' + token(5));
    });
    await check('SEG-39', 'Selector exige autenticacion y permite roles operativos', 'Caja negra API', async () => {
      await denied('GET', '/api/pacientes/opciones', undefined, undefined, 401);
      for (const id of [1, 2, 3, 4]) assert.equal((await request('GET', '/api/pacientes/opciones', { auth: 'Bearer ' + token(id) })).status, 200);
    });
    await check('SEG-40', 'Arranques reales validan entorno antes de abrir base de datos', 'Caja negra proceso', async () => {
      const { spawnSync } = require('node:child_process');
      for (const entry of ['index.js', 'src/app.js']) {
        const r = spawnSync(process.execPath, [entry], { cwd: path.resolve(__dirname, '..'), env: { ...process.env, JWT_SECRET: 'corta', DB_PASSWORD: 'synthetic' }, encoding: 'utf8', timeout: 5000 });
        assert.equal(r.status, 1); assert.match(r.stderr, /32 caracteres/); assert.doesNotMatch(r.stdout, /Servidor corriendo/);
      }
    });
    await check('SEG-41', 'Generador de secretos funciona sin mostrar el valor en el informe', 'Caja negra proceso', async () => {
      const r = require('node:child_process').spawnSync(process.execPath, [path.join(__dirname, 'generate-secret.js')], { encoding: 'utf8', timeout: 5000 });
      assert.equal(r.status, 0); assert.ok(/JWT_SECRET=[a-f0-9]{128}/.test(r.stdout));
    });
    await check('SEG-43', 'Fundacion conserva solo lectura en citas y laboratorio', 'Caja negra API', async () => {
      for (const [method, endpoint] of [
        ['POST', '/api/citas'], ['PUT', '/api/citas/1'], ['PATCH', '/api/citas/1/estado'],
        ['POST', '/api/laboratorio/insumos'], ['PUT', '/api/laboratorio/insumos/1'],
        ['POST', '/api/laboratorio/insumos/1/movimientos'], ['POST', '/api/laboratorio/ordenes'],
        ['PUT', '/api/laboratorio/ordenes/1'], ['PATCH', '/api/laboratorio/ordenes/1/estado'],
        ['POST', '/api/laboratorio/resultados'], ['PUT', '/api/laboratorio/resultados/1'],
      ]) await denied(method, endpoint, 'Bearer ' + token(5), {});
      assert.ok(trace.every(t => t.sql.startsWith('SELECT id_usuario')), 'No debe llegar a consultas o escrituras del modulo');
      return '11 operaciones rechazan con 403; selector de pacientes comprobado en SEG-38';
    });
    await check('SEG-42', 'Inicios exitosos no agotan el limite de fallos', 'Caja negra API', async () => {
      for (let i = 0; i < 12; i++) assert.equal((await request('POST', '/api/auth/login', { body: { email: 'admin@example.invalid', password } })).status, 200);
    });
  } finally { await new Promise(resolve => server.close(resolve)); }
  const report = { executedAt: new Date().toISOString(), environment: 'App Express y rutas reales; PostgreSQL y ensureSchema sustituidos por dobles estrictos; servidor solo loopback', passed: results.filter(r => r.status === 'APROBADO').length, failed: results.filter(r => r.status === 'FALLIDO').length, results };
  const out = path.resolve(__dirname, '../../output/sqa'); fs.mkdirSync(out, { recursive: true });
  fs.writeFileSync(path.join(out, 'resultados_seguridad.json'), JSON.stringify(report, null, 2));
  console.log('RESULTADO: ' + report.passed + ' aprobadas; ' + report.failed + ' fallidas. Sin acceso a BD real.');
  if (report.failed) process.exitCode = 1;
}
main().catch(e => { console.error(e.message); process.exitCode = 1; });
