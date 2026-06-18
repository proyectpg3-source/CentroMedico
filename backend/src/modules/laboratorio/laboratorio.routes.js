const express = require("express");
const { parseEntityId, sendInvalidId, handleDatabaseError } = require("../../utils/validators");
const svc = require("./laboratorio.service");

const router = express.Router();

// ─── Ordenes ──────────────────────────────────────────────────────────────────

router.get("/ordenes", async (req, res) => {
  try { res.json(await svc.getAllOrdenes(req.query)); }
  catch (error) { handleDatabaseError(error, res, "Error al obtener las ordenes de laboratorio."); }
});

router.get("/ordenes/:id", async (req, res) => {
  try {
    const id = parseEntityId(req.params.id);
    if (!id) return sendInvalidId(res, "orden");
    const orden = await svc.getOrdenById(id);
    if (!orden) return res.status(404).json({ message: "Orden de laboratorio no encontrada." });
    res.json(orden);
  } catch (error) { handleDatabaseError(error, res, "Error al obtener la orden."); }
});

router.post("/ordenes", async (req, res) => {
  try {
    const data = svc.sanitizeOrden(req.body);
    if (!svc.validateOrden(data, res)) return;
    res.status(201).json(await svc.createOrden(req.body));
  } catch (error) {
    if (error.status) return res.status(error.status).json({ message: error.message });
    handleDatabaseError(error, res, "Error al crear la orden de laboratorio.");
  }
});

router.put("/ordenes/:id", async (req, res) => {
  try {
    const id = parseEntityId(req.params.id);
    if (!id) return sendInvalidId(res, "orden");
    const updated = await svc.updateOrden(id, req.body);
    if (!updated) return res.status(404).json({ message: "Orden de laboratorio no encontrada." });
    res.json(updated);
  } catch (error) {
    if (error.status) return res.status(error.status).json({ message: error.message });
    handleDatabaseError(error, res, "Error al actualizar la orden.");
  }
});

// ─── Resultados ───────────────────────────────────────────────────────────────

router.get("/resultados", async (req, res) => {
  try { res.json(await svc.getAllResultados(req.query)); }
  catch (error) { handleDatabaseError(error, res, "Error al obtener resultados."); }
});

router.get("/resultados/:id", async (req, res) => {
  try {
    const id = parseEntityId(req.params.id);
    if (!id) return sendInvalidId(res, "resultado");
    const resultado = await svc.getResultadoById(id);
    if (!resultado) return res.status(404).json({ message: "Resultado no encontrado." });
    res.json(resultado);
  } catch (error) { handleDatabaseError(error, res, "Error al obtener el resultado."); }
});

router.post("/resultados", async (req, res) => {
  try {
    const data = svc.sanitizeResultado(req.body);
    if (!svc.validateResultado(data, res)) return;
    res.status(201).json(await svc.createResultado(req.body));
  } catch (error) { handleDatabaseError(error, res, "Error al registrar el resultado."); }
});

router.put("/resultados/:id", async (req, res) => {
  try {
    const id = parseEntityId(req.params.id);
    if (!id) return sendInvalidId(res, "resultado");
    const data = svc.sanitizeResultado(req.body);
    if (!svc.validateResultado(data, res)) return;
    const updated = await svc.updateResultado(id, req.body);
    if (!updated) return res.status(404).json({ message: "Resultado no encontrado." });
    res.json(updated);
  } catch (error) { handleDatabaseError(error, res, "Error al actualizar el resultado."); }
});

module.exports = router;
