/*
 * CENTRO MÉDICO LA AURORA
 *
 * REGLAS P1-P4 — CONJUNTO VERSIONADO
 *
 * Cada regla es explícita, tiene un código
 * estable y una referencia. El motor solo
 * genera PROPUESTAS: toda prioridad debe ser
 * confirmada por personal autorizado antes
 * de ingresar a la cola.
 *
 * Base: Adult SATS Chart (EMSSA, 2015).
 *   - Discriminadores: rojo → P1, naranja → P2,
 *     amarillo → P3.
 *   - TEWS: ≥7 → P1, 5-6 → P2, 3-4 → P3, 0-2 → P4.
 *   - Se aplica la categoría MÁS urgente entre
 *     discriminadores y TEWS.
 *
 * Cualquier cambio de umbral o de regla exige
 * una nueva versión y una nueva aprobación
 * médica (tabla aprobacion_reglas_prioridad).
 */

const RULESET_VERSION = 'REGLAS-P1P4-1';

const LEVEL_DETAILS = Object.freeze({
  P1: { nombre: 'Emergencia', color: 'ROJO', objetivo_minutos: 0, objetivo: 'Inmediata' },
  P2: { nombre: 'Muy urgente', color: 'NARANJA', objetivo_minutos: 10, objetivo: 'Menos de 10 minutos' },
  P3: { nombre: 'Urgente', color: 'AMARILLO', objetivo_minutos: 60, objetivo: 'Menos de 60 minutos' },
  P4: { nombre: 'Menor urgencia', color: 'VERDE', objetivo_minutos: 240, objetivo: 'Menos de 4 horas' },
});

const SATS_REFERENCE =
  'EMSSA — Adult SATS Chart (2015)';

/*
 * Reglas de asignación. Se evalúan todas;
 * la propuesta es el nivel más urgente entre
 * las reglas cumplidas.
 */
const PRIORITY_RULES = Object.freeze([
  {
    codigo: 'P1-DISC',
    nivel: 'P1',
    tipo: 'DISCRIMINADOR',
    descripcion: 'Al menos un discriminador del grupo P1 (rojo) está PRESENTE.',
    referencia: SATS_REFERENCE,
  },
  {
    codigo: 'P1-TEWS',
    nivel: 'P1',
    tipo: 'TEWS',
    tews_min: 7,
    tews_max: null,
    descripcion: 'TEWS confirmado de 7 o más.',
    referencia: SATS_REFERENCE,
  },
  {
    codigo: 'P2-DISC',
    nivel: 'P2',
    tipo: 'DISCRIMINADOR',
    descripcion: 'Al menos un discriminador del grupo P2 (naranja) está PRESENTE.',
    referencia: SATS_REFERENCE,
  },
  {
    codigo: 'P2-TEWS',
    nivel: 'P2',
    tipo: 'TEWS',
    tews_min: 5,
    tews_max: 6,
    descripcion: 'TEWS confirmado de 5 o 6.',
    referencia: SATS_REFERENCE,
  },
  {
    codigo: 'P3-DISC',
    nivel: 'P3',
    tipo: 'DISCRIMINADOR',
    descripcion: 'Al menos un discriminador del grupo P3 (amarillo) está PRESENTE.',
    referencia: SATS_REFERENCE,
  },
  {
    codigo: 'P3-TEWS',
    nivel: 'P3',
    tipo: 'TEWS',
    tews_min: 3,
    tews_max: 4,
    descripcion: 'TEWS confirmado de 3 o 4.',
    referencia: SATS_REFERENCE,
  },
  {
    codigo: 'P4-TEWS',
    nivel: 'P4',
    tipo: 'TEWS',
    tews_min: 0,
    tews_max: 2,
    descripcion: 'TEWS confirmado de 0 a 2.',
    referencia: SATS_REFERENCE,
  },
]);

/*
 * Condiciones para que el motor pueda proponer.
 * Implementan la política de datos faltantes.
 */
const PROPOSAL_POLICY = Object.freeze([
  {
    codigo: 'POL-CONCLUSIVA',
    descripcion:
      'Si la categoría es conclusiva (ningún dato pendiente podría elevarla), se propone aunque el registro esté incompleto. Ejemplo: discriminador P1 presente.',
  },
  {
    codigo: 'POL-REGISTRO-COMPLETO',
    descripcion:
      'Si la categoría no es conclusiva, solo se propone cuando el registro SATS está completo: 24 criterios respondidos y ningún signo vital faltante sin justificar.',
  },
  {
    codigo: 'POL-PROVISIONAL',
    descripcion:
      'Con signos vitales no obtenibles justificados, la propuesta es PROVISIONAL. Confirmar un nivel menos urgente que la categoría máxima posible exige una justificación escrita.',
  },
  {
    codigo: 'POL-SIN-PROPUESTA',
    descripcion:
      'En cualquier otro caso no se propone nivel: se indican las acciones pendientes y se puede usar la clasificación manual justificada.',
  },
]);

/*
 * Alertas de consistencia y complementarias.
 * NO cambian el nivel propuesto. Las de tipo
 * INCONSISTENCIA obligan a justificar la
 * confirmación.
 *
 * Los umbrales son parámetros locales
 * pendientes de validación médica.
 */
const ALERT_RULES = Object.freeze([
  {
    codigo: 'ALR-SPO2',
    tipo: 'INCONSISTENCIA',
    campo: 'saturacion_oxigeno',
    umbral: 90,
    discriminador: 'DIFICULTAD_RESPIRATORIA_AGUDA',
    descripcion:
      'Saturación de oxígeno menor de 90 % con «Dificultad respiratoria aguda» marcada como AUSENTE.',
    referencia: 'IGSS GPC-BE No. 65 (2024); umbral local pendiente de validación.',
  },
  {
    codigo: 'ALR-GLUCOSA',
    tipo: 'INCONSISTENCIA',
    campo: 'glucometria',
    umbral: 54,
    discriminador: 'HIPOGLUCEMIA_GRAVE',
    descripcion:
      'Glucometría menor de 54 mg/dL (3 mmol/L) con «Hipoglucemia» no marcada como PRESENTE.',
    referencia: `${SATS_REFERENCE}; umbral pendiente de validación.`,
  },
  {
    codigo: 'ALR-CONCIENCIA',
    tipo: 'INCONSISTENCIA',
    campo: 'estado_conciencia',
    discriminador: 'CONCIENCIA_REDUCIDA',
    descripcion:
      'Estado de conciencia distinto de ALERTA con «Reducción del nivel de conciencia» marcada como AUSENTE.',
    referencia: SATS_REFERENCE,
  },
  {
    codigo: 'ALR-FIEBRE',
    tipo: 'INFORMATIVA',
    campo: 'temperatura',
    umbral: 38,
    descripcion:
      'Temperatura de 38 °C o más. Considerar en la valoración; no cambia el nivel por sí sola.',
    referencia: 'Referencia del médico del Centro Médico La Aurora.',
  },
]);

function getRuleset() {
  return {
    version_reglas: RULESET_VERSION,
    base: SATS_REFERENCE,
    niveles: LEVEL_DETAILS,
    reglas: PRIORITY_RULES,
    politica_propuesta: PROPOSAL_POLICY,
    alertas: ALERT_RULES,
    requiere_confirmacion_humana: true,
  };
}

module.exports = {
  RULESET_VERSION,
  LEVEL_DETAILS,
  PRIORITY_RULES,
  PROPOSAL_POLICY,
  ALERT_RULES,
  getRuleset,
};
