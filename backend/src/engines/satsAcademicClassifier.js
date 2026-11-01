
/*
 * CENTRO MÉDICO LA AURORA
 *
 * CLASIFICADOR SATS ACADÉMICO - VERSIÓN 3
 *
 * Combina:
 * - TEWS para adultos.
 * - Categoría fisiológica P1-P4.
 * - Discriminadores clínicos seleccionados.
 * - Resultado experimental justificable.
 *
 * SOLO PARA PRUEBAS CON CASOS FICTICIOS.
 *
 * El catálogo NO representa una
 * implementación clínica completa de SATS.
 *
 * No modifica PostgreSQL.
 * No altera la cola de atención.
 * No asigna prioridad clínica definitiva.
 *
 * Referencia:
 * EMSSA - Adult SATS Chart (2015).
 */

const {
  calculateAdultTews,
} = require('./adultTewsCalculator');

// Versión del protocolo académico (antes en config/clinicalPriorityMatrix.js).
const CLINICAL_PRIORITY_MATRIX = Object.freeze({
  version: 'SATS-ACADEMICO-3',
});

const LEVELS = Object.freeze({
  P1: Object.freeze({
    order: 1,
    color: 'ROJO',
    name: 'Emergencia',
  }),
  P2: Object.freeze({
    order: 2,
    color: 'NARANJA',
    name: 'Muy urgente',
  }),
  P3: Object.freeze({
    order: 3,
    color: 'AMARILLO',
    name: 'Urgente',
  }),
  P4: Object.freeze({
    order: 4,
    color: 'VERDE',
    name: 'Menor urgencia',
  }),
});

/*
 * Catálogo académico ampliado.
 *
 * Los códigos son internos del proyecto.
 * Se basan en categorías del gráfico
 * SATS para adultos.
 *
 * No se deben interpretar textos libres
 * para activar estos códigos.
 *
 * Deben ser seleccionados explícitamente
 * en escenarios de prueba.
 */

const DISCRIMINATORS = Object.freeze({
  CONVULSION_ACTIVA: {
    code: 'CONVULSION_ACTIVA',
    level: 'P1',
    description: 'Convulsión activa',
  },

  PARO_CARDIACO: {
    code: 'PARO_CARDIACO',
    level: 'P1',
    description: 'Paro cardíaco',
  },

  VIA_AEREA_OBSTRUIDA: {
    code: 'VIA_AEREA_OBSTRUIDA',
    level: 'P1',
    description: 'Obstrucción de vía aérea',
  },

  QUEMADURA_FACIAL_INHALACION: {
    code: 'QUEMADURA_FACIAL_INHALACION',
    level: 'P1',
    description:
      'Quemadura facial o lesión por inhalación',
  },

  HIPOGLUCEMIA_GRAVE: {
    code: 'HIPOGLUCEMIA_GRAVE',
    level: 'P1',
    description:
      'Hipoglucemia según el criterio SATS',
  },

  DOLOR_INTENSO: {
    code: 'DOLOR_INTENSO',
    level: 'P2',
    description: 'Dolor intenso',
  },

  DOLOR_TORACICO: {
    code: 'DOLOR_TORACICO',
    level: 'P2',
    description: 'Dolor torácico',
  },

  DIFICULTAD_RESPIRATORIA_AGUDA: {
    code: 'DIFICULTAD_RESPIRATORIA_AGUDA',
    level: 'P2',
    description:
      'Dificultad respiratoria aguda',
  },

  SANGRADO_NO_CONTROLADO: {
    code: 'SANGRADO_NO_CONTROLADO',
    level: 'P2',
    description:
      'Hemorragia no controlada',
  },

  POSTCONVULSION: {
    code: 'POSTCONVULSION',
    level: 'P2',
    description: 'Estado posconvulsivo',
  },

  CONCIENCIA_REDUCIDA: {
    code: 'CONCIENCIA_REDUCIDA',
    level: 'P2',
    description:
      'Reducción del nivel de conciencia',
  },

  SINTOMAS_NEUROLOGICOS_AGUDOS: {
    code: 'SINTOMAS_NEUROLOGICOS_AGUDOS',
    level: 'P2',
    description:
      'Déficit neurológico focal agudo',
  },

  TOS_CON_SANGRE: {
    code: 'TOS_CON_SANGRE',
    level: 'P2',
    description: 'Hemoptisis',
  },

  INTOXICACION_SOBREDOSIS: {
    code: 'INTOXICACION_SOBREDOSIS',
    level: 'P2',
    description:
      'Intoxicación o sobredosis',
  },

  FRACTURA_ABIERTA: {
    code: 'FRACTURA_ABIERTA',
    level: 'P2',
    description: 'Fractura abierta',
  },

  QUEMADURA_ELECTRICA: {
    code: 'QUEMADURA_ELECTRICA',
    level: 'P2',
    description: 'Quemadura eléctrica',
  },

  VOMITO_CON_SANGRE_FRESCA: {
    code: 'VOMITO_CON_SANGRE_FRESCA',
    level: 'P2',
    description:
      'Vómito con sangre fresca',
  },

  EMBARAZO_DOLOR_ABDOMINAL: {
    code: 'EMBARAZO_DOLOR_ABDOMINAL',
    level: 'P2',
    description:
      'Embarazo con dolor abdominal',
  },

  EMBARAZO_TRAUMA_ABDOMINAL: {
    code: 'EMBARAZO_TRAUMA_ABDOMINAL',
    level: 'P2',
    description:
      'Embarazo con trauma abdominal',
  },

  DOLOR_ABDOMINAL: {
    code: 'DOLOR_ABDOMINAL',
    level: 'P3',
    description: 'Dolor abdominal',
  },

  DOLOR_MODERADO: {
    code: 'DOLOR_MODERADO',
    level: 'P3',
    description: 'Dolor moderado',
  },

  VOMITOS_PERSISTENTES: {
    code: 'VOMITOS_PERSISTENTES',
    level: 'P3',
    description: 'Vómitos persistentes',
  },

  SANGRADO_CONTROLADO: {
    code: 'SANGRADO_CONTROLADO',
    level: 'P3',
    description: 'Hemorragia controlada',
  },

  FRACTURA_CERRADA: {
    code: 'FRACTURA_CERRADA',
    level: 'P3',
    description: 'Fractura cerrada',
  },
});

function levelFromTews(score) {
  if (
    !Number.isInteger(score) ||
    score < 0
  ) {
    return null;
  }

  if (score >= 7) return 'P1';
  if (score >= 5) return 'P2';
  if (score >= 3) return 'P3';

  return 'P4';
}

function getMoreUrgentLevel(
  currentLevel,
  candidateLevel
) {
  const current = LEVELS[currentLevel];
  const candidate = LEVELS[candidateLevel];

  if (!current || !candidate) {
    return null;
  }

  return candidate.order < current.order
    ? candidateLevel
    : currentLevel;
}

/*
 * Comprueba los códigos proporcionados.
 *
 * No permite códigos desconocidos.
 *
 * Una lista vacía NO significa
 * que todos los discriminadores
 * clínicos hayan sido descartados.
 */
function evaluateDiscriminators(codes) {
  if (!Array.isArray(codes)) {
    return {
      valid: false,
      findings: [],
      unknown: [],
      reason:
        'Debe proporcionar una lista de discriminadores.',
    };
  }

  const unknown = codes.filter(
    (code) =>
      typeof code !== 'string' ||
      !Object.prototype.hasOwnProperty.call(
        DISCRIMINATORS,
        code
      )
  );

  if (unknown.length > 0) {
    return {
      valid: false,
      findings: [],
      unknown,
      reason:
        'Existen discriminadores no reconocidos.',
    };
  }

  const uniqueCodes = [
    ...new Set(codes),
  ];

  return {
    valid: true,

    findings: uniqueCodes.map(
      (code) => DISCRIMINATORS[code]
    ),

    unknown: [],
    reason: null,
  };
}

function baseResult() {
  return {
    version_protocolo:
      CLINICAL_PRIORITY_MATRIX.version,

    tipo_resultado:
      'SIMULACION_ACADEMICA_SATS',

    uso_clinico_autorizado: false,

    catalogo_discriminadores_completo:
      false,

    prioridad_fisiologica_preliminar:
      null,

    categoria_combinada_experimental:
      null,

    prioridad_sugerida: null,

    prioridad_final: null,

    clasificacion_clinica_completa:
      false,

    requiere_validacion_humana: true,

    modifica_prioridad_real: false,
  };
}

function classifySatsAcademic({
  currentCase,
  syntheticCase = false,
  discriminatorCodes = null,
} = {}) {
  const base = baseResult();

  /*
   * Bloqueo de casos no declarados
   * expresamente como ficticios.
   *
   * Esta bandera es una protección
   * organizativa, no una barrera
   * de seguridad clínica suficiente.
   */
  if (syntheticCase !== true) {
    return {
      ...base,
      estado: 'USO_NO_AUTORIZADO',
      motivo:
        'Solo se permiten escenarios académicos ficticios.',
    };
  }

  if (
    !currentCase ||
    typeof currentCase !== 'object' ||
    Array.isArray(currentCase)
  ) {
    return {
      ...base,
      estado: 'SIN_CASO_VALIDO',
      motivo:
        'No se proporcionó un caso válido.',
    };
  }

  /*
   * PRIMERA ETAPA: TEWS
   */
  const tews = calculateAdultTews(
    currentCase
  );

  if (!tews.calculo_completo) {
    return {
      ...base,

      estado: 'TEWS_INCOMPLETO',

      resultado_tews: tews,

      campos_faltantes:
        tews.campos_faltantes_o_invalidos ??
        [],

      motivo:
        'No es posible calcular la categoría fisiológica porque TEWS está incompleto o no es aplicable.',
    };
  }

  const physiologicalLevel =
    levelFromTews(tews.puntaje_tews);

  if (!physiologicalLevel) {
    return {
      ...base,

      estado: 'PUNTAJE_NO_CLASIFICABLE',

      puntaje_tews:
        tews.puntaje_tews,

      motivo:
        'El puntaje TEWS es inválido.',
    };
  }

  /*
   * Se conserva el comportamiento
   * de la versión anterior:
   * sin códigos, solo mostrar TEWS.
   */
  if (discriminatorCodes === null) {
    return {
      ...base,

      estado:
        'CATEGORIA_TEWS_PRELIMINAR',

      puntaje_tews:
        tews.puntaje_tews,

      prioridad_fisiologica_preliminar:
        physiologicalLevel,

      resultado_tews:
        tews,

      discriminadores_evaluados:
        false,

      motivo:
        'Categoría fisiológica calculada. Falta revisar los discriminadores clínicos.',
    };
  }

  /*
   * SEGUNDA ETAPA:
   * Validación de los códigos.
   */
  const discriminatorResult =
    evaluateDiscriminators(
      discriminatorCodes
    );

  if (!discriminatorResult.valid) {
    return {
      ...base,

      estado:
        'DISCRIMINADORES_INVALIDOS',

      puntaje_tews:
        tews.puntaje_tews,

      prioridad_fisiologica_preliminar:
        physiologicalLevel,

      discriminadores_no_configurados:
        discriminatorResult.unknown,

      motivo:
        discriminatorResult.reason,
    };
  }

  /*
   * TERCERA ETAPA:
   * Combinar las categorías.
   *
   * Si hay varios discriminadores,
   * se conserva la categoría
   * de mayor urgencia.
   */
  let combinedLevel =
    physiologicalLevel;

  for (
    const finding of
    discriminatorResult.findings
  ) {
    combinedLevel =
      getMoreUrgentLevel(
        combinedLevel,
        finding.level
      );
  }

  /*
   * RESULTADO ACADÉMICO
   *
   * No habilita ninguna prioridad
   * clínica real.
   */
  return {
    ...base,

    estado:
      'COMBINACION_ACADEMICA_PARCIAL',

    puntaje_tews:
      tews.puntaje_tews,

    prioridad_fisiologica_preliminar:
      physiologicalLevel,

    categoria_combinada_experimental:
      combinedLevel,

    color_combinado:
      LEVELS[combinedLevel].color,

    descripcion_combinada:
      LEVELS[combinedLevel].name,

    discriminadores_seleccionados:
      discriminatorResult.findings,

    total_discriminadores_seleccionados:
      discriminatorResult.findings.length,

    discriminadores_evaluados:
      true,

    revision_clinica_completa:
      false,

    resultado_tews:
      tews,

    prioridad_sugerida:
      null,

    prioridad_final:
      null,

    motivo:
      'Resultado académico obtenido mediante TEWS y discriminadores seleccionados. La clasificación no es clínicamente definitiva y requiere completar y validar el protocolo SATS.',
  };
}

module.exports = {
  classifySatsAcademic,
  levelFromTews,
  evaluateDiscriminators,
  DISCRIMINATORS,
};
