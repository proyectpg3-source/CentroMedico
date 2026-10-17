const express = require("express");
const { requireAuth, requireRole } = require("../../middlewares/auth.middleware");
const { parseEntityId, sendInvalidId, handleDatabaseError } = require("../../utils/validators");
const { logAuditEvent } = require("../../services/audit");
const svc = require("./laboratorio.service");

const router = express.Router();
router.use(requireAuth);

// ─── Insumos y alertas ───────────────────────────────────────────────────────

router.get("/insumos", async (req, res) => {
  try { res.json(await svc.getAllInsumos(req.query)); }
  catch (error) { handleDatabaseError(error, res, "Error al obtener los insumos de laboratorio."); }
});

router.post("/insumos", requireRole("admin"), async (req, res) => {
  try {
    const data = svc.sanitizeInsumo(req.body);
    if (!svc.validateInsumo(data, res)) return;
    const created = await svc.createInsumo(req.body);
    await logAuditEvent({
      usuario: req.usuario,
      accion: "insumo.creado",
      entidad: "insumo_laboratorio",
      idEntidad: created.id_insumo,
      descripcion: `Creo el insumo ${created.nombre}.`,
      metadata: { stock: created.stock, stock_minimo: created.stock_minimo },
    });
    res.status(201).json(created);
  } catch (error) { handleDatabaseError(error, res, "Error al crear el insumo de laboratorio."); }
});

router.put("/insumos/:id", requireRole("admin"), async (req, res) => {
  try {
    const id = parseEntityId(req.params.id);
    if (!id) return sendInvalidId(res, "insumo");
    const data = svc.sanitizeInsumo(req.body);
    if (!svc.validateInsumo(data, res)) return;
    const updated = await svc.updateInsumo(id, req.body);
    if (!updated) return res.status(404).json({ message: "Insumo de laboratorio no encontrado." });
    await logAuditEvent({
      usuario: req.usuario,
      accion: "insumo.actualizado",
      entidad: "insumo_laboratorio",
      idEntidad: updated.id_insumo,
      descripcion: `Actualizo el insumo ${updated.nombre}.`,
      metadata: { stock: updated.stock, stock_minimo: updated.stock_minimo },
    });
    res.json(updated);
  } catch (error) { handleDatabaseError(error, res, "Error al actualizar el insumo de laboratorio."); }
});

router.post("/insumos/:id/movimientos", requireRole("admin", "enfermero"), async (req, res) => {
  try {
    const id = parseEntityId(req.params.id);
    if (!id) return sendInvalidId(res, "insumo");

    const data = svc.sanitizeMovimiento(req.body);
    if (!svc.validateMovimiento(data, res)) return;

    const result = await svc.registrarMovimientoInsumo(id, req.body, req.usuario.id_usuario);
    if (!result) return res.status(404).json({ message: "Insumo de laboratorio no encontrado." });

    await logAuditEvent({
      usuario: req.usuario,
      accion: "insumo.movimiento",
      entidad: "insumo_laboratorio",
      idEntidad: result.insumo.id_insumo,
      descripcion: `Registro ${data.tipo} de ${data.cantidad} ${result.insumo.unidad} en ${result.insumo.nombre}.`,
      metadata: {
        tipo: data.tipo,
        cantidad: data.cantidad,
        motivo: data.motivo,
        stock: result.insumo.stock,
      },
    });

    res.status(201).json(result);
  } catch (error) {
    if (error.status) return res.status(error.status).json({ message: error.message });
    handleDatabaseError(error, res, "Error al registrar el movimiento del insumo.");
  }
});

router.get("/insumos/alertas", async (req, res) => {
  try { res.json(await svc.getAlertasInsumos()); }
  catch (error) { handleDatabaseError(error, res, "Error al obtener las alertas de insumos."); }
});

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

router.post("/ordenes", requireRole("admin", "medico"), async (req, res) => {
  try {
    const data = svc.sanitizeOrden(req.body);
    if (!svc.validateOrden(data, res)) return;
    res.status(201).json(await svc.createOrden(req.body));
  } catch (error) {
    if (error.status) return res.status(error.status).json({ message: error.message });
    handleDatabaseError(error, res, "Error al crear la orden de laboratorio.");
  }
});

router.put("/ordenes/:id", requireRole("admin"), async (req, res) => {
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

router.patch("/ordenes/:id/estado", requireRole("admin", "medico", "enfermero"), async (req, res) => {
  try {
    const id = parseEntityId(req.params.id);
    if (!id) return sendInvalidId(res, "orden");

    const updated = await svc.updateOrdenStatus(id, req.body.estado);
    if (!updated) return res.status(404).json({ message: "Orden de laboratorio no encontrada." });

    await logAuditEvent({
      usuario: req.usuario,
      accion: "orden_laboratorio.estado",
      entidad: "orden_laboratorio",
      idEntidad: updated.id_orden,
      descripcion: `Cambio la orden de laboratorio #${updated.id_orden} a ${updated.estado}.`,
      metadata: { estado: updated.estado, examen: updated.examen },
    });

    res.json(updated);
  } catch (error) {
    if (error.status) return res.status(error.status).json({ message: error.message });
    handleDatabaseError(error, res, "Error al actualizar el estado de la orden.");
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

router.post("/resultados", requireRole("admin"), async (req, res) => {
  try {
    const data = svc.sanitizeResultado(req.body);
    if (!svc.validateResultado(data, res)) return;
    res.status(201).json(await svc.createResultado(req.body));
  } catch (error) { handleDatabaseError(error, res, "Error al registrar el resultado."); }
});

router.put("/resultados/:id", requireRole("admin"), async (req, res) => {
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
