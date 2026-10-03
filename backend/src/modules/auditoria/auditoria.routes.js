const express = require("express");
const { requireAuth, requireRole } = require("../../middlewares/auth.middleware");
const { handleDatabaseError } = require("../../utils/validators");
const svc = require("./auditoria.service");

const router = express.Router();
router.use(requireAuth, requireRole("admin"));

router.get("/", async (req, res) => {
  try {
    res.json(await svc.getAll(req.query));
  } catch (error) {
    handleDatabaseError(error, res, "Error al obtener los eventos de auditoria.");
  }
});

module.exports = router;
