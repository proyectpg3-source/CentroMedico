const pool = require("../../config/db");
const {
  getTrimmedString, getOptionalString, getOptionalId,
  parseMoney, parsePagination, buildPaginatedResponse,
} = require("../../utils/validators");
const { PRESCRIPTION_SELECT } = require("../../utils/queries");
const { upsertChargeForRecord } = require("../../utils/cargosService");

function sanitize(body) {
  return {
    id_visita: getOptionalId(body.id_visita),
    medicamento: getTrimmedString(body.medicamento),
    dosis: getTrimmedString(body.dosis),
    frecuencia: getTrimmedString(body.frecuencia),
    duracion: getTrimmedString(body.duracion),
    instrucciones: getOptionalString(body.instrucciones),
    costo: parseMoney(body.costo),
  };
}

function validate(p, res) {
  if (!p.id_visita || !p.medicamento || !p.dosis || !p.frecuencia || !p.duracion) {
    res.status(400).json({ message: "Visita, medicamento, dosis, frecuencia y duracion son obligatorios." });
    return false;
  }
  if (p.costo === null) { res.status(400).json({ message: "El costo debe ser un numero valido." }); return false; }
  return true;
}

async function getById(id, queryRunner = pool) {
  const result = await queryRunner.query(`${PRESCRIPTION_SELECT} WHERE pr.id_prescripcion=$1`, [id]);
  return result.rows[0] || null;
}

async function getAll(query) {
  const { page, limit, offset } = parsePagination(query);
  const visitaId = getOptionalId(query.id_visita);
  const pacienteId = getOptionalId(query.id_paciente);
  const params = [];
  const where = [];

  if (visitaId) { params.push(visitaId); where.push(`pr.id_visita=$${params.length}`); }
  if (pacienteId) { params.push(pacienteId); where.push(`v.id_paciente=$${params.length}`); }

  const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const [dataResult, countResult] = await Promise.all([
    pool.query(`${PRESCRIPTION_SELECT} ${whereClause} ORDER BY pr.created_at DESC LIMIT $${params.length+1} OFFSET $${params.length+2}`, [...params, limit, offset]),
    pool.query(`SELECT COUNT(*)::int AS total FROM prescripciones pr INNER JOIN visitas_medicas v ON v.id_visita=pr.id_visita ${whereClause}`, params),
  ]);

  return buildPaginatedResponse(dataResult.rows, countResult.rows[0].total, page, limit);
}

async function create(body) {
  const client = await pool.connect();
  try {
    const p = sanitize(body);
    const visitaResult = await client.query("SELECT * FROM visitas_medicas WHERE id_visita=$1", [p.id_visita]);
    const visita = visitaResult.rows[0];
    if (!visita) throw Object.assign(new Error("Visita medica no encontrada."), { status: 404 });

    await client.query("BEGIN");
    const result = await client.query(
      `INSERT INTO prescripciones (id_visita,medicamento,dosis,frecuencia,duracion,instrucciones,costo,created_at,updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,NOW(),NOW()) RETURNING id_prescripcion`,
      [p.id_visita, p.medicamento, p.dosis, p.frecuencia, p.duracion, p.instrucciones, p.costo]
    );
    const idPrescripcion = result.rows[0].id_prescripcion;

    await upsertChargeForRecord(client, {
      id_paciente: visita.id_paciente, origen: "farmacia", referencia_tipo: "prescripcion",
      referencia_id: idPrescripcion, descripcion: `Prescripcion - ${p.medicamento}`,
      subtotal: p.costo, total: p.costo,
    });

    await client.query("COMMIT");
    return getById(idPrescripcion, pool);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function update(id, body) {
  const client = await pool.connect();
  try {
    const current = await getById(id, client);
    if (!current) return null;

    const p = sanitize({ ...current, ...body });
    const visitaResult = await client.query("SELECT * FROM visitas_medicas WHERE id_visita=$1", [p.id_visita]);
    const visita = visitaResult.rows[0];
    if (!visita) throw Object.assign(new Error("Visita medica no encontrada."), { status: 404 });

    await client.query("BEGIN");
    await client.query(
      `UPDATE prescripciones SET id_visita=$1,medicamento=$2,dosis=$3,frecuencia=$4,duracion=$5,instrucciones=$6,costo=$7,updated_at=NOW() WHERE id_prescripcion=$8`,
      [p.id_visita, p.medicamento, p.dosis, p.frecuencia, p.duracion, p.instrucciones, p.costo, id]
    );
    await upsertChargeForRecord(client, {
      id_paciente: visita.id_paciente, origen: "farmacia", referencia_tipo: "prescripcion",
      referencia_id: id, descripcion: `Prescripcion - ${p.medicamento}`,
      subtotal: p.costo, total: p.costo,
    });

    await client.query("COMMIT");
    return getById(id, pool);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

module.exports = { sanitize, validate, getAll, getById, create, update };
