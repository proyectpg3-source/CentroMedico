/*
 * CENTRO MÉDICO LA AURORA
 *
 * BATERÍA DE VALIDACIÓN DE LAS REGLAS P1-P4
 *
 * Casos FICTICIOS con el resultado esperado.
 * Se usan en:
 * - tests/engines/priorityProposal.validation.test.js
 * - GET /api/prioritizations/rules (ejecución en vivo)
 * - scripts/reporte-validacion-reglas.js (reporte
 *   para revisión y firma del médico).
 *
 * Cada caso declara el estado y nivel esperados.
 * Si el médico discrepa de un resultado, se
 * corrige la regla (nueva versión) y el caso.
 */

const ALL_ABSENT = 'TODOS_AUSENTES';

/* Adulto estable: TEWS 0 */
const STABLE = {
  edad: 35,
  movilidad: 'CAMINA',
  estado_conciencia: 'ALERTA',
  trauma: 'NO',
  vitals: {
    frecuencia_respiratoria: 14,
    frecuencia_cardiaca: 80,
    presion_sistolica: 120,
    temperatura: 36.8,
    saturacion_oxigeno: 98,
    glucometria: 95,
  },
};

function caseOf(id, title, changes, expected) {
  return {
    id,
    titulo: title,
    entrada: {
      ...STABLE,
      ...changes,
      vitals: { ...STABLE.vitals, ...(changes.vitals ?? {}) },
      revision: changes.revision ?? { [ALL_ABSENT]: true },
      no_obtenibles: changes.no_obtenibles ?? {},
    },
    esperado: expected,
  };
}

const VALIDATION_CASES = [
  /* ---------- Discriminadores ---------- */
  caseOf('V01', 'Adulto estable, revisión completa sin hallazgos', {},
    { estado: 'PROPUESTA_CONCLUSIVA', nivel: 'P4', reglas: ['P4-TEWS'] }),
  caseOf('V02', 'Convulsión activa con signos vitales normales',
    { revision: { [ALL_ABSENT]: true, CONVULSION_ACTIVA: 'PRESENTE' } },
    { estado: 'PROPUESTA_CONCLUSIVA', nivel: 'P1', reglas: ['P1-DISC', 'P4-TEWS'] }),
  caseOf('V03', 'Dolor torácico con signos vitales normales',
    { revision: { [ALL_ABSENT]: true, DOLOR_TORACICO: 'PRESENTE' } },
    { estado: 'PROPUESTA_CONCLUSIVA', nivel: 'P2', reglas: ['P2-DISC', 'P4-TEWS'] }),
  caseOf('V04', 'Fractura cerrada con signos vitales normales',
    { revision: { [ALL_ABSENT]: true, FRACTURA_CERRADA: 'PRESENTE' } },
    { estado: 'PROPUESTA_CONCLUSIVA', nivel: 'P3', reglas: ['P3-DISC', 'P4-TEWS'] }),
  caseOf('V05', 'Varios discriminadores: prevalece el más urgente',
    { revision: { [ALL_ABSENT]: true, DOLOR_ABDOMINAL: 'PRESENTE', DOLOR_INTENSO: 'PRESENTE' } },
    { estado: 'PROPUESTA_CONCLUSIVA', nivel: 'P2', reglas: ['P2-DISC', 'P3-DISC', 'P4-TEWS'] }),

  /* ---------- TEWS ---------- */
  caseOf('V06', 'TEWS 3: taquicardia y taquipnea moderadas',
    { vitals: { frecuencia_cardiaca: 105, frecuencia_respiratoria: 22 } },
    { estado: 'PROPUESTA_CONCLUSIVA', nivel: 'P3', tews: 3, reglas: ['P3-TEWS'] }),
  caseOf('V07', 'TEWS 5: taquicardia, taquipnea e hipotensión leve',
    { vitals: { frecuencia_cardiaca: 115, frecuencia_respiratoria: 22, presion_sistolica: 95 } },
    { estado: 'PROPUESTA_CONCLUSIVA', nivel: 'P2', tews: 5, reglas: ['P2-TEWS'] }),
  caseOf('V08', 'TEWS 7: inmóvil, confuso y con fiebre',
    { movilidad: 'CAMILLA_INMOVIL', estado_conciencia: 'CONFUSO', vitals: { temperatura: 39, frecuencia_respiratoria: 18 } },
    { estado: 'PROPUESTA_CONCLUSIVA', nivel: 'P1', tews: 7, reglas: ['P1-TEWS'],
      alertas: ['ALR-FIEBRE', 'ALR-CONCIENCIA'] }),
  caseOf('V09', 'Límite TEWS 2 → P4 (no P3)',
    { movilidad: 'CON_AYUDA', trauma: 'SI' },
    { estado: 'PROPUESTA_CONCLUSIVA', nivel: 'P4', tews: 2, reglas: ['P4-TEWS'] }),
  caseOf('V10', 'Discriminador P3 con TEWS 5: prevalece TEWS (P2)',
    { vitals: { frecuencia_cardiaca: 115, frecuencia_respiratoria: 22, presion_sistolica: 95 },
      revision: { [ALL_ABSENT]: true, VOMITOS_PERSISTENTES: 'PRESENTE' } },
    { estado: 'PROPUESTA_CONCLUSIVA', nivel: 'P2', tews: 5, reglas: ['P2-TEWS', 'P3-DISC'] }),

  /* ---------- Datos faltantes ---------- */
  caseOf('V11', 'Revisión de discriminadores sin hacer: no se propone',
    { revision: {} },
    { estado: 'SIN_PROPUESTA', nivel: null }),
  caseOf('V12', 'Presión sin registrar ni justificar: no se propone',
    { vitals: { presion_sistolica: null } },
    { estado: 'SIN_PROPUESTA', nivel: null }),
  caseOf('V13', 'Presión no obtenible justificada: P4 provisional (máx. P3)',
    { vitals: { presion_sistolica: null }, no_obtenibles: { presion_sistolica: 'EQUIPO_NO_DISPONIBLE' } },
    { estado: 'PROPUESTA_PROVISIONAL', nivel: 'P4', maximo: 'P3', justificacion: true }),
  caseOf('V14', 'Discriminador P1 presente aunque falten datos: P1 conclusiva',
    { vitals: { presion_sistolica: null, temperatura: null },
      revision: { PARO_CARDIACO: 'PRESENTE' } },
    { estado: 'PROPUESTA_CONCLUSIVA', nivel: 'P1', reglas: ['P1-DISC', 'P4-TEWS'] }),
  caseOf('V15', 'TEWS mínimo 7 con datos no obtenibles: P1 conclusiva',
    { movilidad: 'CAMILLA_INMOVIL', estado_conciencia: 'NO_RESPONDE', trauma: 'SI',
      vitals: { frecuencia_respiratoria: 32, frecuencia_cardiaca: null, presion_sistolica: null, temperatura: null },
      revision: { CONCIENCIA_REDUCIDA: 'PRESENTE' },
      no_obtenibles: { frecuencia_cardiaca: 'ATENCION_INMEDIATA_PRIORITARIA', presion_sistolica: 'ATENCION_INMEDIATA_PRIORITARIA', temperatura: 'ATENCION_INMEDIATA_PRIORITARIA' } },
    { estado: 'PROPUESTA_CONCLUSIVA', nivel: 'P1', reglas: ['P1-TEWS', 'P2-DISC'] }),
  caseOf('V16', 'Menor de edad sin discriminadores: no aplica TEWS de adultos',
    { edad: 12 },
    { estado: 'SIN_PROPUESTA', nivel: null }),
  caseOf('V17', 'Menor de edad con discriminador P1: P1 conclusiva',
    { edad: 12, revision: { [ALL_ABSENT]: true, VIA_AEREA_OBSTRUIDA: 'PRESENTE' } },
    { estado: 'PROPUESTA_CONCLUSIVA', nivel: 'P1', reglas: ['P1-DISC'] }),

  /* ---------- Alertas de consistencia ---------- */
  caseOf('V18', 'SpO₂ 86 % con dificultad respiratoria marcada ausente',
    { vitals: { saturacion_oxigeno: 86 } },
    { estado: 'PROPUESTA_CONCLUSIVA', nivel: 'P4', alertas: ['ALR-SPO2'], justificacion: true }),
  caseOf('V19', 'Glucometría 45 mg/dL sin marcar hipoglucemia',
    { vitals: { glucometria: 45 } },
    { estado: 'PROPUESTA_CONCLUSIVA', nivel: 'P4', alertas: ['ALR-GLUCOSA'], justificacion: true }),
  caseOf('V20', 'Glucometría 45 mg/dL con hipoglucemia presente: sin alerta',
    { vitals: { glucometria: 45 }, revision: { [ALL_ABSENT]: true, HIPOGLUCEMIA_GRAVE: 'PRESENTE' } },
    { estado: 'PROPUESTA_CONCLUSIVA', nivel: 'P1', alertas: [], reglas: ['P1-DISC', 'P4-TEWS'] }),
];

module.exports = {
  ALL_ABSENT,
  VALIDATION_CASES,
};
