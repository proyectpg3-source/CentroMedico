const express = require("express");
const pool = require("../../config/db");
const { requireAuth, requireRole } = require("../../middlewares/auth.middleware");
const { handleDatabaseError } = require("../../utils/validators");
const { logAuditEvent } = require("../../services/audit");

const router = express.Router();
router.use(requireAuth, requireRole("admin"));

async function readTable(tableName, orderBy = "1", columns = "*") {
  const result = await pool.query(`SELECT ${columns} FROM ${tableName} ORDER BY ${orderBy}`);
  return result.rows;
}

router.get("/export", async (req, res) => {
  try {
    const [
      usuarios,
      pacientes,
      medicos,
      citas,
      triajes,
      visitas,
      ordenesLaboratorio,
      resultadosLaboratorio,
      insumosLaboratorio,
      movimientosInsumos,
      prescripciones,
      cargosPaciente,
      pagos,
      eventosAuditoria,
      productos,
      movimientosProductos,
      documentos,
      configuracionCentro,
      atencionesRapidas,
    ] = await Promise.all([
      readTable("usuarios", "created_at ASC", "id_usuario, nombre, email, rol, id_medico, activo, created_at, updated_at"),
      readTable("pacientes", "fecha_registro ASC"),
      readTable("medicos", "id_medico ASC"),
      readTable("citas", "fecha_hora ASC"),
      readTable("triajes", "fecha_triaje ASC"),
      readTable("visitas_medicas", "fecha_visita ASC"),
      readTable("ordenes_laboratorio", "created_at ASC"),
      readTable("resultados_laboratorio", "created_at ASC"),
      readTable("insumos_laboratorio", "nombre ASC"),
      readTable("movimientos_insumos_laboratorio", "created_at ASC"),
      readTable("prescripciones", "created_at ASC"),
      readTable("cargos_paciente", "created_at ASC"),
      readTable("pagos", "created_at ASC"),
      readTable("eventos_auditoria", "created_at ASC"),
      readTable("productos", "id ASC"),
      readTable("movimientos_productos", "id ASC"),
      readTable("documentos_paciente", "id ASC", "id, id_paciente, nombre, descripcion, tipo, encode(contenido, 'base64') AS contenido_base64, id_usuario, created_at"),
      readTable("configuracion_centro", "id ASC"),
      readTable("atenciones_rapidas", "id ASC"),
    ]);

    const data = {
      usuarios,
      pacientes,
      medicos,
      citas,
      triajes,
      visitas,
      ordenesLaboratorio,
      resultadosLaboratorio,
      insumosLaboratorio,
      movimientosInsumos,
      prescripciones,
      cargosPaciente,
      pagos,
      eventosAuditoria,
      productos,
      movimientosProductos,
      documentos,
      configuracionCentro,
      atencionesRapidas,
    };

    await logAuditEvent({
      usuario: req.usuario,
      accion: "backup.exportado",
      entidad: "backup",
      descripcion: "Exporto un respaldo administrativo del sistema.",
      metadata: Object.fromEntries(Object.entries(data).map(([key, value]) => [key, value.length])),
    });

    res.json({
      schemaVersion: 4,
      exportedAt: new Date().toISOString(),
      generatedBy: {
        id_usuario: req.usuario.id_usuario,
        nombre: req.usuario.nombre,
        email: req.usuario.email,
      },
      counts: Object.fromEntries(Object.entries(data).map(([key, value]) => [key, value.length])),
      data,
    });
  } catch (error) {
    handleDatabaseError(error, res, "Error al generar el respaldo del sistema.");
  }
});

module.exports = router;
