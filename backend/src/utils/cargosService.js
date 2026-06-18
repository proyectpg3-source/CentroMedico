const { roundMoney } = require("../utils/validators");
const { CARGO_SELECT } = require("../utils/queries");
const pool = require("../config/db");

async function fetchCargoBase(id, queryRunner = pool) {
  const result = await queryRunner.query(
    "SELECT * FROM cargos_paciente WHERE id_cargo = $1",
    [id]
  );
  return result.rows[0] || null;
}

async function fetchChargeById(id, queryRunner = pool) {
  const result = await queryRunner.query(
    `${CARGO_SELECT} WHERE cp.id_cargo = $1 GROUP BY cp.id_cargo, p.id_paciente`,
    [id]
  );
  return result.rows[0] || null;
}

async function refreshChargeStatus(queryRunner, idCargo) {
  const charge = await fetchCargoBase(idCargo, queryRunner);
  if (!charge) return null;

  const paymentsResult = await queryRunner.query(
    "SELECT COALESCE(SUM(monto), 0)::numeric(10,2) AS total_pagado FROM pagos WHERE id_cargo = $1",
    [idCargo]
  );

  const total = Number(charge.total || 0);
  const totalPagado = Number(paymentsResult.rows[0].total_pagado || 0);
  const saldo = roundMoney(Math.max(total - totalPagado, 0));
  const estadoPago = saldo <= 0 ? "pagado" : totalPagado > 0 ? "parcial" : "pendiente";

  await queryRunner.query(
    `UPDATE cargos_paciente SET saldo = $1, estado_pago = $2, updated_at = NOW() WHERE id_cargo = $3`,
    [saldo, estadoPago, idCargo]
  );

  return fetchChargeById(idCargo, queryRunner);
}

async function upsertChargeForRecord(queryRunner, payload) {
  const subtotal = roundMoney(payload.subtotal);
  const total = roundMoney(payload.total);

  const existing = await queryRunner.query(
    "SELECT id_cargo FROM cargos_paciente WHERE referencia_tipo = $1 AND referencia_id = $2",
    [payload.referencia_tipo, payload.referencia_id]
  );

  let idCargo;

  if (existing.rowCount > 0) {
    idCargo = existing.rows[0].id_cargo;
    await queryRunner.query(
      `UPDATE cargos_paciente
       SET id_paciente=$1, origen=$2, descripcion=$3, subtotal=$4, total=$5, updated_at=NOW()
       WHERE id_cargo=$6`,
      [payload.id_paciente, payload.origen, payload.descripcion, subtotal, total, idCargo]
    );
  } else {
    const insert = await queryRunner.query(
      `INSERT INTO cargos_paciente
         (id_paciente, origen, referencia_tipo, referencia_id, descripcion, subtotal, total, saldo, estado_pago)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$7,$8)
       RETURNING id_cargo`,
      [
        payload.id_paciente, payload.origen, payload.referencia_tipo,
        payload.referencia_id, payload.descripcion, subtotal, total,
        total <= 0 ? "pagado" : "pendiente",
      ]
    );
    idCargo = insert.rows[0].id_cargo;
  }

  return refreshChargeStatus(queryRunner, idCargo);
}

module.exports = { fetchCargoBase, fetchChargeById, refreshChargeStatus, upsertChargeForRecord };
