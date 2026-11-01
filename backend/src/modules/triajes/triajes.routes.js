const express = require("express");
const { requireAuth, requireRole } = require("../../middlewares/auth.middleware");
const { parseEntityId, sendInvalidId, handleDatabaseError } = require("../../utils/validators");
const { logAuditEvent } = require("../../services/audit");
const service = require("./triajes.service");
const { getCatalog } = require("./evaluacionSats");

const router = express.Router();
router.use(requireAuth);
router.use(requireRole("admin", "medico", "enfermero"));

function sendError(error, res, fallback) {
  if (error.status) return res.status(error.status).json({ message: error.message });
  // Errores de validación de los motores (statusCode 400).
  if (error.statusCode) return res.status(error.statusCode).json({ message: error.message });
  return handleDatabaseError(error, res, fallback);
}

// Catálogo SATS: única fuente de verdad para la interfaz.
router.get("/catalogo", (req, res) => {
  res.json(getCatalog());
});

router.get("/", async (req, res) => {
  try {
    res.json(await service.getAll(req.query));
  } catch (error) {
    sendError(error, res, "Error al obtener los triajes.");
  }
});

// ---- Cola médica ----------------------------------------------------------
router.get("/cola", async (req, res) => {
  try {
    res.json(await service.getCola());
  } catch (error) {
    sendError(error, res, "Error al obtener la cola médica.");
  }
});

router.post("/cola/:id/llamar", requireRole("admin", "medico"), async (req, res) => {
  try {
    const id = parseEntityId(req.params.id);
    if (!id) return sendInvalidId(res, "cita");
    res.json(await service.llamarPaciente(id, req.usuario));
  } catch (error) {
    sendError(error, res, "Error al llamar al paciente.");
  }
});

router.post("/cola/:id/iniciar", requireRole("admin", "medico"), async (req, res) => {
  try {
    const id = parseEntityId(req.params.id);
    if (!id) return sendInvalidId(res, "cita");
    const result = await service.iniciarAtencion(id, req.usuario);
    await logAuditEvent({
      usuario: req.usuario,
      accion: "cola.iniciar_atencion",
      entidad: "cita",
      idEntidad: id,
      descripcion: `Inició la atención de la cita #${id} desde la cola médica.`,
    });
    res.json(result);
  } catch (error) {
    sendError(error, res, "Error al iniciar la atención.");
  }
});

// ---- Reglas P1–P4 -----------------------------------------------------------
router.get("/reglas", async (req, res) => {
  try {
    res.json(await service.getReglas());
  } catch (error) {
    sendError(error, res, "Error al obtener las reglas de priorización.");
  }
});

router.post("/reglas/aprobacion", requireRole("admin", "medico"), async (req, res) => {
  try {
    const approval = await service.registrarAprobacion(req.body || {}, req.usuario);
    await logAuditEvent({
      usuario: req.usuario,
      accion: "reglas.aprobacion",
      entidad: "reglas_prioridad",
      idEntidad: approval.version_reglas,
      descripcion: `Registró la decisión ${approval.decision} para ${approval.version_reglas}.`,
      metadata: { casos_validados: approval.casos_validados, casos_correctos: approval.casos_correctos },
    });
    res.status(201).json(approval);
  } catch (error) {
    sendError(error, res, "Error al registrar la aprobación de reglas.");
  }
});

// ---- Evaluación de Enfermería --------------------------------------------
router.get("/cita/:id", async (req, res) => {
  try {
    const id = parseEntityId(req.params.id);
    if (!id) return sendInvalidId(res, "cita");
    const triaje = await service.getByAppointment(id);
    if (!triaje) return res.status(404).json({ message: "Triaje no encontrado." });
    res.json(triaje);
  } catch (error) {
    sendError(error, res, "Error al obtener el triaje.");
  }
});

router.get("/cita/:id/historial", async (req, res) => {
  try {
    const id = parseEntityId(req.params.id);
    if (!id) return sendInvalidId(res, "cita");
    res.json(await service.getHistorial(id));
  } catch (error) {
    sendError(error, res, "Error al obtener la bitácora del triaje.");
  }
});

// Vista previa: calcula la propuesta sin guardar.
router.post("/vista-previa", async (req, res) => {
  try {
    res.json(await service.preview(req.body || {}));
  } catch (error) {
    sendError(error, res, "Error al calcular la vista previa.");
  }
});

router.post("/", requireRole("admin", "enfermero"), async (req, res) => {
  try {
    const record = await service.upsert(req.body || {}, req.usuario);
    await logAuditEvent({
      usuario: req.usuario,
      accion: "triaje.registro",
      entidad: "cita",
      idEntidad: record.id_cita,
      descripcion: `Evaluación de Enfermería de la cita #${record.id_cita}: ${record.estado_propuesta}${record.nivel_propuesto ? ` ${record.nivel_propuesto}` : ""}.`,
      metadata: { estado_propuesta: record.estado_propuesta, nivel_propuesto: record.nivel_propuesto },
    });
    res.status(201).json(record);
  } catch (error) {
    sendError(error, res, "Error al guardar el triaje.");
  }
});

// ---- Validación profesional ----------------------------------------------
router.patch("/validar", requireRole("admin", "medico"), async (req, res) => {
  try {
    const record = await service.validarPrioridad(req.body || {}, req.usuario);
    await logAuditEvent({
      usuario: req.usuario,
      accion: "triaje.validacion",
      entidad: "cita",
      idEntidad: record.id_cita,
      descripcion: `Validó la prioridad ${record.prioridad_final} (${record.origen_clasificacion}) de la cita #${record.id_cita}.`,
      metadata: {
        nivel_propuesto: record.nivel_propuesto,
        prioridad_final: record.prioridad_final,
        origen: record.origen_clasificacion,
      },
    });
    res.json(record);
  } catch (error) {
    sendError(error, res, "Error al validar la prioridad.");
  }
});

module.exports = router;
