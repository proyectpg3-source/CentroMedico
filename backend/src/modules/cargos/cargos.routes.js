const express = require("express");
const { requireAuth, requireRole } = require("../../middlewares/auth.middleware");
const pool = require("../../config/db");
const { getTrimmedString, getOptionalId, parseEntityId, sendInvalidId, handleDatabaseError, parsePagination, buildPaginatedResponse } = require("../../utils/validators");
const { fetchChargeById } = require("../../utils/cargosService");
const { CARGO_SELECT } = require("../../utils/queries");
const { streamEstadoCuenta } = require("./estadoCuenta");
const { logAuditEvent } = require("../../services/audit");

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
router.use(requireAuth);
router.use(requireRole("admin", "recepcionista", "fundacion"));

router.get("/", async (req, res) => {
  try { res.json(await getAll(req.query)); }
  catch (error) { handleDatabaseError(error, res, "Error al obtener los cargos."); }
});

router.get("/estado-cuenta/:id", requireRole("admin", "recepcionista"), async (req, res) => {
  try {
    const id = parseEntityId(req.params.id);
    if (!id) return sendInvalidId(res, "paciente");
    const issuedBy = req.usuario?.nombre || req.usuario?.email || "usuario";
    const found = await streamEstadoCuenta(id, issuedBy, res);
    if (!found) return res.status(404).json({ message: "Paciente no encontrado." });
    await logAuditEvent({ usuario: req.usuario, accion: "paciente.estado_cuenta_generado", entidad: "paciente", idEntidad: id, descripcion: `Genero el estado de cuenta del paciente #${id}.` });
  } catch (error) {
    if (res.headersSent) return res.end();
    handleDatabaseError(error, res, "Error al generar el estado de cuenta.");
  }
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
