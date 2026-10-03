const express = require("express");
const { requireAuth, requireRole } = require("../../middlewares/auth.middleware");
const { parseEntityId, sendInvalidId, handleDatabaseError } = require("../../utils/validators");
const svc = require("./medicos.service");

const router = express.Router();
router.use(requireAuth);

router.get("/", async (req, res) => {
  try { res.json(await svc.getAll(req.query)); }
  catch (error) { handleDatabaseError(error, res, "Error al obtener medicos."); }
});

router.get("/:id", async (req, res) => {
  try {
    const id = parseEntityId(req.params.id);
    if (!id) return sendInvalidId(res, "medico");
    const medico = await svc.getById(id);
    if (!medico) return res.status(404).json({ message: "Medico no encontrado." });
    res.json(medico);
  } catch (error) { handleDatabaseError(error, res, "Error al obtener el medico."); }
});

router.post("/", requireRole("admin"), async (req, res) => {
  try {
    const data = svc.sanitize(req.body);
    if (!svc.validate(data, res)) return;
    res.status(201).json(await svc.create(req.body));
  } catch (error) { handleDatabaseError(error, res, "Error al insertar medico."); }
});

router.put("/:id", requireRole("admin"), async (req, res) => {
  try {
    const id = parseEntityId(req.params.id);
    if (!id) return sendInvalidId(res, "medico");
    const data = svc.sanitize(req.body);
    if (!svc.validate(data, res)) return;
    const updated = await svc.update(id, req.body);
    if (!updated) return res.status(404).json({ message: "Medico no encontrado." });
    res.json(updated);
  } catch (error) { handleDatabaseError(error, res, "Error al actualizar medico."); }
});

router.delete("/:id", requireRole("admin"), async (req, res) => {
  try {
    const id = parseEntityId(req.params.id);
    if (!id) return sendInvalidId(res, "medico");
    const deleted = await svc.remove(id);
    if (!deleted) return res.status(404).json({ message: "Medico no encontrado." });
    res.json({ message: "Medico eliminado correctamente." });
  } catch (error) { handleDatabaseError(error, res, "Error al eliminar medico."); }
});

module.exports = router;
