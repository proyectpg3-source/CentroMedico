function errorHandler(error, req, res, next) {
  console.error(error);
  res.status(500).json({ message: "Ocurrio un error inesperado en el servidor." });
}

module.exports = errorHandler;
