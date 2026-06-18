const express = require("express");
const {
  getColaPriorizada,
  getIndicadores,
  calcularPrioridadParaPaciente,
  calculatePriority,
  recalcularCitasAbiertas,
} = require("./analisis.service");
const { getOptionalId, handleDatabaseError } = require("../../utils/validators");

const router = express.Router();

router.get("/priorizacion", async (req, res) => {
  try {
    res.json(await getColaPriorizada());
  } catch (error) {
    handleDatabaseError(error, res, "Error al obtener la cola priorizada.");
  }
});

router.post("/priorizacion/simular", async (req, res) => {
  try {
    const idPaciente = getOptionalId(req.body.id_paciente);
    const input = {
      motivo: req.body.motivo,
      triaje_notas: req.body.triaje_notas,
      diagnostico: req.body.diagnostico,
      tratamiento: req.body.tratamiento,
      observaciones: req.body.observaciones,
    };

    const prioridad = idPaciente
      ? await calcularPrioridadParaPaciente(idPaciente, input)
      : calculatePriority(input);

    res.json(prioridad);
  } catch (error) {
    handleDatabaseError(error, res, "Error al simular la prioridad clinica.");
  }
});

router.post("/priorizacion/recalcular", async (req, res) => {
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
