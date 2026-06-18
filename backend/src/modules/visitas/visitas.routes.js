const express = require("express");
const { parseEntityId, sendInvalidId, handleDatabaseError } = require("../../utils/validators");
const svc = require("./visitas.service");

const router = express.Router();

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
    res.json(visita);
  } catch (error) { handleDatabaseError(error, res, "Error al obtener la visita."); }
});

router.post("/", async (req, res) => {
  try {
    const data = svc.sanitize(req.body);
    if (!svc.validate(data, res)) return;
    res.status(201).json(await svc.create(req.body));
  } catch (error) {
    if (error.status) return res.status(error.status).json({ message: error.message });
    handleDatabaseError(error, res, "Error al registrar la visita medica.");
  }
});

router.put("/:id", async (req, res) => {
  try {
    const id = parseEntityId(req.params.id);
    if (!id) return sendInvalidId(res, "visita");
    const updated = await svc.update(id, req.body);
    if (!updated) return res.status(404).json({ message: "Visita medica no encontrada." });
    res.json(updated);
  } catch (error) {
    if (error.status) return res.status(error.status).json({ message: error.message });
    handleDatabaseError(error, res, "Error al actualizar la visita medica.");
  }
});

module.exports = router;
