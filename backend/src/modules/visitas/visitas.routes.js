const express = require("express");
const { requireAuth, requireRole } = require("../../middlewares/auth.middleware");
const { parseEntityId, sendInvalidId, handleDatabaseError } = require("../../utils/validators");
const { logAuditEvent } = require("../../services/audit");
const svc = require("./visitas.service");
const { getFullClinicalHistory } = require("../analisis/analisis.service");

const router = express.Router();
router.use(requireAuth);

router.get("/historial/:idPaciente", async (req, res) => {
  try {
    const id = parseEntityId(req.params.idPaciente);
    if (!id) return sendInvalidId(res, "paciente");
    const history = await getFullClinicalHistory(id);
    res.json(history);
  } catch (error) {
    handleDatabaseError(error, res, "Error al obtener el historial clínico completo.");
  }
});

router.get("/", async (req, res) => {
  try { res.json(await svc.getAll(req.query)); }
  catch (error) { handleDatabaseError(error, res, "Error al obtener visitas medicas."); }
});

router.get("/:id", async (req, res) => {
  try {
    const id = parseEntityId(req.params.id);
    if (!id) return sendInvalidId(res, "visita");
    const visita = await svc.getById(id);
    if (!visita) return res.status(404).json({ message: "Visita medica no encontrada." });
    // Acceso a historia clinica: queda registrado quien la consulta.
    await logAuditEvent({
      usuario: req.usuario,
      accion: "visita.consultada",
      entidad: "visita_medica",
      idEntidad: id,
      descripcion: `Consulto la visita medica #${id}.`,
    });
    res.json(visita);
  } catch (error) { handleDatabaseError(error, res, "Error al obtener la visita."); }
});

router.post("/", requireRole("admin", "medico"), async (req, res) => {
  try {
    const created = await svc.create(req.body);
    await logAuditEvent({
      usuario: req.usuario,
      accion: "visita.creada",
      entidad: "visita_medica",
      idEntidad: created.id_visita,
      descripcion: `Registro la visita medica #${created.id_visita}.`,
    });
    res.status(201).json(created);
  } catch (error) {
    if (error.status) return res.status(error.status).json({ message: error.message });
    handleDatabaseError(error, res, "Error al registrar la visita medica.");
  }
});

router.put("/:id", requireRole("admin", "medico"), async (req, res) => {
  try {
    const id = parseEntityId(req.params.id);
    if (!id) return sendInvalidId(res, "visita");
    const updated = await svc.update(id, req.body);
    if (!updated) return res.status(404).json({ message: "Visita medica no encontrada." });
    await logAuditEvent({
      usuario: req.usuario,
      accion: "visita.actualizada",
      entidad: "visita_medica",
      idEntidad: id,
      descripcion: `Actualizo la visita medica #${id}.`,
    });
    res.json(updated);
  } catch (error) {
    if (error.status) return res.status(error.status).json({ message: error.message });
    handleDatabaseError(error, res, "Error al actualizar la visita medica.");
  }
});

module.exports = router;
