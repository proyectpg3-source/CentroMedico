// Manejo global de errores. Nunca expone detalles internos al cliente.
function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);

  // Errores del parser de body (JSON mal formado, cuerpo demasiado grande)
  if (error?.type === "entity.parse.failed") {
    return res.status(400).json({ message: "El cuerpo de la solicitud no es un JSON valido." });
  }
  if (error?.type === "entity.too.large") {
    return res.status(413).json({ message: "El cuerpo de la solicitud excede el tamano permitido." });
  }

  console.error(error);
  return res.status(500).json({ message: "Ocurrio un error inesperado en el servidor." });
}

module.exports = errorHandler;
