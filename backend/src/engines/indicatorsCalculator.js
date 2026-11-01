/*
 * CENTRO MÉDICO LA AURORA
 *
 * CÁLCULO DE INDICADORES DE OPTIMIZACIÓN
 *
 * Funciones puras (sin PostgreSQL). Se aplican
 * con las MISMAS definiciones a:
 * - la línea base (hojas de observación, antes);
 * - los registros del sistema (después).
 *
 * Todos los tiempos se expresan en minutos.
 * Un intervalo negativo es un error de registro:
 * se excluye y se cuenta como inconsistente.
 */

const INDICATOR_CONFIG = Object.freeze({
  version: 'INDICADORES-1',

  /*
   * Objetivo de tiempo llegada → inicio de consulta
   * por prioridad (referencia SATS). "Inmediata"
   * (P1) se operacionaliza como ≤ 5 minutos:
   * parámetro local pendiente de validación.
   */
  objetivos_minutos: Object.freeze({
    P1: 5,
    P2: 10,
    P3: 60,
    P4: 240,
  }),

  /* Intervalos por encima de este valor se
   * consideran error de registro (24 h). */
  maximo_minutos_valido: 24 * 60,

  /* Nivel de significación de la prueba. */
  alfa: 0.05,

  /* Tamaño mínimo por grupo para la prueba. */
  minimo_por_grupo: 5,
});

const LEVELS = ['P1', 'P2', 'P3', 'P4'];

/*
 * Definiciones de los intervalos. Cada una
 * indica qué campos del registro normalizado usa
 * y si existe en la línea base.
 */
const TIME_INDICATORS = Object.freeze([
  {
    codigo: 'llegada_valoracion',
    nombre: 'Tiempo hasta la valoración',
    descripcion: 'Desde la llegada hasta el inicio de la valoración inicial (triaje de Enfermería).',
    desde: 'llegada',
    hasta: 'valoracion',
    en_linea_base: true,
  },
  {
    codigo: 'llegada_consulta',
    nombre: 'Tiempo de espera hasta la consulta',
    descripcion: 'Desde la llegada hasta el inicio de la consulta médica.',
    desde: 'llegada',
    hasta: 'inicio_consulta',
    en_linea_base: true,
  },
  {
    codigo: 'valoracion_consulta',
    nombre: 'Espera tras la valoración',
    descripcion: 'Desde el inicio de la valoración hasta el inicio de la consulta.',
    desde: 'valoracion',
    hasta: 'inicio_consulta',
    en_linea_base: true,
  },
  {
    codigo: 'duracion_consulta',
    nombre: 'Duración de la consulta',
    descripcion: 'Desde el inicio hasta el fin de la consulta médica.',
    desde: 'inicio_consulta',
    hasta: 'fin_consulta',
    en_linea_base: true,
  },
  {
    codigo: 'estancia_total',
    nombre: 'Tiempo total en el centro',
    descripcion: 'Desde la llegada hasta el fin de la consulta.',
    desde: 'llegada',
    hasta: 'fin_consulta',
    en_linea_base: true,
  },
  {
    codigo: 'espera_cola',
    nombre: 'Espera en cola médica',
    descripcion: 'Desde el ingreso a la cola (prioridad confirmada) hasta el inicio de la atención. Solo existe con el sistema.',
    desde: 'ingreso_cola',
    hasta: 'inicio_consulta',
    en_linea_base: false,
  },
]);

function toDate(value) {
  if (value === null || value === undefined || value === '') return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function minutesBetween(from, to) {
  const a = toDate(from);
  const b = toDate(to);
  if (!a || !b) return null;
  return (b.getTime() - a.getTime()) / 60000;
}

function round(value, decimals = 1) {
  if (value === null || value === undefined || !Number.isFinite(value)) return null;
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

/* Percentil con interpolación lineal (tipo 7). */
function percentile(sorted, p) {
  if (sorted.length === 0) return null;
  if (sorted.length === 1) return sorted[0];
  const index = (sorted.length - 1) * p;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower);
}

function describe(values) {
  const clean = values.filter((v) => Number.isFinite(v));
  const sorted = [...clean].sort((a, b) => a - b);
  const n = sorted.length;

  if (n === 0) {
    return { n: 0, media: null, mediana: null, p25: null, p75: null, p90: null, minimo: null, maximo: null };
  }

  const mean = sorted.reduce((sum, v) => sum + v, 0) / n;

  return {
    n,
    media: round(mean),
    mediana: round(percentile(sorted, 0.5)),
    p25: round(percentile(sorted, 0.25)),
    p75: round(percentile(sorted, 0.75)),
    p90: round(percentile(sorted, 0.9)),
    minimo: round(sorted[0]),
    maximo: round(sorted[n - 1]),
  };
}

/* Función de distribución normal estándar
 * (aproximación de Abramowitz-Stegun 7.1.26). */
function normalCdf(z) {
  const t = 1 / (1 + 0.3275911 * Math.abs(z) / Math.SQRT2);
  const poly =
    t * (0.254829592 + t * (-0.284496736 + t * (1.421413741 + t * (-1.453152027 + t * 1.061405429))));
  const erf = 1 - poly * Math.exp(-(z * z) / 2);
  return z >= 0 ? (1 + erf) / 2 : (1 - erf) / 2;
}

/*
 * Prueba U de Mann-Whitney (bilateral), aproximación
 * normal con corrección por empates y continuidad.
 * No asume distribución normal de los tiempos.
 */
function mannWhitney(before, after, alpha = INDICATOR_CONFIG.alfa) {
  const a = before.filter(Number.isFinite);
  const b = after.filter(Number.isFinite);
  const n1 = a.length;
  const n2 = b.length;

  if (n1 < INDICATOR_CONFIG.minimo_por_grupo || n2 < INDICATOR_CONFIG.minimo_por_grupo) {
    return {
      aplicable: false,
      motivo: `Se requieren al menos ${INDICATOR_CONFIG.minimo_por_grupo} registros por periodo.`,
      n_antes: n1,
      n_despues: n2,
    };
  }

  const combined = [
    ...a.map((v) => ({ v, g: 1 })),
    ...b.map((v) => ({ v, g: 2 })),
  ].sort((x, y) => x.v - y.v);

  const ranks = new Array(combined.length);
  let tieTerm = 0;
  let i = 0;

  while (i < combined.length) {
    let j = i;
    while (j + 1 < combined.length && combined[j + 1].v === combined[i].v) j += 1;
    const rank = (i + j + 2) / 2;
    for (let k = i; k <= j; k += 1) ranks[k] = rank;
    const t = j - i + 1;
    if (t > 1) tieTerm += t ** 3 - t;
    i = j + 1;
  }

  let r1 = 0;
  combined.forEach((item, index) => {
    if (item.g === 1) r1 += ranks[index];
  });

  const u1 = r1 - (n1 * (n1 + 1)) / 2;
  const u2 = n1 * n2 - u1;
  const n = n1 + n2;
  const meanU = (n1 * n2) / 2;
  const varU = ((n1 * n2) / 12) * ((n + 1) - tieTerm / (n * (n - 1)));

  if (varU <= 0) {
    return { aplicable: false, motivo: 'Todos los valores son iguales.', n_antes: n1, n_despues: n2 };
  }

  const diff = u1 - meanU;
  const z = (Math.abs(diff) - 0.5) / Math.sqrt(varU);
  const p = Math.min(1, 2 * (1 - normalCdf(Math.max(z, 0))));

  return {
    aplicable: true,
    prueba: 'U de Mann-Whitney (bilateral, aproximación normal)',
    n_antes: n1,
    n_despues: n2,
    u: round(Math.min(u1, u2), 1),
    z: round(Math.sign(diff) * z, 3),
    p_valor: round(p, 4),
    alfa: alpha,
    significativo: p < alpha,
    /* Probabilidad de que un tiempo "después" sea
     * menor que uno "antes" (tamaño del efecto). */
    probabilidad_menor_despues: round(u1 / (n1 * n2), 3),
  };
}

/*
 * Registro normalizado esperado:
 * {
 *   llegada, valoracion, inicio_consulta, fin_consulta,
 *   ingreso_cola?, prioridad?, prioridad_sugerida?,
 *   origen_clasificacion?, modificada_manualmente?,
 *   revision_sats_completa?
 * }
 */
function intervalValues(records, indicator) {
  const values = [];
  let inconsistent = 0;
  let missing = 0;

  for (const record of records) {
    const minutes = minutesBetween(record[indicator.desde], record[indicator.hasta]);

    if (minutes === null) {
      missing += 1;
    } else if (minutes < 0 || minutes > INDICATOR_CONFIG.maximo_minutos_valido) {
      inconsistent += 1;
    } else {
      values.push(minutes);
    }
  }

  return { values, inconsistent, missing };
}

function computeIndicators(records, { source = 'SISTEMA' } = {}) {
  const list = Array.isArray(records) ? records : [];
  const isBaseline = source === 'LINEA_BASE';

  const tiempos = {};
  const valores = {};

  for (const indicator of TIME_INDICATORS) {
    if (isBaseline && !indicator.en_linea_base) continue;
    const { values, inconsistent, missing } = intervalValues(list, indicator);
    valores[indicator.codigo] = values;
    tiempos[indicator.codigo] = {
      ...describe(values),
      sin_dato: missing,
      inconsistentes: inconsistent,
    };
  }

  /* Distribución de prioridades */
  const withPriority = list.filter((r) => LEVELS.includes(r.prioridad));
  const distribution = {};
  for (const level of LEVELS) {
    const n = withPriority.filter((r) => r.prioridad === level).length;
    distribution[level] = {
      n,
      porcentaje: withPriority.length ? round((n / withPriority.length) * 100) : null,
    };
  }
  distribution.sin_prioridad = list.length - withPriority.length;

  /* Espera y cumplimiento por prioridad */
  const byPriority = {};
  let totalWithin = 0;
  let totalMeasured = 0;

  for (const level of LEVELS) {
    const subset = withPriority.filter((r) => r.prioridad === level);
    const { values } = intervalValues(subset, TIME_INDICATORS[1]);
    const target = INDICATOR_CONFIG.objetivos_minutos[level];
    const within = values.filter((v) => v <= target).length;
    totalWithin += within;
    totalMeasured += values.length;

    byPriority[level] = {
      espera_hasta_consulta: describe(values),
      objetivo_minutos: target,
      dentro_objetivo: within,
      cumplimiento_porcentaje: values.length ? round((within / values.length) * 100) : null,
    };
  }

  /* Volumen */
  const days = new Set(
    list
      .map((r) => toDate(r.llegada))
      .filter(Boolean)
      .map((d) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`)
  );

  const result = {
    fuente: source,
    version_indicadores: INDICATOR_CONFIG.version,
    volumen: {
      registros: list.length,
      dias_con_registros: days.size,
      promedio_diario: days.size ? round(list.length / days.size) : null,
    },
    tiempos,
    distribucion_prioridades: distribution,
    por_prioridad: byPriority,
    cumplimiento_objetivo_global: {
      medidos: totalMeasured,
      dentro_objetivo: totalWithin,
      porcentaje: totalMeasured ? round((totalWithin / totalMeasured) * 100) : null,
    },
  };

  if (!isBaseline) {
    /* Concordancia propuesta del motor vs. prioridad confirmada */
    const automatic = list.filter((r) => r.origen_clasificacion === 'AUTOMATICA' && r.validada === true);
    const manual = list.filter((r) => r.origen_clasificacion === 'MANUAL');
    const order = { P1: 1, P2: 2, P3: 3, P4: 4 };
    const unchanged = automatic.filter((r) => r.prioridad === r.prioridad_sugerida).length;
    const raised = automatic.filter(
      (r) => order[r.prioridad] < order[r.prioridad_sugerida]
    ).length;
    const lowered = automatic.filter(
      (r) => order[r.prioridad] > order[r.prioridad_sugerida]
    ).length;
    const classified = automatic.length + manual.length;

    result.concordancia_motor = {
      priorizaciones: classified,
      automaticas_confirmadas: automatic.length,
      manuales: manual.length,
      porcentaje_automaticas: classified ? round((automatic.length / classified) * 100) : null,
      confirmadas_sin_cambio: unchanged,
      elevadas_por_personal: raised,
      disminuidas_por_personal: lowered,
      concordancia_porcentaje: automatic.length ? round((unchanged / automatic.length) * 100) : null,
    };

    const evaluated = list.filter((r) => typeof r.revision_sats_completa === 'boolean');
    const complete = evaluated.filter((r) => r.revision_sats_completa).length;
    result.calidad_registro = {
      valoraciones_sats: evaluated.length,
      revision_discriminadores_completa: complete,
      porcentaje: evaluated.length ? round((complete / evaluated.length) * 100) : null,
    };
  }

  return { indicadores: result, valores };
}

/*
 * Comparación antes / después para cada tiempo
 * común. Menor tiempo = mejora.
 */
function compareIndicators(before, after) {
  const comparison = [];

  for (const indicator of TIME_INDICATORS) {
    if (!indicator.en_linea_base) continue;

    const a = before.valores[indicator.codigo] ?? [];
    const b = after.valores[indicator.codigo] ?? [];
    const da = before.indicadores.tiempos[indicator.codigo];
    const db = after.indicadores.tiempos[indicator.codigo];

    const difference =
      da?.mediana !== null && db?.mediana !== null && da && db
        ? round(db.mediana - da.mediana)
        : null;

    const change =
      difference !== null && da.mediana > 0
        ? round((difference / da.mediana) * 100)
        : null;

    const test = mannWhitney(a, b);

    let conclusion = 'SIN_DATOS_SUFICIENTES';
    if (test.aplicable) {
      if (!test.significativo) conclusion = 'SIN_DIFERENCIA_SIGNIFICATIVA';
      else conclusion = difference < 0 ? 'MEJORA_SIGNIFICATIVA' : 'EMPEORA_SIGNIFICATIVO';
    }

    comparison.push({
      codigo: indicator.codigo,
      nombre: indicator.nombre,
      mediana_antes: da?.mediana ?? null,
      mediana_despues: db?.mediana ?? null,
      diferencia_minutos: difference,
      cambio_porcentaje: change,
      prueba: test,
      conclusion,
    });
  }

  /* Cumplimiento global del objetivo de tiempo */
  const ca = before.indicadores.cumplimiento_objetivo_global;
  const cb = after.indicadores.cumplimiento_objetivo_global;

  return {
    tiempos: comparison,
    cumplimiento_objetivo: {
      antes: ca.porcentaje,
      despues: cb.porcentaje,
      diferencia_puntos:
        ca.porcentaje !== null && cb.porcentaje !== null
          ? round(cb.porcentaje - ca.porcentaje)
          : null,
    },
  };
}

module.exports = {
  INDICATOR_CONFIG,
  TIME_INDICATORS,
  describe,
  percentile,
  mannWhitney,
  minutesBetween,
  computeIndicators,
  compareIndicators,
};
