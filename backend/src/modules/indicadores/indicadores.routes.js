const express = require("express");
const { requireAuth, requireRole } = require("../../middlewares/auth.middleware");
const { parseEntityId, sendInvalidId, handleDatabaseError } = require("../../utils/validators");
const { logAuditEvent } = require("../../services/audit");
const service = require("./indicadores.service");

const router = express.Router();
router.use(requireAuth);
router.use(requireRole("admin", "medico", "fundacion"));

function sendError(error, res, fallback) {
  if (error.status) {
    return res.status(error.status).json({ message: error.message, ...(error.details ? { details: error.details } : {}) });
  }
  return handleDatabaseError(error, res, fallback);
}

router.get("/", async (req, res) => {
  try {
    res.json(await service.getReport(req.query));
  } catch (error) {
    sendError(error, res, "Error al calcular los indicadores.");
  }
});

router.get("/linea-base/plantilla", (req, res) => {
  res.json(service.getTemplate());
});

router.get("/linea-base/lotes", async (req, res) => {
  try {
    res.json(await service.listBatches());
  } catch (error) {
    sendError(error, res, "Error al obtener los lotes de línea base.");
  }
});

router.post("/linea-base/lotes", requireRole("admin", "medico"), async (req, res) => {
  try {
    const result = await service.registerBatch({ body: req.body, idUser: req.usuario.id_usuario });
    if (!result.simulado) {
      await logAuditEvent({
        usuario: req.usuario,
        accion: "linea_base.registro",
        entidad: "linea_base_lote",
        idEntidad: result.lote.id_lote,
        descripcion: `Registró el lote de línea base "${result.nombre}" con ${result.filas_validas} observaciones.`,
      });
    }
    res.status(result.simulado ? 200 : 201).json(result);
  } catch (error) {
    sendError(error, res, "Error al registrar la línea base.");
  }
});

router.post("/linea-base/lotes/:id/anular", requireRole("admin"), async (req, res) => {
  try {
    const id = parseEntityId(req.params.id);
    if (!id) return sendInvalidId(res, "lote");
    const result = await service.voidBatch({ idBatch: id, reason: req.body?.motivo, idUser: req.usuario.id_usuario });
    await logAuditEvent({
      usuario: req.usuario,
      accion: "linea_base.anulacion",
      entidad: "linea_base_lote",
      idEntidad: id,
      descripcion: `Anuló el lote de línea base #${id}.`,
      metadata: { motivo: result.motivo_anulacion },
    });
    res.json(result);
  } catch (error) {
    sendError(error, res, "Error al anular el lote.");
  }
});

module.exports = router;
