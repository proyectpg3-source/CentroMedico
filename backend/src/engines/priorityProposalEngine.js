/*
 * CENTRO MÉDICO LA AURORA
 *
 * MOTOR DE PROPUESTAS P1-P4
 *
 * Genera una PROPUESTA de prioridad a partir
 * del registro SATS estructurado, aplicando el
 * conjunto versionado de reglas en
 * config/priorityRules.config.js.
 *
 * Cada propuesta incluye:
 * - reglas cumplidas con su evidencia;
 * - política de datos faltantes aplicada;
 * - alertas de consistencia;
 * - acciones pendientes cuando no se propone.
 *
 * NUNCA asigna una prioridad final: toda
 * propuesta debe confirmarla personal
 * autorizado antes de ingresar a la cola.
 *
 * Función pura: no accede a PostgreSQL.
 */

const {
  RULESET_VERSION,
  LEVEL_DETAILS,
  PRIORITY_RULES,
  ALERT_RULES,
} = require('./priorityRules.config');

const LEVEL_ORDER = Object.freeze({ P1: 1, P2: 2, P3: 3, P4: 4 });

function moreUrgent(a, b) {
  if (!a) return b ?? null;
  if (!b) return a;
  return LEVEL_ORDER[b] < LEVEL_ORDER[a] ? b : a;
}

function finiteNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function readableField(field) {
  return String(field).replaceAll('_', ' ');
}

/*
 * Reglas cumplidas con la evidencia concreta.
 */
function evaluateRules(structured) {
  const met = [];

  const present =
    structured?.discriminadores?.presentes_detalle ?? [];

  const tews = structured?.tews;

  for (const rule of PRIORITY_RULES) {
    if (rule.tipo === 'DISCRIMINADOR') {
      const matches = present.filter(
        (d) => d.level === rule.nivel
      );

      if (matches.length > 0) {
        met.push({
          codigo: rule.codigo,
          nivel: rule.nivel,
          descripcion: rule.descripcion,
          referencia: rule.referencia,
          evidencia: matches
            .map((d) => d.description)
            .join(', '),
        });
      }

      continue;
    }

    if (rule.tipo === 'TEWS' && tews?.aplicable) {
      const score = tews.puntaje_minimo;

      if (
        Number.isInteger(score) &&
        score >= rule.tews_min &&
        (rule.tews_max === null || score <= rule.tews_max)
      ) {
        met.push({
          codigo: rule.codigo,
          nivel: rule.nivel,
          descripcion: rule.descripcion,
          referencia: rule.referencia,
          evidencia:
            tews.puntaje !== null
              ? `TEWS = ${score}`
              : `TEWS entre ${tews.puntaje_minimo} y ${tews.puntaje_maximo} por datos pendientes; se usa el mínimo confirmado`,
        });
      }
    }
  }

  return met;
}

/*
 * Alertas de consistencia y complementarias.
 * No modifican el nivel.
 */
function evaluateAlerts({
  vitals = {},
  review = {},
  consciousness = null,
}) {
  const alerts = [];

  for (const rule of ALERT_RULES) {
    let triggered = false;
    let evidencia = null;

    if (rule.codigo === 'ALR-SPO2') {
      const spo2 = finiteNumber(vitals.saturacion_oxigeno);
      triggered =
        spo2 !== null &&
        spo2 < rule.umbral &&
        review[rule.discriminador] === 'AUSENTE';
      evidencia = `SpO₂ ${spo2} %`;
    } else if (rule.codigo === 'ALR-GLUCOSA') {
      const glucose = finiteNumber(vitals.glucometria);
      triggered =
        glucose !== null &&
        glucose < rule.umbral &&
        review[rule.discriminador] !== 'PRESENTE';
      evidencia = `Glucometría ${glucose} mg/dL`;
    } else if (rule.codigo === 'ALR-CONCIENCIA') {
      triggered =
        typeof consciousness === 'string' &&
        consciousness !== 'ALERTA' &&
        review[rule.discriminador] === 'AUSENTE';
      evidencia = `Estado de conciencia: ${consciousness}`;
    } else if (rule.codigo === 'ALR-FIEBRE') {
      const temp = finiteNumber(vitals.temperatura);
      triggered = temp !== null && temp >= rule.umbral;
      evidencia = `Temperatura ${temp} °C`;
    }

    if (triggered) {
      alerts.push({
        codigo: rule.codigo,
        tipo: rule.tipo,
        descripcion: rule.descripcion,
        evidencia,
        referencia: rule.referencia,
      });
    }
  }

  return alerts;
}

function pendingActions(structured, satsRegistered) {
  const actions = [];

  if (!satsRegistered) {
    actions.push('Registrar la valoración SATS (movilidad, conciencia y trauma).');
    return actions;
  }

  const tews = structured?.tews;

  if (tews && !tews.aplicable) {
    actions.push(
      'El TEWS de adultos no aplica a este paciente: utilice la clasificación manual justificada.'
    );
  }

  for (const field of tews?.campos_faltantes ?? []) {
    actions.push(
      `Registrar ${readableField(field)} o declarar el motivo por el que no puede obtenerse.`
    );
  }

  const pending =
    structured?.discriminadores?.no_evaluados?.length ?? 0;

  if (pending > 0) {
    actions.push(
      `Completar la revisión de discriminadores (${pending} criterio(s) sin evaluar).`
    );
  }

  return actions;
}

function buildFoundation({
  state,
  level,
  maxLevel,
  rules,
  alerts,
  actions,
}) {
  if (state === 'SIN_PROPUESTA') {
    return `Sin propuesta (${RULESET_VERSION}). ${actions.join(' ')}`.trim();
  }

  const parts = [
    `Propuesta ${level} — ${LEVEL_DETAILS[level].nombre} (${RULESET_VERSION}).`,
    `Reglas cumplidas: ${rules
      .map((r) => `${r.codigo} [${r.evidencia}]`)
      .join('; ')}.`,
  ];

  if (state === 'PROPUESTA_CONCLUSIVA') {
    parts.push('Categoría conclusiva: los datos pendientes no podrían elevarla.');
  } else {
    parts.push(
      `Propuesta provisional: signos vitales no obtenibles podrían elevarla hasta ${maxLevel}.`
    );
  }

  if (alerts.length > 0) {
    parts.push(
      `Alertas: ${alerts.map((a) => a.codigo).join(', ')}.`
    );
  }

  parts.push('Requiere confirmación del personal autorizado.');

  return parts.join(' ');
}

/*
 * FUNCIÓN PRINCIPAL
 *
 * structured:      resultado de classifySatsStructured
 * satsAssessment:  fila de valoracion_sats (o null)
 * vitals:          signos vitales preparados
 */
function proposePriority({
  structured,
  satsAssessment = null,
  vitals = {},
} = {}) {
  const satsRegistered = Boolean(
    satsAssessment?.movilidad &&
      satsAssessment?.estado_conciencia &&
      satsAssessment?.trauma
  );

  const review =
    satsAssessment?.revision_discriminadores ?? {};

  const alerts = evaluateAlerts({
    vitals,
    review,
    consciousness: satsAssessment?.estado_conciencia ?? null,
  });

  const rules = satsRegistered
    ? evaluateRules(structured)
    : [];

  const rulesLevel = rules.reduce(
    (acc, r) => moreUrgent(acc, r.nivel),
    null
  );

  let state = 'SIN_PROPUESTA';
  let policy = 'POL-SIN-PROPUESTA';

  if (satsRegistered && rulesLevel) {
    if (structured?.conclusiva === true) {
      state = 'PROPUESTA_CONCLUSIVA';
      policy = 'POL-CONCLUSIVA';
    } else if (structured?.registro_completo === true) {
      state = 'PROPUESTA_PROVISIONAL';
      policy = 'POL-PROVISIONAL';
    }
  }

  /*
   * Control de coherencia: el nivel de las
   * reglas debe coincidir con la categoría
   * confirmada del registro estructurado.
   */
  if (
    state !== 'SIN_PROPUESTA' &&
    rulesLevel !== structured?.categoria_confirmada
  ) {
    state = 'SIN_PROPUESTA';
    policy = 'POL-SIN-PROPUESTA';
  }

  const proposed = state === 'SIN_PROPUESTA' ? null : rulesLevel;

  const maxLevel =
    state === 'SIN_PROPUESTA'
      ? null
      : structured?.categoria_maxima_posible ?? proposed;

  const actions =
    state === 'SIN_PROPUESTA'
      ? pendingActions(structured, satsRegistered)
      : [];

  const hasInconsistency = alerts.some(
    (a) => a.tipo === 'INCONSISTENCIA'
  );

  return {
    version_reglas: RULESET_VERSION,
    estado: state,
    politica_aplicada: policy,
    nivel_propuesto: proposed,
    nivel_maximo_posible: maxLevel,
    detalle_nivel: proposed ? LEVEL_DETAILS[proposed] : null,
    puntaje_tews_confirmado:
      structured?.tews?.aplicable ? structured.tews.puntaje_minimo : null,
    intervalo_tews: structured?.tews?.aplicable
      ? {
          minimo: structured.tews.puntaje_minimo,
          maximo: structured.tews.puntaje_maximo,
        }
      : null,
    reglas_cumplidas: state === 'SIN_PROPUESTA' ? [] : rules,
    alertas: alerts,
    acciones_requeridas: actions,
    requiere_confirmacion_humana: true,
    requiere_justificacion_confirmacion:
      state === 'PROPUESTA_PROVISIONAL' || hasInconsistency,
    motivos_justificacion: [
      ...(state === 'PROPUESTA_PROVISIONAL'
        ? ['PROPUESTA_PROVISIONAL']
        : []),
      ...(hasInconsistency ? ['ALERTAS_DE_INCONSISTENCIA'] : []),
    ],
    fundamento: buildFoundation({
      state,
      level: proposed,
      maxLevel,
      rules,
      alerts,
      actions,
    }),
    prioridad_final: null,
  };
}

module.exports = {
  proposePriority,
  evaluateRules,
  evaluateAlerts,
};
