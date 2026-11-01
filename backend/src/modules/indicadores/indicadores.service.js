// Indicadores de optimización: comparación antes/después.
//
// "Antes": hojas de observación del periodo anterior al sistema (línea base).
// "Después": registros del sistema con las MISMAS definiciones de tiempo.
// Portado de la versión v2 (services/indicators.service.js).
const pool = require("../../config/db");
const {
  INDICATOR_CONFIG,
  TIME_INDICATORS,
  computeIndicators,
  compareIndicators,
} = require("../../engines/indicatorsCalculator");
const {
  COLUMNS,
  parseObservationCsv,
  validateRows,
  buildTemplateCsv,
} = require("../../engines/baselineParser");

const MAX_RECORDS = 50000;
const MAX_RANGE_DAYS = 366;
const MAX_CSV_LENGTH = 1_500_000;
const TZ = "America/Guatemala";

function httpError(message, status = 400, extra = {}) {
  return Object.assign(new Error(message), { status, ...extra });
}

function parseIsoDate(value, field) {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw httpError(`El parámetro ${field} debe tener formato AAAA-MM-DD.`);
  }
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) {
    throw httpError(`El parámetro ${field} no es una fecha válida.`);
  }
  return value;
}

function daysBetween(from, to) {
  return (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86400000;
}

function checkRange(from, to, label) {
  if (from && to) {
    if (daysBetween(from, to) < 0) throw httpError(`En el periodo ${label}, la fecha inicial es posterior a la final.`);
    if (daysBetween(from, to) > MAX_RANGE_DAYS) throw httpError(`El periodo ${label} no puede superar ${MAX_RANGE_DAYS} días.`);
  }
}

function localToday() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

function shiftDays(iso, days) {
  const date = new Date(`${iso}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

// Registros del sistema. La prioridad cuenta solo si fue validada por
// personal autorizado (o clasificada manualmente con justificación).
async function findSystemRecords(from, to) {
  const result = await pool.query(
    `SELECT
       c.hora_llegada AS llegada,
       t.created_at AS valoracion,
       c.hora_inicio_atencion AS inicio_consulta,
       c.hora_fin_atencion AS fin_consulta,
       t.fecha_validacion AS ingreso_cola,
       CASE WHEN t.estado_prioridad = 'validado' THEN t.prioridad_final END AS prioridad,
       t.nivel_propuesto AS prioridad_sugerida,
       t.origen_clasificacion,
       (t.estado_prioridad = 'validado') AS validada,
       CASE WHEN t.id_triaje IS NULL THEN NULL ELSE t.revision_completa END AS revision_sats_completa
     FROM citas c
     LEFT JOIN triajes t ON t.id_cita = c.id_cita
     WHERE c.estado <> 'cancelada'
       AND (COALESCE(c.hora_llegada, c.fecha_hora) AT TIME ZONE '${TZ}')::date BETWEEN $1::date AND $2::date
     ORDER BY COALESCE(c.hora_llegada, c.fecha_hora)
     LIMIT ${MAX_RECORDS + 1}`,
    [from, to]
  );
  return result.rows;
}

async function findBaselineRecords(from, to) {
  const result = await pool.query(
    `SELECT
       o.fecha_llegada AS llegada,
       o.fecha_valoracion AS valoracion,
       o.fecha_inicio_consulta AS inicio_consulta,
       o.fecha_fin_consulta AS fin_consulta,
       o.prioridad
     FROM linea_base_observacion o
     JOIN linea_base_lote l ON l.id_lote = o.id_lote
     WHERE l.anulado = FALSE
       AND ($1::date IS NULL OR o.fecha_llegada >= $1::date)
       AND ($2::date IS NULL OR o.fecha_llegada < ($2::date + 1))
     ORDER BY o.fecha_llegada
     LIMIT ${MAX_RECORDS + 1}`,
    [from, to]
  );
  return result.rows;
}

async function findBaselineRange() {
  const result = await pool.query(
    `SELECT
       to_char(min(o.fecha_llegada), 'YYYY-MM-DD') AS desde,
       to_char(max(o.fecha_llegada), 'YYYY-MM-DD') AS hasta,
       count(*)::int AS total
     FROM linea_base_observacion o
     JOIN linea_base_lote l ON l.id_lote = o.id_lote
     WHERE l.anulado = FALSE`
  );
  return result.rows[0];
}

async function getReport(query = {}) {
  const afterTo = parseIsoDate(query.hasta, "hasta") ?? localToday();
  const afterFrom = parseIsoDate(query.desde, "desde") ?? shiftDays(afterTo, -29);
  checkRange(afterFrom, afterTo, '"después"');

  const baselineRange = await findBaselineRange();
  const beforeFrom = parseIsoDate(query.base_desde, "base_desde") ?? baselineRange.desde ?? null;
  const beforeTo = parseIsoDate(query.base_hasta, "base_hasta") ?? baselineRange.hasta ?? null;
  checkRange(beforeFrom, beforeTo, '"antes"');

  const [systemRows, baselineRows] = await Promise.all([
    findSystemRecords(afterFrom, afterTo),
    findBaselineRecords(beforeFrom, beforeTo),
  ]);
  const truncated = systemRows.length > MAX_RECORDS || baselineRows.length > MAX_RECORDS;
  const after = computeIndicators(systemRows.slice(0, MAX_RECORDS), { source: "SISTEMA" });
  const before = computeIndicators(baselineRows.slice(0, MAX_RECORDS), { source: "LINEA_BASE" });

  return {
    version_indicadores: INDICATOR_CONFIG.version,
    generado_en: new Date().toISOString(),
    definiciones: TIME_INDICATORS.map(({ codigo, nombre, descripcion, en_linea_base }) => ({ codigo, nombre, descripcion, en_linea_base })),
    objetivos_minutos: INDICATOR_CONFIG.objetivos_minutos,
    periodo_antes: {
      desde: beforeFrom,
      hasta: beforeTo,
      fuente: "Hojas de observación (línea base)",
      registros_disponibles: baselineRange.total,
    },
    periodo_despues: { desde: afterFrom, hasta: afterTo, fuente: "Registros del sistema" },
    resultados_truncados: truncated,
    antes: before.indicadores,
    despues: after.indicadores,
    comparacion: compareIndicators(before, after),
  };
}

async function listBatches() {
  const result = await pool.query(
    `SELECT
       l.id_lote, l.nombre, l.descripcion, l.origen, l.total_registros,
       l.registrado_en, l.anulado, l.motivo_anulacion, l.fecha_anulacion,
       u.nombre AS usuario,
       to_char(min(o.fecha_llegada), 'YYYY-MM-DD') AS desde,
       to_char(max(o.fecha_llegada), 'YYYY-MM-DD') AS hasta
     FROM linea_base_lote l
     LEFT JOIN usuarios u ON u.id_usuario = l.id_usuario
     LEFT JOIN linea_base_observacion o ON o.id_lote = l.id_lote
     GROUP BY l.id_lote, u.nombre
     ORDER BY l.id_lote DESC
     LIMIT 200`
  );
  return result.rows;
}

async function createBatch({ name, description, origin, records, idUser }) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const batch = await client.query(
      `INSERT INTO linea_base_lote (nombre, descripcion, origen, total_registros, id_usuario)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id_lote, nombre, descripcion, origen, total_registros, registrado_en`,
      [name, description, origin, records.length, idUser]
    );
    const idBatch = batch.rows[0].id_lote;
    const CHUNK = 400;
    for (let start = 0; start < records.length; start += CHUNK) {
      const chunk = records.slice(start, start + CHUNK);
      const values = [];
      const params = [];
      chunk.forEach((r, i) => {
        const b = i * 9;
        values.push(`($${b + 1}, $${b + 2}, $${b + 3}, $${b + 4}::timestamp, $${b + 5}::timestamp, $${b + 6}::timestamp, $${b + 7}::timestamp, $${b + 8}, $${b + 9})`);
        params.push(idBatch, r.fila_origen, r.codigo_hoja, r.fecha_llegada, r.fecha_valoracion, r.fecha_inicio_consulta, r.fecha_fin_consulta, r.prioridad, r.observacion);
      });
      await client.query(
        `INSERT INTO linea_base_observacion (
           id_lote, fila_origen, codigo_hoja, fecha_llegada,
           fecha_valoracion, fecha_inicio_consulta, fecha_fin_consulta,
           prioridad, observacion
         ) VALUES ${values.join(", ")}`,
        params
      );
    }
    await client.query("COMMIT");
    return batch.rows[0];
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

// Importación (CSV) o captura (filas). Con simular=true solo valida.
async function registerBatch({ body, idUser }) {
  if (!body || typeof body !== "object" || Array.isArray(body)) throw httpError("Debe enviar los datos del lote.");
  const allowed = ["nombre", "descripcion", "csv", "filas", "simular"];
  if (Object.keys(body).some((k) => !allowed.includes(k))) throw httpError("La solicitud contiene campos no permitidos.");

  const name = typeof body.nombre === "string" ? body.nombre.trim() : "";
  if (name.length < 3 || name.length > 150) throw httpError("El nombre del lote debe tener entre 3 y 150 caracteres.");
  const description = typeof body.descripcion === "string" && body.descripcion.trim() ? body.descripcion.trim().slice(0, 500) : null;

  const hasCsv = typeof body.csv === "string";
  const hasRows = Array.isArray(body.filas);
  if (hasCsv === hasRows) throw httpError("Envíe el contenido CSV o las filas capturadas (solo uno de los dos).");
  if (hasCsv && body.csv.length > MAX_CSV_LENGTH) throw httpError("El archivo supera el tamaño permitido (1.5 MB).");

  const parsed = hasCsv
    ? parseObservationCsv(body.csv)
    : validateRows(body.filas.map((row, index) => ({ ...(row && typeof row === "object" ? row : {}), __fila: index + 1 })));

  const summary = {
    nombre: name,
    origen: hasCsv ? "IMPORTACION" : "CAPTURA",
    filas_validas: parsed.registros.length,
    errores: parsed.errores.slice(0, 200),
    total_errores: parsed.errores.length,
  };
  if (parsed.errores.length > 0) {
    const sample = parsed.errores.slice(0, 5).map((e) => `fila ${e.fila}${e.campo ? ` (${e.campo})` : ""}: ${e.mensaje}`).join(" · ");
    throw httpError(
      `El lote tiene ${parsed.errores.length} error(es); no se guardó ninguna fila. ${sample}${parsed.errores.length > 5 ? " · …" : ""}`,
      422,
      { details: summary }
    );
  }
  if (parsed.registros.length === 0) throw httpError("El lote no contiene filas.");

  const dates = parsed.registros.map((r) => r.fecha_llegada.slice(0, 10)).sort();
  const preview = {
    ...summary,
    desde: dates[0],
    hasta: dates[dates.length - 1],
    con_prioridad: parsed.registros.filter((r) => r.prioridad).length,
    con_consulta: parsed.registros.filter((r) => r.fecha_inicio_consulta).length,
  };
  if (body.simular === true) return { simulado: true, ...preview };

  const batch = await createBatch({ name, description, origin: summary.origen, records: parsed.registros, idUser });
  return { simulado: false, ...preview, lote: batch };
}

async function voidBatch({ idBatch, reason, idUser }) {
  const text = typeof reason === "string" ? reason.trim() : "";
  if (text.length < 5 || text.length > 500) throw httpError("Indique el motivo de la anulación (5 a 500 caracteres).");
  const result = await pool.query(
    `UPDATE linea_base_lote
     SET anulado = TRUE, id_usuario_anulacion = $2, motivo_anulacion = $3, fecha_anulacion = NOW()
     WHERE id_lote = $1 AND anulado = FALSE
     RETURNING id_lote, anulado, motivo_anulacion, fecha_anulacion`,
    [idBatch, idUser, text]
  );
  if (!result.rows[0]) throw httpError("El lote no existe o ya fue anulado.", 409);
  return result.rows[0];
}

module.exports = {
  getReport,
  registerBatch,
  voidBatch,
  listBatches,
  getTemplate: () => ({ csv: buildTemplateCsv(), columnas: COLUMNS }),
};
