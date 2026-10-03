const pool = require("../config/db");

async function logAuditEvent({ usuario, accion, entidad, idEntidad = null, descripcion = null, metadata = null }) {
  try {
    await pool.query(
      `INSERT INTO eventos_auditoria
         (id_usuario, accion, entidad, id_entidad, descripcion, metadata, created_at)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb, NOW())`,
      [
        usuario?.id_usuario || null,
        accion,
        entidad,
        idEntidad === null || idEntidad === undefined ? null : String(idEntidad),
        descripcion,
        metadata ? JSON.stringify(metadata) : null,
      ]
    );
  } catch (error) {
    console.error("No se pudo registrar auditoria:", error);
  }
}

module.exports = { logAuditEvent };
