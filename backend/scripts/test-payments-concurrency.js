// Prueba contra PostgreSQL REAL: pagos simultaneos no deben exceder el saldo del cargo.
// Usar una BD desechable terminada en _test y RUN_DB_INTEGRATION=true.
// Crea y elimina sus propios datos (prefijo CONC-); no toca otros registros.
const assert = require("node:assert/strict");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

require("dotenv").config({ quiet: true });
if (process.env.RUN_DB_INTEGRATION !== "true" || !/_test$/i.test(process.env.DB_NAME || "")) {
  throw new Error("Esta prueba inicializa el esquema: requiere RUN_DB_INTEGRATION=true y una base desechable DB_NAME terminada en _test.");
}

const pool = require("../src/config/db");
const app = require("../src/app");

const TOTAL = 100, MONTO = 60, SIMULTANEOS = Number(process.env.CONC_N || 5);

async function main() {
  const server = app.listen(0, "127.0.0.1");
  await new Promise((r) => server.once("listening", r));
  const base = `http://127.0.0.1:${server.address().port}`;
  let ids = {};

  try {
    // Esperar a que el esquema este listo
    const health = await fetch(base + "/api/health", { signal: AbortSignal.timeout(15000) });
    if (!health.ok) throw new Error("La base de pruebas no esta disponible.");

    const hash = bcrypt.hashSync("Synthetic-Test-42", 4);
    ids.user = (await pool.query(
      `INSERT INTO usuarios (nombre,email,password,rol,created_at,updated_at) VALUES ('CONC admin',$1,$2,'admin',NOW(),NOW()) RETURNING id_usuario`,
      [`conc-${Date.now()}@example.invalid`, hash])).rows[0].id_usuario;
    ids.paciente = (await pool.query(
      `INSERT INTO pacientes (nombre,dni,fecha_registro) VALUES ('CONC paciente',$1,NOW()) RETURNING id_paciente`, [`CONC-${Date.now()}`])).rows[0].id_paciente;
    ids.cargo = (await pool.query(
      `INSERT INTO cargos_paciente (id_paciente,origen,referencia_tipo,referencia_id,descripcion,subtotal,total,saldo,estado_pago)
       VALUES ($1,'consulta','conc',$2,'CONC cargo',$3,$3,$3,'pendiente') RETURNING id_cargo`,
      [ids.paciente, Date.now() % 2000000000, TOTAL])).rows[0].id_cargo;

    const token = jwt.sign({ id_usuario: ids.user }, process.env.JWT_SECRET, { expiresIn: "5m" });
    const pagar = () => fetch(base + "/api/pagos", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
      body: JSON.stringify({ id_cargo: ids.cargo, monto: MONTO, metodo: "efectivo" }),
    }).then((r) => r.status);

    const statuses = await Promise.all(Array.from({ length: SIMULTANEOS }, pagar));
    const aceptados = statuses.filter((s) => s === 201).length;
    const { rows } = await pool.query("SELECT COALESCE(SUM(monto),0)::numeric AS pagado FROM pagos WHERE id_cargo=$1", [ids.cargo]);
    const pagado = Number(rows[0].pagado);

    console.log(`Respuestas: ${statuses.join(", ")}`);
    console.log(`Pagos aceptados: ${aceptados} | Total pagado: ${pagado} de ${TOTAL}`);
    assert.ok(pagado <= TOTAL, `SOBREPAGO: se cobro ${pagado} sobre un cargo de ${TOTAL}`);
    assert.equal(aceptados, 1, "Solo un pago de 60 cabe en un cargo de 100");
    console.log("APROBADO: el saldo del cargo no puede excederse con pagos simultaneos.");
  } finally {
    if (ids.cargo) await pool.query("DELETE FROM pagos WHERE id_cargo=$1", [ids.cargo]);
    if (ids.cargo) await pool.query("DELETE FROM cargos_paciente WHERE id_cargo=$1", [ids.cargo]);
    if (ids.paciente) await pool.query("DELETE FROM pacientes WHERE id_paciente=$1", [ids.paciente]);
    if (ids.user) await pool.query("DELETE FROM eventos_auditoria WHERE id_usuario=$1", [ids.user]);
    if (ids.user) await pool.query("DELETE FROM usuarios WHERE id_usuario=$1", [ids.user]);
    await new Promise((r) => server.close(r));
    await pool.end();
  }
}
main().catch((e) => { console.error("FALLIDO:", e.message); process.exitCode = 1; });
