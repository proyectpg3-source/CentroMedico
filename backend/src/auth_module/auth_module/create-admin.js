/**
 * Script para crear el primer usuario administrador.
 * 
 * Uso:
 *   node scripts/create-admin.js
 * 
 * O con variables de entorno:
 *   ADMIN_EMAIL=tu@email.com ADMIN_PASSWORD=tupassword node scripts/create-admin.js
 */

require("dotenv").config({ quiet: true });

const bcrypt = require("bcryptjs");
const pool = require("../src/config/db");

const ADMIN_NOMBRE   = process.env.ADMIN_NOMBRE   || "Administrador";
const ADMIN_EMAIL    = process.env.ADMIN_EMAIL     || "admin@centromedico.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD  || "Admin1234!";

async function main() {
  console.log("Creando usuario administrador...");
  console.log(`Email: ${ADMIN_EMAIL}`);

  const existing = await pool.query(
    "SELECT id_usuario FROM usuarios WHERE email = $1",
    [ADMIN_EMAIL.toLowerCase()]
  );

  if (existing.rowCount > 0) {
    console.log("⚠️  Ya existe un usuario con ese email. No se creó ninguno nuevo.");
    process.exit(0);
  }

  const hashed = await bcrypt.hash(ADMIN_PASSWORD, 12);

  const result = await pool.query(
    `INSERT INTO usuarios (nombre, email, password, rol, created_at, updated_at)
     VALUES ($1, $2, $3, 'admin', NOW(), NOW())
     RETURNING id_usuario, nombre, email, rol`,
    [ADMIN_NOMBRE, ADMIN_EMAIL.toLowerCase(), hashed]
  );

  console.log("✅ Usuario admin creado:");
  console.table(result.rows[0]);
  console.log(`\nContraseña: ${ADMIN_PASSWORD}`);
  console.log("⚠️  Cambia la contraseña después del primer login.");
}

main()
  .catch((err) => {
    console.error("Error al crear admin:", err.message);
    process.exit(1);
  })
  .finally(() => pool.end());
