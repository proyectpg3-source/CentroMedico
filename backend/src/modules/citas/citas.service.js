const pool = require("../../config/db");
const {
  getTrimmedString, getOptionalString, getOptionalId, isValidDateTime,
  parsePagination, buildPaginatedResponse,
} = require("../../utils/validators");
const { CITA_SELECT } = require("../../utils/queries");
const { calcularPrioridadParaPaciente } = require("../analisis/analisis.service");

const ALLOWED_STATES = new Set(["pendiente", "confirmada", "en_curso", "completada", "cancelada"]);

function sanitize(body) {
  const estado = getTrimmedString(body.estado).toLowerCase();
  return {
    id_paciente: getOptionalId(body.id_paciente),
    id_medico: getOptionalId(body.id_medico),
    fecha_hora: body.fecha_hora instanceof Date && isValidDateTime(body.fecha_hora) ? body.fecha_hora.toISOString() : getTrimmedString(body.fecha_hora),
    motivo: getOptionalString(body.motivo),
    triaje_notas: getOptionalString(body.triaje_notas),
    estado: estado || null,
  };
}

function validate(cita, res) {
  if (!cita.id_paciente || !cita.id_medico || !cita.fecha_hora) {
    res.status(400).json({ message: "Paciente, medico y fecha/hora son obligatorios." });
    return false;
  }
  if (!isValidDateTime(cita.fecha_hora)) {
    res.status(400).json({ message: "La fecha/hora no tiene un formato valido." });
    return false;
  }
  if (cita.estado && !ALLOWED_STATES.has(cita.estado)) {
    res.status(400).json({ message: `Estado invalido. Usa: ${[...ALLOWED_STATES].join(", ")}.` });
    return false;
  }
  return true;
}

function validateBeforeWrite(cita) {
  validate(cita, { status(status) { return { json(body) { throw Object.assign(new Error(body.message), { status }); } }; } });
}

async function getAll(query) {
  const { page, limit, offset } = parsePagination(query);
  const search = getTrimmedString(query.q);
  const estado = getTrimmedString(query.estado).toLowerCase();
  const medicoId = getOptionalId(query.id_medico);
  const pacienteId = getOptionalId(query.id_paciente);
  const dateFrom = getTrimmedString(query.dateFrom);
  const dateTo = getTrimmedString(query.dateTo);
  const params = [];
  const where = [];

  if (search) {
    params.push(`%${search}%`);
    where.push(`(p.nombre ILIKE $${params.length} OR m.nombre ILIKE $${params.length} OR COALESCE(c.motivo,'') ILIKE $${params.length} OR COALESCE(c.triaje_notas,'') ILIKE $${params.length})`);
  }
  if (estado) { params.push(estado); where.push(`c.estado = $${params.length}`); }
  if (medicoId) { params.push(medicoId); where.push(`c.id_medico = $${params.length}`); }
  if (pacienteId) { params.push(pacienteId); where.push(`c.id_paciente = $${params.length}`); }
  if (dateFrom && isValidDateTime(dateFrom)) {
    params.push(dateFrom);
    where.push(`c.fecha_hora >= $${params.length}`);
  }
  if (dateTo && isValidDateTime(dateTo)) {
    params.push(dateTo);
    where.push(`c.fecha_hora <= $${params.length}`);
  }

  const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const [dataResult, countResult] = await Promise.all([
    pool.query(
      `${CITA_SELECT} ${whereClause} ORDER BY c.fecha_hora DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    ),
    pool.query(
      `SELECT COUNT(*)::int AS total FROM citas c
       LEFT JOIN pacientes p ON p.id_paciente = c.id_paciente
       LEFT JOIN medicos m ON m.id_medico = c.id_medico ${whereClause}`,
      params
    ),
  ]);

  return buildPaginatedResponse(dataResult.rows, countResult.rows[0].total, page, limit);
}

async function getById(id) {
  const result = await pool.query(`${CITA_SELECT} WHERE c.id_cita = $1`, [id]);
  return result.rows[0] || null;
}

async function create(body) {
  const c = sanitize(body);
  validateBeforeWrite(c);
  const prioridad = await calcularPrioridadParaPaciente(c.id_paciente, c);
  const result = await pool.query(
    `INSERT INTO citas (
       id_paciente, id_medico, fecha_hora, motivo, estado, triaje_notas,
       prioridad_clinica, puntaje_prioridad, motivos_prioridad, hora_llegada
     )
     VALUES ($1,$2,$3,$4,COALESCE($5,'pendiente'),$6,$7,$8,$9,NULL)
     RETURNING id_cita`,
    [
      c.id_paciente,
      c.id_medico,
      c.fecha_hora,
      c.motivo,
      c.estado,
      c.triaje_notas,
      prioridad.prioridad_clinica,
      prioridad.puntaje_prioridad,
      prioridad.motivos_prioridad,
    ]
  );
  return getById(result.rows[0].id_cita);
}

async function update(id, body) {
  const current = await pool.query("SELECT * FROM citas WHERE id_cita=$1", [id]);
  if (!current.rows[0]) return null;

  const c = sanitize({ ...current.rows[0], ...body });
  validateBeforeWrite(c);
  const prioridad = await calcularPrioridadParaPaciente(c.id_paciente, c);
  await pool.query(
    `UPDATE citas
     SET id_paciente=$1,
         id_medico=$2,
         fecha_hora=$3,
         motivo=$4,
         estado=$5,
         triaje_notas=$6,
         prioridad_clinica=$7,
         puntaje_prioridad=$8,
         motivos_prioridad=$9
     WHERE id_cita=$10`,
    [
      c.id_paciente,
      c.id_medico,
      c.fecha_hora,
      c.motivo,
      c.estado || "pendiente",
      c.triaje_notas,
      prioridad.prioridad_clinica,
      prioridad.puntaje_prioridad,
      prioridad.motivos_prioridad,
      id,
    ]
  );
  return getById(id);
}

async function updateStatus(id, estado) {
  const normalizedStatus = getTrimmedString(estado).toLowerCase();
  if (!ALLOWED_STATES.has(normalizedStatus)) {
    throw Object.assign(
      new Error(`Estado invalido. Usa: ${[...ALLOWED_STATES].join(", ")}.`),
      { status: 400 }
    );
  }

  const result = await pool.query(
    `UPDATE citas
     SET estado=$2,
         hora_llegada=CASE
           WHEN $2 IN ('en_curso', 'completada') THEN COALESCE(hora_llegada, NOW())
           ELSE hora_llegada
         END,
         hora_inicio_atencion=CASE
           WHEN $2 IN ('en_curso', 'completada') AND hora_inicio_atencion IS NULL THEN NOW()
           ELSE hora_inicio_atencion
         END,
         hora_fin_atencion=CASE
           WHEN $2 IN ('completada', 'cancelada') AND hora_fin_atencion IS NULL THEN NOW()
           ELSE hora_fin_atencion
         END
     WHERE id_cita=$1
     RETURNING id_cita`,
    [id, normalizedStatus]
  );

  if (!result.rows[0]) return null;
  return getById(id);
}

async function remove(id) {
  const result = await pool.query("DELETE FROM citas WHERE id_cita=$1 RETURNING id_cita", [id]);
  return result.rowCount > 0;
}

module.exports = { sanitize, validate, getAll, getById, create, update, updateStatus, remove, ALLOWED_STATES };
