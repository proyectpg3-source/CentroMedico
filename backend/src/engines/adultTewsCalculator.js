
/*
 * CENTRO MÉDICO LA AURORA
 *
 * CALCULADORA TEWS PARA ADULTOS
 *
 * Referencia:
 * Emergency Medicine Society of South Africa
 * Adult SATS Chart (2015)
 *
 * Versión académica experimental.
 *
 * IMPORTANTE:
 * - Calcula únicamente el puntaje TEWS.
 * - No ejecuta discriminadores clínicos.
 * - No determina la prioridad final.
 * - No escribe datos en PostgreSQL.
 * - No sustituye la evaluación médica.
 *
 * Se restringe provisionalmente a pacientes
 * de 18 años o más. El protocolo SATS utiliza
 * criterios de edad y talla que deberán
 * revisarse antes de ampliar su aplicación.
 */

const SOURCE = Object.freeze({
  name: 'EMSSA - Adult SATS Chart',

  url:
    'https://emssa.org.za/wp-content/uploads/2017/10/Adult-SATS-2015.pdf',

  status: 'IMPLEMENTACION_ACADEMICA',
});

const COMPONENTS = Object.freeze([
  'movilidad',
  'frecuencia_respiratoria',
  'frecuencia_cardiaca',
  'presion_sistolica',
  'temperatura',
  'estado_conciencia',
  'trauma',
]);

/*
 * Convierte valores numéricos recibidos
 * desde PostgreSQL o formularios.
 *
 * Rechaza:
 * - valores nulos;
 * - cadenas vacías;
 * - booleanos;
 * - valores no numéricos;
 * - valores infinitos.
 */

function parseNumber(value) {
  if (
    value === null ||
    value === undefined ||
    typeof value === 'boolean'
  ) {
    return null;
  }

  if (
    typeof value === 'string' &&
    value.trim() === ''
  ) {
    return null;
  }

  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : null;
}

/*
 * Obtiene el campo desde el caso actual
 * o desde el objeto signos_vitales.
 */

function getValue(currentCase, field) {
  if (
    !currentCase ||
    typeof currentCase !== 'object'
  ) {
    return null;
  }

  const vitalSigns =
    currentCase.signos_vitales || {};

  const value =
    vitalSigns[field] ??
    currentCase[field];

  return value ?? null;
}

/*
 * Normaliza las opciones de los
 * campos clínicos categóricos.
 */

function normalizedChoice(value) {
  return typeof value === 'string'
    ? value.trim().toUpperCase()
    : '';
}

/*
 * MOVILIDAD
 *
 * Camina: 0
 * Con ayuda: 1
 * Camilla / inmóvil: 2
 */

function scoreMobility(value) {
  const choice = normalizedChoice(value);

  const scores = {
    CAMINA: 0,
    CON_AYUDA: 1,
    CAMILLA_INMOVIL: 2,
  };

  return Object.prototype.hasOwnProperty.call(
    scores,
    choice
  )
    ? scores[choice]
    : null;
}

/*
 * FRECUENCIA RESPIRATORIA
 *
 * < 9:    2 puntos
 * 9-14:   0 puntos
 * 15-20:  1 punto
 * 21-29:  2 puntos
 * >= 30:  3 puntos
 */

function scoreRespiratoryRate(value) {
  const n = parseNumber(value);

  if (
    n === null ||
    !Number.isInteger(n) ||
    n < 0 ||
    n > 120
  ) {
    return null;
  }

  if (n < 9) return 2;

  if (n <= 14) return 0;

  if (n <= 20) return 1;

  if (n <= 29) return 2;

  return 3;
}

/*
 * FRECUENCIA CARDÍACA
 *
 * <= 40:    2 puntos
 * 41-50:    1 punto
 * 51-100:   0 puntos
 * 101-110:  1 punto
 * 111-129:  2 puntos
 * >= 130:   3 puntos
 */

function scoreHeartRate(value) {
  const n = parseNumber(value);

  if (
    n === null ||
    !Number.isInteger(n) ||
    n < 0 ||
    n > 300
  ) {
    return null;
  }

  if (n <= 40) return 2;

  if (n <= 50) return 1;

  if (n <= 100) return 0;

  if (n <= 110) return 1;

  if (n <= 129) return 2;

  return 3;
}

/*
 * PRESIÓN ARTERIAL SISTÓLICA
 *
 * <= 70:     3 puntos
 * 71-80:     2 puntos
 * 81-100:    1 punto
 * 101-199:   0 puntos
 * >= 200:    2 puntos
 */

function scoreSystolicPressure(value) {
  const n = parseNumber(value);

  if (
    n === null ||
    !Number.isInteger(n) ||
    n < 0 ||
    n > 350
  ) {
    return null;
  }

  if (n <= 70) return 3;

  if (n <= 80) return 2;

  if (n <= 100) return 1;

  if (n <= 199) return 0;

  return 2;
}

/*
 * TEMPERATURA
 *
 * < 35 °C:       2 puntos
 * 35 a < 38.5:   0 puntos
 * >= 38.5 °C:    2 puntos
 *
 * Esta función recibe temperatura numérica.
 * La evaluación cualitativa de piel fría
 * o caliente requiere valoración aparte.
 */

function scoreTemperature(value) {
  const n = parseNumber(value);

  if (
    n === null ||
    n < 20 ||
    n > 45
  ) {
    return null;
  }

  if (n < 35) return 2;

  if (n < 38.5) return 0;

  return 2;
}

/*
 * ESTADO DE CONCIENCIA
 *
 * Alerta:       0 puntos
 * Confuso:      2 puntos
 * Voz:          1 punto
 * Dolor:        2 puntos
 * No responde:  3 puntos
 */

function scoreConsciousness(value) {
  const choice = normalizedChoice(value);

  const scores = {
    ALERTA: 0,
    CONFUSO: 2,
    VOZ: 1,
    DOLOR: 2,
    NO_RESPONDE: 3,
  };

  return Object.prototype.hasOwnProperty.call(
    scores,
    choice
  )
    ? scores[choice]
    : null;
}

/*
 * TRAUMA
 *
 * No: 0 puntos
 * Sí: 1 punto
 */

function scoreTrauma(value) {
  const choice = normalizedChoice(value);

  if (choice === 'SI') return 1;

  if (choice === 'NO') return 0;

  return null;
}

/*
 * Catálogo de evaluadores.
 */

const SCORERS = Object.freeze({
  movilidad:
    scoreMobility,

  frecuencia_respiratoria:
    scoreRespiratoryRate,

  frecuencia_cardiaca:
    scoreHeartRate,

  presion_sistolica:
    scoreSystolicPressure,

  temperatura:
    scoreTemperature,

  estado_conciencia:
    scoreConsciousness,

  trauma:
    scoreTrauma,
});

/*
 * FUNCIÓN PRINCIPAL
 *
 * Calcula el TEWS únicamente cuando:
 *
 * 1. El paciente está dentro del rango
 *    de edad admitido.
 *
 * 2. Están presentes los siete
 *    componentes requeridos.
 *
 * 3. Los valores son válidos según
 *    los controles técnicos actuales.
 *
 * Nunca asigna directamente P1-P4.
 */

function calculateAdultTews(currentCase = {}) {
  const age = parseNumber(
    getValue(currentCase, 'edad')
  );

  /*
   * Restricción conservadora del proyecto:
   * únicamente pacientes de 18 años
   * o más en esta implementación.
   */

  if (
    age === null ||
    !Number.isInteger(age) ||
    age < 18 ||
    age > 120
  ) {
    return {
      estado: 'NO_APLICABLE',

      calculo_completo: false,

      puntaje_tews: null,

      prioridad_sugerida: null,

      requiere_revision_humana: true,

      motivo:
        'Esta implementación académica está restringida a adultos de 18 años o más con una edad válida.',

      fuente: SOURCE,
    };
  }

  const details = {};

  const missing = [];

  /*
   * Evaluación individual de
   * los siete componentes.
   */

  for (const field of COMPONENTS) {
    const value = getValue(
      currentCase,
      field
    );

    const score =
      SCORERS[field](value);

    details[field] = {
      valor: value,

      puntaje: score,

      evaluable:
        score !== null,
    };

    if (score === null) {
      missing.push(field);
    }
  }

  /*
   * Si falta algún componente,
   * no se calcula un puntaje total.
   */

  const complete =
    missing.length === 0;

  const total = complete
    ? COMPONENTS.reduce(
        (sum, field) =>
          sum + details[field].puntaje,
        0
      )
    : null;

  /*
   * Resultado del cálculo.
   *
   * La categoría definitiva SATS
   * requiere revisar discriminadores
   * y la evaluación clínica.
   */

  return {
    estado: complete
      ? 'PUNTAJE_COMPLETO'
      : 'DATOS_INCOMPLETOS',

    calculo_completo:
      complete,

    puntaje_tews:
      total,

    componentes:
      details,

    campos_faltantes_o_invalidos:
      missing,

    total_componentes:
      COMPONENTS.length,

    componentes_evaluados:
      COMPONENTS.length -
      missing.length,

    /*
     * El TEWS por sí solo no
     * determina la prioridad final.
     */

    prioridad_sugerida:
      null,

    requiere_revision_humana:
      true,

    motivo: complete
      ? 'Puntaje TEWS calculado. Se requiere revisar los discriminadores clínicos SATS y validar la implementación antes de establecer una prioridad.'
      : 'No es posible completar el cálculo TEWS porque existen componentes faltantes o valores inválidos.',

    fuente: SOURCE,
  };
}

/*
 * EXPORTACIONES
 *
 * Se conserva la exportación
 * utilizada por satsAcademicClassifier.js.
 */

module.exports = {
  calculateAdultTews,
};
