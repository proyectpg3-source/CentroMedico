const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("../../config/db");
const { getTrimmedString } = require("../../utils/validators");

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "8h";
const SALT_ROUNDS = 12;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildToken(usuario) {
  return jwt.sign(
    {
      id_usuario: usuario.id_usuario,
      nombre: usuario.nombre,
      email: usuario.email,
      rol: usuario.rol,
      id_medico: usuario.id_medico || null,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

function safeUser(usuario) {
  const { password, ...rest } = usuario;
  return rest;
}

// ─── Login ────────────────────────────────────────────────────────────────────

async function login(body) {
  const email = getTrimmedString(body.email).toLowerCase();
  const password = getTrimmedString(body.password);

  if (!email || !password) {
    const error = new Error("Email y contraseña son obligatorios.");
    error.status = 400;
    throw error;
  }

  const result = await pool.query(
    "SELECT * FROM usuarios WHERE email = $1",
    [email]
  );

  const usuario = result.rows[0];

  // Mismo mensaje para usuario no encontrado y contraseña incorrecta
  // (evita enumerar usuarios)
  const INVALID_MSG = "Credenciales incorrectas.";

  if (!usuario) {
    const error = new Error(INVALID_MSG);
    error.status = 401;
    throw error;
  }

  if (!usuario.activo) {
    const error = new Error("Tu cuenta está desactivada. Contacta al administrador.");
    error.status = 403;
    throw error;
  }

  const passwordOk = await bcrypt.compare(password, usuario.password);
  if (!passwordOk) {
    const error = new Error(INVALID_MSG);
    error.status = 401;
    throw error;
  }

  const token = buildToken(usuario);

  return {
    token,
    usuario: safeUser(usuario),
  };
}

// ─── Registro (solo admin puede crear usuarios) ───────────────────────────────

async function createUsuario(body) {
  const nombre = getTrimmedString(body.nombre);
  const email = getTrimmedString(body.email).toLowerCase();
  const password = getTrimmedString(body.password);
  const rol = getTrimmedString(body.rol).toLowerCase() || "recepcionista";
  const id_medico = body.id_medico ? Number.parseInt(body.id_medico, 10) : null;

  const ROLES_VALIDOS = new Set(["admin", "medico", "recepcionista"]);

  if (!nombre || !email || !password) {
    const error = new Error("Nombre, email y contraseña son obligatorios.");
    error.status = 400;
    throw error;
  }

  if (password.length < 8) {
    const error = new Error("La contraseña debe tener al menos 8 caracteres.");
    error.status = 400;
    throw error;
  }

  if (!ROLES_VALIDOS.has(rol)) {
    const error = new Error(`Rol inválido. Usa: ${[...ROLES_VALIDOS].join(", ")}.`);
    error.status = 400;
    throw error;
  }

  // Si el rol es médico, debe tener id_medico
  if (rol === "medico" && !id_medico) {
    const error = new Error("Un usuario con rol médico debe tener un id_medico asociado.");
    error.status = 400;
    throw error;
  }

  const hashed = await bcrypt.hash(password, SALT_ROUNDS);

  const result = await pool.query(
    `INSERT INTO usuarios (nombre, email, password, rol, id_medico, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
     RETURNING *`,
    [nombre, email, hashed, rol, id_medico || null]
  );

  return safeUser(result.rows[0]);
}

// ─── Cambiar contraseña ───────────────────────────────────────────────────────

async function changePassword(idUsuario, body) {
  const currentPassword = getTrimmedString(body.password_actual);
  const newPassword = getTrimmedString(body.password_nuevo);

  if (!currentPassword || !newPassword) {
    const error = new Error("Contraseña actual y nueva son obligatorias.");
    error.status = 400;
    throw error;
  }

  if (newPassword.length < 8) {
    const error = new Error("La nueva contraseña debe tener al menos 8 caracteres.");
    error.status = 400;
    throw error;
  }

  const result = await pool.query(
    "SELECT * FROM usuarios WHERE id_usuario = $1",
    [idUsuario]
  );

  const usuario = result.rows[0];
  if (!usuario) {
    const error = new Error("Usuario no encontrado.");
    error.status = 404;
    throw error;
  }

  const passwordOk = await bcrypt.compare(currentPassword, usuario.password);
  if (!passwordOk) {
    const error = new Error("La contraseña actual es incorrecta.");
    error.status = 401;
    throw error;
  }

  const hashed = await bcrypt.hash(newPassword, SALT_ROUNDS);
  await pool.query(
    "UPDATE usuarios SET password = $1, updated_at = NOW() WHERE id_usuario = $2",
    [hashed, idUsuario]
  );

  return { message: "Contraseña actualizada correctamente." };
}

// ─── Listar usuarios (solo admin) ─────────────────────────────────────────────

async function getUsuarios() {
  const result = await pool.query(
    `SELECT u.id_usuario, u.nombre, u.email, u.rol, u.id_medico,
            u.activo, u.created_at, u.updated_at,
            m.nombre AS medico_nombre, m.especialidad AS medico_especialidad
     FROM usuarios u
     LEFT JOIN medicos m ON m.id_medico = u.id_medico
     ORDER BY u.id_usuario`
  );
  return result.rows;
}

// ─── Desactivar usuario (solo admin) ─────────────────────────────────────────

async function toggleActivo(idUsuario, activo) {
  const result = await pool.query(
    "UPDATE usuarios SET activo = $1, updated_at = NOW() WHERE id_usuario = $2 RETURNING *",
    [Boolean(activo), idUsuario]
  );
  const usuario = result.rows[0];
  if (!usuario) {
    const error = new Error("Usuario no encontrado.");
    error.status = 404;
    throw error;
  }
  return safeUser(usuario);
}

module.exports = { login, createUsuario, changePassword, getUsuarios, toggleActivo };
