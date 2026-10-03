const pool = require("../../config/db");
const {
  getTrimmedString, getOptionalString, getOptionalId,
  parseMoney, roundMoney, parsePagination, buildPaginatedResponse,
} = require("../../utils/validators");
const { PRESCRIPTION_SELECT, DISPENSED_QUANTITY } = require("../../utils/queries");
const { upsertChargeForRecord } = require("../../utils/cargosService");

function httpError(message, status) {
  return Object.assign(new Error(message), { status });
}

// null = sin cantidad, NaN = cantidad invalida.
function parseQuantity(value) {
  if (value === undefined || value === null || value === "") return null;
  const n = Number(value);
  return Number.isSafeInteger(n) && n > 0 && n <= 2147483647 ? n : NaN;
}

function sanitize(body) {
  return {
    id_visita: getOptionalId(body.id_visita),
    id_producto: getOptionalId(body.id_producto),
    cantidad: parseQuantity(body.cantidad),
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
  if (Number.isNaN(p.cantidad)) { res.status(400).json({ message: "La cantidad debe ser un entero mayor que cero." }); return false; }
  if (p.id_producto && !p.cantidad) {
    res.status(400).json({ message: "Indica la cantidad a dispensar del producto de farmacia." });
    return false;
  }
  return true;
}

// Con producto vinculado, el costo lo fija el catalogo: cantidad x precio unitario.
async function applyProductPricing(client, p) {
  if (!p.id_producto) return p;
  const product = (await client.query("SELECT tipo, precio FROM productos WHERE id=$1", [p.id_producto])).rows[0];
  if (!product || product.tipo !== "farmacia") throw httpError("Producto de farmacia no encontrado.", 404);
  return { ...p, costo: roundMoney(p.cantidad * Number(product.precio)) };
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
  if (query.pendientes_dispensar === "1" || query.pendientes_dispensar === "true") {
    where.push(`pr.id_producto IS NOT NULL AND pr.cantidad > ${DISPENSED_QUANTITY}`);
  }

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
    const p = await applyProductPricing(client, sanitize(body));
    const visitaResult = await client.query("SELECT * FROM visitas_medicas WHERE id_visita=$1", [p.id_visita]);
    const visita = visitaResult.rows[0];
    if (!visita) throw Object.assign(new Error("Visita medica no encontrada."), { status: 404 });

    await client.query("BEGIN");
    const result = await client.query(
      `INSERT INTO prescripciones (id_visita,medicamento,dosis,frecuencia,duracion,instrucciones,costo,id_producto,cantidad,created_at,updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW(),NOW()) RETURNING id_prescripcion`,
      [p.id_visita, p.medicamento, p.dosis, p.frecuencia, p.duracion, p.instrucciones, p.costo, p.id_producto, p.cantidad]
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

    const p = await applyProductPricing(client, sanitize({ ...current, ...body }));
    const dispensed = current.cantidad_dispensada;
    if (dispensed > 0 && p.id_producto !== current.id_producto) {
      throw httpError("No se puede cambiar el producto de una prescripcion que ya tiene dispensaciones.", 409);
    }
    if (dispensed > 0 && p.cantidad < dispensed) {
      throw httpError(`La cantidad no puede ser menor a lo ya dispensado (${dispensed}).`, 409);
    }
    const visitaResult = await client.query("SELECT * FROM visitas_medicas WHERE id_visita=$1", [p.id_visita]);
    const visita = visitaResult.rows[0];
    if (!visita) throw Object.assign(new Error("Visita medica no encontrada."), { status: 404 });

    await client.query("BEGIN");
    await client.query(
      `UPDATE prescripciones SET id_visita=$1,medicamento=$2,dosis=$3,frecuencia=$4,duracion=$5,instrucciones=$6,costo=$7,id_producto=$8,cantidad=$9,updated_at=NOW() WHERE id_prescripcion=$10`,
      [p.id_visita, p.medicamento, p.dosis, p.frecuencia, p.duracion, p.instrucciones, p.costo, p.id_producto, p.cantidad, id]
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

// Descuenta del inventario de farmacia lo entregado al paciente. Admite entregas parciales.
async function dispense(id, body, usuario) {
  const requested = parseQuantity(body.cantidad);
  if (Number.isNaN(requested)) throw httpError("La cantidad debe ser un entero mayor que cero.", 400);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    // Bloquear la prescripcion serializa dispensaciones simultaneas de la misma receta.
    const pr = (await client.query(
      `SELECT pr.id_prescripcion, pr.id_producto, pr.cantidad, p.nombre AS paciente_nombre
       FROM prescripciones pr
       INNER JOIN visitas_medicas v ON v.id_visita = pr.id_visita
       INNER JOIN pacientes p ON p.id_paciente = v.id_paciente
       WHERE pr.id_prescripcion=$1 FOR UPDATE OF pr`,
      [id]
    )).rows[0];
    if (!pr) throw httpError("Prescripcion no encontrada.", 404);
    if (!pr.id_producto) throw httpError("La prescripcion no esta vinculada a un producto de farmacia.", 400);

    const dispensed = (await client.query(
      `SELECT ${DISPENSED_QUANTITY} AS total FROM prescripciones pr WHERE pr.id_prescripcion=$1`, [id]
    )).rows[0].total;
    const remaining = pr.cantidad - dispensed;
    if (remaining <= 0) throw httpError("La prescripcion ya fue dispensada por completo.", 409);
    const amount = requested ?? remaining;
    if (amount > remaining) throw httpError(`Solo quedan ${remaining} unidades por dispensar.`, 409);

    const product = (await client.query(
      "SELECT stock, vencimiento < CURRENT_DATE AS vencido FROM productos WHERE id=$1 FOR UPDATE",
      [pr.id_producto]
    )).rows[0];
    if (product.vencido) throw httpError("No se puede dispensar un producto vencido.", 400);
    if (product.stock < amount) throw httpError(`Existencias insuficientes (disponible: ${product.stock}).`, 409);

    await client.query("UPDATE productos SET stock=stock-$1 WHERE id=$2", [amount, pr.id_producto]);
    await client.query(
      `INSERT INTO movimientos_productos (id_producto,cantidad,motivo,id_usuario,id_prescripcion)
       VALUES ($1,$2,$3,$4,$5)`,
      [pr.id_producto, -amount, `Dispensacion prescripcion #${id} - ${pr.paciente_nombre}`, usuario.id_usuario, id]
    );
    await client.query("COMMIT");
    return { prescripcion: await getById(id, pool), cantidad: amount };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

module.exports = { sanitize, validate, getAll, getById, create, update, dispense };
