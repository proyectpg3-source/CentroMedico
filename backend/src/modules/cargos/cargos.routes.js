const express = require("express");
const pool = require("../../config/db");
const { getTrimmedString, getOptionalId, parseEntityId, sendInvalidId, handleDatabaseError, parsePagination, buildPaginatedResponse } = require("../../utils/validators");
const { fetchChargeById } = require("../../utils/cargosService");
const { CARGO_SELECT } = require("../../utils/queries");

async function getAll(query) {
  const { page, limit, offset } = parsePagination(query);
  const search = getTrimmedString(query.q);
  const pacienteId = getOptionalId(query.id_paciente);
  const estado = getTrimmedString(query.estado_pago).toLowerCase();
  const origen = getTrimmedString(query.origen).toLowerCase();
  const params = [];
  const where = [];

  if (search) { params.push(`%${search}%`); where.push(`(COALESCE(p.nombre,'') ILIKE $${params.length} OR COALESCE(cp.descripcion,'') ILIKE $${params.length})`); }
  if (pacienteId) { params.push(pacienteId); where.push(`cp.id_paciente=$${params.length}`); }
  if (estado) { params.push(estado); where.push(`cp.estado_pago=$${params.length}`); }
  if (origen) { params.push(origen); where.push(`cp.origen=$${params.length}`); }

  const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const [dataResult, countResult] = await Promise.all([
    pool.query(
      `${CARGO_SELECT} ${whereClause} GROUP BY cp.id_cargo,p.id_paciente ORDER BY cp.created_at DESC LIMIT $${params.length+1} OFFSET $${params.length+2}`,
      [...params, limit, offset]
    ),
    pool.query(`SELECT COUNT(DISTINCT cp.id_cargo)::int AS total FROM cargos_paciente cp INNER JOIN pacientes p ON p.id_paciente=cp.id_paciente ${whereClause}`, params),
  ]);

  return buildPaginatedResponse(dataResult.rows, countResult.rows[0].total, page, limit);
}

const router = express.Router();

router.get("/", async (req, res) => {
  try { res.json(await getAll(req.query)); }
  catch (error) { handleDatabaseError(error, res, "Error al obtener los cargos."); }
});

router.get("/:id", async (req, res) => {
  try {
    const id = parseEntityId(req.params.id);
    if (!id) return sendInvalidId(res, "cargo");
    const cargo = await fetchChargeById(id);
    if (!cargo) return res.status(404).json({ message: "Cargo no encontrado." });
    res.json(cargo);
  } catch (error) { handleDatabaseError(error, res, "Error al obtener el cargo."); }
});

module.exports = router;
