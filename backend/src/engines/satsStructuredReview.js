/*
 * CENTRO MÉDICO LA AURORA
 *
 * REGISTRO SATS ESTRUCTURADO
 *
 * Complementa al clasificador académico con:
 *
 * 1. Revisión estructurada de discriminadores.
 *    Cada criterio del catálogo queda en uno de
 *    tres estados explícitos:
 *      PRESENTE · AUSENTE · NO_EVALUADO
 *    Así se distingue "revisado y ausente" de
 *    "no revisado", algo que una lista de
 *    criterios presentes no puede expresar.
 *
 * 2. Manejo de datos faltantes en TEWS.
 *    Nunca se imputan valores normales. Cuando un
 *    signo vital no puede obtenerse, Enfermería lo
 *    declara con un motivo codificado y el motor
 *    calcula un INTERVALO de puntaje:
 *      mínimo = componentes medidos + 0
 *      máximo = componentes medidos + puntaje
 *               máximo posible del componente
 *    La categoría solo es CONCLUSIVA cuando ningún
 *    dato faltante o criterio sin evaluar podría
 *    cambiarla.
 *
 * RESTRICCIONES (iguales al resto del módulo):
 * - No asigna prioridad sugerida ni final.
 * - No modifica PostgreSQL ni la cola.
 * - Requiere validación humana.
 * - El catálogo sigue siendo parcial y académico.
 */

const {
  calculateAdultTews,
} = require('./adultTewsCalculator');

const {
  DISCRIMINATORS,
  levelFromTews,
} = require('./satsAcademicClassifier');

const CATALOG_VERSION = 'SATS-CAT-ACAD-3';

const REVIEW_STATES = Object.freeze([
  'PRESENTE',
  'AUSENTE',
  'NO_EVALUADO',
]);

const LEVEL_ORDER = Object.freeze({
  P1: 1,
  P2: 2,
  P3: 3,
  P4: 4,
});

/*
 * Puntaje máximo que puede aportar cada
 * componente TEWS según la tabla de
 * adultTewsCalculator.js (EMSSA 2015).
 */
const TEWS_MAX_POINTS = Object.freeze({
  movilidad: 2,
  frecuencia_respiratoria: 3,
  frecuencia_cardiaca: 3,
  presion_sistolica: 3,
  temperatura: 2,
  estado_conciencia: 3,
  trauma: 1,
});

/*
 * Solo los signos vitales medidos con equipo
 * pueden declararse "no obtenibles".
 * Movilidad, conciencia y trauma son
 * observaciones que Enfermería siempre
 * puede registrar.
 */
const UNAVAILABLE_FIELDS = Object.freeze([
  'frecuencia_respiratoria',
  'frecuencia_cardiaca',
  'presion_sistolica',
  'temperatura',
]);

const UNAVAILABLE_REASONS = Object.freeze({
  PACIENTE_NO_COLABORA:
    'El paciente no colabora con la medición',
  EQUIPO_NO_DISPONIBLE:
    'Equipo no disponible o en falla',
  CONDICION_IMPIDE_MEDICION:
    'La condición del paciente impide medirlo',
  ATENCION_INMEDIATA_PRIORITARIA:
    'Se priorizó la atención inmediata',
});

function createError(message) {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
}

function isPlainObject(value) {
  return (
    value !== null &&
    typeof value === 'object' &&
    !Array.isArray(value)
  );
}

function moreUrgent(a, b) {
  if (!a) return b ?? null;
  if (!b) return a;
  return LEVEL_ORDER[b] < LEVEL_ORDER[a] ? b : a;
}

/*
 * Catálogo para la interfaz, generado desde
 * la única fuente de verdad del backend.
 */
function getCatalog() {
  return {
    version_catalogo: CATALOG_VERSION,
    catalogo_completo_validado: false,
    estados_revision: [...REVIEW_STATES],
    discriminadores: Object.values(DISCRIMINATORS).map(
      (item) => ({
        code: item.code,
        level: item.level,
        description: item.description,
      })
    ),
    campos_no_obtenibles_permitidos: [
      ...UNAVAILABLE_FIELDS,
    ],
    motivos_no_obtenible: Object.entries(
      UNAVAILABLE_REASONS
    ).map(([code, description]) => ({
      code,
      description,
    })),
  };
}

/*
 * Valida y completa la revisión.
 *
 * Entrada: { CODIGO: 'PRESENTE' | 'AUSENTE' | 'NO_EVALUADO' }
 * Los códigos omitidos quedan como NO_EVALUADO.
 * Devuelve siempre el catálogo completo.
 */
function normalizeDiscriminatorReview(input) {
  if (!isPlainObject(input)) {
    throw createError(
      'La revisión de discriminadores debe enviarse como un objeto código → estado.'
    );
  }

  const review = {};

  for (const code of Object.keys(DISCRIMINATORS)) {
    review[code] = 'NO_EVALUADO';
  }

  for (const [code, state] of Object.entries(input)) {
    if (
      !Object.prototype.hasOwnProperty.call(
        DISCRIMINATORS,
        code
      )
    ) {
      throw createError(
        'La revisión contiene un discriminador no reconocido.'
      );
    }

    if (!REVIEW_STATES.includes(state)) {
      throw createError(
        'Cada discriminador debe marcarse como PRESENTE, AUSENTE o NO_EVALUADO.'
      );
    }

    review[code] = state;
  }

  return review;
}

/*
 * Convierte la lista académica anterior
 * (solo códigos presentes) a revisión.
 *
 * Lo no seleccionado queda NO_EVALUADO:
 * la lista antigua nunca afirmó ausencia.
 */
function reviewFromLegacyList(codes) {
  if (!Array.isArray(codes)) {
    return normalizeDiscriminatorReview({});
  }

  const input = {};

  for (const code of codes) {
    input[code] = 'PRESENTE';
  }

  return normalizeDiscriminatorReview(input);
}

function summarizeReview(review) {
  const safe = isPlainObject(review)
    ? review
    : {};

  const presentes = [];
  const ausentes = [];
  const noEvaluados = [];

  for (const code of Object.keys(DISCRIMINATORS)) {
    const state = REVIEW_STATES.includes(safe[code])
      ? safe[code]
      : 'NO_EVALUADO';

    if (state === 'PRESENTE') presentes.push(code);
    else if (state === 'AUSENTE') ausentes.push(code);
    else noEvaluados.push(code);
  }

  const total = Object.keys(DISCRIMINATORS).length;

  return {
    total_catalogo: total,
    presentes,
    ausentes,
    no_evaluados: noEvaluados,
    total_revisados:
      presentes.length + ausentes.length,
    revision_completa:
      noEvaluados.length === 0,
  };
}

/*
 * Entrada: { campo: MOTIVO }
 */
function normalizeUnavailableData(input) {
  if (input === null || input === undefined) {
    return {};
  }

  if (!isPlainObject(input)) {
    throw createError(
      'Los datos no obtenibles deben enviarse como un objeto campo → motivo.'
    );
  }

  const result = {};

  for (const [field, reason] of Object.entries(input)) {
    if (!UNAVAILABLE_FIELDS.includes(field)) {
      throw createError(
        'Solo los signos vitales del TEWS pueden declararse no obtenibles.'
      );
    }

    if (
      typeof reason !== 'string' ||
      !Object.prototype.hasOwnProperty.call(
        UNAVAILABLE_REASONS,
        reason
      )
    ) {
      throw createError(
        'El motivo del dato no obtenible no es válido.'
      );
    }

    result[field] = reason;
  }

  return result;
}

/*
 * TEWS POR INTERVALO
 *
 * Usa la calculadora existente para obtener
 * el puntaje de cada componente medido y
 * acota los componentes que faltan.
 */
function calculateTewsInterval(
  currentCase,
  unavailableData = {}
) {
  const tews = calculateAdultTews(currentCase);

  if (tews.estado === 'NO_APLICABLE') {
    return {
      estado: 'NO_APLICABLE',
      aplicable: false,
      puntaje: null,
      puntaje_minimo: null,
      puntaje_maximo: null,
      componentes: [],
      campos_no_obtenibles: [],
      campos_faltantes: [],
      motivo: tews.motivo,
    };
  }

  const unavailable = isPlainObject(unavailableData)
    ? unavailableData
    : {};

  const componentes = [];
  const noObtenibles = [];
  const faltantes = [];
  const marcasIgnoradas = [];

  let minimum = 0;
  let maximum = 0;

  for (const [field, detail] of Object.entries(
    tews.componentes
  )) {
    const maxPoints = TEWS_MAX_POINTS[field];

    if (detail.evaluable) {
      minimum += detail.puntaje;
      maximum += detail.puntaje;

      /*
       * Un valor medido siempre prevalece
       * sobre una declaración de no obtenible.
       */
      if (unavailable[field]) {
        marcasIgnoradas.push(field);
      }

      componentes.push({
        campo: field,
        estado: 'MEDIDO',
        puntaje: detail.puntaje,
        puntaje_maximo_posible: maxPoints,
      });

      continue;
    }

    maximum += maxPoints;

    const hasValue =
      detail.valor !== null &&
      detail.valor !== undefined &&
      detail.valor !== '';

    if (!hasValue && unavailable[field]) {
      noObtenibles.push(field);

      componentes.push({
        campo: field,
        estado: 'NO_OBTENIBLE',
        motivo: unavailable[field],
        puntaje: null,
        puntaje_maximo_posible: maxPoints,
      });

      continue;
    }

    faltantes.push(field);

    componentes.push({
      campo: field,
      estado: hasValue ? 'INVALIDO' : 'FALTANTE',
      puntaje: null,
      puntaje_maximo_posible: maxPoints,
    });
  }

  let estado = 'COMPLETO';

  if (faltantes.length > 0) {
    estado = 'INCOMPLETO_SIN_JUSTIFICAR';
  } else if (noObtenibles.length > 0) {
    estado = 'PARCIAL_JUSTIFICADO';
  }

  return {
    estado,
    aplicable: true,
    puntaje:
      estado === 'COMPLETO' ? minimum : null,
    puntaje_minimo: minimum,
    puntaje_maximo: maximum,
    componentes,
    campos_no_obtenibles: noObtenibles,
    campos_faltantes: faltantes,
    marcas_no_obtenible_ignoradas: marcasIgnoradas,
  };
}

function mostUrgentLevel(codes) {
  let level = null;

  for (const code of codes) {
    level = moreUrgent(
      level,
      DISCRIMINATORS[code]?.level ?? null
    );
  }

  return level;
}

/*
 * CLASIFICACIÓN ESTRUCTURADA
 *
 * categoria_confirmada:
 *   la categoría más urgente que YA está
 *   demostrada con los datos registrados.
 *
 * categoria_maxima_posible:
 *   la categoría más urgente que todavía
 *   podría resultar si se completaran los
 *   datos y criterios pendientes.
 *
 * conclusiva:
 *   ambas coinciden; completar el registro
 *   no podría cambiar el resultado.
 */
function classifySatsStructured({
  currentCase,
  review,
  unavailableData = {},
} = {}) {
  const base = {
    tipo_resultado: 'CLASIFICACION_SATS_ESTRUCTURADA',
    version_catalogo: CATALOG_VERSION,
    catalogo_completo_validado: false,
    uso_clinico_autorizado: false,
    prioridad_sugerida: null,
    prioridad_final: null,
    requiere_validacion_humana: true,
    modifica_prioridad_real: false,
  };

  if (!isPlainObject(currentCase)) {
    return {
      ...base,
      estado: 'SIN_CASO_VALIDO',
      categoria_confirmada: null,
      categoria_maxima_posible: null,
      conclusiva: false,
      registro_completo: false,
      mensaje: 'No se proporcionó un caso válido.',
    };
  }

  const summary = summarizeReview(review);

  const tews = calculateTewsInterval(
    currentCase,
    unavailableData
  );

  const presentLevel = mostUrgentLevel(
    summary.presentes
  );

  const pendingLevel = mostUrgentLevel(
    summary.no_evaluados
  );

  let confirmed = presentLevel;
  let possible = moreUrgent(
    presentLevel,
    pendingLevel
  );

  if (tews.aplicable) {
    confirmed = moreUrgent(
      confirmed,
      levelFromTews(tews.puntaje_minimo)
    );

    possible = moreUrgent(
      possible,
      levelFromTews(tews.puntaje_maximo)
    );
  } else {
    /*
     * Sin TEWS aplicable no se puede descartar
     * ninguna categoría fisiológica.
     */
    possible = 'P1';
  }

  possible = moreUrgent(possible, confirmed);

  /*
   * Criterios pendientes que, de estar
   * presentes, elevarían la categoría.
   */
  const relevantPending = summary.no_evaluados.filter(
    (code) =>
      !confirmed ||
      LEVEL_ORDER[DISCRIMINATORS[code].level] <
        LEVEL_ORDER[confirmed]
  );

  const tewsCouldRaise =
    tews.aplicable &&
    confirmed !== null &&
    LEVEL_ORDER[levelFromTews(tews.puntaje_maximo)] <
      LEVEL_ORDER[confirmed];

  const reasons = [];

  if (!tews.aplicable) {
    reasons.push('TEWS_NO_APLICABLE');
  }

  if (tewsCouldRaise && tews.campos_faltantes.length > 0) {
    reasons.push('SIGNOS_VITALES_FALTANTES');
  }

  if (tewsCouldRaise && tews.campos_no_obtenibles.length > 0) {
    reasons.push('SIGNOS_VITALES_NO_OBTENIBLES');
  }

  if (relevantPending.length > 0) {
    reasons.push('DISCRIMINADORES_NO_EVALUADOS');
  }

  const conclusive =
    confirmed !== null && confirmed === possible;

  const registroCompleto =
    tews.aplicable &&
    tews.campos_faltantes.length === 0 &&
    summary.revision_completa;

  let estado;
  let mensaje;

  if (confirmed === null) {
    estado = 'SIN_DATOS_SUFICIENTES';
    mensaje =
      'No hay datos suficientes para establecer una categoría. Complete los signos vitales o la revisión de discriminadores.';
  } else if (conclusive) {
    estado = 'CATEGORIA_CONCLUSIVA';
    mensaje = registroCompleto
      ? 'Registro SATS completo. La categoría no depende de datos pendientes.'
      : 'La categoría no cambiaría aunque se completen los datos pendientes. El registro debe completarse igualmente.';
  } else {
    estado = 'CATEGORIA_PROVISIONAL';
    mensaje =
      'La categoría confirmada es provisional: datos o criterios pendientes podrían elevarla hasta la categoría máxima posible.';
  }

  return {
    ...base,
    estado,
    categoria_confirmada: confirmed,
    categoria_maxima_posible: possible,
    conclusiva: conclusive,
    registro_completo: registroCompleto,
    motivos_provisional: conclusive ? [] : reasons,
    tews,
    discriminadores: {
      ...summary,
      presentes_detalle: summary.presentes.map(
        (code) => DISCRIMINATORS[code]
      ),
      categoria_por_discriminadores: presentLevel,
      no_evaluados_relevantes: relevantPending,
    },
    mensaje,
  };
}

module.exports = {
  CATALOG_VERSION,
  REVIEW_STATES,
  TEWS_MAX_POINTS,
  UNAVAILABLE_FIELDS,
  UNAVAILABLE_REASONS,
  getCatalog,
  normalizeDiscriminatorReview,
  reviewFromLegacyList,
  summarizeReview,
  normalizeUnavailableData,
  calculateTewsInterval,
  classifySatsStructured,
};
