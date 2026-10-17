//lista de roles que acepta el servidor
// Se utiliza un conjunto (Set) para almacenar los roles válidos, 
// lo que permite una verificación rápida y eficiente de los roles proporcionados por el usuario durante el inicio de sesión o la creación de un nuevo usuario.
//
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const pool = require("../../config/db");
const { getTrimmedString } = require("../../utils/validators");

const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "8h";
const SALT_ROUNDS = 12;
// Hash de comparación sin cuenta asociada: reduce diferencias temporales de login.
const DUMMY_HASH = "$2b$12$cDp9O39vAswD5KObeVyRYeAQ/SvaEOXmpod5ogKik/mpaRCZvT/X2";
const VALID_ROLES = new Set([
  "admin",
  "medico",
  "enfermero",
  "fundacion",
  "recepcionista",
]);

function getJwtSecret() {
  if (!process.env.JWT_SECRET) {
    const error = new Error("La variable de entorno JWT_SECRET no esta definida.");
    error.status = 500;
    throw error;
  }

  return process.env.JWT_SECRET;
}

function buildToken(usuario) {
  return jwt.sign(
    {
      id_usuario: usuario.id_usuario,
      nombre: usuario.nombre,
      email: usuario.email,
      rol: usuario.rol,
      id_medico: usuario.id_medico || null,
    },
    getJwtSecret(),
    { expiresIn: JWT_EXPIRES_IN, algorithm: "HS256" }
  );
}

function safeUser(usuario) {
  const { password, ...rest } = usuario;
  return rest;
}

async function login(body) {
  const email = getTrimmedString(body.email).toLowerCase();
  const password = getTrimmedString(body.password);
  const requestedRole = getTrimmedString(body.rol).toLowerCase();

  if (!email || !password) {
    const error = new Error("Email y contrasena son obligatorios.");
    error.status = 400;
    throw error;
  }

  if (requestedRole && !VALID_ROLES.has(requestedRole)) {
    const error = new Error(`Rol invalido. Usa: ${[...VALID_ROLES].join(", ")}.`);
    error.status = 400;
    throw error;
  }

  const result = await pool.query("SELECT * FROM usuarios WHERE email = $1", [email]);
  const usuario = result.rows[0];
  const invalidMessage = "Credenciales incorrectas.";

  const passwordOk = await bcrypt.compare(password, usuario ? usuario.password : DUMMY_HASH);
  if (!usuario || !passwordOk) {
    const error = new Error(invalidMessage);
    error.status = 401;
    throw error;
  }

  if (!usuario.activo) {
    const error = new Error("Tu cuenta esta desactivada. Contacta al administrador.");
    error.status = 403;
    throw error;
  }

  if (requestedRole && usuario.rol !== requestedRole) {
    const error = new Error("La cuenta no corresponde al area de acceso seleccionada.");
    error.status = 403;
    throw error;
  }

  return {
    token: buildToken(usuario),
    usuario: safeUser(usuario),
  };
}

async function createUsuario(body) {
  const nombre = getTrimmedString(body.nombre);
  const email = getTrimmedString(body.email).toLowerCase();
  const password = getTrimmedString(body.password);
  const rol = getTrimmedString(body.rol).toLowerCase() || "recepcionista";
  const idMedico = body.id_medico ? Number.parseInt(body.id_medico, 10) : null;

  if (!nombre || !email || !password) {
    const error = new Error("Nombre, email y contrasena son obligatorios.");
    error.status = 400;
    throw error;
  }

  if (password.length < 8) {
    const error = new Error("La contrasena debe tener al menos 8 caracteres.");
    error.status = 400;
    throw error;
  }

  if (!VALID_ROLES.has(rol)) {
    const error = new Error(`Rol invalido. Usa: ${[...VALID_ROLES].join(", ")}.`);
    error.status = 400;
    throw error;
  }

  if (rol === "medico" && !idMedico) {
    const error = new Error("Un usuario con rol medico debe tener un id_medico asociado.");
    error.status = 400;
    throw error;
  }

  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
  const result = await pool.query(
    `INSERT INTO usuarios (nombre, email, password, rol, id_medico, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
     RETURNING *`,
    [nombre, email, hashedPassword, rol, idMedico || null]
  );

  return safeUser(result.rows[0]);
}

async function changePassword(idUsuario, body) {
  const currentPassword = getTrimmedString(body.password_actual);
  const newPassword = getTrimmedString(body.password_nuevo);

  if (!currentPassword || !newPassword) {
    const error = new Error("Contrasena actual y nueva son obligatorias.");
    error.status = 400;
    throw error;
  }

  if (newPassword.length < 8) {
    const error = new Error("La nueva contrasena debe tener al menos 8 caracteres.");
    error.status = 400;
    throw error;
  }

  const result = await pool.query("SELECT * FROM usuarios WHERE id_usuario = $1", [
    idUsuario,
  ]);
  const usuario = result.rows[0];

  if (!usuario) {
    const error = new Error("Usuario no encontrado.");
    error.status = 404;
    throw error;
  }

  const passwordOk = await bcrypt.compare(currentPassword, usuario.password);
  if (!passwordOk) {
    const error = new Error("La contrasena actual es incorrecta.");
    error.status = 401;
    throw error;
  }

  const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);
  await pool.query(
    "UPDATE usuarios SET password = $1, updated_at = NOW() WHERE id_usuario = $2",
    [hashedPassword, idUsuario]
  );

  return { message: "Contrasena actualizada correctamente." };
}

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

async function toggleActivo(idUsuario, activo) {
  if (typeof activo !== "boolean") {
    throw Object.assign(new Error("El estado activo debe ser verdadero o falso."), { status: 400 });
  }
  const result = await pool.query(
    "UPDATE usuarios SET activo = $1, updated_at = NOW() WHERE id_usuario = $2 RETURNING *",
    [activo, idUsuario]
  );
  const usuario = result.rows[0];

  if (!usuario) {
    const error = new Error("Usuario no encontrado.");
    error.status = 404;
    throw error;
  }

  return safeUser(usuario);
}

module.exports = {
  login,
  createUsuario,
  changePassword,
  getUsuarios,
  toggleActivo,
};
