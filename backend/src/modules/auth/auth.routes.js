// Rutas de autenticacion y gestion de usuarios.
// - /login tiene limite de intentos fallidos (loginLimiter).
// - Los errores internos nunca se exponen al cliente (sendServiceError).
// - Inicios de sesion, cambios de clave y gestion de cuentas quedan en auditoria.
const express = require("express");

const { requireAuth, requireRole } = require("../../middlewares/auth.middleware");
const { loginLimiter } = require("../../middlewares/rateLimit");
const { sendServiceError } = require("../../utils/httpErrors");
const { getTrimmedString } = require("../../utils/validators");
const { logAuditEvent } = require("../../services/audit");
const authService = require("./auth.service");

const router = express.Router();

router.post("/login", loginLimiter, async (req, res) => {
  const email = getTrimmedString(req.body?.email).toLowerCase();

  try {
    const result = await authService.login(req.body || {});
    await logAuditEvent({
      usuario: result.usuario,
      accion: "auth.login",
      entidad: "usuario",
      idEntidad: result.usuario.id_usuario,
      descripcion: "Inicio de sesion correcto.",
      metadata: { ip: req.ip },
    });
    return res.json(result);
  } catch (error) {
    // Solo se auditan rechazos de credenciales/cuenta (no errores de validacion ni fallas internas).
    if (error.status === 401 || error.status === 403) {
      await logAuditEvent({
        usuario: null,
        accion: "auth.login_fallido",
        entidad: "usuario",
        descripcion: "Intento de inicio de sesion rechazado.",
        metadata: { email, ip: req.ip, motivo: error.status === 403 ? "cuenta_o_area_no_permitida" : "credenciales" },
      });
    }
    return sendServiceError(res, error);
  }
});

router.get("/me", requireAuth, (req, res) => {
  res.json({ usuario: req.usuario });
});

router.put("/password", requireAuth, async (req, res) => {
  try {
    const result = await authService.changePassword(req.usuario.id_usuario, req.body || {});
    await logAuditEvent({
      usuario: req.usuario,
      accion: "auth.password_cambiada",
      entidad: "usuario",
      idEntidad: req.usuario.id_usuario,
      descripcion: "El usuario cambio su contrasena.",
    });
    return res.json(result);
  } catch (error) {
    return sendServiceError(res, error);
  }
});

router.get("/usuarios", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    return res.json(await authService.getUsuarios());
  } catch (error) {
    return sendServiceError(res, error);
  }
});

router.post("/usuarios", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const usuario = await authService.createUsuario(req.body || {});
    await logAuditEvent({
      usuario: req.usuario,
      accion: "usuario.creado",
      entidad: "usuario",
      idEntidad: usuario.id_usuario,
      descripcion: `Creo la cuenta ${usuario.email} con rol ${usuario.rol}.`,
    });
    return res.status(201).json(usuario);
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({ message: "Ya existe un usuario con ese email." });
    }
    return sendServiceError(res, error);
  }
});

router.patch("/usuarios/:id/activo", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const id = Number.parseInt(req.params.id, 10);
    if (!id) {
      return res.status(400).json({ message: "ID de usuario invalido." });
    }

    if (id === req.usuario.id_usuario && req.body?.activo === false) {
      return res.status(400).json({ message: "No puedes desactivar tu propia cuenta." });
    }

    const usuario = await authService.toggleActivo(id, req.body?.activo);
    await logAuditEvent({
      usuario: req.usuario,
      accion: usuario.activo ? "usuario.activado" : "usuario.desactivado",
      entidad: "usuario",
      idEntidad: usuario.id_usuario,
      descripcion: `${usuario.activo ? "Activo" : "Desactivo"} la cuenta ${usuario.email}.`,
    });
    return res.json(usuario);
  } catch (error) {
    return sendServiceError(res, error);
  }
});

module.exports = router;
