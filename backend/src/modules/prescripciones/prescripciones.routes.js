const express = require("express");
const { requireAuth, requireRole } = require("../../middlewares/auth.middleware");
const { parseEntityId, sendInvalidId, handleDatabaseError } = require("../../utils/validators");
const { logAuditEvent } = require("../../services/audit");
const svc = require("./prescripciones.service");

const router = express.Router();
router.use(requireAuth, requireRole("admin", "medico", "enfermero", "fundacion"));

router.get("/", async (req, res) => {
  try { res.json(await svc.getAll(req.query)); }
  catch (error) { handleDatabaseError(error, res, "Error al obtener prescripciones."); }
});

router.get("/:id", async (req, res) => {
  try {
    const id = parseEntityId(req.params.id);
    if (!id) return sendInvalidId(res, "prescripcion");
    const p = await svc.getById(id);
    if (!p) return res.status(404).json({ message: "Prescripcion no encontrada." });
    res.json(p);
  } catch (error) { handleDatabaseError(error, res, "Error al obtener la prescripcion."); }
});

router.post("/", requireRole("admin", "medico"), async (req, res) => {
  try {
    const data = svc.sanitize(req.body);
    if (!svc.validate(data, res)) return;
    res.status(201).json(await svc.create(req.body));
  } catch (error) {
    if (error.status) return res.status(error.status).json({ message: error.message });
    handleDatabaseError(error, res, "Error al registrar la prescripcion.");
  }
});

router.put("/:id", requireRole("admin", "medico"), async (req, res) => {
  try {
    const id = parseEntityId(req.params.id);
    if (!id) return sendInvalidId(res, "prescripcion");
    const data = svc.sanitize(req.body);
    if (!svc.validate(data, res)) return;
    const updated = await svc.update(id, req.body);
    if (!updated) return res.status(404).json({ message: "Prescripcion no encontrada." });
    res.json(updated);
  } catch (error) {
    if (error.status) return res.status(error.status).json({ message: error.message });
    handleDatabaseError(error, res, "Error al actualizar la prescripcion.");
  }
});

router.post("/:id/dispensar", requireRole("admin", "enfermero"), async (req, res) => {
  try {
    const id = parseEntityId(req.params.id);
    if (!id) return sendInvalidId(res, "prescripcion");
    const result = await svc.dispense(id, req.body || {}, req.usuario);
    await logAuditEvent({
      usuario: req.usuario, accion: "dispensar", entidad: "prescripcion", idEntidad: id,
      descripcion: `Dispensadas ${result.cantidad} unidades de ${result.prescripcion.producto_nombre}`,
      metadata: { id_producto: result.prescripcion.id_producto, cantidad: result.cantidad },
    });
    res.status(201).json(result.prescripcion);
  } catch (error) {
    if (error.status) return res.status(error.status).json({ message: error.message });
    handleDatabaseError(error, res, "Error al dispensar la prescripcion.");
  }
});

module.exports = router;
