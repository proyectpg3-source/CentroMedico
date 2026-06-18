const jwt = require("jsonwebtoken");

function getJwtSecret() {
  if (!process.env.JWT_SECRET) {
    throw new Error("La variable de entorno JWT_SECRET no esta definida.");
  }

  return process.env.JWT_SECRET;
}

function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "No autenticado. Se requiere token." });
  }

  const token = authHeader.slice(7);

  try {
    req.usuario = jwt.verify(token, getJwtSecret());
    return next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        message: "La sesion ha expirado. Inicia sesion nuevamente.",
      });
    }

    return res.status(401).json({ message: "Token invalido." });
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
