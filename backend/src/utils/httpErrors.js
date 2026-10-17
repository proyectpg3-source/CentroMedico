/**
 * Responde un error de servicio sin filtrar detalles internos.
 * - Errores con status 4xx (validacion, credenciales): se muestra su mensaje.
 * - Cualquier otro (excepciones de BD, bugs): se registra en el servidor
 *   y el cliente recibe un mensaje generico.
 */
function sendServiceError(res, error, fallbackMessage = "Ocurrio un error inesperado en el servidor.") {
  const status = Number.isInteger(error?.status) ? error.status : 500;

  if (status >= 400 && status < 500) {
    return res.status(status).json({ message: error.message });
  }

  console.error(error);
  return res.status(500).json({ message: fallbackMessage });
}

module.exports = { sendServiceError };
