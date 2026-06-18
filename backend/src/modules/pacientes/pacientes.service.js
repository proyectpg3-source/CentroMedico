const pool = require("../../config/db");
const { getTrimmedString, getOptionalString, parsePagination, buildPaginatedResponse } = require("../../utils/validators");

function sanitize(body) {
  return {
    nombre: getTrimmedString(body.nombre),
    dni: getTrimmedString(body.dni),
    telefono: getOptionalString(body.telefono),
    email: getOptionalString(body.email),
  };
}

function validate(paciente, res) {
  if (!paciente.nombre || !paciente.dni) {
    res.status(400).json({ message: "Nombre y DNI son obligatorios." });
    return false;
  }
  return true;
}

async function getAll(query) {
  const { page, limit, offset } = parsePagination(query);
  const search = getTrimmedString(query.q);
  const params = [];
  let where = "";

  if (search) {
    params.push(`%${search}%`);
    where = `WHERE nombre ILIKE $1 OR dni ILIKE $1
             OR COALESCE(telefono,'') ILIKE $1 OR COALESCE(email,'') ILIKE $1`;
  }

  const [dataResult, countResult] = await Promise.all([
    pool.query(
      `SELECT * FROM pacientes ${where} ORDER BY id_paciente LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    ),
    pool.query(`SELECT COUNT(*)::int AS total FROM pacientes ${where}`, params),
  ]);

  return buildPaginatedResponse(dataResult.rows, countResult.rows[0].total, page, limit);
}

async function getById(id) {
  const result = await pool.query("SELECT * FROM pacientes WHERE id_paciente = $1", [id]);
  return result.rows[0] || null;
}

async function create(body) {
  const p = sanitize(body);
  const result = await pool.query(
    "INSERT INTO pacientes (nombre, dni, telefono, email, fecha_registro) VALUES ($1,$2,$3,$4,NOW()) RETURNING *",
    [p.nombre, p.dni, p.telefono, p.email]
  );
  return result.rows[0];
}

async function update(id, body) {
  const p = sanitize(body);
  const result = await pool.query(
    "UPDATE pacientes SET nombre=$1, dni=$2, telefono=$3, email=$4 WHERE id_paciente=$5 RETURNING *",
    [p.nombre, p.dni, p.telefono, p.email, id]
  );
  return result.rows[0] || null;
}

async function remove(id) {
  const result = await pool.query(
    "DELETE FROM pacientes WHERE id_paciente = $1 RETURNING id_paciente",
    [id]
  );
  return result.rowCount > 0;
}

module.exports = { sanitize, validate, getAll, getById, create, update, remove };
