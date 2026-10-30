const pool = require("../../config/db");
const {
  getTrimmedString,
  getOptionalString,
  isValidDateTime,
  parsePagination,
  buildPaginatedResponse,
} = require("../../utils/validators");

const ALLOWED_SEX = new Set(["femenino", "masculino", "otro", "no_indicado"]);

function sanitize(body) {
  return {
    nombre: getTrimmedString(body.nombre),
    dni: getTrimmedString(body.dni),
    telefono: getOptionalString(body.telefono),
    email: getOptionalString(body.email),
    fecha_nacimiento: getOptionalString(body.fecha_nacimiento),
    sexo: getOptionalString(body.sexo),
    residencia: getOptionalString(body.residencia),
    contacto_emergencia: getOptionalString(body.contacto_emergencia),
  };
}

function validate(paciente, res) {
  if (!paciente.nombre || !paciente.dni) {
    res.status(400).json({ message: "Nombre y DPI son obligatorios." });
    return false;
  }
  const dpi = paciente.dni.replace(/[\s-]/g, "");
  if (!/^\d{13}$/.test(dpi)) {
    res.status(400).json({ message: "El DPI debe tener 13 digitos." });
    return false;
  }
  paciente.dni = dpi;
  if (paciente.fecha_nacimiento && !isValidDateTime(paciente.fecha_nacimiento)) {
    res.status(400).json({ message: "La fecha de nacimiento no es valida." });
    return false;
  }
  if (paciente.sexo && !ALLOWED_SEX.has(paciente.sexo)) {
    res.status(400).json({ message: "El sexo registrado no es valido." });
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
             OR COALESCE(telefono,'') ILIKE $1 OR COALESCE(email,'') ILIKE $1
             OR COALESCE(residencia,'') ILIKE $1
             OR COALESCE(contacto_emergencia,'') ILIKE $1`;
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

async function getOptions(query) {
  const { page, limit, offset } = parsePagination(query);
  const search = getTrimmedString(query.q);
  const params = search ? [`%${search}%`] : [];
  const where = search ? "WHERE nombre ILIKE $1" : "";
  const [data, count] = await Promise.all([
    pool.query(`SELECT id_paciente, nombre FROM pacientes ${where} ORDER BY id_paciente LIMIT $${params.length + 1} OFFSET $${params.length + 2}`, [...params, limit, offset]),
    pool.query(`SELECT COUNT(*)::int AS total FROM pacientes ${where}`, params),
  ]);
  return buildPaginatedResponse(data.rows, count.rows[0].total, page, limit);
}

async function create(body) {
  const p = sanitize(body);
  const result = await pool.query(
    `INSERT INTO pacientes (
       nombre, dni, telefono, email, fecha_nacimiento, sexo,
       residencia, contacto_emergencia, fecha_registro
     )
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW()) RETURNING *`,
    [
      p.nombre,
      p.dni,
      p.telefono,
      p.email,
      p.fecha_nacimiento,
      p.sexo,
      p.residencia,
      p.contacto_emergencia,
    ]
  );
  return result.rows[0];
}

async function update(id, body) {
  const p = sanitize(body);
  const result = await pool.query(
    `UPDATE pacientes
     SET nombre=$1,
         dni=$2,
         telefono=$3,
         email=$4,
         fecha_nacimiento=$5,
         sexo=$6,
         residencia=$7,
         contacto_emergencia=$8
     WHERE id_paciente=$9
     RETURNING *`,
    [
      p.nombre,
      p.dni,
      p.telefono,
      p.email,
      p.fecha_nacimiento,
      p.sexo,
      p.residencia,
      p.contacto_emergencia,
      id,
    ]
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

module.exports = { sanitize, validate, getAll, getOptions, getById, create, update, remove };
