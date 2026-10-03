require("dotenv").config({ quiet: true });

const bcrypt = require("bcryptjs");
const pool = require("../db");
const { ensureSchema } = require("../schema");

const ADMIN_NOMBRE = process.env.ADMIN_NOMBRE || "Administrador";
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || "admin@centromedico.com").toLowerCase();
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "Admin1234!";

async function main() {
  if (ADMIN_PASSWORD.length < 8) {
    throw new Error("ADMIN_PASSWORD debe tener al menos 8 caracteres.");
  }

  await ensureSchema(pool);
  const existing = await pool.query(
    "SELECT id_usuario, nombre, email, rol FROM usuarios WHERE email = $1",
    [ADMIN_EMAIL]
  );

  if (existing.rowCount > 0) {
    console.log(JSON.stringify({ created: false, usuario: existing.rows[0] }, null, 2));
    return;
  }

  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);
  const result = await pool.query(
    `INSERT INTO usuarios (nombre, email, password, rol, activo, created_at, updated_at)
     VALUES ($1, $2, $3, 'admin', TRUE, NOW(), NOW())
     RETURNING id_usuario, nombre, email, rol, activo`,
    [ADMIN_NOMBRE, ADMIN_EMAIL, passwordHash]
  );

  console.log(JSON.stringify({ created: true, usuario: result.rows[0] }, null, 2));
}

main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
