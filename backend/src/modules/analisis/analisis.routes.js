const express = require("express");
const { requireAuth, requireRole } = require("../../middlewares/auth.middleware");
const {
  getColaPriorizada,
  getIndicadores,
  calcularPrioridadParaPaciente,
  calcularPrioridadDesdeEntrada,
  recalcularCitasAbiertas,
} = require("./analisis.service");
const { getOptionalId, handleDatabaseError } = require("../../utils/validators");
const { validateVitals } = require("../triajes/calidadDatos");

const router = express.Router();
router.use(requireAuth);
router.use(requireRole("admin", "medico", "enfermero"));

router.get("/priorizacion", async (req, res) => {
  try {
    res.json(await getColaPriorizada());
  } catch (error) {
    handleDatabaseError(error, res, "Error al obtener la cola priorizada.");
  }
});

router.post("/priorizacion/simular", async (req, res) => {
  try {
    const vitalError = validateVitals(req.body);
    if (vitalError) return res.status(400).json({ message: vitalError });
    const idPaciente = getOptionalId(req.body.id_paciente);
    const input = {
      motivo: req.body.motivo,
      motivo_consulta: req.body.motivo_consulta,
      triaje_notas: req.body.triaje_notas,
      historia_enfermedad_actual: req.body.historia_enfermedad_actual,
      antecedentes_relevantes: req.body.antecedentes_relevantes,
      alergias_referidas: req.body.alergias_referidas,
      presion_arterial: req.body.presion_arterial,
      frecuencia_cardiaca: req.body.frecuencia_cardiaca,
      frecuencia_respiratoria: req.body.frecuencia_respiratoria,
      temperatura: req.body.temperatura,
      saturacion_oxigeno: req.body.saturacion_oxigeno,
      fecha_nacimiento: req.body.fecha_nacimiento,
      diagnostico: req.body.diagnostico,
      tratamiento: req.body.tratamiento,
      observaciones: req.body.observaciones,
    };

    const prioridad = idPaciente
      ? await calcularPrioridadParaPaciente(idPaciente, input)
      : await calcularPrioridadDesdeEntrada(input);

    res.json(prioridad);
  } catch (error) {
    handleDatabaseError(error, res, "Error al simular la prioridad clinica.");
  }
});

router.post("/priorizacion/recalcular", requireRole("admin"), async (req, res) => {
  try {
    res.json(await recalcularCitasAbiertas());
  } catch (error) {
    handleDatabaseError(error, res, "Error al recalcular la priorizacion.");
  }
});

router.get("/indicadores", async (req, res) => {
  try {
    res.json(await getIndicadores());
  } catch (error) {
    handleDatabaseError(error, res, "Error al obtener indicadores de analisis.");
  }
});

module.exports = router;
