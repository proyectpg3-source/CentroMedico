const express = require("express");
const { requireAuth, requireRole } = require("../../middlewares/auth.middleware");
const { parseEntityId, sendInvalidId, handleDatabaseError } = require("../../utils/validators");
const { logAuditEvent } = require("../../services/audit");
const svc = require("./pacientes.service");

const router = express.Router();
router.use(requireAuth);

// Datos personales de salud: Fundacion no tiene acceso directo (coherente con la politica de la interfaz).
const READ_ROLES = ["admin", "medico", "enfermero", "recepcionista"];
const WRITE_ROLES = ["admin", "recepcionista", "enfermero"];

// Seleccion operativa sin exponer la ficha, DNI ni datos de contacto.
router.get("/opciones", requireRole(...READ_ROLES, "fundacion"), async (req, res) => {
  try { res.json(await svc.getOptions(req.query)); }
  catch (error) { handleDatabaseError(error, res, "Error al obtener las opciones de pacientes."); }
});

router.get("/", requireRole(...READ_ROLES), async (req, res) => {
  try {
    res.json(await svc.getAll(req.query));
  } catch (error) {
    handleDatabaseError(error, res, "Error al obtener pacientes.");
  }
});

router.get("/:id", requireRole(...READ_ROLES), async (req, res) => {
  try {
    const id = parseEntityId(req.params.id);
    if (!id) return sendInvalidId(res, "paciente");
    const paciente = await svc.getById(id);
    if (!paciente) return res.status(404).json({ message: "Paciente no encontrado." });
    await logAuditEvent({
      usuario: req.usuario,
      accion: "paciente.consultado",
      entidad: "paciente",
      idEntidad: id,
      descripcion: `Consulto la ficha del paciente #${id}.`,
    });
    res.json(paciente);
  } catch (error) {
    handleDatabaseError(error, res, "Error al obtener el paciente.");
  }
});

router.post("/", requireRole(...WRITE_ROLES), async (req, res) => {
  try {
    const data = svc.sanitize(req.body);
    if (!svc.validate(data, res)) return;
    const created = await svc.create(req.body);
    await logAuditEvent({
      usuario: req.usuario,
      accion: "paciente.creado",
      entidad: "paciente",
      idEntidad: created.id_paciente,
      descripcion: `Registro al paciente #${created.id_paciente}.`,
    });
    res.status(201).json(created);
  } catch (error) {
    handleDatabaseError(error, res, "Error al insertar paciente.");
  }
});

router.put("/:id", requireRole(...WRITE_ROLES), async (req, res) => {
  try {
    const id = parseEntityId(req.params.id);
    if (!id) return sendInvalidId(res, "paciente");
    const data = svc.sanitize(req.body);
    if (!svc.validate(data, res)) return;
    const updated = await svc.update(id, req.body);
    if (!updated) return res.status(404).json({ message: "Paciente no encontrado." });
    await logAuditEvent({
      usuario: req.usuario,
      accion: "paciente.actualizado",
      entidad: "paciente",
      idEntidad: id,
      descripcion: `Actualizo los datos del paciente #${id}.`,
    });
    res.json(updated);
  } catch (error) {
    handleDatabaseError(error, res, "Error al actualizar paciente.");
  }
});

router.delete("/:id", requireRole("admin"), async (req, res) => {
  try {
    const id = parseEntityId(req.params.id);
    if (!id) return sendInvalidId(res, "paciente");
    const deleted = await svc.remove(id);
    if (!deleted) return res.status(404).json({ message: "Paciente no encontrado." });
    await logAuditEvent({
      usuario: req.usuario,
      accion: "paciente.eliminado",
      entidad: "paciente",
      idEntidad: id,
      descripcion: `Elimino al paciente #${id}.`,
    });
    res.json({ message: "Paciente eliminado correctamente." });
  } catch (error) {
    handleDatabaseError(error, res, "Error al eliminar paciente.");
  }
});

module.exports = router;
