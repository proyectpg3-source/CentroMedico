const rateLimit = require("express-rate-limit");

const disabled = () => process.env.RATE_LIMIT_DISABLED === "true";

const jsonHandler = (message) => (req, res) => res.status(429).json({ message });

// Limite general por IP para toda la API.
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: Number(process.env.RATE_LIMIT_API_PER_MIN || 300),
  standardHeaders: "draft-8",
  legacyHeaders: false,
  skip: disabled,
  handler: jsonHandler("Demasiadas solicitudes. Intenta de nuevo en un momento."),
});

// Limite estricto para login: solo cuentan los intentos fallidos (status >= 400).
const loginLimiter = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_LOGIN_WINDOW_MIN || 15) * 60 * 1000,
  limit: Number(process.env.RATE_LIMIT_LOGIN_MAX || 10),
  standardHeaders: "draft-8",
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  skip: disabled,
  handler: jsonHandler("Demasiados intentos de inicio de sesion. Espera unos minutos e intenta de nuevo."),
});

module.exports = { apiLimiter, loginLimiter };
