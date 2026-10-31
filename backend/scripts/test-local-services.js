// Regresion aislada: reglas reales, PostgreSQL sustituido y red prohibida.
const assert = require('node:assert/strict');
process.env.TRIAGE_SERVICE_URL = 'http://obsolete.invalid:4101';
process.env.INVENTORY_ALERTS_SERVICE_URL = 'http://obsolete.invalid:4102';
let networkCalls = 0;
global.fetch = async () => { networkCalls++; throw new Error('No debe acceder a servicios externos'); };
const dbId = require.resolve('../src/config/db');
require.cache[dbId] = { id: dbId, filename: dbId, loaded: true, exports: { async query(sql, params) {
  assert.match(sql, /FROM visitas_medicas/);
  assert.deepEqual(params, [7]);
  return { rows: [] };
} } };
const service = require('../src/modules/analisis/analisis.service');
const { buildInventoryAlerts } = require('../src/services/inventoryAlerts');
(async () => {
  const normal = { motivo_consulta: 'Control', presion_arterial: '110/70', frecuencia_cardiaca: 80, frecuencia_respiratoria: 18, temperatura: 36.5, saturacion_oxigeno: 97 };
  const preview = await service.calcularPrioridadDesdeEntrada(normal);
  assert.equal(preview.prioridad_clinica, 'baja');
  assert.equal(preview.puntaje_prioridad, 0);
  assert.equal(preview.fuente_prioridad, 'local');
  assert.equal(preview.evidencia_priorizacion.signos_registrados.length, 5);
  for (const missing of [null, '', '  ', undefined]) {
    const absent = await service.calcularPrioridadDesdeEntrada({
      temperatura: missing, saturacion_oxigeno: missing,
      frecuencia_cardiaca: missing, frecuencia_respiratoria: missing,
      presion_arterial: missing,
    });
    assert.equal(absent.puntaje_prioridad, 0, 'Datos ausentes no deben sumar puntos como signos medidos en cero');
    assert.equal(absent.evidencia_priorizacion.datos_faltantes.length, 5);
    assert.equal(absent.evidencia_priorizacion.requiere_validacion_clinica, true);
  }
  const patient = await service.calcularPrioridadParaPaciente(7, { ...normal, motivo_consulta: 'convulsion activa' });
  assert.equal(patient.prioridad_clinica, 'critica');
  assert.equal(patient.fuente_prioridad, 'local');
  assert.equal(patient.evidencia_priorizacion.visitas_historicas_consultadas, 0);
  const abnormal = await service.calcularPrioridadDesdeEntrada({ ...normal, temperatura: 39, saturacion_oxigeno: 88, frecuencia_respiratoria: 32 });
  assert.equal(abnormal.prioridad_clinica, 'critica');
  const date = days => { const d = new Date(); d.setDate(d.getDate() + days); return d.toISOString().slice(0, 10); };
  const items = [
    { id: 1, name: 'Agotado', stock: 0, minStock: 2, expirationDate: null },
    { id: 2, name: 'Vencido', stock: 10, minStock: 2, expirationDate: date(-10) },
    { id: 3, name: 'Proximo', stock: 10, minStock: 2, expirationDate: date(10) },
    { id: 4, name: 'Normal', stock: 10, minStock: 2, expirationDate: date(400) },
  ].map(x => ({ category: 'Prueba', unit: 'unidad', ...x }));
  const alerts = await buildInventoryAlerts(items);
  assert.equal(alerts.source, 'local');
  assert.equal(alerts.summary.lowStock, 1);
  assert.equal(alerts.summary.outOfStock, 1);
  assert.equal(alerts.summary.expired, 1);
  assert.equal(alerts.summary.expiringSoon, 1);
  assert.equal(alerts.alerts.length, 3);
  assert.equal((await buildInventoryAlerts([])).alerts.length, 0);
  assert.equal(networkCalls, 0, 'Ignora URLs antiguas y no realiza llamadas externas');
  console.log('APROBADO: prioridad normal, critica y por signos; evidencia; alertas de stock y vencimiento; cero llamadas externas con URLs antiguas.');
})().catch(error => { console.error(error); process.exitCode = 1; });
