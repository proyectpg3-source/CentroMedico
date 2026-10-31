const pool = require("../../config/db");
const {
  getTrimmedString, getOptionalString, getOptionalId,
  isValidDateTime, parseMoney, parsePagination, buildPaginatedResponse,
} = require("../../utils/validators");
const { LAB_ORDER_SELECT, RESULTADO_SELECT } = require("../../utils/queries");
const { upsertChargeForRecord } = require("../../utils/cargosService");
const { buildInventoryAlerts } = require("../../services/inventoryAlerts");

const ALLOWED_STATES = new Set(["pendiente", "en_proceso", "resultado_cargado", "validado"]);
const ALLOWED_PRIORITIES = new Set(["normal", "alta", "urgente"]);
const ALLOWED_MOVEMENT_TYPES = new Set(["entrada", "salida"]);

function parseNonNegativeInteger(value) {
  if (value === undefined || value === null || value === "") return 0;
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : null;
}

function sanitizeInsumo(body) {
  return {
    nombre: getTrimmedString(body.nombre),
    categoria: getTrimmedString(body.categoria) || "Laboratorio",
    unidad: getTrimmedString(body.unidad) || "unidad",
    stock: parseNonNegativeInteger(body.stock),
    stock_minimo: parseNonNegativeInteger(body.stock_minimo ?? body.stockMinimo),
    fecha_vencimiento: getOptionalString(body.fecha_vencimiento ?? body.fechaVencimiento),
  };
}

function validateInsumo(insumo, res) {
  if (!insumo.nombre) {
    res.status(400).json({ message: "El nombre del insumo es obligatorio." });
    return false;
  }
  if (insumo.stock === null || insumo.stock_minimo === null) {
    res.status(400).json({ message: "El stock y el stock minimo deben ser numeros enteros positivos." });
    return false;
  }
  if (insumo.fecha_vencimiento && !isValidDateTime(insumo.fecha_vencimiento)) {
    res.status(400).json({ message: "La fecha de vencimiento no tiene un formato valido." });
    return false;
  }
  return true;
}

function sanitizeMovimiento(body) {
  return {
    tipo: getTrimmedString(body.tipo).toLowerCase(),
    cantidad: Number.parseInt(body.cantidad, 10),
    motivo: getOptionalString(body.motivo),
  };
}

function validateMovimiento(movimiento, res) {
  if (!ALLOWED_MOVEMENT_TYPES.has(movimiento.tipo)) {
    res.status(400).json({ message: "Tipo de movimiento invalido. Usa: entrada o salida." });
    return false;
  }

  if (!Number.isInteger(movimiento.cantidad) || movimiento.cantidad <= 0) {
    res.status(400).json({ message: "La cantidad debe ser un numero entero mayor a cero." });
    return false;
  }

  return true;
}

function mapInsumoForAlerts(row) {
  return {
    id: String(row.id_insumo),
    name: row.nombre,
    category: row.categoria,
    unit: row.unidad,
    stock: row.stock,
    minStock: row.stock_minimo,
    expirationDate: row.fecha_vencimiento,
  };
}

async function getAllInsumos(query) {
  const { page, limit, offset } = parsePagination(query);
  const search = getTrimmedString(query.q);
  const params = [];
  const where = [];

  if (search) {
    params.push(`%${search}%`);
    where.push(`(nombre ILIKE $${params.length} OR categoria ILIKE $${params.length})`);
  }

  const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const [dataResult, countResult] = await Promise.all([
    pool.query(
      `SELECT *
       FROM insumos_laboratorio
       ${whereClause}
       ORDER BY (stock <= stock_minimo) DESC, nombre ASC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    ),
    pool.query(`SELECT COUNT(*)::int AS total FROM insumos_laboratorio ${whereClause}`, params),
  ]);

  return buildPaginatedResponse(dataResult.rows, countResult.rows[0].total, page, limit);
}

async function getInsumoById(id, queryRunner = pool) {
  const result = await queryRunner.query("SELECT * FROM insumos_laboratorio WHERE id_insumo=$1", [id]);
  return result.rows[0] || null;
}

async function createInsumo(body) {
  const insumo = sanitizeInsumo(body);
  const result = await pool.query(
    `INSERT INTO insumos_laboratorio
       (nombre,categoria,unidad,stock,stock_minimo,fecha_vencimiento,created_at,updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,NOW(),NOW())
     RETURNING *`,
    [
      insumo.nombre,
      insumo.categoria,
      insumo.unidad,
      insumo.stock,
      insumo.stock_minimo,
      insumo.fecha_vencimiento || null,
    ]
  );
  return result.rows[0];
}

async function updateInsumo(id, body) {
  const current = await getInsumoById(id);
  if (!current) return null;

  const insumo = sanitizeInsumo({ ...current, ...body });
  const result = await pool.query(
    `UPDATE insumos_laboratorio
     SET nombre=$2,categoria=$3,unidad=$4,stock=$5,stock_minimo=$6,
         fecha_vencimiento=$7,updated_at=NOW()
     WHERE id_insumo=$1
     RETURNING *`,
    [
      id,
      insumo.nombre,
      insumo.categoria,
      insumo.unidad,
      insumo.stock,
      insumo.stock_minimo,
      insumo.fecha_vencimiento || null,
    ]
  );
  return result.rows[0] || null;
}

async function registrarMovimientoInsumo(id, body, usuarioId) {
  const movimiento = sanitizeMovimiento(body);
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const currentResult = await client.query(
      "SELECT * FROM insumos_laboratorio WHERE id_insumo=$1 FOR UPDATE",
      [id]
    );
    const current = currentResult.rows[0];
    if (!current) {
      await client.query("ROLLBACK");
      return null;
    }

    if (movimiento.tipo === "salida" && Number(current.stock) < movimiento.cantidad) {
      throw Object.assign(new Error("No hay stock suficiente para registrar la salida."), { status: 400 });
    }

    const signedQuantity = movimiento.tipo === "entrada" ? movimiento.cantidad : -movimiento.cantidad;
    const movementResult = await client.query(
      `INSERT INTO movimientos_insumos_laboratorio
         (id_insumo, tipo, cantidad, motivo, id_usuario, created_at)
       VALUES ($1,$2,$3,$4,$5,NOW())
       RETURNING *`,
      [id, movimiento.tipo, movimiento.cantidad, movimiento.motivo, usuarioId || null]
    );

    const insumoResult = await client.query(
      `UPDATE insumos_laboratorio
       SET stock = stock + $2,
           updated_at = NOW()
       WHERE id_insumo = $1
       RETURNING *`,
      [id, signedQuantity]
    );

    await client.query("COMMIT");
    return {
      insumo: insumoResult.rows[0],
      movimiento: movementResult.rows[0],
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function getAlertasInsumos() {
  const result = await pool.query("SELECT * FROM insumos_laboratorio ORDER BY nombre ASC");
  return buildInventoryAlerts(result.rows.map(mapInsumoForAlerts));
}

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

async function updateOrdenStatus(id, estado) {
  const normalizedStatus = getTrimmedString(estado).toLowerCase();
  if (!ALLOWED_STATES.has(normalizedStatus)) {
    throw Object.assign(
      new Error(`Estado invalido. Usa: ${[...ALLOWED_STATES].join(", ")}.`),
      { status: 400 }
    );
  }

  const result = await pool.query(
    `UPDATE ordenes_laboratorio
     SET estado=$2,
         updated_at=NOW()
     WHERE id_orden=$1
     RETURNING id_orden`,
    [id, normalizedStatus]
  );

  if (!result.rows[0]) return null;
  return getOrdenById(id);
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
  sanitizeInsumo, validateInsumo, sanitizeMovimiento, validateMovimiento,
  getAllInsumos, getInsumoById, createInsumo, updateInsumo, registrarMovimientoInsumo, getAlertasInsumos,
  sanitizeOrden, validateOrden, getAllOrdenes, getOrdenById, createOrden, updateOrden, updateOrdenStatus,
  sanitizeResultado, validateResultado, getAllResultados, getResultadoById, getResultadoByOrdenId, createResultado, updateResultado,
};
