const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error("La variable de entorno JWT_SECRET no está definida.");
}

/**
 * Verifica que el request tenga un JWT válido.
 * Adjunta req.usuario con { id_usuario, nombre, email, rol, id_medico }
 */
function requireAuth(req, res, next) {
  const authHeader = req.headers["authorization"];
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "No autenticado. Se requiere token." });
  }

  const token = authHeader.slice(7);

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.usuario = payload;
    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ message: "La sesión ha expirado. Inicia sesión nuevamente." });
    }
    return res.status(401).json({ message: "Token inválido." });
  }
}

/**
 * Verifica que el usuario tenga uno de los roles permitidos.
 * Siempre usar DESPUÉS de requireAuth.
 * Ejemplo: router.delete('/:id', requireAuth, requireRole('admin'), handler)
 */
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
    next();
  };
}

module.exports = { requireAuth, requireRole };
