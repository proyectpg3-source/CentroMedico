const pool = require("../../config/db");
const { getTrimmedString, parsePagination, buildPaginatedResponse } = require("../../utils/validators");

function mapEvent(row) {
  return {
    id_evento: row.id_evento,
    id_usuario: row.id_usuario,
    usuario_nombre: row.usuario_nombre,
    usuario_email: row.usuario_email,
    accion: row.accion,
    entidad: row.entidad,
    id_entidad: row.id_entidad,
    descripcion: row.descripcion,
    metadata: row.metadata,
    created_at: row.created_at,
  };
}

async function getAll(query) {
  const { page, limit, offset } = parsePagination(query);
  const search = getTrimmedString(query.q);
  const params = [];
  const where = [];

  if (search) {
    params.push(`%${search}%`);
    where.push(`(
      COALESCE(u.nombre, '') ILIKE $${params.length}
      OR COALESCE(u.email, '') ILIKE $${params.length}
      OR e.accion ILIKE $${params.length}
      OR e.entidad ILIKE $${params.length}
      OR COALESCE(e.descripcion, '') ILIKE $${params.length}
    )`);
  }

  const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const baseFrom = `
    FROM eventos_auditoria e
    LEFT JOIN usuarios u ON u.id_usuario = e.id_usuario
    ${whereClause}
  `;

  const [dataResult, countResult] = await Promise.all([
    pool.query(
      `SELECT e.*, u.nombre AS usuario_nombre, u.email AS usuario_email
       ${baseFrom}
       ORDER BY e.created_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    ),
    pool.query(`SELECT COUNT(*)::int AS total ${baseFrom}`, params),
  ]);

  return buildPaginatedResponse(dataResult.rows.map(mapEvent), countResult.rows[0].total, page, limit);
}

module.exports = { getAll };
