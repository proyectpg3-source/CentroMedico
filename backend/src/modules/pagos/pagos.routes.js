const express = require("express");
const pool = require("../../config/db");
const {
  getTrimmedString, getOptionalString, getOptionalId, isValidDateTime,
  parseMoney, parseEntityId, sendInvalidId, handleDatabaseError,
  parsePagination, buildPaginatedResponse,
} = require("../../utils/validators");
const { fetchChargeById, refreshChargeStatus } = require("../../utils/cargosService");
const { PAGO_SELECT } = require("../../utils/queries");

const ALLOWED_ORIGINS = new Set(["consulta", "laboratorio", "farmacia"]);

function sanitize(body) {
  return {
    id_cargo: getOptionalId(body.id_cargo),
    id_paciente: getOptionalId(body.id_paciente),
    monto: parseMoney(body.monto, { allowNull: true }),
    fecha_pago: getTrimmedString(body.fecha_pago),
    metodo: getTrimmedString(body.metodo),
    referencia: getOptionalString(body.referencia),
    observaciones: getOptionalString(body.observaciones),
  };
}

function validate(pago, res) {
  if (!pago.id_cargo || !pago.metodo) { res.status(400).json({ message: "Cargo y metodo de pago son obligatorios." }); return false; }
  if (pago.monto === null || pago.monto <= 0) { res.status(400).json({ message: "El monto del pago debe ser mayor que cero." }); return false; }
  if (pago.fecha_pago && !isValidDateTime(pago.fecha_pago)) { res.status(400).json({ message: "La fecha del pago no tiene un formato valido." }); return false; }
  return true;
}

async function getPaymentById(id, queryRunner = pool) {
  const result = await queryRunner.query(`${PAGO_SELECT} WHERE pg.id_pago=$1`, [id]);
  return result.rows[0] || null;
}

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const { page, limit, offset } = parsePagination(req.query);
    const pacienteId = getOptionalId(req.query.id_paciente);
    const cargoId = getOptionalId(req.query.id_cargo);
    const params = [];
    const where = [];

    if (pacienteId) { params.push(pacienteId); where.push(`pg.id_paciente=$${params.length}`); }
    if (cargoId) { params.push(cargoId); where.push(`pg.id_cargo=$${params.length}`); }

    const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const [dataResult, countResult] = await Promise.all([
      pool.query(`${PAGO_SELECT} ${whereClause} ORDER BY pg.fecha_pago DESC LIMIT $${params.length+1} OFFSET $${params.length+2}`, [...params, limit, offset]),
      pool.query(`SELECT COUNT(*)::int AS total FROM pagos pg ${whereClause}`, params),
    ]);

    res.json(buildPaginatedResponse(dataResult.rows, countResult.rows[0].total, page, limit));
  } catch (error) { handleDatabaseError(error, res, "Error al obtener los pagos."); }
});

router.post("/", async (req, res) => {
  const client = await pool.connect();
  try {
    const pago = sanitize(req.body);
    if (!validate(pago, res)) return;

    const cargo = await fetchChargeById(pago.id_cargo, client);
    if (!cargo) return res.status(404).json({ message: "Cargo no encontrado." });

    if (!ALLOWED_ORIGINS.has(cargo.origen)) return res.status(400).json({ message: "El cargo asociado no pertenece a un origen valido." });
    if (Number(cargo.saldo || 0) <= 0) return res.status(400).json({ message: "El cargo ya se encuentra completamente pagado." });
    if (pago.monto > Number(cargo.saldo || 0)) return res.status(400).json({ message: "El pago no puede exceder el saldo pendiente del cargo." });

    await client.query("BEGIN");

    const result = await client.query(
      `INSERT INTO pagos (id_paciente,id_cargo,monto,fecha_pago,metodo,referencia,observaciones,created_at)
       VALUES ($1,$2,$3,COALESCE($4::timestamptz,NOW()),$5,$6,$7,NOW()) RETURNING id_pago`,
      [pago.id_paciente || cargo.id_paciente, pago.id_cargo, pago.monto, pago.fecha_pago || null, pago.metodo, pago.referencia, pago.observaciones]
    );
    const idPago = result.rows[0].id_pago;
    const refreshedCharge = await refreshChargeStatus(client, pago.id_cargo);

    await client.query("COMMIT");

    const savedPayment = await getPaymentById(idPago, pool);
    res.status(201).json({ pago: savedPayment, cargo: refreshedCharge });
  } catch (error) {
    await client.query("ROLLBACK");
    handleDatabaseError(error, res, "Error al registrar el pago.");
  } finally {
    client.release();
  }
});

module.exports = router;
