const pool = require("../../config/db");
const { getTrimmedString, getOptionalString, parsePagination, buildPaginatedResponse } = require("../../utils/validators");

function sanitize(body) {
  return {
    nombre: getTrimmedString(body.nombre),
    especialidad: getTrimmedString(body.especialidad),
    licencia: getOptionalString(body.licencia),
  };
}

function validate(medico, res) {
  if (!medico.nombre || !medico.especialidad) {
    res.status(400).json({ message: "Nombre y especialidad son obligatorios." });
    return false;
  }
  return true;
}

async function getAll(query) {
  const { page, limit, offset } = parsePagination(query);
  const search = getTrimmedString(query.q);
  const especialidad = getTrimmedString(query.especialidad);
  const params = [];
  const where = [];

  if (search) {
    params.push(`%${search}%`);
    where.push(`(m.nombre ILIKE $${params.length} OR m.especialidad ILIKE $${params.length} OR COALESCE(m.licencia,'') ILIKE $${params.length})`);
  }
  if (especialidad) {
    params.push(especialidad);
    where.push(`m.especialidad = $${params.length}`);
  }

  const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const [dataResult, countResult] = await Promise.all([
    pool.query(
      `SELECT m.*, COUNT(c.id_cita)::int AS total_citas
       FROM medicos m LEFT JOIN citas c ON c.id_medico = m.id_medico
       ${whereClause} GROUP BY m.id_medico ORDER BY m.id_medico
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    ),
    pool.query(`SELECT COUNT(DISTINCT m.id_medico)::int AS total FROM medicos m ${whereClause}`, params),
  ]);

  return buildPaginatedResponse(dataResult.rows, countResult.rows[0].total, page, limit);
}

async function getById(id) {
  const result = await pool.query(
    `SELECT m.*, COUNT(c.id_cita)::int AS total_citas
     FROM medicos m LEFT JOIN citas c ON c.id_medico = m.id_medico
     WHERE m.id_medico = $1 GROUP BY m.id_medico`,
    [id]
  );
  return result.rows[0] || null;
}

async function create(body) {
  const m = sanitize(body);
  const result = await pool.query(
    "INSERT INTO medicos (nombre, especialidad, licencia) VALUES ($1,$2,$3) RETURNING *",
    [m.nombre, m.especialidad, m.licencia]
  );
  return result.rows[0];
}

async function update(id, body) {
  const m = sanitize(body);
  const result = await pool.query(
    "UPDATE medicos SET nombre=$1, especialidad=$2, licencia=$3 WHERE id_medico=$4 RETURNING *",
    [m.nombre, m.especialidad, m.licencia, id]
  );
  return result.rows[0] || null;
}

async function remove(id) {
  const result = await pool.query("DELETE FROM medicos WHERE id_medico=$1 RETURNING id_medico", [id]);
  return result.rowCount > 0;
}

module.exports = { sanitize, validate, getAll, getById, create, update, remove };
