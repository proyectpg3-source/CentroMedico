// Motor SATS + reglas P1–P4 (funciones puras, sin base de datos).
// Verifica la batería de validación de v2 y la política de datos faltantes.
const assert = require('node:assert/strict');
const { VALIDATION_CASES } = require('../src/engines/priorityValidationCases');
const { runValidationCase } = require('../src/engines/runValidationCase');
const { DISCRIMINATORS } = require('../src/engines/satsAcademicClassifier');
const sats = require('../src/modules/triajes/evaluacionSats');
const { computeIndicators, compareIndicators, mannWhitney } = require('../src/engines/indicatorsCalculator');

let passed = 0;
function check(condition, message) { assert.ok(condition, message); passed++; }

// 1. Batería de validación (20 casos ficticios con resultado esperado).
for (const validationCase of VALIDATION_CASES) {
  const result = runValidationCase(validationCase);
  const expected = validationCase.esperado;
  check(result.estado === expected.estado, `${validationCase.id}: estado ${result.estado} ≠ ${expected.estado}`);
  check(result.nivel_propuesto === expected.nivel, `${validationCase.id}: nivel ${result.nivel_propuesto} ≠ ${expected.nivel}`);
  if (expected.maximo) check(result.nivel_maximo_posible === expected.maximo, `${validationCase.id}: máximo`);
  if (expected.justificacion) check(result.requiere_justificacion_confirmacion === true, `${validationCase.id}: exige justificación`);
  check(result.prioridad_final === null && result.requiere_confirmacion_humana === true, `${validationCase.id}: nunca asigna prioridad final`);
}

// 2. El caso que fallaba en producción: sin signos vitales ni revisión → SIN propuesta (antes P4).
const allAbsent = Object.fromEntries(Object.keys(DISCRIMINATORS).map((code) => [code, 'AUSENTE']));
const empty = sats.evaluate({
  triaje: {},
  sats: sats.sanitizeSats({}),
  fechaNacimiento: '1990-01-01',
});
check(empty.proposal.estado === 'SIN_PROPUESTA', 'Sin datos no se propone nivel');
check(empty.proposal.nivel_propuesto === null, 'Sin datos el nivel queda nulo (no P4)');
check(sats.toColumns(empty).puntaje_prioridad === 0 && sats.toColumns(empty).nivel_propuesto === null, 'Columnas sin prioridad inventada');
check(empty.proposal.acciones_requeridas.some((a) => a.includes('valoración SATS')), 'Indica la acción pendiente');

// 3. Adulto estable completo → P4 conclusiva.
const stable = sats.evaluate({
  triaje: { presion_arterial: '120/80', frecuencia_cardiaca: 80, frecuencia_respiratoria: 14, temperatura: 36.8, saturacion_oxigeno: 98 },
  sats: sats.sanitizeSats({ movilidad: 'camina', estado_conciencia: 'ALERTA', trauma: 'NO', revision_discriminadores: allAbsent }),
  fechaNacimiento: '1990-01-01',
});
check(stable.proposal.estado === 'PROPUESTA_CONCLUSIVA' && stable.proposal.nivel_propuesto === 'P4', 'Adulto estable: P4 conclusiva');
check(stable.summary.revision_completa === true, 'Revisión completa calculada por el servidor');

// 4. Discriminador P1 con datos faltantes → P1 conclusiva.
const seizure = sats.evaluate({
  triaje: {},
  sats: sats.sanitizeSats({ movilidad: 'CAMILLA_INMOVIL', estado_conciencia: 'NO_RESPONDE', trauma: 'NO', revision_discriminadores: { CONVULSION_ACTIVA: 'PRESENTE' } }),
  fechaNacimiento: '1990-01-01',
});
check(seizure.proposal.nivel_propuesto === 'P1' && seizure.proposal.estado === 'PROPUESTA_CONCLUSIVA', 'Convulsión activa: P1 aunque falten signos');

// 5. Sin fecha de nacimiento: no aplica TEWS y se pide el dato.
const noAge = sats.evaluate({
  triaje: { presion_arterial: '120/80', frecuencia_cardiaca: 80, frecuencia_respiratoria: 14, temperatura: 36.8 },
  sats: sats.sanitizeSats({ movilidad: 'CAMINA', estado_conciencia: 'ALERTA', trauma: 'NO', revision_discriminadores: allAbsent }),
  fechaNacimiento: null,
});
check(noAge.proposal.estado === 'SIN_PROPUESTA', 'Sin edad no se propone por TEWS');
check(noAge.proposal.acciones_requeridas[0].includes('fecha de nacimiento'), 'Pide la fecha de nacimiento');

// 6. Validación de entradas.
assert.throws(() => sats.sanitizeSats({ movilidad: 'CORRE' }), { status: 400 }); passed++;
assert.throws(() => sats.sanitizeSats({ revision_discriminadores: { INVENTADO: 'PRESENTE' } }), { statusCode: 400 }); passed++;
assert.throws(() => sats.sanitizeSats({ revision_discriminadores: { DOLOR_TORACICO: 'TAL_VEZ' } }), { statusCode: 400 }); passed++;
assert.throws(() => sats.sanitizeSats({ datos_no_obtenibles: { saturacion_oxigeno: 'EQUIPO_NO_DISPONIBLE' } }), { statusCode: 400 }); passed++;
assert.throws(() => sats.sanitizeSats({ revision_completa: true }), { status: 400 }); passed++;
check(sats.parseSystolic('125/80') === 125 && sats.parseSystolic('') === null, 'Lectura de presión sistólica');
check(sats.ageInYears('2000-06-15', new Date('2026-06-14')) === 25 && sats.ageInYears('2000-06-15', new Date('2026-06-15')) === 26, 'Edad exacta');

// 7. Indicadores antes/después.
const t0 = new Date('2026-10-01T08:00:00Z').getTime();
const at = (min) => new Date(t0 + min * 60000);
const before = Array.from({ length: 8 }, (_, i) => ({ llegada: at(i * 100), valoracion: at(i * 100 + 20), inicio_consulta: at(i * 100 + 90), fin_consulta: at(i * 100 + 110), prioridad: 'P3' }));
const after = Array.from({ length: 8 }, (_, i) => ({ llegada: at(i * 100), valoracion: at(i * 100 + 5), inicio_consulta: at(i * 100 + 30), fin_consulta: at(i * 100 + 50), ingreso_cola: at(i * 100 + 10), prioridad: 'P3', prioridad_sugerida: 'P3', origen_clasificacion: 'AUTOMATICA', validada: true, revision_sats_completa: true }));
const b = computeIndicators(before, { source: 'LINEA_BASE' });
const a = computeIndicators(after, { source: 'SISTEMA' });
const comparison = compareIndicators(b, a);
const wait = comparison.tiempos.find((t) => t.codigo === 'llegada_consulta');
check(wait.mediana_antes === 90 && wait.mediana_despues === 30, 'Medianas de espera');
check(wait.conclusion === 'MEJORA_SIGNIFICATIVA', 'Mann-Whitney detecta la mejora');
check(a.indicadores.concordancia_motor.concordancia_porcentaje === 100, 'Concordancia del motor');
check(mannWhitney([1, 2], [3, 4]).aplicable === false, 'Mínimo de registros por grupo');

console.log(`${passed} comprobaciones aprobadas: batería P1–P4 (${VALIDATION_CASES.length} casos), datos faltantes, validación de entradas e indicadores.`);
