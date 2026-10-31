// Código real; DB estricta y proveedor simulados. Solo HTTP loopback para probar rutas.
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const jwt = require('jsonwebtoken');
process.env.JWT_SECRET = crypto.randomBytes(48).toString('hex');
process.env.APP_URL = 'https://frontend.example.invalid';
process.env.PUBLIC_API_URL = 'https://backend.example.invalid';
process.env.EMAIL_ENABLED = 'false';
process.env.EMAIL_FROM = '';
process.env.RESEND_API_KEY = '';
const rows = new Map();
const patients = new Map([[7, { nombre: 'Persona sintética', email: 'paciente@example.invalid' }], [8, { nombre: 'Sin correo', email: '' }]]);
const appointment = { id_cita: 4, id_paciente: 7, estado: 'confirmada', fecha_hora: '2030-01-02T15:00:00Z' };
let actorRole = 'admin', active = true, failFinalSave = false, pdfs = 0;
const db = { async query(sql, args = []) {
  const s = sql.replace(/\s+/g, ' ').trim();
  if (s.includes('FROM usuarios') && s.includes('WHERE id_usuario = $1')) return { rows: [{ id_usuario: 1, rol: actorRole, activo: active }] };
  if (s.startsWith('SELECT nombre, email, activo FROM usuarios')) return { rows: [{ nombre: 'Personal', email: 'personal@example.invalid', activo: true }] };
  if (s.startsWith('SELECT nombre, email FROM pacientes')) return { rows: patients.has(args[0]) ? [patients.get(args[0])] : [] };
  if (s.startsWith('SELECT datos FROM configuracion_centro')) return { rows: [{ datos: { centerName: 'Centro de prueba', phone: 'Contacto sintético', timezone: 'America/Guatemala' } }] };
  if (s.startsWith('SELECT c.id_cita, c.id_paciente')) return { rows: args[0] === 4 ? [{ ...appointment, ...patients.get(7) }] : [] };
  if (s.startsWith('INSERT INTO notificaciones_correo')) {
    const [id, key, tipo, entidad_id, destinatario, message, id_usuario] = args;
    if (![...rows.values()].some(r => r.evento_clave === key)) rows.set(id, { id, evento_clave: key, tipo, entidad_id, destinatario,
      mensaje: JSON.parse(message), id_usuario, estado: 'pendiente', created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
    return { rows: [] };
  }
  if (s === 'SELECT * FROM notificaciones_correo WHERE evento_clave=$1') return { rows: [...rows.values()].filter(r => r.evento_clave === args[0]).map(r => ({ ...r })) };
  if (s === 'SELECT * FROM notificaciones_correo WHERE id=$1') return { rows: rows.has(args[0]) ? [{ ...rows.get(args[0]) }] : [] };
  if (s.startsWith("UPDATE notificaciones_correo SET estado='enviando'")) {
    const r = rows.get(args[0]);
    if (!r || r.estado === 'aceptado' || (r.estado === 'enviando' && Date.now() - new Date(r.ultimo_intento).getTime() < 60000)) return { rows: [] };
    if (!r.primer_intento) r.mensaje.from = args[1];
    r.primer_intento ||= new Date().toISOString(); r.ultimo_intento = new Date().toISOString(); r.estado = 'enviando';
    return { rows: [{ ...r }] };
  }
  if (s.startsWith('UPDATE notificaciones_correo SET estado=$2')) {
    if (failFinalSave) { failFinalSave = false; throw new Error('SYNTHETIC_DB_AFTER_PROVIDER'); }
    const r = rows.get(args[0]); Object.assign(r, { estado: args[1], error_codigo: args[2], proveedor_id: args[3] }); return { rows: [{ ...r }] };
  }
  if (s.startsWith('SELECT * FROM notificaciones_correo WHERE ($1::boolean')) return { rows: [...rows.values()].filter(r => args[0] || r.id_usuario === args[1]) };
  if (s.startsWith('SELECT n.id FROM notificaciones_correo')) {
    const r = rows.get(args[0]); return { rows: r && r.tipo === 'estado_cuenta' && r.entidad_id === args[1] && patients.get(args[1])?.email === r.destinatario ? [{ id: r.id }] : [] };
  }
  if (s.startsWith('SELECT id_paciente AS id, nombre FROM pacientes')) return { rows: [...patients].map(([id, p]) => ({ id, nombre: p.nombre })) };
  throw new Error('Consulta inesperada: ' + s);
} };
function mock(file, exports) { const id = require.resolve(file); require.cache[id] = { id, filename: id, loaded: true, exports }; }
mock('../src/config/db', db);
mock('../src/services/audit', { logAuditEvent: async () => {} });
mock('../src/modules/cargos/estadoCuenta', { async streamEstadoCuenta(id, by, res) { pdfs++; assert.equal(id, 7); res.type('application/pdf').send('PDF sintético'); return true; } });
const nativeFetch = global.fetch;
let mode = 'ok', sends = [], gate = null;
global.fetch = async (url, options) => {
  if (url !== 'https://api.resend.com/emails') return nativeFetch(url, options);
  sends.push({ headers: options.headers, body: JSON.parse(options.body) });
  if (gate) await gate;
  if (mode === 'timeout') throw new Error('SYNTHETIC_TIMEOUT');
  return { ok: mode === 'ok', status: mode === 'ok' ? 200 : Number(mode), json: async () => mode === 'ok' ? { id: 'provider-test' } : { message: 'SECRET_INTERNAL_PROVIDER_DETAIL' } };
};
const service = require('../src/modules/notificaciones/notificaciones.service');
const admin = { id_usuario: 1, rol: 'admin' }, reception = { id_usuario: 2, rol: 'recepcionista' };
const input = (tipo = 'paciente_bienvenida', entidad_id = 7, email = 'paciente@example.invalid') => ({ tipo, entidad_id, destinatario_confirmado: true, email_confirmado: email });
const app = require('express')(); app.use(require('express').json());
app.use('/api/notificaciones', require('../src/modules/notificaciones/notificaciones.routes'));
app.use((error, req, res, next) => res.status(500).json({ message: 'Error interno' }));
let passed = 0;
const check = (condition, label) => { assert.ok(condition, label); passed++; };
(async () => {
  await assert.rejects(service.send(input(), { id_usuario: 3, rol: 'fundacion' }), { status: 403 });
  await assert.rejects(service.send({ ...input(), destinatario_confirmado: false }, admin), { status: 400 });
  await assert.rejects(service.send({ ...input(), email_confirmado: 'otro@example.invalid' }, admin), { status: 400 });
  await assert.rejects(service.send(input('paciente_bienvenida', 8), admin), { status: 400 });
  check(rows.size === 0 && sends.length === 0, 'Permisos y destinatario rechazados sin crear ni enviar');
  const pending = await service.send(input(), admin);
  check(pending.estado === 'pendiente' && sends.length === 0, 'Sin configurar queda pendiente, sin red');
  process.env.EMAIL_ENABLED = 'true'; process.env.EMAIL_FROM = 'Centro <avisos@example.invalid>'; process.env.RESEND_API_KEY = 'synthetic-key';
  const accepted = await service.retry(pending.id, input(), admin);
  check(accepted.estado === 'aceptado' && sends.length === 1, 'Reintento tras configuración envía realmente al adaptador');
  check(sends[0].body.from === process.env.EMAIL_FROM, 'Pendiente creado sin remitente usa configuración al primer intento');
  check(!('mensaje' in accepted) && !('entregado' in accepted), 'Respuesta no expone mensaje ni afirma entrega');
  await service.send(input(), admin);
  check(rows.size === 1 && sends.length === 1, 'Doble solicitud no duplica evento ni correo aceptado');
  await assert.rejects(service.send(input('usuario_bienvenida', 1, 'personal@example.invalid'), reception), { status: 403 });
  const welcome = await service.send(input('usuario_bienvenida', 1, 'personal@example.invalid'), admin);
  check(welcome.estado === 'aceptado' && sends.at(-1).body.text.includes(process.env.APP_URL), 'Bienvenida del personal con acceso normal y sin clave');
  const clinical = 'diagnóstico secreto'; appointment.motivo = clinical;
  mode = '500'; const order = await service.send(input('cita_confirmacion', 4), admin);
  check(order.estado === 'desconocido' && !sends.at(-1).body.text.includes(clinical), 'Cita sin datos clínicos; HTTP 500 conserva incertidumbre');
  const key = sends.at(-1).headers['Idempotency-Key'], frozen = JSON.stringify(sends.at(-1).body);
  mode = 'ok'; await service.retry(order.id, input(), admin);
  check(sends.at(-1).headers['Idempotency-Key'] === key && JSON.stringify(sends.at(-1).body) === frozen, 'Reintento conserva clave y mensaje exactos');
  mode = '400'; const failed = await service.send(input('cita_reprogramacion', 4), admin);
  check(failed.estado === 'fallido' && failed.error_codigo === 'PROVEEDOR_HTTP_400', 'Rechazo del proveedor guarda estado sin detalles secretos');
  appointment.fecha_hora = '2030-01-03T15:00:00Z';
  await assert.rejects(service.retry(failed.id, input(), admin), { status: 409 });
  check(true, 'No reenvía horario antiguo');
  mode = 'timeout'; const unknown = await service.send(input('cita_reprogramacion', 4), reception);
  check(unknown.estado === 'desconocido', 'Timeout no se interpreta como rechazo seguro');
  await assert.rejects(service.retry(unknown.id, input(), { id_usuario: 3, rol: 'recepcionista' }), { status: 403 });
  rows.get(unknown.id).primer_intento = new Date(Date.now() - 24 * 3600000).toISOString();
  await assert.rejects(service.retry(unknown.id, input(), reception), { status: 409 });
  check(true, 'No permite reintento después de ventana de idempotencia');
  mode = 'ok'; const account = await service.send(input('estado_cuenta'), admin);
  const url = sends.at(-1).body.text.match(/https:\/\/backend\.example\.invalid\/api\/notificaciones\/estado-cuenta\/\S+/)[0];
  const token = url.split('/').at(-1), payload = jwt.verify(token, process.env.JWT_SECRET, { audience: 'estado-cuenta' });
  check(payload.paciente === 7 && payload.jti === account.id && payload.exp - payload.iat === 86400, 'Enlace firmado acotado al paciente, aviso y 24 horas');
  check(!sends.at(-1).body.text.includes('saldo'), 'Correo de cuenta no expone importes');
  patients.get(7).email = 'cambiado@example.invalid';
  await assert.rejects(service.retry(account.id, input('estado_cuenta', 7, 'cambiado@example.invalid'), admin), { status: 409 });
  patients.get(7).email = 'paciente@example.invalid';
  // Caída después de aceptar: no cambia la solicitud al recuperarse.
  appointment.fecha_hora = '2030-02-01T15:00:00Z'; failFinalSave = true;
  await assert.rejects(service.send(input('cita_confirmacion', 4), admin), /SYNTHETIC_DB_AFTER_PROVIDER/);
  const crashed = [...rows.values()].at(-1); crashed.ultimo_intento = new Date(Date.now() - 120000).toISOString();
  const previousKey = sends.at(-1).headers['Idempotency-Key'];
  await service.retry(crashed.id, input(), admin);
  check(sends.at(-1).headers['Idempotency-Key'] === previousKey, 'Tras caída posterior a envío reutiliza clave');
  // Dos operadores concurrentes sobre una misma solicitud: solo uno obtiene el reclamo.
  appointment.fecha_hora = '2030-03-01T15:00:00Z';
  let release; gate = new Promise(resolve => { release = resolve; }); const before = sends.length;
  const a = service.send(input('cita_confirmacion', 4), admin); await new Promise(resolve => setTimeout(resolve, 5));
  const b = await service.send(input('cita_confirmacion', 4), admin); release(); await a; gate = null;
  check(b.estado === 'enviando' && sends.length === before + 1, 'Solicitudes concurrentes no duplican envío');

  const server = app.listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}/api/notificaciones`;
  const bearer = jwt.sign({ id_usuario: 1 }, process.env.JWT_SECRET);
  const request = (path, method = 'GET', body, auth = true) => nativeFetch(base + path, { method, headers: { 'Content-Type': 'application/json', ...(auth ? { Authorization: `Bearer ${bearer}` } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
  try {
    check((await request('/estado', 'GET', null, false)).status === 401, 'Estado requiere sesión');
    actorRole = 'medico'; check((await request('/estado')).status === 403, 'Médico no entra a notificaciones administrativas');
    actorRole = 'enfermero'; check((await request('/preparar?tipo=estado_cuenta&entidad_id=7')).status === 403, 'Enfermería no prepara cuentas');
    check((await request('/preparar?tipo=usuario_bienvenida&entidad_id=1')).status === 403, 'Enfermería no prepara usuarios');
    actorRole = 'recepcionista'; check((await request('/preparar?tipo=paciente_bienvenida&entidad_id=7')).status === 200, 'Recepción prepara aviso autorizado');
    const beforePost = sends.length;
    check((await request('/', 'POST', { ...input(), destinatario_confirmado: false })).status === 400, 'API exige confirmación antes de enviar');
    actorRole = 'enfermero';
    check((await request('/', 'POST', input('estado_cuenta'))).status === 403 && sends.length === beforePost, 'API impide envíos de cuenta a Enfermería sin efectos');
    actorRole = 'admin';
    const duplicate = await request('/', 'POST', input());
    check(duplicate.status === 200 && (await duplicate.json()).estado === 'aceptado' && sends.length === beforePost, 'API devuelve aviso ya aceptado sin duplicar envío');
    active = false; check((await request('/estado')).status === 401, 'Cuenta desactivada no accede'); active = true;
    actorRole = 'admin'; const list = await (await request('/')).json();
    check(list.every(r => !r.mensaje && !r.evento_clave), 'Historial no expone cuerpos ni enlaces');
    const response = await request('/estado-cuenta/' + token, 'GET', null, false);
    check(response.status === 200 && response.headers.get('cache-control') === 'no-store' && pdfs === 1, 'Enlace válido da PDF sin sesión, sin cache');
    patients.get(7).email = 'otro@example.invalid';
    check((await request('/estado-cuenta/' + token, 'GET', null, false)).status === 401 && pdfs === 1, 'Correo cambiado revoca acceso a cuenta');
    check((await request('/estado-cuenta/' + bearer, 'GET', null, false)).status === 401, 'JWT de sesión no sirve como enlace de cuenta');
    const expired = jwt.sign({ purpose: 'estado-cuenta', paciente: 7 }, process.env.JWT_SECRET, { audience: 'estado-cuenta', jwtid: account.id, expiresIn: -1 });
    check((await request('/estado-cuenta/' + expired, 'GET', null, false)).status === 401, 'Enlace vencido rechazado');
    check((await request('/estado-cuenta/' + token.slice(0, -8) + 'invalid', 'GET', null, false)).status === 401, 'Firma alterada rechazada');
  } finally { await new Promise(resolve => server.close(resolve)); }
  console.log(`APROBADO correo: ${passed} escenarios, además de rechazos de permisos, confirmación y vigencia; DB y Resend simulados, sin mensajes reales.`);
})().catch(error => { console.error(error); process.exitCode = 1; });
