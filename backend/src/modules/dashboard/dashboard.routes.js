const express = require("express");
const { requireAuth } = require("../../middlewares/auth.middleware");
const { handleDatabaseError } = require("../../utils/validators");
const { getResumen } = require("./dashboard.service");

const router = express.Router();
router.use(requireAuth);

router.get("/resumen", async (req, res) => {
  try {
    const resumen = await getResumen();
    if (!["admin", "recepcionista", "fundacion"].includes(req.usuario.rol)) delete resumen.financiera;
    res.json(resumen);
  } catch (error) {
    handleDatabaseError(error, res, "No se pudo cargar el resumen del dashboard.");
  }
});

module.exports = router;
