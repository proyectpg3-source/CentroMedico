const express = require("express");

const { requireAuth, requireRole } = require("../../middlewares/auth.middleware");
const authService = require("./auth.service");

const router = express.Router();

router.post("/login", async (req, res) => {
  try {
    const result = await authService.login(req.body);
    return res.json(result);
  } catch (error) {
    return res.status(error.status || 500).json({ message: error.message });
  }
});

router.get("/me", requireAuth, (req, res) => {
  res.json({ usuario: req.usuario });
});

router.put("/password", requireAuth, async (req, res) => {
  try {
    const result = await authService.changePassword(req.usuario.id_usuario, req.body);
    return res.json(result);
  } catch (error) {
    return res.status(error.status || 500).json({ message: error.message });
  }
});

router.get("/usuarios", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const usuarios = await authService.getUsuarios();
    return res.json(usuarios);
  } catch (error) {
    return res.status(error.status || 500).json({ message: error.message });
  }
});

router.post("/usuarios", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const usuario = await authService.createUsuario(req.body);
    return res.status(201).json(usuario);
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({ message: "Ya existe un usuario con ese email." });
    }

    return res.status(error.status || 500).json({ message: error.message });
  }
});

router.patch("/usuarios/:id/activo", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const id = Number.parseInt(req.params.id, 10);
    if (!id) {
      return res.status(400).json({ message: "ID de usuario invalido." });
    }

    if (id === req.usuario.id_usuario && req.body.activo === false) {
      return res.status(400).json({ message: "No puedes desactivar tu propia cuenta." });
    }

    const usuario = await authService.toggleActivo(id, req.body.activo);
    return res.json(usuario);
  } catch (error) {
    return res.status(error.status || 500).json({ message: error.message });
  }
});

module.exports = router;
