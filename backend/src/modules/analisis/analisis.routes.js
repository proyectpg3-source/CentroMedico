const express = require("express");
const { requireAuth, requireRole } = require("../../middlewares/auth.middleware");
const { getColaPriorizada, getIndicadores } = require("./analisis.service");
const { handleDatabaseError } = require("../../utils/validators");
const triajesService = require("../triajes/triajes.service");

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

// Vista previa con el motor SATS/P1–P4 (mismo cálculo que la evaluación de
// Enfermería). No guarda datos ni modifica la cola.
router.post("/priorizacion/simular", async (req, res) => {
  try {
    res.json(await triajesService.preview(req.body || {}));
  } catch (error) {
    if (error.status || error.statusCode) {
      return res.status(error.status || error.statusCode).json({ message: error.message });
    }
    handleDatabaseError(error, res, "Error al simular la prioridad clinica.");
  }
});

router.post("/priorizacion/recalcular", requireRole("admin"), async (req, res) => {
  try {
    res.json(await triajesService.reevaluarPendientes());
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
