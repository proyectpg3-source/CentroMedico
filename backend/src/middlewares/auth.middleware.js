const jwt = require("jsonwebtoken");
const pool = require("../config/db");

function getJwtSecret() {
  if (!process.env.JWT_SECRET) {
    throw new Error("La variable de entorno JWT_SECRET no esta definida.");
  }

  return process.env.JWT_SECRET;
}

async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "No autenticado. Se requiere token." });
  }

  const token = authHeader.slice(7);

  let payload;
  try {
    payload = jwt.verify(token, getJwtSecret(), { algorithms: ["HS256"] });
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        message: "La sesion ha expirado. Inicia sesion nuevamente.",
      });
    }

    return res.status(401).json({ message: "Token invalido." });
  }

  try {
    const result = await pool.query(
      `SELECT id_usuario, nombre, email, rol, id_medico, activo
       FROM usuarios
       WHERE id_usuario = $1`,
      [payload.id_usuario]
    );
    const usuario = result.rows[0];

    if (!usuario || !usuario.activo) {
      return res.status(401).json({
        message: "La cuenta no existe o fue desactivada.",
      });
    }

    req.usuario = usuario;
    return next();
  } catch (error) {
    return next(error);
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.usuario) {
      return res.status(401).json({ message: "No autenticado." });
    }

    if (!roles.includes(req.usuario.rol)) {
      return res.status(403).json({
        message: `Acceso denegado. Se requiere uno de estos roles: ${roles.join(", ")}.`,
      });
    }

    return next();
  };
}

module.exports = { requireAuth, requireRole };
