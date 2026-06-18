const pool = require("../../config/db");
const {
  getTrimmedString, getOptionalString, getOptionalId,
  isValidDateTime, parseMoney, parsePagination, buildPaginatedResponse,
} = require("../../utils/validators");
const { LAB_ORDER_SELECT, RESULTADO_SELECT } = require("../../utils/queries");
const { upsertChargeForRecord } = require("../../utils/cargosService");

const ALLOWED_STATES = new Set(["pendiente", "en_proceso", "resultado_cargado", "validado"]);
const ALLOWED_PRIORITIES = new Set(["normal", "alta", "urgente"]);

// ─── Ordenes ──────────────────────────────────────────────────────────────────

function sanitizeOrden(body) {
  return {
    id_paciente: getOptionalId(body.id_paciente),
    id_cita: getOptionalId(body.id_cita),
    id_visita: getOptionalId(body.id_visita),
    examen: getTrimmedString(body.examen),
    prioridad: getTrimmedString(body.prioridad).toLowerCase() || "normal",
    estado: getTrimmedString(body.estado).toLowerCase() || "pendiente",
    costo: parseMoney(body.costo),
  };
}

function validateOrden(o, res) {
  if (!o.id_paciente) { res.status(400).json({ message: "La orden debe estar asociada a un paciente." }); return false; }
  if (!o.examen) { res.status(400).json({ message: "El examen solicitado es obligatorio." }); return false; }
  if (!ALLOWED_PRIORITIES.has(o.prioridad)) { res.status(400).json({ message: `Prioridad invalida. Usa: ${[...ALLOWED_PRIORITIES].join(", ")}.` }); return false; }
  if (!ALLOWED_STATES.has(o.estado)) { res.status(400).json({ message: `Estado invalido. Usa: ${[...ALLOWED_STATES].join(", ")}.` }); return false; }
  if (o.costo === null) { res.status(400).json({ message: "El costo del examen debe ser un numero valido." }); return false; }
  return true;
}

async function resolveOrdenPayload(orden, client) {
  let cita = null, visita = null;
  if (orden.id_cita) {
    const r = await client.query("SELECT * FROM citas WHERE id_cita=$1", [orden.id_cita]);
    cita = r.rows[0];
    if (!cita) return { _notFound: "cita" };
  }
  if (orden.id_visita) {
    const r = await client.query("SELECT * FROM visitas_medicas WHERE id_visita=$1", [orden.id_visita]);
    visita = r.rows[0];
    if (!visita) return { _notFound: "visita" };
    if (cita && visita.id_cita && visita.id_cita !== cita.id_cita) return { _mismatch: true };
  }
  return {
    ...orden,
    id_paciente: orden.id_paciente || visita?.id_paciente || cita?.id_paciente || null,
    id_cita: orden.id_cita || visita?.id_cita || null,
  };
}

async function getOrdenById(id, queryRunner = pool) {
  const result = await queryRunner.query(`${LAB_ORDER_SELECT} WHERE o.id_orden=$1`, [id]);
  return result.rows[0] || null;
}

async function getAllOrdenes(query) {
  const { page, limit, offset } = parsePagination(query);
  const search = getTrimmedString(query.q);
  const pacienteId = getOptionalId(query.id_paciente);
  const visitaId = getOptionalId(query.id_visita);
  const estado = getTrimmedString(query.estado).toLowerCase();
  const prioridad = getTrimmedString(query.prioridad).toLowerCase();
  const params = [];
  const where = [];

  if (search) { params.push(`%${search}%`); where.push(`(COALESCE(p.nombre,'') ILIKE $${params.length} OR COALESCE(o.examen,'') ILIKE $${params.length})`); }
  if (pacienteId) { params.push(pacienteId); where.push(`o.id_paciente=$${params.length}`); }
  if (visitaId) { params.push(visitaId); where.push(`o.id_visita=$${params.length}`); }
  if (estado) { params.push(estado); where.push(`o.estado=$${params.length}`); }
  if (prioridad) { params.push(prioridad); where.push(`o.prioridad=$${params.length}`); }

  const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const [dataResult, countResult] = await Promise.all([
    pool.query(
      `${LAB_ORDER_SELECT} ${whereClause} ORDER BY o.created_at DESC LIMIT $${params.length+1} OFFSET $${params.length+2}`,
      [...params, limit, offset]
    ),
    pool.query(`SELECT COUNT(*)::int AS total FROM ordenes_laboratorio o LEFT JOIN pacientes p ON p.id_paciente=o.id_paciente ${whereClause}`, params),
  ]);

  return buildPaginatedResponse(dataResult.rows, countResult.rows[0].total, page, limit);
}

async function createOrden(body) {
  const client = await pool.connect();
  try {
    let orden = sanitizeOrden(body);
    const resolved = await resolveOrdenPayload(orden, client);
    if (resolved._notFound) throw Object.assign(new Error(`${resolved._notFound} no encontrado.`), { status: 404 });
    if (resolved._mismatch) throw Object.assign(new Error("La visita y la cita no corresponden al mismo proceso clinico."), { status: 400 });
    orden = resolved;

    await client.query("BEGIN");
    const result = await client.query(
      `INSERT INTO ordenes_laboratorio (id_paciente,id_cita,id_visita,examen,prioridad,estado,costo,created_at,updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,NOW(),NOW()) RETURNING id_orden`,
      [orden.id_paciente, orden.id_cita, orden.id_visita, orden.examen, orden.prioridad, orden.estado, orden.costo]
    );
    const idOrden = result.rows[0].id_orden;

    await upsertChargeForRecord(client, {
      id_paciente: orden.id_paciente, origen: "laboratorio", referencia_tipo: "orden_laboratorio",
      referencia_id: idOrden, descripcion: `Laboratorio - ${orden.examen}`,
      subtotal: orden.costo, total: orden.costo,
    });

    await client.query("COMMIT");
    return getOrdenById(idOrden, pool);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function updateOrden(id, body) {
  const client = await pool.connect();
  try {
    const current = await getOrdenById(id, client);
    if (!current) return null;

    let orden = sanitizeOrden({ ...current, ...body });
    const resolved = await resolveOrdenPayload(orden, client);
    if (resolved._notFound) throw Object.assign(new Error(`${resolved._notFound} no encontrado.`), { status: 404 });
    orden = resolved;

    await client.query("BEGIN");
    await client.query(
      `UPDATE ordenes_laboratorio SET id_paciente=$1,id_cita=$2,id_visita=$3,examen=$4,prioridad=$5,estado=$6,costo=$7,updated_at=NOW() WHERE id_orden=$8`,
      [orden.id_paciente, orden.id_cita, orden.id_visita, orden.examen, orden.prioridad, orden.estado, orden.costo, id]
    );
    await upsertChargeForRecord(client, {
      id_paciente: orden.id_paciente, origen: "laboratorio", referencia_tipo: "orden_laboratorio",
      referencia_id: id, descripcion: `Laboratorio - ${orden.examen}`,
      subtotal: orden.costo, total: orden.costo,
    });

    await client.query("COMMIT");
    return getOrdenById(id, pool);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

// ─── Resultados ───────────────────────────────────────────────────────────────

function sanitizeResultado(body) {
  return {
    id_orden: getOptionalId(body.id_orden),
    resultado: getTrimmedString(body.resultado),
    observaciones: getOptionalString(body.observaciones),
    fecha_resultado: getTrimmedString(body.fecha_resultado),
    validado_por: getOptionalString(body.validado_por),
  };
}

function validateResultado(r, res) {
  if (!r.id_orden || !r.resultado) { res.status(400).json({ message: "La orden y el resultado son obligatorios." }); return false; }
  if (r.fecha_resultado && !isValidDateTime(r.fecha_resultado)) { res.status(400).json({ message: "La fecha del resultado no tiene un formato valido." }); return false; }
  return true;
}

async function getResultadoById(id, queryRunner = pool) {
  const result = await queryRunner.query(`${RESULTADO_SELECT} WHERE r.id_resultado=$1`, [id]);
  return result.rows[0] || null;
}

async function getResultadoByOrdenId(idOrden, queryRunner = pool) {
  const result = await queryRunner.query(`${RESULTADO_SELECT} WHERE r.id_orden=$1`, [idOrden]);
  return result.rows[0] || null;
}

async function getAllResultados(query) {
  const { page, limit, offset } = parsePagination(query);
  const params = [];
  const where = [];
  const pacienteId = getOptionalId(query.id_paciente);
  if (pacienteId) { params.push(pacienteId); where.push(`o.id_paciente=$${params.length}`); }
  const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const [dataResult, countResult] = await Promise.all([
    pool.query(`${RESULTADO_SELECT} ${whereClause} ORDER BY r.fecha_resultado DESC LIMIT $${params.length+1} OFFSET $${params.length+2}`, [...params, limit, offset]),
    pool.query(`SELECT COUNT(*)::int AS total FROM resultados_laboratorio r INNER JOIN ordenes_laboratorio o ON o.id_orden=r.id_orden ${whereClause}`, params),
  ]);

  return buildPaginatedResponse(dataResult.rows, countResult.rows[0].total, page, limit);
}

async function createResultado(body) {
  const r = sanitizeResultado(body);
  const result = await pool.query(
    `INSERT INTO resultados_laboratorio (id_orden,resultado,observaciones,fecha_resultado,validado_por,created_at,updated_at)
     VALUES ($1,$2,$3,COALESCE($4::timestamptz,NOW()),$5,NOW(),NOW()) RETURNING id_resultado`,
    [r.id_orden, r.resultado, r.observaciones, r.fecha_resultado || null, r.validado_por]
  );
  await pool.query("UPDATE ordenes_laboratorio SET estado='resultado_cargado',updated_at=NOW() WHERE id_orden=$1", [r.id_orden]);
  return getResultadoById(result.rows[0].id_resultado);
}

async function updateResultado(id, body) {
  const current = await getResultadoById(id);
  if (!current) return null;
  const r = sanitizeResultado({ ...current, ...body });
  await pool.query(
    `UPDATE resultados_laboratorio SET resultado=$1,observaciones=$2,fecha_resultado=COALESCE($3::timestamptz,fecha_resultado),validado_por=$4,updated_at=NOW() WHERE id_resultado=$5`,
    [r.resultado, r.observaciones, r.fecha_resultado || null, r.validado_por, id]
  );
  return getResultadoById(id);
}

module.exports = {
  sanitizeOrden, validateOrden, getAllOrdenes, getOrdenById, createOrden, updateOrden,
  sanitizeResultado, validateResultado, getAllResultados, getResultadoById, getResultadoByOrdenId, createResultado, updateResultado,
};
