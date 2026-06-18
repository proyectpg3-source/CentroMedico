const express = require("express");
const { handleDatabaseError } = require("../../utils/validators");
const { getResumen } = require("./dashboard.service");

const router = express.Router();

router.get("/resumen", async (req, res) => {
  try {
    const resumen = await getResumen();
    res.json(resumen);
  } catch (error) {
    handleDatabaseError(error, res, "No se pudo cargar el resumen del dashboard.");
  }
});

module.exports = router;
