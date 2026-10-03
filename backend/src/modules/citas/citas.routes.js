const express = require("express");
const { requireAuth, requireRole } = require("../../middlewares/auth.middleware");
const { parseEntityId, sendInvalidId, handleDatabaseError } = require("../../utils/validators");
const svc = require("./citas.service");

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

router.post("/", requireRole("admin", "recepcionista", "enfermero", "fundacion"), async (req, res) => {
  try {
    const data = svc.sanitize(req.body);
    if (!svc.validate(data, res)) return;
    res.status(201).json(await svc.create(req.body));
  } catch (error) { handleDatabaseError(error, res, "Error al crear la cita."); }
});

router.put("/:id", requireRole("admin", "recepcionista", "enfermero", "fundacion"), async (req, res) => {
  try {
    const id = parseEntityId(req.params.id);
    if (!id) return sendInvalidId(res, "cita");
    const updated = await svc.update(id, req.body);
    if (!updated) return res.status(404).json({ message: "Cita no encontrada." });
    const data = svc.sanitize(updated);
    if (!svc.validate(data, res)) return;
    res.json(updated);
  } catch (error) { handleDatabaseError(error, res, "Error al actualizar la cita."); }
});

router.patch("/:id/estado", requireRole("admin", "recepcionista", "enfermero", "fundacion", "medico"), async (req, res) => {
  try {
    const id = parseEntityId(req.params.id);
    if (!id) return sendInvalidId(res, "cita");

    const updated = await svc.updateStatus(id, req.body.estado);
    if (!updated) return res.status(404).json({ message: "Cita no encontrada." });
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
    res.json({ message: "Cita eliminada correctamente." });
  } catch (error) { handleDatabaseError(error, res, "Error al eliminar la cita."); }
});

module.exports = router;
