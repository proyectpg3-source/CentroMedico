const express = require("express");
const { requireAuth, requireRole } = require("../../middlewares/auth.middleware");
const { parseEntityId, sendInvalidId, handleDatabaseError, validateSATS } = require("../../utils/validators");
const service = require("./triajes.service");

const SATS_RULES_TRIAJE = {
  id_cita: { required: true, type: 'id' },
  presion_arterial: { required: false, type: 'string' },
  temperatura: { required: false, type: 'string' },
  frecuencia_cardiaca: { required: false, type: 'string' },
  saturacion_oxigeno: { required: false, type: 'string' },
  prioridad: { required: true, type: 'string' },
  observaciones: { required: false, type: 'string' },
};

const router = express.Router();
router.use(requireAuth);
router.use(requireRole("admin", "medico", "enfermero"));

router.get("/stats", async (req, res) => {
  try {
    res.json(await service.getStats());
  } catch (error) {
    handleDatabaseError(error, res, "Error al obtener estadísticas de triaje.");
  }
});

router.get("/", async (req, res) => {
  try {
    res.json(await service.getAll(req.query));
  } catch (error) {
    handleDatabaseError(error, res, "Error al obtener los triajes.");
  }
});

router.get("/cita/:id", async (req, res) => {
  try {
    const id = parseEntityId(req.params.id);
    if (!id) return sendInvalidId(res, "cita");
    const triaje = await service.getByAppointment(id);
    if (!triaje) return res.status(404).json({ message: "Triaje no encontrado." });
    res.json(triaje);
  } catch (error) {
    handleDatabaseError(error, res, "Error al obtener el triaje.");
  }
});

router.post("/", requireRole("admin", "enfermero"), async (req, res) => {
  try {
    const { valid, sanitizedData, errors } = validateSATS(req.body, SATS_RULES_TRIAJE);
    if (!valid) {
      return res.status(400).json({ message: "Error de validación SATS", details: errors });
    }
    res.status(201).json(await service.upsert(sanitizedData));
  } catch (error) {
    if (error.status) return res.status(error.status).json({ message: error.message });
    handleDatabaseError(error, res, "Error al guardar el triaje.");
  }
});

router.patch("/validar", async (req, res) => {
  try {
    const { id_cita, prioridad_final, justificacion } = req.body;
    if (!id_cita || !prioridad_final) {
      return res.status(400).json({ message: "El id de la cita y la prioridad final son obligatorios." });
    }
    await service.validarPrioridad(id_cita, {
      prioridad_final,
      justificacion,
      id_usuario: req.usuario.id
    });
    res.json({ message: "Prioridad validada correctamente. El paciente ha sido movido a la cola médica." });
  } catch (error) {
    handleDatabaseError(error, res, "Error al validar la prioridad.");
  }
});

module.exports = router;
