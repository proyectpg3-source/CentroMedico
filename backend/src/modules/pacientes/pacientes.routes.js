const express = require("express");
const { parseEntityId, sendInvalidId, handleDatabaseError } = require("../../utils/validators");
const svc = require("./pacientes.service");

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    res.json(await svc.getAll(req.query));
  } catch (error) {
    handleDatabaseError(error, res, "Error al obtener pacientes.");
  }
});

router.get("/:id", async (req, res) => {
  try {
    const id = parseEntityId(req.params.id);
    if (!id) return sendInvalidId(res, "paciente");
    const paciente = await svc.getById(id);
    if (!paciente) return res.status(404).json({ message: "Paciente no encontrado." });
    res.json(paciente);
  } catch (error) {
    handleDatabaseError(error, res, "Error al obtener el paciente.");
  }
});

router.post("/", async (req, res) => {
  try {
    const data = svc.sanitize(req.body);
    if (!svc.validate(data, res)) return;
    res.status(201).json(await svc.create(req.body));
  } catch (error) {
    handleDatabaseError(error, res, "Error al insertar paciente.");
  }
});

router.put("/:id", async (req, res) => {
  try {
    const id = parseEntityId(req.params.id);
    if (!id) return sendInvalidId(res, "paciente");
    const data = svc.sanitize(req.body);
    if (!svc.validate(data, res)) return;
    const updated = await svc.update(id, req.body);
    if (!updated) return res.status(404).json({ message: "Paciente no encontrado." });
    res.json(updated);
  } catch (error) {
    handleDatabaseError(error, res, "Error al actualizar paciente.");
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const id = parseEntityId(req.params.id);
    if (!id) return sendInvalidId(res, "paciente");
    const deleted = await svc.remove(id);
    if (!deleted) return res.status(404).json({ message: "Paciente no encontrado." });
    res.json({ message: "Paciente eliminado correctamente." });
  } catch (error) {
    handleDatabaseError(error, res, "Error al eliminar paciente.");
  }
});

module.exports = router;
