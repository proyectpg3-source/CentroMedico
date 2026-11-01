const express = require("express");
const { requireAuth, requireRole } = require("../../middlewares/auth.middleware");
const { parseEntityId, sendInvalidId, handleDatabaseError, validateSATS } = require("../../utils/validators");
const { logAuditEvent } = require("../../services/audit");
const svc = require("./citas.service");
const { notifyCita, wasRescheduled } = require("../correos/citasCorreo");

const SATS_RULES_CITA = {
  id_paciente: { required: true, type: 'id' },
  id_medico: { required: true, type: 'id' },
  // El frontend envía fecha_hora; antes la regla pedía "fecha" y la creación
  // de citas desde Recepción fallaba con "El campo fecha es obligatorio".
  fecha_hora: { required: true, type: 'date' },
  motivo: { required: false, type: 'string' },
  triaje_notas: { required: false, type: 'string' },
};

const router = express.Router();
router.use(requireAuth);

router.get("/", async (req, res) => {
  try { res.json(await svc.getAll(req.query)); }
  catch (error) { handleDatabaseError(error, res, "Error al obtener citas."); }
});

router.get("/:id", async (req, res) => {
  try {
    const id = parseEntityId(req.params.id);
    if (!id) return sendInvalidId(res, "cita");
    const cita = await svc.getById(id);
    if (!cita) return res.status(404).json({ message: "Cita no encontrada." });
    res.json(cita);
  } catch (error) { handleDatabaseError(error, res, "Error al obtener la cita."); }
});

router.post("/", requireRole("admin", "recepcionista", "enfermero"), async (req, res) => {
  try {
    const body = req.body || {};
    const input = body.fecha_hora === undefined && body.fecha !== undefined ? { ...body, fecha_hora: body.fecha } : body;
    const { valid, sanitizedData, errors } = validateSATS(input, SATS_RULES_CITA);
    if (!valid) {
      return res.status(400).json({ message: "Error de validación SATS", details: errors });
    }
    const created = await svc.create(sanitizedData);
    await logAuditEvent({
      usuario: req.usuario,
      accion: "cita.creada",
      entidad: "cita",
      idEntidad: created.id_cita,
      descripcion: `Programo la cita #${created.id_cita}.`,
    });
    res.status(201).json(created);
    // Confirmacion por correo en segundo plano: no retrasa ni rompe la respuesta.
    notifyCita(created, "confirmacion");
  } catch (error) { handleDatabaseError(error, res, "Error al crear la cita."); }
});

router.put("/:id", requireRole("admin", "recepcionista", "enfermero"), async (req, res) => {
  try {
    const id = parseEntityId(req.params.id);
    if (!id) return sendInvalidId(res, "cita");
    const before = await svc.getById(id);
    const updated = await svc.update(id, req.body);
    if (!updated) return res.status(404).json({ message: "Cita no encontrada." });
    await logAuditEvent({
      usuario: req.usuario,
      accion: "cita.actualizada",
      entidad: "cita",
      idEntidad: id,
      descripcion: `Actualizo la cita #${id}.`,
    });
    res.json(updated);
    if (wasRescheduled(before, updated)) notifyCita(updated, "reprogramacion");
  } catch (error) {
    if (error.status === 400) return res.status(400).json({ message: error.message });
    handleDatabaseError(error, res, "Error al actualizar la cita.");
  }
});

router.patch("/:id/estado", requireRole("admin", "recepcionista", "enfermero", "medico"), async (req, res) => {
  try {
    const id = parseEntityId(req.params.id);
    if (!id) return sendInvalidId(res, "cita");

    const updated = await svc.updateStatus(id, req.body.estado);
    if (!updated) return res.status(404).json({ message: "Cita no encontrada." });
    await logAuditEvent({
      usuario: req.usuario,
      accion: "cita.estado",
      entidad: "cita",
      idEntidad: id,
      descripcion: `Cambio el estado de la cita #${id} a ${updated.estado}.`,
      metadata: { estado: updated.estado },
    });
    res.json(updated);
  } catch (error) {
    if (error.status) return res.status(error.status).json({ message: error.message });
    handleDatabaseError(error, res, "Error al actualizar el estado de la cita.");
  }
});

router.delete("/:id", requireRole("admin"), async (req, res) => {
  try {
    const id = parseEntityId(req.params.id);
    if (!id) return sendInvalidId(res, "cita");
    const deleted = await svc.remove(id);
    if (!deleted) return res.status(404).json({ message: "Cita no encontrada." });
    await logAuditEvent({
      usuario: req.usuario,
      accion: "cita.eliminada",
      entidad: "cita",
      idEntidad: id,
      descripcion: `Elimino la cita #${id}.`,
    });
    res.json({ message: "Cita eliminada correctamente." });
  } catch (error) { handleDatabaseError(error, res, "Error al eliminar la cita."); }
});

module.exports = router;
