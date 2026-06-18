const express = require("express");
const { requireAuth, requireRole } = require("../../middlewares/auth.middleware");
const svc = require("./auth.service");

const router = express.Router();

// ─── Públicas ─────────────────────────────────────────────────────────────────

/**
 * POST /api/auth/login
 * Body: { email, password }
 * Devuelve: { token, usuario }
 */
router.post("/login", async (req, res) => {
  try {
    const result = await svc.login(req.body);
    res.json(result);
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message });
  }
});

// ─── Protegidas ───────────────────────────────────────────────────────────────

/**
 * GET /api/auth/me
 * Devuelve los datos del usuario autenticado según su token
 */
router.get("/me", requireAuth, (req, res) => {
  res.json({ usuario: req.usuario });
});

/**
 * PUT /api/auth/password
 * Body: { password_actual, password_nuevo }
 */
router.put("/password", requireAuth, async (req, res) => {
  try {
    const result = await svc.changePassword(req.usuario.id_usuario, req.body);
    res.json(result);
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message });
  }
});

// ─── Solo admin ───────────────────────────────────────────────────────────────

/**
 * GET /api/auth/usuarios
 * Lista todos los usuarios del sistema
 */
router.get("/usuarios", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    res.json(await svc.getUsuarios());
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message });
  }
});

/**
 * POST /api/auth/usuarios
 * Body: { nombre, email, password, rol, id_medico? }
 */
router.post("/usuarios", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const usuario = await svc.createUsuario(req.body);
    res.status(201).json(usuario);
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({ message: "Ya existe un usuario con ese email." });
    }
    res.status(error.status || 500).json({ message: error.message });
  }
});

/**
 * PATCH /api/auth/usuarios/:id/activo
 * Body: { activo: true | false }
 */
router.patch("/usuarios/:id/activo", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const id = Number.parseInt(req.params.id, 10);
    if (!id) return res.status(400).json({ message: "ID de usuario inválido." });
    const usuario = await svc.toggleActivo(id, req.body.activo);
    res.json(usuario);
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message });
  }
});

module.exports = router;
