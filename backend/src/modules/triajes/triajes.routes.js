const express = require("express");
const { parseEntityId, sendInvalidId, handleDatabaseError } = require("../../utils/validators");
const service = require("./triajes.service");

const router = express.Router();

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

router.post("/", async (req, res) => {
  try {
    const data = service.sanitize(req.body);
    if (!service.validate(data, res)) return;
    res.status(201).json(await service.upsert(req.body));
  } catch (error) {
    if (error.status) return res.status(error.status).json({ message: error.message });
    handleDatabaseError(error, res, "Error al guardar el triaje.");
  }
});

module.exports = router;
