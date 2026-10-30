// Ejecuta servicio, validadores y rutas reales, sin red ni PostgreSQL externos.
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const { parseNumber, validateVitals, buildEvidence } = require('../src/modules/triajes/calidadDatos');
let passed = 0;
function check(condition, message) { assert.ok(condition, message); passed++; }
const valid = { presion_arterial: '110/70', frecuencia_cardiaca: 80, frecuencia_respiratoria: 18, temperatura: '36.5', saturacion_oxigeno: 97 };
for (const empty of [undefined, null, '', '  ']) check(parseNumber(empty) === null, 'Vacio no significa cero');
for (const bad of [true, false, [], {}, '80lpm', '1e2', '0x50', Infinity]) check(Number.isNaN(parseNumber(bad)), 'No convertir datos invalidos');
check(Number.isNaN(parseNumber('80.5', true)), 'No truncar enteros');
check(parseNumber('80', true) === 80, 'Numero completo valido');
check(validateVitals(valid) === null, 'Signos validos');
for (const [key, value] of [['frecuencia_cardiaca', -1], ['frecuencia_cardiaca', '80lpm'], ['frecuencia_respiratoria', 18.5], ['temperatura', '36.5C'], ['saturacion_oxigeno', 101], ['presion_arterial', '110/70texto'], ['presion_arterial', '70/110'], ['presion_arterial', true]]) {
  check(!!validateVitals({ [key]: value }), 'Rechazo de valor mal formado');
}
check(buildEvidence({}).datos_faltantes.length === 5, 'Sin signos no significa normalidad');
check(buildEvidence(valid).estado_datos === 'registrados', 'Datos registrados');
check(buildEvidence(valid).requiere_validacion_clinica, 'Registrar signos no confirma clinicamente');
check(buildEvidence({ frecuencia_cardiaca: '80lpm' }).datos_invalidos.includes('Frecuencia cardíaca'), 'Registro antiguo invalido se senala sin modificar');

let role = 'admin', active = true, mode = 'disabled', writes = 0, externalCalls = 0;
const queue = [{ id_cita: 1, puntaje_prioridad: 10, prioridad_clinica: 'baja', ...valid }, { id_cita: 2, puntaje_prioridad: 50, prioridad_clinica: 'alta' }];
const pool = { async query(sql) {
  if (sql.includes('FROM usuarios')) return { rows: [{ id_usuario: 1, rol: role, activo: active }] };
  if (sql.includes('SELECT fecha_nacimiento')) return { rows: [{ fecha_nacimiento: null }] };
  if (sql.includes('FROM visitas_medicas') && sql.includes('LIMIT 12')) return { rows: [] };
  if (sql.includes('FROM citas c')) return { rows: queue };
  throw new Error('Consulta inesperada: ' + sql);
}, async connect() { writes++; throw new Error('No se permite guardar en esta prueba'); } };
const externalResult = { prioridad_clinica: 'alta', puntaje_prioridad: 60, motivos_prioridad: 'Resultado sintetico', fuente_prioridad: 'servicio-sintetico' };
for (const [file, exports] of [
  ['../src/config/db', pool],
  ['../src/services/microservices', { async assessTriagePriority() { externalCalls++; if (mode === 'error') throw new Error('SYNTHETIC_UNAVAILABLE'); return mode === 'external' ? externalResult : null; } }],
]) { const id = require.resolve(file); require.cache[id] = { id, filename: id, loaded: true, exports }; }
const service = require('../src/modules/analisis/analisis.service');
const triage = require('../src/modules/triajes/triajes.service');
process.env.JWT_SECRET = require('node:crypto').randomBytes(48).toString('hex');
const app = require('express')(); app.use(require('express').json());
app.use('/api/analisis', require('../src/modules/analisis/analisis.routes'));
app.use('/api/triajes', require('../src/modules/triajes/triajes.routes'));
(async () => {
  for (mode of ['disabled', 'error']) {
    const input = { motivo_consulta: 'Control sintético', ...valid };
    const result = await service.calcularPrioridadDesdeEntrada(input);
    const baseline = service.calculatePriority(input);
    for (const key of ['prioridad_clinica', 'puntaje_prioridad', 'motivos_prioridad']) check(result[key] === baseline[key], 'La evidencia no cambia el motor local');
    check(result.evidencia_priorizacion.signos_registrados.length === 5, 'Evidencia en fallback');
  }
  mode = 'external';
  const result = await service.calcularPrioridadDesdeEntrada(valid);
  for (const key of Object.keys(externalResult)) check(result[key] === externalResult[key], 'La evidencia no reemplaza el resultado externo');
  check(!externalResult.evidencia_priorizacion, 'No mutar resultado externo');
  const patientResult = await service.calcularPrioridadParaPaciente(1, valid);
  check(patientResult.evidencia_priorizacion.visitas_historicas_consultadas === 0, 'Historial vacio explicito');
  const items = await service.getColaPriorizada();
  check(items[0].id_cita === 1 && items[1].id_cita === 2, 'Conservar orden de cola');
  check(items[1].evidencia_priorizacion.datos_faltantes.length === 5, 'Cola muestra datos faltantes');
  await assert.rejects(() => triage.upsert({ id_cita: 1, motivo_consulta: 'Prueba', frecuencia_cardiaca: '80lpm' }), { status: 400 });
  check(writes === 0, 'Rechazo antes de abrir transaccion');
  const server = app.listen(0, '127.0.0.1'); await new Promise((resolve) => server.once('listening', resolve));
  const token = jwt.sign({ id_usuario: 1 }, process.env.JWT_SECRET);
  async function request(path, body, authenticated = true) {
    return fetch(`http://127.0.0.1:${server.address().port}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(authenticated ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body) });
  }
  try {
    check((await request('/api/analisis/priorizacion/simular', {}, false)).status === 401, 'Simulacion requiere sesion');
    for (role of ['admin', 'medico', 'enfermero']) {
      const response = await request('/api/analisis/priorizacion/simular', valid);
      check(response.status === 200 && (await response.json()).evidencia_priorizacion.requiere_validacion_clinica, 'Roles clinicos permitidos');
    }
    for (role of ['recepcionista', 'fundacion']) check((await request('/api/analisis/priorizacion/simular', valid)).status === 403, 'Acceso financiero no permite simulacion');
    role = 'enfermero';
    const previous = externalCalls;
    check((await request('/api/analisis/priorizacion/simular', { temperatura: '36C' })).status === 400, 'Simulacion rechaza signos invalidos');
    check(externalCalls === previous, 'Entrada invalida no llama al motor');
    check((await request('/api/triajes', { id_cita: 1, motivo_consulta: 'Prueba', frecuencia_cardiaca: '80lpm' })).status === 400, 'Triaje HTTP no trunca datos');
    role = 'medico';
    check((await request('/api/triajes', { id_cita: 1, motivo_consulta: 'Prueba', ...valid })).status === 403, 'Conservar permiso de escritura de enfermeria');
    active = false;
    check((await request('/api/analisis/priorizacion/simular', valid)).status === 401, 'Cuenta desactivada no simula');
    check(writes === 0, 'Vista previa y rechazos sin escrituras');
    console.log(`${passed} comprobaciones aprobadas: calidad de datos, compatibilidad local/externa, cola, roles y vista previa sin escrituras.`);
  } finally { await new Promise((resolve) => server.close(resolve)); }
})().catch((error) => { console.error(error); process.exitCode = 1; });
